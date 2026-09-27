// 文字冒险主端口 — 叙事流 + 自由行动输入（AI 驱动的核心交互）
import { useEffect, useRef, useState } from 'react';
import { Panel, PanelHeader, Button, Badge } from '@/ui';
import { requestStoryReply, buildEstateFacts, STORY_SYSTEM_PROMPT, type StoryMessage } from '@/gateway/storyService';
import { useConfigStore } from '@/stores/configStore';
import { useAiStore } from '@/stores/aiStore';
import { useGameStore } from '@/stores/gameStore';
import { CONTENT_MODE_LABEL, CONTENT_MODE_TONE } from '@/prompts/contentMode';
import { toast } from '@/ui/Extras';
import { genId } from '@/utils/id';
import clsx from 'clsx';

const QUICK_ACTIONS = ['去酒馆打听消息', '巡视庄园', '查看公告板有什么任务', '去驿站看看新来的英雄'];

const HISTORY_KEY = 'dd-story-history';

function loadHistory(): StoryMessage[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as StoryMessage[]) : [];
  } catch {
    return [];
  }
}

export function StoryConsole() {
  const [messages, setMessages] = useState<StoryMessage[]>(loadHistory);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiEnabled = useAiStore((s) => s.config.enabled);
  const contentMode = useConfigStore((s) => s.settings.contentMode);
  const week = useGameStore((s) => s.week);

  // 自动滚动到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // 周变化时插入程序化周记（新的一周开场）
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.meta?.week === week) return;
    const entry: StoryMessage = {
      id: genId('st'),
      role: 'narrator',
      text: `第 ${week} 周的钟声在庄园上空回荡。${buildEstateFacts().split('\n')[0]}，庄园在晨雾中等待你的吩咐。`,
      time: Date.now(),
      meta: { week },
    };
    setMessages((m) => [...m, entry]);
  }, [week]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const playerMsg: StoryMessage = { id: genId('st'), role: 'player', text: t, time: Date.now() };
    const next = [...messages, playerMsg];
    setMessages(next);
    setInput('');

    const { text: reply, mode, loreHits } = await requestStoryReply(t);
    const narratorMsg: StoryMessage = {
      id: genId('st'),
      role: 'narrator',
      text: reply,
      time: Date.now(),
      meta: { mode, loreHits },
    };
    const final = [...next, narratorMsg];
    setMessages(final);
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(final.slice(-50)));
    } catch { /* 忽略 */ }
    setSending(false);
  };

  return (
    <Panel>
      <PanelHeader
        title="◈ 文字冒险 · 庄园纪事"
        extra={
          <span className="flex items-center gap-2">
            <Badge tone={aiEnabled ? 'green' : 'gray'}>{aiEnabled ? 'AI 主持中' : '程序化模式'}</Badge>
            <Badge tone={CONTENT_MODE_TONE[contentMode]}>{CONTENT_MODE_LABEL[contentMode]}</Badge>
          </span>
        }
      />

      {/* 叙事流 */}
      <div
        ref={scrollRef}
        className="px-4 py-3 space-y-3 overflow-y-auto"
        style={{ maxHeight: 380, minHeight: 200 }}
      >
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-dd-textDim italic text-sm tracking-widest">庄园在黑暗中等待第一位访客…</div>
            <div className="text-[10px] text-dd-textDim mt-2">
              在下方输入你的行动，或使用快捷指令开始
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={clsx('flex', m.role === 'player' ? 'justify-end' : 'justify-start')}>
            <div
              className={clsx(
                'max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-sm border',
                m.role === 'player'
                  ? 'bg-dd-gold/10 border-dd-gold/30 text-dd-gold'
                  : 'bg-black/30 border-dd-gold/10 text-dd-text'
              )}
            >
              {m.role === 'narrator' && m.meta?.loreHits ? (
                <div className="text-[9px] text-dd-textDim mb-1">📔 世界书注入 ×{m.meta.loreHits}</div>
              ) : null}
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="text-[10px] text-dd-textDim italic animate-pulse">
            旁白在烛火下展开卷轴…
          </div>
        )}
      </div>

      {/* 快捷指令 */}
      <div className="px-4 pt-2 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a}
            onClick={() => void send(a)}
            disabled={sending}
            className="text-[10px] px-2 py-1 border border-dd-gold/20 rounded-sm text-dd-textMuted hover:text-dd-gold hover:border-dd-gold/50 transition-colors disabled:opacity-40"
          >
            {a}
          </button>
        ))}
      </div>

      {/* 输入区 */}
      <div className="p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="输入你的行动，例如：我去酒馆向醉汉打听地牢的消息…"
          className="flex-1 bg-black/30 border border-dd-gold/25 text-sm px-3 py-2 outline-none focus:border-dd-gold/60 placeholder:text-dd-textDim"
        />
        <Button variant="primary" onClick={() => void send(input)} disabled={sending || !input.trim()}>
          行动
        </Button>
      </div>
    </Panel>
  );
}
