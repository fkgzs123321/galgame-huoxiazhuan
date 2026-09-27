import { useState } from 'react';
import clsx from 'clsx';
import { useGameStore } from '@/stores/gameStore';
import { useAiStore } from '@/stores/aiStore';
import AiSettingsModal from '@/components/AiSettingsModal';

export default function StatusBar() {
  const week = useGameStore((s) => s.week);
  const gold = useGameStore((s) => s.gold);
  const phase = useGameStore((s) => s.phase);
  const rosterSize = useGameStore((s) => s.roster.length);
  const aiEnabled = useAiStore((s) => s.config.enabled);
  const [showAiSettings, setShowAiSettings] = useState(false);

  const phaseLabel = {
    town: '城镇',
    dungeon: '地牢',
    dungeon_dispatch: '出征',
    week_transition: '周结算',
    battle_setup: '战斗配置',
    battle: '战斗中',
    quest_board: '任务板',
  }[phase];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#0d0a07] border-t-2 border-dd-borderGold px-4 py-2 flex items-center justify-between text-xs text-dd-textMuted z-50">
      <div className="flex items-center gap-3">
        <span className="text-dd-gold font-dd tracking-widest">◆ 暗黑地牢</span>
        <span className="text-dd-borderGold">✦</span>
        <span>阶段: {phaseLabel}</span>
        <span className="text-dd-gold">◆</span>
        <span>
          第 <span className="text-dd-gold font-mono">{week}</span> 周
        </span>
        <span className="text-dd-gold">◆</span>
        <span>
          英雄: <span className="text-dd-gold font-mono">{rosterSize}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span>金币: </span>
        <span className="text-dd-gold font-mono">{gold.toLocaleString()}</span>
        <span className="text-dd-gold">◆</span>
        <button
          onClick={() => setShowAiSettings(true)}
          className={clsx(
            'dd-btn !py-0.5 !px-2 text-[10px]',
            aiEnabled ? 'border-dd-gold text-dd-gold' : ''
          )}
          title="AI 旁白叙事设置"
        >
          {aiEnabled ? '✦ AI 旁白' : '✦ AI 设置'}
        </button>
      </div>
      {showAiSettings && <AiSettingsModal onClose={() => setShowAiSettings(false)} />}
    </footer>
  );
}
