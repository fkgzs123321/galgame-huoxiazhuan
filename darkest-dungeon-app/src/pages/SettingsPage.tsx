// 设置总页 — 挂载全部设置面板（对齐凡人 SettingsPage）
import { useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button } from '@/ui';
import { AiSettings } from '@/settings/AiSettings';
import { CombatSettings, DungeonSettings, NarrativeSettings, SaveSettings, AppearanceSettings, ContentModeSettings, WorldbookSettings } from '@/settings/GameplaySettings';
import { SoundSettings, NotificationSettings, DifficultySettings, QuirkSettings, DlcSettings, PromptSettings } from '@/settings/ExtraSettings';
import { DiagnosticSettings } from '@/settings/DiagnosticSettings';
import { useConfigStore } from '@/stores/configStore';

type TabKey = 'ai' | 'gameplay' | 'difficulty' | 'quirk' | 'dlc' | 'narrative' | 'prompt' | 'save' | 'appearance' | 'content' | 'worldbook' | 'sound' | 'notification' | 'diagnostic';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ai', label: 'AI 接口' },
  { key: 'gameplay', label: '战斗/地牢' },
  { key: 'difficulty', label: '难度' },
  { key: 'quirk', label: '怪癖' },
  { key: 'dlc', label: 'DLC' },
  { key: 'narrative', label: '叙事' },
  { key: 'prompt', label: '提示词' },
  { key: 'worldbook', label: '世界书' },
  { key: 'save', label: '存档' },
  { key: 'sound', label: '音效' },
  { key: 'notification', label: '通知' },
  { key: 'appearance', label: '外观' },
  { key: 'content', label: '内容模式' },
  { key: 'diagnostic', label: '诊断' },
];

export function SettingsPage({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<TabKey>('ai');
  const resetAll = useConfigStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>设置</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <div className="flex flex-wrap gap-1 px-3 pt-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs tracking-widest border-b-2 transition-colors ${
                tab === t.key
                  ? 'text-dd-gold border-dd-gold'
                  : 'text-dd-textMuted border-transparent hover:text-dd-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === 'ai' && <AiSettings />}
          {tab === 'gameplay' && (
            <div className="space-y-4">
              <CombatSettings />
              <DungeonSettings />
            </div>
          )}
          {tab === 'difficulty' && <DifficultySettings />}
          {tab === 'quirk' && <QuirkSettings />}
          {tab === 'dlc' && <DlcSettings />}
          {tab === 'narrative' && <NarrativeSettings />}
          {tab === 'prompt' && <PromptSettings />}
          {tab === 'worldbook' && <WorldbookSettings />}
          {tab === 'save' && <SaveSettings />}
          {tab === 'sound' && <SoundSettings />}
          {tab === 'notification' && <NotificationSettings />}
          {tab === 'appearance' && <AppearanceSettings />}
          {tab === 'content' && <ContentModeSettings />}
          {tab === 'diagnostic' && <DiagnosticSettings />}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 危险区" extra="不可逆操作" />
        <div className="p-4 flex items-center gap-3">
          {confirmReset ? (
            <>
              <span className="text-xs text-red-400 tracking-wider">确认恢复全部设置为默认值？</span>
              <Button
                variant="danger"
                onClick={() => { resetAll(); setConfirmReset(false); }}
              >
                确认重置
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>取消</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>恢复默认设置</Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
