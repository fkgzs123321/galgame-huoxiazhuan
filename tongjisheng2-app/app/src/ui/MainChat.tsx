/**
 * 主聊天视图(步骤7)
 *
 * 职责:
 *  - 流式显示叙事正文(第一人称视角,口语化)
 *  - <StatusPlaceHolderImpl/> 占位符解析为状态栏更新事件
 *  - 玩家输入框 + 发送按钮
 *  - 滚动到底部 / 停止流式 / 重试上一回合
 *  - 错误显示(模型失败 / 解析失败 / Zod 失败)
 *  - 显示该回合的变量变更摘要(可选)
 *
 * 不做:
 *  - 实际模型调用(由父组件通过 ModelGateway 调用,通过 props 把流式 chunk 推入)
 *  - 变量更新(由父组件 Kernel.commit 完成,通过 onVariableUpdate 回调推给 StatusBar)
 *  - 状态栏渲染(由 StatusBar 组件负责)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { THEME_VARS, formatValue, type ChatMessage, type MainChatStatus } from './types';

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface MainChatProps {
  /** 聊天消息列表 */
  messages: ChatMessage[];
  /** 当前状态 */
  status: MainChatStatus;
  /** 错误信息(若有) */
  error?: string;
  /** 玩家姓名(用于显示消息作者) */
  playerName?: string;
  /** 当前角色名(用于显示 AI 消息作者) */
  charName?: string;
  /** 是否允许输入(配置完成 + 身份已选) */
  canInput: boolean;
  /** 玩家发送动作回调 */
  onSend: (action: string) => void;
  /** 停止流式回调 */
  onStop?: () => void;
  /** 重试上一回合回调 */
  onRetry?: () => void;
  /** 占位符触发回调(当 AI 输出中含 <StatusPlaceHolderImpl/>) */
  onPlaceholderEncountered?: (messageId: string) => void;
}

// ───────────────────────────────────────────────────────────
//  MainChat 组件
// ───────────────────────────────────────────────────────────

export function MainChat({
  messages,
  status,
  error,
  playerName = '玩家',
  charName = 'AI',
  canInput,
  onSend,
  onStop,
  onRetry,
  onPlaceholderEncountered,
}: MainChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部(消息变化 / 流式更新)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 检测最新 assistant 消息中的 <StatusPlaceHolderImpl/> 占位符
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant' && !last.streaming && last.rawContent?.includes('<StatusPlaceHolderImpl')) {
      onPlaceholderEncountered?.(last.id);
    }
  }, [messages, onPlaceholderEncountered]);

  const handleSend = () => {
    if (!input.trim() || status === 'streaming' || !canInput) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'idle':
        return { text: '空闲', color: THEME_VARS.textMuted };
      case 'streaming':
        return { text: '流式输出中…', color: THEME_VARS.primary };
      case 'committed':
        return { text: '回合已提交', color: THEME_VARS.success };
      case 'error':
        return { text: '出错', color: THEME_VARS.danger };
    }
  }, [status]);

  return (
    <div
      style={{
        background: THEME_VARS.overlay,
        border: `1px solid ${THEME_VARS.border}`,
        borderRadius: 8,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 400,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${THEME_VARS.border}`,
          paddingBottom: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: THEME_VARS.text }}>主聊天</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: THEME_VARS.textMuted }}>
            第一人称视角 · 流式叙事 · <code>{'<StatusPlaceHolderImpl/>'}</code> 占位符 → 状态栏更新
          </p>
        </div>
        <span
          style={{
            fontSize: 12,
            padding: '4px 10px',
            background: THEME_VARS.bg,
            border: `1px solid ${THEME_VARS.border}`,
            borderRadius: 12,
            color: statusLabel.color,
          }}
        >
          ● {statusLabel.text}
        </span>
      </header>

      {/* 消息列表 */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 280,
          maxHeight: 480,
          overflowY: 'auto',
          padding: 8,
          background: THEME_VARS.bg,
          border: `1px solid ${THEME_VARS.border}`,
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: THEME_VARS.textMuted,
              fontSize: 13,
            }}
          >
            {canInput ? '输入动作开始游戏…' : '请先完成配置 + 身份选择'}
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            playerName={playerName}
            charName={charName}
          />
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          style={{
            padding: 10,
            background: THEME_VARS.bg,
            border: `1px solid ${THEME_VARS.danger}`,
            borderRadius: 4,
            color: THEME_VARS.danger,
            fontSize: 12,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* 输入栏 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          placeholder={canInput ? '输入玩家动作,如:起床去客厅找美佐子' : '请先完成配置 + 身份选择'}
          disabled={!canInput || status === 'streaming'}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            padding: '10px 12px',
            background: THEME_VARS.bg,
            border: `1px solid ${THEME_VARS.border}`,
            borderRadius: 4,
            color: THEME_VARS.text,
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
        {status === 'streaming' ? (
          <button
            type="button"
            onClick={onStop}
            style={{
              padding: '10px 18px',
              background: THEME_VARS.warning,
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canInput || !input.trim()}
            style={{
              padding: '10px 18px',
              background: canInput && input.trim() ? THEME_VARS.primary : THEME_VARS.border,
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 13,
              cursor: canInput && input.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            发送
          </button>
        )}
        {status === 'error' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: '10px 18px',
              background: THEME_VARS.danger,
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  消息气泡
// ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  playerName,
  charName,
}: {
  message: ChatMessage;
  playerName: string;
  charName: string;
}) {
  const isUser = message.role === 'user';
  const author = isUser ? playerName : charName;
  // 显示内容:剥离 <StatusPlaceHolderImpl/> 等占位符
  const displayContent = message.content;
  // 检测原始文本中的占位符(用于显示标记)
  const hasPlaceholder = message.rawContent?.includes('<StatusPlaceHolderImpl');
  // 检测变量变更摘要
  const hasChanges = message.variableChanges && message.variableChanges.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 4,
      }}
    >
      <span style={{ fontSize: 11, color: THEME_VARS.textMuted, padding: '0 6px' }}>
        {author} · {new Date(message.timestamp).toLocaleTimeString()}
        {message.streaming && ' · 流式中…'}
      </span>
      <div
        style={{
          maxWidth: '80%',
          padding: '10px 12px',
          background: isUser ? THEME_VARS.primary : THEME_VARS.overlay,
          color: isUser ? '#fff' : THEME_VARS.text,
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          border: `1px solid ${isUser ? THEME_VARS.primary : THEME_VARS.border}`,
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {displayContent}
        {hasPlaceholder && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: `1px dashed ${isUser ? 'rgba(255,255,255,0.3)' : THEME_VARS.border}`,
              fontSize: 11,
              opacity: 0.8,
            }}
          >
            ⚙ {'<StatusPlaceHolderImpl/>'} 已触发状态栏更新
          </div>
        )}
        {hasChanges && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: `1px dashed ${isUser ? 'rgba(255,255,255,0.3)' : THEME_VARS.border}`,
              fontSize: 11,
              opacity: 0.85,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <strong>变量变更({message.variableChanges!.length} 项):</strong>
            {message.variableChanges!.slice(0, 5).map((c, i) => (
              <div key={i}>
                · {c.op} {c.path}:{' '}
                {formatValue(c.before)} → {formatValue(c.after)}
              </div>
            ))}
            {message.variableChanges!.length > 5 && (
              <div>… 其余 {message.variableChanges!.length - 5} 项</div>
            )}
          </div>
        )}
        {message.error && (
          <div style={{ marginTop: 6, color: THEME_VARS.danger, fontSize: 11 }}>
            ⚠ {message.error}
          </div>
        )}
      </div>
    </div>
  );
}
