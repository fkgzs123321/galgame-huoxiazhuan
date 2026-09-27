// mod 索引生成器 — 扫描 mods 目录,生成 mod_index.json + 拷贝 mod 英雄肖像
// 用法: node scripts/extract-mod-index.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const DD_ROOT = 'E:\\SteamLibrary\\steamapps\\common\\DarkestDungeon';
const MODS_DIR = path.join(DD_ROOT, 'mods');
const DLC_DIR = path.join(DD_ROOT, 'dlc');
const OUT_DIR = path.join(APP_ROOT, 'src', 'data', 'dd-db');
const PORTRAIT_DIR = path.join(APP_ROOT, 'public', 'assets', 'dd', 'modheroes');

const NSFW_HINTS = ['nsfw', 'nude', 'naked', 'uncensored', 'xxx', 'lewd', '18'];

function isNsfw(name) {
  return NSFW_HINTS.some((h) => name.toLowerCase().includes(h));
}

async function scanDir(dir, source, index) {
  const dirs = await fs.readdir(dir).catch(() => []);
  for (const modName of dirs) {
    const modPath = path.join(dir, modName);
    const stat = await fs.stat(modPath).catch(() => null);
    if (!stat || !stat.isDirectory()) continue;
    if (modName.startsWith('【')) continue; // 说明文档

    // 统计英雄数(heroes/ 下子目录或 <class>/<class>_A 结构)
    const heroesDir = path.join(modPath, 'heroes');
    let heroCount = 0;
    const heroClasses = [];
    const heroDirs = await fs.readdir(heroesDir).catch(() => []);
    for (const h of heroDirs) {
      const hPath = path.join(heroesDir, h);
      if ((await fs.stat(hPath).catch(() => null))?.isDirectory()) {
        heroCount++;
        heroClasses.push(h);
        // 拷贝肖像: <class>/<class>_A/<class>_portrait_roster.png 或 <class>/<class>_portrait_roster.png
        const candidates = [
          path.join(hPath, `${h}_A`, `${h}_portrait_roster.png`),
          path.join(hPath, `${h}_portrait_roster.png`),
        ];
        for (const c of candidates) {
          try {
            await fs.access(c);
            const out = path.join(PORTRAIT_DIR, `${h}.png`);
            await fs.copyFile(c, out);
            break;
          } catch { /* 跳过 */ }
        }
      }
    }

    // 统计怪物数
    const monstersDir = path.join(modPath, 'monsters');
    let monsterCount = 0;
    const monsterDirs = await fs.readdir(monstersDir).catch(() => []);
    for (const m of monsterDirs) {
      if ((await fs.stat(path.join(monstersDir, m)).catch(() => null))?.isDirectory()) {
        monsterCount++;
      }
    }

    // 统计文件数
    let fileCount = 0;
    const countFiles = async (dir) => {
      const entries = await fs.readdir(dir).catch(() => []);
      for (const e of entries) {
        const p = path.join(dir, e);
        const st = await fs.stat(p).catch(() => null);
        if (!st) continue;
        if (st.isDirectory()) await countFiles(p);
        else fileCount++;
      }
    };
    await countFiles(modPath);

    if (heroCount === 0 && monsterCount === 0 && fileCount === 0) continue;

    index.push({
      name: modName,
      source,
      heroCount,
      monsterCount,
      heroClasses,
      fileCount,
      nsfw: isNsfw(modName),
    });
  }
}

async function main() {
  await fs.mkdir(PORTRAIT_DIR, { recursive: true });
  const index = [];
  await scanDir(MODS_DIR, 'mods', index);
  await scanDir(DLC_DIR, 'dlc', index);

  index.sort((a, b) => b.heroCount + b.monsterCount - (a.heroCount + a.monsterCount));
  const out = {
    source: 'DarkestDungeon/mods + dlc 目录扫描',
    total: index.length,
    mods: index,
  };
  await fs.writeFile(path.join(OUT_DIR, 'mod_index.json'), JSON.stringify(out, null, 2), 'utf8');
  const mods = index.filter((m) => m.source === 'mods').length;
  console.log(`已生成 mod_index.json: ${index.length} 项（mods ${mods} + dlc ${index.length - mods}）, ${index.reduce((s, m) => s + m.heroCount, 0)} 英雄, ${index.reduce((s, m) => s + m.monsterCount, 0)} 怪物`);
}

main().catch((e) => { console.error(e); process.exit(1); });
