// ============================================================
// 建筑面板容器 — 根据当前选中建筑显示对应组件
// ============================================================
import type { ComponentType } from 'react';
import { useTownStore, BUILDING_INFO } from '@/stores/townStore';
import { useGameStore } from '@/stores/gameStore';
import type { BuildingId } from '@/types';
import Stagecoach from './buildings/Stagecoach';
import NomadWagon from './buildings/NomadWagon';
import Tavern from './buildings/Tavern';
import Abbey from './buildings/Abbey';
import Blacksmith from './buildings/Blacksmith';
import Guild from './buildings/Guild';
import Sanitarium from './buildings/Sanitarium';
import Sanctum from './buildings/Sanctum';

// 建筑组件映射
const BUILDING_COMPONENTS: Record<BuildingId, ComponentType> = {
  stagecoach: Stagecoach,
  nomad_wagon: NomadWagon,
  tavern: Tavern,
  abbey: Abbey,
  blacksmith: Blacksmith,
  guild: Guild,
  sanitarium: Sanitarium,
  mod_manager: () => null,
  sanctum: Sanctum,
};

// 建筑图标（与城镇导航一致）
const BUILDING_ICONS: Record<string, string> = {
  stagecoach: '♜',
  nomad_wagon: '✦',
  tavern: '☠',
  abbey: '☩',
  blacksmith: '⚒',
  guild: '♛',
  sanitarium: '✚',
};

export default function BuildingPanel() {
  const activeBuilding = useTownStore((s) => s.activeBuilding);
  const closeBuilding = useTownStore((s) => s.closeBuilding);
  const gold = useGameStore((s) => s.gold);
  const crests = useGameStore((s) => s.heirlooms.crest);

  if (!activeBuilding) return null;

  const info = BUILDING_INFO[activeBuilding];
  const BuildingComponent = BUILDING_COMPONENTS[activeBuilding];

  return (
    <div className="dd-panel">
      {/* 建筑头部 */}
      <div className="dd-panel-header flex items-center justify-between">
        <div className="flex items-baseline gap-3 normal-case">
          <span className="text-lg leading-none text-dd-goldBright" style={{ fontFamily: 'serif' }}>
            {BUILDING_ICONS[activeBuilding] || info.icon}
          </span>
          <span
            className="dd-title text-lg text-dd-gold leading-none"
            style={{ letterSpacing: '0.12em' }}
          >
            {info.name}
          </span>
        </div>
        <div className="flex items-center gap-2 normal-case">
          {/* 金币余额 */}
          <span className="dd-tag text-xs leading-none">
            金币 <span className="font-mono text-dd-gold">{gold.toLocaleString()}g</span>
          </span>
          {/* 纹章余额 */}
          <span className="dd-tag text-xs leading-none">
            纹章 <span className="font-mono text-dd-text">{crests}</span>
          </span>
          {/* 返回按钮 */}
          <button
            onClick={closeBuilding}
            className="dd-btn text-xs"
          >
            ← 返回城镇
          </button>
        </div>
      </div>

      {/* 建筑内容 */}
      <div className="p-4">
        <BuildingComponent />
      </div>
    </div>
  );
}
