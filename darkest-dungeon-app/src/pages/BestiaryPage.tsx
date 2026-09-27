// 怪物图鉴页 — 全怪物数据/技能/抗性浏览（对齐凡人 BeastPage）
import { useEffect, useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, TextInput, SelectInput } from '@/ui';
import { loadMonsters } from '@/data/ddLoader';
import type { MonsterData } from '@/types';
import { fmtPct } from '@/utils/format';
import { monsterZh, effectZh, wordZh } from '@/data/zhNames';

// 怪物技能 id → 中文（剥离尾部变体字母后词根翻译）
function skillIdZh(id: string): string {
  const cleaned = id.replace(/_(?:[a-eA-E])$/g, '');
  return wordZh(cleaned);
}

const RESIST_ZH: Record<string, string> = {
  stun: '眩晕', move: '位移', bleed: '流血', poison: '腐蚀', disease: '疾病',
  debuff: '减益', death_blow: '死亡一击', deathblow: '死亡一击', trap: '陷阱',
  blight: '腐蚀', knockback: '击退', pull: '拉拽', shuffle: '乱序',
};

export function BestiaryPage({ onBack }: { onBack?: () => void }) {
  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [selected, setSelected] = useState<MonsterData | null>(null);

  useEffect(() => {
    void loadMonsters().then(setMonsters);
  }, []);

  const classes = useMemo(
    () => [...new Set(monsters.map((m) => m.monsterClass))].sort(),
    [monsters]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monsters.filter((m) => {
      if (classFilter !== 'all' && m.monsterClass !== classFilter) return false;
      if (q && !`${m.id} ${m.name} ${m.monsterClass}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [monsters, query, classFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>怪物图鉴</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 检索" extra={`${monsters.length} 个变体`} />
        <div className="p-3 flex flex-wrap gap-2">
          <TextInput
            className="w-56"
            value={query}
            onChange={setQuery}
            placeholder="搜索怪物名/类别…"
          />
          <SelectInput
            value={classFilter}
            onChange={setClassFilter}
            options={[
              { value: 'all', label: '全部分类' },
              ...classes.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-1">
          <PanelHeader title="◆ 列表" extra={`${filtered.length} 条`} />
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <EmptyState text="无匹配怪物" />
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={`w-full text-left px-3 py-1.5 border-b border-dd-gold/5 flex items-center gap-2 text-xs hover:bg-white/5 ${
                    selected?.id === m.id ? 'bg-dd-gold/10' : ''
                  }`}
                >
                  <span className="text-dd-text truncate flex-1">{monsterZh(m.id)}</span>
                  <span className="text-[10px] text-dd-textDim">{monsterZh(m.monsterClass)}</span>
                  <span className="text-[10px] text-dd-gold">HP {m.maxHp}</span>
                </button>
              ))
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="◆ 详情" extra={selected ? selected.id : '未选择'} />
          {selected ? (
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                <span className="text-dd-textMuted">HP <b className="text-dd-text">{selected.maxHp}</b></span>
                <span className="text-dd-textMuted">闪避 <b className="text-dd-text">{fmtPct(selected.dodge)}</b></span>
                <span className="text-dd-textMuted">防护 <b className="text-dd-text">{fmtPct(selected.prot)}</b></span>
                <span className="text-dd-textMuted">速度 <b className="text-dd-text">{selected.spd}</b></span>
                <span className="text-dd-textMuted">体型 <b className="text-dd-text">{selected.size}</b></span>
                <span className="text-dd-textMuted">类型 <b className="text-dd-text">{selected.enemyType ?? '未知'}</b></span>
              </div>

              <div>
                <div className="text-xs text-dd-gold tracking-widest mb-1.5">抗性</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                  {Object.entries(selected.resistances).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px] px-2 py-0.5 bg-black/20 rounded">
                      <span className="text-dd-textDim">{RESIST_ZH[k] ?? k}</span>
                      <span className="text-dd-text">{fmtPct(v as number)}</span>
                    </div>
                  ))}
                  {Object.keys(selected.resistances).length === 0 && (
                    <span className="text-dd-textDim text-[11px]">（无抗性数据）</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-dd-gold tracking-widest mb-1.5">技能（{selected.skills.length}）</div>
                <div className="space-y-1.5">
                  {selected.skills.map((s, i) => (
                    <div key={i} className="text-[11px] px-2 py-1.5 bg-black/20 rounded border border-dd-gold/10">
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="text-dd-gold">{skillIdZh(String(s.id))}</span>
                        {s.type && <span className="text-dd-textDim">{s.type === 'melee' ? '近战' : s.type === 'ranged' ? '远程' : s.type}</span>}
                        {s.atk !== undefined && <span className="text-dd-textMuted">命中 {fmtPct(s.atk as number)}</span>}
                        {s.dmg_min !== undefined && s.dmg_max !== undefined && (
                          <span className="text-dd-textMuted">伤害 {s.dmg_min}~{s.dmg_max}</span>
                        )}
                        {s.crit !== undefined && <span className="text-dd-textMuted">暴击 {fmtPct(s.crit as number)}</span>}
                        {s.launch_raw && <span className="text-dd-textDim">发动 {s.launch_raw}</span>}
                        {s.target_raw && <span className="text-dd-textDim">目标 {s.target_raw}</span>}
                      </div>
                      {Array.isArray(s.effects) && s.effects.length > 0 && (
                        <div className="text-[10px] text-dd-textMuted mt-1">
                          效果：{s.effects.map((e) => effectZh(String(e))).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                  {selected.skills.length === 0 && <span className="text-dd-textDim text-[11px]">（无技能数据）</span>}
                </div>
              </div>

              {selected.battleModifiers && Object.keys(selected.battleModifiers).length > 0 && (
                <div>
                  <div className="text-xs text-dd-gold tracking-widest mb-1.5">战斗修正</div>
                  <pre className="text-[10px] text-dd-textMuted whitespace-pre-wrap bg-black/20 p-2 rounded">
                    {JSON.stringify(selected.battleModifiers, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <EmptyState text="从左侧选择怪物查看详情" />
          )}
        </Panel>
      </div>
    </div>
  );
}
