// 原著指导页 — DD 世界观知识库（区域/派系/古神/英雄人物志）
// 对齐凡人 OriginalCanonGuidancePage
import { useEffect, useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, Tabs, Badge } from '@/ui';
import { loadWorldLore, loadHeroProfiles, type WorldLore, type HeroProfile } from '@/data/worldData';
import { getHeroName } from '@/data/ddLoader';

type TabKey = 'regions' | 'factions' | 'eldritch' | 'heroes' | 'core';

export function CanonPage({ onBack }: { onBack?: () => void }) {
  const [lore, setLore] = useState<WorldLore | null>(null);
  const [profiles, setProfiles] = useState<HeroProfile[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('regions');
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  useEffect(() => {
    void loadWorldLore().then(setLore);
    void loadHeroProfiles().then(setProfiles);
  }, []);

  const region = useMemo(
    () => lore?.regions.find((r) => r.id === selectedRegion) ?? lore?.regions[0] ?? null,
    [lore, selectedRegion]
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'regions', label: '区域' },
    { key: 'factions', label: '势力' },
    { key: 'eldritch', label: '古神与先祖' },
    { key: 'heroes', label: '英雄人物志' },
    { key: 'core', label: '核心机制' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>原著指导 · 世界知识</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <div className="flex flex-wrap gap-1 px-3 pt-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-xs tracking-widest border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'text-dd-gold border-dd-gold'
                  : 'text-dd-textMuted border-transparent hover:text-dd-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'regions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                {(lore?.regions ?? []).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRegion(r.id)}
                    className={`w-full text-left px-3 py-2 text-xs border rounded-sm transition-colors ${
                      region?.id === r.id
                        ? 'border-dd-gold bg-dd-gold/10 text-dd-gold'
                        : 'border-dd-gold/15 text-dd-textMuted hover:border-dd-gold/40'
                    }`}
                  >
                    {r.name} <span className="text-[10px] text-dd-textDim ml-1">{r.alias}</span>
                  </button>
                ))}
              </div>
              <div className="lg:col-span-2">
                {region ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-dd-gold font-dd">{region.name}</span>
                      <Badge>{region.alias}</Badge>
                    </div>
                    <p className="text-xs text-dd-textMuted leading-relaxed">{region.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-black/20 border border-dd-gold/10 rounded-sm p-2">
                        <div className="text-[10px] text-dd-textDim mb-1">常见敌人</div>
                        <div className="text-dd-text">{region.enemies.join('、')}</div>
                      </div>
                      <div className="bg-black/20 border border-dd-gold/10 rounded-sm p-2">
                        <div className="text-[10px] text-dd-textDim mb-1">首领</div>
                        <div className="text-dd-text">{region.bosses.join('、')}</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-dd-textDim">战利品主题：{region.lootTheme}</div>
                  </div>
                ) : (
                  <EmptyState text="暂无区域数据" />
                )}
              </div>
            </div>
          )}

          {activeTab === 'factions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(lore?.factions ?? []).map((f) => (
                <div key={f.id} className="bg-black/20 border border-dd-gold/10 rounded-sm p-3">
                  <div className="text-sm text-dd-gold mb-1">{f.name}</div>
                  <div className="text-[11px] text-dd-textMuted leading-relaxed">{f.description}</div>
                </div>
              ))}
              {!lore?.factions?.length && <EmptyState text="暂无势力数据" />}
            </div>
          )}

          {activeTab === 'eldritch' && lore && (
            <div className="space-y-4">
              <div className="bg-black/20 border border-red-400/20 rounded-sm p-4">
                <div className="text-sm text-red-300 mb-1">◆ {lore.eldritch.name}</div>
                <p className="text-xs text-dd-textMuted leading-relaxed">{lore.eldritch.description}</p>
                <div className="text-[11px] text-dd-textDim mt-2">
                  信徒：{lore.eldritch.worshipers.join('、')} · 遗物：{lore.eldritch.artifacts.join('、')}
                </div>
              </div>
              <div className="bg-black/20 border border-dd-gold/20 rounded-sm p-4">
                <div className="text-sm text-dd-gold mb-1">◆ {lore.ancestor.name}</div>
                <p className="text-xs text-dd-textMuted leading-relaxed">{lore.ancestor.description}</p>
                <div className="mt-2 space-y-1">
                  {lore.ancestor.quotes.map((q, i) => (
                    <div key={i} className="text-[11px] italic text-dd-textDim">「{q}」</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'heroes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {profiles.map((p) => (
                <div key={p.id} className="bg-black/20 border border-dd-gold/10 rounded-sm p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-dd-gold">{getHeroName(p.id)}</span>
                    <span className="text-[10px] text-dd-textDim">{p.title}</span>
                  </div>
                  <div className="text-[11px] text-dd-textMuted mt-1.5 leading-relaxed">{p.backstory}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(p.tags ?? []).map((t) => (
                      <span key={t} className="text-[9px] text-dd-textDim border border-dd-textDim/30 rounded-sm px-1 py-0.5">{t}</span>
                    ))}
                  </div>
                  {p.flavor && <div className="text-[10px] italic text-dd-gold/70 mt-1.5">{p.flavor}</div>}
                </div>
              ))}
              {profiles.length === 0 && <EmptyState text="暂无英雄人物志" />}
            </div>
          )}

          {activeTab === 'core' && lore && (
            <div className="space-y-2">
              {Object.entries(lore.gameplayCore).map(([k, v]) => (
                <div key={k} className="bg-black/20 border border-dd-gold/10 rounded-sm p-3">
                  <span className="text-xs text-dd-gold mr-2">{k}</span>
                  <span className="text-[11px] text-dd-textMuted">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
