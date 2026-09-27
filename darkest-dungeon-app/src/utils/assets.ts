// 游戏资产路径工具 — 从 public/assets/dd 引用提取的图片
export function heroPortrait(classId: string): string {
  return `/assets/dd/heroes/${classId}.png`;
}

export function monsterSprite(monsterId: string): string {
  return `/assets/dd/monsters/${monsterId}.png`;
}

export function dungeonArt(areaId: string): string {
  return `/assets/dd/dungeons/${areaId}.png`;
}

export function townArt(name: string): string {
  return `/assets/dd/town/${name}`;
}

export function abilityIcon(classId: string, slot: string): string {
  return `/assets/dd/abilities/${classId}.ability.${slot}.png`;
}

// 图片可用性探测（找不到时 UI 回退）
export function assetExists(p: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = p;
  });
}
