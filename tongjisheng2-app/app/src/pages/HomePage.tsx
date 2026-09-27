import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameView } from '@ui/index';
import {
  useConfigStore,
  useGameplayStore,
  useChatStore,
} from '@stores/index';
import type { ChatMessage, MainChatStatus, VariableUpdateEvent, ThemeName } from '@ui/types';

/**
 * HomePage · 主游戏页(路由级)
 * 对齐 fanren-remake 的 pages 层:视觉小说风格主界面。
 * 数据从 stores 读取,聊天业务回调由 App 容器注入(props)。
 */

export interface HomePageProps {
  /** 聊天业务回调(由 App 容器提供) */
  onSend: (action: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onPlaceholderEncountered: (messageId: string) => void;
  onThemeChange: (t: ThemeName) => void;
  /** 是否允许输入 */
  canInput: boolean;
}

export function HomePage({
  onSend,
  onStop,
  onRetry,
  onPlaceholderEncountered,
  onThemeChange,
  canInput,
}: HomePageProps) {
  const navigate = useNavigate();
  const openPanel = useMemo(() => useOpenPanelHelper(navigate), [navigate]);

  const chatMessages = useChatStore((s) => s.messages);
  const mainChatStatus = useChatStore((s) => s.status);
  const chatError = useChatStore((s) => s.error);
  const lastVariableUpdate = useChatStore((s) => s.lastVariableUpdate);
  const appConfig = useConfigStore((s) => s.config);
  const currentTheme = useConfigStore((s) => s.theme);
  const step7StatData = useGameplayStore((s) => s.statData);
  const step7Ready = useGameplayStore((s) => s.step7Ready);
  const selectedIdentity = useGameplayStore((s) => s.selectedIdentity);

  if (!step7Ready) {
    return (
      <section
        style={{
          marginTop: 24,
          padding: 32,
          background: 'var(--c-overlay-soft)',
          borderRadius: 16,
          border: '1px solid var(--c-border)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🌸</div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--c-primary)',
            marginBottom: 8,
            letterSpacing: 2,
          }}
        >
          正在唤醒樱花树下的故事…
        </h2>
        <p style={{ color: 'var(--c-text-muted)', fontSize: 13, lineHeight: 1.8 }}>
          游戏运行时正在初始化,请稍候片刻。
          <br />
          若长时间无反应,可切换到「开发者模式」查看初始化进度。
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <button
            onClick={() => navigate('/onboarding')}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            🌸 首次启动向导
          </button>
          <button
            onClick={() => navigate('/debug')}
            style={{
              padding: '10px 24px',
              background: 'var(--c-overlay)',
              color: 'var(--c-text-muted)',
              border: '1px solid var(--c-border)',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            🛠 开发者模式
          </button>
        </div>
      </section>
    );
  }

  return (
    <GameView
      messages={chatMessages}
      status={mainChatStatus}
      error={chatError}
      playerName={appConfig.playerName || '玩家'}
      charName={(step7StatData.场景 as Record<string, unknown> | undefined)?.当前女角名 as string || '鸣泽美佐子'}
      canInput={canInput}
      statData={step7StatData}
      lastUpdate={lastVariableUpdate}
      currentTheme={currentTheme}
      onThemeChange={onThemeChange}
      onSend={onSend}
      onStop={onStop}
      onRetry={onRetry}
      onPlaceholderEncountered={onPlaceholderEncountered}
      onOpenStatusBar={() => openPanel('status')}
      onOpenNpcPanel={() => openPanel('npc')}
      onOpenHScenePanel={() => openPanel('hscene')}
      onOpenCombatPanel={() => openPanel('combat')}
      onOpenMultiViewPanel={() => openPanel('multiView')}
      onOpenAchievementPanel={() => openPanel('achievement')}
      onOpenReplayPanel={() => openPanel('replay')}
      onOpenConflictPanel={() => openPanel('conflict')}
      onOpenResistancePanel={() => openPanel('resistance')}
      onOpenPhonePanel={() => openPanel('phone')}
      onOpenShopPanel={() => openPanel('shop')}
      onOpenComputerPanel={() => openPanel('computer')}
      onOpenPresetEditorPanel={() => openPanel('presetEditor')}
      onOpenPresetSwitchPanel={() => openPanel('presetSwitch')}
      onOpenRpgPanel={() => openPanel('rpg')}
      onOpenWorkshopPanel={() => openPanel('workshop')}
      onOpenDebugPanel={() => openPanel('debug')}
      onOpenSavePanel={() => openPanel('save')}
      onOpenConfig={() => openPanel('config')}
      onOpenArchivePage={() => navigate('/archive')}
      onOpenRelationsPage={() => navigate('/relations')}
      onOpenMemoryPage={() => navigate('/memory')}
      onOpenLogsPage={() => navigate('/logs')}
      onOpenLifePage={() => navigate('/life')}
      onOpenLlmPage={() => navigate('/llm')}
      onOpenCodexPage={() => navigate('/codex')}
      onOpenMapPage={() => navigate('/map')}
      onOpenPlotPage={() => navigate('/plot')}
    />
  );
}

/** 面板打开回调工厂(路由跳转) */
function useOpenPanelHelper(navigate: (to: string) => void) {
  return (name: string) => {
    navigate(`/panel/${name}`);
  };
}
