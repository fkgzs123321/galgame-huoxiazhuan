// pack_yumq.mjs - 欲妈群角色卡打包脚本
// 从源文件重建V3规范角色卡PNG，同时生成 tavern-cards-state.json
// 用法: node pack_yumq.mjs

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARD_DIR = path.join(__dirname, 'src', '欲妈群');
const STATE_PATH = path.join(CARD_DIR, 'tavern-cards-state.json');
const OUTPUT_PNG = path.join(CARD_DIR, '欲妈群.png');
const OUTPUT_JSON = path.join(CARD_DIR, '欲妈群.json');

// ===== 蓝灯条目（enabled=true, constant=true）按加载顺序 =====
// 蓝灯 = D0入口 + MVU变量 + 思维链/防口胡 + 控制中心 + 规则系统（原 D0 无条件 getwi 的伪关灯，现改真蓝灯）
// 规则系统为约束性内容（每轮必须在场），蓝灯常驻保证稳定；其中大条目用条目内 EJS 段落控制省 token
// 调度器（[总控]人物/[总控]NSFW）保持关灯，由 D0 getwi 拉取（内部按场景条件 getwi 角色档案，是"精准"的正确用途）
// 其余关灯条目由 D0 或总控通过 getwi() 动态拉取
const BLUE_LIGHT_ORDER = [
  '[mvu_plot]D0系统控制器',
  // [mvu_plot]思维链强制输出：★ 默认关闭（用户 2026-09-22）—— 这份长文本缝进预设，卡里只留底，
  //   形态照用户给的范例（@long-text + <long_text_quote> + 逐项检查表）；正则已交预设，本卡不再自带。
  '[mvu_plot]输出格式规范',
  '[mvu_plot]防口胡与世界观铁律',
  '[mvu_plot][控制中心]功能开关与配置',
  // 规则系统（原 D0 无条件 getwi → 真蓝灯，每轮必在场；核心铁律已并入防口胡条目，避免双重注入）
  '[mvu_plot]共感假阳具系统',
  '[mvu_plot]欲妈群规则',
  '[世界观]欲妈群机制',
  '[mvu_plot]阶段晋升系统',
  '[mvu_plot]D20对抗判定系统',
  '[mvu_plot]玩家指令约束',
  '[总控]阶段',
  '[总控]剧情与事件',
  // 玩法扩展（v2.1+ 新增）
  '[mvu_plot]高考倒计时系统',
  '[mvu_plot]秘密任务系统',
  '[mvu_plot]群内疑云',
  '[mvu_plot]群生态扩展',
  // 角色速览（skill: character-catalog，5+角色必写；索引12位妈妈，AI首轮即认识全员，详情按名字绿灯触发）
  '[总控]角色速览',
  // 文风门控（硬指标＋味道指标，12 位共用一份规格）
  '[mvu_plot]文风门控',
  // 在场味道（按 本轮活跃 只输出在场妈妈的味道，各人各一套，互不串味）
  '[mvu_plot]在场味道',
  // 私密描写通用规范（信息隔离/身体怎么写/共感双向/通用禁忌，12 位共用一份）
  '[mvu_plot]私密通用规范',
  // 阶段骨架（五档通用规则，12 位妈妈共用；各人只写专属）
  '[mvu_plot]阶段骨架',
  // 词料速查（部位/体液/气味/拟声/动作/状况/称呼，写场景时取词用）
  '[mvu_plot]词料速查',
];

// ===== MVU 条目配置（按暗黑地牢标准）=====
// 4 个 MVU 条目位于 世界书/变量/ 下
// [initvar]初始(别开)(勿动): enabled=false（MVU 按条目名扫描 [initvar] 前缀加载 YAML）
// 其余 3 个: enabled=true + constant=true + selective=true（蓝灯+绿灯双重，与暗黑地牢一致）
const MVU_ENTRIES = {
  '[initvar]初始(别开)(勿动)': {
    file: '世界书\\变量\\initvar.yaml',
    enabled: false,
    abstract: 'MVU初始变量',
  },
  'MVU变量列表': {
    file: '世界书\\变量\\变量列表.txt',
    enabled: true,
    abstract: 'MVU变量列表',
  },
  '[mvu_update]变量输出格式': {
    file: '世界书\\变量\\变量输出格式.txt',
    enabled: true,
    abstract: 'MVU变量输出格式',
  },
  '[mvu_update]变量更新规则': {
    file: '世界书\\变量\\变量更新规则.yaml',
    enabled: true,
    abstract: 'MVU变量更新规则',
  },
};

// ===== 绿灯条目（selective, 需keys）=====
// ST 原生 selective 触发：对话出现关键词时激活
// 这些条目内容头部已标 "selective" 并定义了关键词
const GREEN_LIGHTS = {
  '[事件]线下聚会': { keys: ['线下聚会', '聚会', '互换体验', '群交', '现场展示', '私汤民宿包场', '聚会规则'], enabled: true },
  '[场景]隐秘场所': { keys: ['隐秘场所', 'SPA会所', '私汤民宿', '私人影院', '私教健身房', 'VIP试衣间', '私密包厢'], enabled: true },
  '[规则]随机欲妈生成': { keys: ['随机欲妈', '新成员', '群成员', '其他妈妈', '新妈妈', '生成欲妈'], enabled: true },
};

// ===== 角色名列表（用于分类角色档案）=====
const CHARACTERS = ['小夜', '怜奈', '林婉清', '柚子', '桃桃', '白露', '秦雨', '群主', '苏晴', '郝佳期', '铃', '韩雪'];

// ===== 条目投放配置 =====
// 角色档案（12 位 × 7 条：调色盘 / 基础信息 / 阶段1~5）：
// 1. 11 位配角：_基础信息 / _调色盘 / _阶段N 全部 selective + keys（角色名｜儿子名｜群昵称）
//    —— ST 原生关键词触发，不依赖 EJS 预处理；名字不出现就整条不进上下文，最省
// 2. 主角（郝佳期）：现状是 7 条全 constant
//    —— _阶段1~5 用条目内 @@if getvar('stat_data.郝佳期.阶段')===N 互斥，只渲染当前一档
//    —— 保留蓝灯的理由：开场白以她视角展开，首轮必须稳定在场
//    ⚠️ 若要收紧成"常驻只留 user+系统+规则"，把 _调色盘/_基础信息 也改成 selective 即可（省约 4845 字符）；
//       她的玩法要素不会丢：后门/身体/必做/画面锚点/绿帽位/禁 都由 [mvu_plot]在场味道 按在场者渲染，
//       阶段指导由常驻的 _阶段1~5 提供，身份栏由 [总控]角色速览 提供。
// 3. 已废除：NSW档案条目 / X_独立剧情线 / [总控]人物 / [总控]NSFW
//    —— 私密静态内容已并入各人 基础信息 末段「## 私密档案」；剧情已下沉到各人 _阶段N 的「这一档的戏」
const MAIN_CHARACTER = '郝佳期';  // 主角，无 @@if

// 角色名 → uid 映射（用于 getvar 路径）
const CHARACTER_UID = {
  '苏媚': 'su_mei',
  '林婉清': 'lin_wanqing',
  '苏晴': 'su_qing',
  '韩雪': 'han_xue',
  '白露': 'bai_lu',
  '桃桃': 'tao_tao',
  '怜奈': 'lian_nai',
  '柚子': 'you_zi',
  '小夜': 'xiao_ye',
  '秦雨': 'qin_yu',
  '铃': 'ling',
  '群主': 'su_mei',  // 群主就是苏媚
};

// 角色名 → 触发关键词（角色名 + 儿子名，用于 matchChatMessages / selective keys）
const CHARACTER_TRIGGER_KEYS = {
  '苏媚': ['苏媚', '群主'],
  '林婉清': ['林婉清', '林子墨'],
  '苏晴': ['苏晴', '苏晨'],
  '韩雪': ['韩雪', '韩子轩'],
  '白露': ['白露', '白墨'],
  '桃桃': ['桃桃', '陶宇'],
  '怜奈': ['怜奈', '温言'],
  '柚子': ['柚子', '唐野'],
  '小夜': ['小夜', '夜凉'],
  '秦雨': ['秦雨', '秦朗'],
  '铃': ['铃', '林悠'],
  '群主': ['群主', '苏媚'],
};

// 角色名 → 群昵称（群聊消息中 AI 常以昵称称呼，selective keys 必须包含才能触发）
const CHARACTER_NICKNAMES = {
  '林婉清': '清教授',
  '苏晴': '晴妈',
  '韩雪': '韩太太',
  '白露': '露',
  '桃桃': '桃桃',
  '怜奈': '怜奈',
  '柚子': '柚子辣妈',
  '小夜': '夜',
  '秦雨': '秦老师',
  '铃': '铃',
  '群主': '媚',
  '郝佳期': '佳期妈妈',
};

// 角色档案 selective keys：角色名 + 儿子名 + 群昵称（去重）
function buildCharKeys(charName) {
  const keys = [...(CHARACTER_TRIGGER_KEYS[charName] || [charName])];
  const nick = CHARACTER_NICKNAMES[charName];
  if (nick && !keys.includes(nick)) keys.push(nick);
  return keys;
}

// 生成 @@if 装饰器：场景条件（角色出场 或 变量标记本轮活跃），仅用于蓝灯常驻的基础信息/调色盘
// 不设 phase 门槛：基础信息（含私密静态）/调色盘是角色出场的基础资料，与阶段无关；阶段控制由 X_阶段N 负责
function buildEjsIfDecorator(charName) {
  // 主角不加 @@if
  if (charName === MAIN_CHARACTER) return '';

  const keys = CHARACTER_TRIGGER_KEYS[charName];
  const uid = CHARACTER_UID[charName];
  if (!keys || !uid) return '';

  // 分控条件：最近 2 楼（默认窗口）出现角色名/儿子名，或变量标记 本轮活跃=true
  // ★token 优化：原 start:-6 在群聊卡下 6 楼内必然点名多名妈妈 → 12 角色档案近乎全员注入（≈5.8万中文token）
  //   收紧为默认 2 楼窗口，仅真正出场的角色注入；"本轮活跃"变量兜底保证 D0 显式标记的角色不遗漏
  // ★变量路径必须与 schema.ts 一致：stat_data.群.成员详情.{uid}.本轮活跃（中文路径）
  const matchCond = `matchChatMessages(${JSON.stringify(keys)})`;
  const activeCond = `getvar('stat_data.群.成员详情.${uid}.本轮活跃', { defaults: false }) === true`;
  const sceneCond = `${matchCond} || ${activeCond}`;

  return `@@if (${sceneCond})\n`;
}

// 从条目名解析档案类型
function parseArchiveType(entryName) {
  if (entryName.includes('_基础信息')) return '_基础信息';
  if (entryName.includes('_调色盘')) return '_调色盘';
  const st = entryName.match(/_阶段(\d)/);
  if (st) return '_阶段' + st[1];
  return null;
}

const ROLE_MAP = { system: 0, user: 1, assistant: 2 };
const POSITION_MAP = {
  before_char_definition: 0,
  after_char_definition: 1,
  before_an: 2,
  after_an: 3,
  at_depth: 4,
};

// ===== PNG chunk 工具 =====
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
  const kwBuf = Buffer.from(keyword, 'ascii');
  const nullBuf = Buffer.alloc(1, 0);
  const textBuf = Buffer.from(text, 'ascii');
  return makeChunk('tEXt', Buffer.concat([kwBuf, nullBuf, textBuf]));
}

// ===== 读取真实头像 PNG（avatar.png，删除角色卡数据 chunk 后的纯净图片）=====
// 头像源：C:\Users\Carrot\Downloads\欲妈群.png → extract_avatar.mjs → avatar.png
function readAvatarPNG() {
  const avatarPath = path.join(__dirname, 'avatar.png');
  if (!fs.existsSync(avatarPath)) {
    console.error(`  ✗ 头像文件缺失: ${avatarPath}`);
    console.error(`    请先运行: node extract_avatar.mjs`);
    process.exit(1);
  }
  const buf = fs.readFileSync(avatarPath);
  // 验证 PNG 签名
  const sig = buf.slice(0, 8);
  const validSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!sig.equals(validSig)) {
    console.error(`  ✗ 头像文件不是有效的 PNG: ${avatarPath}`);
    process.exit(1);
  }
  // 解析所有 chunk，保留到 IEND（不含 tEXt 的角色卡数据）
  const parts = [sig];
  let offset = 8;
  let removedCount = 0;
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const crcEnd = offset + 8 + len + 4;
    const chunkData = buf.slice(offset, crcEnd);
    // 跳过 tEXt chunk 中 keyword=chara/ccv3 的（角色卡数据，不应出现在头像底图里）
    if (type === 'tEXt') {
      let sep = -1;
      for (let i = offset + 8; i < offset + 8 + len; i++) {
        if (buf[i] === 0) { sep = i; break; }
      }
      if (sep > 0) {
        const keyword = buf.toString('ascii', offset + 8, sep);
        if (keyword === 'chara' || keyword === 'ccv3') {
          removedCount++;
          offset = crcEnd;
          continue;
        }
      }
    }
    parts.push(chunkData);
    offset = crcEnd;
    if (type === 'IEND') break;
  }
  console.log(`  ✓ 加载真实头像: ${avatarPath} (${(buf.length / 1024).toFixed(1)}KB, 删除 ${removedCount} 个角色卡 chunk)`);
  // 去掉末尾 IEND，由主流程追加（因为要插入角色卡 chunk）
  parts.pop();
  return parts;
}

// ===== 判断条目分类 =====
function categorizeEntry(name) {
  if (name in MVU_ENTRIES) return 'MVU';
  if (BLUE_LIGHT_ORDER.includes(name)) return '系统核心';
  if (name in GREEN_LIGHTS) return '系统变量';
  if (name.startsWith('[mvu_plot]') || name.startsWith('[总控]')) return '规则系统';
  if (name.startsWith('原卡')) return '原卡字段';
  if (name === '玩家档案') return '玩家';
  for (const c of CHARACTERS) {
    if (name.startsWith(c + '_')) return '角色档案';
  }
  return '其他';
}

// ===== 构建世界书条目 =====
// ===== 双 AI 发送路由：给 comment 加前缀（skills conventions.md）=====
// 本卡走「额外模型解析」，MVU 会把 [mvu_plot] 条目从变量模型的上下文里删掉、无前缀条目留下。
// 所以「与变量追踪无关」的条目必须加 [mvu_plot]，否则变量模型每轮白收两万字剧情内容。
// ★ 只改打包后的 comment；state／entryManifest／文件名一律不动。
const HAS_MVU_PREFIX = /^\[(mvu_plot|mvu_update|initvar|InitVar)\]/;
function mvuComment(name) {
  if (HAS_MVU_PREFIX.test(name)) return name;                       // 已合规，原样
  if (name === 'MVU变量列表') return '[mvu_update]' + name;          // 它是给变量模型的清单
  const isArchive = /_(基础信息|调色盘|阶段\d)$/.test(name) && CHARACTERS.some(c => name.startsWith(c + '_'));
  if (isArchive || name === '玩家档案') return '[mvu_plot]' + name;
  if (/^\[/.test(name)) return '[mvu_plot]' + name;   // 其余自造方括号前缀（[总控]/[世界观]/[场景]/[事件]/[规则]/[文风]）同样是剧情侧
  return name;                                                      // 其余保守不动
}

function buildEntries() {
  const wbDir = path.join(CARD_DIR, '世界书');
  const varDir = path.join(wbDir, '变量');

  // 收集所有文件：世界书/根目录 .txt + 世界书/变量/ 下 4 个 MVU 文件
  const allFiles = [];

  // 1. 根目录 .txt 文件
  for (const f of fs.readdirSync(wbDir).filter(f => f.endsWith('.txt'))) {
    allFiles.push({ file: f, relPath: '世界书\\' + f, fullPath: path.join(wbDir, f) });
  }

  // 2. 世界书/变量/ 下的 4 个 MVU 文件（按 MVU_ENTRIES 配置）
  for (const [entryName, cfg] of Object.entries(MVU_ENTRIES)) {
    const fullPath = path.join(CARD_DIR, cfg.file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`  ⚠ MVU 文件缺失: ${cfg.file}`);
      continue;
    }
    allFiles.push({ file: path.basename(cfg.file), relPath: cfg.file, fullPath, entryName });
  }

  // 排序：蓝灯 → MVU → 绿灯 → 其他（按文件名）
  const blueSet = new Set(BLUE_LIGHT_ORDER);
  const greenSet = new Set(Object.keys(GREEN_LIGHTS));
  const sorted = allFiles.sort((a, b) => {
    const na = a.entryName || a.file.replace(/\.txt$|\.yaml$/, '');
    const nb = b.entryName || b.file.replace(/\.txt$|\.yaml$/, '');
    const rank = (n) => {
      if (blueSet.has(n)) return BLUE_LIGHT_ORDER.indexOf(n);
      if (n in MVU_ENTRIES) return 50 + Object.keys(MVU_ENTRIES).indexOf(n);
      if (greenSet.has(n)) return 100;
      return 200;
    };
    const ia = rank(na);
    const ib = rank(nb);
    if (ia !== ib) return ia - ib;
    return na.localeCompare(nb);
  });

  const entryManifest = {};
  const entries = [];
  let id = 0;
  let displayIndex = 0;

  for (const item of sorted) {
    // 推导 entryName：MVU 条目用预设 entryName；其他从文件名去后缀
    const entryName = item.entryName || item.file.replace(/\.txt$/, '');
    const relPath = item.relPath;
    const fullPath = item.fullPath;
    let content = fs.readFileSync(fullPath, 'utf-8');

    const category = categorizeEntry(entryName);
    if (!entryManifest[category]) entryManifest[category] = {};

    const isMvu = entryName in MVU_ENTRIES;
    const mvuCfg = isMvu ? MVU_ENTRIES[entryName] : null;
    const isBlue = blueSet.has(entryName);
    const greenCfg = GREEN_LIGHTS[entryName];
    const greenKeys = greenCfg ? greenCfg.keys : null;
    const isGreen = !!greenCfg;

    // EJS 分控：判断是否为角色档案条目
    const isCharArchive = entryName.includes('_基础信息') ||
                          entryName.includes('_独立剧情线') || entryName.includes('_调色盘') ||
                          /_阶段\d/.test(entryName);
    const charName = isCharArchive ? CHARACTERS.find(c => entryName.startsWith(c + '_')) : null;

    let enabled, strategy, order, abstract;
    if (isMvu) {
      // 按 skill 标准：[mvu_update] 条目用 constant=true（蓝灯常驻），[initvar] 条目 enabled=false
      enabled = mvuCfg.enabled;
      if (enabled) {
        // 启用的 MVU 条目：纯蓝灯 constant（按 skill 标准 depth=0/role=system/order=14720）
        strategy = { type: 'constant' };
      } else {
        // [initvar] 条目：关灯，不设置 selective
        strategy = { type: 'constant' };
      }
      // skill 标准 order=14720
      order = 14720;
      abstract = mvuCfg.abstract;
    } else if (isBlue) {
      enabled = true;
      strategy = { type: 'constant' };
      order = BLUE_LIGHT_ORDER.indexOf(entryName);
      abstract = '';
    } else if (isGreen) {
      enabled = greenCfg.enabled;
      strategy = { type: 'selective', keys: greenCfg.keys };
      // 绿灯条目 order 从 200+ 开始，避免与 MVU(99+) 冲突
      order = 200 + Object.keys(GREEN_LIGHTS).indexOf(entryName);
      abstract = '';
    } else if (isCharArchive) {
      const archiveType = parseArchiveType(entryName);
      const isMain = charName === MAIN_CHARACTER;
      // ★欲望都市灯模式（参考 src/欲望都市）：基础信息/调色盘 从"蓝灯constant+@@if"改为"绿灯selective"
      //   —— ST 原生关键词触发（角色名/儿子名出现在对话中才注入），不依赖 tavern-helper EJS 预处理，更稳更省
      //   —— 首页（开场白无角色名）不注入任何角色档案；群聊中名字出现即注入，效果等同"出场才加载"
      //   —— 郝佳期（主角）保持蓝灯常驻：开场白以她视角展开，首轮必须稳定在场
      // NSW档案/独立剧情线：保持关灯，由 [总控]人物/[总控]NSFW 通过 getwi() 动态拉取
      //   —— NSW档案源文件已有 @@generate_before + 自身 EJS 阶段控制，严禁注入 @@if（双装饰器会破坏解析）
      const isStaticArchive = (archiveType === '_基础信息' || archiveType === '_调色盘' || /^_阶段\d$/.test(archiveType));
      enabled = isStaticArchive;
      strategy = isStaticArchive
        ? (isMain
            ? { type: 'constant' }
            : { type: 'selective', keys: buildCharKeys(charName) })
        : { type: 'constant' };
      order = 200 + displayIndex;
      abstract = isMain ? `主角档案(${archiveType})` : `分控档案(${charName}/${archiveType}·绿灯)`;
      // 绿灯条目无需 @@if（selective 原生触发）；蓝灯主角也无需
    } else if (entryName === '玩家档案') {
      // 玩家档案：蓝灯常驻（每轮必载，去掉 getwi 调度链，出场稳定）
      enabled = true;
      strategy = { type: 'constant' };
      order = 200 + displayIndex;
      abstract = '玩家档案（蓝灯常驻）';
    } else {
      enabled = false;
      abstract = '';
      strategy = { type: 'constant' };
      order = 300 + displayIndex;
    }

    // 按 skill 标准：MVU 条目用 at_depth + depth=0 + role=system，其他用 before_char_definition + role=system
    const posType = isMvu ? 'at_depth' : 'before_char_definition';
    const posRole = 'system';

    // state.json 中的条目配置
    entryManifest[category][entryName] = {
      path: relPath,
      keywords: isGreen ? greenKeys : (strategy.type === 'selective' || strategy.type === 'constant_selective' ? (strategy.keys || []) : []),
      abstract: abstract,
      enabled: enabled,
      strategy: strategy,
      position: { type: posType, role: posRole, order: order },
      display_index: displayIndex,
      // 递归双禁铁律（configuration.md：pack 时自动补回默认值，本项目显式声明）
      recursion: { prevent_incoming: true, prevent_outgoing: true },
    };
    // 移除 part: undefined
    if (!mvuCfg) delete entryManifest[category][entryName].part;

    // V3 规范条目
    const isConstant = strategy.type === 'constant' || strategy.type === 'constant_selective';
    const isSelective = strategy.type === 'selective' || strategy.type === 'constant_selective';
    const keys = isSelective ? (strategy.keys || []) : [];

    entries.push({
      id: id,
      keys: keys,
      secondary_keys: [],
      comment: mvuComment(entryName),
      content: content,
      constant: isConstant,
      selective: isSelective,
      insertion_order: order,
      enabled: enabled,
      position: posType,
      use_regex: true,
      extensions: {
        position: POSITION_MAP[posType] ?? 0,
        // 递归双禁（worldbook.md §2.1）：禁止本条目激活其他条目，也禁止被其他条目递归拉取
        exclude_recursion: true,
        display_index: displayIndex,
        probability: 100,
        useProbability: true,
        depth: 0,
        selectiveLogic: 0,
        outlet_name: '',
        group: '',
        group_override: false,
        group_weight: 100,
        prevent_recursion: true,
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
    });

    id++;
    displayIndex++;
  }

  return { entryManifest, entries };
}

// ===== 构建脚本 =====
// ZOD 脚本从 schema.ts 自动生成（去除注释/import，顶部加import，末尾加registerMvuSchema调用）
function buildZodScriptFromSchema() {
  const schemaPath = path.join(CARD_DIR, 'schema.ts');
  if (!fs.existsSync(schemaPath)) {
    console.warn(`  ⚠ schema.ts 不存在: ${schemaPath}`);
    return '';
  }
  let ts = fs.readFileSync(schemaPath, 'utf-8');
  // 去除单行注释
  ts = ts.replace(/^\s*\/\/.*$/gm, '');
  // 去除多行注释
  ts = ts.replace(/\/\*[\s\S]*?\*\//g, '');
  // 去除 export type 语句
  ts = ts.replace(/^\s*export\s+type\s+.*$/gm, '');
  // 去除 export 关键字（保留 const）
  ts = ts.replace(/^\s*export\s+const/gm, 'const');
  // 去除空行
  ts = ts.replace(/^\s*\n/gm, '');
  // 顶部加 import（CDN）
  const header = `import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';\n\n`;
  // 末尾用 $(() => {...}) 包裹注册调用（对齐暗黑地牢，在DOM ready后注册）
  const footer = `\n\n$(() => {\n  registerMvuSchema(Schema);\n});\n`;
  const content = header + ts + footer;
  console.log(`  ✓ ZOD: 从 schema.ts 生成 (${content.length} 字符)`);
  return content;
}

function buildScripts() {
  const scriptDir = path.join(CARD_DIR, '脚本');
  const scriptConfig = {
    'MVU': { file: 'MVU.txt', info: 'MVU变量框架' },
    'ZOD': { file: null, info: 'Zod schema 注册', fromSchema: true },
  };

  // 按暗黑地寿标准：MVU 脚本的 button 配置（6个按钮）
  const mvuButtonConfig = {
    enabled: true,
    buttons: [
      { name: '重新处理变量', visible: true },
      { name: '重新读取初始变量', visible: true },
      { name: '快照楼层', visible: false },
      { name: '重演楼层', visible: false },
      { name: '重试额外模型解析', visible: false },
      { name: '清除旧楼层变量', visible: true },
    ],
  };

  // ZOD 脚本的 button 配置（空按钮）
  const zodButtonConfig = {
    enabled: true,
    buttons: [],
  };

  const stateScripts = {};
  const cardScripts = [];

  for (const [name, cfg] of Object.entries(scriptConfig)) {
    let content = '';
    if (cfg.fromSchema) {
      content = buildZodScriptFromSchema();
    } else if (cfg.file) {
      const fp = path.join(scriptDir, cfg.file);
      if (fs.existsSync(fp)) {
        content = fs.readFileSync(fp, 'utf-8');
        console.log(`  ✓ ${name}: 读取 ${cfg.file} (${content.length} 字符)`);
      } else {
        console.warn(`  ⚠ 脚本文件不存在: ${fp}`);
      }
    }

    // 按脚本类型选择 button 配置
    const buttonCfg = name === 'MVU' ? mvuButtonConfig : zodButtonConfig;

    // state.json 中的脚本配置
    stateScripts[name] = {
      enabled: true,
      button: buttonCfg,
      content_path: cfg.file,
      info: cfg.info,
    };

    // V3 卡片脚本
    cardScripts.push({
      type: 'script',
      enabled: true,
      name: name,
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_yumq_' + Date.now(),
      content: content,
      info: cfg.info,
      button: buttonCfg,
      data: {},
      export_with: { data: true, button: true },
    });
  }

  return { stateScripts, cardScripts };
}

// ===== 构建正则 =====
function buildRegex() {
  const regexDir = path.join(CARD_DIR, '正则');
  const files = fs.readdirSync(regexDir).filter(f => f.endsWith('.json'));
  const regexList = [];

  for (const f of files) {
    const fp = path.join(regexDir, f);
    try {
      const raw = fs.readFileSync(fp, 'utf-8');
      const obj = JSON.parse(raw);
      // 处理 replace_file：读取文件内容填充到 replaceString（用 ```html ``` 包裹）
      if (obj.replace_file) {
        const replacePath = path.join(CARD_DIR, obj.replace_file);
        if (fs.existsSync(replacePath)) {
          let htmlContent = fs.readFileSync(replacePath, 'utf-8').trim();
          // 去除已有的 ```html 包裹（如果有）
          if (htmlContent.startsWith('```html')) {
            htmlContent = htmlContent.replace(/^```html\r?\n/, '').replace(/\r?\n```$/, '');
          }
          // 用 ```html ``` 包裹，让 SillyTavern 识别为代码块渲染
          obj.replaceString = '```html\n' + htmlContent + '\n```\n';
          console.log(`  ✓ ${f}: 注入 ${obj.replace_file} (${obj.replaceString.length} 字符, 含代码块包裹)`);
        } else {
          console.warn(`  ⚠ ${f}: replace_file 不存在: ${replacePath}`);
        }
        delete obj.replace_file;
      }
      // 清理自定义字段
      delete obj.wrap_codeblock;
      regexList.push(obj);
    } catch (e) {
      console.warn(`  ⚠ 正则解析失败: ${f} - ${e.message}`);
    }
  }

  return regexList;
}

// ===== 读取开场白 =====
function buildFirstMes() {
  const greetDir = path.join(CARD_DIR, '开场白');
  const firstPath = path.join(greetDir, '0.txt');
  if (fs.existsSync(firstPath)) {
    return fs.readFileSync(firstPath, 'utf-8');
  }
  return '';
}

// ===== 读取开场白列表 =====
// 按 skills references/mvu/initvar.md：需要不同初始变量的开场白，由 state.initvar_overrides 指定 override 文件，
// pack 时在对应开场白末尾自动嵌入 <UpdateVariable><initvar>…</initvar></UpdateVariable>（完全覆盖，非合并）。
function buildAltGreetings() {
  const greetDir = path.join(CARD_DIR, '开场白');
  if (!fs.existsSync(greetDir)) return [];
  const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) : {};
  // 优先用 state 登记；state 里没有就直接从 开场白/initvar/ 推导（免得依赖步骤顺序）
  let overrides = state.initvar_overrides || {};
  const ovDir = path.join(greetDir, 'initvar');
  if (!Object.keys(overrides).length && fs.existsSync(ovDir)) {
    overrides = {};
    for (const f of fs.readdirSync(ovDir).filter(f => /\.ya?ml$/.test(f))) {
      overrides['开场白/' + f.replace(/\.ya?ml$/, '') + '.txt'] = '开场白/initvar/' + f;
    }
  }
  const files = fs.readdirSync(greetDir).filter(f => f.endsWith('.txt') && f !== '0.txt').sort((a, b) => parseInt(a) - parseInt(b));
  return files.map(f => {
    let text = fs.readFileSync(path.join(greetDir, f), 'utf-8');
    const rel = '开场白/' + f;
    const ov = overrides[rel];
    if (ov) {
      const ovPath = path.join(CARD_DIR, ov);
      if (fs.existsSync(ovPath)) {
        text = text.replace(/\s*$/, '') + '\n\n<UpdateVariable>\n<initvar>\n' +
          fs.readFileSync(ovPath, 'utf-8').replace(/\s+$/, '') + '\n</initvar>\n</UpdateVariable>\n';
        console.log('    ↳ ' + rel + ' 已嵌入 initvar_override：' + ov);
      } else {
        console.warn('  ⚠ initvar_override 文件缺失: ' + ovPath);
      }
    }
    return text;
  });
}

// ===== 读取原卡字段 =====
function readOriginalCardFields() {
  const wbDir = path.join(CARD_DIR, '世界书');
  const fields = {};
  const descPath = path.join(wbDir, '原卡description.txt');
  const persPath = path.join(wbDir, '原卡personality.txt');
  const scenPath = path.join(wbDir, '原卡scenario.txt');
  if (fs.existsSync(descPath)) fields.description = fs.readFileSync(descPath, 'utf-8');
  if (fs.existsSync(persPath)) fields.personality = fs.readFileSync(persPath, 'utf-8');
  if (fs.existsSync(scenPath)) fields.scenario = fs.readFileSync(scenPath, 'utf-8');
  return fields;
}

// ===== 主流程 =====
function main() {
  console.log('═══════════════════════════════════════');
  console.log('  欲妈群角色卡打包工具 V1.0');
  console.log('  生成 tavern-cards-state.json + 欲妈群.png');
  console.log('═══════════════════════════════════════');

  // 1. 构建世界书条目
  console.log('\n[1/7] 构建世界书条目...');
  const { entryManifest, entries } = buildEntries();
  const blueLights = entries.filter(e => e.enabled && e.constant).length;
  const greenLights = entries.filter(e => e.enabled && e.selective).length;
  const offLights = entries.filter(e => !e.enabled).length;
  console.log(`  条目总数: ${entries.length} (蓝灯: ${blueLights}, 绿灯: ${greenLights}, 关灯: ${offLights})`);

  // 2. 构建脚本
  console.log('\n[2/7] 构建酒馆助手脚本...');
  const { stateScripts, cardScripts } = buildScripts();
  console.log(`  脚本总数: ${cardScripts.length}`);
  cardScripts.forEach(s => console.log(`    - ${s.name} | enabled=${s.enabled} | button.enabled=${s.button.enabled}`));

  // 3. 构建正则
  console.log('\n[3/7] 构建正则脚本...');
  const regex = buildRegex();
  console.log(`  正则总数: ${regex.length}`);

  // 4. 读取开场白和原卡字段
  console.log('\n[4/7] 读取开场白和原卡字段...');
  const firstMes = buildFirstMes();
  const altGreetings = buildAltGreetings();
  const origFields = readOriginalCardFields();
  console.log(`  开场白: ${firstMes.length} 字符, 含StatusPlaceHolderImpl: ${firstMes.includes('<StatusPlaceHolderImpl/>') ? '✓' : '✗'}`);
  console.log(`  备用开场白: ${altGreetings.length} 个`);
  console.log(`  原卡字段: description=${origFields.description?.length || 0}字符, personality=${origFields.personality?.length || 0}字符, scenario=${origFields.scenario?.length || 0}字符`);

  // 5. 生成 tavern-cards-state.json
  // 按暗黑地寿标准：state 不包含 mvu_config/zod/partOrder/strategyThresholds 等自创配置
  // tavern_helper 只有 scripts 和 variables:{} 两个键
  console.log('\n[5/7] 生成 tavern-cards-state.json...');
  const state = {
    projectName: '欲妈群',
    worldbookName: '欲妈群',
    form: 'charactercard',
    mvu: true,
    description: origFields.description || '',
    personality: origFields.personality || '',
    scenario: origFields.scenario || '',
    creator: '欲妈群项目组',
    version: '1.0',
    creator_notes: '欲妈群 | MVU + EJS + SPV 三层架构 | 主角：郝佳期的儿子（18岁大学生）',
    entryManifest: entryManifest,
    extensions: {
      tavern_helper: {
        scripts: stateScripts,
        variables: {},
      },
      regex_scripts: regex,
    },
  };
  // ★ skills references/mvu/initvar.md 要求的三个字段，不由本打包器生成，必须补回去，
  //   否则每次重写 state 都会把它们冲掉，备用开场白的 <initvar> 块会静默消失。
  //   直接从文件系统推导，可自愈：
  {
    const greetDir = path.join(CARD_DIR, '开场白');
    const txts = fs.existsSync(greetDir)
      ? fs.readdirSync(greetDir).filter(f => f.endsWith('.txt')).sort((a, b) => parseInt(a) - parseInt(b))
      : [];
    if (txts.length) state.first_messages = txts.map(f => '开场白/' + f);
    const ovDir = path.join(greetDir, 'initvar');
    const ov = {};
    if (fs.existsSync(ovDir)) {
      for (const f of fs.readdirSync(ovDir).filter(f => /\.ya?ml$/.test(f))) {
        const stem = f.replace(/\.ya?ml$/, '');
        if (txts.includes(stem + '.txt')) ov['开场白/' + stem + '.txt'] = '开场白/initvar/' + f;
      }
    }
    if (Object.keys(ov).length) state.initvar_overrides = ov;
    state.zod = state.zod || { schemaPath: 'schema.ts' };
    console.log('  ✓ state 补齐 zod / first_messages / initvar_overrides（' +
      Object.keys(state.initvar_overrides || {}).length + ' 个 override）');
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  console.log(`  ✓ ${STATE_PATH} (${(fs.statSync(STATE_PATH).size / 1024).toFixed(1)}KB)`);

  // 6. 构建 V3 规范角色卡 JSON
  console.log('\n[6/7] 构建V3规范角色卡JSON...');
  const card = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: '欲妈群',
      description: origFields.description || '',
      personality: origFields.personality || '',
      scenario: origFields.scenario || '',
      first_mes: firstMes,
      mes_example: '',
      creator_notes: state.creator_notes,
      system_prompt: '',
      post_history_instructions: '',
      tags: [],
      creator: '欲妈群项目组',
      character_version: '1.0',
      alternate_greetings: altGreetings,
      extensions: {
        world: '欲妈群',
        talkativeness: '0.5',
        fav: false,
        depth_prompt: { prompt: '', depth: 4, role: 'system' },
        regex_scripts: regex,
        tavern_helper: {
          scripts: cardScripts,
          variables: {},
        },
        cfMvuVarGroups: {},
        mvu_worldbook_name: '欲妈群',
      },
      character_book: {
        name: '欲妈群',
        description: '',
        scan_depth: null,
        token_budget: null,
        recursive_scanning: false,
        extensions: {},
        entries: entries,
      },
    },
  };

  // V2 顶层同步（部分 ST 版本回退读 V2 顶层）
  card.name = card.data.name;
  card.description = card.data.description;
  card.first_mes = card.data.first_mes;
  card.creator = card.data.creator;
  card.character_version = card.data.character_version;
  card.alternate_greetings = card.data.alternate_greetings;
  card.extensions = JSON.parse(JSON.stringify(card.data.extensions));

  const jsonStr = JSON.stringify(card, null, 2);
  fs.writeFileSync(OUTPUT_JSON, jsonStr, 'utf-8');
  console.log(`  ✓ ${OUTPUT_JSON} (${(jsonStr.length / 1024 / 1024).toFixed(2)}MB)`);

  // 7. 写入 PNG
  console.log('\n[7/7] 写入PNG...');
  const ccv3Json = JSON.stringify(card);
  const ccv3B64 = Buffer.from(ccv3Json, 'utf-8').toString('base64');
  console.log(`  ccv3 JSON: ${(ccv3Json.length / 1024).toFixed(1)}KB, base64: ${(ccv3B64.length / 1024).toFixed(1)}KB`);

  // 使用真实头像（avatar.png）作为底图
  const pngParts = readAvatarPNG();
  const parts = [...pngParts];
  // 添加 tEXt chunks
  parts.push(makeTextChunk('ccv3', ccv3B64));
  parts.push(makeTextChunk('chara', ccv3B64)); // chara chunk 也用 v3 格式
  // IEND
  parts.push(makeChunk('IEND', Buffer.alloc(0)));

  const pngBuf = Buffer.concat(parts);
  fs.writeFileSync(OUTPUT_PNG, pngBuf);
  console.log(`  ✓ ${OUTPUT_PNG} (${(pngBuf.length / 1024 / 1024).toFixed(2)}MB)`);

  // ===== 验证 =====
  console.log('\n══════════════ 验证 ═════════════');
  const verifyBuf = fs.readFileSync(OUTPUT_PNG);
  // 检查 PNG 签名
  const sig = verifyBuf.slice(0, 8);
  const validSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  console.log(`  PNG 签名: ${sig.equals(validSig) ? '✓ 有效' : '✗ 无效'}`);

  // 解析 chunks
  let off = 8;
  let ccv3Found = false, charaFound = false;
  while (off < verifyBuf.length) {
    const len = verifyBuf.readUInt32BE(off);
    const type = verifyBuf.toString('ascii', off + 4, off + 8);
    if (type === 'tEXt') {
      const data = verifyBuf.slice(off + 8, off + 8 + len);
      const kwEnd = data.indexOf(0);
      const kw = data.toString('ascii', 0, kwEnd);
      if (kw === 'ccv3') ccv3Found = true;
      if (kw === 'chara') charaFound = true;
    }
    if (type === 'IEND') break;
    off = off + 8 + len + 4;
  }
  console.log(`  ccv3 chunk: ${ccv3Found ? '✓' : '✗'}`);
  console.log(`  chara chunk: ${charaFound ? '✓' : '✗'}`);

  // 验证 JSON 可解析
  const verifyCard = JSON.parse(ccv3Json);
  console.log(`  spec: ${verifyCard.spec} ${verifyCard.spec_version}`);
  console.log(`  name: ${verifyCard.data.name}`);
  console.log(`  world: ${verifyCard.data.extensions.world}`);
  console.log(`  entries: ${verifyCard.data.character_book.entries.length}`);
  console.log(`  scripts: ${verifyCard.data.extensions.tavern_helper.scripts.length}`);
  console.log(`  regex: ${verifyCard.data.extensions.regex_scripts.length}`);
  console.log(`  first_mes 含 StatusPlaceHolderImpl: ${verifyCard.data.first_mes.includes('<StatusPlaceHolderImpl/>') ? '✓' : '✗'}`);

  // 列出蓝灯条目
  const blues = verifyCard.data.character_book.entries.filter(e => e.enabled);
  console.log(`\n  蓝灯/绿灯条目 (${blues.length}):`);
  blues.forEach(e => console.log(`    ✓ ${e.comment} | order=${e.insertion_order} | ${e.selective ? 'selective' : 'constant'}`));

  // 统计
  console.log('\n══════════════ 统计 ═════════════');
  console.log(`  世界书条目: ${entries.length} (蓝灯${blueLights}/绿灯${greenLights}/关灯${offLights})`);
  console.log(`  脚本: ${cardScripts.length}`);
  console.log(`  正则: ${regex.length}`);
  console.log(`  备用开场白: ${altGreetings.length}`);
  console.log(`  PNG 文件大小: ${(pngBuf.length / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  JSON 文件大小: ${(jsonStr.length / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  state.json 大小: ${(fs.statSync(STATE_PATH).size / 1024).toFixed(1)}KB`);

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅ 打包完成!');
  console.log('═══════════════════════════════════════');
}

main();
