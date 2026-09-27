// 资产提取脚本 — 从游戏目录拷贝 UI 可用的图片资产到 public/assets/dd/
// 用法: node scripts/extract-dd-assets.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const DD_ROOT = 'E:\\SteamLibrary\\steamapps\\common\\DarkestDungeon';
const OUT_ROOT = path.join(APP_ROOT, 'public', 'assets', 'dd');

let copied = 0;
let skipped = 0;

async function copyFile(src, dest) {
  try {
    await fs.copyFile(src, dest);
    copied++;
  } catch {
    skipped++;
  }
}

async function copyIfNewer(src, dest) {
  try {
    const [s, d] = await Promise.all([fs.stat(src), fs.stat(dest).catch(() => null)]);
    if (d && d.mtimeMs >= s.mtimeMs) {
      skipped++;
      return;
    }
    await fs.copyFile(src, dest);
    copied++;
  } catch {
    skipped++;
  }
}

// 1. 英雄肖像: heroes/<class>/<class>_A/<class>_portrait_roster.png
async function extractHeroes() {
  const out = path.join(OUT_ROOT, 'heroes');
  await fs.mkdir(out, { recursive: true });
  const dirs = await fs.readdir(path.join(DD_ROOT, 'heroes')).catch(() => []);
  for (const cls of dirs) {
    const variant = path.join(DD_ROOT, 'heroes', cls, `${cls}_A`);
    const portrait = path.join(variant, `${cls}_portrait_roster.png`);
    try {
      await fs.access(portrait);
      await copyIfNewer(portrait, path.join(out, `${cls}.png`));
    } catch {
      // 无肖像的跳过
    }
  }
  console.log(`  + 英雄肖像: ${copied} 拷贝, ${skipped} 跳过`);
}

// 2. 怪物 tint 贴图: monsters/<id>/<id>_A/tint.png
async function extractMonsters() {
  const out = path.join(OUT_ROOT, 'monsters');
  await fs.mkdir(out, { recursive: true });
  const dirs = await fs.readdir(path.join(DD_ROOT, 'monsters')).catch(() => []);
  let before = copied;
  let beforeSkip = skipped;
  for (const id of dirs) {
    const variant = path.join(DD_ROOT, 'monsters', id, `${id}_A`);
    const tint = path.join(variant, 'tint.png');
    try {
      await fs.access(tint);
      await copyIfNewer(tint, path.join(out, `${id}.png`));
    } catch {
      // 无 tint 的跳过
    }
  }
  console.log(`  + 怪物贴图: ${copied - before} 拷贝, ${skipped - beforeSkip} 跳过`);
}

// 3. 区域地牢横幅: dungeons/<area>/<area>_background.png 之类
async function extractDungeons() {
  const out = path.join(OUT_ROOT, 'dungeons');
  await fs.mkdir(out, { recursive: true });
  const dirs = await fs.readdir(path.join(DD_ROOT, 'dungeons')).catch(() => []);
  let before = copied;
  let beforeSkip = skipped;
  for (const area of dirs) {
    const areaDir = path.join(DD_ROOT, 'dungeons', area);
    const entries = await fs.readdir(areaDir).catch(() => []);
    // 找包含 background/banner/floor 的 png
    const target = entries.find((f) => /background|banner|floor|room/i.test(f) && f.endsWith('.png'));
    if (target) {
      await copyIfNewer(path.join(areaDir, target), path.join(out, `${area}.png`));
    }
  }
  console.log(`  + 区域图: ${copied - before} 拷贝, ${skipped - beforeSkip} 跳过`);
}

// 4. 城镇建筑图: campaign/town/*.png
async function extractTown() {
  const out = path.join(OUT_ROOT, 'town');
  await fs.mkdir(out, { recursive: true });
  const townDir = path.join(DD_ROOT, 'campaign', 'town');
  const entries = await fs.readdir(townDir).catch(() => []);
  let before = copied;
  for (const f of entries.filter((f) => f.endsWith('.png'))) {
    await copyIfNewer(path.join(townDir, f), path.join(out, f));
  }
  console.log(`  + 城镇图: ${copied - before} 拷贝`);
}

// 5. 英雄技能图标: heroes/<class>/<class>.ability.one.png 等
async function extractAbilities() {
  const out = path.join(OUT_ROOT, 'abilities');
  await fs.mkdir(out, { recursive: true });
  const dirs = await fs.readdir(path.join(DD_ROOT, 'heroes')).catch(() => []);
  let before = copied;
  for (const cls of dirs) {
    const clsDir = path.join(DD_ROOT, 'heroes', cls);
    const entries = await fs.readdir(clsDir).catch(() => []);
    for (const f of entries.filter((f) => /ability\.(one|two|three|four|five|six|seven)\.png$/.test(f))) {
      await copyIfNewer(path.join(clsDir, f), path.join(out, `${cls}.${f}`));
    }
  }
  console.log(`  + 技能图标: ${copied - before} 拷贝`);
}

async function main() {
  console.log('=== 提取 DD 图片资产 ===');
  console.log(`数据源: ${DD_ROOT}`);
  await fs.mkdir(OUT_ROOT, { recursive: true });
  await extractHeroes();
  copied = 0; skipped = 0;
  await extractMonsters();
  copied = 0; skipped = 0;
  await extractDungeons();
  copied = 0; skipped = 0;
  await extractTown();
  copied = 0; skipped = 0;
  await extractAbilities();
  console.log(`完成 → ${OUT_ROOT}`);
}

main().catch((err) => {
  console.error('提取失败:', err);
  process.exit(1);
});
