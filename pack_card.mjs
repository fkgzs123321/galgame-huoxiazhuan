// pack_card.mjs - 不要玩弄我的鸡吧-forge 角色卡打包脚本
// 读取所有源文件，更新到现有PNG的ccv3/chara chunk中
// 用法: node pack_card.mjs

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

// 基于脚本位置动态解析项目路径，避免硬编码
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARD_DIR = path.join(__dirname, 'src', '不要玩弄我的鸡吧-forge');
const PNG_PATH = path.join(CARD_DIR, '不要玩弄我的鸡吧-forge.png');
const STATE_PATH = path.join(CARD_DIR, 'tavern-cards-state.json');
const OUTPUT_PATH = PNG_PATH; // 覆盖原文件

// ===== PNG chunk 工具 =====
function readChunks(buf) {
  const chunks = [];
  let off = 8; // 跳过PNG签名
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const dataStart = off + 8;
    const dataEnd = dataStart + len;
    const crc = buf.readUInt32BE(dataEnd);
    chunks.push({ type, data: buf.slice(dataStart, dataEnd), crc, off, len });
    if (type === 'IEND') break;
    off = dataEnd + 4;
  }
  return chunks;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = zlib.crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makeTextChunk(keyword, text) {
  // tEXt: keyword\0text
  const kwBuf = Buffer.from(keyword, 'ascii');
  const nullBuf = Buffer.alloc(1, 0);
  const textBuf = Buffer.from(text, 'ascii'); // base64是ASCII
  return makeChunk('tEXt', Buffer.concat([kwBuf, nullBuf, textBuf]));
}

// ===== 读取现有PNG =====
function readExistingCard(pngPath) {
  const buf = fs.readFileSync(pngPath);
  const chunks = readChunks(buf);
  let ccv3Obj = null;
  let charaObj = null;
  let charaCardV3Obj = null; // 兼容旧版PNG的关键词 'chara_card_v3'

  for (const c of chunks) {
    if (c.type === 'tEXt') {
      const kwEnd = c.data.indexOf(0);
      const kw = c.data.toString('ascii', 0, kwEnd);
      const b64 = c.data.toString('ascii', kwEnd + 1);
      try {
        const json = Buffer.from(b64, 'base64').toString('utf8');
        if (kw === 'ccv3') ccv3Obj = JSON.parse(json);
        else if (kw === 'chara') charaObj = JSON.parse(json);
        else if (kw === 'chara_card_v3') charaCardV3Obj = JSON.parse(json);
      } catch (e) {
        console.warn(`  ⚠ 解码 ${kw} chunk 失败: ${e.message}`);
      }
    }
  }

  // 回退策略：如果 ccv3Obj 为 null，尝试从 chara_card_v3 或 chara 回退
  // （旧版PNG可能用 'chara_card_v3' 关键词，且 chara chunk 也是 v3 格式）
  if (!ccv3Obj) {
    if (charaCardV3Obj) {
      console.log('  ℹ ccv3 chunk 未找到，回退到 chara_card_v3 chunk');
      ccv3Obj = charaCardV3Obj;
    } else if (charaObj && charaObj.spec === 'chara_card_v3') {
      console.log('  ℹ ccv3 chunk 未找到，回退到 chara chunk (v3 格式)');
      ccv3Obj = charaObj;
    }
  }

  return { chunks, ccv3Obj, charaObj };
}

// ===== 构建条目名→文件路径映射 =====
function buildEntryPathMap(state) {
  const map = {};
  const manifest = state.entryManifest;
  if (!manifest) return map;
  for (const category of Object.keys(manifest)) {
    const entries = manifest[category];
    if (!entries || typeof entries !== 'object') continue;
    for (const entryName of Object.keys(entries)) {
      const entry = entries[entryName];
      if (entry && entry.path) {
        map[entryName] = entry.path;
      }
    }
  }
  return map;
}

// ===== 构建条目名→state.json完整对象映射（含 enabled/position/depth/order） =====
function buildEntryStateMap(state) {
  const map = {};
  const manifest = state.entryManifest;
  if (!manifest) return map;
  for (const category of Object.keys(manifest)) {
    const entries = manifest[category];
    if (!entries || typeof entries !== 'object') continue;
    for (const entryName of Object.keys(entries)) {
      const entry = entries[entryName];
      if (entry && entry.path) {
        map[entryName] = entry;
      }
    }
  }
  return map;
}

// ===== 文件匹配函数（模块级，供 updateWorldbook 和 addMissingWorldbookEntries 共用）=====
const MATCH_PREFIXES = ['[mvu_plot]', '[mvu_update]', '[SPV]', '[initvar]', '[InitVar]', '[控制中心]'];

function findMatch(comment, entryPathMap) {
  const manifestKeys = Object.keys(entryPathMap);
  // 精确匹配
  if (entryPathMap[comment]) return entryPathMap[comment];
  // 前缀匹配（comment被截断，key以comment开头）
  for (const k of manifestKeys) {
    if (k.startsWith(comment) && k.length - comment.length <= 5) return entryPathMap[k];
  }
  // 去前缀匹配
  for (const pfx of MATCH_PREFIXES) {
    const withPfx = pfx + comment;
    if (entryPathMap[withPfx]) return entryPathMap[withPfx];
    for (const k of manifestKeys) {
      if (k === withPfx) return entryPathMap[k];
    }
  }
  // comment带前缀，但manifest中不带前缀
  for (const pfx of MATCH_PREFIXES) {
    if (comment.startsWith(pfx)) {
      const stripped = comment.slice(pfx.length);
      if (entryPathMap[stripped]) return entryPathMap[stripped];
      for (const k of manifestKeys) {
        if (k.startsWith(stripped) && k.length - stripped.length <= 5) return entryPathMap[k];
      }
    }
  }
  // 文件系统回退：直接尝试从 世界书/ 目录查找文件
  for (const pfx of MATCH_PREFIXES) {
    const withPfx = pfx + comment;
    const fp = path.join(CARD_DIR, '世界书', withPfx + '.txt');
    if (fs.existsSync(fp)) return '世界书\\' + withPfx + '.txt';
  }
  // 不带前缀直接查找
  const fp2 = path.join(CARD_DIR, '世界书', comment + '.txt');
  if (fs.existsSync(fp2)) return '世界书\\' + comment + '.txt';
  // ★ 搜索 世界书/变量/ 子目录（MVU 4件套）
  const subDirs = ['变量'];
  for (const sub of subDirs) {
    // 带前缀
    for (const pfx of MATCH_PREFIXES) {
      const withPfx = pfx + comment;
      const fpSub = path.join(CARD_DIR, '世界书', sub, withPfx + '.txt');
      if (fs.existsSync(fpSub)) return `世界书\\${sub}\\${withPfx}.txt`;
      // .yaml 扩展名
      const fpYaml = path.join(CARD_DIR, '世界书', sub, withPfx + '.yaml');
      if (fs.existsSync(fpYaml)) return `世界书\\${sub}\\${withPfx}.yaml`;
    }
    // 不带前缀
    const fpSub2 = path.join(CARD_DIR, '世界书', sub, comment + '.txt');
    if (fs.existsSync(fpSub2)) return `世界书\\${sub}\\${comment}.txt`;
    const fpYaml2 = path.join(CARD_DIR, '世界书', sub, comment + '.yaml');
    if (fs.existsSync(fpYaml2)) return `世界书\\${sub}\\${comment}.yaml`;
  }
  // 特殊映射：XXX_多阶段 → [mvu_plot]XXX_NSW档案.txt
  if (comment.endsWith('_多阶段')) {
    const name = comment.slice(0, -4); // 去掉"_多阶段"
    const nswName = '[mvu_plot]' + name + '_NSW档案';
    const fp3 = path.join(CARD_DIR, '世界书', nswName + '.txt');
    if (fs.existsSync(fp3)) return '世界书\\' + nswName + '.txt';
  }
  return null;
}

// ===== 更新世界书条目 =====
function updateWorldbook(ccv3Obj, entryPathMap) {
  if (!ccv3Obj.data || !ccv3Obj.data.character_book) return 0;
  const entries = ccv3Obj.data.character_book.entries;
  if (!Array.isArray(entries)) return 0;
  let updated = 0;
  let missing = 0;

  let commentUpdated = 0;
  for (const entry of entries) {
    const comment = entry.comment;
    if (!comment) { missing++; continue; }
    const relPath = findMatch(comment, entryPathMap);
    if (!relPath) { missing++; continue; }
    const fullPath = path.join(CARD_DIR, relPath.replace(/\\/g, '/'));
    if (fs.existsSync(fullPath)) {
      entry.content = fs.readFileSync(fullPath, 'utf-8');
      // ★ 同步 entry.comment 为文件名（去掉扩展名），确保与 state.json 条目名对齐
      // 修复：path.basename(relPath, '.txt') 只能去 .txt，对 .yaml 无效会留下 .yaml 后缀
      // 解决：PNG中旧 comment=[mvu_plot]变量输出格式，重命名后文件名=[mvu_update]变量输出格式.txt
      let newComment = path.basename(relPath).replace(/\\/g, '/');
      if (newComment.endsWith('.txt')) newComment = newComment.slice(0, -4);
      else if (newComment.endsWith('.yaml')) newComment = newComment.slice(0, -5);
      if (newComment && newComment !== comment) {
        entry.comment = newComment;
        commentUpdated++;
      }
      updated++;
    } else {
      console.warn(`  ⚠ 文件不存在: ${fullPath}`);
      missing++;
    }
  }
  if (commentUpdated > 0) {
    console.log(`  世界书 comment 同步: ${commentUpdated}条 (旧名字→新名字)`);
  }
  console.log(`  世界书: 更新${updated}条, 未匹配${missing}条 (共${entries.length}条)`);
  return updated;
}

// ===== 添加缺失的世界书条目 =====
function addMissingWorldbookEntries(ccv3Obj, entryPathMap, entryStateMap) {
  if (!ccv3Obj.data || !ccv3Obj.data.character_book) return;
  const entries = ccv3Obj.data.character_book.entries;
  const wbDir = path.join(CARD_DIR, '世界书');
  // ★ 读取根目录 + 变量子目录的所有文件
  const rootFiles = fs.readdirSync(wbDir).filter(f => f.endsWith('.txt') || f.endsWith('.yaml'));
  const allFiles = [...rootFiles];
  // 读取 变量/ 子目录
  const varDir = path.join(wbDir, '变量');
  if (fs.existsSync(varDir)) {
    const varFiles = fs.readdirSync(varDir).filter(f => f.endsWith('.txt') || f.endsWith('.yaml'));
    for (const vf of varFiles) {
      allFiles.push('变量/' + vf);
    }
  }

  // 构建已有条目的comment集合（用于去重）
  const existingComments = new Set(entries.map(e => e.comment));

  let added = 0;
  let nextId = entries.length > 0 ? Math.max(...entries.map(e => e.id || 0)) + 1 : 0;

  for (const fileName of allFiles) {
    const relPath = '世界书/' + fileName;
    const relPathWin = '世界书\\' + fileName;

    // 从文件名提取条目名（去掉路径前缀和扩展名）
    // 例：变量/变量列表.txt → 变量列表；[mvu_update]加载器.txt → [mvu_update]加载器
    const baseName = path.basename(fileName);
    let entryName = baseName.replace(/\.(txt|yaml)$/, '');

    // 如果已经存在同名条目，跳过（基于PNG实际条目，而非entryPathMap）
    if (existingComments.has(entryName)) continue;

    // 读取文件内容
    const fp = path.join(wbDir, fileName);
    const content = fs.readFileSync(fp, 'utf-8');

    // 跳过空文件或测试文件
    if (!content.trim() || fileName.startsWith('__')) continue;

    // 解析条目配置（从文件内容中提取）
    // 默认配置：constant, at_depth 0, system, order 100
    let isConstant = true;
    let isSelective = false;
    let keys = [];
    let order = 100;
    let depth = 0;

    // 检查是否有@@generate_before（EJS条目）
    const hasEjs = content.includes('@@generate_before') || content.includes('<%');

    // 从内容中提取关键词
    const keyMatch = content.match(/(?:关键词|keys?)[:：]\s*(.+)/i);
    if (keyMatch) {
      keys = keyMatch[1].split(/[,，、]/).map(k => k.trim()).filter(Boolean);
      if (keys.length > 0) {
        isSelective = true;
        isConstant = false;
      }
    }

    // 创建新条目
    const newEntry = {
      id: nextId++,
      keys: keys,
      secondary_keys: [],
      comment: entryName,
      content: content,
      constant: isConstant,
      selective: isSelective,
      insertion_order: order,
      enabled: true,
      position: 'at_depth',
      use_regex: false,
      extensions: {
        position: 'at_depth',
        depth: depth,
        role: 'system',
        selective_logic: 0,
        add_recursion: false,
        prevent_recursion: false,
        delay_until_recursion: false,
        probability: 100,
        disable: false,
        vectorized: false,
        display_index: entries.length + added
      }
    };

    entries.push(newEntry);
    existingComments.add(entryName);
    added++;
  }

  if (added > 0) {
    console.log(`  世界书新增: ${added}条 (从文件系统补充)`);
  }

  // === enabled 对齐：从 state.json 动态读取 + 系统必需EJS条目保底 ===
  // ★ 之前用硬编码白名单导致 [mvu_update]变量更新规则、[SPV]SQL填表规则 被错误关灯
  //   state.json enabled=true 的条目必须亮灯，否则 AI 看不到变量更新路径/格式
  // ★ [initvar]初始变量 必须 enabled=false（MVU 框架按条目名扫描读取，启用反而把 YAML 塞进提示词）

  // 1. 系统 EJS 必需条目（@@generate_before，亮灯才执行 EJS 代码）
  // ★ 双AI路由：[mvu_plot]前缀只发剧情AI，[mvu_update]前缀只发变量AI，无前缀双发
  const SYSTEM_EJS_REQUIRED = new Set([
    '[mvu_plot]D0系统控制器',           // 剧情 AI 总控调度
    '[mvu_plot][控制中心]功能开关与配置', // 剧情 AI 侧功能开关
  ]);

  // 2. 从 state.json 读取 enabled=true 的条目（蓝灯/常驻）
  const stateEnabled = new Set();
  for (const [name, e] of Object.entries(entryStateMap)) {
    if (e && e.enabled === true) stateEnabled.add(name);
  }

  // 2b. 从 state.json 读取 strategy.type="selective" 的条目（绿灯/关键词触发）
  // ★ state.json 中 enabled=false + strategy.type=selective 表示"绿灯"而非"关灯"
  //   state.json 的 enabled 字段语义：true=蓝灯(常驻), false=非蓝灯(可能绿灯或关灯)
  //   strategy.type=selective 的条目应该在 PNG 中 enabled=true + selective=true + keys=[...]
  const stateSelective = new Set();
  for (const [name, e] of Object.entries(entryStateMap)) {
    if (e && e.strategy && e.strategy.type === 'selective') stateSelective.add(name);
  }

  // 3. [initvar] 强制关灯（MVU 框架按条目名扫描 [initvar] 小写前缀加载 YAML，亮灯会把 YAML 塞进提示词）
  const FORCE_DISABLED = new Set(['[initvar]请勿打开', '[InitVar]请勿打开']); // 兼容大小写

  let enabledCount = 0;
  let disabledCount = 0;
  const enabledNames = [];
  for (const entry of entries) {
    const shouldBeEnabled = (SYSTEM_EJS_REQUIRED.has(entry.comment) || stateEnabled.has(entry.comment) || stateSelective.has(entry.comment))
                            && !FORCE_DISABLED.has(entry.comment);
    if (shouldBeEnabled) {
      if (!entry.enabled) { entry.enabled = true; }
      enabledCount++;
      enabledNames.push(entry.comment);
    } else {
      if (entry.enabled) { entry.enabled = false; }
      disabledCount++;
    }
  }
  console.log(`  世界书enabled对齐: 亮灯${enabledCount}条, 关灯${disabledCount}条`);
  console.log(`    亮灯列表: ${enabledNames.join(', ')}`);

  // === 递归双禁：参照 worldbook.md §2.1，所有条目默认双禁防止 token 膨胀 ===
  // prevent_incoming: true = 不可被其他条目激活
  // prevent_outgoing: true = 不激活其他条目
  // 读取变量/规则/常驻条目内容全是字段名/角色名，不禁 outgoing 会每轮连锁拉起一串 keyed 条目
  let recursionDisabled = 0;
  for (const entry of entries) {
    if (!entry.extensions) entry.extensions = {};
    // V3 格式字段
    if (entry.extensions.prevent_incoming !== true) { entry.extensions.prevent_incoming = true; }
    if (entry.extensions.prevent_outgoing !== true) { entry.extensions.prevent_outgoing = true; }
    // 兼容旧字段名
    if (!entry.prevent_incoming) entry.prevent_incoming = true;
    if (!entry.prevent_outgoing) entry.prevent_outgoing = true;
    // extensions.extensions 兼容（部分 ST 版本嵌套）
    if (!entry.extensions.extensions) entry.extensions.extensions = {};
    entry.extensions.extensions.prevent_incoming = true;
    entry.extensions.extensions.prevent_outgoing = true;
    recursionDisabled++;
  }
  console.log(`  递归双禁: ${recursionDisabled}条已配置 prevent_incoming+prevent_outgoing`);

  // === 从 state.json 同步亮灯条目的 depth/order/position 元数据 ===
  // pack_card 只更新 content，但 depth/order/position 保留 PNG 原值（可能过时）
  // 从 state.json 读取正确配置，同步到亮灯条目
  // ST ccv3 格式：position 和 extensions.position 都必须是数字枚举：0=before_char, 1=after_char, 2=before_an, 3=after_an, 4=at_depth
  // ★ 修复 bug：entry.position 之前被赋值为字符串（如 'before_character_definition'），导致 ST 无法识别条目位置，思维链等蓝灯条目加载失败
  const POSITION_MAP = {
    before_character_definition: 0,
    after_character_definition: 1,
    before_an: 2,
    after_an: 3,
    at_depth: 4,
    before_char: 0,
    after_char: 1,
  };
  let metaSynced = 0;
  for (const entry of entries) {
    if (!entry.enabled) continue; // 只同步亮灯条目
    const stateEntry = entryStateMap[entry.comment];
    if (!stateEntry || !stateEntry.position) continue;
    const pos = stateEntry.position;
    // 同步 position（必须为数字枚举，不能是字符串）
    if (pos.type) {
      const posNum = POSITION_MAP[pos.type] ?? 0;
      entry.position = posNum;          // V3 顶层 position 字段（数字枚举）
      if (!entry.extensions) entry.extensions = {};
      entry.extensions.position = posNum; // 扩展字段也必须是数字枚举
    }
    // 同步 extensions.depth / extensions.role
    if (!entry.extensions) entry.extensions = {};
    if (typeof pos.depth === 'number') {
      entry.extensions.depth = pos.depth;
      entry.depth = pos.depth; // V3 顶层 depth 字段
    }
    if (pos.role) entry.extensions.role = pos.role === 'system' ? 0 : (pos.role === 'user' ? 1 : 2);
    if (typeof pos.order === 'number') {
      entry.insertion_order = pos.order;
      entry.order = pos.order;
    }
    metaSynced++;
  }
  if (metaSynced > 0) {
    console.log(`  世界书元数据同步: ${metaSynced}个亮灯条目 (depth/order/position 从 state.json)`);
  }

  // === 从 state.json 同步 selective/keys 设置（绿灯条目关键词配置）===
  // ★ 对于 strategy.type="selective" 的条目，必须在 PNG 中设置：
  //   selective=true, constant=false, keys=[关键词列表]
  //   否则条目虽然 enabled=true 但无关键词，无法被角色名激活
  let selectiveSynced = 0;
  for (const entry of entries) {
    if (!entry.enabled) continue; // 只同步亮灯条目
    const stateEntry = entryStateMap[entry.comment];
    if (!stateEntry || !stateEntry.strategy) continue;
    
    if (stateEntry.strategy.type === 'selective') {
      entry.selective = true;
      entry.constant = false;
      const keys = stateEntry.strategy.keys || [];
      entry.keys = keys;
      if (!entry.extensions) entry.extensions = {};
      entry.extensions.selective_logic = 0; // AND logic
      selectiveSynced++;
    } else if (stateEntry.strategy.type === 'constant') {
      entry.constant = true;
      entry.selective = false;
      selectiveSynced++;
    }
  }
  if (selectiveSynced > 0) {
    console.log(`  世界书selective同步: ${selectiveSynced}个条目 (selective/keys 从 state.json)`);
  }

  // === 去重：删除不带前缀的重复条目（分控 getwi 调用的是带 [mvu_plot] 前缀的版本）===
  // 例：PNG里同时有 "林婉清_基础信息" 和 "[mvu_plot]林婉清_基础信息"，保留后者删除前者
  const DUP_PREFIXES = ['[mvu_plot]', '[mvu_update]', '[SPV]', '[initvar]', '[InitVar]', '[控制中心]'];
  const commentSet = new Set(entries.map(e => e.comment));
  let dedupRemoved = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const c = entries[i].comment;
    if (!c || c.startsWith('[')) continue; // 带前缀的保留
    // 检查是否存在带前缀的同名条目
    const hasPrefixed = DUP_PREFIXES.some(pfx => commentSet.has(pfx + c));
    if (hasPrefixed) {
      entries.splice(i, 1);
      dedupRemoved++;
    }
  }
  if (dedupRemoved > 0) {
    console.log(`  世界书去重: 删除${dedupRemoved}个不带前缀的重复条目`);
  }

  // === 完全重复去重：删除 comment 完全相同的重复条目（保留最后一个）===
  // 例：comment 同步后可能产生两个 [mvu_plot][控制中心]功能开关与配置（其中一个末尾有换行符）
  const seenComments = new Set();
  let exactDupRemoved = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const c = (entries[i].comment || '').trim(); // trim 换行符/空格
    if (!c) continue;
    if (seenComments.has(c)) {
      entries.splice(i, 1);
      exactDupRemoved++;
    } else {
      seenComments.add(c);
      // 同步清理 comment 末尾的换行符
      entries[i].comment = c;
    }
  }
  if (exactDupRemoved > 0) {
    console.log(`  世界书完全重复去重: 删除${exactDupRemoved}个相同comment条目`);
  }

  // === 扩展名后缀去重：删除带 .yaml/.txt 后缀的重复条目（保留不带后缀的版本）===
  // 例：[mvu_update]变量更新规则.yaml 和 [mvu_update]变量更新规则 共存 → 删除 .yaml 版本
  // 这是因为 updateWorldbook 旧版本只去 .txt 不去 .yaml，导致同文件产生两个条目
  const stemSet = new Set(entries.map(e => e.comment || ''));
  let suffixDupRemoved = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const c = entries[i].comment || '';
    if (!c) continue;
    // 检查是否带后缀
    let stem = null;
    if (c.endsWith('.yaml')) stem = c.slice(0, -5);
    else if (c.endsWith('.txt')) stem = c.slice(0, -4);
    else continue;
    // 如果存在不带后缀的同名条目，删除带后缀的这个
    if (stemSet.has(stem)) {
      entries.splice(i, 1);
      suffixDupRemoved++;
    }
  }
  if (suffixDupRemoved > 0) {
    console.log(`  世界书后缀去重: 删除${suffixDupRemoved}个带后缀的重复条目`);
  }

  // === [initvar] 多重去重：PNG 中可能残留 [InitVar]初始变量、[InitVar]请勿打开.yaml 等 ===
  // 标准名是 [initvar]请勿打开（state.json 定义），其他都删除
  const INITVAR_CANONICAL = '[initvar]请勿打开';
  const initvarVariants = entries.filter(e => {
    const c = e.comment || '';
    // 同时匹配大小写前缀（兼容旧 PNG 残留）
    return (c.startsWith('[initvar]') || c.startsWith('[InitVar]')) && c !== INITVAR_CANONICAL;
  });
  if (initvarVariants.length > 0) {
    for (let i = entries.length - 1; i >= 0; i--) {
      const c = entries[i].comment || '';
      if ((c.startsWith('[initvar]') || c.startsWith('[InitVar]')) && c !== INITVAR_CANONICAL) {
        entries.splice(i, 1);
      }
    }
    console.log(`  [initvar]去重: 删除${initvarVariants.length}个非标准条目 (保留 ${INITVAR_CANONICAL})`);
  }

  // === 清理孤儿条目：删除文件系统中不存在的旧条目 ===
  // 文件系统已删除/重命名的条目，PNG里可能还残留（如旧的 [mvu_update]加载器、[mvu_update]精力消耗计算 等）
  // 判断标准：用 findMatch 找不到对应文件的条目 = 孤儿
  // 但要保护 state.json 中注册的条目（即使文件不存在也不删，避免误删）
  const stateEntryNames = new Set(Object.keys(entryStateMap));
  let orphanRemoved = 0;
  const orphanNames = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const c = entries[i].comment || '';
    if (!c) continue;
    // state.json 注册的条目保护
    if (stateEntryNames.has(c)) continue;
    // 用 findMatch 查找文件
    const relPath = findMatch(c, entryPathMap);
    if (!relPath) {
      // 孤儿条目：文件系统中找不到对应文件
      orphanNames.push(c);
      entries.splice(i, 1);
      orphanRemoved++;
    } else {
      // 文件存在，检查路径是否真的有效
      const fullPath = path.join(CARD_DIR, relPath.replace(/\\/g, '/'));
      if (!fs.existsSync(fullPath)) {
        orphanNames.push(c);
        entries.splice(i, 1);
        orphanRemoved++;
      }
    }
  }
  if (orphanRemoved > 0) {
    console.log(`  孤儿条目清理: 删除${orphanRemoved}个文件系统中不存在的旧条目`);
    console.log(`    已删除: ${orphanNames.join(', ')}`);
  }
}

// ===== 更新正则脚本 =====
function updateRegex(ccv3Obj) {
  if (!ccv3Obj.data || !ccv3Obj.data.extensions) return;
  const regexDir = path.join(CARD_DIR, '正则');
  const files = fs.readdirSync(regexDir);

  // 读取所有.txt和.json正则文件
  const jsonRegexes = [];
  for (const f of files) {
    if (f.endsWith('.json') || f.endsWith('.txt')) {
      const fp = path.join(regexDir, f);
      try {
        const raw = fs.readFileSync(fp, 'utf-8').trim();
        if (raw.startsWith('{')) {
          const obj = JSON.parse(raw);
          jsonRegexes.push(obj);
        }
      } catch (e) {
        // 不是JSON格式，跳过（如状态栏.html）
      }
    }
  }

  if (!ccv3Obj.data.extensions.regex_scripts) {
    ccv3Obj.data.extensions.regex_scripts = [];
  }
  const existing = ccv3Obj.data.extensions.regex_scripts;

  // 更新或添加
  let added = 0;
  let updated = 0;
  for (const newRegex of jsonRegexes) {
    const idx = existing.findIndex(r => r.id === newRegex.id || r.scriptName === newRegex.scriptName);
    if (idx >= 0) {
      existing[idx] = Object.assign({}, existing[idx], newRegex);
      updated++;
    } else {
      existing.push(newRegex);
      added++;
    }
  }

  // 删除源文件已删除的正则（只保留源文件中存在的）
  const sourceNames = new Set(jsonRegexes.map(r => r.scriptName));
  let removed = 0;
  for (let i = existing.length - 1; i >= 0; i--) {
    if (!sourceNames.has(existing[i].scriptName)) {
      existing.splice(i, 1);
      removed++;
    }
  }
  console.log(`  正则: 更新${updated}个, 新增${added}个, 删除${removed}个 (共${existing.length}个, 读取${jsonRegexes.length}个文件)`);
}

// ===== 更新助手脚本 =====
function updateTavernHelper(ccv3Obj) {
  if (!ccv3Obj.data || !ccv3Obj.data.extensions) return;
  const scriptDir = path.join(CARD_DIR, '脚本');
  const files = fs.readdirSync(scriptDir);

  if (!ccv3Obj.data.extensions.tavern_helper) {
    ccv3Obj.data.extensions.tavern_helper = { scripts: [] };
  }
  if (!ccv3Obj.data.extensions.tavern_helper.scripts) {
    ccv3Obj.data.extensions.tavern_helper.scripts = [];
  }
  const existing = ccv3Obj.data.extensions.tavern_helper.scripts;

  // 名称→文件映射
  // 控制中心打包 full.js（264KB完整代码，对齐星月卡内嵌入模式，不走CDN加载器）
  // SP数据库只保留一行 import（参照同级生2），表格模板注入由独立的"表格模板注入器"脚本承担
  const nameFileMap = {
    'MVU': 'MVU.txt',
    'SP数据库': 'SP数据库.txt',
    '表格模板注入器': '表格模板注入器.txt',
    '变量更新美化': '变量更新美化.txt',
    '正文美化': '正文美化.txt',
    '玩家输入拦截器': '玩家输入拦截器.txt',
    'LCG骰子系统': 'LCG骰子系统.txt',
    '控制中心': '控制中心.full.js'
  };

  let updated = 0;
  let added = 0;

  for (const [name, fileName] of Object.entries(nameFileMap)) {
    const fp = path.join(scriptDir, fileName);
    if (!fs.existsSync(fp)) continue;
    let content = fs.readFileSync(fp, 'utf-8');

    // ★ 关键修复：控制中心打包前，用最新的 HTML/CSS 文件替换 full.js 中硬编码的 base64 ★
    // 否则 full.js 内嵌的 EMBEDDED_*_B64 永远是旧值，导致状态栏/开局页/OMNI/bubble 样式不生效
    if (name === '控制中心') {
      const regexDir = path.join(CARD_DIR, '正则');
      const b64Map = [
        { varName: 'EMBEDDED_STATUS_BAR_B64',    filePath: path.join(regexDir, '状态栏.html') },
        { varName: 'EMBEDDED_OPENING_PAGE_B64',  filePath: path.join(regexDir, '开局页.html') },
        { varName: 'EMBEDDED_BUBBLE_CSS_B64',    filePath: path.join(regexDir, 'bubble.css') },
        { varName: 'EMBEDDED_OMNI_PROGRESS_B64', filePath: path.join(regexDir, 'omni-progress.html') },
        { varName: 'EMBEDDED_OMNI_DONE_B64',     filePath: path.join(regexDir, 'omni-done.html') },
        { varName: 'EMBEDDED_OMNI_ANALYSIS_B64', filePath: path.join(regexDir, 'omni-analysis.html') },
      ];
      for (const b64 of b64Map) {
        if (fs.existsSync(b64.filePath)) {
          const rawFile = fs.readFileSync(b64.filePath, 'utf-8');
          const newB64 = Buffer.from(rawFile, 'utf-8').toString('base64');
          // 替换 full.js 中的 base64 字符串字面量（const VAR_NAME = '...'; 格式）
          // 注意：用局部 pattern 避免全局 lastIndex 污染（test→replace 共用同一全局正则会导致漏匹配）
          const testPattern = new RegExp(`const\\s+${b64.varName}\\s*=\\s*'`);
          if (testPattern.test(content)) {
            const replacePattern = new RegExp(`(const\\s+${b64.varName}\\s*=\\s*')([^']*)(')`, 'g');
            content = content.replace(replacePattern, `$1${newB64}$3`);
            console.log(`  控制中心 base64 注入: ${b64.varName} ← ${b64.filePath} (${(rawFile.length/1024).toFixed(1)}KB → ${(newB64.length/1024).toFixed(1)}KB)`);
          } else {
            console.log(`  控制中心 base64 警告: ${b64.varName} 在 full.js 中未找到，跳过`);
          }
        } else {
          console.log(`  控制中心 base64 跳过: ${b64.filePath} 文件不存在`);
        }
      }
    }

    const idx = existing.findIndex(s => s.name === name);
    if (idx >= 0) {
      existing[idx].content = content;
      // 只有表格模板注入器需要 button.enabled=true（通过 replaceScriptButtons 动态注册按钮）
      // SP数据库等脚本的 button 必须保持 disabled，否则会残留通用按钮"📦 创建表格模板"
      const NEEDS_BUTTON = ['表格模板注入器'];
      const needsBtn = NEEDS_BUTTON.includes(name);
      if (needsBtn) {
        if (existing[idx].button) { existing[idx].button.enabled = true; existing[idx].button.buttons = []; }
        else existing[idx].button = { enabled: true, buttons: [] };
      } else {
        if (existing[idx].button) { existing[idx].button.enabled = false; existing[idx].button.buttons = []; }
        else existing[idx].button = { enabled: false, buttons: [] };
      }
      updated++;
    } else {
      // 新增脚本：button.enabled 默认 false，只有 NEEDS_BUTTON 中的脚本才启用
      const NEEDS_BUTTON_NEW = ['表格模板注入器'];
      const needsBtnNew = NEEDS_BUTTON_NEW.includes(name);
      existing.push({
        type: 'script',
        enabled: true,
        name: name,
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now(),
        content: content,
        info: '',
        button: { enabled: needsBtnNew, buttons: [] },
        data: {},
        export_with: { data: true, button: true }
      });
      added++;
    }
  }
  // 剔除幽灵脚本（源文件已丢失，仅残留在旧 PNG 中；SPV 应为独立系统，参照同级生2 只保留一行 import）
  const GHOST_SCRIPT_NAMES = ['shujuku数据库注册', '模板注注入', 'MVU（国外使用）', 'MVU（国内使用）'];
  const beforeLen = existing.length;
  for (let i = existing.length - 1; i >= 0; i--) {
    if (GHOST_SCRIPT_NAMES.includes(existing[i].name)) {
      console.log(`  助手脚本: 剔除幽灵脚本 "${existing[i].name}"`);
      existing.splice(i, 1);
    }
  }
  const removed = beforeLen - existing.length;

  // 对齐星月卡结构：确保所有脚本都有 export_with 字段（酒馆助手导入时需要此字段识别脚本）
  let patched = 0;
  for (const s of existing) {
    if (!s.export_with) {
      s.export_with = { data: true, button: true };
      patched++;
    }
    if (!s.button || typeof s.button !== 'object') {
      s.button = { enabled: false, buttons: [] };
    } else if (!s.button.buttons) {
      s.button.buttons = [];
    }
    if (!s.data) s.data = {};
  }

  console.log(`  助手脚本: 更新${updated}个, 新增${added}个, 剔除${removed}个, 补字段${patched}个 (共${existing.length}个)`);
}

// ===== 更新开场白 =====
function updateFirstMes(ccv3Obj) {
  if (!ccv3Obj.data) return;
  const greetDir = path.join(CARD_DIR, '开场白');
  const files = fs.readdirSync(greetDir).filter(f => f.endsWith('.txt')).sort();
  if (files.length === 0) return;

  // 0.txt 是 first_mes, 其他是 alternate_greetings
  const firstFile = files.find(f => f === '0.txt');
  if (firstFile) {
    const firstMes = fs.readFileSync(path.join(greetDir, firstFile), 'utf-8');
    // 同时更新 V3 data 层和 V2 顶层（SillyTavern 某些版本回退读取顶层 first_mes）
    ccv3Obj.data.first_mes = firstMes;
    ccv3Obj.first_mes = firstMes;
    console.log(`  开场白: first_mes 已更新 (0.txt) [V3+V2 双层]`);
  }

  // 始终从文件系统重建 alternate_greetings（清空旧残留）
  const altFiles = files.filter(f => f !== '0.txt').sort((a, b) => parseInt(a) - parseInt(b));
  const oldCount = (ccv3Obj.data.alternate_greetings || []).length;
  const altGreetings = altFiles.map(f => fs.readFileSync(path.join(greetDir, f), 'utf-8'));
  // 同时更新 V3 data 层和 V2 顶层
  ccv3Obj.data.alternate_greetings = altGreetings;
  ccv3Obj.alternate_greetings = altGreetings;
  console.log(`  开场白: alternate_greetings ${altFiles.length}个 (旧残留${oldCount}个已${oldCount > 0 ? '清除' : '无'}) [V3+V2 双层]`);
}

// ===== 更新卡元数据（tags/description/creator_notes 等）=====
function updateMetadata(ccv3Obj) {
  if (!ccv3Obj.data) ccv3Obj.data = {};

  // 项目设定：私立圣德女子学院（非星月）
  // 旧值: tags=["星月女子学院","MVU","学校"], description 含"星月女子学院"
  const CARD_META = {
    name: '不要玩弄我的鸡吧',
    description: '就读于私立圣德女子学院的高三唯一男生，在开学第一天发现自己被全校女生通过神秘假阴茎共享使用。',
    tags: ['圣德女子学院', 'MVU', '学校', '假阴茎共享'],
    creator: '',
    character_version: '1.0',
    creator_notes: '依赖酒馆助手插件 + MVU 变量系统。正则脚本需配合 CSS 渲染（变量美化+状态栏 HTML）。双AI路由：[mvu_plot]前缀发剧情AI，[mvu_update]前缀发变量AI。',
  };

  let updated = 0;
  for (const [key, value] of Object.entries(CARD_META)) {
    if (JSON.stringify(ccv3Obj.data[key]) !== JSON.stringify(value)) {
      ccv3Obj.data[key] = value;
      updated++;
    }
  }
  if (updated > 0) {
    console.log(`  卡元数据更新: ${updated}个字段 (tags→圣德, description, creator_notes 等)`);
  }
}

// ===== V2 顶层 ↔ V3 data 全量同步 =====
// SillyTavern 某些版本会回退读取 V2 顶层字段（而非 V3 data），
// 必须确保两层完全一致，否则会出现"读到旧值"的问题
function syncV2TopLevel(ccv3Obj) {
  if (!ccv3Obj.data) return;
  // 需要同步的所有字段（V2 顶层和 V3 data 都应该有的）
  const fieldsToSync = [
    'name', 'description', 'personality', 'first_mes', 'scenario',
    'mes_example', 'creator_notes', 'system_prompt', 'post_history_instructions',
    'tags', 'creator', 'character_version', 'alternate_greetings',
    // extensions 包含 regex_scripts（正则）和 tavern_helper（助手脚本），必须同步
    'extensions',
  ];
  let synced = 0;
  for (const f of fieldsToSync) {
    if (ccv3Obj.data[f] !== undefined) {
      // 深拷贝 V3 data 的值到 V2 顶层（避免引用同一对象导致后续修改互相影响）
      ccv3Obj[f] = JSON.parse(JSON.stringify(ccv3Obj.data[f]));
      synced++;
    }
  }
  // 确保 spec 字段正确
  ccv3Obj.spec = 'chara_card_v3';
  ccv3Obj.spec_version = '3.0';
  console.log(`  V2顶层同步: ${synced}个字段已从V3 data深拷贝到V2顶层 (含extensions/正则/助手脚本)`);
}

// ===== 更新数据库 =====
function updateDatabase(ccv3Obj) {
  const dbPath = path.join(CARD_DIR, '数据库', 'chatSheets.json');
  if (!fs.existsSync(dbPath)) return;
  try {
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    const dbObj = JSON.parse(dbContent);
    // 数据库内容存储在 extensions.tavern_helper 中或特定位置
    // 检查是否有 SPV 相关的脚本
    if (!ccv3Obj.data.extensions.tavern_helper) return;
    const scripts = ccv3Obj.data.extensions.tavern_helper.scripts;
    if (!scripts) return;
    const spScript = scripts.find(s => s.name === 'SP数据库' || s.name === 'shujuku数据库注册');
    if (spScript) {
      // SP数据库脚本内容已在 updateTavernHelper 中更新
      // chatSheets.json 内容嵌入在脚本中或通过其他方式加载
      console.log(`  数据库: chatSheets.json 已读取 (${dbContent.length} 字符)`);
    }
  } catch (e) {
    console.warn(`  ⚠ 数据库更新失败: ${e.message}`);
  }
}

// ===== 更新schema =====
// 从 schema.ts 自动生成 Zod 脚本（对齐同级生2 脚本/Zod结构.txt 结构）
// 权威参考：同级生2/脚本/Zod结构.txt
//   - 静态 import { registerMvuSchema } from '...'
//   - const Schema = z.object({...})（无 export）
//   - $(() => { registerMvuSchema(Schema); })
// 同步落地：脚本/Zod结构.txt（便于调试与一致性校验）
function updateSchema(ccv3Obj) {
  const schemaPath = path.join(CARD_DIR, 'schema.ts');
  if (!fs.existsSync(schemaPath)) return;
  let schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  // ★ 严格对齐 forge buildZodScriptFromSchemaTs 的处理逻辑（tavern-cards-forge.mjs:148010）
  // forge 的 isMvuZodScript 检查要求脚本里保留 `export const Schema`，
  // 否则不认这是 Zod 脚本，导致 registerMvuSchema 不执行，变量结构为空。
  // 1. 移除所有 import 行（z 与 _ 已由 MVU 框架全局注入，禁止 import）
  schemaContent = schemaContent.replace(/^\s*import\s+.*$/gm, '');
  // 2. 移除 `const z = window.z;` / `const _ = ...;` 等全局重定义（运行时已注入）
  schemaContent = schemaContent.replace(/^const\s+z\s*=\s*[\s\S]*?;\s*$/m, '');
  schemaContent = schemaContent.replace(/^const\s+_\s*=\s*[\s\S]*?;\s*$/m, '');
  // 3. ★ 只移除 `export type` 行（保留 `export const Schema`！forge 靠它识别 Zod 脚本）
  schemaContent = schemaContent.replace(/^export\s+type\s+.*$/gm, '');
  // 4. 规整多余空行
  schemaContent = schemaContent.replace(/\n{3,}/g, '\n\n').trim();

  // 5. 拼装完整 Zod 脚本（严格对齐 forge buildZodScriptFromSchemaTs 格式）
  const importUrl = 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
  const zodScriptContent = [
    `import { registerMvuSchema } from '${importUrl}';`,
    schemaContent,
    '',
    '$(() => {',
    '  registerMvuSchema(Schema);',
    '});'
  ].join('\n');

  // 7. 同步落地到 脚本/Zod结构.txt（便于调试与一致性校验）
  try {
    const zodTxtPath = path.join(CARD_DIR, '脚本', 'Zod结构.txt');
    fs.writeFileSync(zodTxtPath, zodScriptContent, 'utf-8');
    console.log(`  Schema: 脚本/Zod结构.txt 已同步落地 (${zodScriptContent.length} 字符)`);
  } catch (e) {
    console.warn(`  Schema: 脚本/Zod结构.txt 落地失败: ${e.message}`);
  }

  // 8. 写入 PNG 内嵌脚本数组（查找或创建）
  if (ccv3Obj.data.extensions && ccv3Obj.data.extensions.tavern_helper) {
    const th = ccv3Obj.data.extensions.tavern_helper;
    if (!th.scripts) th.scripts = [];
    const scripts = th.scripts;
    let zodScript = scripts.find(s => s.name === 'Zod结构' || s.name === 'zod');
    if (zodScript) {
      zodScript.content = zodScriptContent;
      zodScript.enabled = true;
      zodScript.button = zodScript.button || { enabled: false, buttons: [] };
      console.log(`  Schema: PNG 内嵌 Zod结构脚本已更新 (${zodScriptContent.length} 字符)`);
    } else {
      zodScript = {
        type: 'script',
        enabled: true,
        name: 'Zod结构',
        id: 'zod-schema-byd',
        content: zodScriptContent,
        info: 'MVU Zod Schema 注册脚本（从 schema.ts 自动生成）',
        button: { enabled: false, buttons: [] },
        data: {},
        export_with: { data: false, button: false }
      };
      scripts.push(zodScript);
      console.log(`  Schema: PNG 内嵌 Zod结构脚本已创建 (${zodScriptContent.length} 字符)`);
    }
  }
}

// ===== 写入PNG =====
function writeCard(pngPath, chunks, ccv3Obj, charaObj) {
  // 序列化JSON
  const ccv3Json = JSON.stringify(ccv3Obj);
  const ccv3B64 = Buffer.from(ccv3Json, 'utf-8').toString('base64');
  console.log(`  ccv3 JSON: ${(ccv3Json.length / 1024).toFixed(1)}KB, base64: ${(ccv3B64.length / 1024).toFixed(1)}KB`);

  // chara chunk 也用 v3 格式（与 ccv3 完全相同），酒馆从 chara chunk 读取世界书
  let charaB64 = '';
  if (charaObj) {
    const charaJson = JSON.stringify(charaObj);
    charaB64 = Buffer.from(charaJson, 'utf-8').toString('base64');
    console.log(`  chara JSON: ${(charaJson.length / 1024).toFixed(1)}KB, base64: ${(charaB64.length / 1024).toFixed(1)}KB`);
  }

  // 构建新PNG: 签名 + IHDR + IDAT + tEXt(ccv3) + tEXt(chara) + IEND
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig];

  for (const c of chunks) {
    if (c.type === 'IHDR' || c.type === 'IDAT' || c.type === 'PLTE' || c.type === 'tRNS' || c.type === 'gAMA' || c.type === 'cHRM' || c.type === 'sRGB' || c.type === 'pHYs' || c.type === 'bKGD') {
      // 保留图片相关chunk
      parts.push(makeChunk(c.type, c.data));
    } else if (c.type === 'tEXt') {
      // 跳过旧的tEXt chunk，后面重新添加
    } else if (c.type === 'IEND') {
      // 跳过，后面重新添加
    }
    // 其他chunk也跳过
  }

  // 添加tEXt chunks
  parts.push(makeTextChunk('ccv3', ccv3B64));
  if (charaB64) {
    parts.push(makeTextChunk('chara', charaB64));
  }

  // 添加IEND
  parts.push(makeChunk('IEND', Buffer.alloc(0)));

  const output = Buffer.concat(parts);
  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`  ✅ PNG已写入: ${OUTPUT_PATH} (${(output.length / 1024 / 1024).toFixed(2)}MB)`);
}

// ===== 主流程 =====
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  角色卡打包工具 v1.0');
  console.log('  不要玩弄我的鸡吧-forge');
  console.log('═══════════════════════════════════════');

  // 1. 读取tavern-cards-state.json
  console.log('\n[1/7] 读取打包配置...');
  const stateRaw = fs.readFileSync(STATE_PATH, 'utf-8');
  const state = JSON.parse(stateRaw);
  const entryPathMap = buildEntryPathMap(state);
  const entryStateMap = buildEntryStateMap(state);
  console.log(`  配置条目: ${Object.keys(entryPathMap).length}个`);

  // 2. 读取现有PNG
  console.log('\n[2/7] 读取现有PNG...');
  const { chunks, ccv3Obj, charaObj } = readExistingCard(PNG_PATH);
  if (!ccv3Obj) {
    console.error('  ❌ 未找到ccv3 chunk!');
    process.exit(1);
  }
  console.log(`  PNG chunks: ${chunks.length}个, ccv3: ${ccv3Obj ? '✓' : '✗'}, chara: ${charaObj ? '✓' : '✗'}`);

  // 3. 更新世界书
  console.log('\n[3/7] 更新世界书条目...');
  updateWorldbook(ccv3Obj, entryPathMap);
  addMissingWorldbookEntries(ccv3Obj, entryPathMap, entryStateMap);

  // 3.5 确保 character_book.name 字段存在（酒馆靠此字段识别世界书）
  if (ccv3Obj.data && ccv3Obj.data.character_book) {
    if (!ccv3Obj.data.character_book.name) {
      ccv3Obj.data.character_book.name = '不要玩弄我的鸡吧';
      console.log('  已补充 character_book.name 字段');
    }
  }
  // 同时确保 spec 为 chara_card_v3
  if (!ccv3Obj.spec || ccv3Obj.spec !== 'chara_card_v3') {
    ccv3Obj.spec = 'chara_card_v3';
    ccv3Obj.spec_version = '3.0';
    console.log('  已修正 spec 为 chara_card_v3');
  }
  // 确保 system_prompts 和 group_only_greetings 字段存在
  if (ccv3Obj.data) {
    if (ccv3Obj.data.system_prompts === undefined) ccv3Obj.data.system_prompts = '';
    if (ccv3Obj.data.group_only_greetings === undefined) ccv3Obj.data.group_only_greetings = [];
  }

  // 4. 更新正则
  console.log('\n[4/7] 更新正则脚本...');
  updateRegex(ccv3Obj);

  // 5. 更新助手脚本
  console.log('\n[5/7] 更新助手脚本...');
  updateTavernHelper(ccv3Obj);

  // 6. 更新开场白
  console.log('\n[6/7] 更新开场白...');
  updateFirstMes(ccv3Obj);

  // 6.5 更新schema
  console.log('\n[6.5/7] 更新Schema...');
  updateSchema(ccv3Obj);

  // 6.6 更新数据库
  console.log('\n[6.6/7] 检查数据库...');
  updateDatabase(ccv3Obj);

  // 6.7 更新卡元数据（tags/description 等）
  console.log('\n[6.7/7] 更新卡元数据...');
  updateMetadata(ccv3Obj);

  // 6.9 V2 顶层 ↔ V3 data 全量同步（防止 SillyTavern 回退读 V2 顶层旧值）
  console.log('\n[6.9/7] V2顶层同步...');
  syncV2TopLevel(ccv3Obj);

  // 7. 写入PNG
  console.log('\n[7/7] 写入PNG...');
  // chara chunk 也用 v3 格式（与 ccv3 完全相同），酒馆从 chara chunk 读取世界书
  // 之前用 v2 格式导致世界书在酒馆中不显示
  writeCard(PNG_PATH, chunks, ccv3Obj, ccv3Obj);

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅ 打包完成!');
  console.log('═══════════════════════════════════════');
}

main().catch(e => {
  console.error('❌ 打包失败:', e);
  process.exit(1);
});
