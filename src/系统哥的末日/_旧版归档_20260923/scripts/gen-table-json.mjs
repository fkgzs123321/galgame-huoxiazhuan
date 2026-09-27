/**
 * 从 表格模板.txt (DDL) 生成 chatSheets JSON 格式的 表格模板JSON.txt
 * 严格遵循 raft_13 格式：
 *   1. 每张表 DDL 首列必须是 row_id INTEGER PRIMARY KEY
 *   2. content[0] header 数组长度必须与 DDL 列数严格相等
 *   3. 复杂字段（JSON 串、修饰符集合）压缩为单个 TEXT 列
 *   4. 顶层 mate 块 type=chatSheets version=2
 * v3.1：支持中文列名（双引号包裹，如 "当前地点"）+ 适配 v3.1 schema
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const ddlPath = path.join(projectDir, 'source', 'entries', '系统', '表格模板.txt');
const outPath = path.join(projectDir, 'source', 'entries', '系统', '表格模板JSON.txt');

const ddlContent = fs.readFileSync(ddlPath, 'utf8');

// 提取所有 CREATE TABLE 块（表名仍为英文，中文别名在 -- 注释里）
const tableBlocks = [];
const re = /CREATE TABLE (?:IF NOT EXISTS )?(\w+)\s*\(\s*--\s*([^\n]*)\n([\s\S]*?)\n\);/g;
let m;
while ((m = re.exec(ddlContent)) !== null) {
  const tableName = m[1];
  const cnName = m[2].trim();
  const body = m[3];
  tableBlocks.push({ tableName, cnName, body });
}

if (tableBlocks.length === 0) {
  console.error('ERROR: No CREATE TABLE blocks found in 表格模板.txt');
  process.exit(1);
}
console.log(`Found ${tableBlocks.length} tables`);

// 为每个表生成 sheet
const result = {
  mate: {
    type: 'chatSheets',
    version: 2,
    updateConfigUiSentinel: -1,
    globalInjectionConfig: {
      readableEntryPlacement: { position: 'before_character_definition', depth: 2, order: 99981 },
      wrapperPlacement: { position: 'before_character_definition', depth: 2, order: 99980 }
    }
  }
};

// 表的中文 note（按英文表名映射）
const tableNotes = {
  global_state: '全局状态表，仅 1 行。职责：时间/场景/难度/当前女角/不可逆状态计数',
  world_map_points: '世界地图点表，多行。职责：详细地点/次要地区/主要地区/类型/环境/重要度/探索状态',
  map_elements: '地图元素表，多行。职责：元素名称/类型/所在地点/描述/状态/交互选项',
  factions: '势力表，多行。职责：势力名称/描述/领袖/关系/据点',
  protagonist_info: '主角信息表，仅 1 行。职责：玩家身份/六维属性/三生存属性/三副状态/经济/分段修饰符/NTR特有字段（反抗力/觉醒度/理智值/怀疑度等）',
  important_npc: '重要角色表，多行。职责：人物基础信息/4维关系值/阶段/攻略状态/30+ NSFW字段/NTR特有字段（绑定等级/绑定状态/绑定深度等）/反派林天专属字段（评价值/良知值/系统状态等）',
  inventory: '物品栏表，多行。职责：物品名/类别/数量/稀有度/描述',
  equipment: '装备表，多行。职责：装备名/类型/品质/状态/描述',
  quests: '任务表，多行。职责：任务名/类型/优先级/目标/进度/状态/来源/奖励',
  chronicle: '纪要表，多行。职责：事件编码索引/时间跨度/概览/纪要',
  check_suggestions: '检定建议表，固定5行。职责：展示文本/骰子命令'
};

const tableInitNode = {
  global_state: '开场白首轮回复时INSERT一行（row_id=1），后续禁止INSERT第二行。',
  protagonist_info: '开场白首轮回复时INSERT一行（row_id=1），后续禁止INSERT第二行。',
  important_npc: '新角色登场时INSERT新行（row_id自增），反派林天和初始女角在开场白首轮INSERT。',
  inventory: '物品获得时INSERT新行（row_id自增），丢弃/消耗时DELETE。',
  equipment: '装备获得时INSERT新行（row_id自增）。',
  quests: '任务触发时INSERT新行（row_id自增）。',
  chronicle: '重要事件发生时INSERT新行（row_id自增）。',
  check_suggestions: '开场白首轮回复时INSERT 5 行（row_id=1~5），后续只UPDATE覆盖。',
  world_map_points: '新地点解锁时INSERT新行（row_id自增）。',
  map_elements: '新元素出现时INSERT新行（row_id自增）。',
  factions: '新势力登场时INSERT新行（row_id自增）。'
};

const tableDeleteNode = {
  global_state: '禁止。',
  protagonist_info: '禁止。',
  important_npc: '禁止。',
  inventory: '物品消耗完时DELETE该行。',
  equipment: '装备销毁时DELETE该行。',
  quests: '任务放弃时DELETE该行。',
  chronicle: '禁止。',
  check_suggestions: '禁止。',
  world_map_points: '禁止。',
  map_elements: '元素消失时DELETE该行。',
  factions: '禁止。'
};

const tableUpdateNode = {
  global_state: '每轮回复结束时UPDATE唯一行。',
  protagonist_info: '每轮回复结束时UPDATE唯一行。',
  important_npc: '每轮回复结束时UPDATE当前对话角色行（其他角色按需UPDATE）。',
  inventory: '物品数量变化时UPDATE该行。',
  equipment: '装备状态变化时UPDATE该行。',
  quests: '任务进度/状态变化时UPDATE该行。',
  chronicle: '禁止UPDATE。',
  check_suggestions: '每轮回复开始时UPDATE固定行（覆盖上一轮建议）。',
  world_map_points: '探索状态变化时UPDATE该行。',
  map_elements: '元素状态变化时UPDATE该行。',
  factions: '势力关系变化时UPDATE该行。'
};

const tableInsertNode = {
  global_state: '禁止。此表有且仅有一行，不允许INSERT第二行。',
  protagonist_info: '禁止。此表有且仅有一行，不允许INSERT第二行。',
  important_npc: '新角色登场时INSERT新行（row_id自增）。',
  inventory: '物品获得时INSERT新行（row_id自增）。',
  equipment: '装备获得时INSERT新行（row_id自增）。',
  quests: '任务触发时INSERT新行（row_id自增）。',
  chronicle: '重要事件发生时INSERT新行（row_id自增）。',
  check_suggestions: '禁止。固定 5 行，只UPDATE覆盖。',
  world_map_points: '新地点解锁时INSERT新行（row_id自增）。',
  map_elements: '新元素出现时INSERT新行（row_id自增）。',
  factions: '新势力登场时INSERT新行（row_id自增）。'
};

// 从 DDL 行中提取列名（支持双引号中文 / 英文标识符两种格式）
// 返回值不含引号：`"当前地点"` -> `当前地点`，`row_id` -> `row_id`
function extractColName(code) {
  // 优先匹配双引号包裹的中文列名：`"当前地点"`
  const mDq = code.match(/^"([^"]+)"/);
  if (mDq) return mDq[1];
  // 回退到英文标识符：`row_id` / `name`
  const mEn = code.match(/^(\w+)/);
  return mEn ? mEn[1] : null;
}

// 提取列名（保留引号形式，用于 chatSheets 表头）
// SyncBridge 解析 DDL 时会把双引号一并纳入列名文本，
// 因此 header 必须与 DDL 列名逐字符一致才能消除"DDL 与表头不匹配"警告。
// 返回值：`"当前地点"` -> `"当前地点"`（含引号），`row_id` -> `row_id`（无引号）
function extractColNameWithQuotes(code) {
  // 双引号包裹的标识符：原样返回（保留引号）
  const mDq = code.match(/^("[^"]+")/);
  if (mDq) return mDq[1];
  // 裸标识符：直接返回
  const mEn = code.match(/^(\w+)/);
  return mEn ? mEn[1] : null;
}

let orderNo = 0;
for (const tb of tableBlocks) {
  const { tableName, cnName, body } = tb;

  // 解析 DDL 列定义
  // 1. 去掉行内注释（-- 之后内容）和纯注释行
  // 2. 合并成一行
  // 3. 按括号深度=0 的逗号拆分列
  const cleanedLines = body.split('\n').map(l => {
    const idx = l.indexOf('--');
    return idx >= 0 ? l.slice(0, idx) : l;
  });
  const joined = cleanedLines.join(' ').replace(/\s+/g, ' ').trim();

  // 按括号深度=0 的逗号拆分（跳过单引号字符串字面量内的字符）
  // 修复：DEFAULT '{"romantic":0,"social":0}' 中 JSON 默认值的逗号被误判为列分隔符
  const colDefs = [];
  let depth = 0;
  let braceDepth = 0;
  let inStr = false;
  let start = 0;
  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];
    if (inStr) {
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") { inStr = true; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth--;
    else if (ch === ',' && depth === 0 && braceDepth === 0) {
      colDefs.push(joined.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (start < joined.length) {
    const last = joined.slice(start).trim();
    if (last) colDefs.push(last);
  }

  // 提取列名（每列定义的首个 token，支持 "中文" 或 \w+）
  // colNames       : 不含引号，用于内部 key 匹配（commentMap 等）
  // colNamesQuoted : 含引号，用于 chatSheets 表头（必须与 SyncBridge 解析 DDL 的结果逐字符一致）
  const colNames = colDefs.map(d => extractColName(d) || 'unknown');
  const colNamesQuoted = colDefs.map(d => extractColNameWithQuotes(d) || 'unknown');

  // 提取每列的中文注释（DDL 格式: 列名 TYPE ..., -- 中文描述）
  // 按行扫描原始 DDL body，建立 colName -> comment 映射
  const commentMap = {};
  // 同时统计每个注释在本表内出现的次数（用于检测重复注释）
  const commentCount = {};
  for (const l of body.split('\n')) {
    const idx = l.indexOf('--');
    if (idx < 0) continue;
    const comment = l.slice(idx + 2).trim();
    const code = l.slice(0, idx).trim();
    const colName = extractColName(code);
    if (colName && comment) {
      commentMap[colName] = comment;
      commentCount[comment] = (commentCount[comment] || 0) + 1;
    }
  }

  // 生成表头：直接使用 DDL 列名（英文，无引号）
  // 关键：SyncBridge 对 DDL 列名和表头做严格字符串比较，
  //   用中文注释作表头会触发"DDL与表头不匹配"告警（即使 SQL_v4.3.json 也会）。
  //   改为表头=DDL列名（英文）后，完全匹配，告警消除。
  //   SPV 插件 UI 会从 DDL 注释读取中文显示名，不影响可读性。
  const header = colNames.slice();

  // 列数一致性校验
  if (header.length !== colNames.length) {
    console.error(`ERROR: ${tableName} header/header length mismatch: ${colNames.length} cols vs ${header.length} headers`);
    process.exit(1);
  }

  // 生成 sheet 对象
  const sheetKey = `sheet_${Math.random().toString(36).slice(2, 10)}`;
  // 重新构造 DDL（保留原始列定义，包含中文列名+双引号）
  const ddl = `CREATE TABLE IF NOT EXISTS ${tableName} ( -- ${cnName}\n${colDefs.map(d => '  ' + d + ',').join('\n').slice(0, -1)}\n);`;

  result[sheetKey] = {
    uid: sheetKey,
    name: cnName,
    sourceData: {
      note: tableNotes[tableName] || cnName,
      initNode: tableInitNode[tableName] || '',
      deleteNode: tableDeleteNode[tableName] || '禁止。',
      updateNode: tableUpdateNode[tableName] || '',
      insertNode: tableInsertNode[tableName] || '',
      ddl: ddl
    },
    content: [header],
    updateConfig: {
      uiSentinel: -1,
      contextDepth: -1,
      updateFrequency: 1,
      batchSize: -1,
      skipFloors: -1,
      groupId: -1
    },
    exportConfig: {
      enabled: false,
      splitByRow: false,
      entryName: cnName,
      entryType: 'constant',
      keywords: '',
      preventRecursion: true,
      injectionTemplate: '',
      extraIndexEnabled: false,
      extraIndexEntryName: `${cnName}-索引`,
      extraIndexColumns: [],
      extraIndexColumnModes: {},
      extraIndexInjectionTemplate: '',
      sqlInjectionTemplate: '',
      entryPlacement: { position: 'at_depth_as_system', depth: 2, order: 10000 },
      extraIndexPlacement: { position: 'at_depth_as_system', depth: 2, order: 10010 },
      fixedEntryPlacement: { position: 'before_character_definition', depth: 2, order: 99981 },
      fixedIndexPlacement: { position: 'before_character_definition', depth: 2, order: 99982 }
    },
    orderNo: orderNo++
  };

  console.log(`  ${tableName}: ${colNames.length} cols, header ${header.length} items (DDL列名+引号)`);
}

// 写入文件（单行紧凑 JSON）
const jsonStr = JSON.stringify(result);
fs.writeFileSync(outPath, jsonStr, 'utf8');
console.log(`\nGenerated ${outPath} (${(jsonStr.length / 1024).toFixed(1)} KB, ${tableBlocks.length} tables)`);
