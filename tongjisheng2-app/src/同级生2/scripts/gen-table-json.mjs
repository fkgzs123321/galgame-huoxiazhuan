/**
 * 从 表格模板.txt (DDL) 生成 chatSheets JSON 格式的 表格模板JSON.txt
 * 严格遵循 raft_13 格式：
 *   1. 每张表 DDL 首列必须是 row_id INTEGER PRIMARY KEY
 *   2. content[0] header 数组长度必须与 DDL 列数严格相等
 *   3. 复杂字段（JSON 串、修饰符集合）压缩为单个 TEXT 列
 *   4. 顶层 mate 块 type=chatSheets version=2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const ddlPath = path.join(projectDir, '世界书', '系统', '表格模板.txt');
const outPath = path.join(projectDir, '世界书', '系统', '表格模板JSON.txt');

const ddlContent = fs.readFileSync(ddlPath, 'utf8');

// 提取所有 CREATE TABLE 块
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

// 表的中文 note（从 DDL 注释提取）
const tableNotes = {
  global_state: '全局状态表，仅 1 行。职责：时间/场景/难度/当前女角/不可逆状态计数',
  protagonist: '主角状态表，仅 1 行。职责：玩家身份/六维属性/三生存属性/三副状态/category 分段/经济/13 技能熟练度',
  economy: '经济状态表，仅 1 行。职责：金钱/储蓄/今日统计/累计统计/难度修正系数/三餐洗浴计数',
  inventory: '物品栏表，多行。职责：物品名/类别/数量/稀有度/价格/来源/使用记录',
  heroines: '女角表，20 行固定。职责：女角基础信息/4 维关系值/阶段/攻略状态/互斥组/30+ NSFW 字段',
  schedule: '日程表，多行。职责：寒假日程/时段/地点/事件/人物/金钱收支',
  events: '事件日志表，多行。职责：事件 ID/类型/时间/地点/参与人/结果/CG 触发',
  relationships: '关系网表，多行。职责：人物关系/敌友/信任度/互动记录',
  flags: '全局标记表，多行。职责：剧情 flag/计数器/互斥触发状态',
  options: '选项表，固定行数。职责：每轮选项/投票/分支决策',
  skills: '技能表，仅 1 行。职责：13 维技能熟练度/门槛档位',
  chronicle: '纪要表，多行。职责：事件编码 TL${day}_${MMDD}_${seq}/事件摘要/影响',
  records: '图鉴表，多行。职责：CG 编号/隐藏剧情/真结局达成'
};

const tableInitNode = {
  global_state: '开场白首轮回复时INSERT一行（row_id=1），后续禁止INSERT第二行。',
  protagonist: '开场白首轮回复时INSERT一行（row_id=1），后续禁止INSERT第二行。',
  economy: '开场白首轮回复时INSERT一行（row_id=1），后续禁止INSERT第二行。',
  inventory: '物品获得时INSERT新行（row_id自增），丢弃/消耗时DELETE。',
  heroines: '开场白首轮回复时INSERT 20 行（row_id=1~20），后续禁止INSERT/DELETE，只UPDATE。',
  schedule: '每日凌晨根据 day_count INSERT 当日 5 个时段行。',
  events: '事件发生时INSERT新行（row_id自增）。',
  relationships: '新关系建立时INSERT新行。',
  flags: 'flag 触发时INSERT新行。',
  options: '每轮回复开始时UPDATE固定行（覆盖上一轮选项）。',
  skills: '开场白首轮回复时INSERT一行（row_id=1），后续禁止INSERT第二行。',
  chronicle: '重要事件发生时INSERT新行（row_id自增），禁止UPDATE/DELETE。',
  records: 'CG/隐藏剧情触发时INSERT新行（row_id自增），禁止UPDATE/DELETE。'
};

const tableDeleteNode = {
  global_state: '禁止。',
  protagonist: '禁止。',
  economy: '禁止。',
  inventory: '物品消耗完时DELETE该行。',
  heroines: '禁止。',
  schedule: '禁止。',
  events: '禁止。',
  relationships: '关系破裂时可DELETE。',
  flags: '禁止。',
  options: '禁止。',
  skills: '禁止。',
  chronicle: '禁止。',
  records: '禁止。'
};

const tableUpdateNode = {
  global_state: '每轮回复结束时UPDATE唯一行。',
  protagonist: '每轮回复结束时UPDATE唯一行。',
  economy: '每轮回复结束时UPDATE唯一行。',
  inventory: '物品数量变化时UPDATE该行。',
  heroines: '每轮回复结束时UPDATE当前对话女角行（其他女角按需UPDATE）。',
  schedule: '当日时段事件发生时UPDATE对应时段行。',
  events: '事件状态变化时UPDATE该行。',
  relationships: '关系值变化时UPDATE该行。',
  flags: 'flag 状态变化时UPDATE该行。',
  options: '每轮回复开始时UPDATE固定行（覆盖上一轮选项）。',
  skills: '技能熟练度变化时UPDATE唯一行。',
  chronicle: '禁止UPDATE。',
  records: '禁止UPDATE。'
};

const tableInsertNode = {
  global_state: '禁止。此表有且仅有一行，不允许INSERT第二行。',
  protagonist: '禁止。此表有且仅有一行，不允许INSERT第二行。',
  economy: '禁止。此表有且仅有一行，不允许INSERT第二行。',
  inventory: '物品获得时INSERT新行（row_id自增）。',
  heroines: '禁止。此表固定 20 行，不允许INSERT/DELETE。',
  schedule: '每日凌晨INSERT当日 5 个时段行。',
  events: '事件发生时INSERT新行（row_id自增）。',
  relationships: '新关系建立时INSERT新行。',
  flags: 'flag 触发时INSERT新行。',
  options: '禁止。固定行数，只UPDATE覆盖。',
  skills: '禁止。此表有且仅有一行，不允许INSERT第二行。',
  chronicle: '重要事件发生时INSERT新行（row_id自增）。',
  records: 'CG/隐藏剧情触发时INSERT新行（row_id自增）。'
};

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
  let depth = 0;          // () 深度
  let braceDepth = 0;      // {} 深度（备用，字符串状态机已覆盖）
  let inStr = false;       // 是否在单引号字符串内
  let start = 0;
  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];
    if (inStr) {
      // 字符串内：只识别结束单引号（不处理 '' 转义，DDL 中无此情况）
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

  // 提取列名（第一个 token）
  const colNames = colDefs.map(d => {
    const m2 = d.match(/^(\w+)/);
    return m2 ? m2[1] : 'unknown';
  });

  // 提取每列的中文注释（DDL 格式: 列名 TYPE ..., -- 中文描述）
  // 对齐 raft_13 的中文 header 方案，让用户在 chatSheets UI 中看到中文字段名
  const commentMap = {};
  for (const l of body.split('\n')) {
    const idx = l.indexOf('--');
    if (idx < 0) continue;
    const comment = l.slice(idx + 2).trim();
    const code = l.slice(0, idx).trim();
    const nameMatch = code.match(/^(\w+)/);
    if (nameMatch && comment) {
      commentMap[nameMatch[1]] = comment;
    }
  }

  // 生成表头（中文表头，与 DDL 注释一致）
  // - SyncBridge 的 matchesSheetHeader 支持：header === sqlName || header === comment
  // - 用 DDL 的 -- 注释作为表头，SyncBridge 通过 comment 匹配
  // - row_id 特殊处理：SyncBridge 支持 header='行号' 的别名
  const header = colNames.map((name, idx) => {
    if (idx === 0 && name === 'row_id') return 'row_id';
    return commentMap[name] || name;
  });

  // 生成 sheet 对象
  // DDL 必须保留 -- 注释，SyncBridge 通过 header === comment 匹配中文表头
  // 参考 raft_13：列代码末尾有逗号（除最后一列），注释末尾绝不能有逗号
  const sheetKey = `sheet_${Math.random().toString(36).slice(2, 10)}`;
  const rawLines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
  const lastIdx = rawLines.length - 1;
  const ddlLines = rawLines.map((line, i) => {
    // 分离代码与注释
    const idx = line.indexOf('--');
    let code, comment;
    if (idx >= 0) {
      code = line.slice(0, idx).trim();
      comment = line.slice(idx); // 含 -- 前缀
    } else {
      code = line;
      comment = '';
    }
    // 规范化：去掉代码末尾逗号，再按位置决定是否加逗号
    code = code.replace(/,\s*$/, '');
    const isLast = (i === lastIdx);
    if (!isLast) code += ',';
    return '  ' + code + (comment ? ' ' + comment : '');
  });
  const ddl = `CREATE TABLE IF NOT EXISTS ${tableName} ( -- ${cnName}\n${ddlLines.join('\n')}\n);`;

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

  console.log(`  ${tableName}: ${colNames.length} cols, header ${header.length} items (中文表头)`);
}

// 写入文件（单行紧凑 JSON）
const jsonStr = JSON.stringify(result);
fs.writeFileSync(outPath, jsonStr, 'utf8');
console.log(`\nGenerated ${outPath} (${(jsonStr.length / 1024).toFixed(1)} KB, ${tableBlocks.length} tables)`);
