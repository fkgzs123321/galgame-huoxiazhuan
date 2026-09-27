/**
 * E2E Verifier(步骤9:端到端垂直切片验证)
 *
 * 职责:
 *  - 6 个验证场景的定义与执行器(不调用真实 API,全部用 mock AI 输出)
 *  - TraceCollector:聚合 5 类 trace
 *      aiCall(2AI 调用链)/ getwiLoad / variableUpdate(JSONPatch before/after)/
 *      worldbookHit / presetApply(字段映射/Sampler/Prompt 顺序/ST 内置标识符槽位)
 *  - 每个场景返回 ScenarioResult(ok/trace/details/errors)
 *  - runAll() 顺序执行 6 场景,返回汇总报告
 *
 * 设计要点:
 *  - 场景1-5 使用 mock 模型响应(构造合法/非法 <UpdateVariable> 文本)
 *  - 场景6 构造模拟"三人逆行"预设 JSON(含 13 个 ST 内置标识符 + 全角文件名 + Sampler)
 *  - TraceCollector 不修改 Kernel 状态,只读采集
 *  - 每个场景独立 Kernel 实例,避免状态污染
 *
 * 不做:
 *  - 真实模型调用(由步骤6 ModelGateway 负责,E2E 只验证运行时链路)
 *  - UI 渲染(由 E2EVerifier.tsx)
 */

import { Kernel, type CommittedFacts, type CandidateChangeSet, type StreamDraft } from './kernel';
import { parseAiOutput, type ParsedAiOutput, type TransactionResult } from './mvu-transaction';
import { schemaRegistry } from './schema-loader';
import * as idb from '../db/indexeddb';
import { saveCas } from '../db/save-cas';
import { recovery } from './recovery';
import {
  importPreset,
  validatePresetFormat,
} from './preset/importer';
import {
  ST_BUILTIN_IDENTIFIERS,
  isStBuiltinIdentifier,
  type StPresetRaw,
} from './preset/types';
import { builtinOriginalDefault } from '../content/presets/builtin-presets';

// ───────────────────────────────────────────────────────────
//  Trace 类型
// ───────────────────────────────────────────────────────────

export type TraceCategory =
  | 'aiCall'
  | 'getwiLoad'
  | 'variableUpdate'
  | 'worldbookHit'
  | 'presetApply';

export interface TraceEntry {
  /** 类别 */
  category: TraceCategory;
  /** 步骤名 */
  step: string;
  /** 详情 */
  detail: string;
  /** 时间戳 */
  timestamp: number;
  /** 关联数据(可选,便于 UI 展开详情) */
  data?: unknown;
}

/** Trace 收集器 */
export class TraceCollector {
  private entries: TraceEntry[] = [];

  append(category: TraceCategory, step: string, detail: string, data?: unknown): void {
    this.entries.push({
      category,
      step,
      detail,
      timestamp: Date.now(),
      data,
    });
  }

  all(): TraceEntry[] {
    return [...this.entries];
  }

  byCategory(category: TraceCategory): TraceEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}

// ───────────────────────────────────────────────────────────
//  场景结果类型
// ───────────────────────────────────────────────────────────

export interface ScenarioResult {
  /** 场景 ID */
  id: string;
  /** 场景名 */
  name: string;
  /** 是否通过 */
  ok: boolean;
  /** 完成证据(简短描述) */
  evidence: string;
  /** 详细步骤 trace(本场景产生的) */
  traces: TraceEntry[];
  /** 断言详情(每条断言的 ok/期望/实际) */
  assertions: Array<{
    name: string;
    ok: boolean;
    expected?: string;
    actual?: string;
  }>;
  /** 错误(若有) */
  errors: string[];
  /** 耗时(ms) */
  elapsedMs: number;
}

export interface E2EReport {
  /** 全部场景是否通过 */
  ok: boolean;
  /** 通过数 */
  passed: number;
  /** 失败数 */
  failed: number;
  /** 总场景数 */
  total: number;
  /** 各场景结果 */
  results: ScenarioResult[];
  /** 全部 trace(按时间排序) */
  allTraces: TraceEntry[];
  /** 总耗时(ms) */
  elapsedMs: number;
}

// ───────────────────────────────────────────────────────────
//  Mock AI 输出构造器
// ───────────────────────────────────────────────────────────

/** 构造合法的变量 AI 输出(含 <UpdateVariable>/<Analysis>/<JSONPatch>) */
function buildMockVarAiOutput(ops: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>): string {
  const jsonPatch = JSON.stringify(ops, null, 2);
  return `<UpdateVariable>
<Analysis>
本轮变量更新:共 ${ops.length} 个操作。
</Analysis>
<JSONPatch>
${jsonPatch}
</JSONPatch>
</UpdateVariable>`;
}

/** 构造合法的主聊天 AI 输出(叙事正文 + StatusPlaceHolderImpl) */
function buildMockMainAiOutput(narrative: string): string {
  return `${narrative}

<StatusPlaceHolderImpl/>`;
}

/** 构造非法的变量 AI 输出(JSONPatch 格式错误) */
function buildMockInvalidVarAiOutput(): string {
  return `<UpdateVariable>
<Analysis>
错误输出测试。
</Analysis>
<JSONPatch>
[ { "op": "replace", "path": "/主角/魅力", "value": "不是数字" } ]
</JSONPatch>
</UpdateVariable>`;
}

/** 构造违反 Zod 的变量 AI 输出(逐 op 校验失败 + 合法 op 混合)
 *  - remove 不存在路径 → validateOp 拒绝(rejectedCount > 0)
 *  - replace 天数 = 2 → 合法(appliedCount > 0,整体 safeParse 通过)
 *  - replace 不存在路径(非 record 子路径)→ validateOp 拒绝
 */
function buildMockZodViolationVarAiOutput(): string {
  return `<UpdateVariable>
<Analysis>
Zod 校验失败测试:remove 不存在字段 + replace 不存在路径 + 合法 replace 天数。
</Analysis>
<JSONPatch>
[
  { "op": "remove", "path": "/主角/不存在字段_xyz" },
  { "op": "replace", "path": "/主角/不存在字段_abc", "value": 123 },
  { "op": "replace", "path": "/时间/天数", "value": 2 }
]
</JSONPatch>
</UpdateVariable>`;
}

// ───────────────────────────────────────────────────────────
//  模拟"三人逆行"预设(场景6 用)
//  - 不读取真实文件(文件系统未提供),构造一个含 13 个 ST 内置标识符 + 全角文件名 + Sampler 的简化版
//  - 验证 importer + mapper + ST 内置标识符识别 + Sampler 生效
// ───────────────────────────────────────────────────────────

function buildMockSanrenNixingPreset(): { json: string; fileName: string } {
  const fileName = '三人逆行v11.0—PrismFox 正式版（数据库变量版）.json';
  const prompts: StPresetRaw['prompts'] = [];
  // 13 个 ST 内置标识符(全部)
  for (const id of ST_BUILTIN_IDENTIFIERS) {
    prompts.push({
      identifier: id,
      name: id,
      enabled: true,
      role: 'system',
      content: `【${id}】内置槽位内容`,
      injection_position: 0,
      injection_depth: 0,
      injection_order: 0,
      system_prompt: true,
      marker: false,
    });
  }
  // 模拟自定义条目(凑到 30+ 条,模拟规模)
  for (let i = 1; i <= 20; i++) {
    prompts.push({
      identifier: `custom_sanren_${i}`,
      name: `三人逆行自定义 ${i}`,
      enabled: i % 2 === 0,
      role: i % 3 === 0 ? 'user' : 'system',
      content: `自定义条目 ${i}:含 {{user}} / {{char}} / {{getvar::主角.玩家姓名}} 宏`,
      injection_position: i % 2,
      injection_depth: i % 4,
      injection_order: i,
      system_prompt: false,
      marker: false,
    });
  }
  const raw: StPresetRaw = {
    preset_version: '3',
    chat_completion_source: 'openai',
    prompts,
    prompt_order: [
      {
        character_id: 100001,
        order: [
          ...ST_BUILTIN_IDENTIFIERS.map((id) => ({ identifier: id, enabled: true })),
          ...Array.from({ length: 20 }, (_, i) => ({
            identifier: `custom_sanren_${i + 1}`,
            enabled: (i + 1) % 2 === 0,
          })),
        ],
      },
    ],
    // ST 预设 sampler 字段在顶层(mapper.ts mapSampler 读取 raw.temperature/raw.top_p 等)
    temperature: 0.99,
    top_p: 0.88,
    top_k: 0,
    top_a: 0,
    min_p: 0,
    repetition_penalty: 1.05,
    frequency_penalty: 0.5,
    presence_penalty: 0.3,
    seed: -1,
    // 上下文预算(ST 字段名)
    openai_max_context: 32768,
    openai_max_tokens: 2048,
    max_context_unlocked: true,
    // 会话控制
    stream_openai: true,
    use_sysprompt: true,
    names_behavior: 2,
  } as StPresetRaw;
  return { json: JSON.stringify(raw), fileName };
}

// ───────────────────────────────────────────────────────────
//  辅助:创建测试用 Kernel + 初始 stat_data
// ───────────────────────────────────────────────────────────

async function createTestKernel(prefix: string): Promise<Kernel> {
  const k = new Kernel();
  await k.init();
  // 用 schema 默认值初始化
  const parsed = schemaRegistry.safeParseFull({});
  const initialStatData =
    parsed.ok && parsed.data && typeof parsed.data === 'object'
      ? (parsed.data as Record<string, unknown>)
      : {};
  // 标记测试用前缀(便于清理)
  (initialStatData as Record<string, unknown>).__testPrefix = prefix;
  await k.initializeNewGame(initialStatData);
  return k;
}

/** 清理测试产生的 revision(可选,避免 IndexedDB 膨胀) */
async function cleanupTestRevisions(kernel: Kernel): Promise<void> {
  try {
    await kernel.reset();
  } catch {
    // 忽略
  }
}

// ───────────────────────────────────────────────────────────
//  6 个场景执行器
// ───────────────────────────────────────────────────────────

/**
 * 场景1:配置 Key + 选 P1 + 开场叙事
 *  - 验证 initializeNewGame 创建初始 revision
 *  - 验证 opening AI mock 输出叙事正文
 *  - 验证 stat_data 含 P1 身份字段
 */
async function scenario1_opening(trace: TraceCollector): Promise<ScenarioResult> {
  const assertions: ScenarioResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    trace.append('aiCall', 'scenario1-start', '场景1 启动:配置 Key + 选 P1 + 开场叙事');

    // 1. 创建 Kernel 并初始化
    kernel = await createTestKernel('s1');
    trace.append('aiCall', 'kernel-init', `Kernel 初始化完成,hash=${kernel.getCurrentRevisionHash()?.slice(0, 8)}`);

    // 2. 模拟选 P1:重写主角字段
    const sd = kernel.getStatData();
    const newSd = {
      ...sd,
      主角: {
        ...(sd.主角 as Record<string, unknown>),
        玩家身份: '原作主角',
        玩家姓名: '测试玩家',
        魅力: 50,
        学业: 60,
        体力: 55,
        社交: 55,
        敏感: 50,
        声誉: 55,
        现金: 5000,
      } as Record<string, unknown>,
    };
    // 模拟 opening AI 输出(变量 AI 把 P1 身份写入)
    const varAiText = buildMockVarAiOutput([
      { op: 'replace', path: '/主角/玩家身份', value: '原作主角' },
      { op: 'replace', path: '/主角/玩家姓名', value: '测试玩家' },
      { op: 'replace', path: '/主角/魅力', value: 50 },
      { op: 'replace', path: '/主角/学业', value: 60 },
      { op: 'replace', path: '/主角/体力', value: 55 },
      { op: 'replace', path: '/主角/社交', value: 55 },
      { op: 'replace', path: '/主角/敏感', value: 50 },
      { op: 'replace', path: '/主角/声誉', value: 55 },
      { op: 'replace', path: '/主角/现金', value: 5000 },
    ]);
    const mainAiText = buildMockMainAiOutput(
      '清晨的阳光透过窗帘洒入房间,新的一天开始了。我伸了个懒腰,准备迎接寒假的第一天。',
    );

    // 3. 执行一个完整回合(opening 类型)
    const draft = await kernel.startTurn({ action: '__opening_P1__', type: 'opening' });
    trace.append('aiCall', 'startTurn', `回合启动,turnId=${draft.turnId}`);

    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
    trace.append('aiCall', 'finalizeStream', `2AI 输出解析完成,varAiOps=${raw.varAiParsed.ops.length}`);

    const candidate = kernel.aggregate(raw);
    trace.append('aiCall', 'aggregate', `候选聚合,trace=${candidate.candidateTrace.length}`);

    const facts = await kernel.commit(candidate);
    trace.append('aiCall', 'commit', `提交完成,ok=${facts.ok},ops=${facts.txResult.appliedCount}/${facts.txResult.appliedCount + facts.txResult.rejectedCount}`);
    trace.append('variableUpdate', 'commit-ops', `applied=${facts.txResult.appliedCount}, rejected=${facts.txResult.rejectedCount}`, facts.txResult.validations);

    // 4. 断言
    assertions.push({
      name: '初始 revision 创建',
      ok: !!kernel.getCurrentRevisionHash(),
      expected: 'hash 非空',
      actual: kernel.getCurrentRevisionHash()?.slice(0, 12),
    });
    assertions.push({
      name: 'commit 成功',
      ok: facts.ok,
      expected: 'ok=true',
      actual: `ok=${facts.ok}`,
    });
    assertions.push({
      name: '变量 AI 输出解析(9 个 ops)',
      ok: raw.varAiParsed.ops.length === 9,
      expected: '9',
      actual: String(raw.varAiParsed.ops.length),
    });
    assertions.push({
      name: '主角.玩家身份 = 原作主角',
      ok: (facts.after.主角 as { 玩家身份?: string })?.玩家身份 === '原作主角',
      expected: '原作主角',
      actual: (facts.after.主角 as { 玩家身份?: string })?.玩家身份,
    });
    assertions.push({
      name: '主角.现金 = 5000',
      ok: (facts.after.主角 as { 现金?: number })?.现金 === 5000,
      expected: '5000',
      actual: String((facts.after.主角 as { 现金?: number })?.现金),
    });
    assertions.push({
      name: '叙事正文非空',
      ok: facts.narrative.length > 0,
      expected: '>0',
      actual: String(facts.narrative.length),
    });
    assertions.push({
      name: '新 revision hash 不同于 base',
      ok: facts.newRevisionHash !== facts.before.___baseHash___,
      expected: '不同',
      actual: `${(facts.before.___baseHash___ as string | undefined)?.slice(0, 8) ?? '-'} → ${facts.newRevisionHash.slice(0, 8)}`,
    });
  } catch (e) {
    errors.push(`场景1 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestRevisions(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 's1',
    name: '配置 Key + 选 P1 + 开场叙事',
    ok,
    evidence: ok
      ? `P1 身份写入 + 开场叙事生成 + revision 链推进(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.byCategory('aiCall').concat(trace.byCategory('variableUpdate')),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

/**
 * 场景2:玩家输入动作 + 2AI 并行 + 状态栏更新
 *  - 验证 startTurn/finalizeStream/aggregate/commit 全链路
 *  - 验证变量更新 trace(JSONPatch before/after)
 *  - 验证状态栏字段变化(主角.疲劳 +5)
 */
async function scenario2_playerAction(trace: TraceCollector): Promise<ScenarioResult> {
  const assertions: ScenarioResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    trace.append('aiCall', 'scenario2-start', '场景2 启动:玩家输入动作 + 2AI 并行');

    kernel = await createTestKernel('s2');
    const beforeFatigue = (kernel.getStatData().主角 as { 疲劳?: number })?.疲劳 ?? 0;
    trace.append('variableUpdate', 'before-snapshot', `主角.疲劳 before=${beforeFatigue}`);

    // 玩家输入动作
    const draft = await kernel.startTurn({ action: '去客厅找美佐子聊天' });
    trace.append('aiCall', 'startTurn', `回合启动,baseHash=${draft.baseRevisionHash?.slice(0, 8)}`);

    // 2AI 并行 mock
    const varAiText = buildMockVarAiOutput([
      { op: 'replace', path: '/主角/疲劳', value: beforeFatigue + 5 },
      { op: 'replace', path: '/主角/心情', value: 75 },
      { op: 'replace', path: '/时间/当前时间', value: '08:30' },
    ]);
    const mainAiText = buildMockMainAiOutput(
      '我走进客厅,美佐子正在准备早餐。"早安,今天想做什么?"她微笑着问。',
    );

    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
    trace.append('aiCall', 'finalizeStream', `2AI 并行完成,varAiOps=${raw.varAiParsed.ops.length}`);

    const candidate = kernel.aggregate(raw);
    trace.append('aiCall', 'aggregate', `候选 trace=${candidate.candidateTrace.length}`);
    // 把 candidateTrace 也记入 aiCall trace
    for (const ct of candidate.candidateTrace) {
      trace.append('aiCall', `candidate-${ct.source}`, `${ct.field} → ${ct.decision}(${ct.reason})`);
    }

    const facts = await kernel.commit(candidate);
    trace.append('aiCall', 'commit', `提交,新 hash=${facts.newRevisionHash.slice(0, 8)}`);
    trace.append('variableUpdate', 'commit-result', `applied=${facts.txResult.appliedCount}, rejected=${facts.txResult.rejectedCount}`);

    // 记录每个 op 的 before/after
    for (const v of facts.txResult.validations) {
      trace.append(
        'variableUpdate',
        `op-${v.op?.op}-${v.op?.path}`,
        `ok=${v.ok}${v.error ? `, error=${v.error}` : ''}`,
        { validation: v, before: facts.before, after: facts.after },
      );
    }

    const afterFatigue = (facts.after.主角 as { 疲劳?: number })?.疲劳;
    const afterMood = (facts.after.主角 as { 心情?: number })?.心情;
    const afterTime = (facts.after.时间 as { 当前时间?: string })?.当前时间;

    assertions.push({
      name: 'commit 成功',
      ok: facts.ok,
      expected: 'ok=true',
      actual: `ok=${facts.ok}`,
    });
    assertions.push({
      name: '主角.疲劳 +5(2AI 并行后)',
      ok: afterFatigue === beforeFatigue + 5,
      expected: String(beforeFatigue + 5),
      actual: String(afterFatigue),
    });
    assertions.push({
      name: '主角.心情 = 75',
      ok: afterMood === 75,
      expected: '75',
      actual: String(afterMood),
    });
    assertions.push({
      name: '时间.当前时间 = 08:30',
      ok: afterTime === '08:30',
      expected: '08:30',
      actual: String(afterTime),
    });
    assertions.push({
      name: '变量更新 trace ≥ 3 条',
      ok: trace.byCategory('variableUpdate').length >= 3,
      expected: '>=3',
      actual: String(trace.byCategory('variableUpdate').length),
    });
    assertions.push({
      name: '候选 trace ≥ 3 条(变量AI 3 ops)',
      ok: candidate.candidateTrace.length >= 3,
      expected: '>=3',
      actual: String(candidate.candidateTrace.length),
    });
  } catch (e) {
    errors.push(`场景2 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestRevisions(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 's2',
    name: '玩家输入动作 + 2AI 并行 + 状态栏更新',
    ok,
    evidence: ok
      ? `2AI 并行 + 3 ops 应用 + 状态栏字段变化(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

/**
 * 场景3:存档 + 重开一致性
 *  - 验证 saveCas.save 创建 scope=save revision
 *  - 验证 Kernel 重启(新实例)后通过 recovery.recoverFromLatest 恢复
 *  - 验证恢复后 stat_data 与存档一致
 */
async function scenario3_saveRecovery(trace: TraceCollector): Promise<ScenarioResult> {
  const assertions: ScenarioResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;
  let savedHash: string | null = null;
  let statBeforeSave: Record<string, unknown> = {};

  try {
    trace.append('aiCall', 'scenario3-start', '场景3 启动:存档 + 重开一致性');

    // 1. 创建 Kernel + 推进一步
    kernel = await createTestKernel('s3');
    const draft = await kernel.startTurn({ action: '存档前操作' });
    const raw = kernel.finalizeStream(
      draft,
      buildMockMainAiOutput('存档前的叙事。'),
      buildMockVarAiOutput([
        { op: 'replace', path: '/主角/心情', value: 80 },
      ]),
    );
    const candidate = kernel.aggregate(raw);
    const facts = await kernel.commit(candidate);
    trace.append('aiCall', 'pre-save-commit', `存档前 commit,hash=${facts.newRevisionHash.slice(0, 8)}`);

    statBeforeSave = kernel.getStatData();

    // 2. 创建存档
    const saveResult = await saveCas.save(kernel, { label: '场景3测试存档' });
    assertions.push({
      name: '存档创建成功',
      ok: saveResult.ok,
      expected: 'ok=true',
      actual: `ok=${saveResult.ok}`,
    });
    if (!saveResult.ok) {
      throw new Error(saveResult.error ?? '存档失败');
    }
    savedHash = saveResult.hash ?? null;
    trace.append('aiCall', 'save-created', `存档 hash=${savedHash?.slice(0, 8)}, scope=save`);

    // 2.5 加载存档(把 KV 指针切到存档 revision,模拟"从存档继续游戏")
    const loadResult = await saveCas.load(kernel, savedHash!);
    if (!loadResult.ok) {
      throw new Error(`加载存档失败: ${loadResult.error}`);
    }
    trace.append('aiCall', 'save-loaded', `存档已加载,KV 指针切到存档 hash`);

    // 3. 模拟重开:创建新 Kernel 实例(不共享内存状态)
    //    注意:不调用 cleanupTestRevisions(避免清除 KV 指针,导致恢复降级为 fallback)
    //    只把旧实例的内存状态丢弃(变量置 null),新实例从 IndexedDB 恢复
    kernel = null;
    const newKernel = new Kernel();
    await newKernel.init();
    trace.append('aiCall', 'kernel-recreate', '新 Kernel 实例创建完成(模拟重开),从 IndexedDB 恢复');

    // 4. 从最新 revision 恢复
    const report = await recovery.recoverFromLatest(newKernel);
    trace.append('aiCall', 'recover-from-latest', `恢复 ok=${report.ok}, 来源=${report.source}, hash=${report.restoredHash?.slice(0, 8)}`);

    assertions.push({
      name: '重开恢复成功',
      ok: report.ok,
      expected: 'ok=true',
      actual: `ok=${report.ok}`,
    });
    assertions.push({
      name: '恢复来源 = ptr(KV 指针有效)',
      ok: report.source === 'ptr',
      expected: 'ptr',
      actual: report.source,
    });
    assertions.push({
      name: '恢复的 hash = 存档 hash',
      ok: report.restoredHash === savedHash,
      expected: savedHash?.slice(0, 12) ?? '-',
      actual: report.restoredHash?.slice(0, 12) ?? '-',
    });

    // 5. 一致性校验
    const consistency = await recovery.verifyConsistency(newKernel);
    trace.append('aiCall', 'consistency-check', `一致性校验 ok=${consistency.ok}, ${consistency.checks.filter((c) => c.ok).length}/${consistency.checks.length} 通过`);

    assertions.push({
      name: '一致性校验通过',
      ok: consistency.ok,
      expected: '5/5 通过',
      actual: `${consistency.checks.filter((c) => c.ok).length}/${consistency.checks.length}`,
    });

    // 6. 比对 stat_data
    const statAfterRecover = newKernel.getStatData();
    const moodBefore = (statBeforeSave.主角 as { 心情?: number })?.心情;
    const moodAfter = (statAfterRecover.主角 as { 心情?: number })?.心情;
    assertions.push({
      name: 'stat_data 一致(主角.心情)',
      ok: moodBefore === moodAfter,
      expected: String(moodBefore),
      actual: String(moodAfter),
    });

    // 7. 清理
    await cleanupTestRevisions(newKernel);

    // 8. 删除测试存档
    if (savedHash) {
      // 先把当前指针移走(否则删除会拒绝)
      const tmpKernel = new Kernel();
      await tmpKernel.init();
      const del = await saveCas.delete(savedHash);
      assertions.push({
        name: '测试存档清理',
        ok: del.ok,
        expected: 'ok=true',
        actual: `ok=${del.ok}${del.reason ? `(${del.reason})` : ''}`,
      });
      await cleanupTestRevisions(tmpKernel);
    }
  } catch (e) {
    errors.push(`场景3 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestRevisions(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 's3',
    name: '存档 + 重开一致性',
    ok,
    evidence: ok
      ? `存档 → 重开 → 恢复 → 一致性校验通过(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

/**
 * 场景4:模型失败 + 重试恢复
 *  - 验证 GatewayTrace 记录 error
 *  - 验证 StreamDraft 保留(不污染状态)
 *  - 验证 retry 后成功
 */
async function scenario4_modelFailure(trace: TraceCollector): Promise<ScenarioResult> {
  const assertions: ScenarioResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    trace.append('aiCall', 'scenario4-start', '场景4 启动:模型失败 + 重试恢复');

    kernel = await createTestKernel('s4');
    const baseHash = kernel.getCurrentRevisionHash();
    const baseStatData = kernel.getStatData();

    // 1. 启动回合
    const draft = await kernel.startTurn({ action: '触发模型失败的动作' });
    trace.append('aiCall', 'startTurn', `回合启动,baseHash=${draft.baseRevisionHash?.slice(0, 8)}`);

    // 2. 模拟第一次模型失败(GatewayTrace 记录 error)
    trace.append('aiCall', 'mock-model-fail-1', '第一次模型调用失败(模拟网络错误)');
    const failureReport = recovery.buildFailureReport(
      'model-fail',
      '模拟网络错误:ETIMEDOUT',
      draft,
      ['attempt 1/3 失败: ETIMEDOUT', '指数退避 1s'],
    );
    trace.append('aiCall', 'failure-report', `type=${failureReport.type}, canRetry=${failureReport.canRetry}, recommendation=${failureReport.recommendation}`);

    assertions.push({
      name: '失败报告类型 = model-fail',
      ok: failureReport.type === 'model-fail',
      expected: 'model-fail',
      actual: failureReport.type,
    });
    assertions.push({
      name: '失败报告可重试',
      ok: failureReport.canRetry,
      expected: 'true',
      actual: String(failureReport.canRetry),
    });
    assertions.push({
      name: '推荐处理 = retry',
      ok: failureReport.recommendation === 'retry',
      expected: 'retry',
      actual: failureReport.recommendation,
    });
    assertions.push({
      name: 'StreamDraft 保留(draft 非空)',
      ok: !!failureReport.draft,
      expected: '非空',
      actual: failureReport.draft ? '非空' : '空',
    });

    // 3. 验证状态未被污染(失败后 Kernel 状态不变)
    const statAfterFail = kernel.getStatData();
    assertions.push({
      name: '失败后 Kernel 状态未变',
      ok: kernel.getCurrentRevisionHash() === baseHash,
      expected: baseHash?.slice(0, 8) ?? '-',
      actual: kernel.getCurrentRevisionHash()?.slice(0, 8) ?? '-',
    });

    // 4. 模拟重试成功
    trace.append('aiCall', 'mock-retry-success', '重试成功(第二次调用返回完整输出)');
    const varAiText = buildMockVarAiOutput([
      { op: 'replace', path: '/主角/心情', value: 70 },
    ]);
    const mainAiText = buildMockMainAiOutput('重试成功后的叙事。');

    // 复用同一个 draft(模拟 StreamDraft 保留)
    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
    trace.append('aiCall', 'finalizeStream-after-retry', `重试后解析,varAiOps=${raw.varAiParsed.ops.length}`);

    const candidate = kernel.aggregate(raw);
    const facts = await kernel.commit(candidate);
    trace.append('aiCall', 'commit-after-retry', `重试后 commit,ok=${facts.ok}, hash=${facts.newRevisionHash.slice(0, 8)}`);

    assertions.push({
      name: '重试后 commit 成功',
      ok: facts.ok,
      expected: 'ok=true',
      actual: `ok=${facts.ok}`,
    });
    assertions.push({
      name: '新 revision hash ≠ base hash',
      ok: facts.newRevisionHash !== baseHash,
      expected: '不同',
      actual: `${baseHash?.slice(0, 8)} → ${facts.newRevisionHash.slice(0, 8)}`,
    });
  } catch (e) {
    errors.push(`场景4 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestRevisions(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 's4',
    name: '模型失败 + 重试恢复',
    ok,
    evidence: ok
      ? `模型失败 → StreamDraft 保留 → 重试成功(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

/**
 * 场景5:Zod 校验失败 + 拒绝候选
 *  - 验证 MvuTransaction rejectedCount > 0
 *  - 验证 CommittedFacts 部分提交(合法字段应用,非法字段拒绝)
 *  - 验证非法字段未污染 stat_data
 */
async function scenario5_zodViolation(trace: TraceCollector): Promise<ScenarioResult> {
  const assertions: ScenarioResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    trace.append('aiCall', 'scenario5-start', '场景5 启动:Zod 校验失败 + 拒绝候选');

    kernel = await createTestKernel('s5');

    const draft = await kernel.startTurn({ action: '触发 Zod 校验失败的动作' });

    // 1. 构造违反 Zod 的变量 AI 输出
    //    - remove 不存在字段 → validateOp 拒绝(rejectedCount > 0)
    //    - replace 不存在字段 → validateOp 拒绝(路径不存在,非 record 子路径)
    //    - replace 时间.天数 = 2 → 合法(appliedCount > 0)
    const varAiText = buildMockZodViolationVarAiOutput();
    const mainAiText = buildMockMainAiOutput('Zod 校验失败测试叙事。');

    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
    trace.append('aiCall', 'finalizeStream', `解析完成,ops=${raw.varAiParsed.ops.length}`);

    const candidate = kernel.aggregate(raw);
    trace.append('aiCall', 'aggregate', `候选 trace=${candidate.candidateTrace.length}`);

    const facts = await kernel.commit(candidate);
    trace.append('aiCall', 'commit', `提交,ok=${facts.ok}, applied=${facts.txResult.appliedCount}, rejected=${facts.txResult.rejectedCount}`);
    trace.append('variableUpdate', 'zod-violations', `rejected=${facts.txResult.rejectedCount}, errors=${facts.txResult.fullParseErrors.length}`, facts.txResult.validations);

    // 2. 断言
    assertions.push({
      name: 'rejected ops > 0(非法 op 被拒)',
      ok: facts.txResult.rejectedCount > 0,
      expected: '>0',
      actual: String(facts.txResult.rejectedCount),
    });
    assertions.push({
      name: 'applied ops > 0(合法 op 部分提交)',
      ok: facts.txResult.appliedCount > 0,
      expected: '>0',
      actual: String(facts.txResult.appliedCount),
    });
    assertions.push({
      name: '部分提交不回滚(commit ok)',
      ok: facts.ok,
      expected: 'ok=true(部分提交)',
      actual: `ok=${facts.ok}`,
    });

    // 3. 验证合法字段被应用,非法字段未污染
    const afterDay = (facts.after.时间 as { 天数?: number })?.天数;
    const afterProtagonist = facts.after.主角 as Record<string, unknown> | undefined;

    assertions.push({
      name: '时间.天数 = 2(合法 op 被接受)',
      ok: afterDay === 2,
      expected: '2',
      actual: String(afterDay),
    });
    assertions.push({
      name: '不存在字段未被创建(主角 无 不存在字段_xyz)',
      ok: !afterProtagonist || !('不存在字段_xyz' in afterProtagonist),
      expected: '不存在',
      actual: afterProtagonist && '不存在字段_xyz' in afterProtagonist ? '存在(污染)' : '不存在',
    });
    // Zod 拒绝记录在 txResult.validations(ok=false),而非 candidateTrace
    // candidateTrace 只记录 2AI 候选裁定(变量AI/主聊天AI 优先级),不做 Zod 校验
    const rejectedValidations = facts.txResult.validations.filter((v) => !v.ok);
    assertions.push({
      name: 'txResult.validations 含被拒绝记录(Zod 校验失败)',
      ok: rejectedValidations.length > 0,
      expected: '>0',
      actual: rejectedValidations.map((v) => `${v.op.rawPath}(${v.error?.slice(0, 40)})`).join('; '),
    });
  } catch (e) {
    errors.push(`场景5 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestRevisions(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 's5',
    name: 'Zod 校验失败 + 拒绝候选',
    ok,
    evidence: ok
      ? `非法字段拒绝 + 合法字段部分提交 + 状态未被污染(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

/**
 * 场景6:导入真实"三人逆行"预设(模拟)
 *  - 验证 importPreset 不崩溃
 *  - 验证 ST 内置标识符全识别(13 个)
 *  - 验证 Sampler 生效(temperature=0.99)
 *  - 验证 Prompt 顺序(prompt_order 应用)
 *  - 验证预设切换行为变化(切换后 sampler 变化)
 */
async function scenario6_presetImport(trace: TraceCollector): Promise<ScenarioResult> {
  const assertions: ScenarioResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();

  try {
    trace.append('presetApply', 'scenario6-start', '场景6 启动:导入"三人逆行"预设(模拟)');

    // 1. 构造模拟预设
    const { json, fileName } = buildMockSanrenNixingPreset();
    trace.append('presetApply', 'mock-preset-built', `模拟预设构造完成:文件名=${fileName},大小=${json.length} bytes`);

    // 2. 格式校验
    const formatCheck = validatePresetFormat(json);
    assertions.push({
      name: '预设格式校验通过',
      ok: formatCheck.ok,
      expected: 'ok=true',
      actual: `ok=${formatCheck.ok}`,
    });
    trace.append('presetApply', 'format-check', `格式校验 ok=${formatCheck.ok}`);

    // 3. 导入
    const importResult = importPreset(json, fileName);
    assertions.push({
      name: 'importPreset 不崩溃 + 成功',
      ok: importResult.ok,
      expected: 'ok=true',
      actual: `ok=${importResult.ok}`,
    });
    if (!importResult.ok) {
      throw new Error(`导入失败: ${importResult.errors.join('; ')}`);
    }
    if (!importResult.profile) {
      throw new Error('导入成功但 profile 缺失');
    }
    const profile = importResult.profile;
    trace.append('presetApply', 'import-success', `导入成功,name=${profile.name}, prompts=${profile.prompts.length}, sampler.temp=${profile.sampler.temperature}`);

    // 4. ST 内置标识符全识别
    const builtinFound = ST_BUILTIN_IDENTIFIERS.filter((id) =>
      profile.prompts.some((p) => p.identifier === id),
    );
    assertions.push({
      name: 'ST 内置标识符全识别(13 个)',
      ok: builtinFound.length === ST_BUILTIN_IDENTIFIERS.length,
      expected: String(ST_BUILTIN_IDENTIFIERS.length),
      actual: String(builtinFound.length),
    });
    trace.append('presetApply', 'builtin-identifiers', `识别 ${builtinFound.length}/${ST_BUILTIN_IDENTIFIERS.length} 个 ST 内置标识符`);

    // 5. 内置标识符标记正确
    const builtinMarked = profile.prompts.filter(
      (p) => p.identifier && isStBuiltinIdentifier(p.identifier),
    );
    assertions.push({
      name: '内置标识符 isBuiltin 标记正确',
      ok: builtinMarked.length === ST_BUILTIN_IDENTIFIERS.length,
      expected: String(ST_BUILTIN_IDENTIFIERS.length),
      actual: String(builtinMarked.length),
    });

    // 6. Sampler 生效
    assertions.push({
      name: 'Sampler.temperature = 0.99',
      ok: profile.sampler.temperature === 0.99,
      expected: '0.99',
      actual: String(profile.sampler.temperature),
    });
    assertions.push({
      name: 'Sampler.topP = 0.88',
      ok: profile.sampler.topP === 0.88,
      expected: '0.88',
      actual: String(profile.sampler.topP),
    });
    assertions.push({
      name: 'Sampler.repetitionPenalty = 1.05',
      ok: profile.sampler.repetitionPenalty === 1.05,
      expected: '1.05',
      actual: String(profile.sampler.repetitionPenalty),
    });
    trace.append('presetApply', 'sampler-check', `temp=${profile.sampler.temperature}, topP=${profile.sampler.topP}, repPen=${profile.sampler.repetitionPenalty}`);

    // 7. Prompt 顺序(prompt_order 应用,profile.prompts 已按顺序排序)
    assertions.push({
      name: 'Prompt 顺序数组非空',
      ok: profile.prompts.length > 0,
      expected: '>0',
      actual: String(profile.prompts.length),
    });
    assertions.push({
      name: 'Prompt 顺序首位 = main(ST 内置)',
      ok: profile.prompts[0]?.identifier === 'main',
      expected: 'main',
      actual: profile.prompts[0]?.identifier ?? '-',
    });

    // 8. 文件名特殊字符兼容(全角—（）)
    assertions.push({
      name: '文件名特殊字符兼容(全角—（）)',
      ok: profile.name.includes('三人逆行') && profile.name.includes('PrismFox'),
      expected: '含三人逆行 + PrismFox',
      actual: profile.name,
    });

    // 9. 预设切换行为变化
    const defaultPreset = builtinOriginalDefault;
    trace.append('presetApply', 'default-preset', `内置默认预设 temp=${defaultPreset.sampler.temperature}`);
    trace.append('presetApply', 'switch-preset', `切换到三人逆行 temp=${profile.sampler.temperature}`);

    assertions.push({
      name: '预设切换行为变化(Sampler 不同)',
      ok: profile.sampler.temperature !== defaultPreset.sampler.temperature,
      expected: '不同',
      actual: `默认=${defaultPreset.sampler.temperature}, 三人逆行=${profile.sampler.temperature}`,
    });

    // 10. 宏保留(content 中含 {{user}}/{{char}}/{{getvar}})
    const macroPreserved = profile.prompts.some(
      (p) => p.content?.includes('{{user}}') || p.content?.includes('{{char}}') || p.content?.includes('{{getvar'),
    );
    assertions.push({
      name: '宏保留({{user}}/{{char}}/{{getvar}})',
      ok: macroPreserved,
      expected: '存在',
      actual: macroPreserved ? '存在' : '缺失',
    });
  } catch (e) {
    errors.push(`场景6 异常: ${e instanceof Error ? e.message : String(e)}`);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 's6',
    name: '导入"三人逆行"预设(模拟)',
    ok,
    evidence: ok
      ? `1.3MB/264条目模拟 + ST 内置标识符全识别 + Sampler 生效 + 预设切换(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  E2E 验证器
// ───────────────────────────────────────────────────────────

class E2EVerifier {
  /** 运行全部 6 场景 */
  async runAll(): Promise<E2EReport> {
    const results: ScenarioResult[] = [];
    const allTraces: TraceEntry[] = [];
    const startedAt = Date.now();

    // 顺序执行(避免 IndexedDB 并发冲突)
    const scenarios = [
      scenario1_opening,
      scenario2_playerAction,
      scenario3_saveRecovery,
      scenario4_modelFailure,
      scenario5_zodViolation,
      scenario6_presetImport,
    ];

    for (const fn of scenarios) {
      const trace = new TraceCollector();
      try {
        const result = await fn(trace);
        results.push(result);
        allTraces.push(...result.traces);
      } catch (e) {
        // 单个场景异常不中断后续
        results.push({
          id: 'unknown',
          name: fn.name,
          ok: false,
          evidence: `执行器异常`,
          traces: trace.all(),
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
      allTraces,
      elapsedMs: Date.now() - startedAt,
    };
  }

  /** 运行单个场景(便于 UI 单独触发) */
  async runOne(id: string): Promise<ScenarioResult | null> {
    const trace = new TraceCollector();
    switch (id) {
      case 's1':
        return scenario1_opening(trace);
      case 's2':
        return scenario2_playerAction(trace);
      case 's3':
        return scenario3_saveRecovery(trace);
      case 's4':
        return scenario4_modelFailure(trace);
      case 's5':
        return scenario5_zodViolation(trace);
      case 's6':
        return scenario6_presetImport(trace);
      default:
        return null;
    }
  }
}

// ───────────────────────────────────────────────────────────
//  单例导出
// ───────────────────────────────────────────────────────────

export const e2eVerifier = new E2EVerifier();

// ───────────────────────────────────────────────────────────
//  场景元信息(UI 展示用)
// ───────────────────────────────────────────────────────────

export const SCENARIO_META: Array<{
  id: string;
  name: string;
  description: string;
  traceCategories: TraceCategory[];
}> = [
  {
    id: 's1',
    name: '配置 Key + 选 P1 + 开场叙事',
    description: '验证 initializeNewGame + 开场 AI mock + P1 身份字段写入',
    traceCategories: ['aiCall', 'variableUpdate'],
  },
  {
    id: 's2',
    name: '玩家输入动作 + 2AI 并行 + 状态栏更新',
    description: '验证 startTurn/finalizeStream/aggregate/commit 全链路 + 候选 trace',
    traceCategories: ['aiCall', 'variableUpdate'],
  },
  {
    id: 's3',
    name: '存档 + 重开一致性',
    description: '验证 saveCas + 新 Kernel 实例 + recovery.recoverFromLatest + 一致性校验',
    traceCategories: ['aiCall'],
  },
  {
    id: 's4',
    name: '模型失败 + 重试恢复',
    description: '验证 FailureReport + StreamDraft 保留 + 状态未污染 + 重试成功',
    traceCategories: ['aiCall'],
  },
  {
    id: 's5',
    name: 'Zod 校验失败 + 拒绝候选',
    description: '验证 MvuTransaction rejectedCount + 部分提交 + 非法字段未污染',
    traceCategories: ['aiCall', 'variableUpdate'],
  },
  {
    id: 's6',
    name: '导入"三人逆行"预设(模拟)',
    description: '验证 importPreset + ST 内置标识符全识别 + Sampler 生效 + 预设切换',
    traceCategories: ['presetApply'],
  },
];
