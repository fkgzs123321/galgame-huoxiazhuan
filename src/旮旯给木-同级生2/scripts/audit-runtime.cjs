// 全面自查器 —— 覆盖我这两轮踩过的所有坑的类型
// A. EJS 语法（拼接后整体解析）        —— 已有 verify-ejs2
// B. ★ EJS 里调用的函数是否存在        —— 「编造 API」那类错误（registerPromptInjection）
// C. ★ EJS 里 getwi() 引用的条目名是否存在 —— 引用不存在的条目 = 静默拿空
// D. ★ EJS 里 getvar/setvar 的变量路径是否在 initvar/schema 里 —— 「变量路径写错」那类
// E. 正则的 findRegex 能否编译
// F. 正则的 replace_file 指向的文件是否存在
// G. first_messages / initvar_overrides 指向的文件是否存在
// H. 打包后的卡里是否残留未执行的 EJS 标签
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const WB = path.join(D, '世界书');
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);

const 问题 = {};
const 报 = (类, x) => (问题[类] = 问题[类] || []).push(x);

// skills 里声明的函数名（references/ejs/reference.md + features.md）
const 合法函数 = new Set([
  'getvar', 'setvar', 'incvar', 'decvar', 'delvar', 'getwi', 'getWorldbook', 'setwi', 'activewi',
  'injectPrompt', 'getPromptsInjected', 'hasPromptsInjected', 'activateRegex',
  'getChatMessages', 'setChatMessage', 'createChatMessages', 'deleteChatMessages',
  'getLastMessageId', 'getCurrentMessageId', 'triggerSlash', 'substitudeMacros',
  'getCharLorebooks', 'getLorebookEntries', 'setLorebookEntries', 'replaceLorebookEntries',
  'getVariables', 'replaceVariables', 'updateVariablesWith', 'insertOrAssignVariables',
  'toastr', 'errorCatched', 'getModelList', 'getPreset', 'matchChatMessages', 'formatAsFetched',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'parseInt', 'parseFloat',
  'isNaN', 'RegExp', 'Set', 'Map', 'join', 'concat', 'slice', 'split', 'replace', 'map', 'filter', 'forEach', 'push', 'indexOf', 'includes', 'trim', 'toString', 'encodeURIComponent', 'decodeURIComponent', 'console',
]);

// ── A/B/C/D：扫每个含 EJS 的文件 ──
for (const p of 全) {
  const rel = path.relative(D, p).replace(/\\/g, '/');
  const t = fs.readFileSync(p, 'utf8');
  const re = /<%([\s\S]*?)%>/g;
  let m;
  const 段 = [];
  while ((m = re.exec(t))) {
    let c = m[1];
    if (/^\s*\/\*[\s\S]*\*\/\s*$/.test(c)) continue;
    if (/^#/.test(c)) continue;
    c = c.replace(/^_/, '').replace(/_$/, '').replace(/^[-=]/, '');
    段.push(c);
  }
  if (!段.length) continue;
  const code = 段.join('\n');

  // A 语法
  try { new Function(code); } catch (e) { 报('A EJS 语法错误', rel + ' → ' + e.message.slice(0, 60)); }

  // B 函数名（抓 xxx( 形式的标识符）
  const ids = code.match(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g) || [];
  for (const id of ids) {
    const name = id.replace(/\s*\($/, '');
    if (/^(if|for|while|switch|catch|return|typeof|new|function|var|let|const)$/.test(name)) continue;
    if (合法函数.has(name)) continue;
    if (/^[a-z_$]/.test(name) && !/\./.test(name)) 报('B 未知函数调用', rel + ' → ' + name + '()');
  }
  for (const bad of code.match(/this\.([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g) || []) {
    const name = bad.replace(/^this\./, '').replace(/\s*\($/, '');
    if (!合法函数.has(name)) 报('B 未知 this 方法', rel + ' → this.' + name + '()');
  }

  // C getwi 引用的条目名
  for (const g of code.match(/getwi\(\s*['"]([^'"]+)['"]/g) || []) {
    const 名 = g.match(/['"]([^'"]+)['"]/)[1];
    const 所有 = Object.values(S.entryManifest).flatMap(e => Object.keys(e));
    if (!所有.includes(名)) 报('C getwi 引用不存在的条目', rel + ' → ' + 名);
  }

  // D 变量路径
  const 顶层 = new Set(Object.keys(YAML.parse(fs.readFileSync(path.join(WB, '变量/initvar.yaml'), 'utf8'))));
  for (const v of code.match(/(?:getvar|setvar|incvar|decvar)\(\s*['"]stat_data\.([^'"]+)['"]/g) || []) {
    const 路径 = v.match(/stat_data\.([^'"]+)/)[1];
    const top = 路径.split('.')[0];
    if (!顶层.has(top)) 报('D 变量顶层键不存在', rel + ' → stat_data.' + 路径 + '（顶层 ' + top + '）');
  }
}

// ── E/F：正则 ──
for (const [名, r] of Object.entries(S.regex_scripts || {})) {
  const fr = r.findRegex || '';
  if (fr.startsWith('/')) {
    const m = fr.match(/^\/([\s\S]*)\/([gimsuy]*)$/);
    if (!m) 报('E 正则写法非法', 名 + ' → ' + fr.slice(0, 50));
    else { try { new RegExp(m[1], m[2]); } catch (e) { 报('E 正则不能编译', 名 + ' → ' + e.message.slice(0, 50)); } }
  } else if (!/^<[^>]+>$/.test(fr)) 报('E 占位符写法非规范', 名 + ' → ' + fr.slice(0, 40));
  if (r.replace_file && !fs.existsSync(path.join(D, r.replace_file))) 报('F replace_file 不存在', 名 + ' → ' + r.replace_file);
  if (r.replaceString === undefined && !r.replace_file) 报('F 既无 replaceString 也无 replace_file', 名);
}

// ── G：文件引用 ──
for (const f of S.first_messages || []) if (!fs.existsSync(path.join(D, f))) 报('G first_messages 文件不存在', f);
for (const [k, v] of Object.entries(S.initvar_overrides || {})) {
  if (!fs.existsSync(path.join(D, v))) 报('G initvar_override 文件不存在', v);
  if (!(S.first_messages || []).includes(k)) 报('G initvar_override 的 key 不在 first_messages 里', k);
}
for (const [cat, es] of Object.entries(S.entryManifest))
  for (const [n, e] of Object.entries(es)) {
    const f = e.path || ((e.contents || []).find(c => c.file) || {}).file;
    if (f && !fs.existsSync(path.join(D, f))) 报('G 条目文件不存在', cat + '/' + n + ' → ' + f);
    for (const c of (e.contents || [])) if (c.file && !fs.existsSync(path.join(D, c.file))) 报('G contents.file 不存在', cat + '/' + n + ' → ' + c.file);
  }

// ── H：打包后的卡里残留未执行的 EJS ──
const 卡路径 = path.join(D, '旮旯给木-同级生2.json');
if (fs.existsSync(卡路径)) {
  const c = JSON.parse(fs.readFileSync(卡路径, 'utf8')); const d = c.data || c;
  for (const e of ((d.character_book || {}).entries || [])) {
    const ct = String(e.content || '');
    if (/<%/.test(ct) && !/getPromptsInjected/.test(ct)) 报('H 卡内条目残留未执行的 EJS', e.comment + ' → ' + ct.slice(ct.indexOf('<%'), ct.indexOf('<%') + 50));
  }
}

console.log('═══ 全面自查 ═══');
let 总 = 0;
for (const [类, v] of Object.entries(问题).sort()) { 总 += v.length; console.log('\n【' + 类 + '】' + v.length); v.slice(0, 15).forEach(x => console.log('   ' + x)); if (v.length > 15) console.log('   …另 ' + (v.length - 15) + ' 条'); }
if (!总) console.log('\n✅ 未发现问题');
else console.log('\n════ 合计 ' + 总 + ' 项 ════');
