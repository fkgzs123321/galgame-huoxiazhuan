// LLM 调试台 — Prompt/Lore/响应 Trace 可视化（对齐凡人 LLMDebugPage）
import { useEffect, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState } from '@/ui';
import { traceHub, type TraceEntry } from '@/utils/trace';
import { assemblePlan, mod, planSummary } from '@/prompts/presetAssembler';
import { scheduleLore, formatLoreBlock, extractKeywords } from '@/gateway/loreScheduler';

export function LLMDebugPage({ onBack }: { onBack?: () => void }) {
  const [, force] = useState(0);
  const [selected, setSelected] = useState<TraceEntry | null>(null);
  const [probeText, setProbeText] = useState('庄园的火把熄灭了，遗迹深处的低语越来越近…');
  const [probeResult, setProbeResult] = useState<string>('');

  useEffect(() => {
    const unsub = traceHub.subscribe(() => force((n) => n + 1));
    return unsub;
  }, []);

  const traces = traceHub.all().slice(-100).reverse();

  // 组装预览：用预设组装器生成一条示例叙事 Prompt
  const demoPlan = assemblePlan(
    [
      mod('system', 'system', '世界观基调', '你是《暗黑地牢》的旁白叙事者，文风哥特压抑。', 40),
      mod('facts', 'user', '事实清单', '【地牢事实】区域：遗迹；火把：黑暗（20）\n【事件】走廊尽头传来铁链拖拽的声音。', 60),
      mod('lore', 'context', '世界书条目', formatLoreBlock(scheduleLore(probeText, { recordHits: false })) || '（无命中条目）', 120),
      mod('instruction', 'user', '输出指令', '请用旁白描写这一时刻的氛围与队伍的处境。', 30),
    ],
    4000
  );

  const runProbe = () => {
    const hits = scheduleLore(probeText);
    const lines = [
      `关键词（${extractKeywords(probeText).length} 个）：${extractKeywords(probeText).slice(0, 12).join('、')}`,
      `世界书命中：${hits.length} 条`,
      ...hits.map((h) => `  - ${h.entry.title}（触发：${h.keywords.join('、') || '常驻'}）`),
      '',
      formatLoreBlock(hits) || '（无注入内容）',
    ];
    setProbeResult(lines.join('\n'));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>LLM 调试台</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 世界书命中探针" extra="Lore Scheduler 实测" />
        <div className="p-4 space-y-3">
          <textarea
            value={probeText}
            onChange={(e) => setProbeText(e.target.value)}
            rows={2}
            className="w-full bg-black/30 border border-dd-gold/25 text-sm px-2 py-1.5 outline-none focus:border-dd-gold/60"
          />
          <Button variant="primary" onClick={runProbe}>运行探针</Button>
          {probeResult && (
            <pre className="text-xs text-dd-textMuted whitespace-pre-wrap bg-black/30 p-3 rounded border border-dd-gold/10 max-h-56 overflow-y-auto">{probeResult}</pre>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 组装预览" extra={planSummary(demoPlan)} />
        <pre className="p-3 text-xs text-dd-textMuted whitespace-pre-wrap bg-black/30 max-h-48 overflow-y-auto border-t border-dd-gold/10">
          {demoPlan.text}
        </pre>
      </Panel>

      <Panel>
        <PanelHeader title="◆ Trace 流" extra={`${traces.length} 条（内存环形缓冲）`} />
        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[50vh] overflow-hidden">
          <div className="overflow-y-auto border-r border-dd-gold/10">
            {traces.length === 0 ? (
              <EmptyState text="暂无 Trace（进行游戏/调用导演后出现）" />
            ) : (
              traces.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left px-3 py-1.5 border-b border-dd-gold/5 flex gap-2 text-xs hover:bg-white/5 ${
                    selected?.id === t.id ? 'bg-dd-gold/10' : ''
                  }`}
                >
                  <span className="shrink-0 text-dd-gold">{traceKindLabel(t.kind)}</span>
                  <span className="text-dd-text truncate">{t.label}</span>
                  {t.durationMs !== undefined && (
                    <span className="ml-auto shrink-0 text-dd-textDim font-mono">{t.durationMs}ms</span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="overflow-y-auto">
            {selected ? (
              <div className="p-3 space-y-2">
                <div className="text-xs text-dd-gold tracking-wider">{selected.label}</div>
                <div className="text-[10px] text-dd-textDim font-mono">
                  {new Date(selected.time).toLocaleTimeString('zh-CN', { hour12: false })}
                  {selected.durationMs !== undefined && ` · ${selected.durationMs}ms`}
                </div>
                {selected.meta && (
                  <pre className="text-[10px] text-dd-textMuted whitespace-pre-wrap bg-black/30 p-2 rounded">
                    {JSON.stringify(selected.meta, null, 2)}
                  </pre>
                )}
                {selected.detail && (
                  <pre className="text-xs text-dd-text whitespace-pre-wrap bg-black/30 p-2 rounded border border-dd-gold/10 max-h-72 overflow-y-auto">
                    {selected.detail}
                  </pre>
                )}
              </div>
            ) : (
              <EmptyState text="选择左侧 Trace 查看详情" />
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function traceKindLabel(kind: TraceEntry['kind']): string {
  const map: Record<TraceEntry['kind'], string> = {
    prompt: '[P]', lore: '[L]', response: '[R]',
    command: '[C]', save: '[S]', error: '[E]', event: '[X]',
  };
  return map[kind] ?? '[?]';
}
