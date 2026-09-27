import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useDungeonStore } from '@/stores/dungeonStore';
import { useGameStore } from '@/stores/gameStore';
import { useCombatStore } from '@/stores/combatStore';
import { useQuestStore } from '@/stores/questStore';
import { getHeroName } from '@/data/ddLoader';
import { getCurioDefinition, provisionNameMap } from '@/gateway/curioSystem';
import { getTorchEffectByValue } from '@/gateway/dungeonGenerator';
import { useAiStore } from '@/stores/aiStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import {
  getQuestTypeName,
  getDifficultyName,
} from '@/gateway/questGenerator';
import type { PendingBattle, LootEntry } from '@/types';
import clsx from 'clsx';
import CampScreen from '@/components/CampScreen';

// ============================================================
// 常量与辅助函数
// ============================================================

// 房间类型标签
const roomTypeLabel: Record<string, string> = {
  entrance: '入口',
  exit: '出口',
  battle: '战斗',
  boss: 'BOSS',
  treasure: '宝箱',
  curio: '好奇',
  camp: '营地',
  empty: '空',
};

// 房间类型图标（Unicode符号，非emoji）
const roomTypeIcon: Record<string, string> = {
  entrance: '⚑',
  exit: '⛨',
  battle: '⚔',
  boss: '☠',
  treasure: '◆',
  curio: '✦',
  camp: '☩',
  empty: '·',
};

// 任务类型图标（Unicode符号）
function getQuestIcon(type: string): string {
  switch (type) {
    case 'explore': return '◈';
    case 'exterminate': return '⚔';
    case 'purge': return '☩';
    case 'collect': return '◆';
    case 'boss': return '☠';
    case 'escape': return '⛨';
    default: return '?';
  }
}

// 任务难度颜色（暗色调）
function difficultyColorClass(difficulty: string): string {
  switch (difficulty) {
    case 'novice': return 'text-dd-textMuted';
    case 'veteran': return 'text-dd-gold';
    case 'champion': return 'text-dd-redBright';
    default: return 'text-dd-text';
  }
}

// 当前房间描述
const roomDescMap: Record<string, { desc: string; sub: string }> = {
  entrance: { desc: '这里是地牢的入口', sub: '队伍从这里踏入黑暗' },
  exit: { desc: '出口就在前方', sub: '逃出生天的希望所在' },
  battle: { desc: '房间里潜伏着敌人', sub: '一场恶战在所难免' },
  boss: { desc: '强大的敌人镇守于此', sub: '击败它以完成使命' },
  treasure: { desc: '房间里有一只宝箱', sub: '打开它获取战利品' },
  curio: { desc: '房间里有一个奇怪的好奇物', sub: '谨慎调查，未知是最大的敌人' },
  camp: { desc: '这里适合扎营休息', sub: '恢复生命值并缓解压力' },
  empty: { desc: '房间空空如也', sub: '只有尘土与回声' },
};

// 传家宝中文名
const heirloomNames: Record<string, string> = {
  bust: '雕像',
  portrait: '画像',
  deed: '契约',
  crest: '纹章',
};

// 战利品显示
function lootToString(loot: LootEntry[]): string {
  const parts: string[] = [];
  for (const entry of loot) {
    switch (entry.type) {
      case 'gold':
        parts.push(`${entry.amount} 金币`);
        break;
      case 'heirloom':
        parts.push(`${entry.amount} ${heirloomNames[entry.heirloomType || ''] || '传家宝'}`);
        break;
      case 'trinket':
        parts.push(`${entry.amount} 件饰品`);
        break;
      case 'provision':
        parts.push(`${entry.amount} 份补给品`);
        break;
    }
  }
  return parts.join('、');
}

// ============================================================
// 火把档位 — 辉煌/照明/黯淡/黑暗 四档
// ============================================================

interface TorchTier {
  mark: string;
  label: string;
  textClass: string;
  fill: string;
}

function getTorchTier(torch: number): TorchTier {
  // 辉煌 (76-100)
  if (torch >= 76) {
    return {
      mark: '▲',
      label: '辉煌',
      textClass: 'text-dd-torchBright dd-anim-flicker',
      fill: 'linear-gradient(90deg, #8a7028, #e8c050)',
    };
  }
  // 照明 (51-75)
  if (torch >= 51) {
    return {
      mark: '◆',
      label: '照明',
      textClass: 'text-dd-torch',
      fill: 'linear-gradient(90deg, #b07828, #e8a030)',
    };
  }
  // 黯淡 (26-50)
  if (torch >= 26) {
    return {
      mark: '▼',
      label: '黯淡',
      textClass: 'text-dd-goldDark',
      fill: 'linear-gradient(90deg, #6a5220, #8a6810)',
    };
  }
  // 黑暗 (0-25)
  return {
    mark: '☠',
    label: '黑暗',
    textClass: 'text-dd-stressBright animate-pulse',
    fill: 'linear-gradient(90deg, #5a1010, #a82828)',
  };
}

// 补给品图标（Unicode符号，非emoji）
const provisionIcons: Record<string, string> = {
  torch: '▲',
  food: '◆',
  skeleton_key: '⚑',
  shovel: '▣',
  holy_water: '☩',
  medicinal_herbs: '✦',
  bandage: '✚',
  antivenom: '☠',
};

// ============================================================
// 主组件
// ============================================================

export default function Dungeon() {
  // Dungeon store
  const dungeon = useDungeonStore((s) => s.dungeon);
  const provisions = useDungeonStore((s) => s.provisions);
  const partyUids = useDungeonStore((s) => s.partyUids);
  const pendingBattle = useDungeonStore((s) => s.pendingBattle);
  const awaitingResolution = useDungeonStore((s) => s.awaitingResolution);
  const log = useDungeonStore((s) => s.log);
  const questComplete = useDungeonStore((s) => s.questComplete);
  const curioResult = useDungeonStore((s) => s.curioResult);
  const currentCurioId = useDungeonStore((s) => s.currentCurioId);
  const roomLoot = useDungeonStore((s) => s.roomLoot);
  const showCamp = useDungeonStore((s) => s.showCamp);
  const monsterPoolCache = useDungeonStore((s) => s.monsterPoolCache);

  // AI 叙事状态
  const aiEnabled = useAiStore((s) => s.config.enabled);
  const narrSlot = useNarrativeStore((s) => s.dungeon);
  const skipNarrative = useNarrativeStore((s) => s.skipNarrative);

  const moveToRoom = useDungeonStore((s) => s.moveToRoom);
  const moveAlongCorridor = useDungeonStore((s) => s.moveAlongCorridor);
  const retreatAlongCorridor = useDungeonStore((s) => s.retreatAlongCorridor);
  const useTorch = useDungeonStore((s) => s.useTorch);
  const useProvision = useDungeonStore((s) => s.useProvision);
  const investigateCurio = useDungeonStore((s) => s.investigateCurio);
  const dismissCurioResult = useDungeonStore((s) => s.dismissCurioResult);
  const collectLoot = useDungeonStore((s) => s.collectLoot);
  const useCamp = useDungeonStore((s) => s.useCamp);
  const dismissCamp = useDungeonStore((s) => s.dismissCamp);
  const retreat = useDungeonStore((s) => s.retreat);
  const leaveDungeon = useDungeonStore((s) => s.leaveDungeon);
  const clearPendingBattle = useDungeonStore((s) => s.clearPendingBattle);
  const resolveBattle = useDungeonStore((s) => s.resolveBattle);
  const triggerBattle = useDungeonStore((s) => s.triggerBattle);

  // Game store
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const roster = useGameStore((s) => s.roster);

  // Combat store
  const battle = useCombatStore((s) => s.battle);
  const isInitializing = useCombatStore((s) => s.isInitializing);
  const startBattle = useCombatStore((s) => s.startBattle);
  const setReturnPhase = useCombatStore((s) => s.setReturnPhase);
  const lastWinner = useCombatStore((s) => s.lastWinner);

  // Quest store
  const activeQuest = useQuestStore((s) => s.activeQuest);

  const [selectedCurioProvision, setSelectedCurioProvision] = useState<string | undefined>(undefined);

  // 获取队伍英雄
  const partyHeroes = roster.filter((h) => partyUids.includes(h.uid));

  // 效果：当有待处理战斗时，启动战斗
  useEffect(() => {
    if (pendingBattle && !awaitingResolution) {
      const battleData: PendingBattle = pendingBattle;
      clearPendingBattle();
      void startDungeonBattle(battleData);
    }
  }, [pendingBattle, awaitingResolution]); // eslint-disable-line react-hooks/exhaustive-deps

  // 效果：从战斗返回地牢时，解决战斗结果
  useEffect(() => {
    if (phase === 'dungeon' && awaitingResolution && !battle) {
      const won = lastWinner === 'hero';
      resolveBattle(won);
    }
  }, [phase, awaitingResolution, battle, lastWinner, resolveBattle]);

  // 启动地牢战斗
  async function startDungeonBattle(data: PendingBattle) {
    const heroes = roster.filter((h) => partyUids.includes(h.uid));
    if (heroes.length === 0) return;

    let specificMonsters = monsterPoolCache.filter((m) => data.monsterIds.includes(m.id));
    if (specificMonsters.length === 0 && monsterPoolCache.length > 0) {
      specificMonsters = [...monsterPoolCache]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
    }

    setReturnPhase('dungeon');
    await startBattle(heroes, monsterPoolCache, specificMonsters);
    setPhase('battle');
  }

  // 如果正在初始化战斗
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dd-bg">
        <div className="text-center dd-panel p-8">
          <div className="dd-text-blood font-dd text-3xl mb-3 dd-anim-flicker">
            遭遇！
          </div>
          <div className="text-dd-gold font-dd text-sm tracking-wide animate-pulse">
            正在部署战斗...
          </div>
        </div>
      </div>
    );
  }

  // 如果地牢不存在
  if (!dungeon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dd-bg">
        <div className="text-center dd-panel p-8">
          <div className="text-dd-textMuted mb-4 font-dd">地牢数据不存在</div>
          <button onClick={() => setPhase('town')} className="dd-btn">
            返回城镇
          </button>
        </div>
      </div>
    );
  }

  const torchEffect = getTorchEffectByValue(dungeon.torch);
  const torchTier = getTorchTier(dungeon.torch);
  const currentRoom = dungeon.rooms.find((r) => r.id === dungeon.currentRoomId);
  const currentCorridor = dungeon.currentCorridorId
    ? dungeon.corridors.find((c) => c.id === dungeon.currentCorridorId)
    : null;

  // 当前房间信息（用于房间交互面板）
  const currentRoomInfo = currentRoom ? roomDescMap[currentRoom.type] ?? null : null;
  const roomBattleReady =
    !!currentRoom &&
    (currentRoom.type === 'battle' || currentRoom.type === 'boss') &&
    !!currentRoom.encounter?.monsters &&
    currentRoom.encounter.monsters.length > 0 &&
    currentRoom.state === 'current' &&
    !pendingBattle &&
    !isInitializing;

  // 获取可移动到的相邻房间
  const movableRoomIds = currentRoom
    ? currentRoom.corridors
        .map((cid) => dungeon.corridors.find((c) => c.id === cid))
        .filter((c): c is NonNullable<typeof c> => c !== undefined)
        .map((c) => (c.fromRoom === currentRoom.id ? c.toRoom : c.fromRoom))
    : [];

  // 任务进度
  const goalProgress = (dungeon.questGoal.progress as number) || 0;
  const goalTarget = (dungeon.questGoal.target as number) || 1;
  const goalDesc = (dungeon.questGoal.description as string) || '';

  return (
    <div className="min-h-screen bg-dd-bg p-3 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* ==================================================== */}
        {/* 顶部：火把系统 + 地牢信息                              */}
        {/* ==================================================== */}
        <header className="dd-panel mb-3">
          <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-3">
            {/* 左：地牢名称 */}
            <div className="flex items-center gap-3">
              <span className="font-dd text-dd-gold text-base tracking-wide dd-title">
                {dungeon.name}
              </span>
              <span className="dd-tag">等级 {dungeon.level}</span>
            </div>

            {/* 中：火把系统 */}
            <div className="flex items-center gap-3">
              <span className={clsx('text-2xl leading-none font-bold', torchTier.textClass)}>
                {torchTier.mark}
              </span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-dd-textMuted text-xs font-dd tracking-wide">火把</span>
                  <span className={clsx('font-mono text-sm font-bold', torchTier.textClass)}>
                    {dungeon.torch}
                  </span>
                  <span className={clsx('text-xs font-dd tracking-wide', torchTier.textClass)}>
                    {torchTier.label} · {torchEffect.name}
                  </span>
                </div>
                <div className="dd-bar" style={{ width: '180px' }}>
                  <div
                    className="dd-bar-fill"
                    style={{
                      width: `${dungeon.torch}%`,
                      background: torchTier.fill,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 右：步数 */}
            <div className="flex items-center gap-2">
              <span className="text-dd-textMuted text-xs font-dd tracking-wide">步数</span>
              <span className="text-dd-text font-mono text-sm">{dungeon.steps}</span>
            </div>
          </div>

          {/* 火把效果提示 */}
          <div className="px-4 py-1.5 border-t border-dd-border text-xs text-dd-textMuted flex justify-between flex-wrap gap-2">
            <span>
              <span className="text-dd-gold">英雄</span> {torchEffect.playerBuffs}
            </span>
            <span>
              <span className="text-dd-redBright">怪物</span> {torchEffect.monsterBuffs}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* ==================================================== */}
          {/* 左侧：任务目标 + 地图/走廊 + 日志                     */}
          {/* ==================================================== */}
          <div className="lg:col-span-2 space-y-3">
            {/* 任务目标面板 */}
            <div className="dd-panel">
              <div className="dd-panel-header">
                <span>任务目标</span>
                {activeQuest && (
                  <span className="text-xs normal-case">
                    <span className="mr-1">{getQuestIcon(activeQuest.type)}</span>
                    <span className={difficultyColorClass(activeQuest.difficulty)}>
                      {getQuestTypeName(activeQuest.type)} · {getDifficultyName(activeQuest.difficulty)}
                    </span>
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-dd-textBright text-sm font-dd tracking-wide">
                      {goalDesc}
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <span className="text-dd-text font-mono text-sm">
                      {goalProgress} / {goalTarget}
                    </span>
                    {questComplete && (
                      <div className="dd-text-gold text-xs font-dd tracking-wide dd-anim-flicker">
                        完成!
                      </div>
                    )}
                  </div>
                </div>
                {/* 进度条 */}
                <div className="dd-bar">
                  <div
                    className={clsx('dd-bar-fill', questComplete ? 'dd-hp-high' : 'dd-hp-mid')}
                    style={{
                      width: `${Math.min(100, goalTarget > 0 ? (goalProgress / goalTarget) * 100 : 0)}%`,
                    }}
                  />
                </div>
                {/* 奖励预览 */}
                {activeQuest && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-dd-textMuted flex-wrap">
                    <span className="font-dd tracking-wide">奖励</span>
                    <span className="text-dd-gold font-mono">{activeQuest.rewardGold} 金币</span>
                    <span>
                      {activeQuest.rewardHeirlooms.map((h, i) => (
                        <span key={i}>
                          {i > 0 && '、'}
                          {h.amount} {heirloomNames[h.type] || h.type}
                        </span>
                      ))}
                    </span>
                    {activeQuest.rewardTrinket && (
                      <span className="dd-tag dd-rarity-ancestral">额外饰品</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 地图视图或走廊视图 */}
            {currentCorridor ? (
              <CorridorView
                dungeon={dungeon}
                corridor={currentCorridor}
                onForward={moveAlongCorridor}
                onRetreat={retreatAlongCorridor}
              />
            ) : (
              <MapView
                dungeon={dungeon}
                movableRoomIds={movableRoomIds}
                onMoveToRoom={moveToRoom}
              />
            )}

            {/* 当前房间信息 */}
            {!currentCorridor && currentRoom && (
              <div className="dd-panel">
                <div className="dd-panel-header">
                  <span>当前房间</span>
                  <span className="text-xs normal-case text-dd-textMuted">
                    {roomTypeLabel[currentRoom.type]}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl dd-text-gold leading-none">
                      {roomTypeIcon[currentRoom.type]}
                    </span>
                    <div>
                      <div className="text-sm text-dd-textBright font-dd tracking-wide">
                        {currentRoomInfo?.desc}
                      </div>
                      <div className="text-xs text-dd-textMuted">{currentRoomInfo?.sub}</div>
                    </div>
                  </div>
                  {roomBattleReady && (
                    <button
                      className="dd-btn-primary"
                      onClick={() => {
                        if (currentRoom?.encounter?.monsters) {
                          triggerBattle(currentRoom.encounter.monsters, 'room', currentRoom.id);
                        }
                      }}
                    >
                      遭遇敌人 ⚔
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* AI 旁白叙事面板 */}
            {aiEnabled && (narrSlot.generating || narrSlot.text || narrSlot.error) && (
              <div className="dd-panel" style={{ borderColor: 'rgba(200,160,48,0.25)' }}>
                <div className="dd-panel-header">
                  <span className="flex items-center gap-2">
                    <span className="dd-anim-flicker text-dd-torch">✦</span>
                    <span className="text-dd-gold">旁白</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {narrSlot.generating && (
                      <span className="text-dd-textMuted text-[10px] normal-case font-sans">
                        讲述中...
                      </span>
                    )}
                    <button
                      onClick={() => skipNarrative('dungeon')}
                      className="dd-btn !py-0.5 !px-2 text-[10px]"
                    >
                      跳过
                    </button>
                  </div>
                </div>
                <div className="p-3 text-xs leading-relaxed">
                  {narrSlot.text ? (
                    <span className="text-dd-textBright/90 italic font-light">
                      {narrSlot.text}
                      {narrSlot.generating && (
                        <span className="dd-anim-flicker text-dd-gold ml-0.5">▌</span>
                      )}
                    </span>
                  ) : (
                    narrSlot.generating && (
                      <span className="text-dd-textMuted italic dd-anim-flicker">
                        黑暗中的低语正在靠近…
                      </span>
                    )
                  )}
                  {narrSlot.error && !narrSlot.generating && (
                    <div className="text-dd-redBright/80 text-[11px] mt-1">
                      叙事中断：{narrSlot.error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 地牢日志 */}
            <div className="dd-panel">
              <div className="dd-panel-header">探索日志</div>
              <div className="p-3 max-h-40 overflow-y-auto text-xs space-y-1">
                {log.slice(-15).map((entry, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'text-dd-text',
                      entry.type === 'battle' && 'dd-text-blood',
                      entry.type === 'treasure' && 'text-dd-gold',
                      entry.type === 'trap' && 'text-dd-torch',
                      entry.type === 'curio' && 'text-dd-gold',
                      entry.type === 'warning' && 'dd-text-blood',
                      entry.type === 'narrative' && 'text-dd-gold/75 italic font-light',
                    )}
                  >
                    {entry.type === 'narrative' ? (
                      <>
                        <span className="text-dd-textMuted">✦</span>{' '}
                        {entry.text}
                      </>
                    ) : (
                      <>
                        <span className="text-dd-textMuted">[步{entry.step}]</span>{' '}
                        {entry.text}
                      </>
                    )}
                  </div>
                ))}
                {log.length === 0 && (
                  <div className="text-dd-textMuted text-center py-2">暂无日志</div>
                )}
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* 右侧：队伍 + 补给品                                   */}
          {/* ==================================================== */}
          <div className="space-y-3">
            {/* 队伍状态 */}
            <div className="dd-panel">
              <div className="dd-panel-header">队伍状态</div>
              <div className="p-2 space-y-2">
                {partyHeroes.map((hero) => {
                  const hpPercent = (hero.currentHp / hero.maxHp) * 100;
                  const hpFillClass = hpPercent > 50 ? 'dd-hp-high' : hpPercent > 25 ? 'dd-hp-mid' : 'dd-hp-low';
                  return (
                    <div
                      key={hero.uid}
                      className="p-2 bg-dd-surface2 border border-dd-border"
                      style={{ borderRadius: '2px' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx('font-dd text-xs tracking-wide', `class-${hero.classId}`)}>
                          {getHeroName(hero.classId)}
                        </span>
                        <span className="text-dd-textMuted text-xs">{hero.name}</span>
                      </div>
                      <div className="flex justify-between text-xs text-dd-textMuted mb-0.5">
                        <span>生命</span>
                        <span className="font-mono">{hero.currentHp}/{hero.maxHp}</span>
                      </div>
                      <div className="dd-bar mb-1" style={{ height: '6px' }}>
                        <div
                          className={clsx('dd-bar-fill', hpFillClass)}
                          style={{ width: `${hpPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-dd-textMuted mb-0.5">
                        <span>压力</span>
                        <span className="font-mono">{hero.stress}</span>
                      </div>
                      <div className="dd-bar" style={{ height: '5px' }}>
                        <div
                          className="dd-bar-fill dd-stress-fill"
                          style={{ width: `${Math.min(100, hero.stress)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {partyHeroes.length === 0 && (
                  <div className="text-center text-dd-textMuted text-xs py-4">无队伍成员</div>
                )}
              </div>
            </div>

            {/* 补给品栏 */}
            <div className="dd-panel">
              <div className="dd-panel-header">补给品</div>
              <div className="p-2">
                <div className="flex flex-wrap gap-2">
                  {provisions.filter((p) => p.count > 0).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => useProvision(item.id)}
                      title={item.description}
                      className="dd-tag cursor-pointer hover:border-dd-gold hover:text-dd-textBright transition-all"
                    >
                      <span className="mr-1">{provisionIcons[item.id] || '·'}</span>
                      {item.name}
                      <span className="text-dd-gold font-mono ml-1">×{item.count}</span>
                    </button>
                  ))}
                  {provisions.filter((p) => p.count > 0).length === 0 && (
                    <div className="w-full text-center text-dd-textMuted text-xs py-4">
                      无补给品
                    </div>
                  )}
                </div>
                {/* 快速使用火把按钮 */}
                <div className="mt-2 pt-2 border-t border-dd-border">
                  <button
                    onClick={useTorch}
                    disabled={!provisions.find((p) => p.type === 'torch' && p.count > 0)}
                    className={clsx(
                      'w-full p-2 border text-sm font-dd tracking-wide transition-all',
                      provisions.find((p) => p.type === 'torch' && p.count > 0)
                        ? 'dd-btn'
                        : 'border-dd-border bg-dd-bg text-dd-textMuted cursor-not-allowed opacity-50'
                    )}
                  >
                    <span className="mr-1">▲</span> 点燃火把 (+25亮度)
                  </button>
                </div>
              </div>
            </div>

            {/* 返回城镇（任务完成时） */}
            {questComplete && (
              <div className="dd-panel p-3 text-center dd-anim-victory">
                <div className="dd-text-gold font-dd text-base mb-1 tracking-wide dd-anim-flicker">
                  任务完成!
                </div>
                {activeQuest && (
                  <div className="text-xs text-dd-textMuted mb-3">
                    奖励: {activeQuest.rewardGold} 金币
                    {activeQuest.rewardHeirlooms.length > 0 && (
                      <span>
                        {'、'}
                        {activeQuest.rewardHeirlooms.map((h, i) => (
                          <span key={i}>
                            {i > 0 && '、'}
                            {h.amount} {heirloomNames[h.type] || h.type}
                          </span>
                        ))}
                      </span>
                    )}
                    {activeQuest.rewardTrinket && '、额外饰品'}
                  </div>
                )}
                <button onClick={leaveDungeon} className="dd-btn-primary w-full">
                  返回城镇（领取奖励）
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* 底部：撤退按钮                                        */}
        {/* ==================================================== */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => {
              if (confirm('确定要撤退吗？队伍将受到压力惩罚并丢失部分补给品。')) {
                retreat();
              }
            }}
            className="dd-btn-danger"
          >
            撤退回镇
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 弹窗：好奇物交互                                         */}
      {/* ======================================================== */}
      {currentCurioId && !curioResult && (
        <CurioInteractionPanel
          curioId={currentCurioId}
          provisions={provisions}
          selectedProvision={selectedCurioProvision}
          onSelectProvision={setSelectedCurioProvision}
          onInvestigate={(prov) => {
            investigateCurio(currentCurioId, prov);
            setSelectedCurioProvision(undefined);
          }}
          onSkip={() => {
            investigateCurio(currentCurioId, undefined);
            setSelectedCurioProvision(undefined);
          }}
        />
      )}

      {/* 弹窗：好奇物结果 */}
      {curioResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="dd-panel max-w-md w-full dd-anim-victory">
            <div className="dd-panel-header">
              {curioResult.success ? '调查成功' : '调查结果'}
            </div>
            <div className="p-4 space-y-3">
              <p className="text-dd-text text-sm">{curioResult.rewardText}</p>
              {curioResult.rewards.length > 0 && (
                <div className="p-2 bg-dd-surface2 border border-dd-gold" style={{ borderRadius: '2px' }}>
                  <div className="text-xs text-dd-textMuted mb-1 font-dd tracking-wide">获得</div>
                  <div className="dd-text-gold text-sm">{lootToString(curioResult.rewards)}</div>
                </div>
              )}
              {curioResult.penaltyText && (
                <div className="p-2 bg-dd-blood/30 border border-dd-red" style={{ borderRadius: '2px' }}>
                  <div className="text-xs dd-text-blood">{curioResult.penaltyText}</div>
                </div>
              )}
              <button onClick={dismissCurioResult} className="dd-btn w-full">
                继续
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗：宝箱战利品 */}
      {roomLoot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="dd-panel max-w-md w-full dd-anim-victory">
            <div className="dd-panel-header">
              <span className="mr-1">◆</span> 发现宝箱
            </div>
            <div className="p-4 space-y-3">
              <p className="text-dd-text text-sm">宝箱中装着以下物品：</p>
              <div className="p-3 bg-dd-surface2 border border-dd-gold shadow-dd-gold dd-anim-reward" style={{ borderRadius: '2px' }}>
                <div className="dd-text-gold text-sm">{lootToString(roomLoot)}</div>
              </div>
              <button onClick={collectLoot} className="dd-btn-primary w-full">
                收取战利品
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 营地界面 */}
      {showCamp && <CampScreen />}
    </div>
  );
}

// ============================================================
// 地图视图组件 — 锐角方块 + SVG走廊连线
// ============================================================

function MapView({
  dungeon,
  movableRoomIds,
  onMoveToRoom,
}: {
  dungeon: NonNullable<ReturnType<typeof useDungeonStore.getState>['dungeon']>;
  movableRoomIds: string[];
  onMoveToRoom: (roomId: string) => void;
}) {
  const maxX = Math.max(...dungeon.rooms.map((r) => r.x));
  const maxY = Math.max(...dungeon.rooms.map((r) => r.y));

  const cellSize = 76;
  const roomSize = 50;
  const padding = 18;
  const svgWidth = (maxX + 1) * cellSize + padding * 2;
  const svgHeight = (maxY + 1) * cellSize + padding * 2;

  const getRoomCenter = (x: number, y: number) => ({
    x: padding + x * cellSize + cellSize / 2,
    y: padding + y * cellSize + cellSize / 2,
  });

  return (
    <div className="dd-panel">
      <div className="dd-panel-header">地牢地图</div>
      <div className="p-4 overflow-x-auto">
        <div
          className="relative mx-auto"
          style={{ width: svgWidth, height: svgHeight, minWidth: svgWidth }}
        >
          {/* SVG走廊连线 */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={svgWidth}
            height={svgHeight}
          >
            {dungeon.corridors.map((corridor) => {
              const fromRoom = dungeon.rooms.find((r) => r.id === corridor.fromRoom);
              const toRoom = dungeon.rooms.find((r) => r.id === corridor.toRoom);
              if (!fromRoom || !toRoom) return null;
              const from = getRoomCenter(fromRoom.x, fromRoom.y);
              const to = getRoomCenter(toRoom.x, toRoom.y);
              const isExplored = corridor.state === 'explored' || corridor.state === 'cleared';
              const isCurrent = dungeon.currentCorridorId === corridor.id;
              return (
                <line
                  key={corridor.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isCurrent ? '#e8c050' : isExplored ? 'rgba(200,160,48,0.5)' : '#4a3a28'}
                  strokeWidth={isCurrent ? 3 : 2}
                  strokeDasharray={isExplored || isCurrent ? 'none' : '5 4'}
                  opacity={isExplored || isCurrent ? 1 : 0.7}
                />
              );
            })}
          </svg>

          {/* 房间节点 */}
          {dungeon.rooms.map((room) => {
            const center = getRoomCenter(room.x, room.y);
            const isCurrent = room.id === dungeon.currentRoomId;
            const isMovable = movableRoomIds.includes(room.id);
            const isExplored =
              room.state === 'explored' || room.state === 'cleared' || room.state === 'current';
            const isCleared = room.state === 'cleared';

            const posStyle: CSSProperties = {
              left: center.x - roomSize / 2,
              top: center.y - roomSize / 2,
              width: roomSize,
              height: roomSize,
            };

            return (
              <button
                key={room.id}
                onClick={() => isMovable && onMoveToRoom(room.id)}
                disabled={!isMovable}
                className={clsx(
                  'absolute flex flex-col items-center justify-center transition-all border',
                  isCurrent
                    ? 'bg-dd-surface2 border-dd-gold shadow-dd-gold dd-anim-turn'
                    : isExplored
                      ? 'bg-dd-surface border-dd-borderLight'
                      : 'bg-dd-void border-dd-border',
                  isMovable &&
                    !isCurrent &&
                    'border-dd-gold/50 hover:border-dd-gold hover:shadow-dd-gold cursor-pointer',
                )}
                style={posStyle}
              >
                <span
                  className={clsx(
                    'font-dd text-base leading-none',
                    isCurrent
                      ? 'text-dd-goldBright'
                      : isExplored
                        ? 'text-dd-text'
                        : 'text-dd-textDim',
                    room.type === 'boss' && isExplored && 'dd-text-blood',
                    room.type === 'treasure' && isExplored && 'dd-text-gold',
                    room.type === 'battle' && isExplored && 'text-dd-redBright',
                    room.type === 'curio' && isExplored && 'dd-text-gold',
                  )}
                >
                  {isExplored ? roomTypeIcon[room.type] : '?'}
                </span>
                {isExplored && (
                  <span className="text-[9px] text-dd-textMuted mt-0.5 leading-none">
                    {roomTypeLabel[room.type]}
                  </span>
                )}
                {isCleared && (
                  <span
                    className="absolute -top-1 -right-1 text-xs text-dd-greenBright font-bold"
                    style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                  >
                    ✓
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2 -right-2 text-[10px] text-dd-goldBright dd-anim-flicker leading-none">
                    ✦
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 可移动房间列表 */}
        {movableRoomIds.length > 0 && (
          <div className="mt-3 p-2 bg-dd-surface2 border border-dd-border" style={{ borderRadius: '2px' }}>
            <div className="text-xs text-dd-textMuted mb-2 font-dd tracking-wide">可前往的房间</div>
            <div className="flex flex-wrap gap-2">
              {movableRoomIds.map((rid) => {
                const room = dungeon.rooms.find((r) => r.id === rid);
                if (!room) return null;
                const isExplored = room.state === 'explored' || room.state === 'cleared';
                return (
                  <button
                    key={rid}
                    onClick={() => onMoveToRoom(rid)}
                    className="dd-btn text-xs"
                  >
                    <span className="mr-1">{isExplored ? roomTypeIcon[room.type] : '?'}</span>
                    {isExplored ? roomTypeLabel[room.type] : '未探索'} ({room.x},{room.y})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 图例 */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-dd-textMuted">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 border-2 border-dd-gold"
              style={{ background: '#3a2f22', borderRadius: '1px' }}
            />
            当前位置
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 border border-dd-borderLight"
              style={{ background: '#241d16', borderRadius: '1px' }}
            />
            已探索
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 border border-dashed border-dd-textDim"
              style={{ background: '#0a0705', borderRadius: '1px' }}
            />
            未探索
          </span>
          <span className="flex items-center gap-1">
            <span className="text-dd-greenBright">✓</span> 已清除
          </span>
          <span className="flex items-center gap-1">
            <span className="text-dd-red">⚔</span> 战斗
          </span>
          <span className="flex items-center gap-1">
            <span className="text-dd-gold">◆</span> 宝箱
          </span>
          <span className="flex items-center gap-1">
            <span className="text-dd-gold">✦</span> 好奇物
          </span>
          <span className="flex items-center gap-1">
            <span className="text-dd-gold">☩</span> 营地
          </span>
          <span className="flex items-center gap-1">
            <span className="dd-text-blood">☠</span> BOSS
          </span>
          <span className="flex items-center gap-1">
            <span className="text-dd-text">⚑</span> 入口
          </span>
          <span className="flex items-center gap-1">
            <span className="text-dd-text">⛨</span> 出口
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 走廊视图组件 — 横向进度条 + 遭遇图标
// ============================================================

function CorridorView({
  dungeon,
  corridor,
  onForward,
  onRetreat,
}: {
  dungeon: NonNullable<ReturnType<typeof useDungeonStore.getState>['dungeon']>;
  corridor: NonNullable<ReturnType<typeof useDungeonStore.getState>['dungeon']>['corridors'][number];
  onForward: () => void;
  onRetreat: () => void;
}) {
  const progress = dungeon.corridorPosition;
  const total = corridor.length;

  return (
    <div className="dd-panel">
      <div className="dd-panel-header">走廊探索</div>
      <div className="p-4 space-y-4">
        {/* 进度条 */}
        <div>
          <div className="flex justify-between text-xs text-dd-textMuted mb-2 font-dd tracking-wide">
            <span>起点</span>
            <span>进度 {progress} / {total}</span>
            <span>终点</span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: total }).map((_, i) => {
              const encounter = corridor.encounters[i];
              const isPassed = i < progress;
              const isCurrent = i === progress - 1;
              return (
                <div
                  key={i}
                  className={clsx(
                    'flex-1 h-12 border-2 flex items-center justify-center text-sm font-dd transition-all',
                    isPassed && 'border-dd-border bg-dd-surface2 opacity-60',
                    isCurrent && 'border-dd-gold bg-dd-surface2 dd-anim-turn',
                    !isPassed && !isCurrent && 'border-dd-border bg-dd-void',
                  )}
                >
                  {isPassed ? (
                    <span
                      className={clsx(
                        encounter?.type === 'battle' && 'dd-text-blood',
                        encounter?.type === 'curio' && 'dd-text-gold',
                        encounter?.type === 'trap' && 'text-dd-torch',
                      )}
                    >
                      {encounter?.type === 'battle'
                        ? '⚔'
                        : encounter?.type === 'curio'
                          ? '✦'
                          : encounter?.type === 'trap'
                            ? '!'
                            : '·'}
                    </span>
                  ) : (
                    <span className="text-dd-textDim">?</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 遭遇类型说明 */}
        <div className="flex flex-wrap gap-3 text-xs text-dd-textMuted">
          <span><span className="dd-text-blood mr-1">⚔</span> 战斗</span>
          <span><span className="dd-text-gold mr-1">✦</span> 好奇物</span>
          <span><span className="text-dd-torch mr-1">!</span> 陷阱</span>
          <span><span className="text-dd-textDim mr-1">·</span> 安全</span>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button onClick={onForward} className="dd-btn flex-1">
            前进
          </button>
          <button onClick={onRetreat} className="dd-btn flex-1">
            后退
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 好奇物交互面板
// ============================================================

function CurioInteractionPanel({
  curioId,
  provisions,
  selectedProvision,
  onSelectProvision,
  onInvestigate,
  onSkip,
}: {
  curioId: string;
  provisions: { id: string; name: string; type: string; count: number }[];
  selectedProvision: string | undefined;
  onSelectProvision: (prov: string | undefined) => void;
  onInvestigate: (prov?: string) => void;
  onSkip: () => void;
}) {
  const curio = getCurioDefinition(curioId);
  if (!curio) return null;

  // 获取可用的交互选项
  const availableProvisions = curio.interactions
    .filter((i) => i.provision)
    .map((i) => i.provision!)
    .filter((provId) => provisions.find((p) => p.id === provId && p.count > 0));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="dd-panel max-w-md w-full dd-anim-victory">
        <div className="dd-panel-header">
          <span className="mr-1">✦</span> {curio.name}
        </div>
        <div className="p-4 space-y-3">
          <p className="text-dd-textMuted text-sm italic">{curio.description}</p>

          {/* 交互选项 */}
          {availableProvisions.length > 0 && (
            <div>
              <div className="text-xs text-dd-textMuted mb-2 font-dd tracking-wide">使用补给品</div>
              <div className="space-y-2">
                {availableProvisions.map((provId) => {
                  const item = provisions.find((p) => p.id === provId)!;
                  const isSelected = selectedProvision === provId;
                  return (
                    <button
                      key={provId}
                      onClick={() => onSelectProvision(isSelected ? undefined : provId)}
                      className={clsx(
                        'dd-btn w-full justify-between',
                        isSelected ? 'border-dd-gold text-dd-goldBright' : 'text-dd-text'
                      )}
                    >
                      <span>
                        <span className="mr-1">{provisionIcons[provId] || '·'}</span>
                        {provisionNameMap[provId] || item.name}
                      </span>
                      <span className="text-dd-gold font-mono text-xs">×{item.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-2 pt-2">
            {selectedProvision && (
              <button
                onClick={() => onInvestigate(selectedProvision)}
                className="dd-btn-primary w-full"
              >
                使用 {provisionNameMap[selectedProvision] || selectedProvision} 调查
              </button>
            )}
            <button
              onClick={() => onInvestigate(undefined)}
              className={clsx(
                'w-full p-2 border font-dd text-sm tracking-wide transition-all',
                selectedProvision
                  ? 'border-dd-border bg-dd-surface text-dd-textMuted cursor-pointer'
                  : 'dd-btn w-full'
              )}
            >
              徒手调查
            </button>
            <button onClick={onSkip} className="dd-btn-danger w-full">
              离开
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
