// 庄园中枢导航 — 主游玩窗口（分组卡片式入口）
import { useNavigate } from 'react-router-dom';
import { Panel, PanelHeader } from '@/ui';
import clsx from 'clsx';

interface HubItem {
  to: string;
  label: string;
  icon: string;
  desc: string;
}

interface HubGroup {
  title: string;
  icon: string;
  items: HubItem[];
}

const HUB: HubGroup[] = [
  {
    title: '出发冒险',
    icon: '⚔',
    items: [
      { to: '/arena', label: '斗技场', icon: '⚔', desc: '连胜挑战，奖金递增' },
      { to: '/farmstead', label: '磨坊农场', icon: '🌾', desc: '无尽波次生存' },
      { to: '/crimson', label: '猩红庭院', icon: '🩸', desc: '血裔远征，猎取血酒' },
      { to: '/quests', label: '编年史', icon: '📜', desc: '每周大事时间线' },
      { to: '/summary', label: '战役概览', icon: '◆', desc: '统计与 AI 摘要' },
    ],
  },
  {
    title: '庄园事务',
    icon: '🏰',
    items: [
      { to: '/roster', label: '名册管理', icon: '👥', desc: '英雄档案/怪癖/开除' },
      { to: '/saves', label: '存档管理', icon: '💾', desc: '三槽位/导出/备份' },
      { to: '/settings', label: '设置', icon: '⚙', desc: 'AI/难度/规则/DLC' },
    ],
  },
  {
    title: '知识典籍',
    icon: '📖',
    items: [
      { to: '/bestiary', label: '怪物图鉴', icon: '👹', desc: '254 种怪物数据' },
      { to: '/trinkets', label: '饰品图鉴', icon: '💎', desc: '490 件饰品全览' },
      { to: '/canon', label: '原著指导', icon: '📚', desc: '区域/势力/古神' },
      { to: '/mods', label: '模组库', icon: '🧩', desc: '99 个模组索引' },
      { to: '/behavior', label: '行为分析', icon: '🧠', desc: '英雄心理画像' },
      { to: '/plot', label: '剧情演化', icon: '✦', desc: '导演生成周事件' },
    ],
  },
  {
    title: '创作者工具',
    icon: '🛠',
    items: [
      { to: '/prompts', label: '预设管理', icon: '✎', desc: '提示词编辑与预览' },
      { to: '/worldbook', label: '世界书', icon: '📔', desc: '条目/注入/AI 生成' },
      { to: '/logs', label: '日志中心', icon: '☰', desc: '事件流与导出' },
      { to: '/llm-debug', label: 'LLM 调试台', icon: '🔍', desc: 'Prompt/Lore Trace' },
    ],
  },
];

export function HubNav() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {HUB.map((g) => (
        <Panel key={g.title}>
          <PanelHeader title={`${g.icon} ${g.title}`} />
          <div className="p-2 space-y-1">
            {g.items.map((item) => (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-sm border transition-colors group',
                  'border-dd-gold/10 hover:border-dd-gold/50 hover:bg-dd-gold/5'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs tracking-wider text-dd-text group-hover:text-dd-gold">
                    {item.label}
                  </span>
                  <span className="ml-auto text-[10px] text-dd-textDim">{item.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
