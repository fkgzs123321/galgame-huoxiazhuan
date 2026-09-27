// 摘要概览页 — 战役统计 + AI 深度摘要（对齐凡人 SummaryOverviewPage）
import { useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, StatBar } from '@/ui';
import { useGameStore } from '@/stores/gameStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAiStore } from '@/stores/aiStore';
import { aiChat } from '@/gateway/aiGateway';
import { buildSummaryPrompt, SUMMARY_SYSTEM_PROMPT } from '@/prompts/summaryPrompt';
import { fmtGameDate } from '@/utils/time';
import { getHeroName } from '@/data/ddLoader';
import { logHub } from '@/stores/logStore';

export function SummaryPage({ onBack }: { onBack?: () => void }) {
  const week = useGameStore((s) => s.week);
  const gold = useGameStore((s) => s.gold);
  const heirlooms = useGameStore((s) => s.heirlooms);
  const questsFinished = useGameStore((s) => s.questsFinished);
  const highestDungeonLevel = useGameStore((s) => s.highestDungeonLevel);
  const roster = useGameStore((s) => s.roster);
  const chronicle = useTimelineStore((s) => s.entries);
  const aiConfig = useAiStore((s) => s.config);

  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const alive = roster.filter((h) => h.currentHp > 0);
    const totalStress = roster.reduce((s, h) => s + h.stress, 0);
    return {
      rosterCount: roster.length,
      aliveCount: alive.length,
      avgStress: roster.length ? Math.round(totalStress / roster.length) : 0,
      chronicleCount: chronicle.length,
    };
  }, [roster, chronicle]);

  const recentEntries = useMemo(
    () => [...chronicle].sort((a, b) => b.time - a.time).slice(0, 20),
    [chronicle]
  );

  const runSummary = async () => {
    if (recentEntries.length === 0) {
      setSummary('编年史中没有可总结的记录 —— 先去冒险吧。');
      return;
    }
    setLoading(true);
    const records = recentEntries.map((e) => `第${e.week}周 [${e.category}] ${e.title}${e.detail ? `：${e.detail}` : ''}`);
    const prompt = buildSummaryPrompt(records, { scope: 'campaign' });

    if (!aiConfig.enabled) {
      // 程序化降级摘要
      const lines = [
        `战役进行至${fmtGameDate(week)}。`,
        `名册 ${stats.aliveCount}/${stats.rosterCount} 名英雄健在，平均压力 ${stats.avgStress}。`,
        `已完成任务 ${questsFinished} 个，最高探索至地牢 ${highestDungeonLevel} 级。`,
        `本周金币 ${gold.toLocaleString()}，纹章：${Object.entries(heirlooms).map(([k, v]) => `${k}×${v}`).join(' ')}。`,
        `最近大事 ${stats.chronicleCount} 条，其中：${recentEntries.slice(0, 3).map((e) => e.title).join('；')}。`,
      ];
      setSummary(lines.join('\n'));
    } else {
      try {
        const res = await aiChat(aiConfig, [
          { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ]);
        setSummary(res.text.trim());
        logHub.info('AI 深度摘要生成完成');
      } catch (err) {
        setSummary(`摘要生成失败：${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setLoading(false);
  };

  const heroRows = [...roster]
    .sort((a, b) => b.resolveLevel - a.resolveLevel || b.currentHp / b.maxHp - a.currentHp / a.maxHp)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>战役概览</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Panel>
          <PanelHeader title="◈ 时间" />
          <div className="p-3 text-center">
            <div className="text-dd-gold font-mono text-xl">{week}</div>
            <div className="text-[10px] text-dd-textDim">周数 · {fmtGameDate(week)}</div>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="◈ 财富" />
          <div className="p-3 text-center">
            <div className="text-dd-gold font-mono text-xl">{gold.toLocaleString()}</div>
            <div className="text-[10px] text-dd-textDim">金币 · 纹章 {Object.values(heirlooms).reduce((a, b) => a + b, 0)}</div>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="◈ 战绩" />
          <div className="p-3 text-center">
            <div className="text-dd-gold font-mono text-xl">{questsFinished}</div>
            <div className="text-[10px] text-dd-textDim">任务完成 · 地牢最高 Lv.{highestDungeonLevel}</div>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="◈ 名册" />
          <div className="p-3 text-center">
            <div className="text-dd-gold font-mono text-xl">{stats.aliveCount}/{stats.rosterCount}</div>
            <div className="text-[10px] text-dd-textDim">健在英雄 · 平均压力 {stats.avgStress}</div>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="◆ 深度摘要" extra={aiConfig.enabled ? 'AI 生成' : '程序化摘要'} />
        <div className="p-4 space-y-3">
          <Button variant="primary" onClick={() => void runSummary()} disabled={loading}>
            {loading ? '生成中…' : '生成战役摘要'}
          </Button>
          {summary && (
            <pre className="text-xs text-dd-textMuted whitespace-pre-wrap leading-relaxed bg-black/30 p-3 rounded border border-dd-gold/10">
              {summary}
            </pre>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 英雄状态（按抗压等级排序）" extra="前 6 名" />
        <div className="p-3 space-y-2">
          {heroRows.length === 0 ? (
            <EmptyState text="名册为空" />
          ) : (
            heroRows.map((h) => (
              <div key={h.uid} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-dd-gold truncate">
                  {getHeroName(h.classId)} Lv.{h.resolveLevel}
                </span>
                <div className="flex-1">
                  <StatBar label={h.name} value={h.currentHp} max={h.maxHp} color="#7cc27c" dangerBelow={25} showText />
                </div>
                <div className="w-24 shrink-0">
                  <StatBar value={100 - h.stress} max={100} color="#c8a038" dangerBelow={40} showText />
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 最近记录" extra={`${stats.chronicleCount} 条`} />
        <div className="max-h-64 overflow-y-auto">
          {recentEntries.length === 0 ? (
            <EmptyState text="暂无编年史记录" />
          ) : (
            recentEntries.slice(0, 12).map((e) => (
              <div key={e.id} className="px-3 py-1.5 border-b border-dd-gold/5 text-xs">
                <span className="text-dd-textDim mr-2">第{e.week}周</span>
                <span className="text-dd-text">{e.title}</span>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
