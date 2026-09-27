// 战斗/冲突引擎确定性回归测试
// 运行: <repo-root>/node_modules/.bin/tsx scripts/_engines_test.mts
import { combatEngine, type CombatTriggerCondition } from '../src/runtime/combat-engine';
import { conflictEngine, type ConflictContext } from '../src/runtime/conflict-engine';
import { npcActionRunner, type NpcActionContext } from '../src/runtime/npc/action-runner';
import { CONFLICT_SCENARIOS } from '../src/content/conflicts/conflict-scenarios';

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
const check = (name: string, ok: boolean, detail?: string) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'OK   ' : 'FAIL '}| ${name}${detail ? ` | ${detail}` : ''}`);
};

const statData: Record<string, unknown> = {
  时间: { 天数: 1, 时段: '早', 章节: '寒假前奏' },
  场景: { 当前地点: '自宅', 当前女角id: 0 },
  当前女角: { 姓名: '无' },
  主角: {
    玩家姓名: '玩家',
    魅力: 50,
    学业: 50,
    体力: 50,
    社交: 50,
    敏感: 50,
    声誉: 50,
    疲劳: 10,
    违法计数: 0,
  },
  技能: {
    力量: 30,
    敏捷: 40,
    智力: 50,
    意志: 40,
    潜行: 20,
    口才: 40,
    格斗: 25,
  },
  女角: {
    鸣泽唯: {
      好感度: 0,
      信任度: 0,
      嫉妒值: 0,
      心跳: 0,
      关系阶段: '初识',
    },
  },
};

const combatCondition: CombatTriggerCondition = {
  userAction: '测试战斗',
  statData,
  opponentName: '小混混',
  difficulty: '普通',
};

const combatKey = (s: ReturnType<typeof combatEngine.settle>) =>
  JSON.stringify({
    result: s.result,
    rounds: s.rounds.map((r) => ({
      dice: r.roll.dice,
      total: r.roll.total,
      success: r.roll.success,
      criticalSuccess: r.roll.criticalSuccess,
      criticalFailure: r.roll.criticalFailure,
      damage: r.damage?.finalDamage,
      description: r.description,
    })),
    ops: s.stateOps,
  });

const combat1 = combatEngine.settle(combatCondition);
const combat2 = combatEngine.settle(combatCondition);
check(
  'combatEngine.settle 同输入同结果',
  combatKey(combat1) === combatKey(combat2),
  `result=${combat1.result} rounds=${combat1.rounds.length}`,
);

const scenario = CONFLICT_SCENARIOS[0];
const chosenPath = scenario.resolutionPaths[0].path;
const conflictCtx: ConflictContext = { statData, difficulty: '普通' };
const conflictKey = (r: ReturnType<typeof conflictEngine.resolve>) =>
  JSON.stringify({
    success: r.success,
    dice: r.roll.dice,
    total: r.roll.total,
    threshold: r.roll.threshold,
    criticalSuccess: r.roll.criticalSuccess,
    criticalFailure: r.roll.criticalFailure,
    narrative: r.narrative,
    ops: r.stateOps,
    impacts: r.appliedImpacts.map((i) => ({ heroineName: i.heroineName, after: i.after })),
  });

const conflict1 = conflictEngine.resolve(scenario.id, chosenPath, conflictCtx);
const conflict2 = conflictEngine.resolve(scenario.id, chosenPath, conflictCtx);
check(
  'conflictEngine.resolve 同输入同结果',
  conflictKey(conflict1) === conflictKey(conflict2),
  `scenario=${scenario.id} path=${chosenPath} success=${conflict1.success} dice=${conflict1.roll.dice}`,
);

if (typeof indexedDB !== 'undefined') {
  const npcCtx: NpcActionContext = {
    dayCount: 1,
    timeSlot: '早',
    playerRegion: '自宅周边',
    currentHeroineId: 1,
    heroineStates: {
      1: {
        好感度: 30,
        关系阶段: '暧昧',
        当前位置: '自宅周边',
        独立剧情进度: '未开始',
      },
    },
    triggeredFlags: new Set<string>(),
    relationshipOverrides: {},
    unlockedHiddenIds: [],
  };
  const npc1 = await npcActionRunner.run(npcCtx);
  const npc2 = await npcActionRunner.run(npcCtx);
  check(
    'npcActionRunner.run 同输入同结果',
    JSON.stringify(npc1) === JSON.stringify(npc2),
    `offScreen=${npc1.offScreenActions.length} plot=${npc1.plotTriggers.length}`,
  );
} else {
  console.log('SKIP | npcActionRunner.run (browser-only: needs IndexedDB)');
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length > 0 ? 1 : 0);
