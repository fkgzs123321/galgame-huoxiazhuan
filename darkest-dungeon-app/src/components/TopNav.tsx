// 顶层导航栏 — 分组导航（玩法/资料/管理）
import { NavLink } from 'react-router-dom';

interface NavGroup {
  title: string;
  items: { to: string; label: string; end?: boolean }[];
}

const GROUPS: NavGroup[] = [
  {
    title: '玩法',
    items: [
      { to: '/', label: '庄园', end: true },
      { to: '/arena', label: '斗技场' },
      { to: '/farmstead', label: '农场' },
      { to: '/crimson', label: '庭院' },
    ],
  },
  {
    title: '资料',
    items: [
      { to: '/bestiary', label: '怪物图鉴' },
      { to: '/trinkets', label: '饰品图鉴' },
      { to: '/canon', label: '原著' },
      { to: '/mods', label: '模组' },
      { to: '/behavior', label: '行为分析' },
    ],
  },
  {
    title: '管理',
    items: [
      { to: '/roster', label: '名册' },
      { to: '/quests', label: '编年史' },
      { to: '/summary', label: '摘要' },
      { to: '/plot', label: '剧情演化' },
      { to: '/prompts', label: '预设' },
      { to: '/worldbook', label: '世界书' },
      { to: '/saves', label: '存档' },
      { to: '/settings', label: '设置' },
      { to: '/logs', label: '日志' },
      { to: '/llm-debug', label: '调试' },
    ],
  },
];

export function TopNav() {
  return (
    <nav className="flex flex-wrap justify-center items-start gap-x-5 gap-y-1 mb-3 px-2">
      {GROUPS.map((g) => (
        <div key={g.title} className="flex flex-wrap items-center gap-x-0.5 gap-y-0.5">
          <span className="text-[9px] tracking-widest text-dd-textDim mr-1 self-center">{g.title}</span>
          {g.items.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-2 py-0.5 text-[11px] tracking-wider border-b-2 transition-colors ${
                  isActive
                    ? 'text-dd-gold border-dd-gold'
                    : 'text-dd-textMuted border-transparent hover:text-dd-text'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
