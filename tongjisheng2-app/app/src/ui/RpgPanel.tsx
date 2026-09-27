/**
 * RPG 养成面板(阶段3 步骤7)
 *
 * 三个 Tab:
 *  - 技能树:13 项技能可视化,按派系分组,可升级
 *  - 任务追踪:主线/支线/隐藏任务列表,状态机展示
 *  - 装备栏:3 槽位 + 装备列表,可装备/卸下
 *
 * 集成:
 *  - runtime/rpg-engine · RpgEngine
 *  - content/rpg/* 数据
 *  - 与 combat-engine 联动(装备加成影响战斗)
 *  - 与 shop-engine 联动(商店购买装备后可装备)
 *  - 与 achievement-engine 联动(任务完成可触发成就)
 */

import { useCallback, useMemo, useState } from 'react';
import type { MvuRuntime } from '../runtime/mvu-runtime';
import { getRpgEngine, initRpgEngine, type RpgPlayerSummary } from '../runtime/rpg-engine';
import {
  SKILL_FACTIONS,
  SKILL_TREE,
  checkPrerequisites,
  findSkillNode,
  skillValueToLevel,
  type SkillFaction,
  type SkillId,
  type SkillNode,
} from '../content/rpg/skill-tree-data';
import {
  QUESTS,
  listQuestsByType,
  type Quest,
  type QuestStatus,
  type QuestType,
} from '../content/rpg/quest-data';
import {
  EQUIPMENTS,
  findEquipment,
  getRarityInfo,
  getSlotInfo,
  listEquipmentsBySlot,
  mergeEquipmentBonuses,
  type Equipment,
  type EquipmentSlot,
} from '../content/rpg/equipment-data';
import { THEME_VARS } from './types';

// ───────────────────────────────────────────────────────────
//  类型与常量
// ───────────────────────────────────────────────────────────

type PanelTab = 'skills' | 'quests' | 'equipment';

interface RpgPanelProps {
  mvu?: MvuRuntime | null;
  readOnly?: boolean;
}

const TAB_DEFS: Array<{ id: PanelTab; label: string; icon: string }> = [
  { id: 'skills', label: '技能树', icon: '🌳' },
  { id: 'quests', label: '任务追踪', icon: '📋' },
  { id: 'equipment', label: '装备栏', icon: '⚔️' },
];

const QUEST_TYPE_INFO: Record<QuestType, { label: string; icon: string; color: string }> = {
  main: { label: '主线', icon: '⭐', color: THEME_VARS.warning },
  side: { label: '支线', icon: '🔹', color: THEME_VARS.info },
  hidden: { label: '隐藏', icon: '🔒', color: THEME_VARS.textMuted },
};

const QUEST_STATUS_INFO: Record<QuestStatus, { label: string; color: string }> = {
  locked: { label: '未触发', color: THEME_VARS.textMuted },
  active: { label: '进行中', color: THEME_VARS.info },
  completed: { label: '已完成', color: THEME_VARS.success },
  failed: { label: '失败', color: THEME_VARS.danger },
};

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function RpgPanel({ mvu, readOnly = false }: RpgPanelProps) {
  const [tab, setTab] = useState<PanelTab>('skills');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 初始化 RPG 引擎
  const engine = useMemo(() => {
    if (!mvu) return null;
    return initRpgEngine(mvu);
  }, [mvu]);

  const sd = useMemo(() => {
    if (!mvu) return {} as Record<string, unknown>;
    return mvu.snapshot();
  }, [mvu, refreshKey]);

  const summary = useMemo<RpgPlayerSummary | null>(() => {
    if (!engine) return null;
    return engine.getPlayerSummary(sd);
  }, [engine, sd]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const applyStateOps = useCallback(
    (stateOps: Array<{ op: string; path: string; value?: unknown }>) => {
      if (!mvu || stateOps.length === 0) return;
      try {
        const runtime = mvu as unknown as {
          applyPatch?: (ops: Array<{ op: string; path: string; value?: unknown }>) => void;
        };
        if (runtime.applyPatch) {
          runtime.applyPatch(stateOps);
          refresh();
        } else {
          showToast('error', 'MVU runtime 不支持 applyPatch');
        }
      } catch (e) {
        showToast('error', `应用失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [mvu, refresh, showToast],
  );

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: 18, color: THEME_VARS.text }}>🎯 RPG 养成</h3>
        <div style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
          RPG Panel · 技能树/任务追踪/装备栏
        </div>
        {summary && (
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11 }}>
            <span style={{ color: THEME_VARS.textSoft }}>✨ 技能点: <b style={{ color: THEME_VARS.warning }}>{summary.availableSkillPoints}</b></span>
            <span style={{ color: THEME_VARS.textSoft }}>💰 现金: <b style={{ color: THEME_VARS.success }}>{Number((sd?.主角 as Record<string, unknown>)?.现金 ?? 0)}</b> 日元</span>
            <span style={{ color: THEME_VARS.textSoft }}>✅ 已完成: <b>{summary.completedQuests.length}</b></span>
            <span style={{ color: THEME_VARS.textSoft }}>🔄 进行中: <b>{summary.activeQuests.length}</b></span>
          </div>
        )}
      </header>

      {/* Tab 切换 */}
      <div style={tabBarStyle}>
        {TAB_DEFS.map((t) => (
          <button
            key={t.id}
            style={tab === t.id ? tabActiveStyle : tabStyle}
            onClick={() => setTab(t.id)}
            disabled={readOnly && t.id !== 'skills'}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          ...toastStyle,
          background: toast.type === 'success' ? THEME_VARS.success : toast.type === 'error' ? THEME_VARS.danger : THEME_VARS.info,
          color: '#fff',
        }}>
          {toast.message}
        </div>
      )}

      {/* Tab 内容 */}
      <div style={contentStyle}>
        {!engine ? (
          <p style={{ color: THEME_VARS.textMuted, textAlign: 'center' }}>MVU 未初始化</p>
        ) : tab === 'skills' ? (
          <SkillsTab summary={summary} sd={sd} readOnly={readOnly} onUpgrade={applyStateOps} showToast={showToast} refresh={refresh} engine={engine} />
        ) : tab === 'quests' ? (
          <QuestsTab summary={summary} sd={sd} readOnly={readOnly} onComplete={applyStateOps} showToast={showToast} engine={engine} />
        ) : (
          <EquipmentTab summary={summary} sd={sd} readOnly={readOnly} onEquip={applyStateOps} showToast={showToast} engine={engine} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Skills Tab
// ═══════════════════════════════════════════════════════════

interface SkillsTabProps {
  summary: RpgPlayerSummary | null;
  sd: Record<string, unknown>;
  readOnly: boolean;
  onUpgrade: (ops: Array<{ op: string; path: string; value?: unknown }>) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  refresh: () => void;
  engine: ReturnType<typeof getRpgEngine>;
}

function SkillsTab({ summary, sd, readOnly, onUpgrade, showToast, refresh, engine }: SkillsTabProps) {
  const [selectedFaction, setSelectedFaction] = useState<SkillFaction | 'all'>('all');

  const visibleSkills = useMemo(() => {
    if (selectedFaction === 'all') return SKILL_TREE;
    return SKILL_TREE.filter((s) => s.faction === selectedFaction);
  }, [selectedFaction]);

  const handleUpgrade = useCallback(
    (skillId: SkillId) => {
      if (!engine || readOnly) return;
      const result = engine.upgradeSkill(skillId, sd);
      if (result.ok) {
        onUpgrade(result.stateOps);
        showToast('success', `${skillId} 升级到 ${result.newLevel} 级(技能值 ${result.newValue})`);
        refresh();
      } else {
        showToast('error', result.reason ?? '升级失败');
      }
    },
    [engine, sd, readOnly, onUpgrade, showToast, refresh],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 派系筛选 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          style={selectedFaction === 'all' ? filterActiveStyle : filterStyle}
          onClick={() => setSelectedFaction('all')}
        >
          全部
        </button>
        {SKILL_FACTIONS.map((f) => (
          <button
            key={f.id}
            style={selectedFaction === f.id ? filterActiveStyle : filterStyle}
            onClick={() => setSelectedFaction(f.id)}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* 技能卡片网格 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {visibleSkills.map((node) => {
          const currentValue = summary?.skills[node.id] ?? 0;
          const currentLevel = skillValueToLevel(currentValue);
          const maxed = currentLevel >= 10;
          const prereqOk = checkPrerequisites(node, summary?.skills ?? {} as Record<SkillId, number>).ok;
          const canUpgrade = !readOnly && !maxed && prereqOk &&
            (summary?.availableSkillPoints ?? 0) >= node.cost.skillPoints &&
            Number((sd?.主角 as Record<string, unknown>)?.现金 ?? 0) >= node.cost.money;

          return (
            <div key={node.id} style={{
              ...cardStyle,
              borderColor: SKILL_FACTIONS.find((f) => f.id === node.faction)?.color ?? THEME_VARS.border,
              opacity: prereqOk ? 1 : 0.5,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{SKILL_FACTIONS.find((f) => f.id === node.faction)?.icon}</span>
                  <b style={{ color: THEME_VARS.text }}>{node.name}</b>
                </div>
                <span style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 8,
                  background: maxed ? THEME_VARS.warning : THEME_VARS.primarySoft,
                  color: maxed ? '#fff' : THEME_VARS.primary,
                }}>
                  Lv.{currentLevel}/10
                </span>
              </div>

              {/* 等级进度条 */}
              <div style={{ height: 6, background: THEME_VARS.overlay, borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${(currentValue / 100) * 100}%`,
                  height: '100%',
                  background: SKILL_FACTIONS.find((f) => f.id === node.faction)?.color ?? THEME_VARS.primary,
                }} />
              </div>

              <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginBottom: 6, minHeight: 28 }}>
                {node.description}
              </div>

              {node.prerequisites.length > 0 && (
                <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginBottom: 4 }}>
                  前置: {node.prerequisites.map((p) => `${p.skill} ${p.level}级`).join(', ')}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: THEME_VARS.textSoft }}>
                  ✨{node.cost.skillPoints} · 💰{node.cost.money}
                </div>
                <button
                  style={canUpgrade ? btnPrimaryStyle : btnDisabledStyle}
                  onClick={() => handleUpgrade(node.id)}
                  disabled={!canUpgrade}
                >
                  {maxed ? '已满级' : prereqOk ? '升级' : '前置未满'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Quests Tab
// ═══════════════════════════════════════════════════════════

interface QuestsTabProps {
  summary: RpgPlayerSummary | null;
  sd: Record<string, unknown>;
  readOnly: boolean;
  onComplete: (ops: Array<{ op: string; path: string; value?: unknown }>) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  engine: ReturnType<typeof getRpgEngine>;
}

function QuestsTab({ summary, sd, readOnly, onComplete, showToast, engine }: QuestsTabProps) {
  const [filterType, setFilterType] = useState<QuestType | 'all'>('all');

  const completedSet = useMemo(
    () => new Set(summary?.completedQuests ?? []),
    [summary?.completedQuests],
  );

  const evaluations = useMemo(() => {
    if (!engine) return [];
    return engine.evaluateAllQuests(sd, completedSet);
  }, [engine, sd, completedSet]);

  const visibleQuests = useMemo(() => {
    let quests: Quest[] = filterType === 'all' ? QUESTS : listQuestsByType(filterType);
    // 进行中优先,然后是已完成的,最后是未触发
    const statusOrder: Record<QuestStatus, number> = { active: 0, completed: 1, locked: 2, failed: 3 };
    return quests.sort((a, b) => {
      const aEval = evaluations.find((e) => e.questId === a.id);
      const bEval = evaluations.find((e) => e.questId === b.id);
      const aOrder = aEval ? statusOrder[aEval.status] : 99;
      const bOrder = bEval ? statusOrder[bEval.status] : 99;
      return aOrder - bOrder;
    });
  }, [filterType, evaluations]);

  const handleComplete = useCallback(
    (questId: string) => {
      if (!engine || readOnly) return;
      const result = engine.completeQuest(questId, sd);
      if (result.ok) {
        onComplete(result.stateOps);
        showToast('success', `任务完成!${result.rewardDescription}`);
      } else {
        showToast('error', result.reason ?? '完成失败');
      }
    },
    [engine, sd, readOnly, onComplete, showToast],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={filterType === 'all' ? filterActiveStyle : filterStyle} onClick={() => setFilterType('all')}>全部</button>
        <button style={filterType === 'main' ? filterActiveStyle : filterStyle} onClick={() => setFilterType('main')}>⭐ 主线</button>
        <button style={filterType === 'side' ? filterActiveStyle : filterStyle} onClick={() => setFilterType('side')}>🔹 支线</button>
        <button style={filterType === 'hidden' ? filterActiveStyle : filterStyle} onClick={() => setFilterType('hidden')}>🔒 隐藏</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleQuests.map((quest) => {
          const evalResult = evaluations.find((e) => e.questId === quest.id);
          const status = evalResult?.status ?? 'locked';
          const typeInfo = QUEST_TYPE_INFO[quest.type];
          const statusInfo = QUEST_STATUS_INFO[status];
          const canComplete = !readOnly && status === 'active' && evalResult?.objectives.allCompleted;

          return (
            <div key={quest.id} style={{
              ...cardStyle,
              opacity: status === 'locked' ? 0.6 : 1,
              borderColor: status === 'active' ? THEME_VARS.info : status === 'completed' ? THEME_VARS.success : THEME_VARS.border,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{typeInfo.icon}</span>
                  <b style={{ color: THEME_VARS.text }}>{quest.name}</b>
                  {quest.isBranch && <span style={{ fontSize: 9, padding: '1px 5px', background: THEME_VARS.warning, color: '#fff', borderRadius: 6 }}>分支</span>}
                </div>
                <span style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 8,
                  background: statusInfo.color,
                  color: '#fff',
                }}>
                  {statusInfo.label}
                </span>
              </div>

              <div style={{ fontSize: 11, color: THEME_VARS.textSoft, marginBottom: 6 }}>
                {quest.description}
              </div>

              {/* 目标列表 */}
              <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginBottom: 6 }}>
                {quest.objectives.map((obj, idx) => {
                  const completed = evalResult?.objectives.completed.includes(obj.id);
                  return (
                    <div key={obj.id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span>{completed ? '✅' : '⬜'}</span>
                      <span style={{ textDecoration: completed ? 'line-through' : 'none' }}>
                        {obj.description}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 奖励预览 */}
              <div style={{ fontSize: 10, color: THEME_VARS.textSoft, marginBottom: 6 }}>
                奖励: {formatReward(quest.reward)}
              </div>

              {canComplete && (
                <button style={btnPrimaryStyle} onClick={() => handleComplete(quest.id)}>
                  🎁 领取奖励
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatReward(reward: Quest['reward']): string {
  const parts: string[] = [];
  if (reward.money) parts.push(`💰${reward.money}`);
  if (reward.skillPoints) parts.push(`✨${reward.skillPoints}`);
  if (reward.skillExp?.length) parts.push(reward.skillExp.map((e) => `${e.skill}+${e.exp}`).join(','));
  if (reward.unlockCg?.length) parts.push(`🎨×${reward.unlockCg.length}`);
  if (reward.unlockAchievement?.length) parts.push(`🏆×${reward.unlockAchievement.length}`);
  return parts.join(' · ') || '无';
}

// ═══════════════════════════════════════════════════════════
//  Equipment Tab
// ═══════════════════════════════════════════════════════════

interface EquipmentTabProps {
  summary: RpgPlayerSummary | null;
  sd: Record<string, unknown>;
  readOnly: boolean;
  onEquip: (ops: Array<{ op: string; path: string; value?: unknown }>) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  engine: ReturnType<typeof getRpgEngine>;
}

function EquipmentTab({ summary, sd, readOnly, onEquip, showToast, engine }: EquipmentTabProps) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>('weapon');

  const equippedList = useMemo(() => {
    if (!summary) return [];
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
    return slots
      .map((slot) => {
        const id = summary.equipped[slot];
        return id ? findEquipment(id) : undefined;
      })
      .filter((e): e is Equipment => !!e);
  }, [summary]);

  const totalBonus = useMemo(() => mergeEquipmentBonuses(equippedList), [equippedList]);

  const slotEquipments = useMemo(() => {
    return listEquipmentsBySlot(selectedSlot);
  }, [selectedSlot]);

  const handleEquip = useCallback(
    (equipmentId: string) => {
      if (!engine || readOnly) return;
      const result = engine.equip(equipmentId, sd);
      if (result.ok) {
        onEquip(result.stateOps);
        showToast('success', `装备成功`);
      } else {
        showToast('error', result.reason ?? '装备失败');
      }
    },
    [engine, sd, readOnly, onEquip, showToast],
  );

  const handleUnequip = useCallback(
    (slot: EquipmentSlot) => {
      if (!engine || readOnly) return;
      const result = engine.unequip(slot, sd);
      if (result.ok) {
        onEquip(result.stateOps);
        showToast('info', `已卸下${getSlotInfo(slot).label}`);
      }
    },
    [engine, sd, readOnly, onEquip, showToast],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 当前装备栏 */}
      <div style={{ ...cardStyle, background: THEME_VARS.overlaySoft }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: THEME_VARS.text, marginBottom: 8 }}>
          ⚙ 当前装备
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {(['weapon', 'armor', 'accessory'] as EquipmentSlot[]).map((slot) => {
            const equippedId = summary?.equipped[slot] ?? '';
            const equipped = equippedId ? findEquipment(equippedId) : undefined;
            const slotInfo = getSlotInfo(slot);
            return (
              <div key={slot} style={{
                padding: 8,
                borderRadius: 8,
                background: THEME_VARS.overlay,
                border: `1px solid ${THEME_VARS.border}`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{slotInfo.icon}</div>
                <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginBottom: 2 }}>{slotInfo.label}</div>
                <div style={{ fontSize: 11, color: THEME_VARS.text, fontWeight: 600, marginBottom: 4 }}>
                  {equipped ? equipped.name : '— 空 —'}
                </div>
                {equipped && !readOnly && (
                  <button
                    style={{ ...btnGhostStyle, fontSize: 10, padding: '2px 6px' }}
                    onClick={() => handleUnequip(slot)}
                  >
                    卸下
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 总加成 */}
        {equippedList.length > 0 && (
          <div style={{ marginTop: 10, padding: 8, background: THEME_VARS.overlay, borderRadius: 6, fontSize: 10 }}>
            <div style={{ color: THEME_VARS.textSoft, marginBottom: 4 }}>📈 总加成:</div>
            <BonusDisplay bonus={totalBonus} />
          </div>
        )}
      </div>

      {/* 槽位选择 */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['weapon', 'armor', 'accessory'] as EquipmentSlot[]).map((slot) => {
          const info = getSlotInfo(slot);
          return (
            <button
              key={slot}
              style={selectedSlot === slot ? filterActiveStyle : filterStyle}
              onClick={() => setSelectedSlot(slot)}
            >
              {info.icon} {info.label}
            </button>
          );
        })}
      </div>

      {/* 装备列表 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {slotEquipments.map((eq) => {
          const rarityInfo = getRarityInfo(eq.rarity);
          const isEquipped = summary?.equipped[eq.slot] === eq.id;
          const canEquip = !readOnly && !isEquipped;

          return (
            <div key={eq.id} style={{
              ...cardStyle,
              borderColor: rarityInfo.color,
              background: isEquipped ? THEME_VARS.success : THEME_VARS.overlay,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{rarityInfo.icon}</span>
                  <b style={{ color: THEME_VARS.text }}>{eq.name}</b>
                </div>
                <span style={{
                  fontSize: 9,
                  padding: '1px 6px',
                  borderRadius: 6,
                  background: rarityInfo.color,
                  color: '#fff',
                }}>
                  {rarityInfo.label}
                </span>
              </div>

              <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginBottom: 6, minHeight: 28 }}>
                {eq.description}
              </div>

              <BonusDisplay bonus={eq.bonus} />

              {eq.levelRequirement && (
                <div style={{ fontSize: 10, color: THEME_VARS.warning, marginTop: 4 }}>
                  ⚠ 等级要求: {eq.levelRequirement}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <div style={{ fontSize: 10, color: THEME_VARS.textSoft }}>
                  {eq.price > 0 ? `💰 ${eq.price}` : '不可购买'}
                </div>
                {isEquipped ? (
                  <span style={{ fontSize: 10, color: THEME_VARS.success, fontWeight: 600 }}>✓ 已装备</span>
                ) : (
                  <button
                    style={canEquip ? btnPrimaryStyle : btnDisabledStyle}
                    onClick={() => handleEquip(eq.id)}
                    disabled={!canEquip}
                  >
                    装备
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 装备加成显示 */
function BonusDisplay({ bonus }: { bonus: Equipment['bonus'] }) {
  const parts: Array<{ label: string; value: string; color: string }> = [];
  if (bonus.skillBonus) {
    for (const [k, v] of Object.entries(bonus.skillBonus)) {
      if (v) parts.push({ label: k, value: `+${v}`, color: THEME_VARS.primary });
    }
  }
  if (bonus.attributeBonus) {
    for (const [k, v] of Object.entries(bonus.attributeBonus)) {
      if (v) parts.push({ label: k, value: `+${v}`, color: THEME_VARS.accent });
    }
  }
  if (bonus.hpBonus) parts.push({ label: 'HP', value: `+${bonus.hpBonus}`, color: THEME_VARS.success });
  if (bonus.damageBonus) parts.push({ label: '伤害', value: `+${(bonus.damageBonus * 100).toFixed(0)}%`, color: THEME_VARS.danger });
  if (bonus.defenseBonus) parts.push({ label: '防御', value: `+${bonus.defenseBonus}`, color: THEME_VARS.info });
  if (bonus.incomeBonus) parts.push({ label: '收入', value: `+${(bonus.incomeBonus * 100).toFixed(0)}%`, color: THEME_VARS.warning });
  if (bonus.affectionBonus) parts.push({ label: '好感', value: `+${(bonus.affectionBonus * 100).toFixed(0)}%`, color: THEME_VARS.primaryGlow });

  if (parts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 10 }}>
      {parts.map((p, i) => (
        <span key={i} style={{
          padding: '1px 5px',
          borderRadius: 4,
          background: THEME_VARS.overlay,
          color: p.color,
          border: `1px solid ${p.color}33`,
        }}>
          {p.label} {p.value}
        </span>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  样式
// ───────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  padding: 16,
  background: THEME_VARS.bg,
  color: THEME_VARS.text,
  fontFamily: THEME_VARS.fontBody,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  height: '100%',
  overflow: 'auto',
};

const headerStyle: React.CSSProperties = {
  borderBottom: `1px solid ${THEME_VARS.border}`,
  paddingBottom: 8,
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  borderBottom: `1px solid ${THEME_VARS.border}`,
  paddingBottom: 6,
};

const tabStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'transparent',
  border: 'none',
  color: THEME_VARS.textMuted,
  cursor: 'pointer',
  fontSize: 12,
  borderRadius: 6,
};

const tabActiveStyle: React.CSSProperties = {
  ...tabStyle,
  background: THEME_VARS.primarySoft,
  color: THEME_VARS.primary,
  fontWeight: 600,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
};

const cardStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
};

const filterStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  color: THEME_VARS.textMuted,
  cursor: 'pointer',
  fontSize: 11,
  borderRadius: 6,
};

const filterActiveStyle: React.CSSProperties = {
  ...filterStyle,
  background: THEME_VARS.primarySoft,
  color: THEME_VARS.primary,
  borderColor: THEME_VARS.primary,
  fontWeight: 600,
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: THEME_VARS.primary,
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 11,
  borderRadius: 6,
  fontWeight: 600,
};

const btnDisabledStyle: React.CSSProperties = {
  ...btnPrimaryStyle,
  background: THEME_VARS.overlay,
  color: THEME_VARS.textMuted,
  cursor: 'not-allowed',
  opacity: 0.6,
};

const btnGhostStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  border: `1px solid ${THEME_VARS.border}`,
  color: THEME_VARS.textSoft,
  cursor: 'pointer',
  fontSize: 11,
  borderRadius: 6,
};

const toastStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
};
