/**
 * CombatSettlementPanel · 战斗结算面板(阶段3 步骤2)
 *
 * 职责:
 *  - 展示战斗结算页(双方属性/回合记录/结果)
 *  - 支持手动触发战斗测试(选择对手+难度)
 *  - 显示骰子可视化(大成功/大失败高亮)
 *  - 展示状态变更 ops
 *
 * 集成点:
 *  - GameView 浮层面板 'combat' 打开
 *  - App.tsx 开发者模式 section 展示
 *  - TriggerDispatcher 触发 combat 后,自动展示结算结果
 */

import { useState } from 'react';
import { combatEngine, type CombatSettlement, type CombatTriggerCondition } from '@runtime/combat-engine';
import { THEME_VARS } from './types';

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface CombatSettlementPanelProps {
  /** 当前 stat_data 快照(用于提取玩家属性) */
  statData: Record<string, unknown>;
  /** 是否只读 */
  readOnly?: boolean;
  /** 已触发的战斗结算(由 App.tsx 在触发器调用后传入) */
  pendingSettlement?: CombatSettlement | null;
}

// ───────────────────────────────────────────────────────────
//  CombatSettlementPanel 组件
// ───────────────────────────────────────────────────────────

export function CombatSettlementPanel({
  statData,
  readOnly = false,
  pendingSettlement,
}: CombatSettlementPanelProps) {
  const [settlement, setSettlement] = useState<CombatSettlement | null>(pendingSettlement ?? null);
  const [opponentName, setOpponentName] = useState('');
  const [difficulty, setDifficulty] = useState<NonNullable<CombatTriggerCondition['difficulty']>>('普通');
  const [triggerAction, setTriggerAction] = useState('挥拳攻击');

  const handleSettle = () => {
    if (readOnly) return;
    const condition: CombatTriggerCondition = {
      userAction: triggerAction,
      statData,
      opponentName: opponentName || undefined,
      difficulty,
    };
    const result = combatEngine.settle(condition);
    setSettlement(result);
  };

  return (
    <div
      style={{
        background: THEME_VARS.overlay,
        border: `1px solid ${THEME_VARS.border}`,
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <header style={{ borderBottom: `1px solid ${THEME_VARS.border}`, paddingBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: THEME_VARS.primary, fontFamily: 'var(--font-display)' }}>
          ⚔ 战斗结算系统 · 阶段3 步骤2
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: THEME_VARS.textMuted }}>
          LCG 骰子判定 + 伤害计算 + 胜负裁定 · 7 类预判 · 4 难度
        </p>
      </header>

      {/* 触发条件 */}
      <section
        style={{
          padding: 12,
          background: THEME_VARS.bg,
          borderRadius: 8,
          border: `1px solid ${THEME_VARS.border}`,
        }}
      >
        <h4 style={{ margin: '0 0 10px', fontSize: 13, color: THEME_VARS.text }}>触发条件(测试用)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
            <span style={{ color: THEME_VARS.textMuted }}>玩家行动</span>
            <input
              type="text"
              value={triggerAction}
              readOnly={readOnly}
              onChange={(e) => setTriggerAction(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
            <span style={{ color: THEME_VARS.textMuted }}>对手名称(留空=场景推断)</span>
            <input
              type="text"
              value={opponentName}
              readOnly={readOnly}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="如:不良少年 / 小混混"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, gridColumn: '1 / -1' }}>
            <span style={{ color: THEME_VARS.textMuted }}>难度</span>
            <select
              value={difficulty}
              disabled={readOnly}
              onChange={(e) => setDifficulty(e.target.value as NonNullable<CombatTriggerCondition['difficulty']>)}
              style={inputStyle}
            >
              <option value="轻松">轻松(玩家×1.2 对手×0.8)</option>
              <option value="普通">普通(双方×1.0)</option>
              <option value="挑战">挑战(玩家×0.9 对手×1.1)</option>
              <option value="地狱">地狱(玩家×0.7 对手×1.4)</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleSettle}
          disabled={readOnly}
          style={{
            marginTop: 10,
            padding: '8px 20px',
            background: readOnly ? THEME_VARS.border : `linear-gradient(135deg, ${THEME_VARS.danger} 0%, ${THEME_VARS.warning} 100%)`,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: readOnly ? 'not-allowed' : 'pointer',
          }}
        >
          ⚔ 开始战斗结算
        </button>
      </section>

      {/* 战斗结算结果 */}
      {settlement && (
        <>
          {/* 结果摘要 */}
          <section
            style={{
              padding: 12,
              background: resultBg(settlement.result),
              borderRadius: 8,
              border: `1px solid ${resultColor(settlement.result)}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 14, color: resultColor(settlement.result) }}>
                {resultIcon(settlement.result)} {resultLabel(settlement.result)}
              </strong>
              <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
                {settlement.totalRounds} 回合 · {settlement.elapsedMs}ms
              </span>
            </div>
            <div style={{ fontSize: 12, color: THEME_VARS.text }}>{settlement.resultDescription}</div>
          </section>

          {/* 双方对比 */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            <CombatantCard label="玩家" combatant={settlement.player} primary />
            <CombatantCard label="对手" combatant={settlement.opponent} />
          </section>

          {/* 回合记录 */}
          <section
            style={{
              padding: 12,
              background: THEME_VARS.bg,
              borderRadius: 8,
              border: `1px solid ${THEME_VARS.border}`,
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            <h4 style={{ margin: '0 0 10px', fontSize: 13, color: THEME_VARS.text }}>回合记录</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {settlement.rounds.map((r) => (
                <RoundCard key={r.round} round={r} />
              ))}
            </div>
          </section>

          {/* 状态变更 ops */}
          {settlement.stateOps.length > 0 && (
            <section
              style={{
                padding: 12,
                background: THEME_VARS.primaryGlow,
                borderRadius: 8,
                border: `1px solid ${THEME_VARS.primarySoft}`,
              }}
            >
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: THEME_VARS.primary }}>
                ♥ 状态变更 ops ({settlement.stateOps.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {settlement.stateOps.map((op, i) => (
                  <div key={i} style={{ fontSize: 11, color: THEME_VARS.text }}>
                    <code style={{ color: THEME_VARS.primary }}>{op.op}</code>{' '}
                    <code>{op.path}</code>
                    {op.value !== undefined && (
                      <span style={{ color: THEME_VARS.textMuted }}> → {String(op.value)}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 战斗结算页文本 */}
          <section
            style={{
              padding: 12,
              background: THEME_VARS.bg,
              borderRadius: 8,
              border: `1px solid ${THEME_VARS.border}`,
            }}
          >
            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: THEME_VARS.text }}>战斗结算页(注入主聊天AI)</h4>
            <pre
              style={{
                margin: 0,
                padding: 10,
                background: THEME_VARS.overlay,
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: THEME_VARS.text,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {settlement.settlementPage}
            </pre>
          </section>
        </>
      )}

      {!settlement && (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            color: THEME_VARS.textMuted,
            fontSize: 12,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>⚔</div>
          尚无战斗结算记录。<br />
          点击上方「开始战斗结算」触发一场测试战斗。
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  子组件
// ───────────────────────────────────────────────────────────

function CombatantCard({
  label,
  combatant,
  primary = false,
}: {
  label: string;
  combatant: import('@runtime/combat-engine').Combatant;
  primary?: boolean;
}) {
  return (
    <div
      style={{
        padding: 10,
        background: THEME_VARS.overlay,
        borderRadius: 8,
        border: `1px solid ${primary ? THEME_VARS.primary : THEME_VARS.border}`,
        borderLeft: `3px solid ${primary ? THEME_VARS.primary : THEME_VARS.border}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <strong style={{ fontSize: 13, color: primary ? THEME_VARS.primary : THEME_VARS.text }}>
          {label}:{combatant.name}
        </strong>
        <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
          HP {combatant.hp}/{combatant.maxHp}
        </span>
      </div>
      <HpBar hp={combatant.hp} maxHp={combatant.maxHp} />
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
        <SkillRow label="格斗" value={combatant.skills.格斗} />
        <SkillRow label="力量" value={combatant.skills.力量} />
        <SkillRow label="敏捷" value={combatant.skills.敏捷} />
        <SkillRow label="意志" value={combatant.skills.意志} />
      </div>
    </div>
  );
}

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const color = pct > 60 ? THEME_VARS.success : pct > 30 ? THEME_VARS.warning : THEME_VARS.danger;
  return (
    <div style={{ height: 8, background: THEME_VARS.borderSoft, borderRadius: 4, overflow: 'hidden' }}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

function SkillRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: THEME_VARS.textMuted }}>{label}</span>
      <span style={{ color: THEME_VARS.text, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function RoundCard({ round }: { round: import('@runtime/combat-engine').CombatRound }) {
  const { roll } = round;
  const bg = roll.criticalSuccess
    ? THEME_VARS.primaryGlow
    : roll.criticalFailure
      ? `rgba(211, 47, 47, 0.15)`
      : roll.success
        ? `rgba(76, 175, 80, 0.1)`
        : THEME_VARS.bg;
  const borderColor = roll.criticalSuccess
    ? THEME_VARS.primary
    : roll.criticalFailure
      ? THEME_VARS.danger
      : THEME_VARS.border;
  return (
    <div
      style={{
        padding: 8,
        background: bg,
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        fontSize: 11,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <strong style={{ color: THEME_VARS.text }}>
          [R{round.round}] {round.attacker} 攻击
        </strong>
        {roll.criticalSuccess && <span style={{ color: THEME_VARS.primary }}>★ 大成功</span>}
        {roll.criticalFailure && <span style={{ color: THEME_VARS.danger }}>✗ 大失败</span>}
        {!roll.criticalSuccess && !roll.criticalFailure && (
          <span style={{ color: roll.success ? THEME_VARS.success : THEME_VARS.textMuted }}>
            {roll.success ? '✓ 成功' : '✗ 失败'}
          </span>
        )}
      </div>
      <div style={{ color: THEME_VARS.textMuted, marginBottom: 4 }}>
        骰子 <code style={{ color: THEME_VARS.primary, fontWeight: 700 }}>{roll.dice}</code> + 技能 {roll.skillValue} ={' '}
        <strong style={{ color: THEME_VARS.text }}>{roll.total}</strong> / 阈值 {roll.threshold}
      </div>
      {round.damage && (
        <div style={{ color: THEME_VARS.danger }}>
          伤害 <strong>{round.damage.finalDamage}</strong>(基础{round.damage.baseDamage}×技能{round.damage.skillMultiplier}×难度{round.damage.difficultyMultiplier})
          · 对手剩余 HP {round.damage.defenderRemainingHp}
        </div>
      )}
      <div style={{ color: THEME_VARS.text, marginTop: 2 }}>{round.description}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  辅助
// ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 4,
  color: THEME_VARS.text,
  fontSize: 12,
  boxSizing: 'border-box',
};

function resultIcon(r: CombatSettlement['result']): string {
  return r === 'player_win' ? '★' : r === 'player_lose' ? '✗' : '＝';
}

function resultLabel(r: CombatSettlement['result']): string {
  return r === 'player_win' ? '玩家胜利' : r === 'player_lose' ? '玩家败北' : '僵持';
}

function resultColor(r: CombatSettlement['result']): string {
  return r === 'player_win' ? THEME_VARS.success : r === 'player_lose' ? THEME_VARS.danger : THEME_VARS.warning;
}

function resultBg(r: CombatSettlement['result']): string {
  if (r === 'player_win') return `rgba(76, 175, 80, 0.12)`;
  if (r === 'player_lose') return `rgba(211, 47, 47, 0.12)`;
  return `rgba(255, 112, 67, 0.12)`;
}
