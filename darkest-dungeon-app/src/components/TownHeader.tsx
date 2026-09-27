import { useGameStore } from '@/stores/gameStore';
import { useTownStore, isBuildingUnlocked, BUILDING_INFO } from '@/stores/townStore';
import { useWeekStore } from '@/stores/weekStore';
import type { BuildingId } from '@/types';
import clsx from 'clsx';

// ---- 火把图标（纯CSS绘制） ----
function TorchIcon() {
  return (
    <span
      className="dd-anim-flicker inline-block w-3 h-4 relative"
      style={{
        background: 'radial-gradient(ellipse at 50% 60%, #f8c040 0%, #e8a030 30%, #8b2020 70%, transparent 100%)',
        clipPath: 'polygon(30% 0%, 70% 0%, 90% 40%, 60% 100%, 40% 100%, 10% 40%)',
        filter: 'drop-shadow(0 0 4px rgba(232,160,48,0.5))',
      }}
    />
  );
}

// ---- 纹章图标（纯CSS绘制） ----
const HEIRLOOM_ICONS: Record<string, { symbol: string; color: string }> = {
  bust:     { symbol: '♌', color: '#c8a030' },   // 雕像
  portrait: { symbol: '◈', color: '#a88830' },   // 画像
  deed:     { symbol: '▤', color: '#8a7028' },   // 契约
  crest:    { symbol: '✦', color: '#c8a030' },   // 纹章
};

// ---- 建筑导航图标（哥特字符） ----
const BUILDING_ICONS: Record<string, string> = {
  stagecoach: '♜',   // 驿站 — 车马
  nomad_wagon: '✦',  // 游商 — 星辰货郎
  tavern: '☠',       // 酒馆 — 骷髅
  abbey: '☩',        // 修道院 — 耶路撒冷十字
  blacksmith: '⚒',   // 铁匠 — 锤凿
  guild: '♛',        // 公会 — 王冠
  sanitarium: '✚',   // 疗养院 — 十字
};

// ---- 锁定符号（非 emoji） ----
function LockIcon() {
  return (
    <span className="text-dd-textDim text-xs" style={{ fontFamily: 'serif' }}>
      ☒
    </span>
  );
}

interface BuildingButtonProps {
  name: string;
  icon: string;
  unlockText: string;
  available: boolean;
  active: boolean;
  onClick?: () => void;
}

function BuildingButton({ name, icon, unlockText, available, active, onClick }: BuildingButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={clsx(
        'relative w-full flex flex-col items-center justify-center gap-1 py-2.5 px-1 border rounded-[2px] transition-all duration-150 overflow-hidden',
        'border-dd-border bg-gradient-to-b from-dd-surface2 to-dd-bg',
        !available && 'opacity-40 cursor-not-allowed',
        available && 'hover:border-dd-gold hover:shadow-dd-gold',
        active && '!border-dd-gold !shadow-dd-gold',
      )}
      style={{ minHeight: '86px' }}
    >
      {/* 顶部金线装饰 */}
      <span
        className="absolute top-0 left-3 right-3 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, #8a7028 30%, #8a7028 70%, transparent)' }}
      />
      {/* 图标 */}
      <span
        className={clsx(
          'text-lg leading-none',
          available ? 'text-dd-goldBright' : 'text-dd-textDim',
        )}
        style={{ fontFamily: 'serif' }}
      >
        {available ? icon : <LockIcon />}
      </span>
      {/* 建筑名 */}
      <span
        className={clsx(
          'font-dd text-[11px] uppercase tracking-wider leading-tight',
          available ? 'text-dd-textBright' : 'text-dd-textMuted',
        )}
      >
        {name}
      </span>
      {/* 解锁状态 */}
      <span className={clsx('text-[9px] leading-tight normal-case tracking-normal', available ? 'text-dd-textMuted' : 'text-dd-textDim')}>
        {available ? '已开放' : `未解锁 · ${unlockText}`}
      </span>
    </button>
  );
}

// 建筑按钮配置
const BUILDING_IDS: BuildingId[] = [
  'stagecoach',
  'nomad_wagon',
  'tavern',
  'abbey',
  'blacksmith',
  'guild',
  'sanitarium',
  'sanctum',
];

export default function TownHeader() {
  const week = useGameStore((s) => s.week);
  const gold = useGameStore((s) => s.gold);
  const heirlooms = useGameStore((s) => s.heirlooms);
  const questsFinished = useGameStore((s) => s.questsFinished);
  const setPhase = useGameStore((s) => s.setPhase);
  const rosterLength = useGameStore((s) => s.roster.length);

  const openBuilding = useTownStore((s) => s.openBuilding);
  const activeBuilding = useTownStore((s) => s.activeBuilding);
  const openDistricts = useTownStore((s) => s.openDistricts);
  const showDistricts = useTownStore((s) => s.showDistricts);
  const startWeekTransition = useWeekStore((s) => s.startWeekTransition);

  return (
    <div className="dd-panel mb-4">
      {/* 顶部资源栏 */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* 左侧资源 */}
        <div className="flex items-center gap-5">
          {/* 周数 — 大号金色Cinzel + 火把图标 */}
          <div className="flex items-center gap-2">
            <TorchIcon />
            <div className="flex flex-col items-center leading-none">
              <span className="text-[10px] text-dd-textMuted uppercase tracking-widest">第</span>
              <span className="font-dd text-2xl text-dd-gold dd-text-gold">{week}</span>
              <span className="text-[10px] text-dd-textMuted uppercase tracking-widest">周</span>
            </div>
          </div>

          {/* 竖分隔线 */}
          <div className="h-12 w-px bg-dd-border" />

          {/* 金币 */}
          <div className="flex flex-col leading-none">
            <span className="text-[10px] text-dd-textMuted uppercase tracking-widest mb-1">金币</span>
            <span className="font-mono text-lg text-dd-gold">
              {gold.toLocaleString()}
              <span className="text-dd-goldDark text-xs ml-0.5">g</span>
            </span>
          </div>

          {/* 竖分隔线 */}
          <div className="h-12 w-px bg-dd-border" />

          {/* 纹章 — dd-tag 风格 */}
          <div className="flex gap-2">
            {([
              { key: 'bust',     label: '雕像', value: heirlooms.bust },
              { key: 'portrait', label: '画像', value: heirlooms.portrait },
              { key: 'deed',     label: '契约', value: heirlooms.deed },
              { key: 'crest',    label: '纹章', value: heirlooms.crest },
            ] as const).map((item) => {
              const icon = HEIRLOOM_ICONS[item.key];
              return (
                <span key={item.key} className="dd-tag text-center px-2 py-1 leading-none">
                  <span
                    className="block text-sm leading-none"
                    style={{ color: icon.color, fontFamily: 'serif' }}
                  >
                    {icon.symbol}
                  </span>
                  <span className="block text-[9px] text-dd-textMuted mt-1 normal-case tracking-normal">
                    {item.label}
                  </span>
                  <span className="block font-mono text-xs text-dd-text mt-0.5">{item.value}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* 右侧：推进到下周 */}
        <button onClick={startWeekTransition} className="dd-btn-primary">
          推进到下周
          <span className="ml-1">→</span>
        </button>
      </div>

      {/* 分隔线 */}
      <div className="dd-divider mx-4" />

      {/* 建筑导航 */}
      <div className="p-3 grid grid-cols-4 sm:grid-cols-9 gap-2">
        {BUILDING_IDS.map((id) => {
          const info = BUILDING_INFO[id];
          const available = isBuildingUnlocked(id, questsFinished);
          return (
            <BuildingButton
              key={id}
              name={info.name}
              icon={BUILDING_ICONS[id] || info.icon}
              unlockText={info.unlockText}
              available={available}
              active={activeBuilding === id}
              onClick={() => available && openBuilding(id)}
            />
          );
        })}

        {/* 任务公告板按钮 */}
        <BuildingButton
          name="任务板"
          icon="◈"
          unlockText="始终可用"
          available={true}
          active={false}
          onClick={() => setPhase('quest_board')}
        />

        {/* 区域建筑按钮 */}
        <BuildingButton
          name="区域建筑"
          icon="♜"
          unlockText="完成 5 个任务"
          available={questsFinished >= 5}
          active={showDistricts}
          onClick={() => questsFinished >= 5 && openDistricts()}
        />

        {/* 出发按钮 */}
        <BuildingButton
          name="出发"
          icon="⚔"
          unlockText="需要英雄"
          available={rosterLength > 0}
          active={false}
          onClick={() => rosterLength > 0 && setPhase('dungeon_dispatch')}
        />

        {/* Mod 管理入口 */}
        <BuildingButton
          name="Mod 管理"
          icon="❖"
          unlockText="始终可用"
          available={true}
          active={activeBuilding === 'mod_manager'}
          onClick={() => openBuilding('mod_manager')}
        />
      </div>
    </div>
  );
}
