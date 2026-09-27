// 扩展设置面板 — 音效/通知/难度/怪癖/DLC/提示词（对齐凡人设置模块化）
import { useConfigStore } from '@/stores/configStore';
import { useWorldbookStore } from '@/stores/worldbookStore';
import { SettingsSection, SettingRow } from './SettingsPanelBase';
import { Toggle, NumberInput, SelectInput } from '@/ui';

export function SoundSettings() {
  const { settings, setSection } = useConfigStore();
  const s = settings.sound;
  const set = (patch: Partial<typeof s>) => setSection('sound', patch);

  return (
    <SettingsSection title="◆ 音效与朗读" extra="Web Audio / Speech API">
      <SettingRow label="主音量">
        <NumberInput min={0} max={1} step={0.1} value={s.masterVolume} onChange={(v) => set({ masterVolume: v })} />
      </SettingRow>
      <SettingRow label="背景音乐">
        <Toggle checked={s.bgmEnabled} onChange={(v) => set({ bgmEnabled: v })} />
      </SettingRow>
      <SettingRow label="界面音效">
        <Toggle checked={s.sfxEnabled} onChange={(v) => set({ sfxEnabled: v })} />
      </SettingRow>
      <SettingRow label="事件朗读（TTS）" hint="周事件/关键叙事用语音播报">
        <Toggle checked={s.ttsEnabled} onChange={(v) => set({ ttsEnabled: v })} />
      </SettingRow>
      <SettingRow label="朗读语速">
        <NumberInput min={0.5} max={2} step={0.1} value={s.ttsRate} onChange={(v) => set({ ttsRate: v })} />
      </SettingRow>
    </SettingsSection>
  );
}

export function NotificationSettings() {
  const { settings, setSection } = useConfigStore();
  const n = settings.notify;
  const set = (patch: Partial<typeof n>) => setSection('notify', patch);

  return (
    <SettingsSection title="◆ 通知">
      <SettingRow label="通知音效">
        <Toggle checked={n.sound} onChange={(v) => set({ sound: v })} />
      </SettingRow>
      <SettingRow label="战斗事件通知">
        <Toggle checked={n.onBattle} onChange={(v) => set({ onBattle: v })} />
      </SettingRow>
      <SettingRow label="周推进通知">
        <Toggle checked={n.onWeek} onChange={(v) => set({ onWeek: v })} />
      </SettingRow>
      <SettingRow label="招募通知">
        <Toggle checked={n.onRecruit} onChange={(v) => set({ onRecruit: v })} />
      </SettingRow>
    </SettingsSection>
  );
}

export function DifficultySettings() {
  const { settings, setSection } = useConfigStore();
  const d = settings.difficulty;
  const set = (patch: Partial<typeof d>) => setSection('difficulty', patch);

  const applyMode = (mode: 'relaxed' | 'standard' | 'brutal') => {
    if (mode === 'relaxed') set({ mode, damageMultiplier: 0.75, stressMultiplier: 0.75, enemyBias: -1, deathPenalty: 'light' });
    else if (mode === 'brutal') set({ mode, damageMultiplier: 1.25, stressMultiplier: 1.25, enemyBias: 1, deathPenalty: 'full' });
    else set({ mode, damageMultiplier: 1, stressMultiplier: 1, enemyBias: 0, deathPenalty: 'full' });
  };

  return (
    <SettingsSection title="◆ 难度" extra="影响判定，不只是界面">
      <SettingRow label="难度档位">
        <SelectInput
          value={d.mode}
          onChange={(v) => applyMode(v as 'relaxed' | 'standard' | 'brutal')}
          options={[
            { value: 'relaxed', label: '宽松（庇护所）' },
            { value: 'standard', label: '标准（暗黑地牢）' },
            { value: 'brutal', label: '残酷（血月）' },
          ]}
        />
      </SettingRow>
      <SettingRow label="敌方伤害倍率">
        <NumberInput min={0.5} max={2} step={0.05} value={d.damageMultiplier} onChange={(v) => set({ damageMultiplier: v })} />
      </SettingRow>
      <SettingRow label="压力倍率">
        <NumberInput min={0.5} max={2} step={0.05} value={d.stressMultiplier} onChange={(v) => set({ stressMultiplier: v })} />
      </SettingRow>
      <SettingRow label="遭遇规模偏置" hint="-1 减少敌人数 / 1 增加">
        <NumberInput min={-1} max={1} step={0.5} value={d.enemyBias} onChange={(v) => set({ enemyBias: v })} />
      </SettingRow>
      <SettingRow label="死亡惩罚">
        <SelectInput
          value={d.deathPenalty}
          onChange={(v) => set({ deathPenalty: v as 'none' | 'light' | 'full' })}
          options={[
            { value: 'none', label: '无（不朽）' },
            { value: 'light', label: '轻（压力冲击）' },
            { value: 'full', label: '完整（永久死亡）' },
          ]}
        />
      </SettingRow>
    </SettingsSection>
  );
}

export function QuirkSettings() {
  const { settings, setSection } = useConfigStore();
  const q = settings.quirk;
  const set = (patch: Partial<typeof q>) => setSection('quirk', patch);

  return (
    <SettingsSection title="◆ 怪癖规则" extra="英雄性格系统">
      <SettingRow label="怪癖上限">
        <NumberInput min={2} max={12} value={q.maxQuirks} onChange={(v) => set({ maxQuirks: v })} />
      </SettingRow>
      <SettingRow label="可锁定怪癖数">
        <NumberInput min={0} max={4} value={q.lockableQuirks} onChange={(v) => set({ lockableQuirks: v })} />
      </SettingRow>
      <SettingRow label="疾病概率偏置">
        <NumberInput min={0} max={1} step={0.05} value={q.diseaseChance} onChange={(v) => set({ diseaseChance: v })} />
      </SettingRow>
    </SettingsSection>
  );
}

export function DlcSettings() {
  const { settings, setSection } = useConfigStore();
  const d = settings.dlc;
  const set = (patch: Partial<typeof d>) => setSection('dlc', patch);

  return (
    <SettingsSection title="◆ DLC 内容" extra="决定可用区域与玩法">
      <SettingRow label="猩红庭院" hint="血色瘟疫 / 猩红诅咒 / 庭院区域">
        <Toggle checked={d.crimsonCourt} onChange={(v) => set({ crimsonCourt: v })} />
      </SettingRow>
      <SettingRow label="疯狂之色" hint="农场无尽模式 / 磨坊区域">
        <Toggle checked={d.colorOfMadness} onChange={(v) => set({ colorOfMadness: v })} />
      </SettingRow>
      <SettingRow label="屠夫马戏团" hint="斗技场 PvE 模式">
        <Toggle checked={d.butcherCircus} onChange={(v) => set({ butcherCircus: v })} />
      </SettingRow>
    </SettingsSection>
  );
}

export function PromptSettings() {
  const { settings, setSection } = useConfigStore();
  const p = settings.prompt;
  const set = (patch: Partial<typeof p>) => setSection('prompt', patch);
  const wb = useWorldbookStore((s) => s.budgetLimit);
  const setWb = useWorldbookStore((s) => s.setBudgetLimit);

  return (
    <SettingsSection title="◆ 提示词组装" extra="Assembly Plan">
      <SettingRow label="叙事预算（token）">
        <NumberInput min={500} max={16000} step={100} value={p.budgetLimit} onChange={(v) => set({ budgetLimit: v })} />
      </SettingRow>
      <SettingRow label="世界书注入预算（token）">
        <NumberInput min={100} max={8000} step={100} value={wb} onChange={setWb} />
      </SettingRow>
      <SettingRow label="记录 Trace" hint="LLM 调试台可查看组装与响应轨迹">
        <Toggle checked={p.showTraces} onChange={(v) => set({ showTraces: v })} />
      </SettingRow>
    </SettingsSection>
  );
}
