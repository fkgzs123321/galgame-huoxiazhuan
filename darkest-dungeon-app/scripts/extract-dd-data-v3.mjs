#!/usr/bin/env node
/**
 * DD .darkest → JSON 全量数据提取脚本 v3
 * 对齐 fanren-remake data 层深度：修复空壳 + 新增数据池
 *
 * 用法: node scripts/extract-dd-data-v3.mjs
 * 数据源: E:\SteamLibrary\steamapps\common\DarkestDungeon（加强无敌版）
 * 输出: src/data/dd-db/
 *
 * v3 相对 v2 的变更：
 *  - 修复 quirks.json（shared/quirk/quirk_library.json）
 *  - 修复 diseases.json（is_disease 过滤 + trait_library）
 *  - 修复 curios.json（分节 CSV 解析）
 *  - 新增 effects / camping_skills / town_events / loot / encounters(mash)
 *  - 新增 dungeon_props / raid_ai / starting_roster / localization_en
 *  - 重写 dungeon_mappings（dungeons/* 目录扫描）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DD_ROOT = 'E:\\SteamLibrary\\steamapps\\common\\DarkestDungeon';
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'dd-db');

// ============================================================
// 工具
// ============================================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.warn(`  ! 解析 JSON 失败: ${filePath}: ${e.message}`);
    return null;
  }
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

// .darkest 行属性解析：" .prop1 val1 .prop2 val2 ..." → { prop1: val1, ... }
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

// 提取行内所有引号字符串
function quotedStrings(line) {
  return [...line.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

// 提取 .dmg a b 双值
function dmgRange(rest) {
  const m = rest.match(/\.dmg\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  if (m) return { dmg_min: parseFloat(m[1]), dmg_max: parseFloat(m[2]) };
  return null;
}

// ============================================================
// 1. 英雄（沿用 v2）
// ============================================================

function parseHeroInfo(heroName) {
  const basePath = path.join(DD_ROOT, 'heroes', heroName);
  const infoFile = path.join(basePath, `${heroName}.info.darkest`);
  if (!fs.existsSync(infoFile)) return null;

  const content = fs.readFileSync(infoFile, 'utf-8');
  const hero = {
    id: heroName, name: heroName, resistances: {}, skills: [],
    camping_skills: [], weapons: [], armour: [], tags: [],
    skill_selection: null, generation: null,
  };

  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//')) continue;
    if (t.startsWith('resistances:')) {
      hero.resistances = parseProperties(t.substring('resistances:'.length));
    } else if (t.startsWith('weapon:')) {
      const props = parseProperties(t.substring('weapon:'.length));
      const dmg = dmgRange(t);
      if (dmg) { props.dmg_min = dmg.dmg_min; props.dmg_max = dmg.dmg_max; }
      hero.weapons.push(props);
    } else if (t.startsWith('armour:')) {
      hero.armour.push(parseProperties(t.substring('armour:'.length)));
    } else if (t.startsWith('combat_skill:')) {
      const props = parseProperties(t.substring('combat_skill:'.length));
      const tm = t.match(/\.target\s+(~?[@\d]+)/);
      if (tm) props.target_raw = tm[1];
      const lm = t.match(/\.launch\s+([\d]+)/);
      if (lm) props.launch_raw = lm[1];
      const ef = quotedStrings(t);
      if (ef.length) props.effects = ef;
      hero.skills.push(props);
    } else if (t.startsWith('combat_move_skill:')) {
      const props = parseProperties(t.substring('combat_move_skill:'.length));
      hero.skills.push({ ...props, is_move: true });
    } else if (t.startsWith('camping_skill:')) {
      const props = parseProperties(t.substring('camping_skill:'.length));
      hero.camping_skills.push(props);
    } else if (t.startsWith('tag:')) {
      const props = parseProperties(t.substring('tag:'.length));
      if (props.id) hero.tags.push(props.id);
    } else if (t.startsWith('skill_selection:')) {
      hero.skill_selection = parseProperties(t.substring('skill_selection:'.length));
    } else if (t.startsWith('generation:')) {
      hero.generation = parseProperties(t.substring('generation:'.length));
    } else if (t.startsWith('deaths_door:')) {
      hero.deaths_door = parseProperties(t.substring('deaths_door:'.length));
    }
  }

  hero.maxHp = hero.armour.map((a) => a.hp || 0);
  hero.dodge = hero.armour.map((a) => a.def || 0);
  hero.crit = hero.weapons.map((w) => w.crit || 0);
  hero.dmg = hero.weapons.map((w) => ({ min: w.dmg_min || 0, max: w.dmg_max || 0 }));
  hero.spd = hero.weapons.map((w) => w.spd || 0);
  return hero;
}

function extractHeroes() {
  console.log('\n=== 1. 英雄 ===');
  const dir = path.join(DD_ROOT, 'heroes');
  if (!fs.existsSync(dir)) return [];
  const heroes = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory())
    .map((n) => parseHeroInfo(n)).filter(Boolean);
  console.log(`  + ${heroes.length} 英雄`);
  return heroes;
}

// ============================================================
// 2. 怪物（沿用 v2）
// ============================================================

function parseMonsterInfo(monsterDir, variant) {
  const basePath = path.join(DD_ROOT, 'monsters', monsterDir, variant);
  const infoFile = path.join(basePath, `${variant}.info.darkest`);
  if (!fs.existsSync(infoFile)) return null;

  const monster = {
    id: variant, name: variant, monsterClass: monsterDir,
    maxHp: 0, dodge: 0, prot: 0, spd: 0, resistances: {},
    skills: [], size: 1, enemyType: null,
  };

  for (const line of fs.readFileSync(infoFile, 'utf-8').split('\n')) {
    const t = line.trim();
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

function extractMonsters() {
  console.log('\n=== 2. 怪物 ===');
  const dir = path.join(DD_ROOT, 'monsters');
  if (!fs.existsSync(dir)) return [];
  const monsters = [];
  for (const cls of fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory())) {
    const sub = path.join(dir, cls);
    for (const v of fs.readdirSync(sub).filter((f) => fs.statSync(path.join(sub, f)).isDirectory())) {
      const m = parseMonsterInfo(cls, v);
      if (m) monsters.push(m);
    }
  }
  console.log(`  + ${monsters.length} 怪物变体`);
  return monsters;
}

// ============================================================
// 3. 饰品（沿用 v2）
// ============================================================

function extractTrinkets() {
  console.log('\n=== 3. 饰品 ===');
  const entries = readJson(path.join(DD_ROOT, 'trinkets', 'base.entries.trinkets.json'));
  const rarities = readJson(path.join(DD_ROOT, 'trinkets', 'base.rarities.trinkets.json'));
  console.log(`  + 条目 ${entries?.entries?.length || 0} / 稀有度 ${rarities?.rarities?.length || 0}`);
  return { entries: entries?.entries || [], rarities: rarities?.rarities || [] };
}

// ============================================================
// 4. 城镇建筑（沿用 v2）
// ============================================================

function extractTownBuildings() {
  console.log('\n=== 4. 城镇建筑 ===');
  const dir = path.join(DD_ROOT, 'campaign', 'town', 'buildings');
  const buildings = {};
  if (!fs.existsSync(dir)) return buildings;
  for (const b of fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory())) {
    const data = readJson(path.join(dir, b, `${b}.building.json`));
    if (data) buildings[b] = data;
  }
  console.log(`  + ${Object.keys(buildings).length} 建筑`);
  return buildings;
}

// ============================================================
// 5. 任务（沿用 v2）
// ============================================================

function extractQuests() {
  console.log('\n=== 5. 任务 ===');
  const q = path.join(DD_ROOT, 'campaign', 'quest');
  const out = {
    types: readJson(path.join(q, 'quest.types.json')),
    generation: readJson(path.join(q, 'quest.generation.json')),
    exitPenalty: readJson(path.join(q, 'quest.exit_penalty.json')),
    restriction: readJson(path.join(q, 'quest.restriction.json')),
    plotQuests: readJson(path.join(q, 'quest.plot_quests.json')),
    numberGeneration: readJson(path.join(q, 'number.quest.generation.json')),
  };
  console.log(`  + 目标 ${out.types?.goals?.length || 0} / 生成 ${out.generation ? '✓' : '✗'} / 惩罚 ${out.exitPenalty ? '✓' : '✗'}`);
  return out;
}

// ============================================================
// 6. 补给品（沿用 v2）
// ============================================================

function extractProvisions() {
  console.log('\n=== 6. 补给品 ===');
  const data = readJson(path.join(DD_ROOT, 'campaign', 'provision', 'provision.json'));
  console.log(`  + ${Array.isArray(data) ? data.length : data ? Object.keys(data).length : 0} 项`);
  return data;
}

// ============================================================
// 7. 区域建筑（沿用 v2）
// ============================================================

function extractDistricts() {
  console.log('\n=== 7. 区域建筑 ===');
  const districts = [];
  const cc = readJson(path.join(DD_ROOT, 'dlc', '580100_crimson_court', 'features', 'districts', 'campaign', 'town', 'districts', 'districts_districts.json'));
  if (cc?.buildings) for (const b of cc.buildings) districts.push({ ...b, dlc: 'crimson_court' });
  const com = readJson(path.join(DD_ROOT, 'dlc', '735730_color_of_madness', 'campaign', 'town', 'districts', 'color_of_madness.districts.json'));
  if (com?.buildings) for (const b of com.buildings) districts.push({ ...b, dlc: 'color_of_madness' });
  console.log(`  + ${districts.length} 区域建筑`);
  return districts;
}

// ============================================================
// 8. 怪癖（修复：shared/quirk/quirk_library.json）
// ============================================================

function extractQuirks() {
  console.log('\n=== 8. 怪癖 ===');
  const lib = readJson(path.join(DD_ROOT, 'shared', 'quirk', 'quirk_library.json'));
  const quirks = lib?.quirks || [];
  const positives = quirks.filter((q) => q.is_positive).length;
  const negatives = quirks.filter((q) => !q.is_positive && !q.is_disease).length;
  console.log(`  + ${quirks.length} 怪癖（正向 ${positives} / 负向 ${negatives} / 疾病 ${quirks.filter((q) => q.is_disease).length}）`);
  return { quirks, source: 'shared/quirk/quirk_library.json' };
}

// ============================================================
// 9. 疾病（修复：is_disease 过滤 + trait_library）
// ============================================================

function extractDiseases() {
  console.log('\n=== 9. 疾病 ===');
  const lib = readJson(path.join(DD_ROOT, 'shared', 'quirk', 'quirk_library.json'));
  const diseases = (lib?.quirks || []).filter((q) => q.is_disease);
  const traits = readJson(path.join(DD_ROOT, 'shared', 'trait', 'trait_library.json'));
  console.log(`  + ${diseases.length} 疾病（怪癖库）+ ${traits?.traits?.length || 0} 特质`);
  return { diseases, traits: traits?.traits || [], source: 'shared/quirk/quirk_library.json + shared/trait/trait_library.json' };
}

// ============================================================
// 10. 好奇物（修复：分节 CSV 解析）
// ============================================================

function extractCurios() {
  console.log('\n=== 10. 好奇物 ===');
  const csv = readText(path.join(DD_ROOT, 'curios', 'curio_type_library.csv'));
  if (!csv) return { curios: [], raw: '' };
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const curios = [];
  let current = null;
  let inInteractions = false;

  const parseRow = (row) => {
    // 处理带引号的字段
    const cells = [];
    let buf = '', inQ = false;
    for (const ch of row) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cells.push(buf.trim()); buf = ''; continue; }
      buf += ch;
    }
    cells.push(buf.trim());
    return cells;
  };

  // 主结果表列（ID STRING 表头之后）：idString/resultType/weight/pct/result1/r1w/r1p/result2/r2w/r2p/result3/r3w/r3p/tracker/notes
  const MAIN_COLS = {
    idString: 2, resultType: 4, weight: 5, chancePct: 6,
    result1: 7, r1weight: 8, r1pct: 9,
    result2: 10, r2weight: 11, r2pct: 12,
    result3: 13, r3weight: 14, r3pct: 15,
    tracker: 16, notes: 17,
  };
  // 物品互动表列（Item Interactions 表头之后）：item/resultType/result1/r1w/r1p/...
  const ITEM_COLS = {
    item: 4, resultType: 5,
    result1: 7, r1weight: 8, r1pct: 9,
    result2: 10, r2weight: 11, r2pct: 12,
    result3: 13, r3weight: 14, r3pct: 15,
    tracker: 16, notes: 17,
  };

  const buildRow = (c, cols, extra = {}) => {
    const row = { ...extra };
    for (const [key, idx] of Object.entries(cols)) {
      const v = c[idx] ?? '';
      if (key === 'weight' || key === 'r1weight' || key === 'r2weight' || key === 'r3weight') {
        row[key] = v !== '' && !isNaN(Number(v)) ? Number(v) : null;
      } else if (key === 'chancePct' || key === 'r1pct' || key === 'r2pct' || key === 'r3pct') {
        row[key] = v ? parseFloat(v) : null;
      } else {
        row[key] = v;
      }
    }
    // 表头列数不足时，notes 兜底取最后一列
    if (!row.notes && c.length > 18) row.notes = c[c.length - 1];
    return row;
  };

  for (const line of lines) {
    const c = parseRow(line);
    // 新好奇物条目：第二列为数字编号（第 0 列通常为空）
    const idx = c[1];
    if (/^\d+$/.test(idx || '')) {
      if (current) curios.push(current);
      current = {
        index: parseInt(idx),
        name: c[2] || '',
        resultClass: c[4] || '',   // Good / Mixed / Bad ...
        interactions: [],           // 物品互动
        results: [],                // 无物品时的互动结果
      };
      inInteractions = false;
      continue;
    }
    if (!current) continue;

    // 表头或分节标记
    const marker = c[2] || '';
    if (marker === 'ID STRING') { inInteractions = false; continue; }
    if (marker === 'Item Interactions') { inInteractions = true; continue; }

    if (inInteractions) {
      // 物品互动行：ITEM 列有内容才收
      if ((c[4] || '').trim()) {
        current.interactions.push(buildRow(c, ITEM_COLS));
      }
    } else {
      // 主结果行：idString 列有内容（含 REGION FOUND/ALL/FULL CURIO?/TAGS 等标签行）
      if ((c[2] || '').trim()) {
        current.results.push(buildRow(c, MAIN_COLS));
      }
    }
  }
  if (current) curios.push(current);

  console.log(`  + ${curios.length} 种好奇物（含互动表）`);
  return { curios, source: 'curios/curio_type_library.csv' };
}

// ============================================================
// 11. 效果定义（新增）
// ============================================================

function parseEffectsFile(filePath) {
  const content = readText(filePath);
  const effects = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('effect:')) continue;
    const props = parseProperties(t.substring('effect:'.length));
    const ef = quotedStrings(t);
    if (ef.length) props.effect_refs = ef;
    effects.push(props);
  }
  return effects;
}

function extractEffects() {
  console.log('\n=== 11. 效果定义 ===');
  const base = parseEffectsFile(path.join(DD_ROOT, 'effects', 'base.effects.darkest'));
  const mode = parseEffectsFile(path.join(DD_ROOT, 'effects', 'mode.effects.darkest'));
  const dd = parseEffectsFile(path.join(DD_ROOT, 'shared', 'dd_effects.darkest'));
  console.log(`  + base ${base.length} / mode ${mode.length} / dd ${dd.length}`);
  return { base, mode, dd, total: base.length + mode.length + dd.length, source: 'effects/*.darkest + shared/dd_effects.darkest' };
}

// ============================================================
// 12. 扎营技能（新增）
// ============================================================

function extractCampingSkills() {
  console.log('\n=== 12. 扎营技能 ===');
  const data = readJson(path.join(DD_ROOT, 'raid', 'camping', 'default.camping_skills.json'));
  const skills = data?.camping_skills || data?.skills || (Array.isArray(data) ? data : []);
  console.log(`  + ${Array.isArray(skills) ? skills.length : '?'} 扎营技能`);
  return { skills: Array.isArray(skills) ? skills : [], source: 'raid/camping/default.camping_skills.json' };
}

// ============================================================
// 13. 城镇事件（新增）
// ============================================================

function extractTownEvents() {
  console.log('\n=== 13. 城镇事件 ===');
  const dir = path.join(DD_ROOT, 'campaign', 'town_events');
  const events = [];
  const settings = readJson(path.join(dir, 'town_events.settings.json'));
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.events.json'))) {
      const data = readJson(path.join(dir, f));
      const list = data?.events || (Array.isArray(data) ? data : []);
      events.push(...list.map((e) => ({ ...e, source: f })));
    }
  }
  console.log(`  + ${events.length} 城镇事件`);
  return { events, settings, source: 'campaign/town_events/*.events.json' };
}

// ============================================================
// 14. 战利品表（新增）
// ============================================================

function extractLoot() {
  console.log('\n=== 14. 战利品表 ===');
  const dir = path.join(DD_ROOT, 'loot');
  const out = {};
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const data = readJson(path.join(dir, f));
      if (data) out[f.replace('.json', '')] = data;
    }
  }
  console.log(`  + ${Object.keys(out).length} 战利品表`);
  return out;
}

// ============================================================
// 15. 遭遇表（新增：dungeons/*/*.mash.darkest）
// ============================================================

function parseMash(filePath) {
  const content = readText(filePath);
  const out = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//')) continue;
    const colon = t.indexOf(':');
    if (colon < 0) continue;
    const key = t.substring(0, colon).trim();
    const props = parseProperties(t.substring(colon + 1));
    // .types a b c → 数组
    const typesMatch = t.match(/\.types\s+([^.\n]+)/);
    if (typesMatch) props.types = typesMatch[1].trim().split(/\s+/).filter(Boolean);
    if (!out[key]) out[key] = [];
    out[key].push(props);
  }
  return out;
}

function extractEncounters() {
  console.log('\n=== 15. 遭遇表 ===');
  const dir = path.join(DD_ROOT, 'dungeons');
  const out = {};
  if (fs.existsSync(dir)) {
    for (const area of fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory())) {
      const areaDir = path.join(dir, area);
      const mashFiles = fs.readdirSync(areaDir).filter((f) => f.endsWith('.mash.darkest'));
      if (!mashFiles.length) continue;
      out[area] = {};
      for (const f of mashFiles) {
        const key = f.replace('.mash.darkest', '');
        out[area][key] = parseMash(path.join(areaDir, f));
      }
    }
  }
  const total = Object.values(out).reduce((a, area) => a + Object.keys(area).length, 0);
  console.log(`  + ${Object.keys(out).length} 区域 / ${total} 张 mash 表`);
  return out;
}

// ============================================================
// 16. 地牢道具概率（新增：dungeons/*/*.props.darkest）
// ============================================================

function extractDungeonProps() {
  console.log('\n=== 16. 地牢道具 ===');
  const dir = path.join(DD_ROOT, 'dungeons');
  const out = {};
  if (fs.existsSync(dir)) {
    for (const area of fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory())) {
      const areaDir = path.join(dir, area);
      const propsFiles = fs.readdirSync(areaDir).filter((f) => f.endsWith('.props.darkest'));
      if (!propsFiles.length) continue;
      out[area] = {};
      for (const f of propsFiles) {
        const key = f.replace('.props.darkest', '');
        out[area][key] = parseMash(path.join(areaDir, f));
      }
    }
  }
  console.log(`  + ${Object.keys(out).length} 区域道具表`);
  return out;
}

// ============================================================
// 17. 怪物 AI（新增）
// ============================================================

function extractRaidAi() {
  console.log('\n=== 17. 怪物 AI ===');
  const brains = readJson(path.join(DD_ROOT, 'raid', 'ai', 'base.monster_brains.json'));
  console.log(`  + ${brains?.monster_brains?.length || 0} 个怪物脑`);
  return { brains: brains?.monster_brains || [], source: 'raid/ai/base.monster_brains.json' };
}

// ============================================================
// 18. 初始名册（新增）
// ============================================================

function extractStartingRoster() {
  console.log('\n=== 18. 初始名册 ===');
  const content = readText(path.join(DD_ROOT, 'scripts', 'starting_roster.darkest'));
  const roster = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('hero:')) continue;
    const p = parseProperties(t.substring('hero:'.length));
    roster.push({ classId: p.class || '', name: p.name || '' });
  }
  console.log(`  + ${roster.length} 名初始英雄`);
  return { roster, source: 'scripts/starting_roster.darkest' };
}

// ============================================================
// 19. 本地化文本表（新增：*.string_table.xml）
// ============================================================

function parseStringTableXml(content) {
  const entries = {};
  const re = /<entry\s+id="([^"]+)">\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/entry>/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    entries[m[1]] = m[2];
  }
  return entries;
}

function extractLocalization() {
  console.log('\n=== 19. 本地化文本表 ===');
  const dir = path.join(DD_ROOT, 'localization');
  const tables = {};
  let total = 0;
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.string_table.xml'))) {
      const entries = parseStringTableXml(readText(path.join(dir, f)));
      tables[f.replace('.string_table.xml', '')] = entries;
      total += Object.keys(entries).length;
    }
  }
  console.log(`  + ${Object.keys(tables).length} 个表 / ${total} 条文本`);
  return { tables, total, source: 'localization/*.string_table.xml', lang: 'en' };
}

// ============================================================
// 20. 地牢映射（重写：dungeons/ 目录扫描）
// ============================================================

function extractDungeonMappings() {
  console.log('\n=== 20. 地牢映射 ===');
  const dir = path.join(DD_ROOT, 'dungeons');
  const areas = {};
  if (fs.existsSync(dir)) {
    for (const area of fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory())) {
      const files = fs.readdirSync(path.join(dir, area)).filter((f) => /\.(mash|props)\.darkest$/.test(f));
      const levels = [...new Set(files.map((f) => {
        const m = f.match(/(\d+)\.(mash|props)\.darkest$/);
        return m ? parseInt(m[1]) : null;
      }).filter((n) => n !== null))].sort((a, b) => a - b);
      areas[area] = { levels, fileCount: files.length, files };
    }
  }
  console.log(`  + ${Object.keys(areas).length} 区域：${Object.entries(areas).map(([k, v]) => `${k}(L${v.levels.join('/')})`).join(' ')}`);
  return { areas, source: 'dungeons/*/' };
}

// ============================================================
// 主流程
// ============================================================

function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║ DD 数据提取脚本 v3 — 全量数据池对齐          ║');
  console.log('╚══════════════════════════════════════════════╝');
  if (!fs.existsSync(DD_ROOT)) {
    console.error(`\n✗ DD 游戏目录不存在: ${DD_ROOT}`);
    process.exit(1);
  }
  ensureDir(OUTPUT_DIR);

  const heroes = extractHeroes();
  const monsters = extractMonsters();
  const trinkets = extractTrinkets();
  const buildings = extractTownBuildings();
  const quests = extractQuests();
  const provisions = extractProvisions();
  const districts = extractDistricts();
  const quirks = extractQuirks();
  const diseases = extractDiseases();
  const curios = extractCurios();
  const effects = extractEffects();
  const camping = extractCampingSkills();
  const townEvents = extractTownEvents();
  const loot = extractLoot();
  const encounters = extractEncounters();
  const dungeonProps = extractDungeonProps();
  const raidAi = extractRaidAi();
  const roster = extractStartingRoster();
  const localization = extractLocalization();
  const dungeonMappings = extractDungeonMappings();

  console.log('\n=== 写入 JSON 数据库 ===');
  const writes = [
    ['heroes.json', heroes],
    ['monsters.json', monsters],
    ['trinkets.json', trinkets],
    ['buildings.json', buildings],
    ['quests.json', quests],
    ['provisions.json', provisions],
    ['districts.json', districts],
    ['quirks.json', quirks],
    ['diseases.json', diseases],
    ['curios.json', curios],
    ['effects.json', effects],
    ['camping_skills.json', camping],
    ['town_events.json', townEvents],
    ['loot.json', loot],
    ['encounters.json', encounters],
    ['dungeon_props.json', dungeonProps],
    ['raid_ai.json', raidAi],
    ['starting_roster.json', roster],
    ['localization_en.json', localization],
    ['dungeon_mappings.json', dungeonMappings],
  ];
  for (const [name, data] of writes) {
    writeJson(path.join(OUTPUT_DIR, name), data);
    const size = (JSON.stringify(data).length / 1024).toFixed(1);
    console.log(`  → ${name} (${size} KB)`);
  }

  const index = {
    generatedAt: new Date().toISOString(),
    ddRoot: DD_ROOT,
    extractor: 'extract-dd-data-v3.mjs',
    files: {
      heroes: heroes.length,
      monsters: monsters.length,
      trinkets: trinkets.entries.length,
      buildings: Object.keys(buildings).length,
      curios: curios.curios.length,
      provisions: Array.isArray(provisions) ? provisions.length : provisions ? Object.keys(provisions).length : 0,
      districts: districts.length,
      quirks: quirks.quirks.length,
      diseases: diseases.diseases.length,
      effects: effects.total,
      campingSkills: camping.skills.length,
      townEvents: townEvents.events.length,
      lootTables: Object.keys(loot).length,
      encounterAreas: Object.keys(encounters).length,
      raidAi: raidAi.brains.length,
      startingRoster: roster.roster.length,
      localizationStrings: localization.total,
    },
  };
  writeJson(path.join(OUTPUT_DIR, 'index.json'), index);

  console.log('\n✓ 数据提取完成！共 20 个数据池 + 索引');
  console.log(JSON.stringify(index.files, null, 2));
}

main();
