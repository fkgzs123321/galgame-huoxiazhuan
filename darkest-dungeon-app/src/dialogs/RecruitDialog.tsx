// 招募确认对话框 — 英雄预览 + 确认招募（对齐凡人 RecruitDialog）
import { AppDialog } from './AppDialog';
import { Button } from '@/ui/Button';
import { getHeroName } from '@/data/ddLoader';
import type { HeroInstance } from '@/types';
import clsx from 'clsx';

interface RecruitDialogProps {
  hero: HeroInstance | null;
  cost: number;
  gold: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RecruitDialog({ hero, cost, gold, onConfirm, onCancel }: RecruitDialogProps) {
  const open = hero !== null;
  const canAfford = gold >= cost;

  return (
    <AppDialog
      open={open}
      title={`招募：${hero ? getHeroName(hero.classId) : ''}`}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>再想想</Button>
          <Button variant="primary" disabled={!canAfford} onClick={onConfirm}>
            {canAfford ? `招募（${cost.toLocaleString()}g）` : '金币不足'}
          </Button>
        </div>
      }
    >
      {hero && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <img src={`/assets/dd/heroes/${hero.classId}.png`} alt="" className="w-14 h-14 object-cover rounded-sm border border-dd-gold/30 bg-black/40" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className={clsx('font-dd text-lg text-dd-gold', `class-${hero.classId}`)}>
              {getHeroName(hero.classId)} <span className="text-sm text-dd-text">· {hero.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-black/20 border border-dd-gold/10 rounded-sm px-2 py-1">
              <span className="text-dd-textDim">等级 </span>
              <span className="text-dd-text">{hero.resolveLevel}</span>
            </div>
            <div className="bg-black/20 border border-dd-gold/10 rounded-sm px-2 py-1">
              <span className="text-dd-textDim">生命 </span>
              <span className="text-dd-text font-mono">{hero.currentHp}/{hero.maxHp}</span>
            </div>
            <div className="bg-black/20 border border-dd-gold/10 rounded-sm px-2 py-1">
              <span className="text-dd-textDim">压力 </span>
              <span className="text-dd-text font-mono">{hero.stress}</span>
            </div>
            <div className="bg-black/20 border border-dd-gold/10 rounded-sm px-2 py-1">
              <span className="text-dd-textDim">费用 </span>
              <span className={canAfford ? 'text-dd-gold font-mono' : 'text-red-400 font-mono'}>
                {cost.toLocaleString()}g
              </span>
            </div>
          </div>

          {hero.quirks.length > 0 && (
            <div>
              <div className="text-[10px] text-dd-textDim mb-1">怪癖</div>
              <div className="flex flex-wrap gap-1">
                {hero.quirks.map((q) => (
                  <span key={q} className="dd-tag text-[10px] text-dd-textMuted">{q}</span>
                ))}
              </div>
            </div>
          )}

          {hero.diseases.length > 0 && (
            <div className="text-xs text-red-400">患有 {hero.diseases.length} 种疾病</div>
          )}
        </div>
      )}
    </AppDialog>
  );
}
