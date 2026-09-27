import { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useDungeonStore } from '@/stores/dungeonStore';
import { useQuestStore } from '@/stores/questStore';
import { getHeroName } from '@/data/ddLoader';
import { defaultProvisions } from '@/gateway/dungeonGenerator';
import {
  getQuestTypeName,
  getDifficultyName,
  getHeirloomName,
} from '@/gateway/questGenerator';
import {
  getUnlockedRegions,
  getRegionEffects,
  getRegionTone,
  type Region,
  type RegionId,
} from '@/gateway/regionSystem';
import type { ProvisionItem, HeroInstance } from '@/types';
import clsx from 'clsx';

// 地牢等级信息
interface LevelInfo {
  level: number;
  name: string;
  desc: string;
  recommendedResolve: number;
}

const levelInfos: LevelInfo[] = [
  { level: 1, name: '新手', desc: '适合0级英雄，敌人较弱', recommendedResolve: 0 },
  { level: 2, name: '初级', desc: '适合1-2级英雄，开始有挑战', recommendedResolve: 1 },
  { level: 3, name: '中级', desc: '适合3级英雄，需要充分准备', recommendedResolve: 3 },
  { level: 4, name: '高级', desc: '适合4级英雄，高风险高回报', recommendedResolve: 4 },
  { level: 5, name: '终极', desc: '适合5级英雄，最危险的挑战', recommendedResolve: 5 },
];

// 任务类型信息
interface QuestTypeInfo {
  value: string;
  label: string;
  desc: string;
}

const questTypes: QuestTypeInfo[] = [
  { value: 'explore', label: '探索', desc: '探索地牢中大部分房间' },
  { value: 'kill_boss', label: '讨伐BOSS', desc: '深入地牢消灭最终BOSS' },
  { value: 'purge', label: '清剿', desc: '清除房间中的所有敌人' },
  { value: 'collect', label: '收集', desc: '收集一定数量的传家宝' },
  { value: 'exit', label: '逃生', desc: '到达地牢出口' },
];

// 任务类型图标（Unicode符号，非emoji）
const questTypeIcons: Record<string, string> = {
  explore: '◈',
  kill_boss: '☠',
  purge: '⚔',
  collect: '◆',
  exit: '⛨',
};

// 任务公告板任务类型图标（QuestType）
const boardQuestTypeIcons: Record<string, string> = {
  explore: '◈',
  exterminate: '⚔',
  purge: '☩',
  collect: '◆',
  boss: '☠',
  escape: '⛨',
};

// 任务难度颜色（暗色调）
function difficultyColorClass(difficulty: string): string {
  switch (difficulty) {
    case 'novice': return 'text-dd-textMuted';
    case 'veteran': return 'text-dd-gold';
    case 'champion': return 'text-dd-redBright';
    default: return 'text-dd-text';
  }
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

// 地牢等级色调 — 1-2级灰 / 3-4级金 / 5级血红
function levelToneClass(level: number): string {
  if (level >= 5) return 'border-dd-red bg-dd-surface text-dd-redBright hover:bg-dd-surface2';
  if (level >= 3) return 'border-dd-borderGold bg-dd-surface text-dd-gold hover:bg-dd-surface2';
  return 'border-dd-border bg-dd-surface text-dd-textMuted hover:bg-dd-surface2';
}

// 推荐补给品数量
const recommendedProvisions: Record<number, Record<string, number>> = {
  1: { torch: 8, food: 6, skeleton_key: 2, shovel: 2, holy_water: 1, medicinal_herbs: 1, bandage: 2, antivenom: 1 },
  2: { torch: 12, food: 8, skeleton_key: 3, shovel: 2, holy_water: 2, medicinal_herbs: 1, bandage: 2, antivenom: 2 },
  3: { torch: 16, food: 12, skeleton_key: 4, shovel: 3, holy_water: 2, medicinal_herbs: 2, bandage: 3, antivenom: 2 },
  4: { torch: 20, food: 16, skeleton_key: 4, shovel: 3, holy_water: 3, medicinal_herbs: 2, bandage: 3, antivenom: 3 },
  5: { torch: 24, food: 20, skeleton_key: 5, shovel: 4, holy_water: 3, medicinal_herbs: 3, bandage: 4, antivenom: 3 },
};

// 英雄卡片
function HeroSelectCard({
  hero,
  selected,
  onClick,
}: {
  hero: HeroInstance;
  selected: boolean;
  onClick: () => void;
}) {
  const hpPercent = (hero.currentHp / hero.maxHp) * 100;
  const hpFillClass = hpPercent > 50 ? 'dd-hp-high' : hpPercent > 25 ? 'dd-hp-mid' : 'dd-hp-low';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left p-3 rounded-sm border transition-all duration-150',
        selected
          ? 'border-dd-gold bg-dd-surface2 shadow-dd-gold'
          : 'border-dd-border bg-dd-surface hover:border-dd-textMuted hover:bg-dd-surface2'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={clsx('font-dd text-sm', `class-${hero.classId}`)}>
          {getHeroName(hero.classId)}
        </span>
        <span className="text-dd-textMuted text-xs">Lv.{hero.resolveLevel}</span>
      </div>
      <div className="text-dd-text text-xs mb-1 truncate">{hero.name}</div>
      <div className="flex justify-between text-xs text-dd-textMuted mb-0.5">
        <span>生命</span>
        <span className="font-mono">{hero.currentHp}/{hero.maxHp}</span>
      </div>
      <div className="dd-bar mb-1" style={{ height: '6px' }}>
        <div className={clsx('dd-bar-fill', hpFillClass)} style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="flex justify-between text-xs text-dd-textMuted">
        <span>压力</span>
        <span className="font-mono">{hero.stress}</span>
      </div>
      <div className="dd-bar mt-0.5" style={{ height: '5px' }}>
        <div className="dd-bar-fill dd-stress-fill" style={{ width: `${Math.min(100, hero.stress)}%` }} />
      </div>
    </button>
  );
}

export default function DungeonDispatch() {
  const roster = useGameStore((s) => s.roster);
  const gold = useGameStore((s) => s.gold);
  const spendGold = useGameStore((s) => s.spendGold);
  const setPhase = useGameStore((s) => s.setPhase);
  const enterDungeon = useDungeonStore((s) => s.enterDungeon);

  // 任务公告板的当前任务
  const activeQuest = useQuestStore((s) => s.activeQuest);

  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedQuest, setSelectedQuest] = useState('explore');
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('ruins');
  const [selectedHeroUids, setSelectedHeroUids] = useState<string[]>([]);
  const [provisionCounts, setProvisionCounts] = useState<Record<string, number>>({});
  const [isDeparting, setIsDeparting] = useState(false);

  // 已解锁区域列表
  const questsFinished = useGameStore((s) => s.questsFinished);
  const regions = useMemo(() => getUnlockedRegions(questsFinished), [questsFinished]);

  // 当前选中区域定义
  const activeRegion: Region | undefined = useMemo(
    () => regions.find((r) => r.id === selectedRegion),
    [regions, selectedRegion]
  );
  const activeRegionEffects = useMemo(
    () => (activeRegion ? getRegionEffects(activeRegion) : []),
    [activeRegion]
  );

  // 当选中区域锁定时，重置为第一个已解锁区域
  const effectiveRegion: Region | undefined = useMemo(() => {
    if (activeRegion?.unlocked) return activeRegion;
    return regions.find((r) => r.unlocked);
  }, [activeRegion, regions]);

  // 初始化补给品数量为0
  const provisions: ProvisionItem[] = useMemo(
    () =>
      defaultProvisions.map((p) => ({
        ...p,
        count: provisionCounts[p.id] || 0,
      })),
    [provisionCounts]
  );

  // 计算总花费
  const totalProvisionCost = useMemo(() => {
    return provisions.reduce((sum, p) => sum + p.price * p.count, 0);
  }, [provisions]);

  // 可用英雄（未锁定、未失踪）
  const availableHeroes = useMemo(
    () => roster.filter((h) => !h.activityLocked && !h.missingUntilWeek && h.currentHp > 0),
    [roster]
  );

  // 已选英雄与推荐等级判定
  const selectedHeroes = availableHeroes.filter((h) => selectedHeroUids.includes(h.uid));
  const selectedMaxResolve = selectedHeroes.reduce((m, h) => Math.max(m, h.resolveLevel), 0);
  const activeLevelInfo = levelInfos[selectedLevel - 1];
  const underRecommended =
    selectedHeroes.length > 0 && selectedMaxResolve < activeLevelInfo.recommendedResolve;

  // 切换英雄选择
  const toggleHero = (uid: string) => {
    setSelectedHeroUids((prev) => {
      if (prev.includes(uid)) {
        return prev.filter((id) => id !== uid);
      }
      if (prev.length >= 4) return prev;
      return [...prev, uid];
    });
  };

  // 调整补给品数量
  const adjustProvision = (id: string, delta: number) => {
    setProvisionCounts((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(99, current + delta));
      return { ...prev, [id]: next };
    });
  };

  // 填充推荐补给品
  const fillRecommended = () => {
    const recommended = recommendedProvisions[selectedLevel] || {};
    setProvisionCounts({ ...recommended });
  };

  // 清空补给品
  const clearProvisions = () => {
    setProvisionCounts({});
  };

  // 出发
  const handleDepart = async () => {
    if (selectedHeroUids.length < 4) return;
    if (totalProvisionCost > gold) return;

    setIsDeparting(true);

    // 扣除金币
    if (totalProvisionCost > 0) {
      spendGold(totalProvisionCost);
    }

    // 过滤出已购买的补给品
    const purchasedProvisions = provisions.filter((p) => p.count > 0);

    // 进入地牢
    await enterDungeon(
      selectedLevel,
      selectedQuest,
      purchasedProvisions,
      selectedHeroUids,
      effectiveRegion?.id
    );
  };

  // 是否可以出发（队伍必须满4人）
  const canDepart =
    selectedHeroUids.length === 4 && totalProvisionCost <= gold && !isDeparting;

  return (
    <div className="min-h-screen bg-dd-bg p-4 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* 标题 */}
        <header className="mb-6 text-center">
          <h1 className="dd-title text-2xl text-dd-gold tracking-widest mb-1">
            出征准备
          </h1>
          <p className="text-dd-textMuted text-sm">
            选择地牢等级、任务类型，购买补给品，组建队伍
          </p>
        </header>

        {/* 当前任务信息（如果有 activeQuest） */}
        {activeQuest && (
          <div className="mb-4 dd-panel border-dd-gold shadow-dd-gold">
            <div className="dd-panel-header flex items-center justify-between">
              <span>当前任务</span>
              <span className="text-xs normal-case text-dd-textMuted">
                出发时将使用任务配置（等级 {activeQuest.dungeonLevel}）
              </span>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl dd-text-gold">{boardQuestTypeIcons[activeQuest.type] || '?'}</span>
                <div className="flex-1">
                  <div className="font-dd text-sm text-dd-gold">
                    {getQuestTypeName(activeQuest.type)}
                    <span className={clsx('ml-2 text-xs', difficultyColorClass(activeQuest.difficulty))}>
                      {getDifficultyName(activeQuest.difficulty)} · 等级 {activeQuest.dungeonLevel}
                    </span>
                  </div>
                  <div className="text-xs text-dd-textMuted">{activeQuest.goal.description}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-dd-textMuted">补给上限</div>
                  <div className="text-dd-text">{activeQuest.provisionLimit}</div>
                </div>
              </div>
              <div className="flex gap-3 text-xs flex-wrap">
                <span className="text-dd-gold font-mono">奖励: {activeQuest.rewardGold} 金币</span>
                <span className="text-dd-text">
                  {activeQuest.rewardHeirlooms.map((h, i) => (
                    <span key={i}>
                      {i > 0 && '、'}
                      {h.amount} {getHeirloomName(h.type)}
                    </span>
                  ))}
                </span>
                {activeQuest.rewardTrinket && (
                  <span className="dd-tag dd-rarity-ancestral">✦ 额外饰品</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 区域选择 */}
        <div className="mb-4 dd-panel">
          <div className="dd-panel-header flex items-center justify-between">
            <span>选择区域</span>
            {activeRegion && (
              <span className="text-xs normal-case text-dd-textMuted">
                已完成任务 {questsFinished} ·
                {activeRegion.unlocked
                  ? '该区域已解锁'
                  : `还需 ${activeRegion.requiredQuest - questsFinished} 个任务解锁`}
              </span>
            )}
          </div>
          <div className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {regions.map((region) => {
                const tone = getRegionTone(region);
                const isSelected = selectedRegion === region.id;
                const selectable = region.unlocked;
                return (
                  <button
                    key={region.id}
                    onClick={() => selectable && setSelectedRegion(region.id)}
                    disabled={!selectable}
                    className={clsx(
                      'relative p-2 border rounded-sm text-left transition-all duration-150',
                      isSelected
                        ? clsx('border-dd-gold bg-dd-surface2 shadow-dd-gold', tone.border)
                        : clsx('border-dd-border bg-dd-surface', tone.border, 'hover:bg-dd-surface2'),
                      !selectable && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {/* 区域图 */}
                    <img
                      src={`/assets/dd/dungeons/${region.id}.png`}
                      alt=""
                      className="w-full h-14 object-cover rounded-sm mb-1.5 border border-dd-border opacity-80"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {/* 区域名 + 锁定标记 */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={clsx('font-dd text-sm', isSelected ? tone.text : 'text-dd-textBright')}>
                        {region.name}
                      </span>
                      {!selectable && (
                        <span className="dd-tag dd-tag-locked text-[10px] leading-none px-1 py-0.5">
                          ☒ 未解锁
                        </span>
                      )}
                    </div>
                    {/* 区域描述 */}
                    <div className="text-[10px] text-dd-textMuted leading-tight mb-1.5">
                      {region.description}
                    </div>
                    {/* 等级范围 */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-dd-textMuted">
                        等级 {region.levelRange[0]}-{region.levelRange[1]}
                      </span>
                      {region.dlc && (
                        <span className={clsx('dd-tag text-[9px] leading-none px-1 py-0.5', tone.tag)}>
                          {region.dlc === 'crimson_court'
                            ? '绯红'
                            : region.dlc === 'farmstead'
                              ? '农场'
                              : region.dlc === 'color_of_madness'
                                ? '疯狂'
                                : '冥河'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* 区域特效提示 */}
            {effectiveRegion && activeRegionEffects.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-dd-textMuted">区域特效:</span>
                {activeRegionEffects.map((eff) => (
                  <span
                    key={eff.id}
                    className={clsx(
                      'dd-tag text-[11px]',
                      eff.tone === 'blood'
                        ? 'dd-tag-negative'
                        : eff.tone === 'gold'
                          ? 'text-dd-gold'
                          : eff.tone === 'purple'
                            ? 'text-dd-purpleBright'
                            : 'dd-tag-negative'
                    )}
                  >
                    {eff.label} · {eff.description}
                  </span>
                ))}
              </div>
            )}
            {/* 区域氛围 */}
            {effectiveRegion && (
              <div className="mt-2 text-[11px] italic text-dd-textMuted normal-case tracking-normal">
                {effectiveRegion.ambient}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 左列：地牢等级 + 任务类型 */}
          <div className="space-y-4">
            {/* 地牢等级选择 */}
            <div className="dd-panel">
              <div className="dd-panel-header">选择地牢等级</div>
              <div className="p-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                {levelInfos.map((info) => {
                  const isSelected = selectedLevel === info.level;
                  return (
                    <button
                      key={info.level}
                      onClick={() => setSelectedLevel(info.level)}
                      className={clsx(
                        'p-2 border rounded-sm text-center transition-all duration-150',
                        isSelected
                          ? 'border-dd-gold bg-dd-surface2 shadow-dd-gold'
                          : levelToneClass(info.level)
                      )}
                    >
                      <div className={clsx('font-dd text-lg leading-none', isSelected && 'text-dd-goldBright')}>
                        等级{info.level}
                      </div>
                      <div className={clsx('text-xs mt-1', isSelected ? 'text-dd-goldBright' : 'text-dd-textMuted')}>
                        {info.name}
                      </div>
                      <div className="text-[10px] text-dd-textMuted mt-0.5">
                        推荐 Lv.{info.recommendedResolve}+
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* 未达推荐等级警示 */}
              {underRecommended && (
                <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
                  <span className="dd-tag dd-tag-negative">警示</span>
                  <span className="text-xs dd-text-blood">
                    队伍最高等级 Lv.{selectedMaxResolve}，低于推荐 Lv.{activeLevelInfo.recommendedResolve}，风险极高
                  </span>
                </div>
              )}
            </div>

            {/* 任务类型选择 */}
            <div className="dd-panel">
              <div className="dd-panel-header">选择任务类型</div>
              <div className="p-3 grid grid-cols-1 gap-2">
                {questTypes.map((qt) => {
                  const isSelected = selectedQuest === qt.value;
                  return (
                    <button
                      key={qt.value}
                      onClick={() => setSelectedQuest(qt.value)}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 border rounded-sm text-left transition-all duration-150',
                        isSelected
                          ? 'border-dd-gold bg-dd-surface2 shadow-dd-gold'
                          : 'border-dd-border bg-dd-surface hover:border-dd-borderLight hover:bg-dd-surface2'
                      )}
                    >
                      <span className={clsx('text-base w-5 text-center leading-none', isSelected ? 'text-dd-goldBright' : 'text-dd-textMuted')}>
                        {questTypeIcons[qt.value] || '·'}
                      </span>
                      <span className={clsx('font-dd text-sm', isSelected ? 'text-dd-goldBright' : 'text-dd-text')}>
                        {qt.label}
                      </span>
                      <span className="text-xs text-dd-textMuted ml-auto">{qt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 右列：补给品 + 队伍 */}
          <div className="space-y-4">
            {/* 补给品购买 */}
            <div className="dd-panel">
              <div className="dd-panel-header flex items-center justify-between">
                <span>补给品</span>
                <div className="flex gap-2 normal-case">
                  <button
                    onClick={fillRecommended}
                    className="text-xs px-2 py-0.5 rounded-sm border border-dd-gold text-dd-gold hover:bg-dd-surface2"
                  >
                    推荐配置
                  </button>
                  <button
                    onClick={clearProvisions}
                    className="text-xs px-2 py-0.5 rounded-sm border border-dd-border text-dd-textMuted hover:bg-dd-surface2"
                  >
                    清空
                  </button>
                </div>
              </div>
              <div className="p-3 space-y-2">
                {provisions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-sm border border-dd-border bg-dd-surface"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-dd-gold w-5 text-center">{provisionIcons[item.id] || '·'}</span>
                      <div className="min-w-0">
                        <div className="text-sm text-dd-text">{item.name}</div>
                        <div className="text-xs text-dd-textMuted truncate">{item.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-dd-gold font-mono">{item.price}g</span>
                      <button
                        onClick={() => adjustProvision(item.id, -1)}
                        disabled={item.count <= 0}
                        className="w-7 h-7 rounded-sm border border-dd-border bg-dd-surface2 text-dd-text hover:border-dd-gold disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm text-dd-text font-mono">
                        {item.count}
                      </span>
                      <button
                        onClick={() => adjustProvision(item.id, 1)}
                        className="w-7 h-7 rounded-sm border border-dd-border bg-dd-surface2 text-dd-text hover:border-dd-gold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* 总花费 */}
              <div className="p-3 border-t border-dd-border flex items-center justify-between">
                <span className="text-xs text-dd-textMuted">补给品总花费</span>
                <span className={clsx(
                  'font-mono text-sm font-bold',
                  totalProvisionCost > gold ? 'text-dd-redBright' : 'text-dd-gold'
                )}>
                  {totalProvisionCost} 金币
                </span>
              </div>
            </div>

            {/* 队伍选择 */}
            <div className="dd-panel">
              <div className="dd-panel-header flex items-center justify-between">
                <span>选择队伍</span>
                <span className="text-dd-textMuted text-xs normal-case">
                  已选 {selectedHeroUids.length} / 4
                </span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
                {availableHeroes.map((hero) => (
                  <HeroSelectCard
                    key={hero.uid}
                    hero={hero}
                    selected={selectedHeroUids.includes(hero.uid)}
                    onClick={() => toggleHero(hero.uid)}
                  />
                ))}
                {availableHeroes.length === 0 && (
                  <div className="col-span-full text-center py-8 text-dd-textMuted text-sm">
                    无可用英雄
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="mt-4 dd-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-dd-textMuted uppercase tracking-wide">当前金币</div>
                <div className="text-lg font-dd text-dd-gold font-mono">{gold}</div>
              </div>
              <div className="h-8 w-px bg-dd-border" />
              <div>
                <div className="text-xs text-dd-textMuted uppercase tracking-wide">出发后剩余</div>
                <div className={clsx(
                  'text-lg font-dd font-mono',
                  gold - totalProvisionCost < 0 ? 'text-dd-redBright' : 'text-dd-text'
                )}>
                  {gold - totalProvisionCost}
                </div>
              </div>
              <div className="h-8 w-px bg-dd-border" />
              <div>
                <div className="text-xs text-dd-textMuted uppercase tracking-wide">队伍人数</div>
                <div className="text-lg font-dd text-dd-text">{selectedHeroUids.length} / 4</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setPhase('town')}
              className="dd-btn"
            >
              返回城镇
            </button>
            <button
              onClick={handleDepart}
              disabled={!canDepart}
              className="dd-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeparting ? '正在进入地牢...' : '出发探索 →'}
            </button>
          </div>

          {!canDepart && selectedHeroUids.length < 4 && (
            <div className="mt-2 text-center text-xs dd-text-blood">
              队伍不足4人，请选择 {4 - selectedHeroUids.length} 名英雄组成完整队伍
            </div>
          )}
          {!canDepart && totalProvisionCost > gold && (
            <div className="mt-2 text-center text-xs dd-text-blood">
              金币不足，无法购买补给品
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
