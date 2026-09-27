#!/usr/bin/env node
/**
 * DD .darkest → JSON 数据提取脚本 v2
 * 正确解析 DD 的 key: .property value 格式
 *
 * 用法: node scripts/extract-dd-data.mjs
 * 数据源: E:\SteamLibrary\steamapps\common\DarkestDungeon\
 * 输出: src/data/dd-db/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DD_ROOT = 'E:\\SteamLibrary\\steamapps\\common\\DarkestDungeon';
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'dd-db');

// ============================================================
// .darkest 属性解析器
// 将 "key: .prop1 val1 .prop2 val2 ..." 解析为 { prop1: val1, prop2: val2 }
// ============================================================

function parseProperties(line) {
  const result = {};
  // 匹配 .propertyName 后跟值（字符串用引号，数字/百分比/标识符直接）
  const regex = /\.(\w+)\s+("[^"]*"|~?[\w@%.-]+)/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    const key = match[1];
    let val = match[2];
    // 去引号
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    // 去百分比
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

function parsePercentage(val) {
  if (typeof val === 'string' && val.endsWith('%')) {
    return parseFloat(val) / 100;
  }
  return Number(val);
}

// ============================================================
// 英雄解析器
// ============================================================

function parseHeroInfo(heroName) {
  const basePath = path.join(DD_ROOT, 'heroes', heroName);
  const infoFile = path.join(basePath, `${heroName}.info.darkest`);

  if (!fs.existsSync(infoFile)) return null;

  const content = fs.readFileSync(infoFile, 'utf-8');
  const hero = {
    id: heroName,
    name: heroName,
    resistances: {},
    skills: [],
    camping_skills: [],
    weapons: [],
    armour: [],
    tags: [],
    skill_selection: null,
    generation: null,
  };

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // resistances: .stun 40% .poison 30% ...
    if (trimmed.startsWith('resistances:')) {
      const props = parseProperties(trimmed.substring('resistances:'.length));
      hero.resistances = props;
    }
    // weapon: .name "crusader_weapon_0" .atk 0% .dmg 6 12 .crit 3% .spd 1
    else if (trimmed.startsWith('weapon:')) {
      const props = parseProperties(trimmed.substring('weapon:'.length));
      // .dmg 6 12 需要特殊处理（两个数字）
      const dmgMatch = trimmed.match(/\.dmg\s+(\d+)\s+(\d+)/);
      if (dmgMatch) {
        props.dmg_min = parseInt(dmgMatch[1]);
        props.dmg_max = parseInt(dmgMatch[2]);
      }
      hero.weapons.push(props);
    }
    // armour: .name "crusader_armour_0" .def 5% .prot 0 .hp 33 .spd 0
    else if (trimmed.startsWith('armour:')) {
      const props = parseProperties(trimmed.substring('armour:'.length));
      hero.armour.push(props);
    }
    // combat_skill: .id "smite" .level 0 .type "melee" ...
    else if (trimmed.startsWith('combat_skill:')) {
      const props = parseProperties(trimmed.substring('combat_skill:'.length));
      // 处理 .target ~12 或 @1234 等格式
      const targetMatch = trimmed.match(/\.target\s+(~?[@\d]+)/);
      if (targetMatch) props.target_raw = targetMatch[1];
      const launchMatch = trimmed.match(/\.launch\s+([\d]+)/);
      if (launchMatch) props.launch_raw = launchMatch[1];
      // 处理 effect 列表
      const effectMatches = [...trimmed.matchAll(/"([^"]+)"/g)];
      if (effectMatches.length > 0) {
        props.effects = effectMatches.map(m => m[1]);
      }
      hero.skills.push(props);
    }
    // combat_move_skill: .id "move" ...
    else if (trimmed.startsWith('combat_move_skill:')) {
      const props = parseProperties(trimmed.substring('combat_move_skill:'.length));
      hero.skills.push({ ...props, is_move: true });
    }
    // tag: .id "heavy"
    else if (trimmed.startsWith('tag:')) {
      const props = parseProperties(trimmed.substring('tag:'.length));
      if (props.id) hero.tags.push(props.id);
    }
    // skill_selection: .can_select_combat_skills true .number_of_selected_combat_skills_max 7
    else if (trimmed.startsWith('skill_selection:')) {
      hero.skill_selection = parseProperties(trimmed.substring('skill_selection:'.length));
    }
    // generation: .is_generation_enabled true ...
    else if (trimmed.startsWith('generation:')) {
      hero.generation = parseProperties(trimmed.substring('generation:'.length));
    }
    // deaths_door
    else if (trimmed.startsWith('deaths_door:')) {
      hero.deaths_door = parseProperties(trimmed.substring('deaths_door:'.length));
    }
  }

  // 从 armour 提取 HP 数组
  hero.maxHp = hero.armour.map(a => a.hp || 0);
  // 从 armour 提取 dodge (def) 数组
  hero.dodge = hero.armour.map(a => a.def || 0);
  // 从 weapon 提取 crit 数组
  hero.crit = hero.weapons.map(w => w.crit || 0);
  // 从 weapon 提取 dmg 数组
  hero.dmg = hero.weapons.map(w => ({ min: w.dmg_min || 0, max: w.dmg_max || 0 }));
  // 从 weapon 提取 spd 数组
  hero.spd = hero.weapons.map(w => w.spd || 0);

  return hero;
}

// ============================================================
// 怪物解析器
// ============================================================

function parseMonsterInfo(monsterDir, variant) {
  const basePath = path.join(DD_ROOT, 'monsters', monsterDir, variant);
  const infoFile = path.join(basePath, `${variant}.info.darkest`);

  if (!fs.existsSync(infoFile)) return null;

  const content = fs.readFileSync(infoFile, 'utf-8');
  const monster = {
    id: variant,
    name: variant,
    monsterClass: monsterDir,
    maxHp: 0,
    dodge: 0,
    prot: 0,
    spd: 0,
    resistances: {},
    skills: [],
    size: 1,
    enemyType: null,
  };

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // display: .size 2
    if (trimmed.startsWith('display:')) {
      const props = parseProperties(trimmed.substring('display:'.length));
      if (props.size) monster.size = props.size;
    }
    // enemy_type: .id "man"
    else if (trimmed.startsWith('enemy_type:')) {
      const props = parseProperties(trimmed.substring('enemy_type:'.length));
      monster.enemyType = props.id || null;
    }
    // stats: .hp 35 .def 0% .prot 0 .spd 1 .stun_resist 50% ...
    else if (trimmed.startsWith('stats:')) {
      const props = parseProperties(trimmed.substring('stats:'.length));
      monster.maxHp = props.hp || 0;
      monster.dodge = props.def || 0;
      monster.prot = props.prot || 0;
      monster.spd = props.spd || 0;
      // 映射抗性
      if (props.stun_resist !== undefined) monster.resistances.stun = props.stun_resist;
      if (props.poison_resist !== undefined) monster.resistances.poison = props.poison_resist;
      if (props.bleed_resist !== undefined) monster.resistances.bleed = props.bleed_resist;
      if (props.debuff_resist !== undefined) monster.resistances.debuff = props.debuff_resist;
      if (props.move_resist !== undefined) monster.resistances.move = props.move_resist;
    }
    // skill: .id "whip_party" .type "melee" .atk 82.5% .dmg 1 1 .crit 0% ...
    else if (trimmed.startsWith('skill:') && !trimmed.startsWith('skill_selection')) {
      const rest = trimmed.substring('skill:'.length);
      const props = parseProperties(rest);
      // 处理 .dmg 1 1 双值
      const dmgMatch = rest.match(/\.dmg\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      if (dmgMatch) {
        props.dmg_min = parseFloat(dmgMatch[1]);
        props.dmg_max = parseFloat(dmgMatch[2]);
        delete props.dmg;
      }
      // 处理 target
      const targetMatch = rest.match(/\.target\s+(~?[@\d]+)/);
      if (targetMatch) props.target_raw = targetMatch[1];
      const launchMatch = rest.match(/\.launch\s+([\d]+)/);
      if (launchMatch) props.launch_raw = launchMatch[1];
      // 处理 effect 列表
      const effectMatches = [...rest.matchAll(/"([^"]+)"/g)];
      if (effectMatches.length > 0) {
        props.effects = effectMatches.map(m => m[1]);
      }
      monster.skills.push(props);
    }
    // death_class
    else if (trimmed.startsWith('death_class:')) {
      const props = parseProperties(trimmed.substring('death_class:'.length));
      monster.deathClass = props;
    }
    // battle_modifier
    else if (trimmed.startsWith('battle_modifier:')) {
      monster.battleModifiers = parseProperties(trimmed.substring('battle_modifier:'.length));
    }
  }

  return monster;
}

// ============================================================
// JSON 文件读取器
// ============================================================

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.warn(`  ! 解析 JSON 失败: ${filePath}: ${e.message}`);
    return null;
  }
}

// ============================================================
// 主提取流程
// ============================================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function extractHeroes() {
  console.log('\n=== 提取英雄数据 ===');
  const heroesDir = path.join(DD_ROOT, 'heroes');
  const heroes = [];

  if (!fs.existsSync(heroesDir)) {
    console.warn(`  ! 英雄目录不存在: ${heroesDir}`);
    return [];
  }

  const heroDirs = fs.readdirSync(heroesDir).filter(f =>
    fs.statSync(path.join(heroesDir, f)).isDirectory()
  );

  for (const heroName of heroDirs) {
    const hero = parseHeroInfo(heroName);
    if (hero) {
      heroes.push(hero);
      console.log(`  + ${heroName}: HP=${hero.maxHp.join('/')}, 技能=${hero.skills.filter(s => !s.is_move).length}, 扎营=${hero.camping_skills.length}, 武器=${hero.weapons.length}, 护甲=${hero.armour.length}`);
    }
  }

  return heroes;
}

function extractMonsters() {
  console.log('\n=== 提取怪物数据 ===');
  const monstersDir = path.join(DD_ROOT, 'monsters');
  const monsters = [];

  if (!fs.existsSync(monstersDir)) {
    console.warn(`  ! 怪物目录不存在: ${monstersDir}`);
    return [];
  }

  const monsterDirs = fs.readdirSync(monstersDir).filter(f =>
    fs.statSync(path.join(monstersDir, f)).isDirectory()
  );

  for (const dir of monsterDirs) {
    const subDir = path.join(monstersDir, dir);
    const variants = fs.readdirSync(subDir).filter(f =>
      fs.statSync(path.join(subDir, f)).isDirectory()
    );

    for (const variant of variants) {
      const monster = parseMonsterInfo(dir, variant);
      if (monster) {
        monsters.push(monster);
      }
    }
  }

  // 按类型分组统计
  const byClass = {};
  for (const m of monsters) {
    const cls = m.monsterClass || 'unknown';
    if (!byClass[cls]) byClass[cls] = 0;
    byClass[cls]++;
  }
  console.log(`  + 共提取 ${monsters.length} 个怪物变体 (${Object.keys(byClass).length} 类)`);

  return monsters;
}

function extractTrinkets() {
  console.log('\n=== 提取饰品数据 ===');
  const trinketsFile = path.join(DD_ROOT, 'trinkets', 'base.entries.trinkets.json');
  const raritiesFile = path.join(DD_ROOT, 'trinkets', 'base.rarities.trinkets.json');

  const entries = readJson(trinketsFile);
  const rarities = readJson(raritiesFile);

  if (entries) {
    console.log(`  + 饰品条目: ${entries.entries?.length || 0}`);
  }
  if (rarities) {
    console.log(`  + 稀有度分类: ${rarities.rarities?.length || 0}`);
  }

  return { entries: entries?.entries || [], rarities: rarities?.rarities || [] };
}

function extractTownBuildings() {
  console.log('\n=== 提取城镇建筑数据 ===');
  const buildingsDir = path.join(DD_ROOT, 'campaign', 'town', 'buildings');
  const buildings = {};

  if (!fs.existsSync(buildingsDir)) {
    console.warn(`  ! 建筑目录不存在: ${buildingsDir}`);
    return {};
  }

  const buildingDirs = fs.readdirSync(buildingsDir).filter(f =>
    fs.statSync(path.join(buildingsDir, f)).isDirectory()
  );

  for (const dir of buildingDirs) {
    const buildingFile = path.join(buildingsDir, dir, `${dir}.building.json`);
    const data = readJson(buildingFile);
    if (data) {
      buildings[dir] = data;
      const activities = data.data?.activities?.length || data.data?.stores?.length || 0;
      console.log(`  + ${dir}: 活动/商店=${activities}`);
    }
  }

  return buildings;
}

function extractQuests() {
  console.log('\n=== 提取任务数据 ===');
  const questDir = path.join(DD_ROOT, 'campaign', 'quest');

  const types = readJson(path.join(questDir, 'quest.types.json'));
  const generation = readJson(path.join(questDir, 'quest.generation.json'));
  const exitPenalty = readJson(path.join(questDir, 'quest.exit_penalty.json'));

  if (types) console.log(`  + 任务目标: ${types.goals?.length || 0}`);
  if (generation) console.log(`  + 生成规则: ${Object.keys(generation.generation || {}).join(', ')}`);
  if (exitPenalty) console.log(`  + 退出惩罚: ${Object.keys(exitPenalty).join(', ')}`);

  return { types, generation, exitPenalty };
}

function extractCurios() {
  console.log('\n=== 提取古物数据 ===');
  const curiosDir = path.join(DD_ROOT, 'curios');

  const typeLibraryFile = path.join(curiosDir, 'curio_type_library.csv');
  if (!fs.existsSync(typeLibraryFile)) {
    console.warn('  ! 古物类型表不存在');
    return { typeLibrary: '', props: '' };
  }

  const typeLibrary = fs.readFileSync(typeLibraryFile, 'utf-8');
  const propsFile = path.join(curiosDir, 'curio_props.csv');
  const props = fs.existsSync(propsFile) ? fs.readFileSync(propsFile, 'utf-8') : '';

  const lines = typeLibrary.split('\n').filter(l => l.trim());
  console.log(`  + 古物类型表: ${lines.length - 1} 行`);

  // 解析 CSV 为结构化数据
  const headers = lines[0].split(',').map(h => h.trim());
  const curios = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const entry = {};
    for (let j = 0; j < headers.length && j < values.length; j++) {
      entry[headers[j]] = values[j]?.trim() || '';
    }
    if (entry.id || entry.name) {
      curios.push(entry);
    }
  }

  return { typeLibrary, props, parsed: curios };
}

function extractProvisions() {
  console.log('\n=== 提取补给品数据 ===');
  const provisionFile = path.join(DD_ROOT, 'campaign', 'provision', 'provision.json');
  const data = readJson(provisionFile);

  if (data) {
    console.log(`  + 补给品种类: ${Array.isArray(data) ? data.length : Object.keys(data).length}`);
  }

  return data;
}

function extractDistricts() {
  console.log('\n=== 提取区域建筑数据 ===');
  const districts = [];

  // Crimson Court DLC
  const ccFile = path.join(DD_ROOT, 'dlc', '580100_crimson_court', 'features', 'districts', 'campaign', 'town', 'districts', 'districts_districts.json');
  const ccData = readJson(ccFile);
  if (ccData?.buildings) {
    for (const b of ccData.buildings) {
      districts.push({ ...b, dlc: 'crimson_court' });
      console.log(`  + CC: ${b.name}`);
    }
  }

  // Color of Madness DLC
  const comFile = path.join(DD_ROOT, 'dlc', '735730_color_of_madness', 'campaign', 'town', 'districts', 'color_of_madness.districts.json');
  const comData = readJson(comFile);
  if (comData?.buildings) {
    for (const b of comData.buildings) {
      districts.push({ ...b, dlc: 'color_of_madness' });
      console.log(`  + CoM: ${b.name}`);
    }
  }

  return districts;
}

function extractQuirks() {
  console.log('\n=== 提取怪癖数据 ===');
  const quirkFile = path.join(DD_ROOT, 'quirks', 'quirk.json');
  const data = readJson(quirkFile);

  if (data?.quirks) {
    console.log(`  + 怪癖总数: ${data.quirks.length}`);
  }

  return data;
}

function extractDiseases() {
  console.log('\n=== 提取疾病数据 ===');
  const diseaseFile = path.join(DD_ROOT, 'diseases', 'disease.json');
  const data = readJson(diseaseFile);

  if (data?.diseases) {
    console.log(`  + 疾病总数: ${data.diseases.length}`);
  }

  return data;
}

function extractDungeonMappings() {
  console.log('\n=== 提取地牢映射数据 ===');
  const result = {};

  // 地牢类型
  const dungeonTypesFile = path.join(DD_ROOT, 'campaign', 'dungeon', 'dungeon.types.json');
  const dungeonTypes = readJson(dungeonTypesFile);
  if (dungeonTypes) {
    result.types = dungeonTypes;
    console.log(`  + 地牢类型: ${dungeonTypes.dungeons?.length || 0}`);
  }

  // 遭遇表
  const encounterDir = path.join(DD_ROOT, 'campaign', 'dungeon', 'encounter');
  if (fs.existsSync(encounterDir)) {
    const encounterFiles = fs.readdirSync(encounterDir).filter(f => f.endsWith('.json'));
    result.encounters = {};
    for (const file of encounterFiles) {
      const data = readJson(path.join(encounterDir, file));
      if (data) {
        const key = file.replace('.json', '');
        result.encounters[key] = data;
      }
    }
    console.log(`  + 遭遇表: ${encounterFiles.length} 文件`);
  }

  // 房间模板
  const roomDir = path.join(DD_ROOT, 'campaign', 'dungeon', 'room');
  if (fs.existsSync(roomDir)) {
    const roomFiles = fs.readdirSync(roomDir).filter(f => f.endsWith('.json'));
    result.rooms = {};
    for (const file of roomFiles) {
      const data = readJson(path.join(roomDir, file));
      if (data) {
        const key = file.replace('.json', '');
        result.rooms[key] = data;
      }
    }
    console.log(`  + 房间模板: ${roomFiles.length} 文件`);
  }

  return result;
}

// ============================================================
// 主函数
// ============================================================

function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  DD 数据提取脚本 v2 — .darkest → JSON       ║');
  console.log('╚══════════════════════════════════════════════╝');

  if (!fs.existsSync(DD_ROOT)) {
    console.error(`\n✗ DD 游戏目录不存在: ${DD_ROOT}`);
    process.exit(1);
  }

  ensureDir(OUTPUT_DIR);
  console.log(`\n输出目录: ${OUTPUT_DIR}`);

  // 提取各类数据
  const heroes = extractHeroes();
  const monsters = extractMonsters();
  const trinkets = extractTrinkets();
  const buildings = extractTownBuildings();
  const quests = extractQuests();
  const curios = extractCurios();
  const provisions = extractProvisions();
  const districts = extractDistricts();
  const quirks = extractQuirks();
  const diseases = extractDiseases();
  const dungeonMappings = extractDungeonMappings();

  // 写入 JSON 文件
  console.log('\n=== 写入 JSON 数据库 ===');

  writeJson(path.join(OUTPUT_DIR, 'heroes.json'), heroes);
  console.log(`  → heroes.json (${heroes.length} 英雄)`);

  writeJson(path.join(OUTPUT_DIR, 'monsters.json'), monsters);
  console.log(`  → monsters.json (${monsters.length} 怪物)`);

  writeJson(path.join(OUTPUT_DIR, 'trinkets.json'), trinkets);
  console.log(`  → trinkets.json (${trinkets.entries.length} 饰品)`);

  writeJson(path.join(OUTPUT_DIR, 'buildings.json'), buildings);
  console.log(`  → buildings.json (${Object.keys(buildings).length} 建筑)`);

  writeJson(path.join(OUTPUT_DIR, 'quests.json'), quests);
  console.log(`  → quests.json`);

  writeJson(path.join(OUTPUT_DIR, 'curios.json'), { parsed: curios.parsed });
  console.log(`  → curios.json (${curios.parsed?.length || 0} 古物)`);

  writeJson(path.join(OUTPUT_DIR, 'provisions.json'), provisions);
  console.log(`  → provisions.json`);

  writeJson(path.join(OUTPUT_DIR, 'districts.json'), districts);
  console.log(`  → districts.json (${districts.length} 区域建筑)`);

  writeJson(path.join(OUTPUT_DIR, 'quirks.json'), quirks);
  console.log(`  → quirks.json (${quirks?.quirks?.length || 0} 怪癖)`);

  writeJson(path.join(OUTPUT_DIR, 'diseases.json'), diseases);
  console.log(`  → diseases.json (${diseases?.diseases?.length || 0} 疾病)`);

  writeJson(path.join(OUTPUT_DIR, 'dungeon_mappings.json'), dungeonMappings);
  console.log(`  → dungeon_mappings.json`);

  // 生成索引
  const index = {
    generatedAt: new Date().toISOString(),
    ddRoot: DD_ROOT,
    files: {
      heroes: heroes.length,
      monsters: monsters.length,
      trinkets: trinkets.entries.length,
      buildings: Object.keys(buildings).length,
      curios: curios.parsed?.length || 0,
      provisions: Array.isArray(provisions) ? provisions.length : (provisions ? Object.keys(provisions).length : 0),
      districts: districts.length,
      quirks: quirks?.quirks?.length || 0,
      diseases: diseases?.diseases?.length || 0,
    },
  };
  writeJson(path.join(OUTPUT_DIR, 'index.json'), index);

  console.log('\n✓ 数据提取完成!');
  console.log(`  共生成 ${11} 个 JSON 文件 + 1 索引`);
}

main();
