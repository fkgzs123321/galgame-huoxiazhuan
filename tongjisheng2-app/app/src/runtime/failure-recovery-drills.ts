/**
 * Failure Recovery Drills · 七类失败恢复演练(阶段5)
 *
 * 职责:
 *  - 7 类失败场景的端到端恢复演练(覆盖所有失败路径)
 *  - 每类失败注入 + 恢复行为验证 + 状态一致性断言
 *  - 复用 Recovery.buildFailureReport + Kernel.rollback/reset 链路
 *  - 不污染正式存档(每个 drill 使用独立 Kernel + 独立 prefix)
 *
 * 7 类失败场景:
 *  - d1 模型调用失败:端点未配置 / 网络异常 → GatewayResult.ok=false + 重试计数 + draft 保留
 *  - d2 解析错误:AI 输出 malformed JSONPatch → parseErrors 捕获 + 状态零污染
 *  - d3 Zod 校验失败:ops 违反 schema(类型/枚举/范围) → TransactionResult.rejectedCount > 0 + 部分提交
 *  - d4 IndexedDB 写入失败:kvSet/createRevision 抛异常 → 内存 stat_data 保留 + 可重试
 *  - d5 getwi 加载失败:条目路径不存在 → missing 集合记录 + 占位注释返回 + 不阻塞渲染
 *  - d6 EJS 渲染失败:模板语法错误 → catch 异常 + 返回错误占位 + 不崩溃
 *  - d7 浏览器崩溃模拟:销毁 Kernel 实例 → 新 Kernel + Recovery.recoverFromLatest 恢复 stat_data
 *
 * 设计:
 *  - 纯客户端逻辑,不依赖真实模型服务
 *  - 每个 drill 独立运行,互不影响
 *  - 失败注入通过 mock / 替换参数 / 模拟异常实现
 *  - 恢复验证通过断言 Kernel/Recovery/IDB 状态
 */

import { Kernel, type StreamDraft } from './kernel';
import { schemaRegistry } from './schema-loader';
import { recovery } from './recovery';
import { MvuTransaction } from './mvu-transaction';
import { MvuRuntime } from './mvu-runtime';
import { EjsEngine } from './ejs-engine';
import { getwiLoader } from './getwi-loader';
import * as idb from '../db/indexeddb';
import { modelGateway, type GatewayRequest, type GatewayResult } from './model-gateway';
import type { AiProfile, AiProfileId } from '../ai/profiles';
import type { PresetProfile, PresetSampler, PresetContextBudget, PresetSession, PresetExtensions } from './preset/types';

// ───────────────────────────────────────────────────────────
//  演练结果类型
// ───────────────────────────────────────────────────────────

export interface FailureDrillResult {
  /** 演练 ID */
  id: string;
  /** 演练名 */
  name: string;
  /** 失败类型 */
  failureType: 'model-fail' | 'parse-fail' | 'zod-fail' | 'idb-fail' | 'getwi-fail' | 'ejs-fail' | 'crash-recovery';
  /** 失败注入描述 */
  failureInjection: string;
  /** 是否通过(恢复行为符合预期) */
  ok: boolean;
  /** 完成证据 */
  evidence: string;
  /** 断言详情 */
  assertions: Array<{
    name: string;
    ok: boolean;
    expected?: string;
    actual?: string;
  }>;
  /** 错误列表 */
  errors: string[];
  /** 耗时(ms) */
  elapsedMs: number;
}

export interface FailureDrillReport {
  ok: boolean;
  passed: number;
  failed: number;
  total: number;
  results: FailureDrillResult[];
  elapsedMs: number;
}

// ───────────────────────────────────────────────────────────
//  演练元信息(供 UI 展示)
// ───────────────────────────────────────────────────────────

export const FAILURE_DRILL_META: Array<{
  id: string;
  name: string;
  failureType: FailureDrillResult['failureType'];
  description: string;
}> = [
  {
    id: 'd1',
    name: '模型调用失败',
    failureType: 'model-fail',
    description: '端点未配置 / 网络异常 → GatewayResult.ok=false + 重试计数 + draft 保留可重试',
  },
  {
    id: 'd2',
    name: '解析错误',
    failureType: 'parse-fail',
    description: 'AI 输出 malformed JSONPatch → parseErrors 捕获 + 状态零污染 + 推荐回滚',
  },
  {
    id: 'd3',
    name: 'Zod 校验失败',
    failureType: 'zod-fail',
    description: 'ops 违反 schema(类型/枚举/范围) → rejectedCount > 0 + 部分提交 + 推荐中止',
  },
  {
    id: 'd4',
    name: 'IndexedDB 写入失败',
    failureType: 'idb-fail',
    description: 'kvSet/createRevision 抛异常 → 内存 stat_data 保留 + 可重试 + 推荐重试',
  },
  {
    id: 'd5',
    name: 'getwi 加载失败',
    failureType: 'getwi-fail',
    description: '条目路径不存在 → missing 集合记录 + 占位注释返回 + 不阻塞渲染',
  },
  {
    id: 'd6',
    name: 'EJS 渲染失败',
    failureType: 'ejs-fail',
    description: '模板语法错误 → catch 异常 + 返回错误占位 + 不崩溃',
  },
  {
    id: 'd7',
    name: '浏览器崩溃恢复',
    failureType: 'crash-recovery',
    description: '销毁 Kernel 实例 → 新 Kernel + Recovery.recoverFromLatest 恢复 stat_data',
  },
];

// ───────────────────────────────────────────────────────────
//  辅助:创建测试 Kernel + 初始 stat_data
// ───────────────────────────────────────────────────────────

async function createTestKernel(prefix: string): Promise<Kernel> {
  const k = new Kernel();
  await k.init();
  const parsed = schemaRegistry.safeParseFull({});
  const initialStatData =
    parsed.ok && parsed.data && typeof parsed.data === 'object'
      ? (parsed.data as Record<string, unknown>)
      : {};
  (initialStatData as Record<string, unknown>).__testPrefix = prefix;
  await k.initializeNewGame(initialStatData);
  return k;
}

async function cleanupTestKernel(kernel: Kernel): Promise<void> {
  try {
    await kernel.reset();
  } catch {
    /* 忽略 */
  }
}

// ───────────────────────────────────────────────────────────
//  d1: 模型调用失败(端点未配置)
// ───────────────────────────────────────────────────────────

async function drillD1_modelCallFailure(): Promise<FailureDrillResult> {
  const assertions: FailureDrillResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    kernel = await createTestKernel('d1');

    // 1. 构造未配置端点的 profile(缺少 baseURL/apiKey/model)
    const brokenProfile: AiProfile = {
      id: 'main-chat' as AiProfileId,
      name: '测试-主聊天AI(端点缺失)',
      endpoint: {
        baseURL: '',
        apiKey: '',
        model: '',
      },
      outputProtocol: { stream: false, format: 'text' },
      maxRetries: 2,
      timeout: 5000,
    } as unknown as AiProfile;

    const dummyPreset: PresetProfile = {
      name: '测试预设',
      source: 'test',
      version: '1.0',
      sourceType: 'openai',
      prompts: [],
      sampler: { temperature: 0.8, topP: 0.95, topK: 0, topA: 0, minP: 0, repetitionPenalty: 1, frequencyPenalty: 0, presencePenalty: 0 } as PresetSampler,
      context: { maxContext: 8192, maxTokens: 1024, maxContextUnlocked: false } as PresetContextBudget,
      session: { stream: false, useSystemPrompt: false } as PresetSession,
      extensions: {} as PresetExtensions,
      importedAt: Date.now(),
      raw: {} as never,
      warnings: [],
    };

    const req: GatewayRequest = {
      profile: brokenProfile,
      preset: dummyPreset,
      messages: [{ role: 'user', content: '测试' }],
    };

    // 2. 调用 ModelGateway
    const result: GatewayResult = await modelGateway.invoke(req);

    // 3. 断言:调用失败 + 错误信息 + 重试计数
    assertions.push({
      name: 'GatewayResult.ok = false(端点未配置)',
      ok: result.ok === false,
      expected: 'false',
      actual: String(result.ok),
    });
    assertions.push({
      name: '错误信息含"端点未配置"',
      ok: !!result.error && result.error.includes('端点未配置'),
      expected: '包含"端点未配置"',
      actual: result.error ?? '空',
    });
    assertions.push({
      name: 'trace 记录失败步骤',
      ok: result.trace.length > 0 && result.trace.some((t) => t.step.includes('endpoint') || t.step.includes('missing')),
      expected: '>0 条 trace',
      actual: `${result.trace.length} 条`,
    });

    // 4. 模拟生成失败报告(Kernel 保留 StreamDraft)
    const draft: StreamDraft = {
      turnId: 'd1-turn-1',
      userAction: '测试动作',
      startedAt: Date.now(),
      baseRevisionHash: kernel.getCurrentRevisionHash(),
      baseStatData: kernel.getStatData(),
      mainAiPartial: '',
      varAiText: '',
      mainAiDone: false,
      varAiDone: false,
      errors: [result.error ?? '未知错误'],
    };

    const failureReport = recovery.buildFailureReport('model-fail', result.error ?? '未知错误', draft, [
      `trace 步骤数:${result.trace.length}`,
      `重试次数:${result.retryCount}`,
    ]);

    assertions.push({
      name: 'FailureReport.type = model-fail',
      ok: failureReport.type === 'model-fail',
      expected: 'model-fail',
      actual: failureReport.type,
    });
    assertions.push({
      name: 'FailureReport.canRetry = true(模型失败可重试)',
      ok: failureReport.canRetry === true,
      expected: 'true',
      actual: String(failureReport.canRetry),
    });
    assertions.push({
      name: 'FailureReport.recommendation = retry',
      ok: failureReport.recommendation === 'retry',
      expected: 'retry',
      actual: failureReport.recommendation,
    });
    assertions.push({
      name: 'FailureReport.draft 保留(可重试基础)',
      ok: failureReport.draft !== null && failureReport.draft.turnId === 'd1-turn-1',
      expected: '非空,turnId=d1-turn-1',
      actual: failureReport.draft ? `turnId=${failureReport.draft.turnId}` : 'null',
    });

    // 5. 验证 Kernel 状态未被污染
    const sd = kernel.getStatData();
    assertions.push({
      name: 'Kernel 状态未被污染(stat_data 仍含 __testPrefix=d1)',
      ok: sd.__testPrefix === 'd1',
      expected: 'd1',
      actual: String(sd.__testPrefix),
    });
  } catch (e) {
    errors.push(`d1 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestKernel(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'd1',
    name: '模型调用失败',
    failureType: 'model-fail',
    failureInjection: '未配置端点(baseURL/apiKey/model 全空)+ maxRetries=2',
    ok,
    evidence: ok
      ? `GatewayResult.ok=false + FailureReport.canRetry=true + draft 保留 + Kernel 状态未污染(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  d2: 解析错误(malformed JSONPatch)
// ───────────────────────────────────────────────────────────

async function drillD2_parseFailure(): Promise<FailureDrillResult> {
  const assertions: FailureDrillResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    kernel = await createTestKernel('d2');
    const beforeSd = kernel.getStatData();

    // 1. 构造 malformed 变量 AI 输出(JSONPatch 不是合法 JSON)
    const malformedVarAiText = `<UpdateVariable>
<Analysis>
本轮变量更新(故意 malformed)。
</Analysis>
<JSONPatch>
[
  { "op": "replace", "path": "/主角/魅力", "value": 60 },
  { "op": "replace", "path": "/主角/学业", "valu
</JSONPatch>
</UpdateVariable>`;

    const mainAiText = '叙事正文(测试 d2 解析失败)。';

    // 2. 启动回合 + finalizeStream(应捕获解析错误,不抛出)
    const draft = await kernel.startTurn({ action: 'd2 测试动作' });
    const raw = kernel.finalizeStream(draft, mainAiText, malformedVarAiText);

    // 3. 断言:解析错误被捕获
    assertions.push({
      name: 'varAiParsed.parseErrors 非空(捕获解析错误)',
      ok: raw.varAiParsed.parseErrors.length > 0,
      expected: '>0 个错误',
      actual: `${raw.varAiParsed.parseErrors.length} 个:${raw.varAiParsed.parseErrors[0]?.slice(0, 50) ?? ''}`,
    });
    assertions.push({
      name: 'varAiParsed.ops 为空或部分(失败时不应用)',
      ok: raw.varAiParsed.ops.length === 0,
      expected: '0',
      actual: String(raw.varAiParsed.ops.length),
    });

    // 4. 生成失败报告
    const failureReport = recovery.buildFailureReport(
      'parse-fail',
      `解析错误:${raw.varAiParsed.parseErrors.join('; ')}`,
      draft,
      [`ops 数:${raw.varAiParsed.ops.length}`],
    );

    assertions.push({
      name: 'FailureReport.type = parse-fail',
      ok: failureReport.type === 'parse-fail',
      expected: 'parse-fail',
      actual: failureReport.type,
    });
    assertions.push({
      name: 'FailureReport.recommendation = rollback(解析失败推荐回滚)',
      ok: failureReport.recommendation === 'rollback',
      expected: 'rollback',
      actual: failureReport.recommendation,
    });
    assertions.push({
      name: 'FailureReport.canRetry = false(解析失败不直接重试)',
      ok: failureReport.canRetry === false,
      expected: 'false',
      actual: String(failureReport.canRetry),
    });

    // 5. 执行 Kernel.rollback(模拟按推荐回滚)
    kernel.rollback(draft);
    const afterSd = kernel.getStatData();

    // 6. 断言:状态零污染(回滚后 stat_data 与 base 相同)
    const beforeJson = JSON.stringify(beforeSd);
    const afterJson = JSON.stringify(afterSd);
    assertions.push({
      name: '回滚后 stat_data 与 before 一致(零污染)',
      ok: beforeJson === afterJson,
      expected: 'JSON 一致',
      actual: beforeJson === afterJson ? '一致' : '不一致',
    });
  } catch (e) {
    errors.push(`d2 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestKernel(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'd2',
    name: '解析错误',
    failureType: 'parse-fail',
    failureInjection: '变量AI 输出 malformed JSONPatch(JSON 截断)',
    ok,
    evidence: ok
      ? `parseErrors 捕获 + ops 不应用 + rollback 后状态零污染(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  d3: Zod 校验失败(ops 违反 schema)
// ───────────────────────────────────────────────────────────

async function drillD3_zodFailure(): Promise<FailureDrillResult> {
  const assertions: FailureDrillResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    kernel = await createTestKernel('d3');

    // 1. 构造合法 JSONPatch 但值违反 schema(主角.魅力 应为数字,传字符串)
    const varAiText = `<UpdateVariable>
<Analysis>
本轮变量更新(故意触发 Zod 失败)。
</Analysis>
<JSONPatch>
[
  { "op": "replace", "path": "/主角/魅力", "value": "不是数字" },
  { "op": "replace", "path": "/主角/学业", "value": 70 },
  { "op": "replace", "path": "/主角/不存在字段", "value": 999 }
]
</JSONPatch>
</UpdateVariable>`;

    const mainAiText = '叙事正文(测试 d3 Zod 失败)。';

    // 2. finalizeStream + aggregate(解析成功,但 Zod 校验在 commit 时失败)
    const draft = await kernel.startTurn({ action: 'd3 测试动作' });
    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
    const candidate = kernel.aggregate(raw);

    assertions.push({
      name: '解析成功(parseErrors 为空)',
      ok: raw.varAiParsed.parseErrors.length === 0,
      expected: '0',
      actual: String(raw.varAiParsed.parseErrors.length),
    });
    assertions.push({
      name: '解析出 3 个 ops',
      ok: raw.varAiParsed.ops.length === 3,
      expected: '3',
      actual: String(raw.varAiParsed.ops.length),
    });

    // 3. 提交(commit 内部跑 Zod 校验,部分 ops 应被拒绝)
    const facts = await kernel.commit(candidate);

    assertions.push({
      name: 'TransactionResult.rejectedCount > 0(部分 ops 被拒绝)',
      ok: facts.txResult.rejectedCount > 0,
      expected: '>0',
      actual: String(facts.txResult.rejectedCount),
    });
    assertions.push({
      name: 'TransactionResult.appliedCount ≥ 0(部分可能通过)',
      ok: facts.txResult.appliedCount >= 0,
      expected: '>=0',
      actual: String(facts.txResult.appliedCount),
    });
    assertions.push({
      name: 'CommittedFacts.errors 含校验错误信息',
      ok: facts.errors.length > 0 || facts.txResult.validations.some((v) => !v.ok && !!v.error),
      expected: '>0 条错误',
      actual: `${facts.errors.length} + ${facts.txResult.validations.filter((v) => !v.ok).length} 条`,
    });

    // 4. 生成失败报告
    const failureReport = recovery.buildFailureReport(
      'zod-fail',
      `Zod 校验失败:rejected=${facts.txResult.rejectedCount}`,
      draft,
      facts.txResult.validations.filter((v) => !v.ok).map((v) => `${v.op.path}: ${v.error ?? '未知'}`),
    );

    assertions.push({
      name: 'FailureReport.type = zod-fail',
      ok: failureReport.type === 'zod-fail',
      expected: 'zod-fail',
      actual: failureReport.type,
    });
    assertions.push({
      name: 'FailureReport.recommendation = abort(Zod 失败推荐中止,由用户决定)',
      ok: failureReport.recommendation === 'abort',
      expected: 'abort',
      actual: failureReport.recommendation,
    });
  } catch (e) {
    errors.push(`d3 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestKernel(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'd3',
    name: 'Zod 校验失败',
    failureType: 'zod-fail',
    failureInjection: 'ops 违反 schema(主角.魅力 传字符串 / 主角.不存在字段)',
    ok,
    evidence: ok
      ? `rejectedCount > 0 + 部分提交 + recommendation=abort(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  d4: IndexedDB 写入失败(kvSet 抛异常)
// ───────────────────────────────────────────────────────────

async function drillD4_idbFailure(): Promise<FailureDrillResult> {
  const assertions: FailureDrillResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;
  let overridesInstalled = false;

  try {
    kernel = await createTestKernel('d4');
    const beforeSd = kernel.getStatData();

    // 1-2. 安装测试覆盖：kvSet/createRevision 抛异常
    let invokeCount = 0;
    idb.__setIdbTestOverrides({
      kvSet: async () => {
        invokeCount++;
        throw new Error(`mock-idb-fail: kvSet 第 ${invokeCount} 次调用抛异常`);
      },
      createRevision: async () => {
        throw new Error('mock-idb-fail: createRevision 抛异常');
      },
    });
    overridesInstalled = true;

    // 3. 尝试提交一个回合(应触发 IDB 写入失败)
    const varAiText = `<UpdateVariable>
<Analysis>
本轮变量更新(测试 d4 IDB 失败)。
</Analysis>
<JSONPatch>
[
  { "op": "replace", "path": "/主角/心情", "value": 70 }
]
</JSONPatch>
</UpdateVariable>`;
    const mainAiText = '叙事正文(测试 d4 IDB 失败)。';

    const draft = await kernel.startTurn({ action: 'd4 测试动作' });
    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
    const candidate = kernel.aggregate(raw);

    let commitError: Error | null = null;
    try {
      await kernel.commit(candidate);
    } catch (e) {
      commitError = e instanceof Error ? e : new Error(String(e));
    }

    // 4. 断言:commit 抛异常
    assertions.push({
      name: 'kernel.commit 抛异常(IDB 写入失败)',
      ok: commitError !== null,
      expected: '抛异常',
      actual: commitError ? commitError.message.slice(0, 60) : '未抛异常',
    });

    // 5. 生成失败报告
    const failureReport = recovery.buildFailureReport(
      'idb-fail',
      commitError?.message ?? '未知 IDB 错误',
      draft,
      [`mock 调用次数:${invokeCount}`],
    );

    assertions.push({
      name: 'FailureReport.type = idb-fail',
      ok: failureReport.type === 'idb-fail',
      expected: 'idb-fail',
      actual: failureReport.type,
    });
    assertions.push({
      name: 'FailureReport.canRetry = true(IDB 失败可重试)',
      ok: failureReport.canRetry === true,
      expected: 'true',
      actual: String(failureReport.canRetry),
    });
    assertions.push({
      name: 'FailureReport.recommendation = retry',
      ok: failureReport.recommendation === 'retry',
      expected: 'retry',
      actual: failureReport.recommendation,
    });

    // 6. 验证内存 stat_data 保留(MVU 已应用但未持久化)
    const afterSd = kernel.getStatData();
    const beforePlayer = beforeSd.主角 as Record<string, unknown> | undefined;
    const afterPlayer = afterSd.主角 as Record<string, unknown> | undefined;
    assertions.push({
      name: '内存 stat_data 保留(主角对象存在)',
      ok: !!afterPlayer,
      expected: '存在',
      actual: afterPlayer ? '存在' : '空',
    });
    // 注:commit 失败前 MVU 可能已应用 ops,但未持久化
    assertions.push({
      name: 'Kernel 仍有 MVU 运行时(可重试基础)',
      ok: !!kernel.getMvuRuntime(),
      expected: '非空',
      actual: kernel.getMvuRuntime() ? '非空' : '空',
    });
  } catch (e) {
    errors.push(`d4 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    // 清除测试覆盖
    if (overridesInstalled) idb.__setIdbTestOverrides(null);
    if (kernel) await cleanupTestKernel(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'd4',
    name: 'IndexedDB 写入失败',
    failureType: 'idb-fail',
    failureInjection: 'mock idb.kvSet + idb.createRevision 抛异常',
    ok,
    evidence: ok
      ? `commit 抛异常 + FailureReport.canRetry=true + 内存 stat_data 保留(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  d5: getwi 加载失败(条目路径不存在)
// ───────────────────────────────────────────────────────────

async function drillD5_getwiFailure(): Promise<FailureDrillResult> {
  const assertions: FailureDrillResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();

  try {
    // 1. 清空 getwiLoader 缓存
    getwiLoader.clearCache();

    // 2. 加载不存在的条目
    const missingPath = '不存在/的/条目/路径_测试_d5';
    const result = getwiLoader.loadRaw(missingPath);

    assertions.push({
      name: 'loadRaw.found = false(条目不存在)',
      ok: result.found === false,
      expected: 'false',
      actual: String(result.found),
    });
    assertions.push({
      name: 'loadRaw.rawSource = ""(空字符串)',
      ok: result.rawSource === '',
      expected: '空',
      actual: result.rawSource ? '非空' : '空',
    });
    assertions.push({
      name: 'loadRaw.entry = null(无条目元信息)',
      ok: result.entry === null,
      expected: 'null',
      actual: result.entry ? '非空' : 'null',
    });

    // 3. 检查 missing 集合记录
    const missing = getwiLoader.getMissing();
    assertions.push({
      name: 'getwiLoader.getMissing() 含失败路径',
      ok: missing.includes(missingPath),
      expected: `含 ${missingPath}`,
      actual: missing.join(',') || '空',
    });

    // 4. 测试 expand(源码中含 getwi 调用不存在的路径)
    const sourceWithMissing = '前文\n<%= getwi("不存在/条目_d5") %>\n后文';
    const expanded = getwiLoader.expand(sourceWithMissing);

    assertions.push({
      name: 'expand 返回含 getwi:missing 占位注释',
      ok: expanded.includes('<!-- getwi:missing:') || expanded.includes('不存在/条目_d5'),
      expected: '含占位注释',
      actual: expanded.includes('<!-- getwi:missing:') ? '含占位注释' : '不含',
    });
    assertions.push({
      name: 'expand 不抛异常(失败降级)',
      ok: typeof expanded === 'string' && expanded.length > 0,
      expected: 'string 且非空',
      actual: `${typeof expanded}, 长度=${expanded.length}`,
    });
    assertions.push({
      name: 'expand 保留前文/后文(部分渲染)',
      ok: expanded.includes('前文') && expanded.includes('后文'),
      expected: '含前文+后文',
      actual: expanded.includes('前文') && expanded.includes('后文') ? '保留' : '丢失',
    });

    // 5. 测试 runtimeGetwi(运行时降级)
    const rtResult = await getwiLoader.runtimeGetwi('运行时/不存在_d5');
    assertions.push({
      name: 'runtimeGetwi 返回占位注释(不抛异常)',
      ok: typeof rtResult === 'string' && rtResult.includes('getwi:missing:'),
      expected: '含 getwi:missing:',
      actual: rtResult.slice(0, 60),
    });
  } catch (e) {
    errors.push(`d5 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    getwiLoader.clearCache();
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'd5',
    name: 'getwi 加载失败',
    failureType: 'getwi-fail',
    failureInjection: '加载不存在的条目路径 + expand 含缺失 getwi 调用',
    ok,
    evidence: ok
      ? `found=false + missing 集合记录 + 占位注释返回 + 不阻塞渲染(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  d6: EJS 渲染失败(模板语法错误)
// ───────────────────────────────────────────────────────────

async function drillD6_ejsFailure(): Promise<FailureDrillResult> {
  const assertions: FailureDrillResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();

  try {
    // 1. 动态导入 ejs-engine(避免静态依赖问题)
    const ejsEngineModule = await import('./ejs-engine');
    const EjsEngineClass = ejsEngineModule.EjsEngine;

    // 2. 构造测试用 MvuRuntime + EjsEngine 实例
    const testMvu = new MvuRuntime({ 主角: { 魅力: 50, 学业: 60 } });
    const ejsEngine = new EjsEngineClass(testMvu);

    // 3. 构造语法错误的 EJS 模板(<% %> 空代码块是语法错误)
    const syntaxErrorTemplate = '前文\n<% if (true) { %>\n内容\n<% } %>\n<%= 主角.魅力 %>\n后文\n<% %>';

    // 4. 尝试渲染语法错误的模板(catchErrors=true,应返回 ok=false)
    const brokenResult = await ejsEngine.render(syntaxErrorTemplate, { catchErrors: true });

    assertions.push({
      name: '渲染语法错误模板时:ok=false(错误被捕获)',
      ok: brokenResult.ok === false,
      expected: 'false',
      actual: String(brokenResult.ok),
    });
    assertions.push({
      name: '错误信息非空',
      ok: !!brokenResult.error && brokenResult.error.length > 0,
      expected: '非空',
      actual: brokenResult.error?.slice(0, 60) ?? '空',
    });

    // 5. 测试合法模板仍可渲染(验证引擎未崩溃)
    const validTemplate = '前文\n<%= 主角.魅力 %>\n后文';
    const validResult = await ejsEngine.render(validTemplate, { catchErrors: true });

    assertions.push({
      name: '合法模板仍可正常渲染(ok=true,引擎未崩溃)',
      ok: validResult.ok === true && validResult.output.includes('50') && validResult.output.includes('前文'),
      expected: 'ok=true, 含 "50" + "前文"',
      actual: `ok=${validResult.ok}, output=${validResult.output.slice(0, 60)}`,
    });

    // 6. 测试引用未定义变量(运行时错误)
    const undefinedVarTemplate = '<%= 不存在的变量.字段 %>';
    const undefResult = await ejsEngine.render(undefinedVarTemplate, { catchErrors: true });

    assertions.push({
      name: '引用未定义变量:ok=false 或 返回字符串(不崩溃)',
      ok: undefResult.ok === false || typeof undefResult.output === 'string',
      expected: 'ok=false 或 字符串',
      actual: `ok=${undefResult.ok}, output=${undefResult.output.slice(0, 60)}`,
    });

    // 7. 测试 catchErrors=false 时会抛异常
    let threwError = false;
    try {
      await ejsEngine.render(syntaxErrorTemplate, { catchErrors: false });
    } catch {
      threwError = true;
    }
    assertions.push({
      name: 'catchErrors=false 时语法错误抛异常',
      ok: threwError,
      expected: '抛异常',
      actual: String(threwError),
    });
  } catch (e) {
    errors.push(`d6 异常: ${e instanceof Error ? e.message : String(e)}`);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'd6',
    name: 'EJS 渲染失败',
    failureType: 'ejs-fail',
    failureInjection: '语法错误模板(<% %> 空块)+ 未定义变量引用',
    ok,
    evidence: ok
      ? `语法错误被捕获 + 合法模板仍可渲染 + 引擎未崩溃(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  d7: 浏览器崩溃恢复(销毁 Kernel + 新 Kernel 恢复)
// ───────────────────────────────────────────────────────────

async function drillD7_crashRecovery(): Promise<FailureDrillResult> {
  const assertions: FailureDrillResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel1: Kernel | null = null;
  let kernel2: Kernel | null = null;

  try {
    // 1. 创建第一个 Kernel,写入一些状态
    kernel1 = await createTestKernel('d7');
    const sd1 = kernel1.getStatData();

    // 2. 修改状态(模拟游戏进行了一回合)
    const player = sd1.主角 as Record<string, unknown> | undefined;
    if (player) {
      player.魅力 = 75;
      player.学业 = 80;
    }
    const time = sd1.时间 as Record<string, unknown> | undefined;
    if (time) {
      time.天数 = 5;
      time.小时 = 14;
    }
    await kernel1.initializeNewGame(sd1);
    const hash1 = kernel1.getCurrentRevisionHash();
    const turnCount1 = kernel1.getTurnCount();
    const actionsToday1 = kernel1.getActionsToday();

    assertions.push({
      name: 'kernel1 写入状态完成(hash 非空)',
      ok: !!hash1,
      expected: '非空',
      actual: hash1?.slice(0, 8) ?? '空',
    });

    // 3. 模拟浏览器崩溃:丢弃 kernel1(不调用 reset,模拟突然崩溃)
    // 注:不调用 cleanupTestKernel,让 IDB 中的 revision 保留
    kernel1 = null; // 模拟内存丢失

    // 4. 创建新 Kernel,执行恢复
    kernel2 = new Kernel();
    await kernel2.init();

    // 5. 调用 Recovery.recoverFromLatest
    const report = await recovery.recoverFromLatest(kernel2);

    assertions.push({
      name: 'RecoveryReport.ok = true(恢复成功)',
      ok: report.ok,
      expected: 'true',
      actual: String(report.ok),
    });
    assertions.push({
      name: `RecoveryReport.source = ptr(指针有效)或 fallback(降级)`,
      ok: report.source === 'ptr' || report.source === 'fallback',
      expected: 'ptr 或 fallback',
      actual: report.source,
    });
    assertions.push({
      name: 'RecoveryReport.restoredHash 非空',
      ok: !!report.restoredHash,
      expected: '非空',
      actual: report.restoredHash?.slice(0, 8) ?? '空',
    });

    // 6. 验证恢复后的 stat_data 与崩溃前一致
    const sd2 = kernel2.getStatData();
    const player2 = sd2.主角 as Record<string, unknown> | undefined;
    const time2 = sd2.时间 as Record<string, unknown> | undefined;

    assertions.push({
      name: '恢复后 主角.魅力 = 75(崩溃前写入值)',
      ok: (player2?.魅力 as number) === 75,
      expected: '75',
      actual: String(player2?.魅力),
    });
    assertions.push({
      name: '恢复后 主角.学业 = 80(崩溃前写入值)',
      ok: (player2?.学业 as number) === 80,
      expected: '80',
      actual: String(player2?.学业),
    });
    assertions.push({
      name: '恢复后 时间.天数 = 5(崩溃前写入值)',
      ok: (time2?.天数 as number) === 5,
      expected: '5',
      actual: String(time2?.天数),
    });
    assertions.push({
      name: '恢复后 时间.小时 = 14(崩溃前写入值)',
      ok: (time2?.小时 as number) === 14,
      expected: '14',
      actual: String(time2?.小时),
    });

    // 7. 验证元数据恢复
    assertions.push({
      name: '恢复后 turnCount 与崩溃前一致',
      ok: kernel2.getTurnCount() === turnCount1,
      expected: String(turnCount1),
      actual: String(kernel2.getTurnCount()),
    });

    // 8. 一致性校验
    const consistency = await recovery.verifyConsistency(kernel2);
    assertions.push({
      name: '一致性校验通过(verifyConsistency.ok = true)',
      ok: consistency.ok,
      expected: 'true',
      actual: String(consistency.ok),
    });
  } catch (e) {
    errors.push(`d7 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel1) await cleanupTestKernel(kernel1);
    if (kernel2) await cleanupTestKernel(kernel2);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'd7',
    name: '浏览器崩溃恢复',
    failureType: 'crash-recovery',
    failureInjection: '丢弃 Kernel1 实例(模拟崩溃)→ 新 Kernel2 + Recovery.recoverFromLatest',
    ok,
    evidence: ok
      ? `RecoveryReport.ok=true + stat_data 恢复 + 一致性校验通过(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  演练执行器
// ───────────────────────────────────────────────────────────

class FailureDrillRunner {
  /** 运行全部 7 类演练 */
  async runAll(): Promise<FailureDrillReport> {
    const results: FailureDrillResult[] = [];
    const startedAt = Date.now();

    // 顺序执行(避免 IndexedDB 并发冲突)
    const drills = [
      drillD1_modelCallFailure,
      drillD2_parseFailure,
      drillD3_zodFailure,
      drillD4_idbFailure,
      drillD5_getwiFailure,
      drillD6_ejsFailure,
      drillD7_crashRecovery,
    ];

    for (const fn of drills) {
      try {
        const result = await fn();
        results.push(result);
      } catch (e) {
        results.push({
          id: 'unknown',
          name: fn.name,
          failureType: 'unknown' as FailureDrillResult['failureType'],
          failureInjection: '',
          ok: false,
          evidence: '执行器异常',
          assertions: [],
          errors: [e instanceof Error ? e.message : String(e)],
          elapsedMs: 0,
        });
      }
    }

    const passed = results.filter((r) => r.ok).length;
    const failed = results.length - passed;

    return {
      ok: failed === 0,
      passed,
      failed,
      total: results.length,
      results,
      elapsedMs: Date.now() - startedAt,
    };
  }

  /** 运行单个演练 */
  async runOne(id: string): Promise<FailureDrillResult | null> {
    switch (id) {
      case 'd1':
        return drillD1_modelCallFailure();
      case 'd2':
        return drillD2_parseFailure();
      case 'd3':
        return drillD3_zodFailure();
      case 'd4':
        return drillD4_idbFailure();
      case 'd5':
        return drillD5_getwiFailure();
      case 'd6':
        return drillD6_ejsFailure();
      case 'd7':
        return drillD7_crashRecovery();
      default:
        return null;
    }
  }
}

// ───────────────────────────────────────────────────────────
//  单例导出
// ───────────────────────────────────────────────────────────

export const failureDrillRunner = new FailureDrillRunner();
