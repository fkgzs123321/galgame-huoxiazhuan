// 饰品图鉴 — 全量 490 件饰品浏览/筛选（对齐凡人 WorkshopPage 的数据深度）
import { useEffect, useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, TextInput, SelectInput, Badge } from '@/ui';
import { loadTrinkets } from '@/data/ddLoader';
import type { TrinketEntry } from '@/types';
import { useInventoryStore } from '@/stores/inventoryStore';
import { getHeroName } from '@/data/ddLoader';
import { trinketZh, buffIdZh } from '@/data/zhNames';

const RARITY_STYLE: Record<string, { label: string; tone: 'gold' | 'red' | 'green' | 'gray' }> = {
  very_common: { label: '常见', tone: 'gray' },
  common: { label: '普通', tone: 'gray' },
  uncommon: { label: '罕见', tone: 'green' },
  rare: { label: '稀有', tone: 'gold' },
  very_rare: { label: '极稀有', tone: 'gold' },
  ancestor: { label: '先祖', tone: 'red' },
  crimson: { label: '猩红', tone: 'red' },
  trophy: { label: '战利品', tone: 'red' },
  crow: { label: '乌鸦', tone: 'gray' },
  'very_rare_cc': { label: '庭院极稀有', tone: 'red' },
};

export function TrinketCodexPage({ onBack }: { onBack?: () => void }) {
  const [entries, setEntries] = useState<TrinketEntry[]>([]);
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [selected, setSelected] = useState<TrinketEntry | null>(null);
  const owned = useInventoryStore((s) => s.trinketInventory);

  useEffect(() => {
    void loadTrinkets().then((d) => setEntries(d.entries));
  }, []);

  const rarities = useMemo(() => [...new Set(entries.map((e) => e.rarity))].sort(), [entries]);
  const classes = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) for (const c of e.heroClassRequirements ?? []) s.add(c);
    return [...s].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (rarity !== 'all' && e.rarity !== rarity) return false;
      if (classFilter !== 'all' && !(e.heroClassRequirements ?? []).includes(classFilter)) return false;
      if (q && !`${trinketZh(e.id)} ${e.id} ${e.originDungeon}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, query, rarity, classFilter]);

  const ownedIds = useMemo(() => new Set(owned.map((t) => t.id)), [owned]);
  const rarityMeta = (r: string) => RARITY_STYLE[r] ?? { label: r, tone: 'gray' as const };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>饰品图鉴</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 检索" extra={`${entries.length} 件 · 持有 ${owned.length} 件`} />
        <div className="p-3 flex flex-wrap gap-2">
          <TextInput className="w-48" value={query} onChange={setQuery} placeholder="搜索饰品 ID/来源…" />
          <SelectInput
            value={rarity}
            onChange={setRarity}
            options={[
              { value: 'all', label: '全部稀有度' },
              ...rarities.map((r) => ({ value: r, label: `${rarityMeta(r).label}（${r}）` })),
            ]}
          />
          <SelectInput
            value={classFilter}
            onChange={setClassFilter}
            options={[
              { value: 'all', label: '全部职业' },
              ...classes.map((c) => ({ value: c, label: getHeroName(c) })),
            ]}
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-1">
          <PanelHeader title="◆ 列表" extra={`${filtered.length} 件`} />
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <EmptyState text="无匹配饰品" />
            ) : (
              filtered.map((e) => {
                const meta = rarityMeta(e.rarity);
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={`w-full text-left px-3 py-1.5 border-b border-dd-gold/5 flex items-center gap-2 text-xs hover:bg-white/5 ${
                      selected?.id === e.id ? 'bg-dd-gold/10' : ''
                    }`}
                  >
                    <span className="text-dd-text truncate flex-1">{trinketZh(e.id)}</span>
                    {ownedIds.has(e.id) && <span className="text-[9px] text-emerald-400">持有</span>}
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="◆ 详情" extra={selected ? trinketZh(selected.id) : '未选择'} />
          {!selected ? (
            <EmptyState text="从左侧选择饰品查看详情" />
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-dd-gold font-dd">{trinketZh(selected.id)}</span>
                <Badge tone={rarityMeta(selected.rarity).tone}>{rarityMeta(selected.rarity).label}</Badge>
                {ownedIds.has(selected.id) && <Badge tone="green">背包持有</Badge>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-black/20 border border-dd-gold/10 rounded-sm p-2">
                  <div className="text-[10px] text-dd-textDim mb-1">价格</div>
                  <div className="text-dd-gold font-mono">{Number(selected.price).toLocaleString()}g</div>
                </div>
                <div className="bg-black/20 border border-dd-gold/10 rounded-sm p-2">
                  <div className="text-[10px] text-dd-textDim mb-1">持有上限</div>
                  <div className="text-dd-text font-mono">{selected.limit ?? 0}</div>
                </div>
                <div className="bg-black/20 border border-dd-gold/10 rounded-sm p-2 col-span-2">
                  <div className="text-[10px] text-dd-textDim mb-1">来源区域</div>
                  <div className="text-dd-text">{selected.originDungeon || '通用/任务'}</div>
                </div>
              </div>

              {(selected.heroClassRequirements ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] text-dd-textDim mb-1">职业限制</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.heroClassRequirements.map((c) => (
                      <span key={c} className="text-[10px] text-dd-gold border border-dd-gold/30 rounded-sm px-1.5 py-0.5">
                        {getHeroName(c)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] text-dd-textDim mb-1">效果 Buff（{selected.buffs?.length ?? 0}）</div>
                <div className="space-y-1">
                  {(selected.buffs ?? []).map((b, i) => (
                    <div key={i} className="text-[11px] text-dd-textMuted px-2 py-1 bg-black/20 border border-dd-gold/10 rounded-sm">
                      {buffIdZh(String(b))}
                    </div>
                  ))}
                  {(selected.buffs ?? []).length === 0 && (
                    <div className="text-[11px] text-dd-textDim">（无 Buff 数据）</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
