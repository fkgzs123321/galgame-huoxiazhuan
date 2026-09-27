import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePanelHandlers } from './PanelHandlersContext';
import { useConfigStore, useGameplayStore, useSaveStore, useNpcStore, useChatStore } from '@stores/index';
import {
  StatusBar,
  NpcPanel,
  Stage2Step9Panel,
  CombatSettlementPanel,
  MultiViewPanel,
  AchievementPanel,
  ReplayPanel,
  ConflictPanel,
  ResistancePanel,
  PhonePanel,
  ShopPanel,
  ComputerPanel,
  PresetEditorPanel,
  PresetQuickSwitch,
  RpgPanel,
  WorkshopPanel,
  DebugPanel,
  SaveRecovery,
} from '@ui/index';
import { SettingsPage } from '@settings/index';
import { Button } from '@ui/base';
import { IDENTITY_OPTIONS } from '@ui/types';

/**
 * PanelPage · 面板页(路由级)
 * 对齐 fanren-remake 的 pages 层:每个面板一个路由页面。
 * 数据从 stores 读取,业务回调经 PanelHandlersContext 获取。
 */

export type PanelName =
  | 'status'
  | 'npc'
  | 'hscene'
  | 'combat'
  | 'multiView'
  | 'achievement'
  | 'replay'
  | 'conflict'
  | 'resistance'
  | 'phone'
  | 'shop'
  | 'computer'
  | 'presetEditor'
  | 'presetSwitch'
  | 'rpg'
  | 'workshop'
  | 'debug'
  | 'save'
  | 'config';

export const PANEL_TITLES: Record<PanelName, string> = {
  status: '📊 完整状态栏',
  npc: '👥 NPC 自然行动系统',
  hscene: '💕 H 场景结算 + 多女角管理',
  combat: '⚔ 战斗结算系统',
  multiView: '🗺 多视图面板',
  achievement: '🏆 成就系统 + NG+ 继承',
  replay: '📅 历史回放 + 分支管理',
  conflict: '⚔ 剧情冲突系统',
  resistance: '🛡 强迫抵抗系统',
  phone: '📱 手机(90 年代 PHS)',
  shop: '🛍 商城系统',
  computer: '💻 电脑(90 年代拨号上网)',
  presetEditor: '⚙ 预设编辑器',
  presetSwitch: '🔀 预设快捷切换',
  rpg: '🎯 RPG 养成(技能树/任务/装备)',
  workshop: '🛠 创意工坊(MOD 管理)',
  debug: '🧪 调试工具(Trace/变量/Prompt)',
  save: '💾 存档与恢复',
  config: '⚙️ 配置 + 身份选择',
};

function PanelContent({ name }: { name: PanelName }) {
  const handlers = usePanelHandlers();
  const statData = useGameplayStore((s) => s.statData);
  const lastVariableUpdate = useChatStoreLastUpdate();
  const appConfig = useConfigStore((s) => s.config);
  const selectedIdentity = useGameplayStore((s) => s.selectedIdentity);
  const kernelRef = useSaveStore((s) => s.kernelRef);
  const step8Ready = useSaveStore((s) => s.ready);
  const failureReport = useSaveStore((s) => s.failureReport);
  const npc = useNpcStore();
  const mvu = kernelRef.current?.getMvuRuntime();
  const dayCount = Number((statData.时间 as { 天数?: number } | undefined)?.天数 ?? 1);
  const timeSlot = String((statData.时间 as { 时段?: string } | undefined)?.时段 ?? '早');

  switch (name) {
    case 'status':
      return <StatusBar statData={statData} lastUpdate={lastVariableUpdate} showModal={true} />;
    case 'npc':
      return npc.ready ? (
        <NpcPanel
          dayCount={npc.dayCount}
          timeSlot={npc.timeSlot}
          lastNpcAction={npc.lastAction}
          readOnly={false}
        />
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--c-text-muted)' }}>
          NPC 自然行动系统尚未就绪(阶段2 未初始化完成)
        </div>
      );
    case 'hscene':
      return (
        <Stage2Step9Panel mvu={mvu} readOnly={false} />
      );
    case 'combat':
      return <CombatSettlementPanel statData={statData} readOnly={false} />;
    case 'multiView':
      return <MultiViewPanel mvu={mvu} dayCount={dayCount} timeSlot={timeSlot} readOnly={false} />;
    case 'achievement':
      return <AchievementPanel mvu={mvu} readOnly={false} />;
    case 'replay':
      return (
        <ReplayPanel
          mvu={mvu}
          currentHash={kernelRef.current?.getCurrentRevisionHash?.()}
          onLoadRevision={handlers.onLoadRevision}
          readOnly={false}
        />
      );
    case 'conflict':
      return <ConflictPanel mvu={mvu} readOnly={false} />;
    case 'resistance':
      return <ResistancePanel mvu={mvu} readOnly={false} />;
    case 'phone':
      return <PhonePanel mvu={mvu} readOnly={false} />;
    case 'shop':
      return <ShopPanel mvu={mvu} readOnly={false} />;
    case 'computer':
      return <ComputerPanel mvu={mvu} readOnly={false} />;
    case 'presetEditor':
      return <PresetEditorPanel readOnly={false} />;
    case 'presetSwitch':
      return <PresetQuickSwitch config={appConfig} onChange={handlers.onConfigChange} />;
    case 'rpg':
      return <RpgPanel mvu={mvu} readOnly={false} />;
    case 'workshop':
      return <WorkshopPanel onClose={handlers.onClose} />;
    case 'debug':
      return <DebugPanel mvu={mvu} onClose={handlers.onClose} />;
    case 'save':
      return step8Ready ? (
        <SaveRecovery
          kernelRef={kernelRef as React.MutableRefObject<never>}
          onSave={handlers.onSave}
          onLoad={handlers.onLoad}
          onDelete={handlers.onDelete}
          onExport={handlers.onExport}
          onImport={handlers.onImport}
          onRecover={handlers.onRecover}
          onRetry={handlers.onRetry}
          onRollback={handlers.onRollback}
          failureReport={failureReport}
          readOnly={false}
        />
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--c-text-muted)' }}>
          存档系统尚未就绪(步骤8 未初始化)
        </div>
      );
    case 'config':
      return (
        <SettingsPage
          config={appConfig}
          onChange={handlers.onConfigChange}
          readOnly={false}
          identity={{ selected: selectedIdentity, onConfirm: handlers.onIdentityConfirm }}
        />
      );
    default:
      return null;
  }
}

/** 从 chatStore 读 lastVariableUpdate */
function useChatStoreLastUpdate() {
  return useChatStore((s) => s.lastVariableUpdate);
}

export function PanelPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const handlers = usePanelHandlers();

  const valid = useMemo(
    () => (name && name in PANEL_TITLES ? (name as PanelName) : null),
    [name],
  );

  if (!valid) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-muted)' }}>
        未知面板:{name}
        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" onClick={() => navigate('/')}>
            ← 返回主游戏
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        animation: 'soft-fade-in 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--c-overlay)',
          borderRadius: 16,
          border: '1px solid var(--c-border)',
          boxShadow: 'var(--shadow-lg)',
          width: 'min(900px, 92vw)',
          maxHeight: '86vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderBottom: '1px solid var(--c-border)',
            background: 'var(--c-overlay-soft)',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              color: 'var(--c-primary)',
              letterSpacing: 1,
            }}
          >
            {PANEL_TITLES[valid]}
          </h3>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            ✕ 关闭
          </Button>
        </header>
        <div style={{ overflowY: 'auto', padding: 16 }}>
          <PanelContent name={valid} />
        </div>
      </div>
    </div>
  );
}

// 供 GameView 打开面板的回调工厂
export function useOpenPanel() {
  const navigate = useNavigate();
  return useMemo(
    () => (name: PanelName) => {
      navigate(`/panel/${name}`);
    },
    [navigate],
  );
}
