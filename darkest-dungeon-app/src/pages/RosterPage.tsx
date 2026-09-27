// 名册管理页 — 排序/筛选 + 深度操作（重命名/开除/怪癖锁定/履历）
// 对齐凡人 CharacterPage + CustomColumnsPage
import { useEffect, useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, StatBar, TextInput, SelectInput, Badge } from '@/ui';
import { useGameStore } from '@/stores/gameStore';
import { getHeroName, getSkillName, loadHeroes } from '@/data/ddLoader';
import { getQuirkName, isPositiveQuirk, getDiseaseName } from '@/stores/townStore';
import { wordZh } from '@/data/zhNames';
import { getAfflictionById, getVirtueById } from '@/gateway/stressSystem';
import { useTimelineStore } from '@/stores/timelineStore';
import { AppDialog } from '@/dialogs/AppDialog';
import { ConfirmDialog } from '@/dialogs/ConfirmDialog';
import { toast } from '@/ui/Extras';
import type { HeroData, HeroInstance } from '@/types';
import clsx from 'clsx';

type SortKey = 'resolve' | 'stress' | 'hp' | 'class';
type ClassFilter = 'all' | string;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export function RosterPage({ onBack }: { onBack?: () => void }) {
  const roster = useGameStore((s) => s.roster);
  const updateHero = useGameStore((s) => s.updateHero);
  const removeHero = useGameStore((s) => s.removeHero);

  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<ClassFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('resolve');
  const [selected, setSelected] = useState<HeroInstance | null>(null);
  const [renaming, setRenaming] = useState<HeroInstance | null>(null);
  const [newName, setNewName] = useState('');
  const [dismissing, setDismissing] = useState<HeroInstance | null>(null);
  const [heroDataCache, setHeroDataCache] = useState<Record<string, HeroData>>({});

  useEffect(() => {
    void loadHeroes().then((hs) => {
      const map: Record<string, HeroData> = {};
      for (const h of hs) map[h.id] = h;
      setHeroDataCache(map);
    });
  }, []);

  const classes = useMemo(() => [...new Set(roster.map((h) => h.classId))].sort(), [roster]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = roster.filter((h) => {
      if (classFilter !== 'all' && h.classId !== classFilter) return false;
      if (q && !`${h.name} ${getHeroName(h.classId)}`.toLowerCase().includes(q)) return false;
      return true;
    });
    list.sort((a, b) => {
      switch (sortKey) {
        case 'resolve': return b.resolveLevel - a.resolveLevel;
        case 'stress': return b.stress - a.stress;
        case 'hp': return b.currentHp / b.maxHp - a.currentHp / a.maxHp;
        case 'class': return a.classId.localeCompare(b.classId);
        default: return 0;
      }
    });
    return list;
  }, [roster, query, classFilter, sortKey]);

  const heroChronicle = useMemo(
    () => useTimelineStore.getState().entries.filter((e) => e.category === 'hero' && (e.detail ?? '').includes(selected?.uid ?? '__none__')),
    [selected]
  );

  const confirmRename = () => {
    if (!renaming || !newName.trim()) return;
    updateHero(renaming.uid, { name: newName.trim() });
    setSelected((s) => (s && s.uid === renaming.uid ? { ...s, name: newName.trim() } : s));
    toast(`已重命名为「${newName.trim()}」`, 'success');
    setRenaming(null);
  };

  const toggleQuirkLock = (quirkId: string) => {
    if (!selected) return;
    const locked = new Set(selected.lockedQuirks ?? []);
    if (locked.has(quirkId)) locked.delete(quirkId);
    else locked.add(quirkId);
    updateHero(selected.uid, { lockedQuirks: [...locked] });
    setSelected((s) => (s ? { ...s, lockedQuirks: [...locked] } : s));
  };

  const confirmDismiss = () => {
    if (!dismissing) return;
    removeHero(dismissing.uid);
    toast(`${getHeroName(dismissing.classId)} ${dismissing.name} 已离开名册`, 'error');
    if (selected?.uid === dismissing.uid) setSelected(null);
    setDismissing(null);
  };

  const skills = selected ? (heroDataCache[selected.classId]?.skills ?? []).filter((s) => !s.is_move) : [];
  const uniqueSkills = [...new Set(skills.map((s) => s.id))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>名册管理</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 筛选与排序" extra={`${filtered.length}/${roster.length} 名英雄`} />
        <div className="p-3 flex flex-wrap items-center gap-2">
          <TextInput className="w-44" value={query} onChange={setQuery} placeholder="搜索姓名/职业…" />
          <SelectInput
            value={classFilter}
            onChange={setClassFilter}
            options={[{ value: 'all', label: '全部职业' }, ...classes.map((c) => ({ value: c, label: getHeroName(c) }))]}
          />
          <SelectInput
            value={sortKey}
            onChange={(v) => setSortKey(v as SortKey)}
            options={[
              { value: 'resolve', label: '按抗压等级' },
              { value: 'stress', label: '按压力' },
              { value: 'hp', label: '按生命比例' },
              { value: 'class', label: '按职业' },
            ]}
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 名单 */}
        <Panel className="lg:col-span-1">
          <PanelHeader title="◆ 名单" />
          <div className="max-h-[65vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <EmptyState text="无匹配英雄" />
            ) : (
              filtered.map((h) => (
                <button
                  key={h.uid}
                  onClick={() => setSelected(h)}
                  className={clsx(
                    'w-full text-left px-3 py-2 border-b border-dd-gold/5 flex items-center gap-2 hover:bg-white/5 transition-colors',
                    selected?.uid === h.uid && 'bg-dd-gold/10'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={clsx('text-xs font-bold', `class-${h.classId}`)}>{getHeroName(h.classId)}</span>
                      <span className="text-[10px] text-dd-gold">Lv.{h.resolveLevel}</span>
                      {h.affliction && <Badge tone="red">崩溃</Badge>}
                      {h.virtue && <Badge tone="green">美德</Badge>}
                    </div>
                    <div className="text-[10px] text-dd-textMuted truncate">{h.name}</div>
                  </div>
                  <div className="w-16 shrink-0 space-y-0.5">
                    <StatBar value={h.currentHp} max={h.maxHp} height={3} color="#7cc27c" dangerBelow={25} />
                    <StatBar value={100 - h.stress} max={100} height={3} color="#c8a038" dangerBelow={40} />
                  </div>
                </button>
              ))
            )}
          </div>
        </Panel>

        {/* 详情 */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title={
              selected ? (
                <span className="flex items-center gap-2">
                  <img src={`/assets/dd/heroes/${selected.classId}.png`} alt="" className="w-8 h-8 object-cover rounded-sm border border-dd-gold/30" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span>◆ {getHeroName(selected.classId)} · {selected.name}</span>
                </span>
              ) : '◆ 详情'
            }
            extra={selected ? `决心 ${ROMAN[selected.resolveLevel] ?? 'I'} · 武器+${selected.weaponLevel} · 护甲+${selected.armorLevel}` : '未选择'}
          />
          {!selected ? (
            <EmptyState text="从左侧选择英雄查看详情" />
          ) : (
            <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* 状态 */}
              <div className="grid grid-cols-2 gap-3">
                <StatBar label="生命" value={selected.currentHp} max={selected.maxHp} color="#7cc27c" dangerBelow={25} showText />
                <StatBar label="压力" value={selected.stress} max={200} color="#c8a038" dangerBelow={50} showText />
              </div>
              {selected.affliction && (
                <div className="text-xs text-red-400 bg-red-400/5 border border-red-400/20 rounded-sm px-2 py-1.5">
                  崩溃「{getAfflictionById(selected.affliction)?.name ?? selected.affliction}」：{getAfflictionById(selected.affliction)?.description ?? ''}
                </div>
              )}
              {selected.virtue && (
                <div className="text-xs text-emerald-400 bg-emerald-400/5 border border-emerald-400/20 rounded-sm px-2 py-1.5">
                  美德「{getVirtueById(selected.virtue)?.name ?? selected.virtue}」
                </div>
              )}
              {selected.isDeathsDoor && (
                <div className="text-xs text-red-400">⚠ 处于死亡之门</div>
              )}

              {/* 操作 */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => { setNewName(selected.name); setRenaming(selected); }}
                >
                  重命名
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDismissing(selected)}>
                  开除（永久）
                </Button>
              </div>

              {/* 怪癖 */}
              <div>
                <div className="text-xs text-dd-gold tracking-widest mb-1.5">怪癖（{selected.quirks.length}）</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.quirks.map((q) => {
                    const locked = (selected.lockedQuirks ?? []).includes(q);
                    return (
                      <button
                        key={q}
                        onClick={() => toggleQuirkLock(q)}
                        title={locked ? '点击解除锁定' : '点击锁定（疗养院不会移除）'}
                        className={clsx(
                          'px-2 py-1 text-[10px] border rounded-sm transition-colors flex items-center gap-1',
                          isPositiveQuirk(q)
                            ? 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10'
                            : 'border-red-400/40 text-red-300 hover:bg-red-400/10',
                          locked && 'ring-1 ring-dd-gold'
                        )}
                      >
                        {getQuirkName(q)}
                        {locked && <span className="text-dd-gold">🔒</span>}
                      </button>
                    );
                  })}
                  {selected.quirks.length === 0 && <span className="text-[11px] text-dd-textDim">无怪癖</span>}
                </div>
              </div>

              {/* 疾病 */}
              {selected.diseases.length > 0 && (
                <div>
                  <div className="text-xs text-red-400 tracking-widest mb-1.5">疾病</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.diseases.map((d) => (
                      <span key={d} className="px-2 py-1 text-[10px] border border-red-400/40 text-red-300 rounded-sm">
                        {getDiseaseName(d)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 技能 */}
              <div>
                <div className="text-xs text-dd-gold tracking-widest mb-1.5">战斗技能（{uniqueSkills.length}）</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {uniqueSkills.map((sid) => (
                    <div key={sid} className="text-[11px] px-2 py-1 bg-black/20 border border-dd-gold/10 rounded-sm flex justify-between">
                      <span className="text-dd-text">{getSkillName(sid) === sid.replace(/_/g, ' ') ? wordZh(sid) : getSkillName(sid)}</span>
                      <span className="text-dd-textDim">
                        {(() => { const lv = selected.skillLevels?.[sid] ?? 0; return lv > 0 ? `Lv.${lv}` : ''; })()}
                      </span>
                    </div>
                  ))}
                  {uniqueSkills.length === 0 && <span className="text-[11px] text-dd-textDim">无技能数据</span>}
                </div>
              </div>

              {/* 履历 */}
              <div>
                <div className="text-xs text-dd-gold tracking-widest mb-1.5">履历</div>
                {heroChronicle.length === 0 ? (
                  <div className="text-[11px] text-dd-textDim">暂无履历记录（编年史中与该英雄相关的事件将显示于此）</div>
                ) : (
                  heroChronicle.slice(-5).map((e) => (
                    <div key={e.id} className="text-[11px] text-dd-textMuted py-0.5">第{e.week}周 · {e.title}</div>
                  ))
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* 重命名对话框 */}
      <AppDialog
        open={renaming !== null}
        title="重命名英雄"
        onClose={() => setRenaming(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(null)}>取消</Button>
            <Button variant="primary" onClick={confirmRename} disabled={!newName.trim()}>保存</Button>
          </div>
        }
      >
        <TextInput className="w-full" value={newName} onChange={setNewName} placeholder="新名字…" />
      </AppDialog>

      {/* 开除确认 */}
      <ConfirmDialog
        open={dismissing !== null}
        title="开除英雄"
        message={`${dismissing ? getHeroName(dismissing.classId) : ''} ${dismissing?.name ?? ''} 将被永久开除，其等级、怪癖与装备全部丢失。此操作不可撤销！`}
        confirmText="永久开除"
        danger
        onConfirm={confirmDismiss}
        onCancel={() => setDismissing(null)}
      />
    </div>
  );
}
