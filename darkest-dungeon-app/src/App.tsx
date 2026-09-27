import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { useTownStore } from '@/stores/townStore';
import { loadHeroes, loadTrinkets } from '@/data/ddLoader';
import { setTrinketDataCache } from '@/gateway/trinketSystem';
import TownHeader from '@/components/TownHeader';
import HeroRoster from '@/components/HeroRoster';
import HeroPanel from '@/components/HeroPanel';
import BuildingPanel from '@/components/BuildingPanel';
import StatusBar from '@/components/StatusBar';
import Combat from '@/components/Combat';
import BattleSetup from '@/components/BattleSetup';
import Dungeon from '@/components/Dungeon';
import DungeonDispatch from '@/components/DungeonDispatch';
import QuestBoard from '@/components/QuestBoard';
import TrinketInventory from '@/components/TrinketInventory';
import DistrictsPanel from '@/components/DistrictsPanel';
import StressCheckModal from '@/components/StressCheckModal';
import WeekTransition from '@/components/WeekTransition';
import ModManager from '@/components/ModManager';
import KernelStatusPanel from '@/components/KernelStatusPanel';
import { TopNav } from '@/components/TopNav';
import { HubNav } from '@/components/HubNav';
import { StoryConsole } from '@/components/StoryConsole';
import { AutonomyPanel } from '@/components/AutonomyPanel';
import { SettingsPage } from '@/pages/SettingsPage';
import { LogCenterPage } from '@/pages/LogCenterPage';
import { LLMDebugPage } from '@/pages/LLMDebugPage';
import { SaveManagerPage } from '@/pages/SaveManagerPage';
import { WorldbookPage } from '@/pages/WorldbookPage';
import { BestiaryPage } from '@/pages/BestiaryPage';
import { ArenaPage } from '@/pages/ArenaPage';
import { FarmsteadPage } from '@/pages/FarmsteadPage';
import { TimelinePage } from '@/pages/TimelinePage';
import { SummaryPage } from '@/pages/SummaryPage';
import { CanonPage } from '@/pages/CanonPage';
import { PlotEvolutionPage } from '@/pages/PlotEvolutionPage';
import { RosterPage } from '@/pages/RosterPage';
import { PromptManagerPage } from '@/pages/PromptManagerPage';
import { CrimsonPage } from '@/pages/CrimsonPage';
import { TrinketCodexPage } from '@/pages/TrinketCodexPage';
import { BehaviorPage } from '@/pages/BehaviorPage';
import { ModsPage } from '@/pages/ModsPage';
import { logHub } from '@/stores/logStore';
import { ToastViewport } from '@/ui/Extras';
import type { HeroData } from '@/types';

// 游戏主壳（城镇/地牢/战斗阶段机）
function GameShell() {
  const [ddLoaded, setDdLoaded] = useState(false);
  const [heroCount, setHeroCount] = useState(0);
  const [showTrinketBag, setShowTrinketBag] = useState(false);
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const activeBuilding = useTownStore((s) => s.activeBuilding);
  const showDistricts = useTownStore((s) => s.showDistricts);
  const closeDistricts = useTownStore((s) => s.closeDistricts);

  useEffect(() => {
    loadHeroes().then((heroes: HeroData[]) => {
      setHeroCount(heroes.length);
      setDdLoaded(true);
      logHub.info(`数据库已加载：${heroes.length} 英雄`);
    });
    loadTrinkets().then((data) => {
      setTrinketDataCache(data);
      logHub.info(`饰品数据库已加载：${data.entries.length} 件`);
    });
  }, []);

  if (!ddLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 45%, rgba(200,160,48,0.05), transparent 70%), #0a0705',
        }}
      >
        <div className="text-center space-y-4">
          <div className="dd-title text-3xl text-dd-gold dd-anim-flicker">
            暗黑地牢
          </div>
          <div className="dd-divider w-72 mx-auto" />
          <div className="text-dd-textMuted text-sm italic tracking-widest">
            先祖的遗产在黑暗中等候…
          </div>
          <div className="text-dd-textDim text-xs animate-pulse">
            正在读取古老的档案…
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'week_transition') {
    return (
      <>
        <WeekTransition />
        <StressCheckModal />
      </>
    );
  }

  if (phase === 'battle_setup') {
    return (
      <>
        <BattleSetup />
        <StressCheckModal />
      </>
    );
  }

  if (phase === 'dungeon_dispatch') {
    return (
      <>
        <DungeonDispatch />
        <StressCheckModal />
      </>
    );
  }

  if (phase === 'quest_board') {
    return (
      <>
        <QuestBoard />
        <StressCheckModal />
      </>
    );
  }

  if (phase === 'battle') {
    return (
      <>
        <Combat />
        <StressCheckModal />
      </>
    );
  }

  if (phase === 'dungeon') {
    return (
      <>
        <Dungeon />
        <StressCheckModal />
      </>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-16">
      <div className="max-w-7xl mx-auto">
        <TopNav />

        {/* 标题栏 */}
        <header className="mb-5 text-center">
          <h1 className="dd-title text-4xl text-dd-gold dd-text-gold">
            暗黑地牢
          </h1>
          <div className="dd-divider w-64 mx-auto my-3" />
          <p className="text-dd-textMuted text-sm italic tracking-widest">
            先祖的遗产在黑暗中等候…
          </p>
        </header>

        {/* 城镇头部：资源 + 建筑导航 */}
        <TownHeader />

        {/* 主内容区：区域建筑 / 建筑面板 / 饰品背包 / 名册 + 详情 / Mod管理 */}
        {showDistricts ? (
          <DistrictsPanel onClose={closeDistricts} />
        ) : activeBuilding === 'mod_manager' ? (
          <ModManager onClose={() => useTownStore.getState().closeBuilding()} />
        ) : activeBuilding ? (
          <BuildingPanel />
        ) : showTrinketBag ? (
          <TrinketInventory onClose={() => setShowTrinketBag(false)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HeroRoster />
            <HeroPanel />
          </div>
        )}

        {/* 背包入口（非建筑面板/区域建筑时显示） */}
        {!activeBuilding && !showDistricts && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setShowTrinketBag((v) => !v)}
              className="dd-btn"
            >
              {showTrinketBag ? '◈ 返回名册' : '◆ 饰品背包'}
            </button>
          </div>
        )}

        {/* 出发冒险入口 */}
        <div className="mt-4 dd-panel">
          <div className="dd-panel-header">
            <span>◆ 出发冒险</span>
            <span className="text-[10px] normal-case tracking-normal text-dd-gold">
              选择你的道路
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setPhase('quest_board')}
                className="dd-btn-primary"
              >
                ◈ 任务公告板
              </button>
              <button
                onClick={() => setPhase('dungeon_dispatch')}
                className="dd-btn"
              >
                ⚔ 地牢探索
              </button>
              <button
                onClick={() => setPhase('battle_setup')}
                className="dd-btn"
              >
                ✠ 快速战斗
              </button>
            </div>
            <p className="text-dd-textMuted text-xs mt-3 text-center tracking-wider">
              任务公告板：接取任务获取奖励 / 地牢探索：自由探索 / 快速战斗：直接进入战斗测试
            </p>
          </div>
        </div>

        {/* 文字冒险主端口（AI 驱动核心交互）+ 自主事件 */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StoryConsole />
          <AutonomyPanel />
        </div>

        {/* 庄园中枢：主游玩窗口 */}
        <div className="mt-4">
          <HubNav />
        </div>

        {/* 统一命令与存档状态（首条垂直切片） */}
        <KernelStatusPanel />
      </div>

      <StatusBar />
      <StressCheckModal />
    </div>
  );
}

// 工具页外壳（统一返回按钮）
function ToolShell({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen p-4 pb-16">
      <div className="max-w-7xl mx-auto">
        <TopNav />
        <header className="mb-5 text-center">
          <h1 className="dd-title text-3xl text-dd-gold dd-text-gold">{title}</h1>
          <div className="dd-divider w-48 mx-auto my-3" />
        </header>
        {children}
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const inTool = location.pathname !== '/';
  const setPhase = useGameStore((s) => s.setPhase);

  // 离开工具页回到游戏时，确保处于城镇阶段（避免卡在非城镇阶段看不到导航）
  useEffect(() => {
    if (location.pathname === '/') {
      const phase = useGameStore.getState().phase;
      if (['battle_setup', 'dungeon_dispatch', 'quest_board'].includes(phase)) {
        setPhase('town');
      }
    }
  }, [location.pathname, setPhase]);

  const back = () => navigate('/');

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(ellipse 60% 40% at 50% 45%, rgba(200,160,48,0.05), transparent 70%), #0a0705',
      }}
    >
      {inTool ? (
        <Routes>
          <Route path="/settings" element={<ToolShell title="设置"><SettingsPage onBack={back} /></ToolShell>} />
          <Route path="/logs" element={<ToolShell title="日志中心"><LogCenterPage onBack={back} /></ToolShell>} />
          <Route path="/llm-debug" element={<ToolShell title="LLM 调试台"><LLMDebugPage onBack={back} /></ToolShell>} />
          <Route path="/saves" element={<ToolShell title="存档管理"><SaveManagerPage onBack={back} /></ToolShell>} />
          <Route path="/worldbook" element={<ToolShell title="世界书"><WorldbookPage onBack={back} /></ToolShell>} />
          <Route path="/bestiary" element={<ToolShell title="怪物图鉴"><BestiaryPage onBack={back} /></ToolShell>} />
          <Route path="/arena" element={<ToolShell title="斗技场"><ArenaPage onBack={back} /></ToolShell>} />
          <Route path="/farmstead" element={<ToolShell title="磨坊农场"><FarmsteadPage onBack={back} /></ToolShell>} />
          <Route path="/quests" element={<ToolShell title="编年史"><TimelinePage onBack={back} /></ToolShell>} />
          <Route path="/summary" element={<ToolShell title="战役概览"><SummaryPage onBack={back} /></ToolShell>} />
          <Route path="/canon" element={<ToolShell title="原著指导"><CanonPage onBack={back} /></ToolShell>} />
          <Route path="/plot" element={<ToolShell title="剧情演化"><PlotEvolutionPage onBack={back} /></ToolShell>} />
          <Route path="/roster" element={<ToolShell title="名册管理"><RosterPage onBack={back} /></ToolShell>} />
          <Route path="/prompts" element={<ToolShell title="预设管理"><PromptManagerPage onBack={back} /></ToolShell>} />
          <Route path="/crimson" element={<ToolShell title="猩红庭院"><CrimsonPage onBack={back} /></ToolShell>} />
          <Route path="/trinkets" element={<ToolShell title="饰品图鉴"><TrinketCodexPage onBack={back} /></ToolShell>} />
          <Route path="/behavior" element={<ToolShell title="行为分析"><BehaviorPage onBack={back} /></ToolShell>} />
          <Route path="/mods" element={<ToolShell title="模组库"><ModsPage onBack={back} /></ToolShell>} />
        </Routes>
      ) : (
        <GameShell />
      )}
      <ToastViewport />
    </div>
  );
}

export default App;
