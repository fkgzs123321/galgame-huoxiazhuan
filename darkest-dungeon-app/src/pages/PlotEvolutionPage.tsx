// 剧情演化页 — 预设选择 + 导演生成 + 结果入编年史（对齐凡人 PlotEvolutionPage）
import { useEffect, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, SelectInput, Badge } from '@/ui';
import { useGameStore } from '@/stores/gameStore';
import { useAiStore } from '@/stores/aiStore';
import { runDirector, type DirectorKind } from '@/gateway/directorService';
import { loadPromptPresets } from '@/data/worldData';
import { useTimelineStore } from '@/stores/timelineStore';
import { AppDialog } from '@/dialogs/AppDialog';
import { TextArea } from '@/ui';
import { logHub } from '@/stores/logStore';
import { toast } from '@/ui/Extras';

interface PresetItem {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export function PlotEvolutionPage({ onBack }: { onBack?: () => void }) {
  const week = useGameStore((s) => s.week);
  const gold = useGameStore((s) => s.gold);
  const rosterCount = useGameStore((s) => s.roster.length);
  const questsFinished = useGameStore((s) => s.questsFinished);
  const aiConfig = useAiStore((s) => s.config);
  const addChronicle = useTimelineStore((s) => s.add);

  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [kind, setKind] = useState<DirectorKind>('weekly');
  const [extra, setExtra] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadPromptPresets().then((d) => {
      if (!d) return;
      const list = (d.presets as PresetItem[])
        .filter((p) => p.category === 'director')
        .map((p) => ({ id: p.id, name: p.name, category: p.category }));
      setPresets(list);
    });
  }, []);

  const facts = {
    week,
    gold,
    heirlooms: useGameStore.getState().heirlooms,
    rosterCount,
    questsFinished,
    lastWeek: output || undefined,
    townEvents: undefined,
  };

  const generate = async () => {
    setRunning(true);
    setSaved(false);
    setOutput('');
    const result = await runDirector(aiConfig, kind, {
      ...facts,
      townEvents: extra ? [extra] : undefined,
    });
    setOutput(result.text);
    setRunning(false);
    if (!result.ok) {
      toast('导演请求失败，已使用降级文本', 'error');
    }
  };

  const saveToChronicle = () => {
    addChronicle({
      week,
      category: 'event',
      title: `剧情演化（${kind === 'opening' ? '开局' : '第' + week + '周'}）`,
      detail: output.slice(0, 200),
    });
    setSaved(true);
    toast('已写入编年史', 'success');
    logHub.info('剧情演化结果已入编年史');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>剧情演化</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 导演设置" extra={aiConfig.enabled ? <Badge tone="green">AI 在线</Badge> : <Badge tone="gray">程序化降级</Badge>} />
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dd-textDim tracking-wider block mb-1">导演类型</label>
              <SelectInput
                value={kind}
                onChange={(v) => setKind(v as DirectorKind)}
                options={[
                  { value: 'weekly', label: '每周事件（本周庄园发生了什么）' },
                  { value: 'opening', label: '开局叙事（庄园最初的模样）' },
                ]}
              />
            </div>
            {presets.length > 0 && (
              <div>
                <label className="text-xs text-dd-textDim tracking-wider block mb-1">预设（参考）</label>
                <div className="text-[10px] text-dd-textDim pt-2">
                  {presets.map((p) => p.name).join(' / ')}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-dd-textDim tracking-wider block mb-1">补充事实（可选，如「昨晚有英雄在酒馆失踪」）</label>
            <TextArea rows={2} value={extra} onChange={setExtra} placeholder="输入本周边角料，导演会织入事件…" />
          </div>

          <Button variant="primary" onClick={() => void generate()} disabled={running}>
            {running ? '导演构思中…' : '✦ 生成剧情事件'}
          </Button>

          {output && (
            <div className="space-y-2">
              <div className="dd-divider" />
              <pre className="text-sm text-dd-text leading-relaxed whitespace-pre-wrap bg-black/30 p-3 rounded border border-dd-gold/10">
                {output}
              </pre>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={saveToChronicle} disabled={saved}>
                  {saved ? '已写入编年史' : '写入编年史'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void generate()}>重新生成</Button>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 当前事实快照" extra={`第 ${week} 周`} />
        <div className="p-3 text-xs text-dd-textMuted space-y-0.5">
          <p>金币 {gold.toLocaleString()} · 名册 {rosterCount} 人 · 已完成任务 {questsFinished}</p>
          <p className="text-[10px] text-dd-textDim">
            导演只基于上述事实生成，不涉及未给出的资源与能力；结果可写入编年史供后续引用。
          </p>
        </div>
      </Panel>
    </div>
  );
}
