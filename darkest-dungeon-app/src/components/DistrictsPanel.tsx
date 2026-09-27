// ============================================================
// 区域建筑面板 — DLC 区域建筑（市政厅 / 银行 / 风车 / 铸造厂等）
// 基于 districts.json 数据，展示建筑卡片与建造操作
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { loadDistricts } from '@/data/ddLoader';
import type { DistrictBuilding } from '@/types';
import clsx from 'clsx';

// ---- 建筑中文名映射 ----

const DISTRICT_NAMES: Record<string, string> = {
  spire_of_hope: '希望之塔',
  bank: '银行',
  illuminators_guild: '照明者行会',
  granary: '粮仓',
  buskers_corner: '街头艺人角',
  house_of_the_yellow_hand: '黄手之家',
  altar_of_light: '光明祭坛',
  training_ring: '训练场',
  library: '图书馆',
  theater: '剧院',
  outsiders_bonfire: '异乡人篝火',
  the_mill: '风车',
  geologic_studyhall: '地质讲堂',
  tainted_well: '腐化之井',
  miasmal_orchard: '瘴气果园',
};

// ---- 建筑描述（中文） ----

const DISTRICT_DESCS: Record<string, string> = {
  spire_of_hope: '宏伟的希望之塔，提升庄园的威望与声望。',
  bank: '存放金币并生息，每周按 5% 结算利息。',
  illuminators_guild: '照明者行会，黑暗中的火把永不熄灭。',
  granary: '粮仓满溢，每日补给与口粮更加充裕。',
  buskers_corner: '街头艺人聚集之地，抚慰疲惫的心灵。',
  house_of_the_yellow_hand: '黄手之家的杀手，精通致命的技艺。',
  altar_of_light: '光明祭坛，虔诚者在此获得神启。',
  training_ring: '训练场，磨砺战斗技艺与体魄。',
  library: '图书馆，蕴含古老知识的殿堂。',
  theater: '剧院，上演悲欢离合的剧目。',
  outsiders_bonfire: '异乡人围绕的篝火，营地中的温暖庇护。',
  the_mill: '风车转动，消除探索中的饥饿诅咒。',
  geologic_studyhall: '地质讲堂，研究来自地下的宝石。',
  tainted_well: '受污染的井水，反而能净化圣水与鸦片。',
  miasmal_orchard: '瘴气弥漫的果园，培育出奇特的草药。',
};

// ---- 建筑图标（哥特字符，非 emoji） ----

const DISTRICT_ICONS: Record<string, string> = {
  spire_of_hope: '♜',
  bank: '♛',
  illuminators_guild: '▲',
  granary: '◆',
  buskers_corner: '♪',
  house_of_the_yellow_hand: '⚔',
  altar_of_light: '☩',
  training_ring: '☉',
  library: '◈',
  theater: '☨',
  outsiders_bonfire: '☀',
  the_mill: '☷',
  geologic_studyhall: '◉',
  tainted_well: '☿',
  miasmal_orchard: '✿',
};

// ---- 资源类型中文名 ----

function getCurrencyName(type: string): string {
  switch (type) {
    case 'gold':
      return '金币';
    case 'bust':
      return '雕像';
    case 'portrait':
      return '画像';
    case 'deed':
      return '契约';
    case 'crest':
      return '纹章';
    case 'blueprint':
      return '蓝图';
    case 'memory':
      return '记忆';
    case 'shard':
      return '晶体';
    default:
      return type;
  }
}

// ---- DLC 标记 ----

function getDlcLabel(dlc: string): string {
  switch (dlc) {
    case 'crimson_court':
      return '绯红庭院';
    case 'color_of_madness':
      return '疯狂色域';
    case 'farmstead':
      return '农场';
    case 'stygian':
      return '冥河';
    default:
      return dlc;
  }
}

// ---- 建筑卡片 ----

function DistrictCard({
  district,
  built,
  canAfford,
  onBuild,
}: {
  district: DistrictBuilding;
  built: boolean;
  canAfford: boolean;
  onBuild: () => void;
}) {
  const name = DISTRICT_NAMES[district.name] || district.name;
  const desc = DISTRICT_DESCS[district.name] || '一座具备特殊功能的区域建筑。';
  const icon = DISTRICT_ICONS[district.name] || '◈';
  const costs = district.currency_cost || [];

  return (
    <div
      className={clsx(
        'dd-panel p-3',
        built && 'border-dd-green'
      )}
    >
      {/* 顶部：图标 + 名称 + DLC */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={clsx('text-xl leading-none w-7 text-center', built ? 'text-dd-greenBright' : 'text-dd-goldBright')}
          style={{ fontFamily: 'serif' }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className={clsx('font-dd text-sm', built ? 'text-dd-greenBright' : 'text-dd-textBright')}>
            {name}
          </div>
          <div className="text-[10px] text-dd-textMuted">
            {getDlcLabel(district.dlc || '')}
          </div>
        </div>
        {/* 建造状态标记 */}
        {built ? (
          <span className="dd-tag dd-tag-positive text-[10px] leading-none px-1.5 py-0.5">
            ✓ 已建造
          </span>
        ) : (
          <span className="dd-tag text-[10px] leading-none px-1.5 py-0.5">
            未建造
          </span>
        )}
      </div>

      {/* 描述 */}
      <p className="text-[11px] text-dd-textMuted leading-snug mb-2">
        {desc}
      </p>

      {/* 所需资源 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {costs.map((c, idx) => (
          <span key={idx} className="dd-tag text-[10px] leading-none">
            {getCurrencyName(c.type)} {c.amount}
          </span>
        ))}
        {costs.length === 0 && (
          <span className="text-[10px] text-dd-textDim">无需资源</span>
        )}
      </div>

      {/* 建造按钮 */}
      {!built && (
        <button
          onClick={onBuild}
          disabled={!canAfford}
          className={clsx(
            'w-full py-1.5 rounded-sm border text-sm font-dd transition-all duration-150',
            canAfford
              ? 'border-dd-gold bg-dd-surface2 text-dd-gold hover:bg-dd-surface3 shadow-dd-gold'
              : 'border-dd-border bg-dd-surface text-dd-textDim cursor-not-allowed opacity-50'
          )}
        >
          建造
        </button>
      )}
      {!built && costs.length > 0 && (
        <div className="mt-1 text-center text-[10px] text-dd-textDim">
          需 {costs.length} 项资源
        </div>
      )}
    </div>
  );
}

// ---- 主面板 ----

export default function DistrictsPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const gold = useGameStore((s) => s.gold);
  const heirlooms = useGameStore((s) => s.heirlooms);
  const spendGold = useGameStore((s) => s.spendGold);
  const addHeirloom = useGameStore((s) => s.addHeirloom);

  const [districts, setDistricts] = useState<DistrictBuilding[]>([]);
  const [builtMap, setBuiltMap] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // 加载区域建筑数据
  useEffect(() => {
    loadDistricts().then((data) => {
      setDistricts(data);
      // 从本地存储恢复建造状态
      try {
        const saved = localStorage.getItem('dd-districts-built');
        if (saved) setBuiltMap(JSON.parse(saved));
      } catch {
        // 忽略解析错误
      }
      setLoading(false);
    });
  }, []);

  // 检查资源是否足够
  const checkAffordable = (district: DistrictBuilding): boolean => {
    const costs = district.currency_cost || [];
    for (const c of costs) {
      if (c.type === 'gold') {
        if (gold < c.amount) return false;
      } else if (c.type === 'bust' || c.type === 'portrait' || c.type === 'deed' || c.type === 'crest') {
        if (heirlooms[c.type] < c.amount) return false;
      }
      // 蓝图/记忆/晶体等特殊资源：暂视为可建造（或忽略）
    }
    return true;
  };

  // 建造建筑
  const handleBuild = (district: DistrictBuilding) => {
    if (builtMap[district.name]) return;
    if (!checkAffordable(district)) return;

    const costs = district.currency_cost || [];
    for (const c of costs) {
      if (c.type === 'gold') {
        spendGold(c.amount);
      } else if (c.type === 'bust' || c.type === 'portrait' || c.type === 'deed' || c.type === 'crest') {
        addHeirloom(c.type, -c.amount);
      }
    }

    const next = { ...builtMap, [district.name]: true };
    setBuiltMap(next);
    try {
      localStorage.setItem('dd-districts-built', JSON.stringify(next));
    } catch {
      // 忽略存储错误
    }

    const name = DISTRICT_NAMES[district.name] || district.name;
    setMessage(`「${name}」已建成。`);
    setTimeout(() => setMessage(''), 3000);
  };

  // 统计
  const builtCount = districts.filter((d) => builtMap[d.name]).length;

  if (loading) {
    return (
      <div className="dd-panel p-8 text-center text-dd-textMuted">
        正在读取区域建筑档案…
      </div>
    );
  }

  return (
    <div className="dd-panel">
      {/* 头部 */}
      <div className="dd-panel-header flex items-center justify-between">
        <span>◆ 区域建筑</span>
        <div className="flex items-center gap-3 normal-case">
          <span className="text-[10px] text-dd-textMuted">
            已建造 {builtCount} / {districts.length}
          </span>
          <button
            onClick={onClose}
            className="text-xs px-2 py-0.5 rounded-sm border border-dd-border text-dd-textMuted hover:bg-dd-surface2"
          >
            返回
          </button>
        </div>
      </div>

      {/* 资源栏 */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-dd-border">
        <span className="text-xs text-dd-textMuted">当前资源:</span>
        <span className="font-mono text-sm text-dd-gold">{gold.toLocaleString()} 金币</span>
        <span className="font-mono text-sm text-dd-text">雕像 {heirlooms.bust}</span>
        <span className="font-mono text-sm text-dd-text">画像 {heirlooms.portrait}</span>
        <span className="font-mono text-sm text-dd-text">契约 {heirlooms.deed}</span>
        <span className="font-mono text-sm text-dd-text">纹章 {heirlooms.crest}</span>
      </div>

      {/* 建造消息 */}
      {message && (
        <div className="px-3 py-2 text-xs text-dd-gold flex items-center gap-2">
          <span>{message}</span>
        </div>
      )}

      {/* 建筑卡片网格 */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {districts.map((district) => (
          <DistrictCard
            key={district.name}
            district={district}
            built={!!builtMap[district.name]}
            canAfford={checkAffordable(district)}
            onBuild={() => handleBuild(district)}
          />
        ))}
        {districts.length === 0 && (
          <div className="col-span-full text-center py-10 text-dd-textMuted text-sm">
            暂无区域建筑数据
          </div>
        )}
      </div>
    </div>
  );
}