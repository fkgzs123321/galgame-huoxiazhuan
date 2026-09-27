// 模组浏览页 — mods 目录索引（含 NSFW 标记与英雄肖像预览）
import { useEffect, useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, TextInput, Badge } from '@/ui';
import type { ModIndex, ModEntry } from '@/types';

export function ModsPage({ onBack }: { onBack?: () => void }) {
  const [index, setIndex] = useState<ModIndex | null>(null);
  const [query, setQuery] = useState('');
  const [nsfwFilter, setNsfwFilter] = useState<'all' | 'sfw' | 'nsfw'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'mods' | 'dlc'>('all');

  useEffect(() => {
    void import('@/data/dd-db/mod_index.json').then((d) => {
      setIndex(d.default as ModIndex);
    });
  }, []);

  const stats = useMemo(() => {
    if (!index) return { total: 0, heroes: 0, monsters: 0, nsfw: 0 };
    return {
      total: index.total,
      heroes: index.mods.reduce((s, m) => s + (m.heroCount ?? 0), 0),
      monsters: index.mods.reduce((s, m) => s + (m.monsterCount ?? 0), 0),
      nsfw: index.mods.filter((m) => m.nsfw).length,
      dlc: index.mods.filter((m) => m.source === 'dlc').length,
    };
  }, [index]);

  const filtered = useMemo(() => {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    return index.mods.filter((m) => {
      if (nsfwFilter === 'nsfw' && !m.nsfw) return false;
      if (nsfwFilter === 'sfw' && m.nsfw) return false;
      if (sourceFilter === 'mods' && m.source !== 'mods') return false;
      if (sourceFilter === 'dlc' && m.source !== 'dlc') return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [index, query, nsfwFilter, sourceFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>模组库</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel>
          <div className="p-3 text-center">
            <div className="text-dd-gold font-mono text-xl">{stats.total}</div>
            <div className="text-[10px] text-dd-textDim">已索引模组</div>
          </div>
        </Panel>
        <Panel>
          <div className="p-3 text-center">
            <div className="text-dd-gold font-mono text-xl">{stats.heroes}</div>
            <div className="text-[10px] text-dd-textDim">模组英雄职业</div>
          </div>
        </Panel>
        <Panel>
          <div className="p-3 text-center">
            <div className="text-dd-gold font-mono text-xl">{stats.monsters}</div>
            <div className="text-[10px] text-dd-textDim">模组怪物</div>
          </div>
        </Panel>
        <Panel>
          <div className="p-3 text-center">
            <div className="text-red-400 font-mono text-xl">{stats.nsfw}</div>
            <div className="text-[10px] text-dd-textDim">成人内容（{stats.dlc} 项增强包）</div>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="◆ 检索" extra={`${filtered.length} 个模组`} />
        <div className="p-3 flex flex-wrap items-center gap-2">
          <TextInput className="w-56" value={query} onChange={setQuery} placeholder="搜索模组名…" />
          <span className="text-[10px] text-dd-textDim">来源:</span>
          {(['all', 'mods', 'dlc'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={`px-2.5 py-1 text-[10px] tracking-wider border rounded-sm transition-colors ${
                sourceFilter === f
                  ? 'text-dd-gold border-dd-gold'
                  : 'text-dd-textMuted border-dd-textMuted/30 hover:text-dd-text'
              }`}
            >
              {f === 'all' ? '全部' : f === 'mods' ? '模组' : '增强包'}
            </button>
          ))}
          {(['all', 'sfw', 'nsfw'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setNsfwFilter(f)}
              className={`px-2.5 py-1 text-[10px] tracking-wider border rounded-sm transition-colors ${
                nsfwFilter === f
                  ? 'text-dd-gold border-dd-gold'
                  : 'text-dd-textMuted border-dd-textMuted/30 hover:text-dd-text'
              }`}
            >
              {f === 'all' ? '全部' : f === 'sfw' ? '非成人' : '成人内容'}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <Panel className="md:col-span-3"><EmptyState text="无匹配模组" /></Panel>
        ) : (
          filtered.map((m) => (
            <Panel key={m.name}>
              <div className="p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-dd-text font-medium break-all">{m.name}</span>
                  <Badge tone={m.source === 'dlc' ? 'gray' : 'gold'}>{m.source === 'dlc' ? '增强包' : '模组'}</Badge>
                  {m.nsfw && <Badge tone="red">NSFW</Badge>}
                </div>
                <div className="text-[10px] text-dd-textDim mt-1">
                  英雄 {m.heroCount} · 怪物 {m.monsterCount} · 文件 {m.fileCount}
                </div>
                {(m.heroClasses?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(m.heroClasses ?? []).slice(0, 8).map((h) => (
                      <img
                        key={h}
                        src={`/assets/dd/modheroes/${h}.png`}
                        alt={h}
                        title={h}
                        className="w-8 h-8 object-cover rounded-sm border border-dd-gold/20 bg-black/40"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ))}
                    {(m.heroClasses?.length ?? 0) > 8 && (
                      <span className="text-[9px] text-dd-textDim self-center">+{(m.heroClasses?.length ?? 0) - 8}</span>
                    )}
                  </div>
                )}
              </div>
            </Panel>
          ))
        )}
      </div>
    </div>
  );
}
