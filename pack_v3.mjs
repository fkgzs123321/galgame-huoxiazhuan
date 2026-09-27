// pack_v3.mjs - 不要玩弄我的鸡吧-forge V3规范角色卡打包脚本
// 从源文件重建V3规范角色卡JSON，不再依赖旧PNG增量更新
// 用法: node pack_v3.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARD_DIR = path.join(__dirname, 'src', '不要玩弄我的鸡吧-forge');
const STATE_PATH = path.join(CARD_DIR, 'tavern-cards-state.json');
const OUTPUT_PATH = path.join(__dirname, 'dist', '不要玩弄我的鸡吧-forge.json');
const AVATAR_PATH = path.join(CARD_DIR, '头像_clean.png');

// ===== 角色卡基本字段 =====
const ROLE_MAP = { system: 0, user: 1, assistant: 2 };
const POSITION_MAP = {
  before_char: 0, after_char: 1, before_an: 2, after_an: 3, at_depth: 4,
};

// ===== 读取tavern-cards-state.json =====
function loadState() {
  const raw = fs.readFileSync(STATE_PATH, 'utf-8');
  return JSON.parse(raw);
}

// ===== 从entryManifest构建V3规范条目 =====
function buildEntries(state) {
  const manifest = state.entryManifest;
  const wbDir = path.join(CARD_DIR, '世界书');
  const entries = [];
  let id = 0;

  for (const category of Object.keys(manifest)) {
    const catEntries = manifest[category];
    if (!catEntries || typeof catEntries !== 'object') continue;

    for (const entryName of Object.keys(catEntries)) {
      const cfg = catEntries[entryName];
      if (!cfg || !cfg.path) continue;

      // 读取条目内容
      const fullPath = path.join(CARD_DIR, cfg.path.replace(/\\/g, '/'));
      let content = '';
      if (fs.existsSync(fullPath)) {
        content = fs.readFileSync(fullPath, 'utf-8');
      } else {
        console.warn(`  ⚠ 文件不存在: ${fullPath}`);
        continue;
      }

      // 解析配置
      const enabled = cfg.enabled === true; // 蓝灯=true, 关灯=false
      const strategy = cfg.strategy || { type: 'constant' };
      const isConstant = strategy.type === 'constant';
      const isSelective = strategy.type === 'selective';
      const keys = isSelective ? (strategy.keys || []) : (cfg.keywords || []);

      const pos = cfg.position || { type: 'at_depth', role: 'system', depth: 0, order: 100 };
      const posType = pos.type || 'at_depth';
      const posRole = pos.role || 'system';
      const posDepth = pos.depth ?? 0;
      const posOrder = pos.order ?? 100;

      const recursion = cfg.recursion || {};
      const displayIndex = cfg.display_index ?? id;

      // 构建V3规范条目
      const entry = {
        id: id,
        keys: keys,
        secondary_keys: [],
        comment: entryName,
        content: content,
        constant: isConstant,
        selective: isSelective,
        insertion_order: posOrder,
        enabled: enabled,
        position: posType,
        use_regex: true,
        extensions: {
          position: POSITION_MAP[posType] ?? 4,
          exclude_recursion: recursion.prevent_outgoing === true,
          display_index: displayIndex,
          probability: 100,
          useProbability: true,
          depth: posDepth,
          selectiveLogic: 0,
          outlet_name: '',
          group: cfg.group || '',
          group_override: false,
          group_weight: 100,
          prevent_recursion: recursion.prevent_incoming === true,
          delay_until_recursion: false,
          scan_depth: null,
          match_whole_words: null,
          use_group_scoring: false,
          case_sensitive: null,
          automation_id: '',
          role: ROLE_MAP[posRole] ?? 0,
          vectorized: false,
          sticky: null,
          cooldown: null,
          delay: null,
          match_persona_description: false,
          match_character_description: false,
          match_character_personality: false,
          match_character_depth_prompt: false,
          match_scenario: false,
          match_creator_notes: false,
          triggers: [],
          ignore_budget: false,
        },
      };

      entries.push(entry);
      id++;
    }
  }

  return entries;
}

// ===== 构建脚本（ScriptTree数组格式）=====
function buildScripts(state) {
  const scriptsConfig = state.extensions?.tavern_helper?.scripts;
  if (!scriptsConfig || typeof scriptsConfig !== 'object') return [];

  const scriptDir = path.join(CARD_DIR, '脚本');
  const scripts = [];

  for (const name of Object.keys(scriptsConfig)) {
    const cfg = scriptsConfig[name];
    if (!cfg) continue;

    // 优先使用配置里的content，其次从文件读取
    let content = cfg.content || '';
    // 文件名匹配优先级：content_path/fileName > 直接name > 去括号name
    const nameNoParen = name.replace(/[（()）]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    // 去掉末尾的"使用"或"_使用"
    const nameStripped = nameNoParen.endsWith('使用') ? nameNoParen.slice(0, -2).replace(/_$/, '') : nameNoParen;
    const tryFiles = [
      cfg.content_path, cfg.fileName,
      name + '.txt', name + '.js', name + '.mjs', name + '.full.js',
      nameNoParen + '.txt', nameNoParen + '.js', nameNoParen + '.mjs', nameNoParen + '.full.js',
      nameStripped + '.txt', nameStripped + '.js', nameStripped + '.mjs', nameStripped + '.full.js',
    ].filter(Boolean);
    for (const tf of tryFiles) {
      const tfp = path.join(scriptDir, tf);
      if (fs.existsSync(tfp)) {
        content = fs.readFileSync(tfp, 'utf-8');
        break;
      }
    }

    if (!content) {
      console.warn(`  ⚠ 脚本内容为空: ${name}`);
    }

    const button = cfg.button || {};
    const buttons = button.buttons || [];

    scripts.push({
      type: 'script',
      enabled: cfg.enabled !== false,
      name: name,
      id: cfg.id || name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now(),
      content: content,
      info: cfg.info || '',
      button: {
        enabled: button.enabled === true,
        buttons: buttons.map(b => ({ name: b.name, visible: b.visible !== false })),
      },
      data: cfg.data || {},
      export_with: { data: true, button: true },
    });
  }

  return scripts;
}

// ===== 构建正则脚本 =====
function buildRegex(state) {
  const regexConfig = state.extensions?.regex_scripts;
  if (!Array.isArray(regexConfig)) return [];

  // 正则配置里已有完整的 findRegex/replaceString 等字段，直接使用
  return regexConfig.map(cfg => ({ ...cfg }));
}

// ===== 读取开场白 =====
function buildFirstMes(state) {
  const greetDir = path.join(CARD_DIR, '开场白');
  const firstPath = path.join(greetDir, '0.txt');
  if (fs.existsSync(firstPath)) {
    return fs.readFileSync(firstPath, 'utf-8');
  }
  return state.first_messages?.[0]?.content || '';
}

// ===== 读取头像base64 =====
function readAvatar() {
  if (fs.existsSync(AVATAR_PATH)) {
    const buf = fs.readFileSync(AVATAR_PATH);
    return 'data:image/png;base64,' + buf.toString('base64');
  }
  return '';
}

// ===== 主流程 =====
function main() {
  console.log('═══════════════════════════════════════');
  console.log('  角色卡打包工具 V3 (从源文件重建)');
  console.log('  不要玩弄我的鸡吧-forge');
  console.log('═══════════════════════════════════════');

  // 1. 读取配置
  console.log('\n[1/6] 读取tavern-cards-state.json...');
  const state = loadState();
  console.log(`  项目: ${state.projectName}, 世界书: ${state.worldbookName}`);

  // 2. 构建世界书条目
  console.log('\n[2/6] 构建世界书条目 (V3规范)...');
  const entries = buildEntries(state);
  const blueLights = entries.filter(e => e.enabled).length;
  console.log(`  条目总数: ${entries.length}, 蓝灯: ${blueLights}, 关灯: ${entries.length - blueLights}`);

  // 3. 构建脚本
  console.log('\n[3/6] 构建酒馆助手脚本...');
  const scripts = buildScripts(state);
  console.log(`  脚本总数: ${scripts.length}`);
  scripts.forEach(s => console.log(`    - ${s.name} | enabled=${s.enabled} | button.enabled=${s.button.enabled}`));

  // 4. 构建正则
  console.log('\n[4/6] 构建正则脚本...');
  const regex = buildRegex(state);
  console.log(`  正则总数: ${regex.length}`);

  // 5. 构建开场白和头像
  console.log('\n[5/6] 读取开场白和头像...');
  const firstMes = buildFirstMes(state);
  const avatar = readAvatar();
  console.log(`  开场白: ${firstMes.length} 字符`);
  console.log(`  头像: ${avatar ? '✓' : '✗'}`);

  // 6. 构建V3规范角色卡
  console.log('\n[6/6] 构建V3规范角色卡JSON...');
  const card = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: state.projectName,
      description: state.description || '',
      first_mes: firstMes,
      creator_notes: state.creator_notes || '',
      creator: state.creator || '',
      character_version: state.version || '1.0',
      alternate_greetings: [],
      extensions: {
        world: state.worldbookName,
        talkativeness: '0.5',
        fav: false,
        depth_prompt: {
          prompt: '',
          depth: 4,
          role: 'system',
        },
        regex_scripts: regex,
        tavern_helper: {
          scripts: scripts,
          variables: {},
        },
        cfMvuVarGroups: {},
        mvu_worldbook_name: state.worldbookName,
      },
      character_book: {
        name: state.worldbookName,
        description: '',
        scan_depth: null,
        token_budget: null,
        recursive_scanning: false,
        extensions: {},
        entries: entries,
      },
    },
  };

  // 写入JSON
  const jsonStr = JSON.stringify(card, null, 2);
  fs.writeFileSync(OUTPUT_PATH, jsonStr, 'utf-8');
  console.log(`\n✅ 打包完成: ${OUTPUT_PATH}`);
  console.log(`   文件大小: ${(jsonStr.length / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   世界书条目: ${entries.length} (蓝灯${blueLights}/关灯${entries.length - blueLights})`);
  console.log(`   脚本: ${scripts.length}, 正则: ${regex.length}`);

  // 验证
  console.log('\n════════════ 验证 ════════════');
  const verify = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
  console.log(`  spec: ${verify.spec} ${verify.spec_version}`);
  console.log(`  name: ${verify.data.name}`);
  console.log(`  world: ${verify.data.extensions.world}`);
  console.log(`  entries: ${verify.data.character_book.entries.length}`);
  console.log(`  first entry keys: ${Object.keys(verify.data.character_book.entries[0]).join(',')}`);
  console.log(`  first entry id: ${verify.data.character_book.entries[0].id}`);
  console.log(`  first entry enabled: ${verify.data.character_book.entries[0].enabled}`);
  console.log(`  scripts: ${verify.data.extensions.tavern_helper.scripts.length}`);
  console.log(`  regex: ${verify.data.extensions.regex_scripts.length}`);

  // 列出蓝灯条目
  const blues = verify.data.character_book.entries.filter(e => e.enabled);
  console.log(`\n  蓝灯条目 (${blues.length}):`);
  blues.forEach(e => console.log(`    ✓ ${e.comment} | depth=${e.extensions.depth} order=${e.insertion_order}`));
}

main();
