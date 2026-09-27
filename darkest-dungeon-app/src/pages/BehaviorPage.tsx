// 英雄行为分析页 — AI 行为画像（基于履历/状态/编年史），降级程序化
// 对齐凡人 CharacterBehaviorAnalysisSettings
import { useEffect, useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, StatBar, SelectInput } from '@/ui';
import { useGameStore } from '@/stores/gameStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAiStore } from '@/stores/aiStore';
import { aiChat } from '@/gateway/aiGateway';
import { getHeroName, getSkillName } from '@/data/ddLoader';
import { getQuirkName, isPositiveQuirk } from '@/stores/townStore';
import { logHub } from '@/stores/logStore';
import type { HeroInstance } from '@/types';

const ANALYSIS_SYSTEM = `你是一位心理档案分析师，专精于《暗黑地牢》的英雄行为学。根据给定英雄的档案（履历、压力状态、怪癖、崩溃/美德历史），撰写一份 120 字以内的行为画像：
1. 性格核心（一段话概括）
2. 危险信号（压力爆发的诱因）
3. 应对建议（玩家该如何对待这位英雄）
使用简体中文，克制冷静的档案笔触，不要编造档案中不存在的事实。`;

export function BehaviorPage({ onBack }: { onBack?: () => void }) {
  const roster = useGameStore((s) => s.roster);
  const chronicle = useTimelineStore((s) => s.entries);
  const aiConfig = useAiStore((s) => s.config);

  const [selectedUid, setSelectedUid] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const hero = useMemo(() => roster.find((h) => h.uid === selectedUid) ?? null, [roster, selectedUid]);

  // 默认选中第一名英雄
  useEffect(() => {
    if (!selectedUid && roster.length > 0) setSelectedUid(roster[0].uid);
  }, [roster, selectedUid]);

  const heroRecords = useMemo(() => {
    if (!hero) return [];
    // 编年史中与该英雄相关的记录（detail 含 uid）
    const named = chronicle.filter((e) => (e.detail ?? '').includes(hero.uid));
    // 无匹配时退化为最近 5 条事件
    return named.length > 0 ? named.slice(-6) : chronicle.slice(-5);
  }, [hero, chronicle]);

  const buildProfile = (): string => {
    if (!hero) return '';
    const lines = [
      `英雄：${getHeroName(hero.classId)}「${hero.name}」`,
      `抗压等级：${hero.resolveLevel} · 压力：${hero.stress}/200`,
      `状态：${hero.affliction ? `崩溃「${hero.affliction}」` : hero.virtue ? `美德「${hero.virtue}」` : hero.isDeathsDoor ? '死亡之门' : '稳定'}`,
      `怪癖：${hero.quirks.map((q) => `${getQuirkName(q)}${isPositiveQuirk(q) ? '(正)' : '(负)'}`).join('、') || '无'}`,
      `疾病：${hero.diseases.join('、') || '无'}`,
      `战斗技能：${hero.skills.map(getSkillName).join('、') || '无'}`,
      `最近记录：${heroRecords.map((e) => `第${e.week}周 ${e.title}`).join('；') || '暂无'}`,
    ];
    return lines.join('\n');
  };

  const runAnalysis = async () => {
    if (!hero) return;
    setLoading(true);
    setAnalysis('');
    const profile = buildProfile();

    if (!aiConfig.enabled) {
      // 程序化降级画像
      const quirks = hero.quirks.length;
      const stressed = hero.stress >= 100;
      const broke = !!hero.affliction;
      const parts = [
        `${getHeroName(hero.classId)}「${hero.name}」是名${hero.resolveLevel >= 3 ? '久经沙场的老兵' : '仍在成长的新人'}。`,
        stressed
          ? '当前压力已突破临界，情绪极不稳定，随时可能崩溃。'
          : hero.stress >= 50
            ? '压力偏高，疲惫正侵蚀他的判断力。'
            : '心态平稳，尚能胜任任何任务。',
        broke
          ? `他已陷入「${hero.affliction}」的崩溃状态，行为不可预测，建议立刻送去疗养院。`
          : hero.virtue
            ? `他正处在「${hero.virtue}」的美德状态，是队伍的中流砥柱。`
            : '',
        `拥有 ${quirks} 个怪癖，性格深受其影响。`,
        hero.diseases.length > 0 ? '他身上带着疾病的阴影，治愈前不宜深入险境。' : '',
        `建议：${hero.isDeathsDoor ? '他徘徊在死亡之门边缘，务必确保有治疗者随行。' : stressed ? '安排压力缓解活动（教堂/酒馆），暂缓高危任务。' : '可正常派遣，但留意压力累积。'}`,
      ];
      setAnalysis(parts.filter(Boolean).join('\n'));
      setLoading(false);
      return;
    }

    try {
      const res = await aiChat(aiConfig, [
        { role: 'system', content: ANALYSIS_SYSTEM },
        { role: 'user', content: `【英雄档案】\n${profile}` },
      ]);
      setAnalysis(res.text.trim());
      logHub.info(`行为分析完成：${hero.name}`);
    } catch (err) {
      setAnalysis(`分析失败：${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>英雄行为分析</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 选择英雄" extra={`${roster.length} 人在册`} />
        <div className="p-3 flex flex-wrap gap-2">
          <SelectInput
            className="w-64"
            value={selectedUid}
            onChange={setSelectedUid}
            options={roster.map((h) => ({
              value: h.uid,
              label: `${getHeroName(h.classId)}「${h.name}」 Lv.${h.resolveLevel}`,
            }))}
          />
          <Button variant="primary" onClick={() => void runAnalysis()} disabled={!hero || loading}>
            {loading ? '分析中…' : '生成行为画像'}
          </Button>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-1">
          <PanelHeader title="◆ 档案" extra={hero ? getHeroName(hero.classId) : ''} />
          {!hero ? (
            <EmptyState text="名册为空" />
          ) : (
            <div className="p-3 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className={`font-bold text-sm ${`class-${hero.classId}`}`}>{hero.name}</span>
                <span className="text-xs text-dd-gold">Lv.{hero.resolveLevel}</span>
              </div>
              <StatBar label="生命" value={hero.currentHp} max={hero.maxHp} color="#7cc27c" dangerBelow={25} showText />
              <StatBar label="压力" value={hero.stress} max={200} color="#c8a038" dangerBelow={50} showText />
              <div>
                <div className="text-[10px] text-dd-textDim mb-1">状态</div>
                <div className="text-[11px] text-dd-text">
                  {hero.affliction ? `崩溃「${hero.affliction}」` : hero.virtue ? `美德「${hero.virtue}」` : hero.isDeathsDoor ? '死亡之门' : '稳定'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-dd-textDim mb-1">怪癖</div>
                <div className="flex flex-wrap gap-1">
                  {hero.quirks.map((q) => (
                    <span
                      key={q}
                      className={`text-[9px] px-1 py-0.5 border rounded-sm ${
                        isPositiveQuirk(q) ? 'border-emerald-400/40 text-emerald-300' : 'border-red-400/40 text-red-300'
                      }`}
                    >
                      {getQuirkName(q)}
                    </span>
                  ))}
                  {hero.quirks.length === 0 && <span className="text-[10px] text-dd-textDim">无</span>}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-dd-textDim mb-1">最近经历</div>
                <div className="space-y-0.5">
                  {heroRecords.map((e) => (
                    <div key={e.id} className="text-[10px] text-dd-textMuted">第{e.week}周 · {e.title}</div>
                  ))}
                  {heroRecords.length === 0 && <span className="text-[10px] text-dd-textDim">暂无</span>}
                </div>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="◆ 行为画像" extra={aiConfig.enabled ? 'AI 分析' : '程序化分析'} />
          <div className="p-4">
            {analysis ? (
              <pre className="text-sm text-dd-text leading-relaxed whitespace-pre-wrap bg-black/30 p-4 rounded border border-dd-gold/10 min-h-40">
                {analysis}
              </pre>
            ) : (
              <EmptyState text="选择英雄并点击「生成行为画像」" />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
