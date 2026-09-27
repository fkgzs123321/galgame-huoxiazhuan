// mod 数据提取 — 把 mods/+dlc/ 的怪物与饰品并入可玩数据池（英雄暂不处理）
// 用法: node scripts/extract-mod-data.mjs
import { promises as fs } from 'fs';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const DD_ROOT = 'E:\\SteamLibrary\\steamapps\\common\\DarkestDungeon';
const OUT_DIR = path.join(APP_ROOT, 'src', 'data', 'dd-db');
const SCAN_ROOTS = ['mods', 'dlc'];

// ---- 辅助解析（与 extract-dd-data-v3.mjs 同构） ----

function parseProperties(line) {
  const result = {};
  const regex = /\.(\w+)\s+("[^"]*"|~?[\w@%./-]+)/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    const key = match[1];
    let val = match[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (typeof val === 'string' && val.endsWith('%')) {
      val = parseFloat(val) / 100;
    } else {
      const num = Number(val);
      if (!isNaN(num)) val = num;
    }
    result[key] = val;
  }
  return result;
}

function quotedStrings(line) {
  return [...line.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function dmgRange(rest) {
  const m = rest.match(/\.dmg\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  if (m) return { dmg_min: parseFloat(m[1]), dmg_max: parseFloat(m[2]) };
  return null;
}

function parseMonsterInfo(basePath, variant, monsterDir) {
  const infoFile = path.join(basePath, `${variant}.info.darkest`);
  let text;
  try {
    text = fs.readFileSync(infoFile, 'utf-8');
  } catch {
    return null;
  }
  const monster = {
    id: variant, name: variant, monsterClass: monsterDir,
    maxHp: 0, dodge: 0, prot: 0, spd: 0, resistances: {},
    skills: [], size: 1, enemyType: null,
  };
  for (const raw of text.split('\n')) {
    const t = raw.trim();
    if (!t || t.startsWith('//')) continue;
    if (t.startsWith('display:')) {
      const p = parseProperties(t.substring('display:'.length));
      if (p.size) monster.size = p.size;
    } else if (t.startsWith('enemy_type:')) {
      const p = parseProperties(t.substring('enemy_type:'.length));
      monster.enemyType = p.id || null;
    } else if (t.startsWith('stats:')) {
      const p = parseProperties(t.substring('stats:'.length));
      monster.maxHp = p.hp || 0; monster.dodge = p.def || 0;
      monster.prot = p.prot || 0; monster.spd = p.spd || 0;
      for (const [k, v] of Object.entries(p)) {
        if (k.endsWith('_resist')) monster.resistances[k.replace('_resist', '')] = v;
      }
    } else if (t.startsWith('skill:') && !t.startsWith('skill_selection')) {
      const rest = t.substring('skill:'.length);
      const props = parseProperties(rest);
      const dmg = dmgRange(rest);
      if (dmg) { props.dmg_min = dmg.dmg_min; props.dmg_max = dmg.dmg_max; delete props.dmg; }
      const tm = rest.match(/\.target\s+(~?[@\d]+)/);
      if (tm) props.target_raw = tm[1];
      const lm = rest.match(/\.launch\s+([\d]+)/);
      if (lm) props.launch_raw = lm[1];
      const ef = quotedStrings(rest);
      if (ef.length) props.effects = ef;
      monster.skills.push(props);
    } else if (t.startsWith('death_class:')) {
      monster.deathClass = parseProperties(t.substring('death_class:'.length));
    } else if (t.startsWith('battle_modifier:')) {
      monster.battleModifiers = parseProperties(t.substring('battle_modifier:'.length));
    }
  }
  return monster;
}

// ---- 扫描 ----

async function scanMonsters(rootDir, seen, out) {
  // 递归查找所有 monsters 目录（mod 可能放在 shared/ 下）
  const monstersRoots = [];
  async function findMonstersDirs(dir) {
    const entries = await fs.readdir(dir).catch(() => []);
    for (const e of entries) {
      const p = path.join(dir, e);
      const st = await fs.stat(p).catch(() => null);
      if (!st) continue;
      if (st.isDirectory()) {
        if (e === 'monsters') monstersRoots.push(p);
        else if (!['anim', 'fx', 'localization', 'campaign', 'dlc'].includes(e)) await findMonstersDirs(p);
      }
    }
  }
  await findMonstersDirs(rootDir);
  if (monstersRoots.length === 0) return;
  for (const monstersRoot of monstersRoots) {
  const dirs = await fs.readdir(monstersRoot).catch(() => []);
  for (const cls of dirs) {
    const clsPath = path.join(monstersRoot, cls);
    const st = await fs.stat(clsPath).catch(() => null);
    if (!st?.isDirectory()) continue;
    const variants = await fs.readdir(clsPath).catch(() => []);
    for (const v of variants) {
      if (seen.has(v)) continue; // 原版或更早 mod 已收录
      const vPath = path.join(clsPath, v);
      const vst = await fs.stat(vPath).catch(() => null);
      if (!vst?.isDirectory()) continue;
      const m = parseMonsterInfo(vPath, v, cls);
      if (m && m.maxHp > 0) {
        seen.add(v);
        out.push(m);
      }
    }
  }
  }
}

async function scanTrinkets(rootDir, seen, out) {
  // 递归找 *.entries.trinkets.json
  async function walk(dir) {
    const entries = await fs.readdir(dir).catch(() => []);
    for (const e of entries) {
      const p = path.join(dir, e);
      const st = await fs.stat(p).catch(() => null);
      if (!st) continue;
      if (st.isDirectory()) {
        if (!['anim', 'fx'].includes(e)) await walk(p);
      } else if (e.endsWith('.entries.trinkets.json')) {
        try {
          const data = JSON.parse(await fs.readFile(p, 'utf-8'));
          for (const tr of data.entries ?? []) {
            if (seen.has(tr.id)) continue;
            seen.add(tr.id);
            out.push(tr);
          }
        } catch { /* 跳过坏文件 */ }
      }
    }
  }
  await walk(rootDir);
}

async function main() {
  // 已收录 id（原版优先）
  const baseMonsters = JSON.parse(await fs.readFile(path.join(OUT_DIR, 'monsters.json'), 'utf-8'));
  const baseTrinkets = JSON.parse(await fs.readFile(path.join(OUT_DIR, 'trinkets.json'), 'utf-8'));
  const seenMonsters = new Set(baseMonsters.map((m) => m.id));
  const seenTrinkets = new Set(baseTrinkets.entries.map((t) => t.id));

  const modMonsters = [];
  const modTrinkets = [];

  for (const rootName of SCAN_ROOTS) {
    const root = path.join(DD_ROOT, rootName);
    const mods = await fs.readdir(root).catch(() => []);
    for (const modName of mods) {
      const modPath = path.join(root, modName);
      const st = await fs.stat(modPath).catch(() => null);
      if (!st?.isDirectory()) continue;
      await scanMonsters(modPath, seenMonsters, modMonsters);
      await scanTrinkets(modPath, seenTrinkets, modTrinkets);
    }
  }

  // 输出
  await fs.writeFile(path.join(OUT_DIR, 'monsters_mod.json'), JSON.stringify(modMonsters, null, 1), 'utf8');
  await fs.writeFile(path.join(OUT_DIR, 'trinkets_mod.json'), JSON.stringify({ entries: modTrinkets }, null, 1), 'utf8');

  console.log(`=== mod 数据提取完成 ===`);
  console.log(`新增怪物: ${modMonsters.length}（原版 ${baseMonsters.length}）`);
  console.log(`新增饰品: ${modTrinkets.length}（原版 ${baseTrinkets.entries.length}）`);
  if (modMonsters.length > 0) {
    console.log('怪物示例:', modMonsters.slice(0, 8).map((m) => m.id).join(', '));
  }
  if (modTrinkets.length > 0) {
    console.log('饰品示例:', modTrinkets.slice(0, 8).map((t) => t.id).join(', '));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
