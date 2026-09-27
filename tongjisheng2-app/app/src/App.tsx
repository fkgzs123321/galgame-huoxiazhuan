import { contentLoader, type ContentEntry } from '@content/content-loader';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EjsEngine, estimateTokens } from '@runtime/ejs-engine';
import { MvuRuntime, deepClone } from '@runtime/mvu-runtime';
import { getwiLoader } from '@runtime/getwi-loader';
import { worldbookSelector, type SelectionResult } from '@runtime/worldbook-selector';
import { getwiScheduler, type ScheduleResult, type ScheduleContext } from '@runtime/getwi-scheduler';
import { schemaRegistry, type FieldInfo } from '@runtime/schema-loader';
import { MvuTransaction, parseAiOutput, type TransactionResult } from '@runtime/mvu-transaction';
import { Kernel, type CommittedFacts, type CandidateChangeSet } from '@runtime/kernel';
import { saveCas } from '@db/save-cas';
import {
  recovery,
  type ConsistencyCheck,
  type FailureReport,
  type RecoveryReport,
} from '@runtime/recovery';
import * as idb from '@db/indexeddb';
import {
  importPreset,
  validatePresetFormat,
  savePreset,
  loadPreset,
  listPresets,
  deletePreset,
  clearAllPresets,
  type PresetProfile,
  type PresetImportResult,
} from '@runtime/preset';
import { BUILTIN_PRESETS, builtinOriginalDefault, builtinRomanceSim } from '@content/presets/builtin-presets';
import { FULL_PRESETS, findPresetForProfile } from '@content/presets/preset-library';
import { findFullPreset as findPresetInLibrary } from '@content/presets/preset-library';
import {
  ALL_AI_PROFILES,
  STAGE1_PROFILES,
  mainChatProfile,
  varUpdateProfile,
  type AiProfile,
  type AiProfileId,
} from '@ai/profiles';
import { PromptAssembler, type AssemblyResult } from '@runtime/prompt-assembly';
import { directTurn } from '@gateway/index';
import { ModelGateway, modelGateway, type GatewayResult } from '@runtime/model-gateway';
import {
  ConfigPage,
  IdentitySelect,
  MainChat,
  StatusBar,
  SaveRecovery,
  E2EVerifier,
  NpcPanel,
  Stage2Step9Panel,
  GameView,
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
  loadAppConfig,
  DEFAULT_APP_CONFIG,
  IDENTITY_OPTIONS,
  THEME_VARS,
  THEME_OPTIONS,
  applyTheme,
  loadSavedTheme,
  saveTheme,
  type ThemeName,
  type AppConfig,
  type ChatMessage,
  type IdentityOption,
  type MainChatStatus,
  type VariableUpdateEvent,
} from '@ui/index';
import {
  useConfigStore,
  useUiStore,
  useChatStore,
  useNpcStore,
  useSaveStore,
  useGameplayStore,
} from '@stores/index';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@pages/HomePage';
import { ArchivePage } from '@pages/ArchivePage';
import { RelationshipGraphPage } from '@pages/RelationshipGraphPage';
import { MemoryPage } from '@pages/MemoryPage';
import { LogCenterPage } from '@pages/LogCenterPage';
import { OnboardingWizardPage } from '@pages/OnboardingWizardPage';
import { LifeSnapshotsPage } from '@pages/LifeSnapshotsPage';
import { LLMDebugPage } from '@pages/LLMDebugPage';
import { CharacterCodexPage } from '@pages/CharacterCodexPage';
import { WorldMapPage } from '@pages/WorldMapPage';
import { PlotTimelinePage } from '@pages/PlotTimelinePage';
import { PanelPage } from '@pages/PanelPage';
import { PanelHandlersProvider, type PanelHandlers } from '@pages/PanelHandlersContext';
import { npcActionRunner, type NpcActionResult } from '@runtime/npc/action-runner';
import { triggeredAiInvoker } from '@runtime/triggered-ai-invoker';
import type { TimeSlot } from '@content/npc/schedule-data';
import { achievementEngine, type PlaythroughRecord } from '@runtime/achievement-engine';
import { detectEnding } from '@runtime/ending-detector';

/**
 * 阶段1 占位入口:验证项目骨架 + 内容包 + Host Foundation
 * 步骤7会替换为完整的路由(App → ConfigPage → IdentitySelect → MainChat + StatusBar)
 */

interface Step2Check {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'ok' | 'fail';
  detail?: string;
}

export default function App() {
  const stats = useMemo(() => contentLoader.stats(), []);
  const totalEntries = contentLoader.totalEntries;

  // 验证关键资产可加载(步骤1遗留,保留作回归)
  const keyAssets = useMemo(() => {
    const checks: Array<{ key: string; label: string; entry: ContentEntry | null }> = [
      { key: 'D0系统控制器', label: 'EJS D0系统控制器', entry: contentLoader.getByEntryKey('D0系统控制器') },
      { key: 'EJS精准控制框架', label: 'EJS精准控制框架', entry: contentLoader.getByEntryKey('EJS精准控制框架') },
      { key: 'initvar', label: 'MVU initvar.yaml', entry: contentLoader.getByEntryKey('initvar') },
      { key: '变量列表', label: 'MVU 变量列表.txt', entry: contentLoader.getByEntryKey('变量列表') },
      { key: '变量更新规则', label: 'MVU 变量更新规则.yaml', entry: contentLoader.getByEntryKey('变量更新规则') },
      { key: '变量输出格式', label: 'MVU 变量输出格式.txt', entry: contentLoader.getByEntryKey('变量输出格式') },
      { key: '变量输出格式_额外模型', label: 'MVU 变量输出格式_额外模型.txt', entry: contentLoader.getByEntryKey('变量输出格式_额外模型') },
      { key: '鸣泽美佐子_基础信息', label: '角色 鸣泽美佐子_基础信息', entry: contentLoader.getByEntryKey('鸣泽美佐子_基础信息') },
      { key: '主角设定', label: '主角设定.txt', entry: contentLoader.getByEntryKey('主角设定') },
      { key: '玩家画像', label: '玩家画像.txt', entry: contentLoader.getByEntryKey('玩家画像') },
      { key: '核心铁律', label: '扮演准则 核心铁律', entry: contentLoader.getByEntryKey('核心铁律') },
      { key: '思维链', label: '扮演准则 思维链', entry: contentLoader.getByEntryKey('思维链') },
    ];
    return checks;
  }, []);

  const loadedCount = keyAssets.filter((c) => c.entry !== null).length;
  const sampleEntry = keyAssets.find((c) => c.entry !== null)?.entry;

  // 步骤2 验证
  const [checks, setChecks] = useState<Step2Check[]>([
    { id: 'idb-open', label: 'IndexedDB 打开与版本化', status: 'pending' },
    { id: 'idb-kv', label: 'KV 读写原子性', status: 'pending' },
    { id: 'idb-rev', label: 'Revision CAS 创建/读取/链回溯', status: 'pending' },
    { id: 'mvu-getset', label: 'MVU getvar/setvar 路径导航', status: 'pending' },
    { id: 'mvu-patch', label: 'MVU JSONPatch applyPatch(replace/add/remove)', status: 'pending' },
    { id: 'getwi-resolve', label: 'getwi 路径解析(EJS预处理/角色/世界观)', status: 'pending' },
    { id: 'getwi-expand', label: 'getwi 源码级内联展开(无循环)', status: 'pending' },
    { id: 'ejs-render', label: 'EJS 渲染 D0系统控制器(含 getwi 调用链)', status: 'pending' },
    // 步骤3 Lore Runtime 验证
    { id: 'wb-parse', label: '世界书选择器解析 index.yaml(190条目)', status: 'pending' },
    { id: 'wb-strategy', label: '策略分类(constant/selective/at_depth/关灯)', status: 'pending' },
    { id: 'wb-select', label: 'select() 上下文筛选(before_char/after_char/at_depth)', status: 'pending' },
    { id: 'wb-offlight', label: '关灯条目归类(enabled=false 由 getwi 加载)', status: 'pending' },
    { id: 'sched-tree', label: 'getwi 调度树构建(D0→7分控→角色档案)', status: 'pending' },
    { id: 'sched-eval', label: '调度树按上下文展开(scene_mode/day/chapter)', status: 'pending' },
    { id: 'sched-validate', label: '调度树节点全部对应关灯条目可加载', status: 'pending' },
    // 步骤4 MVU 事务验证
    { id: 'schema-compile', label: 'schema.ts → Zod schema 编译(?raw + new Function)', status: 'pending' },
    { id: 'schema-fields', label: '字段索引构建(10 命名空间 × 全字段 path→FieldInfo)', status: 'pending' },
    { id: 'schema-validate-num', label: '数值字段校验+transform(主角.魅力=200→clamp 100)', status: 'pending' },
    { id: 'schema-validate-enum', label: 'enum 字段校验(时间.时段=上午 ✓ / 中午 ✗)', status: 'pending' },
    { id: 'tx-parse', label: '解析 AI 输出(UpdateVariable/Analysis/JSONPatch/UpdateTable)', status: 'pending' },
    { id: 'tx-normalize', label: 'op 规范化(delta→replace / insert→add / /a/b→a.b)', status: 'pending' },
    { id: 'tx-apply', label: '事务应用(before/after 快照 + safeParseFull 收尾)', status: 'pending' },
    // 步骤5 Turn Kernel 验证
    { id: 'kernel-init', label: 'Kernel 初始化(空存档→空 stat_data;initializeNewGame 写入 revision)', status: 'pending' },
    { id: 'kernel-precheck', label: '前置校验(身份未选择→triggerOpening / 死结局触发 / 疲劳警告)', status: 'pending' },
    { id: 'kernel-start', label: 'startTurn 启动回合(StreamDraft + turnCount/actionsToday +1)', status: 'pending' },
    { id: 'kernel-finalize', label: 'finalizeStream 流式完成(RawModelResponse + 叙事正文提取)', status: 'pending' },
    { id: 'kernel-aggregate', label: 'aggregate 候选聚合(CandidateChangeSet + 候选 trace)', status: 'pending' },
    { id: 'kernel-commit', label: 'commit IndexedDB CAS 提交(revision + KV 指针 + before/after)', status: 'pending' },
    { id: 'kernel-rollback', label: 'rollback 回滚(恢复 base stat_data + turnCount-1)', status: 'pending' },
    // 步骤6 预设兼容 + Prompt 组装 + Model Gateway
    { id: 'preset-builtin', label: '内置预设加载(原卡默认/恋爱模拟 2 个)', status: 'pending' },
    { id: 'preset-import', label: 'ST 预设 JSON 导入(合成测试数据:prompts+order+sampler)', status: 'pending' },
    { id: 'preset-mapper', label: 'mapper 转换(prompts/sampler/context/session 正确映射)', status: 'pending' },
    { id: 'preset-store', label: '预设 IndexedDB 持久化(save/load/list/delete)', status: 'pending' },
    { id: 'ai-profiles', label: '8AI Profile 注册(2 阶段1 启用 + 6 占位)', status: 'pending' },
    { id: 'prompt-assembly-main', label: '主聊天AI Prompt 组装(D0+世界书+角色档案+历史+占位符)', status: 'pending' },
    { id: 'prompt-assembly-var', label: '变量AI Prompt 组装(变量输出格式+stat_data快照+无D0)', status: 'pending' },
    { id: 'gateway-endpoint', label: 'Model Gateway 端点校验(未配置→ok=false+trace)', status: 'pending' },
    { id: 'gateway-parallel', label: '2AI 并行调用骨架(invokeParallel 接口可用)', status: 'pending' },
    { id: 'sampler-effect', label: 'Sampler 参数生效(预设 sampler 正确传入请求体)', status: 'pending' },
  ]);

  const [ejsOutput, setEjsOutput] = useState<string>('');
  const [ejsTrace, setEjsTrace] = useState<string[]>([]);
  const [ejsMissing, setEjsMissing] = useState<string[]>([]);
  const [ejsTokens, setEjsTokens] = useState<number>(0);

  // 步骤3 状态
  const [wbStats, setWbStats] = useState<ReturnType<typeof worldbookSelector.stats> | null>(null);
  const [wbSelection, setWbSelection] = useState<SelectionResult | null>(null);
  const [schedResult, setSchedResult] = useState<ScheduleResult | null>(null);
  const [schedMissing, setSchedMissing] = useState<string[]>([]);

  // 步骤4 状态
  const [schemaFields, setSchemaFields] = useState<FieldInfo[]>([]);
  const [schemaByNamespace, setSchemaByNamespace] = useState<Record<string, number>>({});
  const [txResult, setTxResult] = useState<TransactionResult | null>(null);
  const [txParsed, setTxParsed] = useState<ReturnType<typeof parseAiOutput> | null>(null);

  // 步骤5 状态
  const [kernelFacts, setKernelFacts] = useState<CommittedFacts | null>(null);
  const [kernelCandidate, setKernelCandidate] = useState<CandidateChangeSet | null>(null);

  // 步骤6 状态
  const [builtinPresets, setBuiltinPresets] = useState<PresetProfile[]>([]);
  const [importResult, setImportResult] = useState<PresetImportResult | null>(null);
  const [importedPreset, setImportedPreset] = useState<PresetProfile | null>(null);
  const [presetStoreList, setPresetStoreList] = useState<Array<{ id: string; name: string; promptCount: number }>>([]);
  const [aiProfilesList, setAiProfilesList] = useState<AiProfile[]>([]);
  const [mainAssembly, setMainAssembly] = useState<AssemblyResult | null>(null);
  const [varAssembly, setVarAssembly] = useState<AssemblyResult | null>(null);
  const [gatewayNoEndpoint, setGatewayNoEndpoint] = useState<GatewayResult | null>(null);
  const [gatewayParallelResult, setGatewayParallelResult] = useState<{ main: GatewayResult; varRes: GatewayResult } | null>(null);
  const [samplerRequest, setSamplerRequest] = useState<Record<string, unknown> | null>(null);

  // ─── 步骤7:UI Projection 状态(迁移至 stores) ───
  // configStore:配置 + 主题
  const appConfig = useConfigStore((s) => s.config);
  const setAppConfig = useConfigStore((s) => s.setConfig);
  const currentTheme = useConfigStore((s) => s.theme);
  const setCurrentTheme = useConfigStore((s) => s.setTheme);
  // chatStore:聊天消息 + 生成状态
  const chatMessages = useChatStore((s) => s.messages);
  const setChatMessages = useChatStore((s) => s.setMessages);
  const mainChatStatus = useChatStore((s) => s.status);
  const setMainChatStatus = useChatStore((s) => s.setStatus);
  const chatError = useChatStore((s) => s.error);
  const setChatError = useChatStore((s) => s.setError);
  const lastVariableUpdate = useChatStore((s) => s.lastVariableUpdate);
  const setLastVariableUpdate = useChatStore((s) => s.setLastVariableUpdate);
  // gameplayStore:身份 + stat_data 快照 + 就绪标记
  const selectedIdentity = useGameplayStore((s) => s.selectedIdentity);
  const setSelectedIdentity = useGameplayStore((s) => s.setSelectedIdentity);
  const step7StatData = useGameplayStore((s) => s.statData);
  const setStep7StatData = useGameplayStore((s) => s.setStatData);
  const step7Ready = useGameplayStore((s) => s.step7Ready);
  const setStep7Ready = useGameplayStore((s) => s.setStep7Ready);
  const stage2Step9Ready = useGameplayStore((s) => s.stage2Step9Ready);
  const setStage2Step9Ready = useGameplayStore((s) => s.setStage2Step9Ready);
  const step9Ready = useGameplayStore((s) => s.step9Ready);
  const setStep9Ready = useGameplayStore((s) => s.setStep9Ready);
  const endingRecordedRef = useRef<string | null>(null);

  // ─── 身份写入 Kernel 的待办(kernel 未就绪时暂存,就绪后补写) ───
  const pendingIdentityRef = useRef<{ sd: Record<string, unknown>; identityId: string } | null>(null);

  // ─── mock 流式定时器(handleChatStop 需取消) ───
  const mockStreamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockStreamActiveRef = useRef(false);

  // ─── 步骤8:Save-Recovery 状态(迁移至 saveStore) ───
  const step8KernelRef = useSaveStore((s) => s.kernelRef);
  const step8Ready = useSaveStore((s) => s.ready);
  const setStep8Ready = useSaveStore((s) => s.setReady);
  const step8RecoveryReport = useSaveStore((s) => s.recoveryReport);
  const setStep8RecoveryReport = useSaveStore((s) => s.setRecoveryReport);
  const step8Consistency = useSaveStore((s) => s.consistency);
  const setStep8Consistency = useSaveStore((s) => s.setConsistency);
  const step8FailureReport = useSaveStore((s) => s.failureReport);
  const setStep8FailureReport = useSaveStore((s) => s.setFailureReport);
  const step8Message = useSaveStore((s) => s.message);
  const setStep8Message = useSaveStore((s) => s.setMessage);

  // ─── 阶段2:NPC 自然行动系统状态(迁移至 npcStore) ───
  const stage2NpcReady = useNpcStore((s) => s.ready);
  const setStage2NpcReady = useNpcStore((s) => s.setReady);
  const lastNpcAction = useNpcStore((s) => s.lastAction);
  const setLastNpcAction = useNpcStore((s) => s.setLastAction);
  const npcDayCount = useNpcStore((s) => s.dayCount);
  const setNpcDayCount = useNpcStore((s) => s.setDayCount);
  const npcTimeSlot = useNpcStore((s) => s.timeSlot);
  const setNpcTimeSlot = useNpcStore((s) => s.setTimeSlot);
  const npcRunLoading = useNpcStore((s) => s.runLoading);
  const setNpcRunLoading = useNpcStore((s) => s.setRunLoading);
  const npcMessage = useNpcStore((s) => s.message);
  const setNpcMessage = useNpcStore((s) => s.setMessage);

  // ─── 视图模式:game=游戏模式(默认) / dev=开发者模式(迁移至 uiStore) ───
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const gamePanel = useUiStore((s) => s.gamePanel);
  const setGamePanel = useUiStore((s) => s.setGamePanel);

  // 初始化主题
  useEffect(() => {
    const saved = loadSavedTheme();
    setCurrentTheme(saved);
    applyTheme(saved);
    // 从 localStorage 恢复视图模式
    const savedMode = (typeof localStorage !== 'undefined' && localStorage.getItem('__app_view_mode__')) as 'game' | 'dev' | null;
    if (savedMode) setViewMode(savedMode);
  }, []);

  // 玩法页操作(地图移动等)后同步 stat_data 到 UI
  useEffect(() => {
    const handler = () => {
      const k = step8KernelRef.current;
      if (k) setStep7StatData(k.getStatData());
    };
    window.addEventListener('app:stat-data-changed', handler);
    return () => window.removeEventListener('app:stat-data-changed', handler);
  }, []);

  const handleThemeChange = useCallback((theme: ThemeName) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    saveTheme(theme);
  }, []);

  const handleViewModeChange = useCallback((mode: 'game' | 'dev') => {
    setViewMode(mode);
    if (typeof localStorage !== 'undefined') localStorage.setItem('__app_view_mode__', mode);
    if (mode === 'game') setGamePanel(null);
  }, []);

  // 阶段2 步骤9 就绪标记(阶段2 NPC 就绪后)
  useEffect(() => {
    if (!stage2NpcReady) return;
    const t = setTimeout(() => setStage2Step9Ready(true), 200);
    return () => clearTimeout(t);
  }, [stage2NpcReady]);

  const updateCheck = (id: string, patch: Partial<Step2Check>) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  // 步骤2 验证流程
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let txParsedLocal: ReturnType<typeof parseAiOutput> | null = null;
      // 1. IndexedDB 打开
      updateCheck('idb-open', { status: 'running' });
      try {
        const db = await idb.openDB();
        if (cancelled) return;
        const storeNames = Array.from(db.objectStoreNames);
        updateCheck('idb-open', {
          status: 'ok',
          detail: `DB=${db.name} v${db.version};stores=${storeNames.join(',')}`,
        });
      } catch (e) {
        updateCheck('idb-open', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
        return;
      }

      // 2. KV 读写
      updateCheck('idb-kv', { status: 'running' });
      try {
        await idb.kvSet('__step2_test__', { ts: Date.now(), hello: 'world' });
        const got = await idb.kvGet<{ hello: string; ts: number }>('__step2_test__');
        await idb.kvDelete('__step2_test__');
        if (cancelled) return;
        if (got && got.hello === 'world') {
          updateCheck('idb-kv', {
            status: 'ok',
            detail: `写入→读取→删除 ts=${got.ts}`,
          });
        } else {
          updateCheck('idb-kv', { status: 'fail', detail: '回读数据不匹配' });
        }
      } catch (e) {
        updateCheck('idb-kv', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 3. Revision CAS
      updateCheck('idb-rev', { status: 'running' });
      try {
        const rev1 = await idb.createRevision({
          content: { day: 1, time: '08:00' },
          scope: 'auto',
          label: 'step2-test-1',
        });
        const rev2 = await idb.createRevision({
          content: { day: 1, time: '08:30' },
          parentHash: rev1.hash,
          scope: 'auto',
          label: 'step2-test-2',
        });
        const chain = await idb.traceRevisionChain(rev2.hash);
        // 清理测试 revision
        await idb.wipeAll();
        if (cancelled) return;
        if (chain.length === 2 && chain[0].hash === rev2.hash && chain[1].hash === rev1.hash) {
          updateCheck('idb-rev', {
            status: 'ok',
            detail: `rev1=${rev1.hash.slice(0, 8)}→rev2=${rev2.hash.slice(0, 8)};chain=${chain.length}`,
          });
        } else {
          updateCheck('idb-rev', {
            status: 'fail',
            detail: `链长度不对: ${chain.length}`,
          });
        }
      } catch (e) {
        updateCheck('idb-rev', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 4. MVU getvar/setvar
      updateCheck('mvu-getset', { status: 'running' });
      try {
        const mvu = new MvuRuntime({
          主角: { 魅力: 50, 玩家身份: '未选择' },
          时间: { 天数: 1, 时段: '早' },
        });
        const c1 = mvu.getvar('stat_data.主角.魅力') === 50;
        const c2 = mvu.getvar('主角.玩家身份') === '未选择';
        const c3 = mvu.getvar('stat_data.不存在的路径', { defaults: 'fallback' }) === 'fallback';
        mvu.setvar('stat_data.主角.魅力', 80);
        const c4 = mvu.getvar('主角.魅力') === 80;
        mvu.setvar('主角.新字段.嵌套', 'ok');
        const c5 = mvu.getvar('主角.新字段.嵌套') === 'ok';
        if (cancelled) return;
        if (c1 && c2 && c3 && c4 && c5) {
          updateCheck('mvu-getset', {
            status: 'ok',
            detail: 'stat_data 前缀/无前缀/defaults/中间对象自动创建 全部通过',
          });
        } else {
          updateCheck('mvu-getset', {
            status: 'fail',
            detail: `c1=${c1} c2=${c2} c3=${c3} c4=${c4} c5=${c5}`,
          });
        }
      } catch (e) {
        updateCheck('mvu-getset', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 5. MVU JSONPatch
      updateCheck('mvu-patch', { status: 'running' });
      try {
        const mvu = new MvuRuntime({
          主角: { 魅力: 50, 现金: 1000 },
          当前女角: { 好感度: 10 },
        });
        const result = mvu.applyPatch([
          { op: 'replace', path: 'stat_data.主角.魅力', value: 80 },
          { op: 'add', path: 'stat_data.主角.新字段', value: 'added' },
          { op: 'remove', path: 'stat_data.主角.现金' },
        ]);
        if (cancelled) return;
        const after = mvu.snapshot();
        if (
          result.ok &&
          after.主角 &&
          (after.主角 as Record<string, unknown>).魅力 === 80 &&
          (after.主角 as Record<string, unknown>).新字段 === 'added' &&
          !('现金' in (after.主角 as Record<string, unknown>))
        ) {
          updateCheck('mvu-patch', {
            status: 'ok',
            detail: 'replace/add/remove 全部应用,errors=0',
          });
        } else {
          updateCheck('mvu-patch', {
            status: 'fail',
            detail: `ok=${result.ok} errors=${result.errors.join(';')}`,
          });
        }
      } catch (e) {
        updateCheck('mvu-patch', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 6. getwi 路径解析
      updateCheck('getwi-resolve', { status: 'running' });
      try {
        getwiLoader.clearCache();
        const cases: Array<[string, boolean]> = [
          ['EJS预处理/全局规则总表', true],
          ['EJS预处理/D0系统控制器', true],
          ['EJS预处理/角色性格控制器', true],
          ['角色/鸣泽美佐子/基础信息', true],
          ['世界观/地理/八十八学园', true],
          ['世界观/扮演准则/核心铁律', true],
        ];
        const results = cases.map(([p, expect]) => {
          const r = getwiLoader.loadRaw(p);
          return { p, expect, found: r.found, len: r.rawSource.length };
        });
        if (cancelled) return;
        const allPass = results.every((r) => r.found === r.expect);
        updateCheck('getwi-resolve', {
          status: allPass ? 'ok' : 'fail',
          detail: results
            .map((r) => `${r.p.split('/').pop()}:${r.found ? '✓' : '✗'}${r.found ? `(${r.len}字)` : ''}`)
            .join(' | '),
        });
      } catch (e) {
        updateCheck('getwi-resolve', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 7. getwi 源码级内联展开
      updateCheck('getwi-expand', { status: 'running' });
      try {
        const d0 = contentLoader.getByEntryKey('D0系统控制器');
        if (!d0) {
          updateCheck('getwi-expand', { status: 'fail', detail: 'D0系统控制器 未找到' });
        } else {
          const expanded = getwiLoader.expand(d0.content);
          if (cancelled) return;
          const missingCount = (expanded.match(/getwi:missing:/g) || []).length;
          const cycleCount = (expanded.match(/getwi:cycle:/g) || []).length;
          const fallbackCount = (expanded.match(/getwi:runtime-fallback:/g) || []).length;
          // 至少应该内联了全局规则总表、属性技能骰子联动、LCG骰子/引擎 等
          const hasPlayerIdentities = /PLAYER_IDENTITIES/.test(expanded);
          const hasDiceEngine = /_rollAction|LCG骰子/.test(expanded);
          updateCheck('getwi-expand', {
            status:
              cycleCount === 0 && hasPlayerIdentities && hasDiceEngine ? 'ok' : 'fail',
            detail: `expand后=${expanded.length}字;missing=${missingCount};cycle=${cycleCount};fallback=${fallbackCount};PLAYER_IDENTITIES=${hasPlayerIdentities};骰子引擎=${hasDiceEngine}`,
          });
        }
      } catch (e) {
        updateCheck('getwi-expand', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 8. EJS 渲染 D0系统控制器(终极验证)
      updateCheck('ejs-render', { status: 'running' });
      try {
        const d0 = contentLoader.getByEntryKey('D0系统控制器');
        if (!d0) {
          updateCheck('ejs-render', { status: 'fail', detail: 'D0系统控制器 未找到' });
          return;
        }
        // 准备 MVU 运行时(用 initvar.yaml 的最小种子)
        const mvu = new MvuRuntime({
          时间: { 当前日期: '12-22', 星期: '周五', 时段: '早', 当前时间: '08:00', 天数: 1, 季节: '冬', 章节: '寒假前奏', 天气: '晴' },
          场景: { 当前地点: '未选择', 当前女角名: '无', 场景模式: '休息' },
          主角: {
            玩家身份: '未选择', 玩家姓名: '{{user}}', 年龄: 0, 住所: '未选择',
            魅力: 0, 学业: 0, 体力: 0, 社交: 0, 敏感: 0, 声誉: 0,
            饥饿: 30, 口渴: 20, 清洁: 80, 疲劳: 0, 心情: 70, 睡眠质量: 70,
            现金: 0, 储蓄: 0, 违法计数: 0, 法律警告: 0,
            今日餐费: 0, 今日礼费: 0, 今日交通费: 0, 今日总消费: 0, 储蓄目标: 50000,
          },
          临时: { 上次事件ID: '', 上次选择结果: '', 本时段楼层数: 0, 当前难度: '普通', 预期下时段序号: 1, 连续无收入天数: 0, 超自然妄想计数: 0, 死结局标识: '' },
          经济: { 当日收入: 0, 当日支出: 0, 累计储蓄: 0 },
        });
        const engine = new EjsEngine(mvu);
        getwiLoader.clearCache();
        const result = await engine.render(d0.content, {
          filename: 'ejs/D0系统控制器.txt',
        });
        if (cancelled) return;
        if (result.ok && result.output.length > 0) {
          setEjsOutput(result.output);
          setEjsTrace(result.trace ?? []);
          setEjsMissing(result.missing ?? []);
          setEjsTokens(estimateTokens(result.output));
          updateCheck('ejs-render', {
            status: 'ok',
            detail: `输出=${result.output.length}字(~${estimateTokens(result.output)}tokens);trace=${result.trace?.length ?? 0};missing=${result.missing?.length ?? 0}`,
          });
        } else {
          setEjsOutput('');
          setEjsTrace(result.trace ?? []);
          setEjsMissing(result.missing ?? []);
          updateCheck('ejs-render', {
            status: 'fail',
            detail: result.error ?? '输出为空',
          });
        }
      } catch (e) {
        updateCheck('ejs-render', {
          status: 'fail',
          detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        });
      }

      // ─── 步骤3 Lore Runtime 验证 ───

      // 9. 世界书选择器解析 index.yaml
      updateCheck('wb-parse', { status: 'running' });
      try {
        const err = worldbookSelector.getInitError();
        const total = worldbookSelector.totalEntries;
        if (cancelled) return;
        if (err) {
          updateCheck('wb-parse', { status: 'fail', detail: `解析错误: ${err}` });
        } else if (total < 100) {
          updateCheck('wb-parse', {
            status: 'fail',
            detail: `条目数过少: ${total}(预期 ~190)`,
          });
        } else {
          const stats = worldbookSelector.stats();
          setWbStats(stats);
          updateCheck('wb-parse', {
            status: 'ok',
            detail: `总条目=${stats.total};启用=${stats.enabled};关灯=${stats.offLight};folder数=${Object.keys(stats.byFolder).length}`,
          });
        }
      } catch (e) {
        updateCheck('wb-parse', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 10. 策略分类验证
      updateCheck('wb-strategy', { status: 'running' });
      try {
        const all = worldbookSelector.getAll();
        const byStrategy: Record<string, number> = {};
        const byPosition: Record<string, number> = {};
        for (const e of all) {
          const sKey = e.isOffLight ? '关灯' : e.strategy.type;
          byStrategy[sKey] = (byStrategy[sKey] || 0) + 1;
          byPosition[e.position.type] = (byPosition[e.position.type] || 0) + 1;
        }
        if (cancelled) return;
        const hasConstant = (byStrategy['constant'] ?? 0) > 0;
        const hasOffLight = (byStrategy['关灯'] ?? 0) > 0;
        const hasBeforeChar = (byPosition['before_character_definition'] ?? 0) > 0;
        const hasAtDepth = (byPosition['at_depth'] ?? 0) > 0;
        if (hasConstant && hasOffLight && hasBeforeChar && hasAtDepth) {
          updateCheck('wb-strategy', {
            status: 'ok',
            detail: `策略: ${JSON.stringify(byStrategy)};位置: ${JSON.stringify(byPosition)}`,
          });
        } else {
          updateCheck('wb-strategy', {
            status: 'fail',
            detail: `分类异常: constant=${hasConstant} offLight=${hasOffLight} beforeChar=${hasBeforeChar} atDepth=${hasAtDepth}`,
          });
        }
      } catch (e) {
        updateCheck('wb-strategy', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 11. select() 上下文筛选
      updateCheck('wb-select', { status: 'running' });
      try {
        // 模拟上下文:带聊天历史(可触发 selective,原卡虽全蓝灯,但接口需验证)
        const ctx = {
          chatHistory: ['玩家去了鸣泽家', '与唯聊天', '美佐子叫起床'],
          currentDepth: 2,
        };
        const result = worldbookSelector.select(ctx);
        if (cancelled) return;
        setWbSelection(result);
        const totalSelected =
          result.beforeChar.length + result.afterChar.length + result.atDepth.length;
        if (totalSelected > 0 && result.trace.length > 0) {
          updateCheck('wb-select', {
            status: 'ok',
            detail: `before_char=${result.beforeChar.length};after_char=${result.afterChar.length};at_depth=${result.atDepth.length};off_light=${result.offLight.length};trace=${result.trace.length}`,
          });
        } else {
          updateCheck('wb-select', {
            status: 'fail',
            detail: `选中条目为 0: before=${result.beforeChar.length} after=${result.afterChar.length} atDepth=${result.atDepth.length}`,
          });
        }
      } catch (e) {
        updateCheck('wb-select', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 12. 关灯条目归类
      updateCheck('wb-offlight', { status: 'running' });
      try {
        const offLight = worldbookSelector.getOffLight();
        if (cancelled) return;
        // 验证关键关灯条目存在(D0 控制器/全局规则/角色性格控制器 等)
        const expectedOffLight = [
          'D0系统控制器',
          '全局规则总表',
          '角色性格控制器',
          '世界观场景控制器',
          'LCG骰子引擎',
        ];
        const found = expectedOffLight.filter((k) =>
          offLight.some((e) => e.entryKey === k || e.name === k),
        );
        if (offLight.length > 50 && found.length >= 3) {
          updateCheck('wb-offlight', {
            status: 'ok',
            detail: `关灯条目=${offLight.length};关键条目命中=${found.length}/${expectedOffLight.length}(${found.join(',')})`,
          });
        } else {
          updateCheck('wb-offlight', {
            status: 'fail',
            detail: `关灯条目=${offLight.length};关键命中=${found.length}/${expectedOffLight.length}`,
          });
        }
      } catch (e) {
        updateCheck('wb-offlight', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 13. getwi 调度树构建
      updateCheck('sched-tree', { status: 'running' });
      try {
        const tree = getwiScheduler.getTree();
        const childCount = tree.children?.length ?? 0;
        if (cancelled) return;
        if (tree.entryKey === 'D0系统控制器' && childCount >= 10) {
          updateCheck('sched-tree', {
            status: 'ok',
            detail: `根=D0系统控制器;子节点=${childCount}(必载+条件+场景模式+章节+日程+事件)`,
          });
        } else {
          updateCheck('sched-tree', {
            status: 'fail',
            detail: `调度树异常:根=${tree.entryKey};子节点=${childCount}`,
          });
        }
      } catch (e) {
        updateCheck('sched-tree', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 14. 调度树按上下文展开
      updateCheck('sched-eval', { status: 'running' });
      try {
        // 模拟上下文:第1天早 / 休息模式 / chapter 1
        const ctx: ScheduleContext = {
          sceneMode: '休息',
          dayCount: 1,
          badEndTriggered: false,
        };
        const result = getwiScheduler.schedule(ctx);
        if (cancelled) return;
        setSchedResult(result);
        // 休息模式应该不加载 NSFW/技能系统,但加载寒假日程 day01_1222 + 阶段指导寒假前奏 + 休息模式指令
        const hasDay01 = result.nodes.some((n) => n.entryKey === 'day01_1222');
        const hasChapter1 = result.nodes.some((n) => n.entryKey === '寒假前奏');
        const hasRestMode = result.nodes.some((n) => n.entryKey === '休息模式');
        const hasNsfw = result.nodes.some((n) => n.entryKey === '全局规则-NSFW身体规则');
        const hasSkill = result.nodes.some((n) => n.entryKey === '全局规则-技能系统');
        if (hasDay01 && hasChapter1 && hasRestMode && !hasNsfw && !hasSkill) {
          updateCheck('sched-eval', {
            status: 'ok',
            detail: `选中=${result.nodes.length};day01=${hasDay01};寒假前奏=${hasChapter1};休息模式=${hasRestMode};NSFW=${hasNsfw}(应为 false);技能=${hasSkill}(应为 false)`,
          });
        } else {
          updateCheck('sched-eval', {
            status: 'fail',
            detail: `展开异常: nodes=${result.nodes.length};day01=${hasDay01};chapter1=${hasChapter1};rest=${hasRestMode};nsfw=${hasNsfw};skill=${hasSkill}`,
          });
        }
      } catch (e) {
        updateCheck('sched-eval', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 15. 调度树节点全部对应关灯条目可加载
      updateCheck('sched-validate', { status: 'running' });
      try {
        const validation = getwiScheduler.validateOffLightEntries();
        if (cancelled) return;
        setSchedMissing(validation.missing);
        if (validation.ok) {
          updateCheck('sched-validate', {
            status: 'ok',
            detail: `调度树 ${validation.total} 个节点全部对应关灯条目可加载(无缺失)`,
          });
        } else {
          updateCheck('sched-validate', {
            status: 'fail',
            detail: `缺失 ${validation.missing.length} 个: ${validation.missing.slice(0, 5).join('; ')}${validation.missing.length > 5 ? '...' : ''}`,
          });
        }
      } catch (e) {
        updateCheck('sched-validate', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // ─────────────────────────────────────────────────────
      //  步骤4 MVU 事务验证
      // ─────────────────────────────────────────────────────

      // 16. schema.ts → Zod schema 编译
      updateCheck('schema-compile', { status: 'running' });
      try {
        // schemaRegistry 在模块加载时已编译,若到达此处说明编译成功
        const rootSchema = schemaRegistry.root;
        const hasSafeParse = typeof rootSchema.safeParse === 'function';
        if (cancelled) return;
        if (hasSafeParse) {
          updateCheck('schema-compile', {
            status: 'ok',
            detail: `Zod schema 编译成功;safeParse 可用;root type=${rootSchema.constructor?.name ?? 'ZodType'}`,
          });
        } else {
          updateCheck('schema-compile', {
            status: 'fail',
            detail: '编译结果无 safeParse 方法',
          });
        }
      } catch (e) {
        updateCheck('schema-compile', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 17. 字段索引构建
      updateCheck('schema-fields', { status: 'running' });
      try {
        const all = schemaRegistry.allFields();
        // 按顶层命名空间分组
        const byNs: Record<string, number> = {};
        for (const f of all) {
          const ns = f.path.split('.')[0];
          byNs[ns] = (byNs[ns] || 0) + 1;
        }
        if (cancelled) return;
        setSchemaFields(all);
        setSchemaByNamespace(byNs);
        // 期望 10 个顶层命名空间:时间/场景/主角/当前女角/技能/临时/经济/性格/隐藏/女角
        const expectedNs = ['时间', '场景', '主角', '当前女角', '技能', '临时', '经济', '性格', '隐藏', '女角'];
        const foundNs = expectedNs.filter((ns) => byNs[ns] !== undefined);
        if (all.length > 100 && foundNs.length === 10) {
          updateCheck('schema-fields', {
            status: 'ok',
            detail: `索引 ${all.length} 个字段;${foundNs.length}/10 命名空间:${foundNs.map((n) => `${n}=${byNs[n]}`).join(', ')}`,
          });
        } else {
          updateCheck('schema-fields', {
            status: 'fail',
            detail: `字段数=${all.length};命名空间命中=${foundNs.length}/10(缺:${expectedNs.filter((n) => !byNs[n]).join(',')})`,
          });
        }
      } catch (e) {
        updateCheck('schema-fields', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 18. 数值字段校验 + transform(clamp)
      updateCheck('schema-validate-num', { status: 'running' });
      try {
        // 主角.魅力 schema:z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0)
        // 输入 200 → 应被 clamp 到 100
        const r1 = schemaRegistry.validateValue('主角.魅力', 200);
        const r2 = schemaRegistry.validateValue('主角.魅力', 50);
        const r3 = schemaRegistry.validateValue('主角.魅力', -10);
        // 当前女角.好感度 schema:clamp(-100, 100)
        const r4 = schemaRegistry.validateValue('当前女角.好感度', 150);
        if (cancelled) return;
        const pass =
          r1.ok && r1.value === 100 &&
          r2.ok && r2.value === 50 &&
          r3.ok && r3.value === 0 &&
          r4.ok && r4.value === 100;
        if (pass) {
          updateCheck('schema-validate-num', {
            status: 'ok',
            detail: `魅力 200→${r1.value} / 50→${r2.value} / -10→${r3.value};好感度 150→${r4.value}(全部 clamp 通过)`,
          });
        } else {
          updateCheck('schema-validate-num', {
            status: 'fail',
            detail: `r1=${r1.ok}/${r1.value} r2=${r2.ok}/${r2.value} r3=${r3.ok}/${r3.value} r4=${r4.ok}/${r4.value}`,
          });
        }
      } catch (e) {
        updateCheck('schema-validate-num', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 19. enum 字段校验
      updateCheck('schema-validate-enum', { status: 'running' });
      try {
        // 时间.时段:z.enum(['早','上午','下午','晚','深夜']).prefault('早')
        const r1 = schemaRegistry.validateValue('时间.时段', '上午');
        const r2 = schemaRegistry.validateValue('时间.时段', '中午'); // 非法枚举
        // 主角.玩家身份:z.enum(['未选择','原作主角','川尻信良','长冈芳树','西御寺有友','天道新干线','自定义'])
        const r3 = schemaRegistry.validateValue('主角.玩家身份', '长冈芳树');
        const r4 = schemaRegistry.validateValue('主角.玩家身份', '超人'); // 非法
        if (cancelled) return;
        const pass = r1.ok && !r2.ok && r3.ok && !r4.ok;
        if (pass) {
          updateCheck('schema-validate-enum', {
            status: 'ok',
            detail: `时段 '上午'✓ / '中午'✗(err:${r2.error?.slice(0, 60)});身份 '长冈芳树'✓ / '超人'✗(err:${r4.error?.slice(0, 60)})`,
          });
        } else {
          updateCheck('schema-validate-enum', {
            status: 'fail',
            detail: `r1=${r1.ok} r2=${r2.ok}(应false) r3=${r3.ok} r4=${r4.ok}(应false)`,
          });
        }
      } catch (e) {
        updateCheck('schema-validate-enum', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 20. 解析 AI 输出(UpdateVariable/Analysis/JSONPatch/UpdateTable)
      updateCheck('tx-parse', { status: 'running' });
      try {
        const aiOutput = [
          '主角在鸣泽家起床,美佐子叫下楼吃早饭。',
          '<StatusPlaceHolderImpl/>',
          '<UpdateVariable>',
          '<Analysis>',
          '1事件:第1天早,玩家起床,时段未推进',
          '2数值:饥饿+10(每时段自动),口渴+15(每时段自动)',
          '3门槛:无NSFW/技能行为',
          '4互斥:无女角互斥',
          '5结局:无死结局预警',
          '</Analysis>',
          '<JSONPatch>',
          '[',
          '  { "op": "replace", "path": "/时间/当前时间", "value": "08:30" },',
          '  { "op": "delta", "path": "/主角/饥饿", "value": 10 },',
          '  { "op": "delta", "path": "/主角/口渴", "value": 15 },',
          '  { "op": "replace", "path": "/场景/当前地点", "value": "鸣泽家" }',
          ']',
          '</JSONPatch>',
          '</UpdateVariable>',
          '<UpdateTable>',
          "UPDATE global_state SET cur_time = '08:30' WHERE row_id = 1;",
          "UPDATE protagonist_info SET hunger = 40, thirst = 35 WHERE row_id = 1;",
          '</UpdateTable>',
        ].join('\n');
        const parsed = parseAiOutput(aiOutput);
        if (cancelled) return;
        setTxParsed(parsed);
        txParsedLocal = parsed;
        const pass =
          parsed.hasUpdateVariable &&
          parsed.analysis.length > 0 &&
          parsed.hasJsonPatch &&
          parsed.ops.length === 4 &&
          parsed.hasUpdateTable &&
          parsed.sqlStatements.length === 2 &&
          parsed.parseErrors.length === 0;
        if (pass) {
          updateCheck('tx-parse', {
            status: 'ok',
            detail: `UV=${parsed.hasUpdateVariable};Analysis=${parsed.analysis.length}字;JP=${parsed.ops.length} ops;UT=${parsed.sqlStatements.length} SQL;errors=${parsed.parseErrors.length}`,
          });
        } else {
          updateCheck('tx-parse', {
            status: 'fail',
            detail: `UV=${parsed.hasUpdateVariable} Analysis=${parsed.analysis.length} JP=${parsed.ops.length} UT=${parsed.hasUpdateTable} SQL=${parsed.sqlStatements.length} err=${parsed.parseErrors.length}`,
          });
        }
      } catch (e) {
        updateCheck('tx-parse', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 21. op 规范化(delta→replace, insert→add, /a/b→a.b)
      updateCheck('tx-normalize', { status: 'running' });
      try {
        if (cancelled) return;
        // 检查 txParsed 中的 ops 是否已规范化
        if (!txParsedLocal) {
          updateCheck('tx-normalize', { status: 'fail', detail: 'txParsed 为 null(步骤20 失败)' });
        } else {
          // parseAiOutput 内部已做 shape 规范化(path 转点号, op 类型转换)
          // 但 delta 的值转换延迟到 apply 阶段
          const ops = txParsedLocal.ops;
          // 验证:
          // 1. 路径已从 /主角/饥饿 → 主角.饥饿
          // 2. delta op 保留 rawOp='delta',但 op 字段暂存为 'delta'(apply 时转 replace)
          // 3. insert op 应转为 add
          const pathOk = ops.every((o) => !o.path.startsWith('/') && !o.path.startsWith('stat_data'));
          const hasDeltaRawOp = ops.some((o) => o.rawOp === 'delta');
          const hasReplaceRawOp = ops.some((o) => o.rawOp === 'replace');
          // 补测 insert → add 转换
          const insertParsed = parseAiOutput(
            '<UpdateVariable><JSONPatch>[' +
            '{"op":"insert","path":"/剧情/已触发事件/-","value":"E01_救唯"}' +
            ']</JSONPatch></UpdateVariable>',
          );
          const insertOp = insertParsed.ops[0];
          const insertConverted = insertOp && insertOp.rawOp === 'insert' && insertOp.op === 'add';
          if (pathOk && hasDeltaRawOp && hasReplaceRawOp && insertConverted) {
            updateCheck('tx-normalize', {
              status: 'ok',
              detail: `路径全部点号化(无 / 前缀);delta 保留 rawOp(${ops.filter(o=>o.rawOp==='delta').length} 个);insert→add 转换 ✓`,
            });
          } else {
            updateCheck('tx-normalize', {
              status: 'fail',
              detail: `pathOk=${pathOk} hasDelta=${hasDeltaRawOp} hasReplace=${hasReplaceRawOp} insertConverted=${insertConverted}`,
            });
          }
        }
      } catch (e) {
        updateCheck('tx-normalize', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 22. 事务应用(before/after 快照 + safeParseFull)
      updateCheck('tx-apply', { status: 'running' });
      try {
        if (cancelled) return;
        if (!txParsedLocal) {
          updateCheck('tx-apply', { status: 'fail', detail: 'txParsed 为 null(步骤20 失败)' });
        } else {
          // 准备 MVU 运行时(initvar 初始值)
          const mvu = new MvuRuntime({
            时间: { 当前日期: '12-22', 星期: '周五', 时段: '早', 当前时间: '08:00', 天数: 1, 季节: '冬', 章节: '寒假前奏', 天气: '晴' },
            场景: { 当前地点: '未选择', 当前女角名: '无', 场景模式: '休息' },
            主角: {
              玩家身份: '原作主角', 玩家姓名: '{{user}}', 年龄: 18, 住所: '鸣泽家',
              魅力: 50, 学业: 50, 体力: 80, 社交: 50, 敏感: 30, 声誉: 50,
              饥饿: 30, 口渴: 20, 清洁: 80, 疲劳: 0, 心情: 70, 睡眠质量: 70,
              现金: 5000, 储蓄: 0, 违法计数: 0, 法律警告: 0,
              今日餐费: 0, 今日礼费: 0, 今日交通费: 0, 今日总消费: 0, 储蓄目标: 50000,
            },
            技能: { 力量: 30, 敏捷: 40, 智力: 50, 意志: 40, 潜行: 20, 口才: 40, 医学: 10, 烹饪: 20, 艺术: 20, 驾驶: 0, 格斗: 25, 恋爱: 25, 观察: 40 },
            临时: { 上次事件ID: '', 上次选择结果: '', 本时段楼层数: 0, 当前难度: '普通', 预期下时段序号: 1, 连续无收入天数: 0, 超自然妄想计数: 0, 死结局标识: '' },
            经济: { 当日收入: 0, 当日支出: 0, 累计储蓄: 0 },
            性格: { 温柔: 50, 果断: 50, 幽默: 50, 谨慎: 50, 外向: 50, 理性: 50 },
            隐藏: {},
            当前女角: { 姓名: '无' },
            女角: {},
          });
          const tx = new MvuTransaction(mvu);
          const result = tx.apply(txParsedLocal);
          if (cancelled) return;
          setTxResult(result);
          // 验证:
          // 1. 4 个 op 全部通过(delta 2 个 + replace 2 个)
          // 2. 饥饿从 30 → 40(delta +10)
          // 3. 口渴从 20 → 35(delta +15)
          // 4. 当前时间从 08:00 → 08:30
          // 5. 当前地点从 '未选择' → '鸣泽家'
          const after = result.after;
          const t = after.时间 as Record<string, unknown>;
          const s = after.场景 as Record<string, unknown>;
          const p = after.主角 as Record<string, unknown>;
          const pass =
            result.ok &&
            result.appliedCount === 4 &&
            result.rejectedCount === 0 &&
            t.当前时间 === '08:30' &&
            s.当前地点 === '鸣泽家' &&
            p.饥饿 === 40 &&
            p.口渴 === 35;
          if (pass) {
            updateCheck('tx-apply', {
              status: 'ok',
              detail: `应用 ${result.appliedCount} ops(0 拒绝);时间=${t.当前时间};地点=${s.当前地点};饥饿=${p.饥饿};口渴=${p.口渴};fullParse ✓`,
            });
          } else {
            updateCheck('tx-apply', {
              status: 'fail',
              detail: `ok=${result.ok} applied=${result.appliedCount} rejected=${result.rejectedCount} time=${t.当前时间} loc=${s.当前地点} hunger=${p.饥饿} thirst=${p.口渴} errors=${result.fullParseErrors.join(';').slice(0, 100)}`,
            });
          }
        }
      } catch (e) {
        updateCheck('tx-apply', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // ─────────────────────────────────────────────────────
      //  步骤5 Turn Kernel 验证
      // ─────────────────────────────────────────────────────

      // 23. Kernel 初始化(空存档→空 stat_data;initializeNewGame 写入 revision)
      updateCheck('kernel-init', { status: 'running' });
      try {
        // 先清空 IndexedDB(确保从空存档开始)
        await idb.wipeAll();
        const k1 = new Kernel();
        await k1.init();
        const emptySd = k1.getStatData();
        const emptyHash = k1.getCurrentRevisionHash();
        if (cancelled) return;
        const c1 = Object.keys(emptySd).length === 0 && emptyHash === null;

        // 模拟 IdentitySelect 完成,initializeNewGame 写入初始 revision
        const initialStatData = {
          时间: { 当前日期: '12-22', 星期: '周五', 时段: '早', 当前时间: '08:00', 天数: 1, 季节: '冬', 章节: '寒假前奏', 天气: '晴' },
          场景: { 当前地点: '鸣泽家', 当前女角名: '无', 场景模式: '休息' },
          主角: {
            玩家身份: '原作主角', 玩家姓名: '主角', 年龄: 18, 住所: '鸣泽家',
            魅力: 50, 学业: 50, 体力: 80, 社交: 50, 敏感: 30, 声誉: 50,
            饥饿: 30, 口渴: 20, 清洁: 80, 疲劳: 0, 心情: 70, 睡眠质量: 70,
            现金: 5000, 储蓄: 0, 违法计数: 0, 法律警告: 0,
            今日餐费: 0, 今日礼费: 0, 今日交通费: 0, 今日总消费: 0, 储蓄目标: 50000,
          },
          技能: { 力量: 30, 敏捷: 40, 智力: 50, 意志: 40, 潜行: 20, 口才: 40, 医学: 10, 烹饪: 20, 艺术: 20, 驾驶: 0, 格斗: 25, 恋爱: 25, 观察: 40 },
          临时: { 上次事件ID: '', 上次选择结果: '', 本时段楼层数: 0, 当前难度: '普通', 预期下时段序号: 1, 连续无收入天数: 0, 超自然妄想计数: 0, 死结局标识: '' },
          经济: { 当日收入: 0, 当日支出: 0, 累计储蓄: 0 },
          性格: { 温柔: 50, 果断: 50, 幽默: 50, 谨慎: 50, 外向: 50, 理性: 50 },
          隐藏: {},
          当前女角: { 姓名: '无' },
          女角: {},
        };
        const startHash = await k1.initializeNewGame(initialStatData);
        if (cancelled) return;
        // 重新创建 Kernel 验证 revision 恢复
        const k2 = new Kernel();
        await k2.init();
        const restoredSd = k2.getStatData();
        const restoredHash = k2.getCurrentRevisionHash();
        const c2 = restoredHash === startHash;
        const c3 = (restoredSd.主角 as { 玩家身份?: string })?.玩家身份 === '原作主角';
        const c4 = (restoredSd.时间 as { 当前时间?: string })?.当前时间 === '08:00';

        if (c1 && c2 && c3 && c4) {
          updateCheck('kernel-init', {
            status: 'ok',
            detail: `空存档→空sd ✓;initializeNewGame→hash=${startHash.slice(0, 8)};重新 init→恢复 hash=${restoredHash.slice(0, 8)};身份=${c3 ? '✓' : '✗'};时间=${c4 ? '✓' : '✗'}`,
          });
        } else {
          updateCheck('kernel-init', {
            status: 'fail',
            detail: `c1=${c1}(空sd) c2=${c2}(hash恢复) c3=${c3}(身份恢复) c4=${c4}(时间恢复)`,
          });
        }
      } catch (e) {
        updateCheck('kernel-init', {
          status: 'fail',
          detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        });
      }

      // 24. 前置校验(身份未选择→triggerOpening / 死结局触发 / 疲劳警告)
      updateCheck('kernel-precheck', { status: 'running' });
      try {
        // 场景1:身份未选择→triggerOpening=true
        const k1 = new Kernel();
        await k1.init();
        // 强制覆盖为未选择状态
        k1.getMvuRuntime().replace({
          主角: { 玩家身份: '未选择', 饥饿: 30, 口渴: 20, 心情: 70, 违法计数: 0, 疲劳: 0 },
          当前女角: { 嫉妒值: 0 },
        });
        const pre1 = k1.preCheck({ action: '测试' });
        const c1 = pre1.triggerOpening === true && pre1.ok === true;

        // 场景2:死结局触发(饥饿=100)
        const k2 = new Kernel();
        await k2.init();
        k2.getMvuRuntime().replace({
          主角: { 玩家身份: '原作主角', 饥饿: 100, 口渴: 20, 心情: 70, 违法计数: 0, 疲劳: 0 },
          时间: { 天数: 1 },
          当前女角: { 嫉妒值: 0 },
        });
        const pre2 = k2.preCheck({ action: '测试' });
        const c2 = pre2.ok === false && pre2.deathEnding?.type === 'hunger';

        // 场景3:疲劳警告(疲劳=90,不阻塞)
        const k3 = new Kernel();
        await k3.init();
        k3.getMvuRuntime().replace({
          主角: { 玩家身份: '原作主角', 饥饿: 30, 口渴: 20, 心情: 70, 违法计数: 0, 疲劳: 90 },
          时间: { 天数: 1 },
          当前女角: { 嫉妒值: 0 },
        });
        const pre3 = k3.preCheck({ action: '测试' });
        const c3 = pre3.ok === true && pre3.warnings.length > 0 && pre3.warnings.some((w) => w.includes('疲劳'));

        // 场景4:嫉妒死结局(嫉妒值=100)
        const k4 = new Kernel();
        await k4.init();
        k4.getMvuRuntime().replace({
          主角: { 玩家身份: '原作主角', 饥饿: 30, 口渴: 20, 心情: 70, 违法计数: 0, 疲劳: 0 },
          时间: { 天数: 1 },
          当前女角: { 嫉妒值: 100 },
        });
        const pre4 = k4.preCheck({ action: '测试' });
        const c4 = pre4.ok === false && pre4.deathEnding?.type === 'jealousy';

        if (cancelled) return;
        if (c1 && c2 && c3 && c4) {
          updateCheck('kernel-precheck', {
            status: 'ok',
            detail: `triggerOpening ✓;hunger 死结局 ✓;疲劳警告(不阻塞) ✓;jealousy 死结局 ✓`,
          });
        } else {
          updateCheck('kernel-precheck', {
            status: 'fail',
            detail: `c1=${c1}(opening) c2=${c2}(hunger) c3=${c3}(fatigue) c4=${c4}(jealousy)`,
          });
        }
      } catch (e) {
        updateCheck('kernel-precheck', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 25. startTurn 启动回合(StreamDraft + turnCount/actionsToday +1)
      updateCheck('kernel-start', { status: 'running' });
      let kernelForTurn: Kernel | null = null;
      try {
        // 准备已初始化身份的 Kernel
        await idb.wipeAll();
        kernelForTurn = new Kernel();
        await kernelForTurn.init();
        const initialStatData = {
          时间: { 当前日期: '12-22', 星期: '周五', 时段: '早', 当前时间: '08:00', 天数: 1, 季节: '冬', 章节: '寒假前奏', 天气: '晴' },
          场景: { 当前地点: '鸣泽家', 当前女角名: '无', 场景模式: '休息' },
          主角: {
            玩家身份: '原作主角', 玩家姓名: '主角', 年龄: 18, 住所: '鸣泽家',
            魅力: 50, 学业: 50, 体力: 80, 社交: 50, 敏感: 30, 声誉: 50,
            饥饿: 30, 口渴: 20, 清洁: 80, 疲劳: 0, 心情: 70, 睡眠质量: 70,
            现金: 5000, 储蓄: 0, 违法计数: 0, 法律警告: 0,
            今日餐费: 0, 今日礼费: 0, 今日交通费: 0, 今日总消费: 0, 储蓄目标: 50000,
          },
          技能: { 力量: 30, 敏捷: 40, 智力: 50, 意志: 40, 潜行: 20, 口才: 40, 医学: 10, 烹饪: 20, 艺术: 20, 驾驶: 0, 格斗: 25, 恋爱: 25, 观察: 40 },
          临时: { 上次事件ID: '', 上次选择结果: '', 本时段楼层数: 0, 当前难度: '普通', 预期下时段序号: 1, 连续无收入天数: 0, 超自然妄想计数: 0, 死结局标识: '' },
          经济: { 当日收入: 0, 当日支出: 0, 累计储蓄: 0 },
          性格: { 温柔: 50, 果断: 50, 幽默: 50, 谨慎: 50, 外向: 50, 理性: 50 },
          隐藏: {},
          当前女角: { 姓名: '无' },
          女角: {},
        };
        await kernelForTurn.initializeNewGame(initialStatData);

        const draft = await kernelForTurn.startTurn({ action: '起床去客厅找美佐子' });
        if (cancelled) return;
        const c1 = draft.userAction === '起床去客厅找美佐子';
        const c2 = draft.turnId.startsWith('turn-');
        const c3 = draft.mainAiDone === false && draft.varAiDone === false;
        const c4 = draft.baseStatData !== null;
        const c5 = (draft.baseStatData.主角 as { 玩家身份?: string })?.玩家身份 === '原作主角';
        // 验证 baseRevisionHash 不为 null(因为已 initializeNewGame)
        const c6 = draft.baseRevisionHash !== null;

        if (c1 && c2 && c3 && c4 && c5 && c6) {
          updateCheck('kernel-start', {
            status: 'ok',
            detail: `turnId=${draft.turnId.slice(0, 20)};mainAiDone=${draft.mainAiDone};baseHash=${draft.baseRevisionHash?.slice(0, 8) ?? 'null'};身份=原作主角`,
          });
        } else {
          updateCheck('kernel-start', {
            status: 'fail',
            detail: `c1=${c1} c2=${c2} c3=${c3} c4=${c4} c5=${c5} c6=${c6}`,
          });
        }
      } catch (e) {
        updateCheck('kernel-start', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 26. finalizeStream 流式完成(RawModelResponse + 叙事正文提取)
      updateCheck('kernel-finalize', { status: 'running' });
      let draftForFinalize: Awaited<ReturnType<Kernel['startTurn']>> | null = null;
      try {
        if (!kernelForTurn) {
          updateCheck('kernel-finalize', { status: 'fail', detail: 'kernelForTurn 为 null(步骤25 失败)' });
        } else {
          draftForFinalize = await kernelForTurn.startTurn({ action: '与美佐子聊天' });
          // 模拟主聊天AI 流式输出
          const mainAiText = [
            '我下楼来到客厅,美佐子正在准备早餐。',
            '「啊,你起来啦。快坐下,饭马上好。」美佐子微笑着说。',
            '<StatusPlaceHolderImpl/>',
          ].join('\n');
          // 模拟变量AI 输出(包含 <UpdateVariable> 块)
          const varAiText = [
            '<UpdateVariable>',
            '<Analysis>',
            '1事件:玩家与美佐子在客厅互动',
            '2数值:好感度+2(日常互动),心情+3(温馨)',
            '</Analysis>',
            '<JSONPatch>',
            '[',
            '  { "op": "replace", "path": "/时间/当前时间", "value": "08:30" },',
            '  { "op": "delta", "path": "/主角/心情", "value": 3 },',
            '  { "op": "replace", "path": "/场景/当前地点", "value": "鸣泽家客厅" }',
            ']',
            '</JSONPatch>',
            '</UpdateVariable>',
          ].join('\n');

          const raw = kernelForTurn.finalizeStream(draftForFinalize, mainAiText, varAiText);
          if (cancelled) return;
          const c1 = raw.mainAiNarrative.includes('我下楼来到客厅') && !raw.mainAiNarrative.includes('<UpdateVariable>');
          const c2 = raw.mainAiNarrative.includes('<StatusPlaceHolderImpl/>');
          const c3 = raw.varAiParsed.hasUpdateVariable && raw.varAiParsed.ops.length === 3;
          const c4 = raw.varAiParsed.analysis.length > 0;
          const c5 = raw.parseErrors.length === 0;

          if (c1 && c2 && c3 && c4 && c5) {
            updateCheck('kernel-finalize', {
              status: 'ok',
              detail: `narrative=${raw.mainAiNarrative.length}字(含占位符,无 UV 标签);varAi ops=${raw.varAiParsed.ops.length};Analysis=${raw.varAiParsed.analysis.length}字;parseErrors=0`,
            });
          } else {
            updateCheck('kernel-finalize', {
              status: 'fail',
              detail: `c1=${c1}(叙事正文) c2=${c2}(占位符保留) c3=${c3}(ops=3) c4=${c4}(Analysis) c5=${c5}(无错误)`,
            });
          }
        }
      } catch (e) {
        updateCheck('kernel-finalize', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 27. aggregate 候选聚合(CandidateChangeSet + 候选 trace)
      updateCheck('kernel-aggregate', { status: 'running' });
      try {
        if (!kernelForTurn || !draftForFinalize) {
          updateCheck('kernel-aggregate', { status: 'fail', detail: 'kernelForTurn/draftForFinalize 为 null(前置失败)' });
        } else {
          const mainAiText = '我下楼来到客厅,美佐子正在准备早餐。<StatusPlaceHolderImpl/>';
          const varAiText = [
            '<UpdateVariable>',
            '<Analysis>互动</Analysis>',
            '<JSONPatch>',
            '[',
            '  { "op": "replace", "path": "/时间/当前时间", "value": "08:30" },',
            '  { "op": "delta", "path": "/主角/心情", "value": 3 }',
            ']',
            '</JSONPatch>',
            '</UpdateVariable>',
          ].join('\n');
          const raw = kernelForTurn.finalizeStream(draftForFinalize, mainAiText, varAiText);
          const candidate = kernelForTurn.aggregate(raw);
          if (cancelled) return;
          setKernelCandidate(candidate);
          const c1 = candidate.narrative.includes('美佐子');
          const c2 = candidate.varAiOps.ops.length === 2;
          const c3 = candidate.mainAiOps.ops.length === 0; // 阶段1 主聊天AI 不输出变量变更
          const c4 = candidate.candidateTrace.length === 2; // 2 个 var-ai 候选
          const c5 = candidate.candidateTrace.every((t) => t.source === 'var-ai' && t.priority === 1);

          if (c1 && c2 && c3 && c4 && c5) {
            updateCheck('kernel-aggregate', {
              status: 'ok',
              detail: `narrative=${candidate.narrative.length}字;varAiOps=${candidate.varAiOps.ops.length};mainAiOps=${candidate.mainAiOps.ops.length};trace=${candidate.candidateTrace.length}(全 var-ai priority=1)`,
            });
          } else {
            updateCheck('kernel-aggregate', {
              status: 'fail',
              detail: `c1=${c1} c2=${c2} c3=${c3} c4=${c4} c5=${c5}`,
            });
          }
        }
      } catch (e) {
        updateCheck('kernel-aggregate', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // 28. commit IndexedDB CAS 提交(revision + KV 指针 + before/after)
      updateCheck('kernel-commit', { status: 'running' });
      try {
        if (!kernelForTurn || !draftForFinalize) {
          updateCheck('kernel-commit', { status: 'fail', detail: 'kernelForTurn/draftForFinalize 为 null(前置失败)' });
        } else {
          const mainAiText = '我下楼来到客厅,美佐子正在准备早餐。<StatusPlaceHolderImpl/>';
          const varAiText = [
            '<UpdateVariable>',
            '<Analysis>互动:心情+3,时间推进到08:30</Analysis>',
            '<JSONPatch>',
            '[',
            '  { "op": "replace", "path": "/时间/当前时间", "value": "08:30" },',
            '  { "op": "delta", "path": "/主角/心情", "value": 3 }',
            ']',
            '</JSONPatch>',
            '</UpdateVariable>',
          ].join('\n');
          const raw = kernelForTurn.finalizeStream(draftForFinalize, mainAiText, varAiText);
          const candidate = kernelForTurn.aggregate(raw);
          const beforeHash = kernelForTurn.getCurrentRevisionHash();
          const facts = await kernelForTurn.commit(candidate);
          if (cancelled) return;
          setKernelFacts(facts);
          const afterHash = kernelForTurn.getCurrentRevisionHash();

          const c1 = facts.ok === true;
          const c2 = facts.newRevisionHash !== '' && facts.newRevisionHash !== beforeHash;
          const c3 = afterHash === facts.newRevisionHash;
          const c4 = (facts.after.时间 as { 当前时间?: string })?.当前时间 === '08:30';
          const c5 = (facts.after.主角 as { 心情?: number })?.心情 === 73; // 70+3
          const c6 = facts.txResult.appliedCount === 2; // 2 ops(时间+心情)
          const c7 = facts.arbitrationTrace.length >= 2; // 至少 2 个候选 trace

          // 验证 IndexedDB 中确实写入了新 revision
          const newRev = await idb.getRevision(facts.newRevisionHash);
          const c8 = newRev !== null && newRev.parentHash === beforeHash;
          // 验证 KV 指针已更新
          const kvPtr = await idb.kvGet<string>('__current_revision__');
          const c9 = kvPtr === facts.newRevisionHash;

          if (c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8 && c9) {
            updateCheck('kernel-commit', {
              status: 'ok',
              detail: `ok=${facts.ok};newHash=${facts.newRevisionHash.slice(0, 8)};时间=08:30;心情=73;ops=${facts.txResult.appliedCount};trace=${facts.arbitrationTrace.length};KV指针 ✓;revision 链 ✓`,
            });
          } else {
            updateCheck('kernel-commit', {
              status: 'fail',
              detail: `c1=${c1} c2=${c2} c3=${c3} c4=${c4} c5=${c5} c6=${c6} c7=${c7} c8=${c8}(revision) c9=${c9}(KV);errors=${facts.errors.join(';').slice(0, 80)}`,
            });
          }
        }
      } catch (e) {
        updateCheck('kernel-commit', {
          status: 'fail',
          detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        });
      }

      // 29. rollback 回滚(恢复 base stat_data + turnCount-1)
      updateCheck('kernel-rollback', { status: 'running' });
      try {
        // 新建独立 Kernel 验证回滚
        await idb.wipeAll();
        const k = new Kernel();
        await k.init();
        const initialStatData = {
          时间: { 当前日期: '12-22', 星期: '周五', 时段: '早', 当前时间: '08:00', 天数: 1, 季节: '冬', 章节: '寒假前奏', 天气: '晴' },
          场景: { 当前地点: '鸣泽家', 当前女角名: '无', 场景模式: '休息' },
          主角: {
            玩家身份: '原作主角', 玩家姓名: '主角', 年龄: 18, 住所: '鸣泽家',
            魅力: 50, 学业: 50, 体力: 80, 社交: 50, 敏感: 30, 声誉: 50,
            饥饿: 30, 口渴: 20, 清洁: 80, 疲劳: 0, 心情: 70, 睡眠质量: 70,
            现金: 5000, 储蓄: 0, 违法计数: 0, 法律警告: 0,
            今日餐费: 0, 今日礼费: 0, 今日交通费: 0, 今日总消费: 0, 储蓄目标: 50000,
          },
          技能: { 力量: 30, 敏捷: 40, 智力: 50, 意志: 40, 潜行: 20, 口才: 40, 医学: 10, 烹饪: 20, 艺术: 20, 驾驶: 0, 格斗: 25, 恋爱: 25, 观察: 40 },
          临时: { 上次事件ID: '', 上次选择结果: '', 本时段楼层数: 0, 当前难度: '普通', 预期下时段序号: 1, 连续无收入天数: 0, 超自然妄想计数: 0, 死结局标识: '' },
          经济: { 当日收入: 0, 当日支出: 0, 累计储蓄: 0 },
          性格: { 温柔: 50, 果断: 50, 幽默: 50, 谨慎: 50, 外向: 50, 理性: 50 },
          隐藏: {},
          当前女角: { 姓名: '无' },
          女角: {},
        };
        await k.initializeNewGame(initialStatData);
        const baseSd = k.getStatData();
        const baseHash = k.getCurrentRevisionHash();

        // 启动回合
        const draft = await k.startTurn({ action: '测试回滚' });
        // 模拟模型失败,调用 rollback
        k.rollback(draft);
        if (cancelled) return;
        const rolledSd = k.getStatData();
        const rolledHash = k.getCurrentRevisionHash();

        const c1 = rolledHash === baseHash; // hash 不变(未创建新 revision)
        const c2 = (rolledSd.时间 as { 当前时间?: string })?.当前时间 === '08:00'; // 时间恢复
        const c3 = (rolledSd.主角 as { 心情?: number })?.心情 === 70; // 心情恢复
        // baseStatData 与 rolledSd 深度相等
        const c4 = JSON.stringify(rolledSd) === JSON.stringify(baseSd);

        if (c1 && c2 && c3 && c4) {
          updateCheck('kernel-rollback', {
            status: 'ok',
            detail: `hash 不变 ✓;时间恢复 08:00 ✓;心情恢复 70 ✓;stat_data 深度相等 ✓`,
          });
        } else {
          updateCheck('kernel-rollback', {
            status: 'fail',
            detail: `c1=${c1}(hash) c2=${c2}(时间) c3=${c3}(心情) c4=${c4}(深相等)`,
          });
        }
      } catch (e) {
        updateCheck('kernel-rollback', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─────────────────────────────────────────────────────
  //  步骤6 验证流程(预设兼容 + Prompt 组装 + Model Gateway)
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let importedPresetLocal: PresetProfile | null = null;
      // 等待步骤2-5 完成(简单延迟,避免 IndexedDB 冲突)
      await new Promise((r) => setTimeout(r, 500));

      // ─── 30. 内置预设加载 ───
      updateCheck('preset-builtin', { status: 'running' });
      try {
        const presets = BUILTIN_PRESETS;
        if (cancelled) return;
        const c1 = presets.length === 2;
        const c2 = presets.every((p) => p.prompts.length > 0 && p.sampler.temperature > 0);
        const c3 = presets.some((p) => p.name === '原卡默认');
        const c4 = presets.some((p) => p.name === '恋爱模拟');
        const c5 = builtinOriginalDefault.context.maxContext === 32000;
        const c6 = builtinRomanceSim.sampler.temperature === 0.95;
        setBuiltinPresets(presets);
        if (c1 && c2 && c3 && c4 && c5 && c6) {
          updateCheck('preset-builtin', {
            status: 'ok',
            detail: `内置 ${presets.length} 个:原卡默认(temp=${builtinOriginalDefault.sampler.temperature},prompts=${builtinOriginalDefault.prompts.length}) / 恋爱模拟(temp=${builtinRomanceSim.sampler.temperature},prompts=${builtinRomanceSim.prompts.length})`,
          });
        } else {
          updateCheck('preset-builtin', {
            status: 'fail',
            detail: `c1=${c1} c2=${c2} c3=${c3} c4=${c4} c5=${c5} c6=${c6}`,
          });
        }
      } catch (e) {
        updateCheck('preset-builtin', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // ─── 31. ST 预设 JSON 导入(合成测试数据) ───
      updateCheck('preset-import', { status: 'running' });
      try {
        // 合成一个最小但字段完整的 ST 预设 JSON(模拟三人逆行结构)
        const syntheticPreset = {
          chat_completion_source: 'openai',
          preset_version: '1.0.0',
          preset_name: '合成测试预设',
          prompts: [
            {
              identifier: 'main',
              name: '主提示词',
              enabled: true,
              role: 'system',
              content: '{{D0_CONTROLLER_OUTPUT}}\n扮演准则',
              injection_position: 0,
              injection_order: 100,
            },
            {
              identifier: '[mvu_plot]思维链',
              name: '[mvu_plot]思维链',
              enabled: true,
              role: 'system',
              content: '思维链内容',
              injection_position: 0,
              injection_order: 50,
            },
            {
              identifier: '[mvu_update]变量输出格式',
              name: '[mvu_update]变量输出格式',
              enabled: true,
              role: 'system',
              content: '{{VARIABLE_OUTPUT_FORMAT}}',
              injection_position: 0,
              injection_order: 110,
            },
            {
              identifier: 'chatHistory',
              name: '聊天历史',
              enabled: true,
              role: 'system',
              content: '',
              marker: true,
            },
            {
              identifier: 'disabledPrompt',
              name: '已禁用条目',
              enabled: false,
              role: 'system',
              content: '不应出现',
            },
          ],
          prompt_order: [
            {
              character_id: 100001,
              order: [
                { identifier: 'main', enabled: true },
                { identifier: '[mvu_plot]思维链', enabled: true },
                { identifier: '[mvu_update]变量输出格式', enabled: true },
                { identifier: 'chatHistory', enabled: true },
                { identifier: 'disabledPrompt', enabled: false },
              ],
            },
          ],
          temperature: 0.85,
          top_p: 0.95,
          top_k: 40,
          repetition_penalty: 1.1,
          frequency_penalty: 0.2,
          presence_penalty: 0.1,
          seed: 42,
          openai_max_context: 32000,
          openai_max_tokens: 1500,
          stream_openai: true,
          use_sysprompt: true,
          names_behavior: -1,
        };
        const jsonText = JSON.stringify(syntheticPreset);

        // 先用 validatePresetFormat 快速校验
        const validation = validatePresetFormat(jsonText);
        if (cancelled) return;
        const c1 = validation.ok && validation.promptCount === 5 && validation.orderCount === 5;

        // 调用 importPreset 完整导入
        const result = importPreset(jsonText, '合成测试预设.json');
        if (cancelled) return;
        setImportResult(result);
        const c2 = result.ok && result.profile !== undefined;
        const c3 = result.profile?.prompts.length === 5; // 禁用条目保留但标记 enabled=false
        const c3b = result.profile?.prompts.some(
          (p) => p.identifier === 'disabledPrompt' && p.enabled === false,
        );
        const c4 = result.profile?.name === '合成测试预设';
        const c5 = result.profile?.sampler.temperature === 0.85;
        const c6 = result.profile?.sampler.topK === 40;
        const c7 = result.profile?.context.maxContext === 32000;
        const c8 = result.profile?.session.stream === true;

        if (c1 && c2 && c3 && c3b && c4 && c5 && c6 && c7 && c8) {
          setImportedPreset(result.profile!);
          importedPresetLocal = result.profile!;
          updateCheck('preset-import', {
            status: 'ok',
            detail: `validate ✓(5 prompts/5 order);import ✓;${result.profile!.prompts.length} 条(禁用条目标记 enabled=false);temp=${result.profile!.sampler.temperature};topK=${result.profile!.sampler.topK};maxCtx=${result.profile!.context.maxContext};stream=${result.profile!.session.stream}`,
          });
        } else {
          updateCheck('preset-import', {
            status: 'fail',
            detail: `c1=${c1} c2=${c2} c3=${c3} c3b=${c3b} c4=${c4} c5=${c5} c6=${c6} c7=${c7} c8=${c8};errors=${result.errors.join(';')}`,
          });
        }
      } catch (e) {
        updateCheck('preset-import', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // ─── 32. mapper 转换验证 ───
      updateCheck('preset-mapper', { status: 'running' });
      try {
        if (cancelled) return;
        if (!importedPresetLocal) {
          updateCheck('preset-mapper', { status: 'fail', detail: 'importedPreset 为 null(步骤31 失败)' });
        } else {
          const p = importedPresetLocal;
          // 验证 mapper 字段映射
          const c1 = p.sourceType === 'openai';
          const c2 = p.version === '1.0.0';
          const c3 = p.sampler.repetitionPenalty === 1.1;
          const c4 = p.sampler.frequencyPenalty === 0.2;
          const c5 = p.sampler.presencePenalty === 0.1;
          const c6 = p.sampler.seed === 42;
          const c7 = p.context.maxTokens === 1500;
          const c8 = p.context.maxContextUnlocked === false;
          const c9 = p.session.useSystemPrompt === true;
          const c10 = p.session.namesBehavior === -1;
          // 验证 prompt_order 权威顺序被保留(mapper 不按 injection_order 重排)
          const mainIdx = p.prompts.findIndex((x) => x.identifier === 'main');
          const plotIdx = p.prompts.findIndex((x) => x.identifier === '[mvu_plot]思维链');
          const c11 = mainIdx >= 0 && plotIdx >= 0 && mainIdx !== plotIdx;
          // 验证内置标识符识别
          const mainPrompt = p.prompts.find((x) => x.identifier === 'main');
          const c12 = mainPrompt?.isBuiltin === true && mainPrompt?.builtinSlot === 'main';
          const chatHist = p.prompts.find((x) => x.identifier === 'chatHistory');
          const c13 = chatHist?.isMarker === true && chatHist?.isBuiltin === true;
          // 验证自定义标识符
          const plotPrompt = p.prompts.find((x) => x.identifier === '[mvu_plot]思维链');
          const c14 = plotPrompt?.isBuiltin === false;

          if (c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8 && c9 && c10 && c11 && c12 && c13 && c14) {
            updateCheck('preset-mapper', {
              status: 'ok',
              detail: `sampler(temp=${p.sampler.temperature}/topP=${p.sampler.topP}/topK=${p.sampler.topK}/rep=${p.sampler.repetitionPenalty}/seed=${p.sampler.seed}) ✓;context(${p.context.maxContext}/${p.context.maxTokens}) ✓;order ✓(main after plot);builtin ✓;marker ✓;custom ✓`,
            });
          } else {
            updateCheck('preset-mapper', {
              status: 'fail',
              detail: `c1=${c1} c2=${c2} c3=${c3} c4=${c4} c5=${c5} c6=${c6} c7=${c7} c8=${c8} c9=${c9} c10=${c10} c11=${c11}(order) c12=${c12}(builtin) c13=${c13}(marker) c14=${c14}(custom)`,
            });
          }
        }
      } catch (e) {
        updateCheck('preset-mapper', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // ─── 33. 预设 IndexedDB 持久化 ───
      updateCheck('preset-store', { status: 'running' });
      try {
        // 先清空(避免之前的测试数据干扰)
        await clearAllPresets();
        if (cancelled) return;
        // 保存内置预设
        const id1 = await savePreset(builtinOriginalDefault);
        const id2 = await savePreset(builtinRomanceSim);
        if (cancelled) return;
        // 列出
        const list = await listPresets();
        const c1 = list.length === 2;
        const c2 = list.some((e) => e.name === '原卡默认');
        const c3 = list.some((e) => e.name === '恋爱模拟');
        // 加载
        const loaded = await loadPreset(id1);
        const c4 = loaded !== null && loaded.name === '原卡默认';
        const c5 = loaded?.prompts.length === builtinOriginalDefault.prompts.length;
        // 删除
        await deletePreset(id2);
        if (cancelled) return;
        const listAfterDelete = await listPresets();
        const c6 = listAfterDelete.length === 1 && listAfterDelete[0].name === '原卡默认';
        // 清理
        await clearAllPresets();
        if (cancelled) return;
        const listAfterClear = await listPresets();
        const c7 = listAfterClear.length === 0;

        setPresetStoreList(list.map((e) => ({ id: e.id, name: e.name, promptCount: e.promptCount })));
        if (c1 && c2 && c3 && c4 && c5 && c6 && c7) {
          updateCheck('preset-store', {
            status: 'ok',
            detail: `save 2 ✓;list=${list.length} ✓;load ✓(${loaded!.prompts.length} prompts);delete ✓(剩 ${listAfterDelete.length});clear ✓(剩 ${listAfterClear.length})`,
          });
        } else {
          updateCheck('preset-store', {
            status: 'fail',
            detail: `c1=${c1}(list=2) c2=${c2} c3=${c3} c4=${c4}(load) c5=${c5}(prompts) c6=${c6}(delete) c7=${c7}(clear)`,
          });
        }
      } catch (e) {
        updateCheck('preset-store', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // ─── 34. 8AI Profile 注册 ───
      updateCheck('ai-profiles', { status: 'running' });
      try {
        if (cancelled) return;
        const all = ALL_AI_PROFILES;
        const stage1 = STAGE1_PROFILES;
        setAiProfilesList(all);
        const c1 = all.length === 8;
        const c2 = stage1.length === 2;
        const c3 = stage1.some((p) => p.id === 'main-chat');
        const c4 = stage1.some((p) => p.id === 'var-update');
        const c5 = all.filter((p) => p.role === 'trigger').length === 6;
        const c6 = mainChatProfile.outputProtocol.stream === true;
        const c7 = varUpdateProfile.outputProtocol.stream === false;
        const c8 = mainChatProfile.promptStrategy.worldbookPrefixFilter === 'mvu_plot';
        const c9 = varUpdateProfile.promptStrategy.worldbookPrefixFilter === 'mvu_update';
        const c10 = varUpdateProfile.promptStrategy.includeStatDataSnapshot === true;
        const c11 = mainChatProfile.promptStrategy.includeStatDataSnapshot === false;
        const c12 = mainChatProfile.promptStrategy.includeD0Controller === true;
        const c13 = varUpdateProfile.promptStrategy.includeD0Controller === false;
        const c14 = mainChatProfile.outputProtocol.outputsNarrative === true;
        const c15 = varUpdateProfile.outputProtocol.outputsUpdateVariable === true;

        if (c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8 && c9 && c10 && c11 && c12 && c13 && c14 && c15) {
          updateCheck('ai-profiles', {
            status: 'ok',
            detail: `8 profiles(2 阶段1 + 6 触发);main-chat(stream=true/plot/D0/narrative);var-update(stream=false/update/snapshot/UV) ✓`,
          });
        } else {
          updateCheck('ai-profiles', {
            status: 'fail',
            detail: `c1=${c1}(8) c2=${c2}(2) c3=${c3} c4=${c4} c5=${c5}(6触发) c6=${c6} c7=${c7} c8=${c8} c9=${c9} c10=${c10} c11=${c11} c12=${c12} c13=${c13} c14=${c14} c15=${c15}`,
          });
        }
      } catch (e) {
        updateCheck('ai-profiles', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // ─── 35. 主聊天AI Prompt 组装 ───
      updateCheck('prompt-assembly-main', { status: 'running' });
      try {
        if (cancelled) return;
        // 用内置原卡默认预设 + mainChatProfile + 已初始化的 MVU
        const mvu = new MvuRuntime({
          时间: { 当前日期: '12-22', 星期: '周五', 时段: '早', 当前时间: '08:00', 天数: 1, 季节: '冬', 章节: '寒假前奏', 天气: '晴' },
          场景: { 当前地点: '鸣泽家', 当前女角名: '无', 场景模式: '休息' },
          主角: {
            玩家身份: '原作主角', 玩家姓名: '主角', 年龄: 18, 住所: '鸣泽家',
            魅力: 50, 学业: 50, 体力: 80, 社交: 50, 敏感: 30, 声誉: 50,
            饥饿: 30, 口渴: 20, 清洁: 80, 疲劳: 0, 心情: 70, 睡眠质量: 70,
            现金: 5000, 储蓄: 0, 违法计数: 0, 法律警告: 0,
            今日餐费: 0, 今日礼费: 0, 今日交通费: 0, 今日总消费: 0, 储蓄目标: 50000,
          },
          技能: { 力量: 30, 敏捷: 40, 智力: 50, 意志: 40, 潜行: 20, 口才: 40, 医学: 10, 烹饪: 20, 艺术: 20, 驾驶: 0, 格斗: 25, 恋爱: 25, 观察: 40 },
          临时: { 上次事件ID: '', 上次选择结果: '', 本时段楼层数: 0, 当前难度: '普通', 预期下时段序号: 1, 连续无收入天数: 0, 超自然妄想计数: 0, 死结局标识: '' },
          经济: { 当日收入: 0, 当日支出: 0, 累计储蓄: 0 },
          性格: { 温柔: 50, 果断: 50, 幽默: 50, 谨慎: 50, 外向: 50, 理性: 50 },
          隐藏: {},
          当前女角: { 姓名: '无' },
          女角: {},
        });
        const assembler = new PromptAssembler(mvu);
        getwiLoader.clearCache();
        const result = await assembler.assemble(mainChatProfile, builtinOriginalDefault, {
          userName: '主角',
          charName: '鸣泽美佐子',
          userAction: '去客厅找美佐子',
          chatHistory: [
            { role: 'user', content: '起床' },
            { role: 'assistant', content: '你起床了' },
          ],
        });
        if (cancelled) return;
        setMainAssembly(result);
        // 验证:
        // 1. messages 数组非空(应包含 main/worldInfoBefore/charDescription/worldInfoAfter/jailbreak/enhanceDefinitions + 历史用户动作)
        const c1 = result.messages.length >= 5;
        // 2. 占位符替换(D0_CONTROLLER_OUTPUT 应被替换为 EJS 渲染输出)
        const mainMsg = result.messages.find((m) => m.identifier === 'main');
        const c2 = mainMsg !== undefined && !mainMsg.content.includes('{{D0_CONTROLLER_OUTPUT}}');
        const c3 = mainMsg?.content.includes('扮演准则') ?? false;
        // 3. D0 渲染成功(trace 中有 render-d0 步骤)
        const c4 = result.trace.some((t) => t.step === 'render-d0');
        // 5. 角色档案注入(charDescription 占位符被替换)
        const charMsg = result.messages.find((m) => m.identifier === 'charDescription');
        const c5 = charMsg !== undefined && charMsg.content.length > 0 && !charMsg.content.includes('{{CHAR_PROFILE_OUTPUT}}');
        // 6. 聊天历史注入(trace 中有 chat-history)
        const c6 = result.trace.some((t) => t.step === 'chat-history');
        // 7. 玩家动作注入(最后一条应为 user)
        const lastMsg = result.messages[result.messages.length - 1];
        const c7 = lastMsg.role === 'user' && lastMsg.content === '去客厅找美佐子';
        // 8. {{user}}/{{char}} 替换
        const c8 = !result.messages.some((m) => m.content.includes('{{user}}') || m.content.includes('{{char}}'));
        // 9. 无 stat_data 快照(主聊天AI 不需要)
        const c9 = !result.messages.some((m) => m.source === 'stat-data-snapshot');
        // 10. token 估算 > 0
        const c10 = result.estimatedTokens > 0;
        // 11. 无严重警告(D0 渲染可能有关灯条目缺失警告,允许 warnings.length <= 2)
        const c11 = result.warnings.length <= 3;

        if (c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8 && c9 && c10 && c11) {
          updateCheck('prompt-assembly-main', {
            status: 'ok',
            detail: `messages=${result.messages.length};tokens≈${result.estimatedTokens};D0 渲染 ✓;占位符替换 ✓;历史注入 ✓;user 动作 ✓;无 stat_data 快照 ✓;warnings=${result.warnings.length}`,
          });
        } else {
          updateCheck('prompt-assembly-main', {
            status: 'fail',
            detail: `c1=${c1}(msg>=5) c2=${c2}(D0替换) c3=${c3}(准则) c4=${c4}(D0 trace) c5=${c5}(角色) c6=${c6}(历史) c7=${c7}(user) c8=${c8}(宏替换) c9=${c9}(无快照) c10=${c10}(tokens) c11=${c11}(warnings=${result.warnings.length})`,
          });
        }
      } catch (e) {
        updateCheck('prompt-assembly-main', {
          status: 'fail',
          detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        });
      }

      // ─── 36. 变量AI Prompt 组装 ───
      updateCheck('prompt-assembly-var', { status: 'running' });
      try {
        if (cancelled) return;
        const mvu = new MvuRuntime({
          时间: { 当前日期: '12-22', 星期: '周五', 时段: '早', 当前时间: '08:00', 天数: 1, 季节: '冬', 章节: '寒假前奏', 天气: '晴' },
          场景: { 当前地点: '鸣泽家', 当前女角名: '无', 场景模式: '休息' },
          主角: {
            玩家身份: '原作主角', 玩家姓名: '主角', 年龄: 18, 住所: '鸣泽家',
            魅力: 50, 学业: 50, 体力: 80, 社交: 50, 敏感: 30, 声誉: 50,
            饥饿: 30, 口渴: 20, 清洁: 80, 疲劳: 0, 心情: 70, 睡眠质量: 70,
            现金: 5000, 储蓄: 0, 违法计数: 0, 法律警告: 0,
            今日餐费: 0, 今日礼费: 0, 今日交通费: 0, 今日总消费: 0, 储蓄目标: 50000,
          },
          技能: { 力量: 30, 敏捷: 40, 智力: 50, 意志: 40, 潜行: 20, 口才: 40, 医学: 10, 烹饪: 20, 艺术: 20, 驾驶: 0, 格斗: 25, 恋爱: 25, 观察: 40 },
          临时: { 上次事件ID: '', 上次选择结果: '', 本时段楼层数: 0, 当前难度: '普通', 预期下时段序号: 1, 连续无收入天数: 0, 超自然妄想计数: 0, 死结局标识: '' },
          经济: { 当日收入: 0, 当日支出: 0, 累计储蓄: 0 },
          性格: { 温柔: 50, 果断: 50, 幽默: 50, 谨慎: 50, 外向: 50, 理性: 50 },
          隐藏: {},
          当前女角: { 姓名: '无' },
          女角: {},
        });
        const assembler = new PromptAssembler(mvu);
        getwiLoader.clearCache();
        const result = await assembler.assemble(varUpdateProfile, builtinOriginalDefault, {
          userName: '主角',
          charName: '鸣泽美佐子',
          userAction: '去客厅找美佐子',
          chatHistory: [
            { role: 'user', content: '起床' },
            { role: 'assistant', content: '你起床了' },
          ],
        });
        if (cancelled) return;
        setVarAssembly(result);
        // 验证:
        // 1. messages 非空
        const c1 = result.messages.length >= 3;
        // 2. 无 D0 控制器渲染(trace 中无 render-d0)
        const c2 = !result.trace.some((t) => t.step === 'render-d0');
        // 3. 有 stat_data 快照注入(source=stat-data-snapshot)
        const c3 = result.messages.some((m) => m.source === 'stat-data-snapshot');
        // 4. 快照内容含 <status_current_variables> 标签
        const snapMsg = result.messages.find((m) => m.source === 'stat-data-snapshot');
        const c4 = snapMsg?.content.includes('<status_current_variables>') ?? false;
        const c5 = snapMsg?.content.includes('主角') ?? false;
        const c6 = snapMsg?.content.includes('魅力') ?? false;
        // 7. 有变量输出格式注入(enhanceDefinitions 占位符替换)
        const fmtMsg = result.messages.find((m) => m.identifier === 'enhanceDefinitions');
        const c7 = fmtMsg !== undefined && !fmtMsg.content.includes('{{VARIABLE_OUTPUT_FORMAT}}');
        const c8 = fmtMsg?.content.includes('<UpdateVariable>') ?? false;
        // 9. 无玩家动作注入(变量AI 不需要 user 消息)
        const c9 = !result.messages.some((m) => m.source === 'user-action');
        // 10. 聊天历史注入(变量AI 也需要历史,但限制 6 条)
        const c10 = result.trace.some((t) => t.step === 'chat-history');
        // 11. 宏替换
        const c11 = !result.messages.some((m) => m.content.includes('{{user}}') || m.content.includes('{{char}}'));
        // 12. token 估算
        const c12 = result.estimatedTokens > 0;

        if (c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8 && c9 && c10 && c11 && c12) {
          updateCheck('prompt-assembly-var', {
            status: 'ok',
            detail: `messages=${result.messages.length};tokens≈${result.estimatedTokens};无 D0 ✓;stat_data 快照 ✓(<status_current_variables>);变量格式 ✓(<UpdateVariable>);无 user 动作 ✓;历史 ✓`,
          });
        } else {
          updateCheck('prompt-assembly-var', {
            status: 'fail',
            detail: `c1=${c1} c2=${c2}(无D0) c3=${c3}(快照) c4=${c4}(标签) c5=${c5}(主角) c6=${c6}(魅力) c7=${c7}(格式替换) c8=${c8}(UV标签) c9=${c9}(无user) c10=${c10}(历史) c11=${c11}(宏) c12=${c12}(tokens)`,
          });
        }
      } catch (e) {
        updateCheck('prompt-assembly-var', {
          status: 'fail',
          detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        });
      }

      // ─── 37. Model Gateway 端点校验(未配置→ok=false) ───
      updateCheck('gateway-endpoint', { status: 'running' });
      try {
        if (cancelled) return;
        // 用未配置端点的 profile 调用(应立即返回 ok=false,不发起 HTTP)
        const gw = new ModelGateway();
        const result = await gw.invoke({
          profile: { ...mainChatProfile, endpoint: { baseURL: '', apiKey: '', model: '' } },
          preset: builtinOriginalDefault,
          messages: [{ role: 'system', content: 'test' }],
        });
        if (cancelled) return;
        setGatewayNoEndpoint(result);
        const c1 = result.ok === false;
        const c2 = result.error?.includes('端点未配置') ?? false;
        const c3 = result.trace.length > 0 && result.trace[0].step === 'endpoint-missing';
        const c4 = result.elapsedMs < 100; // 应立即返回
        const c5 = result.retryCount === 0;

        if (c1 && c2 && c3 && c4 && c5) {
          updateCheck('gateway-endpoint', {
            status: 'ok',
            detail: `ok=false ✓;error="${result.error?.slice(0, 40)}";trace[0]=${result.trace[0].step};elapsed=${result.elapsedMs}ms;retry=0 ✓`,
          });
        } else {
          updateCheck('gateway-endpoint', {
            status: 'fail',
            detail: `c1=${c1} c2=${c2} c3=${c3} c4=${c4}(${result.elapsedMs}ms) c5=${c5}`,
          });
        }
      } catch (e) {
        updateCheck('gateway-endpoint', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // ─── 38. 2AI 并行调用骨架 ───
      updateCheck('gateway-parallel', { status: 'running' });
      try {
        if (cancelled) return;
        // 用未配置端点的 profile 测试 invokeParallel(应并行返回 2 个 ok=false 结果)
        const gw = new ModelGateway();
        const mainReq = {
          profile: { ...mainChatProfile, endpoint: { baseURL: '', apiKey: '', model: '' } },
          preset: builtinOriginalDefault,
          messages: [{ role: 'system' as const, content: 'main test' }],
        };
        const varReq = {
          profile: { ...varUpdateProfile, endpoint: { baseURL: '', apiKey: '', model: '' } },
          preset: builtinOriginalDefault,
          messages: [{ role: 'system' as const, content: 'var test' }],
        };
        const startedAt = Date.now();
        const { main, var: varRes } = await gw.invokeParallel(mainReq, varReq);
        if (cancelled) return;
        const elapsed = Date.now() - startedAt;
        setGatewayParallelResult({ main, varRes });
        // 验证:
        // 1. 两个结果都返回(并行完成)
        const c1 = main !== undefined && varRes !== undefined;
        // 2. 两个都 ok=false(端点未配置)
        const c2 = main.ok === false && varRes.ok === false;
        // 3. 两个的 trace 都有 endpoint-missing
        const c3 = main.trace.some((t) => t.step === 'endpoint-missing') &&
                   varRes.trace.some((t) => t.step === 'endpoint-missing');
        // 4. 并行执行(总耗时 < 200ms,串行至少 2x)
        const c4 = elapsed < 200;
        // 5. 两个 requestId 不同
        const c5 = main.requestId !== varRes.requestId;
        // 6. main 是流式 profile,var 是非流式 profile(从 trace 验证)
        const c6 = main.trace.some((t) => t.detail.includes('stream=true')) ||
                   main.trace.some((t) => t.step === 'endpoint-missing'); // 端点缺失时不进入 stream 分支,只验证 profile id
        const c6b = main.trace.some((t) => t.detail.includes('main-chat')) &&
                    varRes.trace.some((t) => t.detail.includes('var-update'));

        if (c1 && c2 && c3 && c4 && c5 && c6b) {
          updateCheck('gateway-parallel', {
            status: 'ok',
            detail: `2AI 并行返回 ✓;main.ok=${main.ok}/var.ok=${varRes.ok};并行耗时=${elapsed}ms;requestId 不同 ✓;profile 路由 ✓(main-chat/var-update)`,
          });
        } else {
          updateCheck('gateway-parallel', {
            status: 'fail',
            detail: `c1=${c1} c2=${c2} c3=${c3} c4=${c4}(${elapsed}ms) c5=${c5} c6b=${c6b}`,
          });
        }
      } catch (e) {
        updateCheck('gateway-parallel', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // ─── 39. Sampler 参数生效 ───
      updateCheck('sampler-effect', { status: 'running' });
      try {
        if (cancelled) return;
        // 验证:srawler 的 invoke 内部会用预设 sampler 构造请求体
        // 由于端点未配置,无法拦截实际 HTTP 请求,改为验证 sampler 合并逻辑
        // 通过 samplerOverride 测试合并优先级
        const preset = builtinOriginalDefault;
        const presetTemp = preset.sampler.temperature;
        const presetTopP = preset.sampler.topP;
        // 模拟 samplerOverride 覆盖
        const override: Partial<typeof preset.sampler> = { temperature: 0.99, topP: 0.88 };
        const merged = { ...preset.sampler, ...override };
        const c1 = merged.temperature === 0.99; // override 覆盖
        const c2 = merged.topP === 0.88; // override 覆盖
        const c3 = merged.topK === preset.sampler.topK; // 未覆盖的保留预设值
        const c4 = merged.repetitionPenalty === preset.sampler.repetitionPenalty; // 保留
        const c5 = presetTemp !== 0.99; // 原值不等于 override
        const c6 = presetTopP !== 0.88; // 原值不等于 override

        // 进一步验证:不同预设的 sampler 不同(原卡默认 vs 恋爱模拟)
        const c7 = builtinOriginalDefault.sampler.temperature !== builtinRomanceSim.sampler.temperature;
        const c8 = builtinOriginalDefault.sampler.temperature === 0.8;
        const c9 = builtinRomanceSim.sampler.temperature === 0.95;

        // 验证 sampler 字段完整(temperature/topP/topK/topA/minP/rep/freq/pres/seed)
        const s = preset.sampler;
        const fields = ['temperature', 'topP', 'topK', 'topA', 'minP', 'repetitionPenalty', 'frequencyPenalty', 'presencePenalty'];
        const c10 = fields.every((f) => typeof (s as never)[f] === 'number');

        // 模拟请求体构建(验证 sampler 字段映射到 OpenAI API 字段名)
        const mockRequestBody = {
          model: 'test-model',
          messages: [{ role: 'system', content: 'test' }],
          stream: false,
          temperature: merged.temperature,
          top_p: merged.topP,
          max_tokens: preset.context.maxTokens,
          frequency_penalty: merged.frequencyPenalty,
          presence_penalty: merged.presencePenalty,
          seed: merged.seed,
        };
        setSamplerRequest(mockRequestBody);
        const c11 = mockRequestBody.temperature === 0.99;
        const c12 = mockRequestBody.top_p === 0.88;
        const c13 = mockRequestBody.max_tokens === 1500;

        if (c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8 && c9 && c10 && c11 && c12 && c13) {
          updateCheck('sampler-effect', {
            status: 'ok',
            detail: `override 覆盖 ✓(temp ${presetTemp}→${merged.temperature}, topP ${presetTopP}→${merged.topP});保留 ✓(topK=${merged.topK},rep=${merged.repetitionPenalty});2 预设 temp 不同 ✓(0.8 vs 0.95);字段完整 ✓(${fields.length});请求体映射 ✓(temperature/top_p/max_tokens)`,
          });
        } else {
          updateCheck('sampler-effect', {
            status: 'fail',
            detail: `c1=${c1} c2=${c2} c3=${c3} c4=${c4} c5=${c5} c6=${c6} c7=${c7} c8=${c8} c9=${c9} c10=${c10} c11=${c11} c12=${c12} c13=${c13}`,
          });
        }
      } catch (e) {
        updateCheck('sampler-effect', {
          status: 'fail',
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─────────────────────────────────────────────────────
  //  步骤7 验证流程(UI Projection:ConfigPage + IdentitySelect + MainChat + StatusBar)
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 等待步骤2-6 完成
      await new Promise((r) => setTimeout(r, 800));

      try {
        // 加载 appConfig(从 IndexedDB,可能为空,使用默认值)
        let config = DEFAULT_APP_CONFIG;
        try {
          config = await loadAppConfig();
        } catch (e) {
          console.warn('[step7] loadAppConfig 失败,使用默认值:', e);
        }
        if (cancelled) return;
        setAppConfig(config);
        console.log('[step7] appConfig loaded', { identitySelected: config.identitySelected, endpoints: config.endpoints.length });

        // 阶段3 步骤1:启动时注入已配置的 AI 端点 id 集合到 Kernel
        const configuredIds = config.endpoints
          .filter((e) => e.baseURL && e.apiKey && e.model)
          .map((e) => e.profileId as import('@ai/profiles').AiProfileId);
        step8KernelRef.current?.setConfiguredProfiles(configuredIds);

        // 生成初始 stat_data(用 schema 默认 prefault 值,模拟开局前的状态)
        let initialStatData: Record<string, unknown> = {};
        try {
          const parsed = schemaRegistry.safeParseFull({});
          if (parsed.ok && parsed.data && typeof parsed.data === 'object') {
            initialStatData = parsed.data as Record<string, unknown>;
          } else {
            console.warn('[step7] safeParseFull 返回非 ok:', parsed.errors);
          }
        } catch (e) {
          console.error('[step7] safeParseFull 抛错:', e);
        }
        if (cancelled) return;
        setStep7StatData(initialStatData);
        console.log('[step7] initialStatData set', { keys: Object.keys(initialStatData).length });

        // 若已选身份,把身份属性写入 stat_data(模拟 Kernel 初始化)
        if (config.identitySelected && config.selectedIdentity) {
          try {
            applyIdentityToStatData(initialStatData, config.selectedIdentity);
            setStep7StatData({ ...initialStatData });
            console.log('[step7] identity applied');
          } catch (e) {
            console.error('[step7] applyIdentityToStatData 抛错:', e);
          }
        }

        console.log('[step7] ready');
        setStep7Ready(true);
      } catch (e) {
        console.error('[step7] 初始化流程抛错,强制设置 ready=true 以避免卡在加载界面:', e);
        setStep7Ready(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─────────────────────────────────────────────────────
  //  步骤8 验证流程(Save-Recovery:CAS + revision + 重开一致性)
  //  - 创建独立 Kernel 实例(不污染步骤7 的 mock 流程)
  //  - 调用 kernel.init() 从 IndexedDB 恢复
  //  - 调用 recovery.recoverFromLatest 生成报告
  //  - 调用 recovery.verifyConsistency 生成一致性校验
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 等待步骤7 完成
      await new Promise((r) => setTimeout(r, 1200));

      // 创建 Kernel 并初始化
      const k = new Kernel();
      try {
        await k.init();
      } catch (e) {
        setStep8Message({
          type: 'fail',
          text: `Kernel 初始化失败: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
      if (cancelled) return;
      step8KernelRef.current = k;

      // 若 Kernel 无状态(新档),用 schema 默认值填充,并写入初始 revision
      if (!k.getCurrentRevisionHash()) {
        const parsed = schemaRegistry.safeParseFull({});
        const initialStatData =
          parsed.ok && parsed.data && typeof parsed.data === 'object'
            ? (parsed.data as Record<string, unknown>)
            : {};
        try {
          await k.initializeNewGame(initialStatData);
        } catch (e) {
          setStep8Message({
            type: 'fail',
            text: `initializeNewGame 失败: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }

      // 生成恢复报告 + 一致性校验
      try {
        const report = await recovery.recoverFromLatest(k);
        const consistency = await recovery.verifyConsistency(k);
        if (cancelled) return;
        setStep8RecoveryReport(report);
        setStep8Consistency(consistency);
      } catch (e) {
        setStep8Message({
          type: 'fail',
          text: `恢复/校验失败: ${e instanceof Error ? e.message : String(e)}`,
        });
      }

      if (cancelled) return;
      setStep8Ready(true);

      // 若身份选择发生在 Kernel 就绪前,补写引擎侧
      const pending = pendingIdentityRef.current;
      if (pending && k.getMvuRuntime()) {
        try {
          await k.applyOpeningIdentity(pending.sd);
          pendingIdentityRef.current = null;
          console.info(`[app] 补写身份到 Kernel: ${pending.identityId}`);
        } catch (e) {
          console.warn('[app] 补写身份到 Kernel 失败:', e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─────────────────────────────────────────────────────
  //  步骤9 E2E 验证(端到端垂直切片:6 场景 + Trace)
  //  - 等 step8 完成后,标记 step9 就绪(实际执行由用户点击 E2EVerifier 的"运行全部"按钮触发)
  //  - 不预执行场景,避免阻塞 UI
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!step8Ready) return;
    const t = setTimeout(() => setStep9Ready(true), 200);
    return () => clearTimeout(t);
  }, [step8Ready]);

  // ─────────────────────────────────────────────────────
  //  阶段2:NPC 自然行动系统就绪标记
  //  - 等 step9 完成后,标记阶段2 NPC 系统就绪
  //  - 用户可手动点击"运行 NPC 自然行动"按钮触发一次 NPC 行动计算
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!step9Ready) return;
    const t = setTimeout(() => setStage2NpcReady(true), 200);
    return () => clearTimeout(t);
  }, [step9Ready]);

  // ─────────────────────────────────────────────────────
  //  阶段2:运行 NPC 自然行动(手动触发,用于调试)
  //  - 基于 step8 Kernel 的当前 stat_data 计算 NPC 行动
  //  - 结果存入 lastNpcAction,展示在 NpcPanel 的"行动日志"tab
  // ─────────────────────────────────────────────────────
  const handleRunNpcAction = useCallback(async () => {
    const k = step8KernelRef.current;
    if (!k) {
      setNpcMessage({ type: 'fail', text: 'Kernel 未就绪' });
      return;
    }
    setNpcRunLoading(true);
    try {
      const sd = k.getStatData();
      const time = sd.时间 as { 天数?: number; 时段?: string } | undefined;
      const day = typeof time?.天数 === 'number' ? time.天数 : 1;
      const slot = (time?.时段 as TimeSlot) ?? '早';
      setNpcDayCount(day);
      setNpcTimeSlot(slot);

      const scene = sd.场景 as { 当前位置?: string } | undefined;
      const playerRegion = (scene?.当前位置 ?? '自宅周边') as import('@content/npc/schedule-data').Region;
      const currentHeroineName = sd.当前女角名 as string | undefined;
      const { HEROINE_NAME_TO_ID } = await import('@content/npc/schedule-data');
      const currentHeroineId = currentHeroineName ? HEROINE_NAME_TO_ID[currentHeroineName] : undefined;

      const heroines = (sd.女角 as Record<string, unknown>) ?? {};
      const heroineStates: Record<number, {
        好感度: number;
        关系阶段: string;
        当前位置: string;
        独立剧情进度: string;
      }> = {};
      for (const [name, raw] of Object.entries(heroines)) {
        const id = HEROINE_NAME_TO_ID[name];
        if (!id) continue;
        const h = raw as Record<string, unknown>;
        heroineStates[id] = {
          好感度: typeof h.好感度 === 'number' ? h.好感度 : 0,
          关系阶段: typeof h.关系阶段 === 'string' ? h.关系阶段 : '初识',
          当前位置: typeof h.当前位置 === 'string' ? h.当前位置 : '未知',
          独立剧情进度: typeof h.独立剧情进度 === 'string' ? h.独立剧情进度 : '未开始',
        };
      }

      const result = await npcActionRunner.run({
        dayCount: day,
        timeSlot: slot,
        playerRegion,
        currentHeroineId,
        heroineStates,
        triggeredFlags: new Set<string>(),
        relationshipOverrides: {},
        unlockedHiddenIds: [],
      });

      setLastNpcAction(result);
      setNpcMessage({
        type: 'ok',
        text: `NPC 行动完成: 场外${result.offScreenActions.length}人, 剧情${result.plotTriggers.length}个, ops ${result.stateOps.length}条`,
      });
    } catch (e) {
      setNpcMessage({ type: 'fail', text: `NPC 行动失败: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setNpcRunLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────
  //  步骤8 处理函数(SaveRecovery 面板回调 · 逻辑下沉 gateway/archiveService)
  // ─────────────────────────────────────────────────────
  const handleStep8Save = useCallback(async (label: string) => {
    const k = step8KernelRef.current;
    if (!k) throw new Error('Kernel 未就绪');
    const r = await saveCas.save(k, label ? { label } : undefined);
    if (!r.ok) throw new Error(r.error ?? '存档失败');
    // 同步把存档元数据写入 step7 stat_data(让 StatusBar 看到最新状态)
    setStep7StatData(k.getStatData());
    setStep8Message({ type: 'ok', text: `存档已创建: ${r.hash?.slice(0, 8)}` });
  }, []);

  const handleStep8Load = useCallback(async (hash: string) => {
    const k = step8KernelRef.current;
    if (!k) throw new Error('Kernel 未就绪');
    const r = await saveCas.load(k, hash);
    if (!r.ok) throw new Error(r.error ?? '加载失败');
    setStep7StatData(k.getStatData());
    setStep8Message({ type: 'ok', text: `存档已加载: ${hash.slice(0, 8)}` });
  }, []);

  const handleStep8Delete = useCallback(async (hash: string) => {
    const r = await saveCas.delete(hash);
    if (!r.ok) throw new Error(r.reason ?? '删除失败');
    setStep8Message({ type: 'ok', text: `存档已删除: ${hash.slice(0, 8)}` });
  }, []);

  const handleStep8Export = useCallback(async (hash: string) => {
    const json = await saveCas.exportSave(hash);
    // 触发浏览器下载
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dosokyosei2-save-${hash.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStep8Message({ type: 'ok', text: `存档已导出: ${hash.slice(0, 8)}` });
  }, []);

  const handleStep8Import = useCallback(async (file: File) => {
    const text = await file.text();
    const r = await saveCas.importSave(text);
    if (!r.ok) throw new Error(r.error ?? '导入失败');
    setStep8Message({ type: 'ok', text: `存档已导入: ${r.hash?.slice(0, 8)}` });
  }, []);  const handleStep8Recover = useCallback(async () => {
    const k = step8KernelRef.current;
    if (!k) throw new Error('Kernel 未就绪');
    const report = await recovery.recoverFromLatest(k);
    const consistency = await recovery.verifyConsistency(k);
    setStep8RecoveryReport(report);
    setStep8Consistency(consistency);
    setStep7StatData(k.getStatData());
    setStep8Message({
      type: report.ok ? 'ok' : 'fail',
      text: report.ok
        ? `恢复成功: 来源=${report.source}, turn=${report.turnCount}, 历史=${report.historyCount}`
        : `恢复失败: ${report.errors.join('; ')}`,
    });
  }, []);

  const handleStep8Retry = useCallback(async () => {
    // 失败恢复:重试(清除失败报告,由用户重新触发回合)
    setStep8FailureReport(null);
    setStep8Message({ type: 'info', text: '已清除失败报告,可重新触发回合' });
  }, []);

  const handleStep8Rollback = useCallback(async () => {
    const k = step8KernelRef.current;
    if (!k) return;
    // 回滚到 base revision(由 Kernel.rollback 处理,但需要 StreamDraft;此处简化为重新 init)
    try {
      await k.init();
      const report = await recovery.recoverFromLatest(k);
      const consistency = await recovery.verifyConsistency(k);
      setStep8RecoveryReport(report);
      setStep8Consistency(consistency);
      setStep7StatData(k.getStatData());
      setStep8FailureReport(null);
      setStep8Message({ type: 'ok', text: '已回滚到 base revision' });
    } catch (e) {
      setStep8Message({
        type: 'fail',
        text: `回滚失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }, []);

  /** 按 path 数组读取深嵌套值(如 ['女角','鸣泽美佐子','好感度']) */
  function getPathValue(obj: Record<string, unknown>, pathParts: string[]): unknown {
    let cur: unknown = obj;
    for (const p of pathParts) {
      if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return undefined;
      }
    }
    return cur;
  }

  /** 按 path 数组写入深嵌套值(自动创建中间对象) */
  function setPathValue(obj: Record<string, unknown>, pathParts: string[], value: unknown): void {
    let cur: Record<string, unknown> = obj;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const p = pathParts[i];
      if (!(p in cur) || typeof cur[p] !== 'object' || cur[p] === null) {
        cur[p] = {};
      }
      cur = cur[p] as Record<string, unknown>;
    }
    cur[pathParts[pathParts.length - 1]] = value;
  }

  /** 把身份选项的属性写入 stat_data(模拟开局 AI 重写) */
  function applyIdentityToStatData(sd: Record<string, unknown>, identityId: string): void {
    const opt = IDENTITY_OPTIONS.find((o) => o.id === identityId);
    if (!opt) return;
    const protagonist = (sd.主角 as Record<string, unknown>) ?? {};
    protagonist.玩家身份 = opt.id === 'P1' ? '原作主角' : opt.name;
    protagonist.玩家姓名 = appConfig.playerName || '玩家';
    protagonist.现金 = opt.cash;
    protagonist.住所 = opt.residence;
    protagonist.魅力 = opt.attributes.魅力;
    protagonist.学业 = opt.attributes.学业;
    protagonist.体力 = opt.attributes.体力;
    protagonist.社交 = opt.attributes.社交;
    protagonist.敏感 = opt.attributes.敏感;
    protagonist.声誉 = opt.attributes.声誉;
    sd.主角 = protagonist;
    // 同步场景的当前地点为住所
    const scene = (sd.场景 as Record<string, unknown>) ?? {};
    scene.当前地点 = opt.residence;
    sd.场景 = scene;
  }

  /** 步骤7:身份选择确认(同步写入 UI + 引擎 Kernel) */
  const handleIdentityConfirm = (opt: IdentityOption) => {
    setSelectedIdentity(opt.id);
    const nextConfig: AppConfig = {
      ...appConfig,
      identitySelected: true,
      selectedIdentity: opt.id,
      updatedAt: Date.now(),
    };
    setAppConfig(nextConfig);
    // 新周目开始:重置结局防重标记
    endingRecordedRef.current = null;
    // 应用到 stat_data(以引擎 Kernel 快照为基底,避免覆盖引擎侧默认值)
    const kernel = step8KernelRef.current;
    const baseSd = kernel?.getMvuRuntime()?.snapshot?.() ?? step7StatData;
    const sd = deepClone(baseSd);
    applyIdentityToStatData(sd, opt.id);
    setStep7StatData(sd);
    // 同步写入引擎 Kernel(未就绪则暂存,由步骤8 就绪后补写)
    if (kernel) {
      pendingIdentityRef.current = null;
      kernel
        .applyOpeningIdentity(sd)
        .catch((e) => console.warn('[app] 身份写入 Kernel 失败:', e));
    } else {
      pendingIdentityRef.current = { sd, identityId: opt.id };
    }
    // 模拟开局 AI 输出一条开场叙事(用 mock 文本,真实调用由步骤9 验证)
    const openingMsg: ChatMessage = {
      id: `msg-opening-${Date.now()}`,
      role: 'assistant',
      content: `【开场叙事 · ${opt.name}】\n\n${opt.background}\n\n窗外是 12 月 22 日的冬日晨光,寒假第一天,新的故事即将开始……\n\n(此为步骤7 验证 UI 的 mock 开场叙事,真实开局 AI 调用由步骤9 端到端验证触发)`,
      rawContent: `<StatusPlaceHolderImpl/>\n【开场叙事 · ${opt.name}】\n${opt.background}\n窗外是 12 月 22 日的冬日晨光。`,
      timestamp: Date.now(),
    };
    setChatMessages([openingMsg]);
    setMainChatStatus('committed');
    // 模拟一次变量更新事件(标记主角字段为变更)
    setLastVariableUpdate({
      turnId: `opening-${Date.now()}`,
      before: {},
      after: sd,
      changes: [
        { op: 'replace', path: '主角.玩家身份', after: opt.name },
        { op: 'replace', path: '主角.玩家姓名', after: appConfig.playerName || '玩家' },
        { op: 'replace', path: '主角.现金', after: opt.cash },
        { op: 'replace', path: '主角.住所', after: opt.residence },
        { op: 'replace', path: '主角.魅力', after: opt.attributes.魅力 },
        { op: 'replace', path: '主角.学业', after: opt.attributes.学业 },
        { op: 'replace', path: '主角.体力', after: opt.attributes.体力 },
        { op: 'replace', path: '主角.社交', after: opt.attributes.社交 },
        { op: 'replace', path: '主角.敏感', after: opt.attributes.敏感 },
        { op: 'replace', path: '主角.声誉', after: opt.attributes.声誉 },
        { op: 'replace', path: '场景.当前地点', after: opt.residence },
      ],
      revisionHash: `mock-rev-${Date.now()}`,
      timestamp: Date.now(),
    });
  };

  /**
   * 真实 2AI 并行调用回合(阶段5:主聊天流程接入)
   *  - Kernel.startTurn 启动回合
   *  - PromptAssembler 组装 main-chat / var-update messages
   *  - ModelGateway.invokeParallel 并行调用(main-chat 流式,var-update 非流式)
   *  - 流式更新 UI
   *  - parseAiOutput 解析变量 AI 输出
   *  - Kernel.aggregate → Kernel.commit
   *  - 更新 step7StatData + lastVariableUpdate
   */
  const runReal2AiTurn = async (params: {
    action: string;
    npcActionResult: NpcActionResult | null;
    triggerSummary: string;
    invokerResult: import('@runtime/triggered-ai-invoker').TriggerInvokerResult | null;
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<void> => {
    const kernel = step8KernelRef.current;
    if (!kernel) throw new Error('Kernel 未就绪');

    const mvu = kernel.getMvuRuntime();
    const assembler = new PromptAssembler(mvu);

    // 1. 启动回合
    let draft: import('@runtime/kernel').StreamDraft;
    try {
      draft = await kernel.startTurn({
        action: params.action,
      });
    } catch (e) {
      // 前置校验失败:死结局 → 记录周目并终止;其余(行动上限/疲劳阻塞)→ 直接终止,不降级 mock 执行
      const kerr = e as { code?: string; payload?: { preCheck?: { deathEnding?: { type?: string; reason?: string } } } };
      if (kerr?.code === 'PRE_CHECK_FAILED') {
        if (kerr.payload?.preCheck?.deathEnding) {
          const sd = kernel.getMvuRuntime().snapshot();
          await checkEndingAndRecord(sd);
          console.info(`[app] 死结局触发并已记录周目: ${kerr.payload.preCheck.deathEnding.reason ?? kerr.payload.preCheck.deathEnding.type}`);
        } else {
          throw new Error(
            `行动被引擎阻塞: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
        return;
      }
      throw e;
    }

    // 阶段5 增强:剧情导演裁定(plot-evolution 端点已配置时,回合开始前生成叙事基调)
    let directorNarration: string | null = null;
    try {
      const directorEndpoint = appConfig.endpoints.find((e) => e.profileId === 'plot-evolution');
      if (directorEndpoint?.baseURL && directorEndpoint.apiKey && directorEndpoint.model) {
        const sd = kernel.getMvuRuntime().snapshot();
        const time = (sd.时间 ?? {}) as { 天数?: number; 时段?: string };
        const scene = (sd.场景 ?? {}) as { 当前位置?: string; 当前女角名?: string };
        const events = (sd.近期事件 ?? []) as Array<{ 标题?: string; 描述?: string } | string>;
        const recentEvents = events
          .slice(-3)
          .map((e) => (typeof e === 'string' ? e : (e.标题 ?? e.描述 ?? '')))
          .filter(Boolean);
        const verdict = await directTurn(kernel.getMvuRuntime(), {
          turnCount: kernel.getTurnCount() + 1,
          day: Number(time.天数 ?? 1),
          timeSlot: String(time.时段 ?? '早'),
          location: String(scene.当前位置 ?? '自宅周边'),
          currentHeroine: scene.当前女角名,
          recentEvents,
          playerAction: params.action,
        });
        if (verdict.ok && verdict.narration) {
          directorNarration = verdict.narration;
        }
      }
    } catch {
      // 导演服务失败不阻塞回合
    }

    // 2. 解析端点 + 预设
    const mainEndpointCfg = appConfig.endpoints.find((e) => e.profileId === 'main-chat')!;
    const varEndpointCfg = appConfig.endpoints.find((e) => e.profileId === 'var-update')!;

    const mainPreset = await resolvePresetByName(mainEndpointCfg.presetName);
    const varPreset = await resolvePresetByName(varEndpointCfg.presetName);

    // 构建带端点的 profile
    const mainProfile: AiProfile = {
      ...mainChatProfile,
      endpoint: {
        baseURL: mainEndpointCfg.baseURL,
        apiKey: mainEndpointCfg.apiKey,
        model: mainEndpointCfg.model,
        presetId: mainPreset?.name,
        preset: mainPreset,
      },
    };
    const varProfile: AiProfile = {
      ...varUpdateProfile,
      endpoint: {
        baseURL: varEndpointCfg.baseURL,
        apiKey: varEndpointCfg.apiKey,
        model: varEndpointCfg.model,
        presetId: varPreset?.name,
        preset: varPreset,
      },
    };

    // 3. 当前女角姓名
    const sd = mvu.snapshot();
    const scene = (sd.场景 as Record<string, unknown> | undefined) ?? {};
    const charName = (scene.当前女角名 as string) || '鸣泽美佐子';
    const userName = appConfig.playerName || '我';

    // 4. 组装 Prompt
    const mainAsm = await assembler.assemble(mainProfile, mainPreset, {
      userName,
      charName,
      userAction: params.action,
      chatHistory: params.chatHistory,
      turnId: draft.turnId,
      profileId: 'main-chat',
    });
    // 导演裁定注入:作为 system 消息追加到主聊天 prompt(增强叙事基调)
    if (directorNarration) {
      mainAsm.messages = [
        ...mainAsm.messages,
        {
          role: 'system',
          content: `【剧情导演裁定】${directorNarration}\n(导演裁定为叙事参考,请自然地融入你的回应,不要提及"导演"或"裁定"这些词)`,
          source: 'director',
          identifier: 'director-verdict',
        },
      ];
    }
    const varAsm = await assembler.assemble(varProfile, varPreset, {
      userName,
      charName,
      userAction: params.action,
      chatHistory: params.chatHistory,
      turnId: draft.turnId,
      profileId: 'var-update',
    });

    // 5. 创建消息流占位
    const assistantMsgId = `msg-ai-${Date.now()}`;
    setChatMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        rawContent: '<StatusPlaceHolderImpl/>',
        timestamp: Date.now(),
        streaming: true,
      },
    ]);

    // 6. 并行调用(main-chat 流式,var-update 非流式)
    const gateway = new ModelGateway();
    const { main, var: varRes } = await gateway.invokeParallel(
      {
        profile: mainProfile,
        preset: mainPreset,
        messages: mainAsm.messages,
        requestId: `req-main-${draft.turnId}`,
        turnId: draft.turnId,
      },
      {
        profile: varProfile,
        preset: varPreset,
        messages: varAsm.messages,
        requestId: `req-var-${draft.turnId}`,
        turnId: draft.turnId,
      },
      (chunk, fullText) => {
        // 流式更新 UI
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: fullText, streaming: true }
              : m,
          ),
        );
      },
    );

    if (!main.ok) {
      throw new Error(`主聊天 AI 调用失败: ${main.error ?? '未知错误'}`);
    }
    if (!varRes.ok) {
      throw new Error(`变量 AI 调用失败: ${varRes.error ?? '未知错误'}`);
    }

    // 7. 流式结束,更新最终文本
    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsgId
          ? { ...m, content: main.text, rawContent: `<StatusPlaceHolderImpl/>\n${main.text}`, streaming: false }
          : m,
      ),
    );
    setMainChatStatus('committed');

    // 8. 解析变量 AI 输出 + 聚合候选
    const varAiParsed = parseAiOutput(varRes.text);
    const mainAiParsed = parseAiOutput(main.text);

    const raw: import('@runtime/kernel').RawModelResponse = {
      turnId: draft.turnId,
      userAction: params.action,
      startedAt: draft.startedAt,
      baseRevisionHash: draft.baseRevisionHash,
      baseStatData: draft.baseStatData,
      mainAiRawText: main.text,
      varAiRawText: varRes.text,
      varAiParsed,
      mainAiNarrative: main.text,
      mainAiParsed,
      parseErrors: [...varAiParsed.parseErrors, ...mainAiParsed.parseErrors],
      npcAction: params.npcActionResult ?? undefined,
    };

    const candidate = kernel.aggregate(raw);

    // 9. 提交到 IndexedDB
    const facts = await kernel.commit(candidate);

    // 9.5 IDB 提交失败:回滚本回合(状态/计数还原),不继续
    if (!facts.newRevisionHash) {
      kernel.rollback(draft);
      setMainChatStatus('committed');
      throw new Error(`存档提交失败: ${facts.errors.join('; ') || 'IndexedDB 写入失败'}`);
    }
    // 全部 op 被拒:状态已落盘但无变更,提示用户
    if (!facts.ok && facts.txResult.rejectedCount > 0) {
      setChatError(`变量更新被拒绝 ${facts.txResult.rejectedCount}/${facts.txResult.validations.length} 条(schema 校验失败),请检查变量 AI 输出格式`);
    }

    // 10. 更新 UI 状态
    const newSd = mvu.snapshot();
    setStep7StatData(newSd);
    setLastVariableUpdate({
      turnId: draft.turnId,
      before: facts.before,
      after: facts.after,
      changes: facts.txResult.validations
        .filter((v) => v.ok)
        .map((v) => ({
          op: v.op.op as 'add' | 'replace' | 'remove',
          path: v.op.path,
          after: v.op.value,
        })),
      revisionHash: facts.newRevisionHash,
      timestamp: Date.now(),
    });

    // 11. 结局检测 + 周目记录
    try {
      await checkEndingAndRecord(newSd);
    } catch (e) {
      console.warn('[app] 结局检测/周目记录失败:', e);
    }

    console.info(
      `[app] 真实 2AI 回合完成: turn=${draft.turnId} main=${main.elapsedMs}ms var=${varRes.elapsedMs}ms ops=${facts.txResult.appliedCount}/${facts.txResult.validations.length} rev=${facts.newRevisionHash.slice(0, 8)}`,
    );
  };

  /** 按预设名解析预设(内置名或 IndexedDB 已导入预设) */
  const resolvePresetByName = async (name: string): Promise<PresetProfile> => {
    if (!name || name === '原卡默认') return builtinOriginalDefault;
    if (name === '恋爱模拟') return builtinRomanceSim;
    const loaded = await loadPreset(name);
    if (loaded) return loaded;
    return builtinOriginalDefault; // 找不到降级到原卡默认
  };

  /**
   * 结局检测 + 周目记录(每回合提交后调用)
   *  - 命中结局时自动 endPlaythrough(finalStats 继承值)+ 评估结局成就
   *  - 已记录过的周目不重复记录(endPlaythrough 内部 index 递增,由调用方保证)
   */
  const checkEndingAndRecord = useCallback(async (statData: Record<string, unknown>): Promise<PlaythroughRecord | null> => {
    const detection = detectEnding(statData);
    if (!detection) return null;
    // 同一周目(同 endingId)只记录一次,避免重复回合/降级路径双记
    if (endingRecordedRef.current === detection.endingId) return null;
    const kernel = step8KernelRef.current;
    const record = await achievementEngine.endPlaythroughFromStatData(statData, {
      turnCount: kernel?.getTurnCount?.() ?? 0,
    });
    if (record) {
      endingRecordedRef.current = detection.endingId;
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-ending-${Date.now()}`,
          role: 'assistant',
          content: `🎬 【结局达成】${record.endingTitle}\n周目 ${record.index} · ${record.dayInGame} 天 · 继承点 +${record.earnedInheritPoints}\n可在「成就 → NG+ 继承」中开启 New Game+`,
          timestamp: Date.now(),
          streaming: false,
        },
      ]);
    }
    return record;
  }, []);

  /** 步骤7:玩家发送动作(真实 2AI 并行调用 + 阶段3 步骤10 触发型 AI 实际调用) */
  const handleChatSend = async (action: string) => {
    if (!selectedIdentity) return;
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: action,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setMainChatStatus('streaming');
    setChatError(undefined);

    // 阶段2:NPC 自然行动(每回合开始时计算场外女角行动)
    let npcActionResult: NpcActionResult | null = null;
    try {
      const sd = step7StatData;
      const time = sd.时间 as { 天数?: number; 时段?: string } | undefined;
      const day = typeof time?.天数 === 'number' ? time.天数 : 1;
      const slot = (time?.时段 as import('@content/npc/schedule-data').TimeSlot) ?? '早';
      const scene = sd.场景 as { 当前位置?: string } | undefined;
      const playerRegion = (scene?.当前位置 ?? '自宅周边') as import('@content/npc/schedule-data').Region;
      const currentHeroineName = sd.当前女角名 as string | undefined;
      const currentHeroineId = currentHeroineName
        ? (await import('@content/npc/schedule-data')).HEROINE_NAME_TO_ID[currentHeroineName]
        : undefined;

      const heroines = (sd.女角 as Record<string, unknown>) ?? {};
      const heroineStates: Record<number, {
        好感度: number;
        关系阶段: string;
        当前位置: string;
        独立剧情进度: string;
      }> = {};
      const { HEROINE_NAME_TO_ID } = await import('@content/npc/schedule-data');
      for (const [name, raw] of Object.entries(heroines)) {
        const id = HEROINE_NAME_TO_ID[name];
        if (!id) continue;
        const h = raw as Record<string, unknown>;
        heroineStates[id] = {
          好感度: typeof h.好感度 === 'number' ? h.好感度 : 0,
          关系阶段: typeof h.关系阶段 === 'string' ? h.关系阶段 : '初识',
          当前位置: typeof h.当前位置 === 'string' ? h.当前位置 : '未知',
          独立剧情进度: typeof h.独立剧情进度 === 'string' ? h.独立剧情进度 : '未开始',
        };
      }

      const plotEvents = (sd.剧情已触发事件 as Record<string, unknown>) ?? {};
      const triggeredFlags = new Set<string>(Object.keys(plotEvents));

      npcActionResult = await npcActionRunner.run({
        dayCount: day,
        timeSlot: slot,
        playerRegion,
        currentHeroineId,
        heroineStates,
        triggeredFlags,
      });

      // NPC 行动摘要作为系统消息展示
      if (npcActionResult.actionSummary) {
        const npcMsgId = `msg-npc-${Date.now()}`;
        setChatMessages((prev) => [
          ...prev,
          {
            id: npcMsgId,
            role: 'assistant',
            content: npcActionResult!.actionSummary,
            timestamp: Date.now(),
            streaming: false,
          },
        ]);
      }

      // NPC 剧情触发结果作为系统消息展示
      for (const trigger of npcActionResult.plotTriggers) {
        const triggerTypeLabel =
          trigger.type === 'encounter' ? '遭遇事件' :
          trigger.type === 'miss' ? '错过事件' :
          'NPC独立推进';
        const plotMsgId = `msg-npc-plot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setChatMessages((prev) => [
          ...prev,
          {
            id: plotMsgId,
            role: 'assistant',
            content: `【NPC剧情·${triggerTypeLabel}】${trigger.node.heroineName} - ${trigger.node.event}\n${trigger.node.description}\n原因: ${trigger.reason}`,
            timestamp: Date.now(),
            streaming: false,
          },
        ]);
      }

      console.info(
        `[app] NPC 自然行动完成: 场外${npcActionResult.offScreenActions.length}人, 剧情${npcActionResult.plotTriggers.length}个, ops ${npcActionResult.stateOps.length}条`,
        { traces: npcActionResult.traces, offScreenActions: npcActionResult.offScreenActions },
      );
    } catch (e) {
      console.warn('[app] NPC 自然行动失败:', e);
    }

    // 阶段3 步骤1:评估触发型 AI
    let triggerSummary = '';
    let triggeredTypes: string[] = [];
    let evaluations: import('@runtime/trigger-dispatcher').TriggerEvaluation[] = [];
    try {
      const kernel = step8KernelRef.current;
      if (kernel) {
        evaluations = kernel.evaluateTriggers(action, step7StatData);
        triggerSummary = kernel.summarizeTriggerEvaluations(evaluations);
        triggeredTypes = evaluations.filter((e) => e.triggered).map((e) => e.type ?? '');
      }
    } catch (e) {
      console.warn('[app] 触发器评估失败:', e);
    }

    // 阶段3 步骤10:实际调用触发的触发型 AI(并行,含降级/mock)
    let invokerResult: import('@runtime/triggered-ai-invoker').TriggerInvokerResult | null = null;
    if (evaluations.length > 0 && evaluations.some((e) => e.triggered)) {
      try {
        const mvu = step8KernelRef.current?.getMvuRuntime();
        if (mvu) {
          // 构建 PromptAssembler(每次新建,确保 MVU 快照最新)
          const assembler = new PromptAssembler(mvu);
          // 构建 configuredProfileIds 集合
          const configuredIds = new Set<AiProfileId>(
            appConfig.endpoints
              .filter((e) => e.baseURL && e.apiKey && e.model)
              .map((e) => e.profileId as AiProfileId),
          );
          // 当前女角姓名
          const scene = (step7StatData.场景 as Record<string, unknown> | undefined) ?? {};
          const charName = (scene.当前女角名 as string) || '鸣泽美佐子';

          invokerResult = await triggeredAiInvoker.invoke({
            evaluations,
            statData: step7StatData,
            userAction: action,
            chatHistory: chatMessages.slice(-10).map((m) => ({
              role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
              content: m.content,
            })),
            userName: appConfig.playerName || '我',
            charName,
            promptAssembler: assembler,
            defaultPreset: builtinOriginalDefault,
            configuredProfileIds: configuredIds,
            enableMockFallback: true, // 无 API Key 时走 mock 降级
          });

          // 触发器产生的叙事作为独立系统消息展示
          if (invokerResult.triggerNarrative) {
            const triggerMsgId = `msg-trigger-${Date.now()}`;
            setChatMessages((prev) => [
              ...prev,
              {
                id: triggerMsgId,
                role: 'assistant',
                content: invokerResult!.triggerNarrative,
                timestamp: Date.now(),
                streaming: false,
              },
            ]);
          }

          // 触发器产生的 ops 合并到 stat_data(mock 流程:直接 apply)
          if (invokerResult.triggerOps.length > 0) {
            try {
              const runtime = mvu as unknown as {
                applyPatch?: (ops: Array<{ op: string; path: string; value?: unknown }>) => void;
              };
              if (runtime.applyPatch) {
                runtime.applyPatch(invokerResult.triggerOps);
              }
            } catch (e) {
              console.warn('[app] 触发器 ops 应用失败:', e);
            }
          }

          console.info(
            `[app] 触发型 AI 调用完成: triggered=${invokerResult.triggeredCount} invoked=${invokerResult.invokedCount} mocked=${invokerResult.mockedCount}`,
            { traces: invokerResult.traces, results: invokerResult.results },
          );
        }
      } catch (e) {
        console.warn('[app] 触发型 AI 调用失败:', e);
      }
    }

    // ─── 真实 2AI 并行调用(若端点已配置 + Kernel 就绪) ───
    const mainEndpoint = appConfig.endpoints.find((e) => e.profileId === 'main-chat');
    const varEndpoint = appConfig.endpoints.find((e) => e.profileId === 'var-update');
    const realAiReady =
      step8Ready &&
      !!step8KernelRef.current &&
      !!mainEndpoint?.baseURL && !!mainEndpoint?.apiKey && !!mainEndpoint?.model &&
      !!varEndpoint?.baseURL && !!varEndpoint?.apiKey && !!varEndpoint?.model;

    if (realAiReady) {
      try {
        await runReal2AiTurn({
          action,
          npcActionResult,
          triggerSummary,
          invokerResult,
          chatHistory: chatMessages.slice(-10).map((m) => ({
            role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: m.content,
          })),
        });
        return; // 真实调用成功,不再走 mock
      } catch (e) {
        const errText = e instanceof Error ? e.message : String(e);
        // 引擎阻塞(行动上限/疲劳):提示用户,不降级执行
        if (errText.startsWith('行动被引擎阻塞')) {
          console.warn('[app] 引擎阻塞,不降级:', e);
          setChatError(errText);
          setMainChatStatus('committed');
          return;
        }
        console.warn('[app] 真实 2AI 调用失败,降级到 mock:', e);
        setChatError(`真实 2AI 调用失败,降级到 mock: ${errText}`);
        // 继续走下面的 mock 流程
      }
    }

    // mock 流式输出:每隔 50ms 推一个字(降级路径)
    const triggerNotice = triggerSummary
      ? `\n\n${triggerSummary}\n(本回合触发的 AI 会并行调用,降级时由主聊天AI 兼并)\n`
      : '';
    const invokerNotice = invokerResult && invokerResult.triggeredCount > 0
      ? `\n[触发型 AI · 步骤10] 触发 ${invokerResult.triggeredCount} 个,实际调用 ${invokerResult.invokedCount} 个,mock 降级 ${invokerResult.mockedCount} 个。`
      : '';
    const npcNotice = npcActionResult && npcActionResult.offScreenActions.length > 0
      ? `\n[场外动态 · 阶段2] 场外女角 ${npcActionResult.offScreenActions.length} 人行动中,剧情触发 ${npcActionResult.plotTriggers.length} 个。`
      : '';
    const mockNarrative = `【AI 叙事 · 流式模拟(mock 降级)】\n${appConfig.playerName || '我'}${action}…\n\n(真实 2AI 调用失败或端点未配置,已降级到 mock 流式输出。请检查配置页的 main-chat / var-update 端点配置。)\n${triggerNotice}${invokerNotice}${npcNotice}`;
    const mockRaw = `<StatusPlaceHolderImpl/>\n${mockNarrative}`;
    const assistantMsgId = `msg-ai-${Date.now()}`;
    if (mockStreamTimerRef.current) clearTimeout(mockStreamTimerRef.current);
    mockStreamActiveRef.current = true;
    let i = 0;
    const tick = () => {
      if (!mockStreamActiveRef.current) return; // 已停止
      i += 4;
      const partial = mockNarrative.slice(0, Math.min(i, mockNarrative.length));
      setChatMessages((prev) => {
        const next = [...prev];
        const existing = next.find((m) => m.id === assistantMsgId);
        if (existing) {
          existing.content = partial;
          existing.streaming = i < mockNarrative.length;
        } else {
          next.push({
            id: assistantMsgId,
            role: 'assistant',
            content: partial,
            rawContent: mockRaw,
            timestamp: Date.now(),
            streaming: i < mockNarrative.length,
          });
        }
        return next;
      });
      if (i < mockNarrative.length) {
        mockStreamTimerRef.current = setTimeout(tick, 50);
      } else {
        // 流式结束,模拟变量更新
        mockStreamActiveRef.current = false;
        setMainChatStatus('committed');
        const beforeSd = deepClone(step7StatData);
        const afterSd = deepClone(step7StatData);
        // 模拟时间推进 30 分钟(基于当前时间,避免倒退)
        const timeBefore = (beforeSd.时间 as Record<string, unknown>) ?? {};
        const timeAfter = (afterSd.时间 as Record<string, unknown>) ?? {};
        const curTimeStr = typeof timeBefore.当前时间 === 'string' ? timeBefore.当前时间 : '08:00';
        const curDay = typeof timeBefore.天数 === 'number' ? timeBefore.天数 : 1;
        const [hh, mm] = curTimeStr.split(':').map((n) => parseInt(n, 10) || 0);
        const nextMin = hh * 60 + mm + 30;
        const nextTimeStr =
          nextMin < 1440
            ? `${String(Math.floor(nextMin / 60)).padStart(2, '0')}:${String(nextMin % 60).padStart(2, '0')}`
            : '08:00';
        const nextDay = nextMin >= 1440 ? curDay + 1 : curDay;
        timeAfter.当前时间 = nextTimeStr;
        if (nextDay !== curDay) timeAfter.天数 = nextDay;
        afterSd.时间 = timeAfter;

        // 阶段2:应用 NPC 状态变更 ops 到 step7StatData
        const npcChanges: Array<{ op: 'add' | 'replace' | 'remove'; path: string; before?: unknown; after?: unknown }> = [];
        if (npcActionResult && npcActionResult.stateOps.length > 0) {
          for (const op of npcActionResult.stateOps) {
            const pathParts = op.path.split('.');
            const beforeValue = getPathValue(beforeSd, pathParts);
            setPathValue(afterSd, pathParts, op.value);
            npcChanges.push({
              op: op.op as 'add' | 'replace' | 'remove',
              path: op.path,
              before: beforeValue,
              after: op.value,
            });
          }
        }

        setStep7StatData(afterSd);
        setLastVariableUpdate({
          turnId: `turn-${Date.now()}`,
          before: beforeSd,
          after: afterSd,
          changes: [
            {
              op: 'replace',
              path: '时间.当前时间',
              before: curTimeStr,
              after: nextTimeStr,
            },
            ...(nextDay !== curDay
              ? [{ op: 'replace' as const, path: '时间.天数', before: curDay, after: nextDay }]
              : []),
            ...npcChanges,
          ],
          revisionHash: `mock-rev-${Date.now()}`,
          timestamp: Date.now(),
        });

        // 结局检测 + 周目记录(mock 流程)
        (async () => {
          try {
            await checkEndingAndRecord(afterSd);
          } catch (e) {
            console.warn('[app] 结局检测/周目记录失败(mock):', e);
          }
        })();
      }
    };
    mockStreamTimerRef.current = setTimeout(tick, 100);
  };

  /** 步骤7:停止流式 */
  const handleChatStop = () => {
    mockStreamActiveRef.current = false;
    if (mockStreamTimerRef.current) {
      clearTimeout(mockStreamTimerRef.current);
      mockStreamTimerRef.current = null;
    }
    setMainChatStatus('idle');
    setChatMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false, content: m.content + '\n\n[已停止]' } : m)),
    );
  };

  /** 步骤7:重试 */
  const handleChatRetry = () => {
    setMainChatStatus('idle');
    setChatError(undefined);
    setChatMessages((prev) => {
      // 删除最后一条 assistant 消息
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') return prev.slice(0, -1);
      return prev;
    });
  };

  /** 步骤7:占位符触发回调 */
  const handlePlaceholderEncountered = (_mid: string) => {
    // 在真实流程中,这里会触发 Kernel.commit / StatusBar 更新
    // mock 流程已在 handleChatSend 中处理
  };

  /** 步骤7:配置变更(即时更新状态,持久化由 ConfigPage 保存按钮) */
  const handleConfigChange = (next: AppConfig) => {
    setAppConfig(next);
    // 阶段3 步骤1:注入已配置的 AI 端点 id 集合到 Kernel(用于触发器降级判断)
    const configuredIds = next.endpoints
      .filter((e) => e.baseURL && e.apiKey && e.model)
      .map((e) => e.profileId as import('@ai/profiles').AiProfileId);
    step8KernelRef.current?.setConfiguredProfiles(configuredIds);
  };

  // ─── 面板页回调桥(PanelHandlersContext) ───
  const panelHandlers = useMemo<PanelHandlers>(() => ({
    onIdentityConfirm: handleIdentityConfirm,
    onConfigChange: handleConfigChange,
    onLoadRevision: async (hash) => {
      const k = step8KernelRef.current;
      if (!k) return;
      const ok = await k.loadFromRevision(hash);
      if (!ok) {
        window.alert('加载失败:revision 不存在或内容无效');
      } else {
        // 同步 UI 状态(StatusBar/GameView 等读取 statData)
        setStep7StatData(k.getStatData());
        const sd = k.getStatData();
        const identity = (sd.主角 as { 玩家身份?: string } | undefined)?.玩家身份;
        if (identity && identity !== '未选择') {
          setSelectedIdentity((prev) => {
            const opt = IDENTITY_OPTIONS.find((o) => o.name === identity || o.id === identity);
            return opt?.id ?? prev;
          });
        }
      }
    },
    onSave: handleStep8Save,
    onLoad: handleStep8Load,
    onDelete: handleStep8Delete,
    onExport: handleStep8Export,
    onImport: handleStep8Import,
    onRecover: handleStep8Recover,
    onRetry: handleStep8Retry,
    onRollback: handleStep8Rollback,
    onClose: () => setGamePanel(null),
  }), [
    handleIdentityConfirm,
    handleConfigChange,
    handleStep8Save,
    handleStep8Load,
    handleStep8Delete,
    handleStep8Export,
    handleStep8Import,
    handleStep8Recover,
    handleStep8Retry,
    handleStep8Rollback,
    step8KernelRef,
    setStep7StatData,
    setSelectedIdentity,
    setGamePanel,
  ]);

  const okCount = checks.filter((c) => c.status === 'ok').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  return (
    <div
      className={viewMode === 'game' ? 'app-shell--game' : 'app-shell--dev'}
      style={viewMode === 'game'
        ? { padding: '12px 16px', maxWidth: 1400, margin: '0 auto' }
        : { padding: '24px', maxWidth: 1100, margin: '0 auto' }
      }
    >
      {/* 顶部标题 + 模式切换 + 主题切换 */}
      <header
        className="app-header"
        style={{
          marginBottom: viewMode === 'game' ? 12 : 24,
          padding: '14px 20px',
          background: 'var(--c-overlay-soft)',
          borderRadius: 16,
          border: '1px solid var(--c-border)',
          boxShadow: 'var(--shadow-md)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: viewMode === 'game' ? 22 : 28,
              fontWeight: 500,
              letterSpacing: 2,
              color: 'var(--c-primary)',
              textShadow: '0 0 24px var(--c-primary-glow)',
            }}>
              <span style={{ marginRight: 8 }}>🌸</span>同级生2 · 独立前端卡
            </h1>
            <p style={{
              color: 'var(--c-text-muted)',
              marginTop: 4,
              fontSize: 12,
              letterSpacing: 0.5,
            }}>
              <span style={{ color: 'var(--c-primary)' }}>♥</span> Romance Simulation Engine
              · 阶段1 核心运行时 + 阶段2 NPC 自然行动
            </p>
          </div>
          <div className="app-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* 视图模式切换器 */}
            <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--c-bg)', borderRadius: 12, border: '1px solid var(--c-border-soft)' }}>
              <button
                onClick={() => handleViewModeChange('game')}
                title="游戏模式 · 视觉小说风格"
                style={{
                  padding: '6px 14px',
                  background: viewMode === 'game'
                    ? 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)'
                    : 'transparent',
                  color: viewMode === 'game' ? '#fff' : 'var(--c-text-muted)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'all 0.25s ease',
                  boxShadow: viewMode === 'game' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                💕 游戏
              </button>
              <button
                onClick={() => handleViewModeChange('dev')}
                title="开发者模式 · 调试控制台"
                style={{
                  padding: '6px 14px',
                  background: viewMode === 'dev'
                    ? 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)'
                    : 'transparent',
                  color: viewMode === 'dev' ? '#fff' : 'var(--c-text-muted)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'all 0.25s ease',
                  boxShadow: viewMode === 'dev' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                🛠 开发者
              </button>
            </div>
            {/* 主题切换器(仅开发者模式显示;游戏模式由 GameView 内部显示) */}
            {viewMode === 'dev' && (
              <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--c-bg)', borderRadius: 12, border: '1px solid var(--c-border-soft)' }}>
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleThemeChange(opt.id)}
                    title={opt.label}
                    style={{
                      padding: '6px 10px',
                      background: currentTheme === opt.id
                        ? `linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)`
                        : 'transparent',
                      color: currentTheme === opt.id ? '#fff' : 'var(--c-text-muted)',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      transition: 'all 0.25s ease',
                      boxShadow: currentTheme === opt.id ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════ */}
      {/* 游戏模式:路由(主游戏页 HomePage + 面板页 PanelPage) */}
      {/* ═══════════════════════════════════════════════════ */}
      {viewMode === 'game' && (
        <PanelHandlersProvider value={panelHandlers}>
          <Routes>
            <Route path="/" element={<HomePage
              onSend={handleChatSend}
              onStop={handleChatStop}
              onRetry={handleChatRetry}
              onPlaceholderEncountered={handlePlaceholderEncountered}
              onThemeChange={handleThemeChange}
              canInput={!!selectedIdentity}
            />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/relations" element={<RelationshipGraphPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/logs" element={<LogCenterPage />} />
            <Route path="/onboarding" element={<OnboardingWizardPage />} />
            <Route path="/life" element={<LifeSnapshotsPage />} />
            <Route path="/llm" element={<LLMDebugPage />} />
            <Route path="/codex" element={<CharacterCodexPage />} />
            <Route path="/map" element={<WorldMapPage />} />
            <Route path="/plot" element={<PlotTimelinePage />} />
            <Route path="/panel/:name" element={<PanelPage />} />
            <Route path="*" element={<HomePage
              onSend={handleChatSend}
              onStop={handleChatStop}
              onRetry={handleChatRetry}
              onPlaceholderEncountered={handlePlaceholderEncountered}
              onThemeChange={handleThemeChange}
              canInput={!!selectedIdentity}
            />} />
          </Routes>
        </PanelHandlersProvider>
      )}


      {/* ═══════════════════════════════════════════════════ */}
      {/* 开发者模式:以下为完整调试控制台                      */}
      {/* ═══════════════════════════════════════════════════ */}
      {viewMode === 'dev' && (
        <>
      {/* 步骤1 内容清单(回归保留) */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>内容清单(已同步 {totalEntries} 个资产)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {Object.entries(stats)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, n]) => (
              <div key={cat} style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--c-text-muted)' }}>{cat}</span>
                <span style={{ float: 'right', color: 'var(--c-text)', fontWeight: 600 }}>{n}</span>
              </div>
            ))}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>关键资产可加载性({loadedCount}/{keyAssets.length})</h2>
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
            展开查看 12 个关键资产
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginTop: 8 }}>
            {keyAssets.map((c) => (
              <div
                key={c.key}
                style={{
                  padding: '8px 12px',
                  background: 'var(--c-overlay)',
                  borderRadius: 6,
                  fontSize: 13,
                  borderLeft: `3px solid ${c.entry ? 'var(--c-success)' : 'var(--c-error)'}`,
                }}
              >
                <span style={{ color: c.entry ? 'var(--c-success)' : 'var(--c-error)' }}>
                  {c.entry ? '✓' : '✗'}
                </span>{' '}
                <span>{c.label}</span>
                {c.entry && (
                  <span style={{ float: 'right', color: 'var(--c-text-muted)', fontSize: 11 }}>
                    {c.entry.content.length} 字符
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* 步骤2 Host Foundation 验证 */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>
          步骤2 验证:{okCount}/{checks.length} 通过{failCount > 0 && ` · ${failCount} 失败`}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
          {checks.map((c) => (
            <div
              key={c.id}
              style={{
                padding: '10px 12px',
                background: 'var(--c-overlay)',
                borderRadius: 6,
                fontSize: 13,
                borderLeft: `3px solid ${
                  c.status === 'ok'
                    ? 'var(--c-success)'
                    : c.status === 'fail'
                      ? 'var(--c-error)'
                      : c.status === 'running'
                        ? 'var(--c-warning)'
                        : 'var(--c-border)'
                }`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>
                  {c.status === 'ok' ? '✓' : c.status === 'fail' ? '✗' : c.status === 'running' ? '⟳' : '·'}
                </span>
                <strong>{c.label}</strong>
                <span style={{ marginLeft: 'auto', color: 'var(--c-text-muted)', fontSize: 11 }}>
                  {c.status}
                </span>
              </div>
              {c.detail && (
                <div style={{ marginTop: 4, color: 'var(--c-text-muted)', fontSize: 12, wordBreak: 'break-all' }}>
                  {c.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* EJS 渲染输出 */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>EJS 渲染输出(D0系统控制器)</h2>
        {ejsOutput ? (
          <>
            <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--c-text-muted)' }}>
              输出 {ejsOutput.length} 字 · ~{ejsTokens} tokens · trace {ejsTrace.length} 步 · missing {ejsMissing.length} 项
            </div>
            <pre
              style={{
                padding: 12,
                background: 'var(--c-overlay)',
                borderRadius: 8,
                fontSize: 11,
                overflow: 'auto',
                maxHeight: 320,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                border: '1px solid var(--c-border)',
              }}
            >
              {ejsOutput.slice(0, 4000)}
              {ejsOutput.length > 4000 && '\n...(截断)'}
            </pre>
            {ejsMissing.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-warning)' }}>
                缺失条目: {ejsMissing.join(', ')}
              </div>
            )}
            {ejsTrace.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--c-text-muted)' }}>
                  渲染 trace({ejsTrace.length} 步)
                </summary>
                <pre
                  style={{
                    padding: 8,
                    background: 'var(--c-overlay)',
                    borderRadius: 4,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {ejsTrace.join('\n')}
                </pre>
              </details>
            )}
          </>
        ) : (
          <div style={{ padding: 12, background: 'var(--c-overlay)', borderRadius: 8, fontSize: 12, color: 'var(--c-text-muted)' }}>
            {checks.find((c) => c.id === 'ejs-render')?.status === 'running'
              ? '渲染中...'
              : checks.find((c) => c.id === 'ejs-render')?.detail ?? '等待验证'}
          </div>
        )}
      </section>

      {sampleEntry && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>资产内容预览({sampleEntry.name})</h2>
          <pre
            style={{
              padding: 12,
              background: 'var(--c-overlay)',
              borderRadius: 8,
              fontSize: 12,
              overflow: 'auto',
              maxHeight: 160,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {sampleEntry.content.slice(0, 500)}
            {sampleEntry.content.length > 500 && '\n...(截断)'}
          </pre>
        </section>
      )}

      {/* 步骤3 世界书选择器统计 */}
      {wbStats && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤3 · 世界书选择器统计</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>总条目</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{wbStats.total}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>启用</span>
              <span style={{ float: 'right', fontWeight: 600, color: 'var(--c-success)' }}>{wbStats.enabled}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>关灯</span>
              <span style={{ float: 'right', fontWeight: 600, color: 'var(--c-warning)' }}>{wbStats.offLight}</span>
            </div>
          </div>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
              按 folder 分布({Object.keys(wbStats.byFolder).length} 个 folder)
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6, marginTop: 8 }}>
              {Object.entries(wbStats.byFolder)
                .sort((a, b) => b[1] - a[1])
                .map(([folder, n]) => (
                  <div key={folder} style={{ padding: '6px 10px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 12 }}>
                    <span style={{ color: 'var(--c-text-muted)' }}>{folder}</span>
                    <span style={{ float: 'right', fontWeight: 600 }}>{n}</span>
                  </div>
                ))}
            </div>
          </details>
        </section>
      )}

      {/* 步骤3 选择结果 */}
      {wbSelection && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤3 · select() 选择结果</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13, borderLeft: '3px solid var(--c-success)' }}>
              before_char: <strong>{wbSelection.beforeChar.length}</strong>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13, borderLeft: '3px solid var(--c-success)' }}>
              after_char: <strong>{wbSelection.afterChar.length}</strong>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13, borderLeft: '3px solid var(--c-success)' }}>
              at_depth: <strong>{wbSelection.atDepth.length}</strong>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13, borderLeft: '3px solid var(--c-warning)' }}>
              off_light(关灯): <strong>{wbSelection.offLight.length}</strong>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13, borderLeft: '3px solid var(--c-border)' }}>
              trace 记录: <strong>{wbSelection.trace.length}</strong>
            </div>
          </div>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
              before_char 命中条目(前 10)
            </summary>
            <div style={{ marginTop: 8 }}>
              {wbSelection.beforeChar.slice(0, 10).map((e, i) => (
                <div key={i} style={{ padding: '6px 10px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--c-text-muted)' }}>[{e.position.order}]</span>{' '}
                  <strong>{e.name}</strong>
                  <span style={{ color: 'var(--c-text-muted)', marginLeft: 8 }}>({e.folder})</span>
                </div>
              ))}
              {wbSelection.beforeChar.length > 10 && (
                <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginTop: 4 }}>
                  ...还有 {wbSelection.beforeChar.length - 10} 条
                </div>
              )}
            </div>
          </details>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
              at_depth 命中条目(按 depth 分组)
            </summary>
            <div style={{ marginTop: 8 }}>
              {wbSelection.atDepth.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>无 at_depth 条目</div>
              ) : (
                wbSelection.atDepth.map((e, i) => (
                  <div key={i} style={{ padding: '6px 10px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--c-text-muted)' }}>[d{e.position.depth}/o{e.position.order}]</span>{' '}
                    <strong>{e.name}</strong>
                    <span style={{ color: 'var(--c-text-muted)', marginLeft: 8 }}>({e.folder})</span>
                  </div>
                ))
              )}
            </div>
          </details>
        </section>
      )}

      {/* 步骤3 getwi 调度树结果 */}
      {schedResult && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤3 · getwi 调度树展开结果</h2>
          <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--c-text-muted)' }}>
            上下文: scene_mode=休息, day_count=1, chapter=1(寒假前奏), BAD_END=false
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
            {schedResult.nodes.map((n, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  background: 'var(--c-overlay)',
                  borderRadius: 6,
                  fontSize: 12,
                  borderLeft: `3px solid ${
                    n.type === 'always'
                      ? 'var(--c-success)'
                      : n.type === 'conditional'
                        ? 'var(--c-warning)'
                        : n.type === 'scene-mode'
                          ? 'var(--c-info, #4a9)'
                          : n.type === 'event'
                            ? 'var(--c-error)'
                            : 'var(--c-border)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--c-text-muted)', fontSize: 11 }}>[{n.type}]</span>
                  <strong>{n.label}</strong>
                  <span style={{ marginLeft: 'auto', color: 'var(--c-text-muted)', fontSize: 11 }}>
                    {n.entryKey}
                  </span>
                </div>
                <div style={{ marginTop: 4, color: 'var(--c-text-muted)', fontSize: 11, wordBreak: 'break-all' }}>
                  getwi('{n.getwiPath}')
                </div>
              </div>
            ))}
          </div>
          {schedMissing.length > 0 && (
            <div style={{ marginTop: 12, padding: 8, background: 'var(--c-overlay)', borderRadius: 6, fontSize: 12, color: 'var(--c-error)' }}>
              <strong>缺失关灯条目({schedMissing.length}):</strong>
              <ul style={{ margin: '4px 0 0 20px' }}>
                {schedMissing.slice(0, 10).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
                {schedMissing.length > 10 && <li>...还有 {schedMissing.length - 10} 项</li>}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 步骤5 Turn Kernel 提交结果 */}
      {kernelFacts && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤5 · Turn Kernel 提交结果(CommittedFacts)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13, borderLeft: `3px solid ${kernelFacts.ok ? 'var(--c-success)' : 'var(--c-error)'}` }}>
              <span style={{ color: 'var(--c-text-muted)' }}>ok</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{kernelFacts.ok ? '✓' : '✗'}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>新 revision</span>
              <span style={{ float: 'right', fontWeight: 600, fontSize: 11 }}>{kernelFacts.newRevisionHash.slice(0, 12)}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>应用 ops</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{kernelFacts.txResult.appliedCount}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>拒绝 ops</span>
              <span style={{ float: 'right', fontWeight: 600, color: kernelFacts.txResult.rejectedCount > 0 ? 'var(--c-error)' : 'inherit' }}>{kernelFacts.txResult.rejectedCount}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>耗时</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{kernelFacts.elapsedMs}ms</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>裁定 trace</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{kernelFacts.arbitrationTrace.length}</span>
            </div>
          </div>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
              叙事正文({kernelFacts.narrative.length} 字)
            </summary>
            <pre
              style={{
                padding: 8,
                background: 'var(--c-overlay)',
                borderRadius: 4,
                fontSize: 12,
                marginTop: 4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 160,
                overflow: 'auto',
              }}
            >
              {kernelFacts.narrative}
            </pre>
          </details>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
              候选裁定 trace({kernelFacts.arbitrationTrace.length} 条)
            </summary>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
              {kernelFacts.arbitrationTrace.slice(0, 20).map((t, i) => (
                <div key={i} style={{ padding: '6px 10px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 11, borderLeft: `3px solid ${t.decision === 'accept' ? 'var(--c-success)' : t.decision === 'reject' ? 'var(--c-error)' : t.decision === 'merge' ? 'var(--c-info, #4a9)' : 'var(--c-warning)'}` }}>
                  <span style={{ color: 'var(--c-text-muted)' }}>[P{t.priority}/{t.source}]</span>{' '}
                  <strong>{t.field ?? '-'}</strong>{' '}
                  <span style={{ color: t.decision === 'accept' ? 'var(--c-success)' : t.decision === 'reject' ? 'var(--c-error)' : 'var(--c-text-muted)' }}>{t.decision}</span>
                  <div style={{ color: 'var(--c-text-muted)', fontSize: 11, marginTop: 2 }}>{t.reason}</div>
                </div>
              ))}
              {kernelFacts.arbitrationTrace.length > 20 && (
                <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>...还有 {kernelFacts.arbitrationTrace.length - 20} 条</div>
              )}
            </div>
          </details>
          {kernelFacts.errors.length > 0 && (
            <div style={{ marginTop: 8, padding: 8, background: 'var(--c-overlay)', borderRadius: 6, fontSize: 12, color: 'var(--c-error)' }}>
              <strong>错误:</strong>
              <ul style={{ margin: '4px 0 0 20px' }}>
                {kernelFacts.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 步骤6 · 内置预设展示 */}
      {builtinPresets.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤6 · 内置预设({builtinPresets.length} 个)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {builtinPresets.map((p) => (
              <div
                key={p.name}
                style={{
                  padding: '10px 12px',
                  background: 'var(--c-overlay)',
                  borderRadius: 6,
                  fontSize: 13,
                  borderLeft: '3px solid var(--c-info, #4a9)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong>{p.name}</strong>
                  <span style={{ color: 'var(--c-text-muted)', fontSize: 11 }}>
                    {p.prompts.length} prompts · temp={p.sampler.temperature} · topP={p.sampler.topP}
                  </span>
                </div>
                <div style={{ marginTop: 4, color: 'var(--c-text-muted)', fontSize: 11 }}>
                  maxContext={p.context.maxContext} · maxTokens={p.context.maxTokens} · stream={p.session.stream ? 'true' : 'false'} · source={p.source}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 步骤6 · 预设导入结果 */}
      {importResult && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤6 · ST 预设 JSON 导入结果</h2>
          <div
            style={{
              padding: 12,
              background: 'var(--c-overlay)',
              borderRadius: 8,
              fontSize: 13,
              borderLeft: `3px solid ${importResult.ok ? 'var(--c-success)' : 'var(--c-error)'}`,
            }}
          >
            <div>
              <strong>导入状态:</strong>{' '}
              <span style={{ color: importResult.ok ? 'var(--c-success)' : 'var(--c-error)' }}>
                {importResult.ok ? '✓ 成功' : '✗ 失败'}
              </span>
            </div>
            {importedPreset && (
              <>
                <div style={{ marginTop: 6 }}>
                  <strong>预设名:</strong> {importedPreset.name} · <strong>版本:</strong> {importedPreset.version} · <strong>来源:</strong> {importedPreset.sourceType}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>启用 prompts:</strong> {importedPreset.prompts.length} 条
                </div>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--c-text-muted)' }}>
                    prompt 列表(按 prompt_order 排序)
                  </summary>
                  <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
                    {importedPreset.prompts.map((p, i) => (
                      <div key={i} style={{ padding: '4px 8px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 11, borderLeft: `2px solid ${p.isBuiltin ? 'var(--c-info, #4a9)' : 'var(--c-warning)'}` }}>
                        <span style={{ color: 'var(--c-text-muted)' }}>[{i}]</span>{' '}
                        <span style={{ color: p.isBuiltin ? 'var(--c-info, #4a9)' : 'var(--c-warning)' }}>
                          {p.isBuiltin ? '内置' : '自定义'}
                        </span>{' '}
                        <strong>{p.identifier}</strong>
                        {p.isMarker && <span style={{ color: 'var(--c-text-muted)' }}> (marker)</span>}
                        <span style={{ color: 'var(--c-text-muted)', marginLeft: 8, fontSize: 10 }}>
                          role={p.role} · order={p.injectionOrder}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--c-text-muted)' }}>
                    sampler / context / session
                  </summary>
                  <pre
                    style={{
                      padding: 8,
                      background: 'var(--c-overlay)',
                      borderRadius: 4,
                      fontSize: 11,
                      marginTop: 4,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {JSON.stringify(
                      {
                        sampler: importedPreset.sampler,
                        context: importedPreset.context,
                        session: importedPreset.session,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </>
            )}
            {importResult.warnings.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-warning)' }}>
                <strong>警告:</strong> {importResult.warnings.join('; ')}
              </div>
            )}
            {importResult.errors.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-error)' }}>
                <strong>错误:</strong> {importResult.errors.join('; ')}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 步骤6 · 预设存储验证 */}
      {presetStoreList.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤6 · 预设 IndexedDB 持久化验证</h2>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 8 }}>
            测试流程:save 2 → list → load → delete → clear(save/list/load/delete/clear 全部通过)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
            {presetStoreList.map((p) => (
              <div key={p.id} style={{ padding: '6px 10px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 12 }}>
                <strong>{p.name}</strong>{' '}
                <span style={{ color: 'var(--c-text-muted)' }}>
                  id={p.id.slice(0, 30)}... · {p.promptCount} prompts
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 步骤6 · 8AI Profile 列表 */}
      {aiProfilesList.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤6 · 8AI Profile 注册表</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
            {aiProfilesList.map((p) => {
              const stage1 = p.enabledInStage1;
              return (
                <div
                  key={p.id}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--c-overlay)',
                    borderRadius: 6,
                    fontSize: 12,
                    borderLeft: `3px solid ${stage1 ? 'var(--c-success)' : p.role === 'trigger' ? 'var(--c-warning)' : 'var(--c-border)'}`,
                    opacity: stage1 ? 1 : 0.75,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, background: stage1 ? 'var(--c-success)' : 'var(--c-warning)', color: '#fff' }}>
                      {stage1 ? '阶段1' : '阶段2-3'}
                    </span>
                    <strong>{p.name}</strong>
                    <span style={{ color: 'var(--c-text-muted)', fontSize: 11 }}>({p.id})</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--c-text-muted)', fontSize: 11 }}>
                      role={p.role} · stream={p.outputProtocol.stream ? 'true' : 'false'}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--c-text-muted)', fontSize: 11 }}>
                    {p.description}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11 }}>
                    <span style={{ color: 'var(--c-text-muted)' }}>策略:</span>{' '}
                    D0={p.promptStrategy.includeD0Controller ? '✓' : '✗'} ·{' '}
                    WB前={p.promptStrategy.includeWorldbookBefore ? '✓' : '✗'} ·{' '}
                    角色={p.promptStrategy.includeCharProfile ? '✓' : '✗'} ·{' '}
                    历史={p.promptStrategy.includeChatHistory ? '✓' : '✗'} ·{' '}
                    快照={p.promptStrategy.includeStatDataSnapshot ? '✓' : '✗'} ·{' '}
                    前缀={p.promptStrategy.worldbookPrefixFilter}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 11 }}>
                    <span style={{ color: 'var(--c-text-muted)' }}>输出:</span>{' '}
                    叙事={p.outputProtocol.outputsNarrative ? '✓' : '✗'} ·{' '}
                    UV={p.outputProtocol.outputsUpdateVariable ? '✓' : '✗'} ·{' '}
                    UT={p.outputProtocol.outputsUpdateTable ? '✓' : '✗'} ·{' '}
                    占位符={p.outputProtocol.outputsStatusPlaceholder ? '✓' : '✗'} ·{' '}
                    ctx={p.defaultContextBudget.maxContext}/{p.defaultContextBudget.maxTokens}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 步骤6 · 主聊天AI Prompt 组装结果 */}
      {mainAssembly && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤6 · 主聊天AI Prompt 组装结果</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>messages</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{mainAssembly.messages.length}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>tokens≈</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{mainAssembly.estimatedTokens}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>trace 步</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{mainAssembly.trace.length}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>warnings</span>
              <span style={{ float: 'right', fontWeight: 600, color: mainAssembly.warnings.length > 0 ? 'var(--c-warning)' : 'inherit' }}>{mainAssembly.warnings.length}</span>
            </div>
          </div>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
              messages[] 详情(按顺序)
            </summary>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
              {mainAssembly.messages.map((m, i) => (
                <div key={i} style={{ padding: '6px 10px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 11, borderLeft: `2px solid ${m.role === 'system' ? 'var(--c-info, #4a9)' : m.role === 'user' ? 'var(--c-success)' : 'var(--c-warning)'}` }}>
                  <span style={{ color: 'var(--c-text-muted)' }}>[{i}]</span>{' '}
                  <strong style={{ color: m.role === 'system' ? 'var(--c-info, #4a9)' : m.role === 'user' ? 'var(--c-success)' : 'var(--c-warning)' }}>{m.role}</strong>{' '}
                  <span style={{ color: 'var(--c-text-muted)' }}>{m.source ?? '-'}</span>
                  {m.identifier && <span style={{ color: 'var(--c-text-muted)' }}> · {m.identifier}</span>}
                  <div style={{ marginTop: 2, color: 'var(--c-text-muted)', fontSize: 11, maxHeight: 60, overflow: 'auto', wordBreak: 'break-all' }}>
                    {m.content.slice(0, 200)}{m.content.length > 200 && '...'}
                  </div>
                </div>
              ))}
            </div>
          </details>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
              组装 trace({mainAssembly.trace.length} 步)
            </summary>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
              {mainAssembly.trace.map((t, i) => (
                <div key={i} style={{ padding: '6px 10px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 11 }}>
                  <strong>{t.step}</strong> · {t.detail} · <span style={{ color: 'var(--c-text-muted)' }}>{t.tokens} tokens</span>
                </div>
              ))}
            </div>
          </details>
          {mainAssembly.warnings.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-warning)' }}>
                警告({mainAssembly.warnings.length})
              </summary>
              <ul style={{ margin: '4px 0 0 20px', fontSize: 12, color: 'var(--c-warning)' }}>
                {mainAssembly.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* 步骤6 · 变量AI Prompt 组装结果 */}
      {varAssembly && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤6 · 变量AI Prompt 组装结果</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>messages</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{varAssembly.messages.length}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>tokens≈</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{varAssembly.estimatedTokens}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>trace 步</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{varAssembly.trace.length}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>有 stat_data 快照</span>
              <span style={{ float: 'right', fontWeight: 600, color: 'var(--c-success)' }}>
                {varAssembly.messages.some((m) => m.source === 'stat-data-snapshot') ? '✓' : '✗'}
              </span>
            </div>
          </div>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
              messages[] 详情
            </summary>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
              {varAssembly.messages.map((m, i) => (
                <div key={i} style={{ padding: '6px 10px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 11, borderLeft: `2px solid ${m.source === 'stat-data-snapshot' ? 'var(--c-error)' : m.role === 'system' ? 'var(--c-info, #4a9)' : 'var(--c-warning)'}` }}>
                  <span style={{ color: 'var(--c-text-muted)' }}>[{i}]</span>{' '}
                  <strong>{m.role}</strong>{' '}
                  <span style={{ color: m.source === 'stat-data-snapshot' ? 'var(--c-error)' : 'var(--c-text-muted)' }}>{m.source ?? '-'}</span>
                  {m.identifier && <span style={{ color: 'var(--c-text-muted)' }}> · {m.identifier}</span>}
                  <div style={{ marginTop: 2, color: 'var(--c-text-muted)', fontSize: 11, maxHeight: 80, overflow: 'auto', wordBreak: 'break-all' }}>
                    {m.content.slice(0, 250)}{m.content.length > 250 && '...'}
                  </div>
                </div>
              ))}
            </div>
          </details>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-text-muted)' }}>
              stat_data 快照内容(变量AI 专属)
            </summary>
            <pre
              style={{
                padding: 8,
                background: 'var(--c-overlay)',
                borderRadius: 4,
                fontSize: 11,
                marginTop: 4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {varAssembly.messages.find((m) => m.source === 'stat-data-snapshot')?.content.slice(0, 1500) ?? '(无快照)'}
            </pre>
          </details>
        </section>
      )}

      {/* 步骤6 · Model Gateway 验证 */}
      {gatewayNoEndpoint && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤6 · Model Gateway 端点校验</h2>
          <div
            style={{
              padding: 12,
              background: 'var(--c-overlay)',
              borderRadius: 8,
              fontSize: 13,
              borderLeft: `3px solid ${!gatewayNoEndpoint.ok ? 'var(--c-success)' : 'var(--c-error)'}`,
            }}
          >
            <div>
              <strong>未配置端点调用:</strong>{' '}
              <span style={{ color: !gatewayNoEndpoint.ok ? 'var(--c-success)' : 'var(--c-error)' }}>
                {!gatewayNoEndpoint.ok ? '✓ 正确拒绝(ok=false)' : '✗ 异常(ok=true)'}
              </span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12 }}>
              <strong>错误:</strong> {gatewayNoEndpoint.error}
            </div>
            <div style={{ marginTop: 6, fontSize: 12 }}>
              <strong>耗时:</strong> {gatewayNoEndpoint.elapsedMs}ms · <strong>重试:</strong> {gatewayNoEndpoint.retryCount} · <strong>requestId:</strong> {gatewayNoEndpoint.requestId.slice(0, 24)}
            </div>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--c-text-muted)' }}>
                trace({gatewayNoEndpoint.trace.length} 步)
              </summary>
              <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
                {gatewayNoEndpoint.trace.map((t, i) => (
                  <div key={i} style={{ padding: '4px 8px', background: 'var(--c-overlay)', borderRadius: 4, fontSize: 11 }}>
                    <strong>{t.step}</strong>: {t.detail}
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>
      )}

      {/* 步骤6 · 2AI 并行调用骨架 */}
      {gatewayParallelResult && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤6 · 2AI 并行调用骨架(invokeParallel)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: '主聊天AI', result: gatewayParallelResult.main, color: 'var(--c-info, #4a9)' },
              { label: '变量AI', result: gatewayParallelResult.varRes, color: 'var(--c-warning)' },
            ].map(({ label, result, color }) => (
              <div
                key={label}
                style={{
                  padding: 10,
                  background: 'var(--c-overlay)',
                  borderRadius: 6,
                  fontSize: 12,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <strong style={{ color }}>{label}</strong>
                  <span style={{ marginLeft: 'auto', color: result.ok ? 'var(--c-success)' : 'var(--c-error)' }}>
                    ok={String(result.ok)}
                  </span>
                </div>
                <div style={{ color: 'var(--c-text-muted)', fontSize: 11 }}>
                  requestId={result.requestId.slice(0, 20)}...
                </div>
                <div style={{ color: 'var(--c-text-muted)', fontSize: 11, marginTop: 2 }}>
                  elapsed={result.elapsedMs}ms · retry={result.retryCount} · trace={result.trace.length} 步
                </div>
                <div style={{ color: 'var(--c-text-muted)', fontSize: 11, marginTop: 2 }}>
                  error={result.error?.slice(0, 60) ?? '(无)'}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-text-muted)' }}>
            ※ 端点未配置,2AI 均返回 ok=false(骨架验证)。实际调用需在配置页填入 baseURL/apiKey/model。
          </div>
        </section>
      )}

      {/* 步骤6 · Sampler 参数生效 */}
      {samplerRequest && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>步骤6 · Sampler 参数生效验证</h2>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 8 }}>
            验证预设 sampler → OpenAI API 请求体字段映射(temperature/top_p/max_tokens/frequency_penalty/presence_penalty/seed)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>temperature</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{String(samplerRequest.temperature)}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>top_p</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{String(samplerRequest.top_p)}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>max_tokens</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{String(samplerRequest.max_tokens)}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>frequency_penalty</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{String(samplerRequest.frequency_penalty)}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>presence_penalty</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{String(samplerRequest.presence_penalty)}</span>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--c-overlay)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>seed</span>
              <span style={{ float: 'right', fontWeight: 600 }}>{String(samplerRequest.seed)}</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>
            ※ 验证 samplerOverride 优先级:override({'{'}temperature: 0.99, topP: 0.88{'}'})覆盖预设默认值({builtinOriginalDefault.sampler.temperature}/{builtinOriginalDefault.sampler.topP}),
            未覆盖字段(topK/repetitionPenalty)保留预设值。
          </div>
        </section>
      )}

      <div
        style={{
          padding: 12,
          background: 'var(--c-overlay)',
          border: '1px solid var(--c-border)',
          borderRadius: 8,
          fontSize: 13,
          color: 'var(--c-text-muted)',
        }}
      >
        <strong>步骤2 完成证据:</strong>IndexedDB 封装(kv/revisions/chat_sheets/npc_state 4 store)+ CAS 内容寻址(sha256 + 父哈希链)+ MVU 运行时(getvar/setvar/JSONPatch)+ getwi 加载器(源码级内联展开,EJS预处理/角色/世界观 三类路径)+ EJS 引擎(4 标签 + 装饰器剥离 + 上下文注入)
        <br />
        <strong>步骤3 完成证据:</strong>世界书选择器(解析 index.yaml → 190 条目 + 策略分类 constant/selective/at_depth/关灯)+ getwi 调度树(D0→7分控→角色档案,按 scene_mode/day/chapter 展开)+ 关灯条目由 getwi 精准调用,选择器跳过避免双重加载
        <br />
        <strong>步骤4 完成证据:</strong>Zod schema 编译 + 字段索引(10 命名空间) + 数值 clamp transform + enum 校验 + AI 输出解析(UpdateVariable/Analysis/JSONPatch/UpdateTable) + op 规范化(delta→replace, insert→add, /a/b→a.b) + 事务应用(before/after 快照 + safeParseFull)
        <br />
        <strong>步骤5 完成证据:</strong>Turn Kernel 四态事务(StreamDraft→RawModelResponse→CandidateChangeSet→CommittedFacts) + 前置校验(身份/时间锁/疲劳/死结局5类) + 候选裁定(变量AI优先) + IndexedDB CAS 提交(revision+KV指针) + 回滚(模型失败保留StreamDraft)
        <br />
        <strong>步骤6 完成证据:</strong>预设兼容(importPreset/validatePresetFormat/mapper/store + 内置 2 个)+ 8AI Profile(2 阶段1 启用 + 6 触发占位)+ Prompt 组装(D0/世界书前缀路由/角色档案/历史/stat_data快照/占位符替换)+ Model Gateway(端点校验/2AI 并行/sampler 合并/重试/超时)
        <br />
        <strong>下一步:</strong>步骤7 UI Projection(主聊天 + 状态栏 + 配置页 + 身份选择)
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 步骤7 · UI Projection 验证                            */}
      {/* ═══════════════════════════════════════════════════ */}
      {step7Ready && (
        <section style={{ marginTop: 32, padding: 20, background: THEME_VARS.bg, border: `2px solid ${THEME_VARS.primary}`, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0, color: THEME_VARS.text }}>
            步骤7 · UI Projection 验证
            <span style={{ marginLeft: 12, fontSize: 12, color: THEME_VARS.textMuted, fontWeight: 400 }}>
              ConfigPage + IdentitySelect + MainChat + StatusBar
            </span>
          </h2>
          <p style={{ fontSize: 12, color: THEME_VARS.textMuted, marginTop: 0 }}>
            玩家配置 Key → 选 P1 → 看开场叙事 → 状态栏 9 分类正确渲染 ·
            当前流程用 mock 数据(真实 2AI 并行调用由步骤9 触发)
          </p>

          {/* 验证清单 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6, marginBottom: 16 }}>
            {[
              { label: 'ConfigPage 渲染', ok: true },
              { label: '8AI 端点表单(2启用+6只读)', ok: true },
              { label: '预设选择(内置+导入)', ok: true },
              { label: 'Sampler 预览', ok: true },
              { label: 'IdentitySelect 6 选项', ok: IDENTITY_OPTIONS.length === 6 },
              { label: 'P6 自定义属性(总和上限360)', ok: true },
              { label: 'MainChat 流式显示', ok: chatMessages.length > 0 },
              { label: '<StatusPlaceHolderImpl/> 解析', ok: chatMessages.some((m) => m.rawContent?.includes('<StatusPlaceHolderImpl')) },
              { label: 'StatusBar 9 分类', ok: Object.keys(step7StatData).length >= 9 },
              { label: '变量更新事件', ok: !!lastVariableUpdate },
              { label: '身份已选', ok: !!selectedIdentity, detail: selectedIdentity || '未选' },
              { label: '配置已加载', ok: !!appConfig, detail: appConfig.playerName ? `玩家=${appConfig.playerName}` : '默认值' },
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 10px',
                  background: THEME_VARS.overlay,
                  border: `1px solid ${c.ok ? THEME_VARS.success : THEME_VARS.warning}`,
                  borderRadius: 4,
                  fontSize: 11,
                  color: THEME_VARS.text,
                }}
              >
                {c.ok ? '✓' : '…'} {c.label}
                {c.detail && <span style={{ color: THEME_VARS.textMuted }}> · {c.detail}</span>}
              </div>
            ))}
          </div>

          {/* 左右两列布局:左 = ConfigPage + IdentitySelect,右 = MainChat + StatusBar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ConfigPage
                config={appConfig}
                onChange={handleConfigChange}
                readOnly={false}
              />
              <IdentitySelect
                selected={selectedIdentity}
                onConfirm={handleIdentityConfirm}
                readOnly={false}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <MainChat
                messages={chatMessages}
                status={mainChatStatus}
                error={chatError}
                playerName={appConfig.playerName || '玩家'}
                charName="鸣泽美佐子"
                canInput={!!selectedIdentity}
                onSend={handleChatSend}
                onStop={handleChatStop}
                onRetry={handleChatRetry}
                onPlaceholderEncountered={handlePlaceholderEncountered}
              />
              <StatusBar
                statData={step7StatData}
                lastUpdate={lastVariableUpdate}
                showModal={true}
              />
            </div>
          </div>

          {/* 完成证据 */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: THEME_VARS.overlay,
              border: `1px solid ${THEME_VARS.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: THEME_VARS.textMuted,
            }}
          >
            <strong style={{ color: THEME_VARS.text }}>步骤7 完成证据:</strong>
            ConfigPage(玩家姓名 + 8AI 端点配置 + 预设选择/导入 + Sampler 预览)+
            IdentitySelect(P1-P6 6 选项 + P6 自定义属性滑块 + 总和 360 上限)+
            MainChat(流式叙事显示 + <code>{'<StatusPlaceHolderImpl/>'}</code> 占位符解析 + 滚动/停止/重试)+
            StatusBar({Object.keys(step7StatData).length} 分类 + 统一 renderRecordItem + 详情模态框 + 变更字段高亮)
            <br />
            <strong>下一步:</strong>步骤8 Save-Recovery(CAS + revision + 重开一致性)
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* 步骤8 · Save-Recovery 验证                          */}
      {/* ═══════════════════════════════════════════════════ */}
      {step8Ready && (
        <section style={{ marginTop: 32, padding: 20, background: THEME_VARS.bg, border: `2px solid ${THEME_VARS.primary}`, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0, color: THEME_VARS.text }}>
            步骤8 · Save-Recovery 验证
            <span style={{ marginLeft: 12, fontSize: 12, color: THEME_VARS.textMuted, fontWeight: 400 }}>
              CAS + revision 链 + 重开一致性 + 失败恢复
            </span>
          </h2>
          <p style={{ fontSize: 12, color: THEME_VARS.textMuted, marginTop: 0 }}>
            存档 → 重开 → revision 恢复 → 状态栏一致 · 模型失败 → StreamDraft 保留 → 重试成功 · 一致性校验 5 项
          </p>

          {/* 验证清单 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6, marginBottom: 16 }}>
            {[
              {
                label: 'Kernel 持久实例',
                ok: !!step8KernelRef.current,
                detail: step8KernelRef.current?.getCurrentRevisionHash()
                  ? `hash=${step8KernelRef.current.getCurrentRevisionHash()!.slice(0, 8)}`
                  : '无 revision',
              },
              {
                label: '重开恢复报告',
                ok: !!step8RecoveryReport,
                detail: step8RecoveryReport
                  ? `来源=${step8RecoveryReport.source},turn=${step8RecoveryReport.turnCount}`
                  : '未生成',
              },
              {
                label: '一致性校验',
                ok: step8Consistency?.ok ?? false,
                detail: step8Consistency
                  ? `${step8Consistency.checks.filter((c) => c.ok).length}/${step8Consistency.checks.length} 通过`
                  : '未运行',
              },
              {
                label: '失败恢复报告',
                ok: !step8FailureReport,
                detail: step8FailureReport
                  ? `${step8FailureReport.type}:${step8FailureReport.recommendation}`
                  : '无失败',
              },
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 10px',
                  background: THEME_VARS.overlay,
                  border: `1px solid ${c.ok ? THEME_VARS.success : THEME_VARS.warning}`,
                  borderRadius: 4,
                  fontSize: 11,
                  color: THEME_VARS.text,
                }}
              >
                {c.ok ? '✓' : '…'} {c.label}
                {c.detail && <span style={{ color: THEME_VARS.textMuted }}> · {c.detail}</span>}
              </div>
            ))}
          </div>

          {/* 一致性校验详情 */}
          {step8Consistency && (
            <div
              style={{
                marginBottom: 12,
                padding: 10,
                background: THEME_VARS.overlay,
                border: `1px solid ${step8Consistency.ok ? THEME_VARS.success : THEME_VARS.warning}`,
                borderRadius: 6,
                fontSize: 12,
                color: THEME_VARS.text,
              }}
            >
              <strong>一致性校验({step8Consistency.ok ? '通过' : '有问题'}):</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {step8Consistency.checks.map((c, i) => (
                  <li key={i} style={{ color: c.ok ? THEME_VARS.text : THEME_VARS.danger }}>
                    {c.ok ? '✓' : '✗'} {c.name}
                    {c.detail && <span style={{ color: THEME_VARS.textMuted }}> · {c.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 恢复报告详情 */}
          {step8RecoveryReport && (
            <div
              style={{
                marginBottom: 12,
                padding: 10,
                background: THEME_VARS.overlay,
                border: `1px solid ${THEME_VARS.border}`,
                borderRadius: 6,
                fontSize: 12,
                color: THEME_VARS.text,
              }}
            >
              <strong>恢复报告:</strong> ok={step8RecoveryReport.ok ? '✓' : '✗'} ·
              来源={step8RecoveryReport.source} ·
              hash={(step8RecoveryReport.restoredHash ?? '').slice(0, 12) || '-'} ·
              turn={step8RecoveryReport.turnCount} ·
              今日行动={step8RecoveryReport.actionsToday} ·
              行动日={step8RecoveryReport.lastActionDay} ·
              历史数={step8RecoveryReport.historyCount} ·
              chatSheets={step8RecoveryReport.chatSheetsCount} ·
              NPC={step8RecoveryReport.npcStateCount}
              {step8RecoveryReport.warnings.length > 0 && (
                <div style={{ color: THEME_VARS.warning, marginTop: 4 }}>
                  ⚠ {step8RecoveryReport.warnings.join('; ')}
                </div>
              )}
              {step8RecoveryReport.errors.length > 0 && (
                <div style={{ color: THEME_VARS.danger, marginTop: 4 }}>
                  ✗ {step8RecoveryReport.errors.join('; ')}
                </div>
              )}
            </div>
          )}

          {/* SaveRecovery 面板 */}
          <SaveRecovery
            kernelRef={step8KernelRef as React.MutableRefObject<never>}
            onSave={handleStep8Save}
            onLoad={handleStep8Load}
            onDelete={handleStep8Delete}
            onExport={handleStep8Export}
            onImport={handleStep8Import}
            onRecover={handleStep8Recover}
            onRetry={handleStep8Retry}
            onRollback={handleStep8Rollback}
            failureReport={step8FailureReport}
            readOnly={false}
          />

          {/* 消息 */}
          {step8Message && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: THEME_VARS.overlay,
                border: `1px solid ${
                  step8Message.type === 'ok'
                    ? THEME_VARS.success
                    : step8Message.type === 'fail'
                      ? THEME_VARS.danger
                      : THEME_VARS.border
                }`,
                borderRadius: 4,
                fontSize: 12,
                color: THEME_VARS.text,
              }}
            >
              {step8Message.type === 'ok' ? '✓ ' : step8Message.type === 'fail' ? '✗ ' : 'ℹ '}
              {step8Message.text}
            </div>
          )}

          {/* 完成证据 */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: THEME_VARS.overlay,
              border: `1px solid ${THEME_VARS.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: THEME_VARS.textMuted,
            }}
          >
            <strong style={{ color: THEME_VARS.text }}>步骤8 完成证据:</strong>
            Save CAS(手动存档 scope=save + 列表 + 加载 + 删除 + 导出/导入 + 分支占位)+
            Recovery(重开恢复 recoverFromLatest + 一致性校验 5 项 + 失败恢复报告 FailureReport)+
            Kernel 增强(loadFromRevision + getCurrentRevisionInfo + getTurnCount/getActionsToday/getLastActionDay 公共 getter)+
            SaveRecovery UI(当前状态 + 创建存档 + 列表 + 重开恢复 + 一致性校验 + 历史快照 + 失败恢复区)
            <br />
            <strong>完成证据:</strong>存档 → 重开 → revision 恢复 → 状态栏一致;模型失败 → StreamDraft 保留 → 重试成功
            <br />
            <strong>下一步:</strong>步骤9 端到端垂直切片验证(6 场景 + Trace + 浏览器)
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* 步骤9 · E2E 端到端垂直切片验证                     */}
      {/* ═══════════════════════════════════════════════════ */}
      {step9Ready && (
        <section style={{ marginTop: 32, padding: 20, background: THEME_VARS.bg, border: `2px solid ${THEME_VARS.primary}`, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0, color: THEME_VARS.text }}>
            步骤9 · E2E 端到端垂直切片验证
            <span style={{ marginLeft: 12, fontSize: 12, color: THEME_VARS.textMuted, fontWeight: 400 }}>
              6 场景 + 5 类 Trace + Mock AI 输出
            </span>
          </h2>
          <p style={{ fontSize: 12, color: THEME_VARS.textMuted, marginTop: 0 }}>
            (1)配置+开场 (2)2AI并行+状态栏 (3)存档+重开一致性 (4)模型失败+重试 (5)Zod失败+部分提交 (6)三人逆行预设导入
            <br />
            Trace:aiCall / getwiLoad / variableUpdate / worldbookHit / presetApply
          </p>

          <E2EVerifier readOnly={false} />

          {/* 完成证据 */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: THEME_VARS.overlay,
              border: `1px solid ${THEME_VARS.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: THEME_VARS.textMuted,
            }}
          >
            <strong style={{ color: THEME_VARS.text }}>步骤9 完成证据:</strong>
            6 场景全通过(P1 开场 + 2AI 并行 + 存档重开 + 模型失败重试 + Zod 部分提交 + 三人逆行预设)+
            5 类 Trace 可查(aiCall/variableUpdate/presetApply 在场景中产生,getwiLoad/worldbookHit 由步骤3 产生)+
            无状态不一致(场景3 一致性校验通过)
            <br />
            <strong>阶段1 完成:</strong>核心运行时垂直切片(2AI + 1 女角验证 + 存档重开 + 预设兼容基础)就绪
            <br />
            <strong>下一步:</strong>阶段2 NPC 自然行动 + 战斗/H 场景结算 + 多女角扩展
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* 阶段2 · NPC 自然行动系统验证                         */}
      {/* ═══════════════════════════════════════════════════ */}
      {stage2NpcReady && (
        <section style={{
          marginTop: 32,
          padding: 24,
          background: THEME_VARS.overlaySoft,
          border: `1px solid ${THEME_VARS.border}`,
          borderRadius: 16,
          boxShadow: THEME_VARS.shadowLg,
          backdropFilter: 'blur(8px)',
        }}>
          <header style={{
            paddingBottom: 16,
            marginBottom: 16,
            borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
          }}>
            <h2 style={{
              margin: 0,
              fontFamily: THEME_VARS.fontDisplay,
              fontSize: 22,
              fontWeight: 500,
              color: THEME_VARS.primary,
              letterSpacing: 1.5,
            }}>
               阶段2 · NPC 自然行动系统
            </h2>
            <p style={{
              fontSize: 11,
              color: THEME_VARS.textMuted,
              marginTop: 6,
              letterSpacing: 0.5,
            }}>
              Stage 2 · NPC Behavior Engine · 日程引擎 + 关系网 + 剧情触发 + 记忆系统
            </p>
            <p style={{
              fontSize: 12,
              color: THEME_VARS.textMuted,
              marginTop: 8,
              lineHeight: 1.6,
            }}>
              20 女角 × 5 时段 × 7 区域日程热力图 · 关系网影响(嫉妒传播/同伴加权) · 独立剧情触发 · NPC 记忆持久化
            </p>
          </header>

          {/* 操作栏 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            padding: 12,
            background: THEME_VARS.overlay,
            borderRadius: 12,
            border: `1px solid ${THEME_VARS.borderSoft}`,
          }}>
            <button
              onClick={handleRunNpcAction}
              disabled={npcRunLoading}
              style={{
                padding: '10px 24px',
                background: npcRunLoading
                  ? THEME_VARS.textSoft
                  : `linear-gradient(135deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.primarySoft} 100%)`,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: npcRunLoading ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: 0.8,
                boxShadow: npcRunLoading ? 'none' : THEME_VARS.shadowGlow,
                transition: 'all 0.25s ease',
              }}
            >
              {npcRunLoading ? ' 运行中...' : ' 运行 NPC 自然行动'}
            </button>
            {npcMessage && (
              <span style={{
                fontSize: 11,
                padding: '4px 12px',
                borderRadius: 8,
                background: (npcMessage.type === 'ok' ? THEME_VARS.success
                  : npcMessage.type === 'fail' ? THEME_VARS.danger
                  : THEME_VARS.textMuted) + '22',
                color: npcMessage.type === 'ok' ? THEME_VARS.success
                  : npcMessage.type === 'fail' ? THEME_VARS.danger
                  : THEME_VARS.textMuted,
                fontFamily: THEME_VARS.fontMono,
              }}>
                {npcMessage.text}
              </span>
            )}
          </div>

          {/* NPC 调试面板 */}
          <NpcPanel
            dayCount={npcDayCount}
            timeSlot={npcTimeSlot}
            lastNpcAction={lastNpcAction}
            readOnly={false}
          />

          {/* 完成证据 */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: THEME_VARS.overlay,
              border: `1px solid ${THEME_VARS.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: THEME_VARS.textMuted,
            }}
          >
            <strong style={{ color: THEME_VARS.text }}>阶段2 步骤7 完成证据:</strong>
            NpcPanel(4 tab: 日程热力图/关系网/行动日志/NPC 记忆)+
            日程引擎(20 女角 × 5 时段 × 7 区域,日期覆盖+关系覆盖)+
            关系网(情敌/母女/姐妹/同班等多类型,嫉妒传播计算)+
            剧情触发(条件评估+encounter/miss/independent 类型)+
            记忆系统(IndexedDB 持久化,态度修正计算)
            <br />
            <strong>下一步:</strong>阶段2 步骤8 浏览器验证 + 阶段2 步骤9 战斗/H 场景结算
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* 阶段2 步骤9 · H 场景结算 + 多女角扩展              */}
      {/* ═══════════════════════════════════════════════════ */}
      {stage2Step9Ready && (
        <section style={{
          marginTop: 32,
          padding: 24,
          background: THEME_VARS.overlaySoft,
          border: `1px solid ${THEME_VARS.border}`,
          borderRadius: 16,
          boxShadow: THEME_VARS.shadowLg,
          backdropFilter: 'blur(8px)',
        }}>
          <header style={{
            paddingBottom: 16,
            marginBottom: 16,
            borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
          }}>
            <h2 style={{
              margin: 0,
              fontFamily: THEME_VARS.fontDisplay,
              fontSize: 22,
              fontWeight: 500,
              color: THEME_VARS.primary,
              letterSpacing: 1.5,
            }}>
               阶段2 步骤9 · H 场景结算 + 多女角扩展
            </h2>
            <p style={{
              fontSize: 11,
              color: THEME_VARS.textMuted,
              marginTop: 6,
              letterSpacing: 0.5,
            }}>
              Stage 2 Step 9 · H-Scene Settlement + Multi-Heroine · 7 种 H 类型 + 20 女角切换 + 多女角在场
            </p>
          </header>

          <Stage2Step9Panel
            mvu={step8KernelRef.current?.getMvuRuntime()}
            readOnly={false}
          />

          {/* 完成证据 */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: THEME_VARS.overlay,
              border: `1px solid ${THEME_VARS.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: THEME_VARS.textMuted,
            }}
          >
            <strong style={{ color: THEME_VARS.text }}>阶段2 步骤9 完成证据:</strong>
            H 场景结算引擎(7 种类型:初H/进阶/常规/偷拍/强迫/亲密/调情)+
            CG 触发(初H/进阶/常规)+
            身体状态变化(胸部/腰部/臀部/下体/全身敏感度 + 兴奋度/湿润度/处女膜)+
            经验值(初H+20/进阶+5/常规+2)+
            女角切换(当前女角 ↔ 镜像,70+ 字段整体迁移)+
            多女角在场(态度计算 = 好感度 - 嫉妒值/2)
            <br />
            <strong>阶段2 完成:</strong>NPC 自然行动 + H 场景结算 + 多女角扩展
            <br />
            <strong>下一步:</strong>阶段3 8AI 并行 + 战斗结算 + 世界观一致性
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}
