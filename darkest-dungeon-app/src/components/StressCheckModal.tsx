// ============================================================
// 压力判定弹窗 — 崩溃 / 美德 / 心脏病 结果展示
// ============================================================

import { useStressStore } from '@/stores/stressStore';
import { useGameStore } from '@/stores/gameStore';
import { getStressStateName } from '@/gateway/stressSystem';
import clsx from 'clsx';

export default function StressCheckModal() {
  const pendingChecks = useStressStore((s) => s.pendingChecks);
  const roster = useGameStore((s) => s.roster);

  // 取最早的一条待处理判定
  const check = pendingChecks[0];

  if (!check) return null;

  // 尝试找到对应的英雄名（通过最近日志，或仅展示判定结果）
  const isVirtue = check.isVirtue;
  const isAffliction = check.isAffliction;
  const heartAttack = check.heartAttack;

  const title = heartAttack
    ? '心脏病发作'
    : isVirtue
      ? '美德显现'
      : isAffliction
        ? '精神崩溃'
        : '压力判定';

  const stateName = getStressStateName(
    heartAttack ? 'heartattack' : isVirtue ? 'virtuous' : isAffliction ? 'afflicted' : 'stressed'
  );

  const stateNameId = heartAttack
    ? 'heartattack'
    : isVirtue
      ? 'virtuous'
      : isAffliction
        ? 'afflicted'
        : 'stressed';

  // 最新日志中的英雄名（用于显示哪个英雄触发）
  const log = useStressStore((s) => s.stressLog);
  const lastEntry = log.length > 0 ? log[log.length - 1] : null;
  // 若最后一条日志与本次判定匹配（同时间触发），用它显示英雄名
  const heroName = lastEntry?.heroName ?? `${roster.length} 名英雄中的一位`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dd-void/80 p-4">
      <div className="dd-panel w-full max-w-md dd-anim-victory">
        {/* 头部 */}
        <div className="dd-panel-header justify-center">
          <span
            className={clsx(
              'font-dd text-base tracking-[0.2em]',
              stateNameId === 'heartattack'
                ? 'dd-text-blood'
                : stateNameId === 'virtuous'
                  ? 'dd-text-gold'
                  : 'dd-text-blood'
            )}
          >
            {title}
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* 判定过程 */}
          <div className="text-center">
            <div className="font-dd text-sm text-dd-textBright tracking-wider">{heroName}</div>
            <div
              className={clsx(
                'dd-tag mt-2 text-xs',
                stateNameId === 'virtuous'
                  ? 'dd-tag-positive'
                  : 'dd-tag-negative'
              )}
            >
              {stateName}
            </div>
          </div>

          <div className="dd-divider" />

          {/* 判定数值 */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-dd-textMuted">美德几率</span>
              <span className="font-mono text-dd-text">
                {Math.round(check.virtueChance * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dd-textMuted">判定骰值</span>
              <span className="font-mono text-dd-text">
                {check.rolled < 0.1 ? '0.0' : check.rolled.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="dd-divider" />

          {/* 结果详情 */}
          {check.isVirtue && check.virtue && (
            <div className="dd-panel p-4 space-y-2" style={{ borderColor: '#3d5a28' }}>
              <div className="font-dd text-sm text-dd-gold tracking-widest text-center">
                美德 · {check.virtue.name}
              </div>
              <div className="text-xs text-dd-text text-center">{check.virtue.description}</div>
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                {check.virtue.effects.map((e, i) => (
                  <span key={i} className="dd-tag dd-tag-positive">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {check.isAffliction && check.affliction && (
            <div className="dd-panel p-4 space-y-2" style={{ borderColor: '#6b1818' }}>
              <div className="font-dd text-sm dd-text-blood tracking-widest text-center">
                崩溃 · {check.affliction.name}
              </div>
              <div className="text-xs text-dd-text text-center">{check.affliction.description}</div>
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                {check.affliction.effects.map((e, i) => (
                  <span key={i} className="dd-tag dd-tag-negative">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {check.heartAttack && (
            <div className="dd-panel p-4 text-center space-y-2" style={{ borderColor: '#6b1818' }}>
              <div className="font-dd text-sm dd-text-blood tracking-widest">
                心脏承受不住疯狂的负荷！
              </div>
              <div className="text-xs text-dd-textMuted">
                英雄的心脏在压力下骤然停跳...
              </div>
            </div>
          )}
        </div>

        {/* 关闭按钮 */}
        <div className="p-4 pt-0">
          <button
            onClick={() => {
              useStressStore.setState((s) => ({
                pendingChecks: s.pendingChecks.slice(1),
              }));
            }}
            className="dd-btn-primary w-full"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}