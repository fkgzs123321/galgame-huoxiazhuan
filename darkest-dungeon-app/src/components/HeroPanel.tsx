import { useGameStore } from '@/stores/gameStore';
import { getHeroName, getSkillName } from '@/data/ddLoader';
import { getQuirkName, isPositiveQuirk, getDiseaseName } from '@/stores/townStore';
import { getAfflictionById, getVirtueById } from '@/gateway/stressSystem';
import clsx from 'clsx';

// 决心等级转罗马数字
function resolveToRoman(level: number): string {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  return romans[level] ?? 'I';
}

export default function HeroPanel() {
  const roster = useGameStore((s) => s.roster);
  const selectedUid = useGameStore((s) => s.selectedHeroUid);
  const hero = roster.find((h) => h.uid === selectedUid);

  if (!hero) {
    return (
      <div className="dd-panel p-12 text-center">
        <p className="font-dd text-dd-textDim text-sm uppercase tracking-widest">
          选择一位英雄
        </p>
        <p className="text-dd-textDim text-xs mt-1">
          从名册中点选英雄查看详情
        </p>
      </div>
    );
  }

  const hpPercent = (hero.currentHp / hero.maxHp) * 100;
  const stressPercent = Math.min(100, hero.stress);
  const hpClass = hpPercent > 50 ? 'dd-hp-high' : hpPercent > 25 ? 'dd-hp-mid' : 'dd-hp-low';

  // 压力状态
  const isAfflicted = !!hero.affliction;
  const isVirtuous = !!hero.virtue;
  const stressOver100 = hero.stress >= 100;
  const affliction = getAfflictionById(hero.affliction ?? null);
  const virtue = getVirtueById(hero.virtue ?? null);

  return (
    <div className="dd-panel">
      {/* 英雄头部 */}
      <div className="dd-panel-header">
        <div className="flex items-center gap-3 normal-case">
          {/* 英雄肖像 */}
          <img
            src={`/assets/dd/heroes/${hero.classId}.png`}
            alt={getHeroName(hero.classId)}
            className="w-10 h-10 object-cover rounded-sm border border-dd-gold/30 bg-black/40"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex items-baseline gap-3">
            <span className={clsx('font-dd text-lg font-bold uppercase tracking-wide', `class-${hero.classId}`, isAfflicted && 'dd-text-blood')}>
              {getHeroName(hero.classId)}
            </span>
            <span className="text-dd-textMuted text-sm font-dd">
              {hero.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 normal-case">
          {/* 决心等级 — 金色徽章 */}
          <span className="dd-tag font-dd text-sm font-bold dd-text-gold leading-none">
            决心 {resolveToRoman(hero.resolveLevel)}
          </span>
          {/* 武器等级 — 铁色徽章 */}
          <span
            className="dd-tag font-dd text-xs leading-none"
            style={{ color: '#7a6a50' }}
          >
            武器 +{hero.weaponLevel}
          </span>
          {/* 护甲等级 — 铁色徽章 */}
          <span
            className="dd-tag font-dd text-xs leading-none"
            style={{ color: '#7a6a50' }}
          >
            护甲 +{hero.armorLevel}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* HP 和压力 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 生命值 */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs text-dd-textMuted uppercase tracking-wide">生命值</span>
              <span className="font-mono text-sm text-dd-text">
                {hero.currentHp}<span className="text-dd-textDim">/{hero.maxHp}</span>
              </span>
            </div>
            <div className="dd-bar" style={{ height: '12px' }}>
              <div className={clsx('dd-bar-fill', hpClass)} style={{ width: `${hpPercent}%` }} />
            </div>
          </div>
          {/* 压力 */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs text-dd-textMuted uppercase tracking-wide">压力</span>
              <span className={clsx('font-mono text-sm', stressOver100 ? 'dd-text-blood' : 'text-dd-text')}>
                {hero.stress}<span className="text-dd-textDim">/200</span>
              </span>
            </div>
            <div
              className="dd-bar"
              style={{
                height: '12px',
                ...(stressOver100 ? { animation: 'dd-torch-flicker 1s ease-in-out infinite', borderColor: '#c83030' } : {}),
              }}
            >
              <div
                className={clsx('dd-bar-fill dd-stress-fill', stressOver100 && 'dd-stress-overflow')}
                style={{ width: `${stressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 压力状态（崩溃/美德） */}
        {(isAfflicted || isVirtuous) && (
          <div>
            <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-widest font-dd">压力状态</div>
            {isAfflicted && affliction && (
              <div className="dd-panel p-3 space-y-1.5" style={{ borderColor: '#6b1818' }}>
                <div className="flex items-center gap-2">
                  <span className="dd-tag dd-tag-negative">崩溃</span>
                  <span className="font-dd text-sm dd-text-blood tracking-widest">{affliction.name}</span>
                </div>
                <div className="text-xs text-dd-text">{affliction.description}</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {affliction.effects.map((e, i) => (
                    <span key={i} className="dd-tag dd-tag-negative text-[10px]">{e}</span>
                  ))}
                </div>
              </div>
            )}
            {isVirtuous && virtue && (
              <div className="dd-panel p-3 space-y-1.5" style={{ borderColor: '#3d5a28' }}>
                <div className="flex items-center gap-2">
                  <span className="dd-tag dd-tag-positive">美德</span>
                  <span className="font-dd text-sm text-dd-gold tracking-widest">{virtue.name}</span>
                </div>
                <div className="text-xs text-dd-text">{virtue.description}</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {virtue.effects.map((e, i) => (
                    <span key={i} className="dd-tag dd-tag-positive text-[10px]">{e}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="dd-divider" />

        {/* 怪癖 */}
        <div>
          <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-widest font-dd">怪癖</div>
          {hero.quirks.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {hero.quirks.map((q) => {
                // 能查到中文名说明怪癖可识别，否则无法判断正负
                const known = getQuirkName(q) !== q;
                const positive = known && isPositiveQuirk(q);
                const isLocked = hero.lockedQuirks?.includes(q);
                return (
                  <span
                    key={q}
                    className={clsx(
                      'dd-tag',
                      isLocked
                        ? 'dd-tag-locked'
                        : positive
                          ? 'dd-tag-positive'
                          : known
                            ? 'dd-tag-negative'
                            : 'dd-tag',
                    )}
                  >
                    {isLocked && <span className="mr-1">★</span>}
                    {getQuirkName(q)}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-dd-textDim">— 无 —</span>
          )}
        </div>

        {/* 疾病 */}
        <div>
          <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-widest font-dd">疾病</div>
          {hero.diseases.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {hero.diseases.map((d) => (
                <span key={d} className="dd-tag dd-tag-negative">
                  {getDiseaseName(d)}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-dd-textDim">— 健康 —</span>
          )}
        </div>

        <div className="dd-divider" />

        {/* 战斗技能 */}
        <div>
          <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-widest font-dd">
            战斗技能 <span className="text-dd-textDim">({hero.skills.length}/7)</span>
          </div>
          {hero.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {hero.skills.map((s) => {
                const skillLevel = hero.skillLevels?.[s] ?? 0;
                return (
                  <span key={s} className="dd-tag">
                    {getSkillName(s)}
                    {skillLevel > 0 && (
                      <span className="ml-1 text-dd-gold">+{skillLevel}</span>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-dd-textDim">— 无 —</span>
          )}
        </div>

        {/* 饰品 */}
        <div>
          <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-widest font-dd">饰品</div>
          <div className="flex gap-2">
            <div className="flex-1 p-2 border border-dd-border rounded-[2px] text-center text-xs bg-dd-void shadow-dd-inset min-h-[36px] flex items-center justify-center">
              {hero.trinket1 ? (
                <span className="text-dd-text">{hero.trinket1}</span>
              ) : (
                <span className="text-dd-textDim">— 虚空 —</span>
              )}
            </div>
            <div className="flex-1 p-2 border border-dd-border rounded-[2px] text-center text-xs bg-dd-void shadow-dd-inset min-h-[36px] flex items-center justify-center">
              {hero.trinket2 ? (
                <span className="text-dd-text">{hero.trinket2}</span>
              ) : (
                <span className="text-dd-textDim">— 虚空 —</span>
              )}
            </div>
          </div>
        </div>

        {/* 扎营技能 */}
        {hero.campingSkills.length > 0 && (
          <>
            <div className="dd-divider" />
            <div>
              <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-widest font-dd">
                扎营技能 <span className="text-dd-textDim">({hero.campingSkills.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hero.campingSkills.map((s) => (
                  <span key={s} className="dd-tag">
                    {getSkillName(s)}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
