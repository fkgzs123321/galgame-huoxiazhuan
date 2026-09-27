import fs from 'fs';

const PNG_PATH = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/不要玩弄我的鸡吧-forge.png';

function readPngCcv3(pngPath) {
  const buf = fs.readFileSync(pngPath);
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'tEXt' || type === 'iTXt') {
      const data = buf.toString('utf-8', offset + 8, offset + 8 + length);
      const nullIdx = data.indexOf('\0');
      const keyword = data.substring(0, nullIdx);
      const text = data.substring(nullIdx + 1);
      if (keyword === 'ccv3') {
        try { return JSON.parse(text); }
        catch (e) {
          try { return JSON.parse(Buffer.from(text, 'base64').toString('utf-8')); }
          catch (e2) { return null; }
        }
      }
    }
    offset += 8 + length + 4;
  }
  return null;
}

const ccv3Obj = readPngCcv3(PNG_PATH);
if (!ccv3Obj) {
  console.error('❌ No ccv3 chunk found');
  process.exit(1);
}

const ccv3Str = JSON.stringify(ccv3Obj);
const entries = ccv3Obj.data?.character_book?.entries || [];
const regexes = ccv3Obj.data?.extensions?.regex_scripts || [];
const scripts = ccv3Obj.data?.extensions?.tavern_helper?.scripts || [];

// Decode EMBEDDED_STATUS_BAR_B64 from 控制中心 script
let embeddedStatusBarHtml = '';
const ctrlCenterScript = scripts.find(s => s.name === '控制中心');
if (ctrlCenterScript && ctrlCenterScript.content) {
  const m = ctrlCenterScript.content.match(/const EMBEDDED_STATUS_BAR_B64 = '([^']+)';/);
  if (m) {
    try { embeddedStatusBarHtml = Buffer.from(m[1], 'base64').toString('utf-8'); } catch (_) {}
  }
}

console.log('═══════════════════════════════════════');
console.log('  PNG 验证报告 - 不要玩弄我的鸡吧-forge');
console.log('═══════════════════════════════════════\n');
console.log(`PNG size: ${(fs.statSync(PNG_PATH).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`世界书条目: ${entries.length}`);
console.log(`正则脚本: ${regexes.length}`);
console.log(`助手脚本: ${scripts.length}`);
console.log(`亮灯条目: ${entries.filter(e => e.enabled === true).length}`);
console.log(`嵌入状态栏HTML: ${embeddedStatusBarHtml.length} 字符`);
console.log('');

const checks = [];
function check(name, checkFn, description) {
  let passed = false;
  let detail = '';
  try {
    // Pass both string and embedded HTML; checkFn decides which to use
    passed = checkFn(ccv3Str, ccv3Obj, embeddedStatusBarHtml);
  } catch (e) {
    detail = ' ERROR: ' + e.message;
  }
  checks.push({ name, passed, description, detail });
}

// ===== Schema 修复 =====
check('Schema-FemaleUserSchema-catchall',
  s => s.includes('.catchall(z.any())'),
  'FemaleUserSchema 添加 catchall 防字段被 strip');

check('Schema-narrative-field',
  s => s.includes('narrative: z.object({'),
  'FemaleUserSchema 添加 narrative 字段');

check('Schema-day_thresholds',
  s => s.includes('day_thresholds: z.array(z.coerce.number()).default([0, 30, 60, 95, 102])'),
  'config 添加 day_thresholds');

check('Schema-25women-comment',
  s => !s.includes('20女性') && s.includes('25女性'),
  'schema 注释更新为 25女性');

// ===== 状态栏修复（在控制中心.full.js 中嵌入，需解码 Base64）=====
check('StatusBar-typeClsMap',
  (s, o, html) => html.includes('typeClsMap'),
  '雷达 typeClsMap 中文枚举映射');

check('StatusBar-strengthClsMap',
  (s, o, html) => html.includes('strengthClsMap'),
  '雷达 strengthClsMap 中文枚举映射');

check('StatusBar-composite_stage',
  (s, o, html) => html.includes('composite_stage'),
  'composite_stage 心理状态显示');

check('StatusBar-心理-colon',
  (s, o, html) => html.includes('心理:'),
  '心理状态标签渲染');

check('StatusBar-shenUid-dynamic',
  (s, o, html) => html.includes('shenUid') && !html.includes('female_user_014'),
  '校医查找改为动态 shenUid');

check('StatusBar-last_scan_day',
  (s, o, html) => html.includes('last_scan_day'),
  'radar 添加 last_scan_day 字段');

check('StatusBar-discovery_progress-object',
  (s, o, html) => html.includes('stage4_successes'),
  'discovery_progress 改为对象');

// ===== 全局规则 =====
check('Global-CharacterBook-Name',
  s => s.includes('"name"') && (s.includes('"不要玩弄我的鸡吧-forge"') || s.includes('不要玩弄我的鸡吧')),
  'character_book.name 字段存在');

// ===== 具现度成长 =====
check('Schema-presence_status',
  s => s.includes("presence_status: z.enum(['在场','离场','未知'])"),
  'narrative.presence_status 字段定义');

// ===== 女性管理（验证 [InitVar]初始变量.txt 中的 presence_status 初始值）=====
// chatSheets.json 是模板定义文件（DDL+列名），不包含初始数据行
// 初始数据由 AI 在开场白首轮参照 [InitVar]初始变量.txt INSERT 到 SPV 数据库
check('ChatSheets-在场-init',
  () => {
    try {
      const c = fs.readFileSync('e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/世界书/[InitVar]初始变量.txt', 'utf-8');
      const present = (c.match(/presence_status:\s*'在场'/g) || []).length;
      const absent = (c.match(/presence_status:\s*'离场'/g) || []).length;
      return present >= 25 && absent === 0;
    } catch (e) { return false; }
  },
  '[InitVar]初始变量.txt 25人初始 presence_status 为在场');

// ===== 变量更新规则 =====
check('VarRules-数据库锚定-I',
  s => s.includes('数据库锚定') && s.includes('I 数据库锚定'),
  '[mvu_plot]变量输出格式.txt 自检 I 数据库锚定');

check('VarRules-双写上限-J',
  s => s.includes('双写上限校验') && s.includes('J 双写上限校验'),
  '[mvu_plot]变量输出格式.txt 自检 J 双写上限校验');

check('VarUpdate-F-锚定',
  s => s.includes('F 数据库锚定'),
  '[mvu_update]变量更新规则.txt 自检 F 数据库锚定');

// ===== SPV =====
check('SPV-SQL填表规则-enabled',
  (s, o) => {
    const e = o.data?.character_book?.entries?.find(e => e.comment === '[SPV]SQL填表规则');
    return e && e.enabled === true;
  },
  '[SPV]SQL填表规则 条目亮灯');

check('SPV-SQL填表规则-content',
  s => s.includes('# SQL填表规则 · 不要玩弄我的鸡吧-forge'),
  '[SPV]SQL填表规则 内容存在');

// ===== NSW档案（直接验证源文件）=====
check('NSW-玩家-阶段1-天数标签',
  () => {
    try {
      const c = fs.readFileSync('e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/世界书/[mvu_plot]玩家_NSW档案.txt', 'utf-8');
      return c.includes('第1-30天') && !c.includes('使用次数0-19');
    } catch (e) { return false; }
  },
  '玩家_NSW档案 阶段1标签已改为天数');

check('NSW-叶知秋-艺考生',
  () => {
    try {
      const c = fs.readFileSync('e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/世界书/[mvu_plot]叶知秋_NSW档案.txt', 'utf-8');
      return c.includes('高三艺考生') && !c.includes('大学实习生');
    } catch (e) { return false; }
  },
  '叶知秋身份修正为高三艺考生');

// ===== 亮灯 =====
check('Lighting-9条亮灯',
  (s, o) => o.data?.character_book?.entries?.filter(e => e.enabled === true).length === 9,
  '亮灯条目数量为9');

check('Lighting-SPV-亮灯',
  (s, o) => {
    const e = o.data?.character_book?.entries?.find(e => e.comment === '[SPV]SQL填表规则');
    return e && e.enabled === true;
  },
  '[SPV]SQL填表规则 在9条亮灯中');

// ===== 元数据 =====
check('Meta-character_book-name',
  (s, o) => o.data?.character_book?.name && o.data.character_book.name.length > 0,
  'character_book.name 不为空');

check('Meta-被使用时受限视角叙事-已存在',
  s => s.includes('[mvu_plot]被使用时受限视角叙事'),
  '孤儿条目被使用时受限视角叙事 已纳入');

// ===== 脚本 =====
check('Scripts-7scripts',
  (s, o) => o.data?.extensions?.tavern_helper?.scripts?.length === 7,
  '助手脚本数量为7（6个+Zod结构）');

check('Scripts-无LCG骰子系统',
  (s, o) => !o.data?.extensions?.tavern_helper?.scripts?.find(s => s.name === 'LCG骰子系统'),
  'LCG骰子系统幽灵脚本已剔除');

// ===== 正则 =====
check('Regex-7regexes',
  (s, o) => o.data?.extensions?.regex_scripts?.length === 7,
  '正则数量为7');

check('Regex-无正文美化墓碑',
  (s, o) => !o.data?.extensions?.regex_scripts?.find(r => r.scriptName === '正文美化'),
  '正文美化墓碑正则已删除');

// ===== 控制中心.full.js 嵌入HTML更新（解码 Base64 后检查）=====
check('EmbeddedHTML-typeClsMap-FOUND',
  (s, o, html) => html.includes('typeClsMap'),
  '嵌入HTML typeClsMap 已更新');

check('EmbeddedHTML-shenUid-FOUND',
  (s, o, html) => html.includes('shenUid'),
  '嵌入HTML shenUid 已更新');

check('EmbeddedHTML-last_scan_day-FOUND',
  (s, o, html) => html.includes('last_scan_day'),
  '嵌入HTML last_scan_day 已更新');

check('EmbeddedHTML-strengthClsMap-FOUND',
  (s, o, html) => html.includes('strengthClsMap'),
  '嵌入HTML strengthClsMap 已更新');

check('EmbeddedHTML-心理-FOUND',
  (s, o, html) => html.includes('心理:'),
  '嵌入HTML 心理: 标签 已更新');

check('EmbeddedHTML-female_user_014-REMOVED',
  (s, o, html) => !html.includes('female_user_014'),
  '嵌入HTML female_user_014 硬编码已移除');

check('EmbeddedHTML-stage4_successes-FOUND',
  (s, o, html) => html.includes('stage4_successes'),
  '嵌入HTML discovery_progress 对象化 已更新');

// ===== 输出结果 =====
console.log('═══════════════════════════════════════');
console.log('  验证结果');
console.log('═══════════════════════════════════════\n');

let pass = 0, fail = 0;
checks.forEach(c => {
  const icon = c.passed ? '✓' : '✗';
  console.log(`${icon} ${c.name}: ${c.description}${c.detail || ''}`);
  if (c.passed) pass++;
  else fail++;
});

console.log(`\n═══════════════════════════════════════`);
console.log(`  通过: ${pass} / ${checks.length}`);
console.log(`  失败: ${fail} / ${checks.length}`);
console.log(`═══════════════════════════════════════`);

if (fail > 0) {
  console.log('\n失败项详情:');
  checks.filter(c => !c.passed).forEach(c => {
    console.log(`  ✗ ${c.name}: ${c.description}`);
  });
}
