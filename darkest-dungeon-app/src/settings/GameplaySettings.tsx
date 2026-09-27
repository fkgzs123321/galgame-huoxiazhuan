// 玩法设置面板 — 战斗/地牢/叙事/存档/外观/内容模式/世界书（对接 configStore）
import { useConfigStore } from '@/stores/configStore';
import { useWorldbookStore } from '@/stores/worldbookStore';
import { SettingsSection, SettingRow } from './SettingsPanelBase';
import { Toggle, NumberInput } from '@/ui';

export function CombatSettings() {
  const { settings, setSection } = useConfigStore();
  const c = settings.combat;
  const set = (patch: Partial<typeof c>) => setSection('combat', patch);

  return (
    <SettingsSection title="◆ 战斗规则" extra="影响判定，不只是界面">
      <SettingRow label="暴击" hint="暴击伤害与暴击压力">
        <Toggle checked={c.enableCriticals} onChange={(v) => set({ enableCriticals: v })} />
      </SettingRow>
      <SettingRow label="压力系统" hint="崩溃/美德/心脏病发">
        <Toggle checked={c.enableStress} onChange={(v) => set({ enableStress: v })} />
      </SettingRow>
      <SettingRow label="死亡之门" hint="濒死保护与死亡判定">
        <Toggle checked={c.enableDeathsDoor} onChange={(v) => set({ enableDeathsDoor: v })} />
      </SettingRow>
      <SettingRow label="火把效果" hint="亮度影响遭遇与命中">
        <Toggle checked={c.enableTorchEffects} onChange={(v) => set({ enableTorchEffects: v })} />
      </SettingRow>
      <SettingRow label="显示命中率">
        <Toggle checked={c.showHitChance} onChange={(v) => set({ showHitChance: v })} />
      </SettingRow>
    </SettingsSection>
  );
}

export function DungeonSettings() {
  const { settings, setSection } = useConfigStore();
  const d = settings.dungeon;
  const set = (patch: Partial<typeof d>) => setSection('dungeon', patch);

  return (
    <SettingsSection title="◆ 地牢生成" extra="影响每张地图的生成结果">
      <SettingRow label="初始火把">
        <NumberInput min={0} max={100} value={d.torchStart} onChange={(v) => set({ torchStart: v })} />
      </SettingRow>
      <SettingRow label="每步火把消耗">
        <NumberInput min={0} max={20} value={d.torchDrainPerStep} onChange={(v) => set({ torchDrainPerStep: v })} />
      </SettingRow>
      <SettingRow label="遭遇密度倍率" hint="0.5 稀疏 / 1 标准 / 2 密集">
        <NumberInput min={0.5} max={2} step={0.1} value={d.encounterDensity} onChange={(v) => set({ encounterDensity: v })} />
      </SettingRow>
      <SettingRow label="好奇物密度倍率">
        <NumberInput min={0.5} max={2} step={0.1} value={d.curioDensity} onChange={(v) => set({ curioDensity: v })} />
      </SettingRow>
      <SettingRow label="允许扎营">
        <Toggle checked={d.allowCamping} onChange={(v) => set({ allowCamping: v })} />
      </SettingRow>
    </SettingsSection>
  );
}

export function NarrativeSettings() {
  const { settings, setSection } = useConfigStore();
  const n = settings.narrative;
  const set = (patch: Partial<typeof n>) => setSection('narrative', patch);

  return (
    <SettingsSection title="◆ 叙事偏好" extra="影响 AI 生成的文风">
      <SettingRow label="文风">
        <select
          className="bg-black/40 border border-dd-gold/25 text-sm px-2 py-1 text-dd-text outline-none"
          value={n.style}
          onChange={(e) => set({ style: e.target.value as typeof n.style })}
        >
          <option value="dark">哥特黑暗（默认）</option>
          <option value="classic">古典克制</option>
          <option value="whimsical">荒诞轻快</option>
        </select>
      </SettingRow>
      <SettingRow label="细节密度">
        <select
          className="bg-black/40 border border-dd-gold/25 text-sm px-2 py-1 text-dd-text outline-none"
          value={n.detailLevel}
          onChange={(e) => set({ detailLevel: e.target.value as typeof n.detailLevel })}
        >
          <option value="brief">简洁</option>
          <option value="standard">标准（默认）</option>
          <option value="vivid">细腻</option>
        </select>
      </SettingRow>
      <SettingRow label="默认启用 AI 叙事" hint="新档默认偏好（可在 AI 设置中单独切换）">
        <Toggle checked={n.useAiNarrative} onChange={(v) => set({ useAiNarrative: v })} />
      </SettingRow>
    </SettingsSection>
  );
}

export function SaveSettings() {
  const { settings, setSection } = useConfigStore();
  const s = settings.save;
  const set = (patch: Partial<typeof s>) => setSection('save', patch);

  return (
    <SettingsSection title="◆ 存档策略" extra="涉及数据安全">
      <SettingRow label="自动存档">
        <Toggle checked={s.autoSave} onChange={(v) => set({ autoSave: v })} />
      </SettingRow>
      <SettingRow label="保存时自动备份" hint="写入前保留上一版（本地）">
        <Toggle checked={s.backupOnSave} onChange={(v) => set({ backupOnSave: v })} />
      </SettingRow>
      <SettingRow label="备份数量上限">
        <NumberInput min={1} max={50} value={s.maxBackups} onChange={(v) => set({ maxBackups: v })} />
      </SettingRow>
    </SettingsSection>
  );
}

export function AppearanceSettings() {
  const { settings, setSettings } = useConfigStore();

  return (
    <SettingsSection title="◆ 外观">
      <SettingRow label="界面语言">
        <select
          className="bg-black/40 border border-dd-gold/25 text-sm px-2 py-1 text-dd-text outline-none"
          value={settings.language}
          onChange={(e) => setSettings({ language: e.target.value as 'zh' | 'en' })}
        >
          <option value="zh">简体中文</option>
          <option value="en">English</option>
        </select>
      </SettingRow>
      <SettingRow label="标题闪烁特效">
        <Toggle checked={settings.titleFlicker} onChange={(v) => setSettings({ titleFlicker: v })} />
      </SettingRow>
      <SettingRow label="紧凑模式">
        <Toggle checked={settings.compactMode} onChange={(v) => setSettings({ compactMode: v })} />
      </SettingRow>
    </SettingsSection>
  );
}

export function ContentModeSettings() {
  const { settings, setSettings } = useConfigStore();

  return (
    <SettingsSection
      title="◆ 内容模式"
      extra="隔离提示词与生成，不影响程序判定"
    >
      <SettingRow
        label="内容模式"
        hint="SFW：全年龄 / Balanced：温和成人 / NSFW：成人内容（仅影响生成，不改变玩法数值）"
      >
        <select
          className="bg-black/40 border border-dd-gold/25 text-sm px-2 py-1 text-dd-text outline-none"
          value={settings.contentMode}
          onChange={(e) => setSettings({ contentMode: e.target.value as 'sfw' | 'balanced' | 'nsfw' })}
        >
          <option value="sfw">SFW</option>
          <option value="balanced">Balanced</option>
          <option value="nsfw">NSFW</option>
        </select>
      </SettingRow>
    </SettingsSection>
  );
}

export function WorldbookSettings() {
  const loreEnabled = useWorldbookStore((s) => s.loreEnabled);
  const budgetLimit = useWorldbookStore((s) => s.budgetLimit);
  const setLoreEnabled = useWorldbookStore((s) => s.setLoreEnabled);
  const setBudgetLimit = useWorldbookStore((s) => s.setBudgetLimit);

  return (
    <SettingsSection title="◆ 世界书注入" extra="Lore Runtime">
      <SettingRow label="启用世界书" hint="关键词命中与常驻注入">
        <Toggle checked={loreEnabled} onChange={setLoreEnabled} />
      </SettingRow>
      <SettingRow label="单次注入预算（token）">
        <NumberInput min={100} max={20000} step={100} value={budgetLimit} onChange={setBudgetLimit} />
      </SettingRow>
    </SettingsSection>
  );
}
