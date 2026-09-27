// ============================================================
// 任务公告板组件 — 显示可用任务、当前任务及刷新操作
// ============================================================

import { useState, useMemo } from 'react';
import { useQuestStore } from '@/stores/questStore';
import { useGameStore } from '@/stores/gameStore';
import type { Quest, QuestDifficulty } from '@/types';
import { QuestAcceptDialog } from '@/dialogs/QuestAcceptDialog';
import {
  QUEST_CONFIG,
  DIFFICULTY_CONFIG,
  getQuestTypeName,
  getDifficultyName,
  getHeirloomName,
} from '@/gateway/questGenerator';
import clsx from 'clsx';

// 任务类型图标（Unicode符号，非emoji）
function questIcon(type: Quest['type']): string {
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

// 难度颜色 — 新手灰 / 老手金 / 冠军血红
function diffColor(diff: QuestDifficulty): string {
  switch (diff) {
    case 'novice': return 'text-dd-textMuted';
    case 'veteran': return 'text-dd-gold';
    case 'champion': return 'text-dd-redBright';
    default: return 'text-dd-text';
  }
}

// 难度边框颜色（暗色调）
function diffBorder(diff: QuestDifficulty): string {
  switch (diff) {
    case 'novice': return 'border-dd-border';
    case 'veteran': return 'border-dd-borderGold';
    case 'champion': return 'border-dd-red';
    default: return 'border-dd-border';
  }
}

// 传家宝中文名（与 questStore 保持一致）
function heirloomName(type: string): string {
  return getHeirloomName(type);
}

// 单个任务卡片
function QuestCard({
  quest,
  onAccept,
  disabled,
}: {
  quest: Quest;
  onAccept: () => void;
  disabled?: boolean;
}) {
  const config = QUEST_CONFIG[quest.type];
  const progressPercent = quest.goal.targetCount > 0
    ? Math.min(100, (quest.goal.currentCount / quest.goal.targetCount) * 100)
    : 0;

  return (
    <div
      className={clsx(
        'dd-panel p-4 transition-all',
        diffBorder(quest.difficulty),
        disabled ? 'opacity-70' : 'hover:border-dd-borderLight'
      )}
    >
      {/* 头部：图标 + 类型 + 难度 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={clsx('text-xl leading-none', diffColor(quest.difficulty))}>
            {questIcon(quest.type)}
          </span>
          <div>
            <div className="font-dd text-sm text-dd-gold">
              {getQuestTypeName(quest.type)}
            </div>
            <div className={clsx('text-xs font-dd', diffColor(quest.difficulty))}>
              {getDifficultyName(quest.difficulty)} · 等级 {quest.dungeonLevel}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="dd-tag">第 {quest.week} 周</span>
        </div>
      </div>

      {/* 任务描述 */}
      <p className="text-xs text-dd-textMuted mb-2 italic">
        {config.description}
      </p>

      {/* 任务目标 */}
      <div className="p-2 rounded-sm bg-dd-bg border border-dd-border mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-dd-textMuted uppercase tracking-wide">任务目标</span>
          <span className="text-xs text-dd-text">
            {quest.goal.currentCount} / {quest.goal.targetCount}
          </span>
        </div>
        <div className="text-sm text-dd-textBright">{quest.goal.description}</div>
        {(quest.isCompleted || quest.goal.currentCount > 0) && (
          <div className="mt-2 dd-bar">
            <div
              className={clsx('dd-bar-fill', quest.isCompleted ? 'dd-hp-high' : 'dd-hp-mid')}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* 奖励预览 — dd-tag 金色数值 */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        <span className="dd-tag">
          金币 <span className="text-dd-gold font-mono">{quest.rewardGold} g</span>
        </span>
        <span className="dd-tag">
          纹章{' '}
          <span className="text-dd-gold">
            {quest.rewardHeirlooms.map((h, i) => (
              <span key={i}>
                {i > 0 && '、'}
                {h.amount} {heirloomName(h.type)}
              </span>
            ))}
          </span>
        </span>
        {quest.rewardTrinket && (
          <span className="dd-tag dd-tag-positive">✦ 额外饰品</span>
        )}
      </div>

      {/* 补给品上限 */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="text-dd-textMuted">
          补给上限: <span className="text-dd-text">{quest.provisionLimit}</span>
        </span>
      </div>

      {/* 接受按钮 */}
      {disabled ? (
        <div className="text-center">
          <span className="dd-tag">进行中</span>
          <div className="text-xs text-dd-textMuted mt-1.5">
            已有任务进行中，无法接受新任务
          </div>
        </div>
      ) : (
        <button
          onClick={onAccept}
          className="dd-btn-primary w-full"
        >
          接受任务
        </button>
      )}
    </div>
  );
}

// 当前进行中的任务卡片
function ActiveQuestCard({
  quest,
  onGoToDungeon,
  onAbandon,
}: {
  quest: Quest;
  onGoToDungeon: () => void;
  onAbandon: () => void;
}) {
  const progressPercent = quest.goal.targetCount > 0
    ? Math.min(100, (quest.goal.currentCount / quest.goal.targetCount) * 100)
    : 0;

  return (
    <div className="dd-panel border-dd-gold shadow-dd-gold">
      <div className="dd-panel-header flex items-center justify-between">
        <span>当前任务</span>
        <span className={clsx('text-xs normal-case', diffColor(quest.difficulty))}>
          {getDifficultyName(quest.difficulty)} · 等级 {quest.dungeonLevel}
        </span>
      </div>
      <div className="p-4">
        {/* 任务头部 */}
        <div className="flex items-center gap-3 mb-3">
          <span className={clsx('text-3xl leading-none', diffColor(quest.difficulty))}>
            {questIcon(quest.type)}
          </span>
          <div className="flex-1">
            <div className="font-dd text-base text-dd-gold">
              {getQuestTypeName(quest.type)}
            </div>
            <div className="text-xs text-dd-textMuted">
              {QUEST_CONFIG[quest.type].description}
            </div>
          </div>
          {quest.isCompleted && (
            <span className="dd-tag dd-tag-positive">已完成</span>
          )}
        </div>

        {/* 任务目标与进度 */}
        <div className="p-3 rounded-sm bg-dd-surface2 border border-dd-border mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dd-textMuted uppercase tracking-wide">任务目标</span>
            <span className="text-sm text-dd-text">
              {quest.goal.currentCount} / {quest.goal.targetCount}
            </span>
          </div>
          <div className="text-sm text-dd-textBright mb-2">{quest.goal.description}</div>
          {/* 进度条 */}
          <div className="dd-bar">
            <div
              className={clsx(
                'dd-bar-fill transition-all duration-300',
                quest.isCompleted ? 'dd-hp-high' : 'dd-hp-mid'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 奖励预览 */}
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          <span className="dd-tag">
            金币 <span className="text-dd-gold font-mono">{quest.rewardGold}</span>
          </span>
          <span className="dd-tag">
            纹章{' '}
            <span className="text-dd-gold">
              {quest.rewardHeirlooms.reduce((sum, h) => sum + h.amount, 0)}
            </span>
          </span>
          <span className="dd-tag">
            饰品{' '}
            <span className={quest.rewardTrinket ? 'text-dd-gold' : 'text-dd-textMuted'}>
              {quest.rewardTrinket ? '✦ 有' : '无'}
            </span>
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={onGoToDungeon}
            className="dd-btn-primary flex-1"
          >
            前往地牢 →
          </button>
          <button
            onClick={onAbandon}
            className="dd-btn-danger"
          >
            放弃任务
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuestBoard() {
  const availableQuests = useQuestStore((s) => s.availableQuests);
  const activeQuest = useQuestStore((s) => s.activeQuest);
  const lastRefreshWeek = useQuestStore((s) => s.lastRefreshWeek);
  const rewardLog = useQuestStore((s) => s.rewardLog);
  const refreshQuests = useQuestStore((s) => s.refreshQuests);
  const acceptQuest = useQuestStore((s) => s.acceptQuest);
  const abandonQuest = useQuestStore((s) => s.abandonQuest);
  const clearRewardLog = useQuestStore((s) => s.clearRewardLog);

  const quests = availableQuests;

  const week = useGameStore((s) => s.week);
  const highestDungeonLevel = useGameStore((s) => s.highestDungeonLevel);
  const questsFinished = useGameStore((s) => s.questsFinished);
  const setPhase = useGameStore((s) => s.setPhase);

  // 难度筛选
  const [filterDifficulty, setFilterDifficulty] = useState<QuestDifficulty | 'all'>('all');

  // 筛选后的任务
  const filteredQuests = useMemo(() => {
    if (filterDifficulty === 'all') return availableQuests;
    return availableQuests.filter((q) => q.difficulty === filterDifficulty);
  }, [availableQuests, filterDifficulty]);

  // 刷新任务
  const handleRefresh = () => {
    if (activeQuest) {
      if (!confirm('你有一个进行中的任务，刷新任务列表不会影响它。确定要刷新吗？（将消耗1周）')) {
        return;
      }
    } else {
      if (!confirm('刷新任务列表将消耗1周时间。确定要继续吗？')) {
        return;
      }
    }
    refreshQuests(week, highestDungeonLevel, questsFinished);
  };

  // 接受任务
  const [pendingQuest, setPendingQuest] = useState<Quest | null>(null);
  const handleAccept = (questId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (quest) setPendingQuest(quest);
  };
  const confirmAccept = () => {
    if (pendingQuest) {
      acceptQuest(pendingQuest.id);
      setPendingQuest(null);
    }
  };

  // 前往地牢
  const handleGoToDungeon = () => {
    setPhase('dungeon_dispatch');
  };

  // 放弃任务
  const handleAbandon = () => {
    if (confirm('确定要放弃当前任务吗？已完成的进度将丢失。')) {
      abandonQuest();
    }
  };

  // 返回城镇
  const handleBack = () => {
    setPhase('town');
  };

  return (
    <div className="min-h-screen bg-dd-bg p-4 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* 标题 */}
        <header className="mb-4 text-center">
          <h1 className="dd-title text-2xl text-dd-gold tracking-widest mb-1">
            任务公告板
          </h1>
          <p className="text-dd-textMuted text-sm">
            查看并接取任务，完成任务可获得金币、纹章与饰品奖励
          </p>
        </header>

        {/* 奖励日志提示 */}
        {rewardLog.length > 0 && (
          <div className="mb-4 dd-panel border-dd-gold">
            <div className="dd-panel-header flex items-center justify-between">
              <span>任务结算</span>
              <button
                onClick={clearRewardLog}
                className="text-xs text-dd-textMuted hover:text-dd-gold normal-case"
              >
                关闭
              </button>
            </div>
            <div className="p-3 space-y-1">
              {rewardLog.map((log, i) => (
                <div key={i} className="text-sm text-dd-gold">{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* 当前进行中的任务 */}
        {activeQuest && (
          <div className="mb-4">
            <ActiveQuestCard
              quest={activeQuest}
              onGoToDungeon={handleGoToDungeon}
              onAbandon={handleAbandon}
            />
          </div>
        )}

        {/* 操作栏 */}
        <div className="dd-panel p-3 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-dd-textMuted">第 </span>
                <span className="font-dd text-dd-gold text-base">{week}</span>
                <span className="text-dd-textMuted"> 周</span>
              </div>
              <div className="h-6 w-px bg-dd-border" />
              <div>
                <span className="text-dd-textMuted">已完成任务: </span>
                <span className="text-dd-text">{questsFinished}</span>
              </div>
              <div className="h-6 w-px bg-dd-border" />
              <div>
                <span className="text-dd-textMuted">最高地牢等级: </span>
                <span className="text-dd-text">{highestDungeonLevel}</span>
              </div>
              {lastRefreshWeek > 0 && (
                <>
                  <div className="h-6 w-px bg-dd-border" />
                  <div>
                    <span className="text-dd-textMuted">上次刷新: 第 </span>
                    <span className="text-dd-text">{lastRefreshWeek}</span>
                    <span className="text-dd-textMuted"> 周</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={handleBack} className="dd-btn text-xs">
                ← 返回城镇
              </button>
              <button
                onClick={handleRefresh}
                className="dd-btn text-xs"
              >
                刷新任务（消耗1周）
              </button>
            </div>
          </div>
        </div>

        {/* 难度筛选 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-dd-textMuted uppercase tracking-wide">难度筛选:</span>
          <button
            onClick={() => setFilterDifficulty('all')}
            className={clsx(
              'px-3 py-1 rounded-sm border text-xs transition-all',
              filterDifficulty === 'all'
                ? 'border-dd-gold bg-dd-surface2 text-dd-gold'
                : 'border-dd-border bg-dd-surface text-dd-textMuted hover:text-dd-text'
            )}
          >
            全部
          </button>
          {(['novice', 'veteran', 'champion'] as QuestDifficulty[]).map((diff) => {
            const isUnlocked = questsFinished >= DIFFICULTY_CONFIG[diff].unlockRequirement;
            return (
              <button
                key={diff}
                onClick={() => isUnlocked && setFilterDifficulty(diff)}
                disabled={!isUnlocked}
                className={clsx(
                  'px-3 py-1 rounded-sm border text-xs transition-all',
                  !isUnlocked && 'opacity-40 cursor-not-allowed',
                  filterDifficulty === diff
                    ? clsx('bg-dd-surface2', diffBorder(diff), diffColor(diff))
                    : 'border-dd-border bg-dd-surface text-dd-textMuted hover:text-dd-text'
                )}
              >
                {getDifficultyName(diff)}
                {!isUnlocked && ` (需${DIFFICULTY_CONFIG[diff].unlockRequirement}任务)`}
              </button>
            );
          })}
        </div>

        {/* 可用任务列表 */}
        {filteredQuests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onAccept={() => handleAccept(quest.id)}
                disabled={!!activeQuest}
              />
            ))}
          </div>
        ) : (
          <div className="dd-panel p-8 text-center">
            <div className="text-dd-textMuted text-sm mb-2">
              {availableQuests.length === 0
                ? '当前没有可用任务'
                : '该难度下没有可用任务'}
            </div>
            <div className="text-dd-textMuted text-xs">
              点击"刷新任务"获取新任务（将消耗1周）
            </div>
          </div>
        )}

        {/* 任务类型说明 */}
        <div className="mt-4 dd-panel">
          <div className="dd-panel-header">任务类型说明</div>
          <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {(Object.keys(QUEST_CONFIG) as Quest['type'][]).map((type) => {
              const config = QUEST_CONFIG[type];
              return (
                <div key={type} className="p-2 rounded-sm bg-dd-surface2 border border-dd-border">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-dd-gold">{questIcon(type)}</span>
                    <span className="font-dd text-dd-gold">{config.name}</span>
                    <span className="text-dd-textMuted ml-auto">
                      ×{config.rewardMultiplier.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-dd-textMuted">{config.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 难度说明 */}
        <div className="mt-4 dd-panel">
          <div className="dd-panel-header">难度等级说明</div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            {(['novice', 'veteran', 'champion'] as QuestDifficulty[]).map((diff) => {
              const config = DIFFICULTY_CONFIG[diff];
              const isUnlocked = questsFinished >= config.unlockRequirement;
              return (
                <div
                  key={diff}
                  className={clsx(
                    'p-2 rounded-sm bg-dd-surface2 border',
                    diffBorder(diff)
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={clsx('font-dd', diffColor(diff))}>
                      {config.name}
                    </span>
                    <span className="text-dd-textMuted">×{config.rewardMultiplier.toFixed(1)}</span>
                  </div>
                  <div className="text-dd-textMuted mb-1">{config.description}</div>
                  <div className="text-dd-textMuted">
                    地牢等级 {config.dungeonLevel[0]}-{config.dungeonLevel[1]}
                  </div>
                  <div className={isUnlocked ? 'text-dd-greenBright' : 'dd-text-blood'}>
                    {isUnlocked ? '已解锁' : `需完成 ${config.unlockRequirement} 个任务`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <QuestAcceptDialog
        quest={pendingQuest}
        onConfirm={confirmAccept}
        onCancel={() => setPendingQuest(null)}
      />
    </div>
  );
}
