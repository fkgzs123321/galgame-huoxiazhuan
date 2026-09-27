// ============================================================
// 营地界面 — 露营时使用英雄的营地技能
// 所有显示文字均为中文，遵循 dd-* 哥特风格
// ============================================================

import { useState } from 'react';
import { useDungeonStore } from '@/stores/dungeonStore';
import { useGameStore } from '@/stores/gameStore';
import { getCampSkillsForHero, getSkillTargetLabel } from '@/gateway/campSystem';
import type { CampSkill } from '@/gateway/campSystem';
import clsx from 'clsx';

export default function CampScreen() {
  const partyUids = useDungeonStore((s) => s.partyUids);
  const campUsedSkills = useDungeonStore((s) => s.campUsedSkills);
  const campLog = useDungeonStore((s) => s.campLog);
  const campHeroDataMap = useDungeonStore((s) => s.campHeroDataMap);
  const useCampSkill = useDungeonStore((s) => s.useCampSkill);
  const endCamp = useDungeonStore((s) => s.endCamp);
  const dismissCamp = useDungeonStore((s) => s.dismissCamp);

  const roster = useGameStore((s) => s.roster);
  const partyHeroes = roster.filter((h) => partyUids.includes(h.uid));

  // 本地状态：当前选中的技能（用于选择 ally 目标）
  const [pendingSkill, setPendingSkill] = useState<{ heroUid: string; skillId: string } | null>(null);
  const [selectedTargetUid, setSelectedTargetUid] = useState<string | null>(null);

  // 队伍中是否有人使用过守夜/拖延技能（用于伏击提示）
  const usedSkillIds = Object.values(campUsedSkills).flat();
  const hasVigil = usedSkillIds.includes('vigil');
  const hasStall = usedSkillIds.includes('stall') || usedSkillIds.includes('terrify');

  function handleSkillClick(heroUid: string, skill: CampSkill) {
    if (skill.target === 'ally') {
      // 需要选择目标
      setPendingSkill({ heroUid, skillId: skill.id });
      setSelectedTargetUid(null);
    } else {
      // 自身/全队直接使用
      useCampSkill(heroUid, skill.id);
    }
  }

  function confirmTarget() {
    if (!pendingSkill) return;
    const targetUid = pendingSkill
      ? partyHeroes.find((h) => h.uid === selectedTargetUid)
      : undefined;
    // 若未选择目标，由引擎回退到施法者自身
    useCampSkill(pendingSkill.heroUid, pendingSkill.skillId, targetUid?.uid);
    setPendingSkill(null);
    setSelectedTargetUid(null);
  }

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-3 overflow-y-auto">
      <div className="dd-panel w-full max-w-4xl dd-anim-victory my-4">
        {/* 头部 */}
        <div className="dd-panel-header">
          <span className="mr-1">☩</span> 营地
          <span className="text-xs normal-case text-dd-textMuted">
            露营 · 使用英雄的营地技能
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* 顶部说明 */}
          <div className="p-3 bg-dd-surface2 border border-dd-border text-xs text-dd-textMuted space-y-1" style={{ borderRadius: '2px' }}>
            <div>
              <span className="dd-tag mr-1">规则</span>
              露营结束时将恢复火把亮度，但有一定几率遭遇伏击。
            </div>
            <div>
              <span className="dd-tag mr-1">警告</span>
              {hasVigil
                ? '守夜生效，伏击已被完全阻止。'
                : hasStall
                  ? '拖延生效，伏击几率大幅降低。'
                  : '没有守夜者，黑暗中的敌人可能来袭。'}
            </div>
          </div>

          {/* 英雄卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {partyHeroes.map((hero) => {
              const heroData = campHeroDataMap[hero.classId];
              const skills = getCampSkillsForHero(hero, heroData);
              const used = campUsedSkills[hero.uid] || [];
              const hpPct = hero.maxHp > 0 ? (hero.currentHp / hero.maxHp) * 100 : 0;
              const stressPct = Math.min(100, (hero.stress / 200) * 100);
              const hpClass = hpPct > 60 ? 'dd-hp-high' : hpPct > 30 ? 'dd-hp-mid' : 'dd-hp-low';

              return (
                <div key={hero.uid} className="dd-panel">
                  <div className="px-3 py-2 border-b border-dd-border flex items-center justify-between">
                    <span className={clsx('font-dd text-sm tracking-wide', `class-${hero.classId}`)}>
                      {hero.name}
                    </span>
                    <span className="text-dd-textMuted text-xs">{hero.classId}</span>
                  </div>

                  <div className="p-3 space-y-2">
                    {/* HP 条 */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-dd-textMuted">生命</span>
                        <span className={clsx('font-mono', hero.currentHp <= 0 ? 'text-dd-redBright' : 'text-dd-text')}>
                          {hero.currentHp} / {hero.maxHp}
                        </span>
                      </div>
                      <div className="dd-bar">
                        <div className={clsx('dd-bar-fill', hpClass)} style={{ width: `${hpPct}%` }} />
                      </div>
                    </div>

                    {/* 压力条 */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-dd-textMuted">压力</span>
                        <span className={clsx('font-mono', hero.stress >= 100 ? 'text-dd-stressBright' : 'text-dd-text')}>
                          {hero.stress}
                        </span>
                      </div>
                      <div className="dd-bar">
                        <div className="dd-bar-fill dd-stress-fill" style={{ width: `${stressPct}%` }} />
                      </div>
                    </div>

                    {/* 可用营地技能 */}
                    <div className="pt-1">
                      <div className="text-xs text-dd-textMuted mb-1 font-dd tracking-wide">营地技能</div>
                      {skills.length === 0 ? (
                        <div className="text-xs text-dd-textDim">该英雄没有可用的营地技能</div>
                      ) : (
                        <div className="space-y-1">
                          {skills.map((skill) => {
                            const isUsed = used.includes(skill.id);
                            return (
                              <button
                                key={skill.id}
                                disabled={isUsed}
                                onClick={() => handleSkillClick(hero.uid, skill)}
                                className={clsx(
                                  'w-full text-left px-2 py-1.5 border text-xs transition-colors',
                                  isUsed
                                    ? 'border-dd-border text-dd-textDim opacity-50 cursor-not-allowed'
                                    : clsx(
                                        'border-dd-borderLight hover:border-dd-gold hover:bg-dd-surface3',
                                        (pendingSkill?.heroUid === hero.uid && pendingSkill.skillId === skill.id)
                                          ? 'bg-dd-bgLight border-dd-gold'
                                          : 'bg-dd-surface2'
                                      )
                                )}
                                style={{ borderRadius: '1px' }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-dd-textBright font-medium">{skill.name}</span>
                                  <span className="dd-tag shrink-0">{getSkillTargetLabel(skill.target)}</span>
                                </div>
                                <div className="text-dd-textMuted mt-0.5">{skill.description}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 目标选择面板（ally 技能） */}
          {pendingSkill && (
            <div className="p-3 bg-dd-bgLight border border-dd-gold" style={{ borderRadius: '2px' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-dd-gold font-dd text-sm tracking-wide">选择目标</span>
                <button
                  onClick={() => { setPendingSkill(null); setSelectedTargetUid(null); }}
                  className="dd-btn dd-btn-sm"
                  style={{ padding: '2px 10px' }}
                >
                  取消
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {partyHeroes.map((h) => (
                  <button
                    key={h.uid}
                    onClick={() => setSelectedTargetUid(h.uid)}
                    className={clsx(
                      'dd-btn flex-1 min-w-[120px]',
                      selectedTargetUid === h.uid && 'dd-btn-primary'
                    )}
                  >
                    <span className={clsx(`class-${h.classId}`)}>{h.name}</span>
                    <span className="text-xs opacity-80">{h.currentHp}/{h.maxHp}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex justify-end">
                <button onClick={confirmTarget} className="dd-btn-primary">
                  确认使用
                </button>
              </div>
            </div>
          )}

          {/* 营地日志 */}
          {campLog.length > 0 && (
            <div className="dd-panel">
              <div className="dd-panel-header">营地记录</div>
              <div className="p-3 max-h-40 overflow-y-auto space-y-1">
                {campLog.map((line, i) => (
                  <div key={i} className={clsx('text-xs', line.includes('使用') ? 'text-dd-gold' : 'text-dd-textMuted')}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 底部操作 */}
          <div className="flex gap-2 pt-1">
            <button onClick={endCamp} className="dd-btn-primary flex-1">
              ☩ 结束露营
            </button>
            <button onClick={dismissCamp} className="dd-btn flex-1">
              跳过露营
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}