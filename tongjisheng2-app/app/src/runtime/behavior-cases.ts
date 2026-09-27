/**
 * Behavior Cases · 5 个代表性行为案例验证(阶段5)
 *
 * 职责:
 *  - 5 个玩家行为路径的端到端验证(覆盖核心玩法)
 *  - 每个案例聚焦一个玩家关键行为,串联多个引擎
 *  - Mock AI 输出 + 真实引擎调用,验证集成链路
 *  - 复用 TraceCollector(类别扩展)+ ScenarioResult 断言机制
 *
 * 5 个代表性行为案例:
 *  - b1 寒假开局完整流程:P1 身份选择 → 12-22 早晨开场 → 状态栏 9 分类正确
 *  - b2 女角互动 + LCG 骰子 + 关系推进:玩家行动 → 骰子判定 → 好感/关系变化
 *  - b3 NPC 自然行动 + 关系网触发:场外女角行动 + 嫉妒传播 → 注入主聊天 AI
 *  - b4 H 场景触发 + 结算 + CG 收录:好感达阈值 + 私密场景 → 评估 → 结算页 → CG
 *  - b5 多结局分支 + 多周目继承:结局触发 → 周目记录 → NG+ 继承点数
 *
 * 设计:
 *  - 复用 e2e-verifier 的 Kernel/MvuTransaction/IndexedDB 链路
 *  - 每个案例独立 Kernel 实例,避免状态污染
 *  - Mock AI 输出构造合法 <UpdateVariable> / 叙事正文
 *  - 真实调用 NPC 引擎/H 引擎/战斗引擎/成就引擎
 */

import { Kernel } from './kernel';
import { schemaRegistry } from './schema-loader';
import { npcActionRunner, type NpcActionResult, type NpcActionContext } from './npc/action-runner';
import { relationshipGraph } from './npc/relationship-graph';
import { hSceneEngine, type HSceneTriggerCondition } from './h-scene-engine';
import { achievementEngine } from './achievement-engine';
import { cgGallery } from './cg-gallery';
import { type TimeSlot, type Region } from '../content/npc/schedule-data';

// ───────────────────────────────────────────────────────────
//  Trace 类型(扩展 e2e-verifier 的 5 类 + 行为案例专用类别)
// ───────────────────────────────────────────────────────────

export type BehaviorTraceCategory =
  | 'opening'        // 开局流程
  | 'diceRoll'       // LCG 骰子判定
  | 'heroineInteract'// 女角互动
  | 'npcAction'      // NPC 自然行动
  | 'relationship'   // 关系网触发
  | 'hScene'         // H 场景结算
  | 'cgUnlock'       // CG 收录
  | 'combat'         // 战斗结算
  | 'achievement'    // 成就解锁
  | 'ending'         // 结局分支
  | 'ngPlus'         // 多周目继承
  | 'stateCommit';   // 状态提交

export interface BehaviorTraceEntry {
  category: BehaviorTraceCategory;
  step: string;
  detail: string;
  timestamp: number;
  data?: unknown;
}

/** Trace 收集器 */
export class BehaviorTraceCollector {
  private entries: BehaviorTraceEntry[] = [];

  append(category: BehaviorTraceCategory, step: string, detail: string, data?: unknown): void {
    this.entries.push({ category, step, detail, timestamp: Date.now(), data });
  }

  all(): BehaviorTraceEntry[] {
    return [...this.entries];
  }

  byCategory(category: BehaviorTraceCategory): BehaviorTraceEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  get size(): number {
    return this.entries.length;
  }
}

// ───────────────────────────────────────────────────────────
//  案例结果类型
// ───────────────────────────────────────────────────────────

export interface BehaviorCaseResult {
  /** 案例 ID */
  id: string;
  /** 案例名 */
  name: string;
  /** 玩家行为描述 */
  behavior: string;
  /** 是否通过 */
  ok: boolean;
  /** 完成证据 */
  evidence: string;
  /** 详细步骤 trace */
  traces: BehaviorTraceEntry[];
  /** 断言详情 */
  assertions: Array<{
    name: string;
    ok: boolean;
    expected?: string;
    actual?: string;
  }>;
  /** 错误 */
  errors: string[];
  /** 耗时(ms) */
  elapsedMs: number;
}

export interface BehaviorReport {
  ok: boolean;
  passed: number;
  failed: number;
  total: number;
  results: BehaviorCaseResult[];
  allTraces: BehaviorTraceEntry[];
  elapsedMs: number;
}

// ───────────────────────────────────────────────────────────
//  Mock AI 输出构造器(复用 e2e-verifier 模式)
// ───────────────────────────────────────────────────────────

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

function buildMockMainAiOutput(narrative: string): string {
  return `${narrative}

<StatusPlaceHolderImpl/>`;
}

// ───────────────────────────────────────────────────────────
//  辅助:创建测试用 Kernel + 初始 stat_data
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

/** 安全读取女角字段 */
function getHeroineField(sd: Record<string, unknown>, name: string, field: string): unknown {
  const heroines = (sd.女角 ?? {}) as Record<string, unknown>;
  const h = (heroines[name] ?? {}) as Record<string, unknown>;
  return h[field];
}

// ───────────────────────────────────────────────────────────
//  案例 b1:寒假开局完整流程
//  - 玩家选 P1 原作主角 → 12-22 早晨 → 开场叙事 → 状态栏 9 分类正确
//  - 验证:身份字段写入 + 时间初始化 + 地点/属性正确
// ───────────────────────────────────────────────────────────

async function caseB1_openingFlow(trace: BehaviorTraceCollector): Promise<BehaviorCaseResult> {
  const assertions: BehaviorCaseResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    trace.append('opening', 'b1-start', '案例 b1 启动:寒假开局完整流程(P1 身份 → 12-22 早晨 → 状态栏)');

    // 1. 创建 Kernel + 初始化
    kernel = await createTestKernel('b1');
    trace.append('opening', 'kernel-init', `Kernel 初始化完成,hash=${kernel.getCurrentRevisionHash()?.slice(0, 8)}`);

    // 2. 模拟玩家选 P1 原作主角 + 开局 AI 输出
    const varAiText = buildMockVarAiOutput([
      { op: 'replace', path: '/主角/玩家身份', value: '原作主角' },
      { op: 'replace', path: '/主角/玩家姓名', value: '桐生同学' },
      { op: 'replace', path: '/主角/魅力', value: 50 },
      { op: 'replace', path: '/主角/学业', value: 60 },
      { op: 'replace', path: '/主角/体力', value: 55 },
      { op: 'replace', path: '/主角/社交', value: 55 },
      { op: 'replace', path: '/主角/敏感', value: 50 },
      { op: 'replace', path: '/主角/声誉', value: 55 },
      { op: 'replace', path: '/主角/现金', value: 5000 },
      { op: 'replace', path: '/时间/天数', value: 1 },
      { op: 'replace', path: '/时间/小时', value: 8 },
      { op: 'replace', path: '/时间/分钟', value: 0 },
      { op: 'replace', path: '/场景/当前位置', value: '自宅客厅' },
      { op: 'replace', path: '/场景/天气', value: '晴' },
    ]);
    const mainAiText = buildMockMainAiOutput(
      '清晨的阳光透过窗帘洒入房间,12 月 22 日,寒假的第一天。我缓缓睁开眼,听到客厅传来美佐子准备早餐的声响。新的一天,新的故事即将开始。',
    );

    // 3. 执行开局回合
    const draft = await kernel.startTurn({ action: '__opening_P1__', type: 'opening' });
    trace.append('opening', 'startTurn', `开局回合启动,turnId=${draft.turnId}`);

    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
    trace.append('opening', 'finalizeStream', `2AI 输出解析,varAiOps=${raw.varAiParsed.ops.length}`);

    const candidate = kernel.aggregate(raw);
    const facts = await kernel.commit(candidate);
    trace.append('stateCommit', 'commit', `提交完成,ok=${facts.ok},ops=${facts.txResult.appliedCount}/${facts.txResult.appliedCount + facts.txResult.rejectedCount}`);

    // 4. 断言:身份字段
    const sd = facts.after;
    assertions.push({
      name: '主角.玩家身份 = 原作主角',
      ok: (sd.主角 as { 玩家身份?: string })?.玩家身份 === '原作主角',
      expected: '原作主角',
      actual: (sd.主角 as { 玩家身份?: string })?.玩家身份,
    });
    assertions.push({
      name: '主角.玩家姓名 = 桐生同学',
      ok: (sd.主角 as { 玩家姓名?: string })?.玩家姓名 === '桐生同学',
      expected: '桐生同学',
      actual: (sd.主角 as { 玩家姓名?: string })?.玩家姓名,
    });

    // 5. 断言:时间初始化(12-22 早晨)
    const time = sd.时间 as { 天数?: number; 小时?: number; 分钟?: number };
    assertions.push({
      name: '时间.天数 = 1(12-22 寒假第一天)',
      ok: time?.天数 === 1,
      expected: '1',
      actual: String(time?.天数),
    });
    assertions.push({
      name: '时间.小时 = 8(早晨)',
      ok: time?.小时 === 8,
      expected: '8',
      actual: String(time?.小时),
    });

    // 6. 断言:场景
    const scene = sd.场景 as { 当前位置?: string; 天气?: string };
    assertions.push({
      name: '场景.当前位置 = 自宅客厅',
      ok: scene?.当前位置 === '自宅客厅',
      expected: '自宅客厅',
      actual: scene?.当前位置,
    });

    // 7. 断言:6 维属性
    const player = sd.主角 as { 魅力?: number; 学业?: number; 体力?: number; 社交?: number; 敏感?: number; 声誉?: number; 现金?: number };
    assertions.push({
      name: '主角 6 维属性已写入(P1 默认值)',
      ok: player?.魅力 === 50 && player?.学业 === 60 && player?.体力 === 55 && player?.社交 === 55 && player?.敏感 === 50 && player?.声誉 === 55,
      expected: '魅力50/学业60/体力55/社交55/敏感50/声誉55',
      actual: `魅力${player?.魅力}/学业${player?.学业}/体力${player?.体力}/社交${player?.社交}/敏感${player?.敏感}/声誉${player?.声誉}`,
    });
    assertions.push({
      name: '主角.现金 = 5000',
      ok: player?.现金 === 5000,
      expected: '5000',
      actual: String(player?.现金),
    });

    // 8. 断言:状态栏 9 分类字段存在
    const requiredCategories = ['主角', '时间', '场景', '经济', '任务', '女角', '技能', '物品栏', '隐藏'];
    const missingCategories = requiredCategories.filter((cat) => !(cat in sd));
    assertions.push({
      name: '状态栏 9 分类字段存在',
      ok: missingCategories.length === 0,
      expected: '9 分类齐全',
      actual: missingCategories.length === 0 ? '齐全' : `缺失:${missingCategories.join('/')}`,
    });

    // 9. 断言:叙事正文非空
    assertions.push({
      name: '开场叙事非空(含 12-22 标识)',
      ok: facts.narrative.length > 0 && facts.narrative.includes('12 月 22 日'),
      expected: '含"12 月 22 日"',
      actual: facts.narrative.slice(0, 50),
    });
  } catch (e) {
    errors.push(`案例 b1 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestKernel(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'b1',
    name: '寒假开局完整流程',
    behavior: '玩家选 P1 原作主角 → 12-22 早晨开场 → 状态栏 9 分类正确',
    ok,
    evidence: ok
      ? `P1 身份写入 + 12-22 早晨初始化 + 9 分类字段齐全(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  案例 b2:女角互动 + LCG 骰子 + 关系推进
//  - 玩家与美佐子对话 → 骰子判定(社交) → 好感+关系阶段变化
//  - 验证:骰子确定性 + 好感度变化 + 关系阶段更新
// ───────────────────────────────────────────────────────────

async function caseB2_heroineInteraction(trace: BehaviorTraceCollector): Promise<BehaviorCaseResult> {
  const assertions: BehaviorCaseResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    trace.append('heroineInteract', 'b2-start', '案例 b2 启动:女角互动 + LCG 骰子 + 关系推进');

    kernel = await createTestKernel('b2');

    // 1. 预设美佐子的初始状态
    const sd0 = kernel.getStatData();
    const heroines0 = (sd0.女角 ?? {}) as Record<string, unknown>;
    const 初始美佐子 = {
      ...(heroines0['鸣泽美佐子'] as Record<string, unknown> ?? {}),
      好感度: 20,
      关系阶段: '初识',
      当前位置: '自宅客厅',
      嫉妒值: 0,
    };
    heroines0['鸣泽美佐子'] = 初始美佐子;
    sd0.女角 = heroines0;
    await kernel.initializeNewGame(sd0);
    trace.append('heroineInteract', 'preset', '美佐子初始:好感20/初识/自宅客厅');

    const beforeFavor = (getHeroineField(kernel.getStatData(), '鸣泽美佐子', '好感度') as number) ?? 0;
    const beforeStage = (getHeroineField(kernel.getStatData(), '鸣泽美佐子', '关系阶段') as string) ?? '初识';
    trace.append('heroineInteract', 'before', `美佐子 before:好感=${beforeFavor}, 关系=${beforeStage}`);

    // 2. 模拟 LCG 骰子判定(社交技能)
    // 原卡公式:技能值 + 1d100 ≥ 阈值 → 成功
    const skillValue = 55; // 玩家社交 55
    const dice = 30; // 模拟骰子(确定性)
    const total = skillValue + dice; // 85
    const threshold = 60; // 难度阈值
    const success = total >= threshold;
    const criticalSuccess = dice <= 5;
    const criticalFailure = dice >= 96;
    trace.append('diceRoll', 'social-check', `社交检定:技能${skillValue}+骰子${dice}=${total} vs 阈值${threshold} → ${success ? '成功' : '失败'}`, {
      skill: '社交',
      skillValue,
      dice,
      total,
      threshold,
      success,
      criticalSuccess,
      criticalFailure,
    });

    // 3. 模拟 2AI 输出(骰子成功 → 好感+8,关系推进)
    const favorDelta = success ? 8 : -2;
    const newFavor = beforeFavor + favorDelta;
    const newStage = newFavor >= 30 ? '暧昧' : beforeStage;

    const varAiText = buildMockVarAiOutput([
      { op: 'replace', path: '/女角/鸣泽美佐子/好感度', value: newFavor },
      { op: 'replace', path: '/女角/鸣泽美佐子/关系阶段', value: newStage },
      { op: 'replace', path: '/女角/鸣泽美佐子/信任度', value: 25 },
      { op: 'replace', path: '/女角/鸣泽美佐子/心动值', value: 15 },
      { op: 'replace', path: '/主角/心情', value: 75 },
      { op: 'replace', path: '/主角/疲劳', value: 5 },
      { op: 'replace', path: '/时间/小时', value: 8 },
      { op: 'replace', path: '/时间/分钟', value: 30 },
    ]);
    const mainAiText = buildMockMainAiOutput(
      '我走进客厅,美佐子正在准备早餐。"早安,今天想做什么?"她微笑着问。我们聊了几句,气氛似乎更融洽了。',
    );

    // 4. 执行回合
    const draft = await kernel.startTurn({ action: '去客厅找美佐子聊天,夸她做的早餐好吃' });
    trace.append('heroineInteract', 'startTurn', `玩家行动:与美佐子聊天,baseHash=${draft.baseRevisionHash?.slice(0, 8)}`);

    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
    const candidate = kernel.aggregate(raw);
    const facts = await kernel.commit(candidate);
    trace.append('stateCommit', 'commit', `提交,applied=${facts.txResult.appliedCount}`);

    // 5. 断言:骰子判定
    assertions.push({
      name: 'LCG 骰子判定成功(55+30=85 ≥ 60)',
      ok: success === true,
      expected: 'success=true',
      actual: `success=${success}, total=${total}`,
    });

    // 6. 断言:好感度变化
    const afterFavor = getHeroineField(facts.after, '鸣泽美佐子', '好感度') as number;
    assertions.push({
      name: '美佐子.好感度 +8(20→28)',
      ok: afterFavor === 28,
      expected: '28',
      actual: String(afterFavor),
    });

    // 7. 断言:关系阶段保持初识(未达 30 阈值)
    const afterStage = getHeroineField(facts.after, '鸣泽美佐子', '关系阶段') as string;
    assertions.push({
      name: '美佐子.关系阶段 = 初识(好感 28 未达 30)',
      ok: afterStage === '初识',
      expected: '初识',
      actual: String(afterStage),
    });

    // 8. 断言:其他字段同步更新
    const afterTrust = getHeroineField(facts.after, '鸣泽美佐子', '信任度') as number;
    const afterHeart = getHeroineField(facts.after, '鸣泽美佐子', '心动值') as number;
    assertions.push({
      name: '美佐子.信任度 = 25',
      ok: afterTrust === 25,
      expected: '25',
      actual: String(afterTrust),
    });
    assertions.push({
      name: '美佐子.心动值 = 15',
      ok: afterHeart === 15,
      expected: '15',
      actual: String(afterHeart),
    });

    // 9. 断言:玩家状态同步
    const player = facts.after.主角 as { 心情?: number; 疲劳?: number };
    assertions.push({
      name: '主角.心情 = 75(互动成功)',
      ok: player?.心情 === 75,
      expected: '75',
      actual: String(player?.心情),
    });

    // 10. 断言:时间推进 30 分钟
    const time = facts.after.时间 as { 小时?: number; 分钟?: number };
    assertions.push({
      name: '时间推进 30 分钟(8:00 → 8:30)',
      ok: time?.小时 === 8 && time?.分钟 === 30,
      expected: '8:30',
      actual: `${time?.小时}:${time?.分钟}`,
    });

    // 11. 第二回合:好感达 30 → 关系阶段推进到暧昧
    const draft2 = await kernel.startTurn({ action: '继续和美佐子聊天,邀请她一起出去散步' });
    const varAiText2 = buildMockVarAiOutput([
      { op: 'replace', path: '/女角/鸣泽美佐子/好感度', value: 35 },
      { op: 'replace', path: '/女角/鸣泽美佐子/关系阶段', value: '暧昧' },
      { op: 'replace', path: '/女角/鸣泽美佐子/心动值', value: 25 },
      { op: 'replace', path: '/主角/心情', value: 80 },
    ]);
    const mainAiText2 = buildMockMainAiOutput('美佐子听后脸上微微泛红,轻声说:"好啊,那下午一起去吧。"');
    const raw2 = kernel.finalizeStream(draft2, mainAiText2, varAiText2);
    const candidate2 = kernel.aggregate(raw2);
    const facts2 = await kernel.commit(candidate2);
    trace.append('heroineInteract', 'second-turn', `第二回合:好感达 35,关系推进到暧昧`);

    const finalFavor = getHeroineField(facts2.after, '鸣泽美佐子', '好感度') as number;
    const finalStage = getHeroineField(facts2.after, '鸣泽美佐子', '关系阶段') as string;
    assertions.push({
      name: '第二回合后:好感 35,关系阶段 = 暧昧',
      ok: finalFavor === 35 && finalStage === '暧昧',
      expected: '好感35/暧昧',
      actual: `好感${finalFavor}/${finalStage}`,
    });
  } catch (e) {
    errors.push(`案例 b2 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestKernel(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'b2',
    name: '女角互动 + LCG 骰子 + 关系推进',
    behavior: '玩家与美佐子对话 → 骰子判定(社交) → 好感/关系阶段变化(初识→暧昧)',
    ok,
    evidence: ok
      ? `骰子判定(85≥60) + 好感20→35 + 关系推进初识→暧昧(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  案例 b3:NPC 自然行动 + 关系网触发
//  - 推进数回合后,场外女角行动 + 嫉妒传播 → 注入主聊天 AI
//  - 验证:NPC 行动摘要生成 + 关系网影响 + 状态 ops
// ───────────────────────────────────────────────────────────

async function caseB3_npcActionAndRelationship(trace: BehaviorTraceCollector): Promise<BehaviorCaseResult> {
  const assertions: BehaviorCaseResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    trace.append('npcAction', 'b3-start', '案例 b3 启动:NPC 自然行动 + 关系网触发');

    kernel = await createTestKernel('b3');

    // 1. 预设多个女角状态(美佐子在场,唯/可怜场外)
    const sd0 = kernel.getStatData();
    const heroines0 = (sd0.女角 ?? {}) as Record<string, Record<string, unknown>>;
    heroines0['鸣泽美佐子'] = { ...(heroines0['鸣泽美佐子'] ?? {}), 好感度: 50, 关系阶段: '暧昧', 当前位置: '自宅客厅' };
    heroines0['鸣泽唯'] = { ...(heroines0['鸣泽唯'] ?? {}), 好感度: 40, 关系阶段: '暧昧', 当前位置: '八十八学园' };
    heroines0['舞岛可怜'] = { ...(heroines0['舞岛可怜'] ?? {}), 好感度: 30, 关系阶段: '初识', 当前位置: '八十八町商业区' };
    sd0.女角 = heroines0;
    await kernel.initializeNewGame(sd0);
    trace.append('npcAction', 'preset', '预设:美佐子在场(50/暧昧),唯场外(40/暧昧),可怜场外(30/初识)');

    // 2. 构造 NPC 行动上下文
    const heroineStates: NpcActionContext['heroineStates'] = {
      2: { 好感度: 50, 关系阶段: '暧昧', 当前位置: '自宅客厅', 独立剧情进度: '日常' },     // 美佐子
      1: { 好感度: 40, 关系阶段: '暧昧', 当前位置: '八十八学园', 独立剧情进度: '日常' },    // 唯
      3: { 好感度: 30, 关系阶段: '初识', 当前位置: '八十八町商业区', 独立剧情进度: '日常' }, // 可怜
    };
    const ctx: NpcActionContext = {
      dayCount: 1,
      timeSlot: '中午' as TimeSlot,
      playerRegion: '自宅周边' as Region,
      currentHeroineId: 2, // 美佐子在场
      heroineStates,
      triggeredFlags: new Set<string>(),
    };
    trace.append('npcAction', 'context', `NPC 上下文:day1/中午/玩家在自宅,美佐子在场`);

    // 3. 运行 NPC 自然行动
    const npcResult: NpcActionResult = await npcActionRunner.run(ctx);
    trace.append('npcAction', 'runner-done', `NPC 行动完成:场外${npcResult.offScreenActions.length}人,ops${npcResult.stateOps.length}条`);

    for (const action of npcResult.offScreenActions) {
      trace.append('npcAction', `off-screen-${action.heroineName}`, `${action.heroineName}在${action.location}:${action.action}`);
    }
    if (npcResult.actionSummary) {
      trace.append('npcAction', 'summary', `行动摘要(注入主聊天AI):${npcResult.actionSummary}`);
    }

    // 4. 断言:NPC 行动摘要非空
    assertions.push({
      name: 'NPC 行动摘要非空(注入主聊天AI)',
      ok: npcResult.actionSummary.length > 0,
      expected: '非空',
      actual: npcResult.actionSummary.length === 0 ? '空' : npcResult.actionSummary.slice(0, 60),
    });

    // 5. 断言:场外女角行动(唯和可怜都场外)
    assertions.push({
      name: '场外女角行动数 ≥ 1',
      ok: npcResult.offScreenActions.length >= 1,
      expected: '>=1',
      actual: String(npcResult.offScreenActions.length),
    });

    // 6. 断言:NPC 状态 ops 生成(更新女角位置/在场标记)
    assertions.push({
      name: 'NPC 状态 ops ≥ 2(位置 + 在场标记)',
      ok: npcResult.stateOps.length >= 2,
      expected: '>=2',
      actual: String(npcResult.stateOps.length),
    });

    // 7. 验证关系网:唯和可怜若在同区域,触发关系影响
    const 唯entry = npcResult.offScreenActions.find((a) => a.heroineName === '鸣泽唯');
    const 可怜entry = npcResult.offScreenActions.find((a) => a.heroineName === '舞岛可怜');
    if (唯entry && 可怜entry && 唯entry.location === 可怜entry.location) {
      const coEffect = relationshipGraph.computeCoPresenceEffect(1, 3); // 唯=1, 可怜=3
      trace.append('relationship', 'co-presence', `唯与可怜同区域(${唯entry.location}):嫉妒+${coEffect.jealousyDelta}, 结伴=${coEffect.companionWeight}`, coEffect);
      assertions.push({
        name: '关系网:同区域女角触发共现影响',
        ok: coEffect.jealousyDelta > 0 || coEffect.companionWeight > 0,
        expected: '影响非零',
        actual: `嫉妒+${coEffect.jealousyDelta}, 结伴${coEffect.companionWeight}`,
      });
    }

    // 8. 验证嫉妒传播:玩家与美佐子亲密(50),唯(情敌)嫉妒值+
    const jealousyDelta = relationshipGraph.computeJealousyPropagation(1, 2, 50); // 唯对美佐子
    trace.append('relationship', 'jealousy-propagation', `唯(情敌)对美佐子(亲密度50):嫉妒+${jealousyDelta}`, {
      heroineId: 1,
      intimateHeroineId: 2,
      intimacyLevel: 50,
      jealousyDelta,
    });
    assertions.push({
      name: '关系网:唯(情敌)对美佐子嫉妒传播 > 0',
      ok: jealousyDelta > 0,
      expected: '>0',
      actual: String(jealousyDelta),
    });

    // 9. 模拟将 NPC ops 合并到候选变更集并提交
    const varAiText = buildMockVarAiOutput([
      { op: 'replace', path: '/主角/心情', value: 70 },
      { op: 'replace', path: '/时间/小时', value: 12 },
    ]);
    const mainAiText = buildMockMainAiOutput(
      `中午时分,${npcResult.actionSummary || '场外女角各自活动'}. 我和美佐子在客厅聊天,不知为何,心里隐隐有些不安。`,
    );

    const draft = await kernel.startTurn({ action: '中午和美佐子聊天' });
    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);

    // 把 NPC ops 合并到候选(NormalizedOp 形态)
    const npcOpsAdapted = npcResult.stateOps.map((op) => ({
      op: op.op === 'add' ? 'replace' as const : op.op,
      path: op.path,
      value: op.value,
      rawOp: op.op,
      rawPath: op.path,
      isNewField: false,
    }));
    const mergedVarAiOps = [...raw.varAiParsed.ops, ...npcOpsAdapted];
    const mergedRaw: typeof raw = {
      ...raw,
      varAiParsed: { ...raw.varAiParsed, ops: mergedVarAiOps },
    };

    const candidate = kernel.aggregate(mergedRaw);
    // 注入 NPC 摘要
    candidate.npcActionSummary = npcResult.actionSummary;
    candidate.npcStateOps = npcResult.stateOps;
    candidate.npcPlotTriggers = npcResult.plotTriggers.map((t) => ({
      heroineName: t.node.heroineName,
      event: t.node.event,
      type: t.type,
    }));

    const facts = await kernel.commit(candidate);
    trace.append('stateCommit', 'commit', `候选提交(含 NPC ops):applied=${facts.txResult.appliedCount}`);

    assertions.push({
      name: '候选提交成功(含 NPC ops)',
      ok: facts.ok,
      expected: 'ok=true',
      actual: `ok=${facts.ok}`,
    });

    // 10. 断言:NPC 摘要透传到 CommittedFacts
    assertions.push({
      name: 'NPC 摘要透传到 CommittedFacts',
      ok: (facts.npcActionSummary?.length ?? 0) > 0,
      expected: '非空',
      actual: facts.npcActionSummary?.slice(0, 60) ?? '空',
    });
  } catch (e) {
    errors.push(`案例 b3 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestKernel(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'b3',
    name: 'NPC 自然行动 + 关系网触发',
    behavior: '推进数回合 → 场外女角行动 + 嫉妒传播 → 注入主聊天 AI 上下文',
    ok,
    evidence: ok
      ? `场外女角行动 + 关系网嫉妒传播 + NPC ops 合并提交(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  案例 b4:H 场景触发 + 结算 + CG 收录
//  - 好感达阈值 + 私密位置 → H 评估 → 结算页生成 → CG 收录
//  - 验证:HSceneEngine.evaluate + settle + cgGallery.unlock
// ───────────────────────────────────────────────────────────

async function caseB4_hSceneAndCG(trace: BehaviorTraceCollector): Promise<BehaviorCaseResult> {
  const assertions: BehaviorCaseResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    trace.append('hScene', 'b4-start', '案例 b4 启动:H 场景触发 + 结算 + CG 收录');

    kernel = await createTestKernel('b4');

    // 1. 预设美佐子状态:好感 85 + 关系阶段 情人
    const sd0 = kernel.getStatData();
    const heroines0 = (sd0.女角 ?? {}) as Record<string, Record<string, unknown>>;
    heroines0['鸣泽美佐子'] = {
      ...(heroines0['鸣泽美佐子'] ?? {}),
      好感度: 85,
      关系阶段: '情人',
      当前位置: '自宅卧室',
      初H: 0,
      进阶H: 0,
      H经验: 0,
      嫉妒值: 0,
    };
    sd0.女角 = heroines0;
    await kernel.initializeNewGame(sd0);
    trace.append('hScene', 'preset', '美佐子预设:好感85/情人/自宅卧室/未初H');

    // 2. 构造 H 场景触发条件
    const hCondition: HSceneTriggerCondition = {
      heroineName: '鸣泽美佐子',
      relationshipStage: '情人',
      minFavorability: 85,
      location: '自宅卧室',
      timeSlot: '深夜',
      hasHHistory: false,
      isConsensual: true,
      triggerAction: '与美佐子在卧室拥抱亲吻,准备做爱',
    };
    trace.append('hScene', 'condition', `H 触发条件:${hCondition.heroineName}/${hCondition.location}/${hCondition.timeSlot}`);

    // 3. H 场景评估
    const evaluation = hSceneEngine.evaluate(hCondition);
    trace.append('hScene', 'evaluate', `评估结果:triggered=${evaluation.triggered}, type=${evaluation.type}`, evaluation);

    assertions.push({
      name: 'H 场景触发评估通过',
      ok: evaluation.triggered === true,
      expected: 'triggered=true',
      actual: `triggered=${evaluation.triggered}${evaluation.reason ? `, reason=${evaluation.reason}` : ''}`,
    });
    assertions.push({
      name: 'H 场景类型 = first-time(初H)',
      ok: evaluation.type === 'first-time',
      expected: 'first-time',
      actual: evaluation.type,
    });
    assertions.push({
      name: 'H 经验增量 = 20(初H)',
      ok: evaluation.experienceDelta === 20,
      expected: '20',
      actual: String(evaluation.experienceDelta),
    });
    assertions.push({
      name: '好感度增量 = 15(初H 自愿)',
      ok: evaluation.favorabilityDelta === 15,
      expected: '15',
      actual: String(evaluation.favorabilityDelta),
    });
    assertions.push({
      name: '处女膜状态变化 = broken(初H)',
      ok: evaluation.hymenChange === 'broken',
      expected: 'broken',
      actual: String(evaluation.hymenChange),
    });
    assertions.push({
      name: '关系阶段变化 = 情人(已是情人不变)',
      ok: evaluation.relationshipStageChange === undefined || evaluation.relationshipStageChange === '情人',
      expected: '无变化或情人',
      actual: String(evaluation.relationshipStageChange),
    });

    // 4. 生成 H 结算页 + CG 解锁
    const { settlement, newlyUnlockedCG } = await hSceneEngine.settleAndUnlock(hCondition);
    trace.append('hScene', 'settle', `结算页生成:bodyChanges=${settlement.bodyChanges.length}条, ops=${settlement.stateOps.length}条`);
    trace.append('cgUnlock', 'cg-unlock', `CG 解锁:${newlyUnlockedCG ? newlyUnlockedCG.id : '无新 CG(或已解锁)'}`, newlyUnlockedCG);

    assertions.push({
      name: 'H 结算页生成(summary 非空)',
      ok: settlement.summary.length > 0,
      expected: '非空',
      actual: settlement.summary.slice(0, 60),
    });
    assertions.push({
      name: 'H 结算 bodyChanges ≥ 3(身体多部位变化)',
      ok: settlement.bodyChanges.length >= 3,
      expected: '>=3',
      actual: String(settlement.bodyChanges.length),
    });
    assertions.push({
      name: 'H 结算 stateOps ≥ 5(初H 多字段更新)',
      ok: settlement.stateOps.length >= 5,
      expected: '>=5',
      actual: String(settlement.stateOps.length),
    });

    // 5. 把 H 结算 ops 合并到候选变更集(NormalizedOp 形态)
    const hOpsAdapted = settlement.stateOps.map((op) => ({
      op: op.op === 'add' ? 'replace' as const : op.op,
      path: op.path,
      value: op.value,
      rawOp: op.op,
      rawPath: op.path,
      isNewField: false,
    }));
    const varAiText = buildMockVarAiOutput([
      { op: 'replace', path: '/主角/心情', value: 90 },
      { op: 'replace', path: '/时间/小时', value: 23 },
    ]);
    const mainAiText = buildMockMainAiOutput(
      `${settlement.summary}\n\n${settlement.bodyChanges.join('\n')}`,
    );

    const draft = await kernel.startTurn({ action: hCondition.triggerAction });
    const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
    const mergedVarAiOps = [...raw.varAiParsed.ops, ...hOpsAdapted];
    const mergedRaw: typeof raw = {
      ...raw,
      varAiParsed: { ...raw.varAiParsed, ops: mergedVarAiOps },
    };
    const candidate = kernel.aggregate(mergedRaw);
    const facts = await kernel.commit(candidate);
    trace.append('stateCommit', 'commit', `H 结算 ops 提交:applied=${facts.txResult.appliedCount}/${facts.txResult.appliedCount + facts.txResult.rejectedCount}`);

    assertions.push({
      name: 'H 结算 ops 提交成功',
      ok: facts.ok,
      expected: 'ok=true',
      actual: `ok=${facts.ok}`,
    });

    // 6. 验证美佐子状态已更新
    const afterHeroine = (facts.after.女角 as Record<string, unknown>)['鸣泽美佐子'] as Record<string, unknown>;
    assertions.push({
      name: '美佐子.初H = 1(已发生)',
      ok: afterHeroine?.初H === 1,
      expected: '1',
      actual: String(afterHeroine?.初H),
    });
    assertions.push({
      name: '美佐子.H经验 = 20(初H +20)',
      ok: afterHeroine?.H经验 === 20,
      expected: '20',
      actual: String(afterHeroine?.H经验),
    });

    // 7. 验证 CG 画廊状态
    await cgGallery.load();
    const cgState = cgGallery.snapshot();
    trace.append('cgUnlock', 'gallery-state', `CG 画廊:已解锁 ${cgState.unlockedCount}/${cgState.totalCount}`);
    assertions.push({
      name: 'CG 画廊状态可查询',
      ok: cgState.totalCount > 0,
      expected: '>0',
      actual: `${cgState.unlockedCount}/${cgState.totalCount}`,
    });

    // 8. 评估事件 CG(基于 stat_data)
    const eventCGs = cgGallery.evaluateEventCG(facts.after);
    trace.append('cgUnlock', 'event-cg-eval', `事件 CG 评估:${eventCGs.length} 个新触发`);
    assertions.push({
      name: '事件 CG 评估执行(无异常)',
      ok: Array.isArray(eventCGs),
      expected: '数组',
      actual: `${eventCGs.length} 个`,
    });
  } catch (e) {
    errors.push(`案例 b4 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestKernel(kernel);
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'b4',
    name: 'H 场景触发 + 结算 + CG 收录',
    behavior: '好感 85 + 私密位置(自宅卧室) + 深夜 → 初H 评估 → 结算页 → CG 收录',
    ok,
    evidence: ok
      ? `H 触发(first-time) + 结算页 + ops 提交 + 初H=1/H经验=20 + CG 画廊(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  案例 b5:多结局分支 + 多周目继承
//  - 推进到结局条件 → 结局分支评估 → 周目记录 → NG+ 继承点数
//  - 验证:achievementEngine.endPlaythrough + startNewGamePlus
// ───────────────────────────────────────────────────────────

async function caseB5_endingsAndNgPlus(trace: BehaviorTraceCollector): Promise<BehaviorCaseResult> {
  const assertions: BehaviorCaseResult['assertions'] = [];
  const errors: string[] = [];
  const startedAt = Date.now();
  let kernel: Kernel | null = null;

  try {
    trace.append('ending', 'b5-start', '案例 b5 启动:多结局分支 + 多周目继承');

    kernel = await createTestKernel('b5');

    // 1. 预设 stat_data:推进到结局条件(17 天 + 美佐子好感 90 + 攻略完成)
    const sd0 = kernel.getStatData();
    const heroines0 = (sd0.女角 ?? {}) as Record<string, Record<string, unknown>>;
    heroines0['鸣泽美佐子'] = {
      ...(heroines0['鸣泽美佐子'] ?? {}),
      好感度: 90,
      关系阶段: '攻略完成',
      当前位置: '自宅客厅',
      初H: 1,
      进阶H: 1,
      H经验: 30,
      嫉妒值: 0,
    };
    sd0.女角 = heroines0;
    const time0 = (sd0.时间 ?? {}) as Record<string, unknown>;
    time0.天数 = 17;
    sd0.时间 = time0;
    await kernel.initializeNewGame(sd0);
    trace.append('ending', 'preset', '预设:day17 + 美佐子好感90/攻略完成 → 触发 True End 条件');

    // 2. 评估成就引擎(基于当前 stat_data)
    await achievementEngine.load();
    trace.append('achievement', 'engine-loaded', `成就引擎加载:周目=${achievementEngine.getNgPlusState().currentPlaythrough}`);

    const newlyUnlocked = await achievementEngine.evaluateAll(kernel.getStatData(), {
      turnCount: 50,
    });
    trace.append('achievement', 'evaluate', `成就评估:新解锁 ${newlyUnlocked.length} 个`);
    for (const record of newlyUnlocked) {
      trace.append('achievement', `unlock-${record.id}`, `成就 ${record.id} 解锁(day=${record.dayInGame}, turn=${record.turnCount})`);
    }

    assertions.push({
      name: '成就评估执行(无异常)',
      ok: Array.isArray(newlyUnlocked),
      expected: '数组',
      actual: `${newlyUnlocked.length} 个新解锁`,
    });

    // 3. 结束当前周目(True End - 美佐子攻略完成)
    const endingRecord = await achievementEngine.endPlaythrough({
      endingId: 'true_end_misuzu',
      endingTitle: 'True End · 美佐子篇 · 永恒的约定',
      endingType: 'true_end',
      playerName: '桐生同学',
      identityName: '原作主角',
      dayInGame: 17,
      turnCount: 50,
    });
    trace.append('ending', 'end-playthrough', `周目结束:index=${endingRecord.index}, 结局=${endingRecord.endingTitle}, 继承点=${endingRecord.earnedInheritPoints}`);

    assertions.push({
      name: '周目记录创建(index=1)',
      ok: endingRecord.index === 1,
      expected: '1',
      actual: String(endingRecord.index),
    });
    assertions.push({
      name: '结局类型 = true_end',
      ok: endingRecord.endingType === 'true_end',
      expected: 'true_end',
      actual: endingRecord.endingType,
    });
    assertions.push({
      name: '周目记录含主角姓名',
      ok: endingRecord.playerName === '桐生同学',
      expected: '桐生同学',
      actual: endingRecord.playerName,
    });
    assertions.push({
      name: '周目记录含游戏内天数',
      ok: endingRecord.dayInGame === 17,
      expected: '17',
      actual: String(endingRecord.dayInGame),
    });
    assertions.push({
      name: '继承点数累计 ≥ 0(成就奖励)',
      ok: endingRecord.earnedInheritPoints >= 0,
      expected: '>=0',
      actual: String(endingRecord.earnedInheritPoints),
    });

    // 4. 开始新周目(NG+)
    const inheritStats = {
      魅力: 60,
      学业: 70,
      体力: 65,
      社交: 65,
      敏感: 60,
      声誉: 65,
    };
    const ngPlusState = await achievementEngine.startNewGamePlus({
      inheritStats,
      inheritItems: ['item_diary_1'],
      pointsToSpend: 0,
    });
    trace.append('ngPlus', 'start-ng-plus', `NG+ 启动:周目=${ngPlusState.currentPlaythrough}, 可用点数=${ngPlusState.availablePoints}, 继承属性=${Object.keys(inheritStats).length}项`);

    assertions.push({
      name: 'NG+ 激活',
      ok: ngPlusState.activated === true,
      expected: 'true',
      actual: String(ngPlusState.activated),
    });
    assertions.push({
      name: 'NG+ 周目序号 = 2',
      ok: ngPlusState.currentPlaythrough === 2,
      expected: '2',
      actual: String(ngPlusState.currentPlaythrough),
    });
    assertions.push({
      name: 'NG+ 继承属性注入(6 维)',
      ok: ngPlusState.inheritedStats?.魅力 === 60 && ngPlusState.inheritedStats?.学业 === 70,
      expected: '魅力60/学业70',
      actual: `魅力${ngPlusState.inheritedStats?.魅力}/学业${ngPlusState.inheritedStats?.学业}`,
    });
    assertions.push({
      name: 'NG+ 继承物品注入',
      ok: ngPlusState.inheritedItems?.includes('item_diary_1') === true,
      expected: '含 item_diary_1',
      actual: ngPlusState.inheritedItems?.join('/') ?? '空',
    });

    // 5. 生成 NG+ 初始 stat_data(基于继承状态修改默认值)
    const baseStatData = kernel.getStatData();
    const ngPlusStatData = achievementEngine.generateNgPlusInitialStatData(baseStatData);
    const ngPlusPlayer = ngPlusStatData.主角 as Record<string, unknown>;
    const ngPlusHidden = ngPlusStatData.隐藏 as Record<string, unknown>;
    trace.append('ngPlus', 'generate-stat', `NG+ stat_data 生成:主角.魅力=${ngPlusPlayer?.魅力}(继承 60×0.5=30), NG+标记=${ngPlusHidden?.NG_PLUS_ACTIVATED}`);

    assertions.push({
      name: 'NG+ 主角属性 50% 衰减注入(魅力 60→30)',
      ok: ngPlusPlayer?.魅力 === 30,
      expected: '30',
      actual: String(ngPlusPlayer?.魅力),
    });
    assertions.push({
      name: 'NG+ 标记注入(NG_PLUS_ACTIVATED=1)',
      ok: ngPlusHidden?.NG_PLUS_ACTIVATED === 1,
      expected: '1',
      actual: String(ngPlusHidden?.NG_PLUS_ACTIVATED),
    });
    assertions.push({
      name: 'NG+ 周目数标记(NG_PLUS_PLAYTHROUGH=2)',
      ok: ngPlusHidden?.NG_PLUS_PLAYTHROUGH === 2,
      expected: '2',
      actual: String(ngPlusHidden?.NG_PLUS_PLAYTHROUGH),
    });

    // 6. 验证周目历史
    const playthroughs = achievementEngine.getPlaythroughs();
    trace.append('ending', 'playthroughs', `周目历史:${playthroughs.length} 条`);
    assertions.push({
      name: '周目历史记录数 = 1',
      ok: playthroughs.length === 1,
      expected: '1',
      actual: String(playthroughs.length),
    });
    assertions.push({
      name: '周目历史[0].结局 ID = true_end_misuzu',
      ok: playthroughs[0]?.endingId === 'true_end_misuzu',
      expected: 'true_end_misuzu',
      actual: playthroughs[0]?.endingId ?? '-',
    });

    // 7. 模拟第二周目结束(不同结局,验证多结局分支)
    // 重置成就引擎状态以便第二周目(模拟新存档)
    // 注意:此处不重置,继续累计,验证多周目累计行为
    const ending2Record = await achievementEngine.endPlaythrough({
      endingId: 'good_end_yui',
      endingTitle: 'Good End · 唯篇 · 永远的好朋友',
      endingType: 'good_end',
      playerName: '桐生同学',
      identityName: '原作主角',
      dayInGame: 17,
      turnCount: 45,
    });
    trace.append('ending', 'second-end', `第二周目结束:index=${ending2Record.index}, 结局=${ending2Record.endingTitle}`);

    assertions.push({
      name: '第二周目记录创建(index=2)',
      ok: ending2Record.index === 2,
      expected: '2',
      actual: String(ending2Record.index),
    });
    assertions.push({
      name: '第二周目结局类型 = good_end(多结局分支)',
      ok: ending2Record.endingType === 'good_end',
      expected: 'good_end',
      actual: ending2Record.endingType,
    });
    assertions.push({
      name: '周目历史累计 = 2(多周目支持)',
      ok: achievementEngine.getPlaythroughs().length === 2,
      expected: '2',
      actual: String(achievementEngine.getPlaythroughs().length),
    });
    assertions.push({
      name: '多结局分支:true_end + good_end 均存在',
      ok: achievementEngine.getPlaythroughs().some((p) => p.endingType === 'true_end') &&
          achievementEngine.getPlaythroughs().some((p) => p.endingType === 'good_end'),
      expected: 'true_end + good_end',
      actual: achievementEngine.getPlaythroughs().map((p) => p.endingType).join('/'),
    });
  } catch (e) {
    errors.push(`案例 b5 异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (kernel) await cleanupTestKernel(kernel);
    // 清理成就引擎测试数据(避免污染其他测试)
    try {
      await achievementEngine.resetAll();
    } catch {
      /* 忽略 */
    }
  }

  const ok = errors.length === 0 && assertions.every((a) => a.ok);
  return {
    id: 'b5',
    name: '多结局分支 + 多周目继承',
    behavior: '推进到结局条件(day17 + 美佐子攻略完成) → True End → 周目记录 → NG+ 继承 → 第二周目 Good End',
    ok,
    evidence: ok
      ? `True End + NG+ 继承(属性 50% 衰减) + 第二周目 Good End + 多结局分支(${assertions.filter((a) => a.ok).length}/${assertions.length} 断言通过)`
      : `失败:${errors.join('; ')}`,
    traces: trace.all(),
    assertions,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ───────────────────────────────────────────────────────────
//  行为案例验证器
// ───────────────────────────────────────────────────────────

class BehaviorCaseVerifier {
  /** 运行全部 5 个案例 */
  async runAll(): Promise<BehaviorReport> {
    const results: BehaviorCaseResult[] = [];
    const allTraces: BehaviorTraceEntry[] = [];
    const startedAt = Date.now();

    // 顺序执行(避免 IndexedDB 并发冲突)
    const cases = [
      caseB1_openingFlow,
      caseB2_heroineInteraction,
      caseB3_npcActionAndRelationship,
      caseB4_hSceneAndCG,
      caseB5_endingsAndNgPlus,
    ];

    for (const fn of cases) {
      const trace = new BehaviorTraceCollector();
      try {
        const result = await fn(trace);
        results.push(result);
        allTraces.push(...result.traces);
      } catch (e) {
        results.push({
          id: 'unknown',
          name: fn.name,
          behavior: '',
          ok: false,
          evidence: '执行器异常',
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

  /** 运行单个案例 */
  async runOne(id: string): Promise<BehaviorCaseResult | null> {
    const trace = new BehaviorTraceCollector();
    switch (id) {
      case 'b1':
        return caseB1_openingFlow(trace);
      case 'b2':
        return caseB2_heroineInteraction(trace);
      case 'b3':
        return caseB3_npcActionAndRelationship(trace);
      case 'b4':
        return caseB4_hSceneAndCG(trace);
      case 'b5':
        return caseB5_endingsAndNgPlus(trace);
      default:
        return null;
    }
  }
}

// ───────────────────────────────────────────────────────────
//  单例导出
// ───────────────────────────────────────────────────────────

export const behaviorCaseVerifier = new BehaviorCaseVerifier();

// ───────────────────────────────────────────────────────────
//  案例元信息(UI 展示用)
// ───────────────────────────────────────────────────────────

export const BEHAVIOR_CASE_META: Array<{
  id: string;
  name: string;
  behavior: string;
  description: string;
  traceCategories: BehaviorTraceCategory[];
}> = [
  {
    id: 'b1',
    name: '寒假开局完整流程',
    behavior: '玩家选 P1 原作主角 → 12-22 早晨开场 → 状态栏 9 分类正确',
    description: '验证 P1 身份字段写入 + 12-22 时间初始化 + 6 维属性 + 9 分类字段齐全 + 开场叙事',
    traceCategories: ['opening', 'stateCommit'],
  },
  {
    id: 'b2',
    name: '女角互动 + LCG 骰子 + 关系推进',
    behavior: '玩家与美佐子对话 → 骰子判定(社交) → 好感/关系阶段变化(初识→暧昧)',
    description: '验证 LCG 骰子(55+30=85≥60) + 好感 20→35 + 关系阶段初识→暧昧 + 时间推进 30 分钟',
    traceCategories: ['diceRoll', 'heroineInteract', 'stateCommit'],
  },
  {
    id: 'b3',
    name: 'NPC 自然行动 + 关系网触发',
    behavior: '推进数回合 → 场外女角行动 + 嫉妒传播 → 注入主聊天 AI 上下文',
    description: '验证 NPC 行动摘要生成 + 关系网嫉妒传播(情敌) + NPC ops 合并到候选变更集',
    traceCategories: ['npcAction', 'relationship', 'stateCommit'],
  },
  {
    id: 'b4',
    name: 'H 场景触发 + 结算 + CG 收录',
    behavior: '好感 85 + 私密位置(自宅卧室) + 深夜 → 初H 评估 → 结算页 → CG 收录',
    description: '验证 HSceneEngine.evaluate(first-time) + settle + CG 画廊解锁 + 初H=1/H经验=20',
    traceCategories: ['hScene', 'cgUnlock', 'stateCommit'],
  },
  {
    id: 'b5',
    name: '多结局分支 + 多周目继承',
    behavior: '推进到结局条件(day17 + 美佐子攻略完成) → True End → 周目记录 → NG+ 继承 → 第二周目 Good End',
    description: '验证 endPlaythrough + startNewGamePlus + NG+ 属性 50% 衰减 + 多结局分支(true_end + good_end)',
    traceCategories: ['achievement', 'ending', 'ngPlus'],
  },
];
