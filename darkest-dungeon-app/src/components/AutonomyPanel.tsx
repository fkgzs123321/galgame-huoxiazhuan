// 自主事件面板 — AI 提案的确认/拒绝（主游玩窗口的一部分）
import { Panel, PanelHeader, Button, EmptyState, Badge } from '@/ui';
import { useAutonomyStore, generateProposal, type AutonomyProposal } from '@/gateway/autonomyService';
import { toast } from '@/ui/Extras';
import { useState } from 'react';
import clsx from 'clsx';

const KIND_LABEL: Record<string, string> = {
  merchant: '商人',
  hero_event: '英雄事件',
  estate: '庄园事务',
  quest_hint: '任务线索',
  quirk: '怪癖变化',
};

export function AutonomyPanel() {
  const { pending, resolved, resolve, clearResolved } = useAutonomyStore();
  const [generating, setGenerating] = useState(false);

  const handleAccept = (p: AutonomyProposal) => {
    const ok = resolve(p.id, true);
    toast(ok ? `已接受：${p.title}` : '提案处理失败', ok ? 'success' : 'error');
  };

  const handleDecline = (p: AutonomyProposal) => {
    resolve(p.id, false);
    toast(`已婉拒：${p.title}`);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const ok = await generateProposal();
    if (!ok) toast('提案生成失败（AI 返回无法解析，已记录日志）', 'error');
    setGenerating(false);
  };

  return (
    <Panel>
      <PanelHeader
        title="◈ 自主事件（AI 提议 · 你裁决）"
        extra={
          <span className="flex items-center gap-2">
            <span className="text-[10px] text-dd-textDim">AI 只提议，数值由程序执行</span>
            <Button size="sm" onClick={() => void handleGenerate()} disabled={generating}>
              {generating ? '构思中…' : '✦ 请求本周自主事件'}
            </Button>
          </span>
        }
      />

      <div className="max-h-72 overflow-y-auto">
        {pending.length === 0 && resolved.length === 0 ? (
          <EmptyState text="庄园一片平静…点「请求本周自主事件」让 AI 提议点什么" />
        ) : (
          <>
            {pending.map((p) => (
              <div key={p.id} className="px-3 py-2.5 border-b border-dd-gold/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={p.source === 'ai' ? 'gold' : 'gray'}>
                    {KIND_LABEL[p.kind] ?? p.kind}{p.source === 'ai' ? ' · AI' : ''}
                  </Badge>
                  <span className="text-xs text-dd-text font-medium">{p.title}</span>
                </div>
                <p className="text-[11px] text-dd-textMuted leading-relaxed mt-1.5">{p.desc}</p>
                <div className="flex items-center gap-3 mt-2">
                  {typeof p.costGold === 'number' && p.costGold > 0 && (
                    <span className="text-[10px] text-red-300 font-mono">-{p.costGold.toLocaleString()}g</span>
                  )}
                  {typeof p.rewardGold === 'number' && p.rewardGold > 0 && (
                    <span className="text-[10px] text-emerald-300 font-mono">+{p.rewardGold.toLocaleString()}g</span>
                  )}
                  {typeof p.stressChange === 'number' && p.stressChange !== 0 && (
                    <span className={clsx('text-[10px] font-mono', p.stressChange > 0 ? 'text-red-300' : 'text-emerald-300')}>
                      压力 {p.stressChange > 0 ? '+' : ''}{p.stressChange}
                    </span>
                  )}
                  <div className="ml-auto flex gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => handleAccept(p)}>接受</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDecline(p)}>婉拒</Button>
                  </div>
                </div>
              </div>
            ))}

            {pending.length === 0 && resolved.length > 0 && (
              <div className="px-3 py-2 text-[10px] text-dd-textDim">
                本周已处理的自主事件 {resolved.length} 条。
                <button className="ml-2 text-dd-gold underline" onClick={clearResolved}>清空记录</button>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
