// 饰品装备对话框 — 独立可复用（英雄+槽位+饰品列表）
import { useMemo, useState } from 'react';
import { AppDialog } from './AppDialog';
import { Button } from '@/ui/Button';
import { useInventoryStore } from '@/stores/inventoryStore';
import { getHeroName, getSkillName } from '@/data/ddLoader';
import type { HeroInstance, TrinketEntry } from '@/types';

interface TrinketEquipDialogProps {
  hero: HeroInstance | null;
  onClose: () => void;
}

export function TrinketEquipDialog({ hero, onClose }: TrinketEquipDialogProps) {
  const trinkets = useInventoryStore((s) => s.trinketInventory);
  const equipTrinket = useInventoryStore((s) => s.equipTrinket);
  const unequipTrinket = useInventoryStore((s) => s.unequipTrinket);
  const [slot, setSlot] = useState<1 | 2>(1);
  const [message, setMessage] = useState('');

  const eligible = useMemo(
    () => trinkets.filter((t) =>
      t.heroClassRequirements.length === 0 || t.heroClassRequirements.includes(hero?.classId ?? '')
    ),
    [trinkets, hero]
  );

  if (!hero) return null;

  const equippedInSlot = slot === 1 ? hero.trinket1 : hero.trinket2;
  const otherSlot = slot === 1 ? hero.trinket2 : hero.trinket1;

  const handleEquip = (t: TrinketEntry) => {
    if (t.id === otherSlot) {
      setMessage('该饰品已装备在另一槽位');
      return;
    }
    const result = equipTrinket(hero.uid, t.id, slot);
    setMessage(result.success ? `已装备：${t.id}` : result.reason || '装备失败');
  };

  const handleUnequip = () => {
    unequipTrinket(hero.uid, slot);
    setMessage('已卸下');
  };

  return (
    <AppDialog
      open
      title={`饰品装备 — ${getHeroName(hero.classId)} ${hero.name}`}
      onClose={onClose}
      width="max-w-2xl"
    >
      <div className="space-y-3">
        {/* 槽位切换 */}
        <div className="flex gap-2">
          {[1, 2].map((s) => {
            const equipped = s === 1 ? hero.trinket1 : hero.trinket2;
            return (
              <button
                key={s}
                onClick={() => { setSlot(s as 1 | 2); setMessage(''); }}
                className={`px-3 py-1.5 text-xs tracking-wider border rounded-sm transition-colors ${
                  slot === s
                    ? 'text-dd-gold border-dd-gold'
                    : 'text-dd-textMuted border-dd-textMuted/30'
                }`}
              >
                槽位 {s}{equipped ? `：${equipped}` : '（空）'}
              </button>
            );
          })}
        </div>

        {equippedInSlot && (
          <div className="flex items-center gap-2 text-xs bg-black/20 border border-dd-gold/10 rounded-sm px-2 py-1.5">
            <span className="text-dd-textDim">当前装备：</span>
            <span className="text-dd-gold">{equippedInSlot}</span>
            <Button size="sm" variant="ghost" onClick={handleUnequip}>卸下</Button>
          </div>
        )}

        {message && <div className="text-xs text-dd-gold">{message}</div>}

        {/* 可选饰品列表 */}
        <div>
          <div className="text-[10px] text-dd-textDim mb-1.5">
            可用饰品（{eligible.length}）— 仅显示无职业限制或本职业可用的
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {eligible.length === 0 && (
              <div className="text-dd-textDim text-xs py-4 text-center">背包中没有可装备的饰品</div>
            )}
            {eligible.map((t) => (
              <button
                key={t.id}
                onClick={() => handleEquip(t)}
                className="w-full text-left px-2 py-1.5 bg-black/20 hover:bg-black/40 border border-dd-gold/10 rounded-sm text-xs flex justify-between items-center gap-2"
              >
                <span className="text-dd-text truncate">{getSkillName(t.id)}</span>
                <span className="shrink-0 text-[10px] text-dd-textDim">
                  {t.rarity} · {t.price}g
                  {t.heroClassRequirements.length > 0 && ` · ${t.heroClassRequirements.map(getHeroName).join('/')}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppDialog>
  );
}
