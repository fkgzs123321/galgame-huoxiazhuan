// 任务接取确认对话框（对齐凡人 QuestAcceptDialog）
import { AppDialog } from './AppDialog';
import { Button } from '@/ui/Button';
import type { Quest } from '@/types';

interface QuestAcceptDialogProps {
  quest: Quest | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  explore: '探索', exterminate: '清剿', purge: '净化',
  collect: '收集', boss: '讨伐', escape: '撤离',
};

const DIFF_LABEL: Record<string, string> = {
  novice: '学徒级', veteran: '老兵级', champion: '冠军级',
};

export function QuestAcceptDialog({ quest, onConfirm, onCancel }: QuestAcceptDialogProps) {
  const open = quest !== null;

  return (
    <AppDialog
      open={open}
      title={quest ? `接取任务：${quest.description.slice(0, 24)}` : '接取任务'}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>放弃</Button>
          <Button variant="primary" onClick={onConfirm}>接取</Button>
        </div>
      }
    >
      {quest && (
        <div className="space-y-3 text-sm">
          <div className="flex gap-2 flex-wrap">
            <span className="dd-tag text-xs text-dd-gold">{DIFF_LABEL[quest.difficulty] ?? quest.difficulty}</span>
            <span className="dd-tag text-xs text-dd-textMuted">{TYPE_LABEL[quest.type] ?? quest.type}</span>
            <span className="dd-tag text-xs text-dd-textMuted">地牢等级 {quest.dungeonLevel}</span>
          </div>

          <div className="text-dd-text leading-relaxed">{quest.description}</div>

          <div className="bg-black/20 border border-dd-gold/10 rounded-sm p-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-dd-textDim">任务目标</span>
              <span className="text-dd-text">{quest.goal.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dd-textDim">金币奖励</span>
              <span className="text-dd-gold font-mono">{quest.rewardGold.toLocaleString()}</span>
            </div>
            {quest.rewardHeirlooms.length > 0 && (
              <div className="flex justify-between">
                <span className="text-dd-textDim">纹章奖励</span>
                <span className="text-dd-text">
                  {quest.rewardHeirlooms.map((h) => `${h.type}×${h.amount}`).join(' ')}
                </span>
              </div>
            )}
            {quest.rewardTrinket && (
              <div className="flex justify-between">
                <span className="text-dd-textDim">饰品奖励</span>
                <span className="text-dd-gold">{quest.rewardTrinket}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-dd-textDim">补给上限</span>
              <span className="text-dd-text">{quest.provisionLimit}</span>
            </div>
          </div>

          <p className="text-[10px] text-dd-textDim">
            接取后任务计入本周目标，完成后在周结算获得奖励。队伍可从名册中选择最多 4 名英雄出发。
          </p>
        </div>
      )}
    </AppDialog>
  );
}
