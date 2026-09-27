// 角色层生成器：把三份设计稿拆成 15 女角 × 4 part + 主角 + 角色速览
// 同时执行 skills `rules-check.md` 的定稿转换：
//   ① 破折号（——）一律删/改逗号   ② 跨条目指针（见 `X.md`）整句删   ③ 元叙事（定性依据/※/○/待你写的衍生）剥离
// 内容文件**不使用 XML 标签**（conventions.md：标签只在注册时的 contents 片段里加）

// ── 格式规范化（rules.md：数据库格式优先，用列表和键值对，不用段落）──
function 规范化(t) {
  const L = String(t).split(/\r?\n/);
  let 块缩进 = -1;
  return L.map(l => {
    const 块头 = l.match(/^(\s*)[^#\s][^:]*:\s*[|>][-+]?\s*$/);
    if (块头) { 块缩进 = 块头[1].length; return l; }
    if (块缩进 >= 0) {
      if (l.trim() === '') return l;
      const ind = l.match(/^ */)[0].length;
      if (ind > 块缩进) return l;
      块缩进 = -1;
    }
    const ind = l.match(/^ */)[0].length;
    if (!l.trim() || ind === 0) return l;
    if (/^\s*(-|#|\.\.\.)/.test(l)) return l;
    if (/:\s/.test(l) || /:\s*$/.test(l)) return l;
    if (/^\s*[|>]/.test(l)) return l;
    return ' '.repeat(ind) + '- ' + l.trim();
  }).join('\n');
}

const fs = require('fs');
const path = require('path');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const 源 = {
  基础: path.join(D, '底座_nanpa2/女角设定.md'),
  补完: path.join(D, '底座_nanpa2/女角设定-补完.md'),
  外貌: path.join(D, '底座_nanpa2/女角设定-外貌与NSFW.md'),
  剧情: path.join(D, '底座_nanpa2/剧情线.md'),
};

// ── 解析：按 `## N · 名字` 切节 ──
const 归一 = s => s.replace(/篠原/g,'筱原').replace(/桜/g,'樱').replace(/宮/g,'宫').replace(/靜/g,'静').replace(/繪/g,'绘').replace(/沢/g,'泽').replace(/[　]/g,'').trim();
function 切节(text) {
  const out = new Map();
  const lines = text.split(/\r?\n/);
  let cur = null, buf = [];
  for (const l of lines) {
    const m = l.match(/^## \d+ · (.+?)\s*$/);
    if (m) { if (cur) out.set(cur, buf.join('\n')); cur = 归一(m[1].replace(/（.*?）/, '')); buf = []; }
    else if (cur) buf.push(l);
  }
  if (cur) out.set(cur, buf.join('\n'));
  return out;
}
// ── 解析：节内按 `**标题**` 切块（代码栅栏原样保留；标题后可带（说明））──
function 切块(body) {
  const out = new Map();
  const lines = (body || '').split(/\r?\n/);
  let cur = null, buf = [], fence = false;
  for (const l of lines) {
    if (l.trim().startsWith('```')) fence = !fence;
    const m = !fence && l.match(/^\*\*([^*]+)\*\*\s*(?:[（(][^）)]*[）)])?\s*$/);
    if (m) { if (cur) out.set(cur, buf.join('\n').trim()); cur = m[1].trim(); buf = []; }
    else if (cur) buf.push(l);
  }
  if (cur) out.set(cur, buf.join('\n').trim());
  return out;
}
// ── markdown 表格 → YAML 键值 ──
function 表转YAML(s) {
  const rows = (s || '').split(/\r?\n/).filter(l => l.trim().startsWith('|'));
  if (rows.length < 2) return s;
  const out = [];
  for (const r of rows) {
    const cells = r.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 2) continue;
    if (/^-+$/.test(cells[0].replace(/[\s:]/g, ''))) continue;      // 分隔行
    if (cells[0] === '项' || cells[0] === '地点' || cells[0] === '角色') continue; // 表头
    out.push('  ' + cells[0] + ': ' + cells.slice(1).join('，'));
  }
  return out.join('\n');
}
// ── 定稿转换 ──
function 转换(s) {
  let t = s;
  // 跨条目指针：整行删（rules-check：每条必须独立可读）
  let n指针 = 0;
  for (const re of [/^.*见\s*`[^`]+\.(md|yaml|txt)`.*$/gm, /^.*详见\s*`[^`]+`.*$/gm]) {
    const m = t.match(re); if (m) n指针 += m.length; t = t.replace(re, '');
  }
  // 元叙事：整行删
  let n元 = 0;
  for (const re of [/^\s*定性依据[:：].*$/gm, /^\s*待你写的衍生.*$/gm, /^\s*依据[:：].*$/gm,
    /^\s*来源[:：].*$/gm, /^\s*判据（skills）.*$/gm, /^\s*其余原作未给.*$/gm, /^\s*待补.*$/gm]) {
    const m = t.match(re); if (m) n元 += m.length; t = t.replace(re, '');
  }
  // 行内标记剥离（★ 保留作强调）
  t = t.replace(/※（[^）]*）/g, '').replace(/※/g, '').replace(/^(\s*)○\s?/gm, '$1').replace(/（○[^）]*）/g, '');
  // 破折号 → 逗号（rules-check：后半段非冗余时改逗号）
  const n破 = (t.match(/——/g) || []).length;
  t = t.replace(/\s*——\s*/g, '，');
  t = t.replace(/\n{3,}/g, '\n\n').trim();
  return { text: t, 破: n破, 指针: n指针, 元: n元 };
}

const S基础 = 切节(fs.readFileSync(源.基础, 'utf8'));
const S补完 = 切节(fs.readFileSync(源.补完, 'utf8'));
const S外貌 = 切节(fs.readFileSync(源.外貌, 'utf8'));
const S剧情 = 切节(fs.readFileSync(源.剧情, 'utf8'));

const 女角 = [...S基础.keys()].filter(n => n.length <= 5);
const 统计 = { 破: 0, 指针: 0, 元: 0, 文件: 0, 字符: 0 };
const 速览 = [];

for (const 名 of 女角) {
  const b = 切块(S基础.get(名));
  const c = 切块(S补完.get(名) || '');
  const w = 切块(S外貌.get(名) || '');
  const s = 切块(S剧情.get(名) || '');
  // 取块：清掉围栏行/孤立分隔线，并在 `# ` 一级标题处截断（防块尾泄漏）
  const 取 = (m, k) => {
    const out = [];
    for (const l of (m.get(k) || '').split(/\r?\n/)) {
      const t = l.trim();
      if (/^```/.test(t)) continue;
      if (/^---$/.test(t)) continue;
      if (/^#\s/.test(l)) break;
      out.push(l);
    }
    return out.join('\n').trim();
  };

  const 四 = {
    '基础信息': [
      '基本信息:\n' + 表转YAML(取(b, 'basic')),
      '外貌特征:\n' + 缩进(取(w, '外貌特征')),
      '背景设定:\n' + 缩进(取(b, '背景设定')),
      '关系设定:\n' + 缩进(取(b, '关系设定')),
    ].join('\n\n'),
    '性格调色盘': [
      取(c, '基调'),
      '能从原作提取的衍生:\n' + 缩进(取(b, '能从原作提取的衍生')),
    ].join('\n\n'),
    '三面性': 取(c, '三面性'),
    'NSFW反差与剧情线': '',
  };
  // 剧情线：节内 code block 直接取
  const m剧 = (S剧情.get(名) || '').match(/```\s*\n([\s\S]*?)```/);
  四['NSFW反差与剧情线'] = 'NSFW反差:\n' + 缩进(取(w, 'NSFW 反差'))
    + '\n\n剧情线:\n' + 缩进(m剧 ? m剧[1].trim() : '');

  for (const [part, raw] of Object.entries(四)) {
    const { text, 破, 指针, 元 } = 转换(raw);
    统计.破 += 破; 统计.指针 += 指针; 统计.元 += 元;
    if (!text.trim()) continue;
    const dir = path.join(D, '世界书/角色/底座_nanpa2', 名);
    fs.mkdirSync(dir, { recursive: true });
    const body = `# ${名} · ${part}\n\n${text}\n`;
    fs.writeFileSync(path.join(dir, 规范化(part + '.yaml')), body);
    统计.文件++; 统计.字符 += body.length;
  }
  速览.push(名 + '\t' + (取(b, 'basic') || '').split('\n').find(l => l.includes('身份')) || '');
}

function 缩进(s) {
  return (s || '').split('\n').map(l => l.trim() ? '  ' + l.trim() : l).join('\n');
}

// ── 角色速览（索引条目，scope: catalog）──
const 速览文本 = ['# 角色速览', '', '15 位女角与 4 位男配的一行索引。正文里出现谁，按名字查对应条目。', '',
  '女角:', ...速览.map(x => { const [n, d] = x.split('\t'); return `  ${n}: ${d.replace(/^\|\s*/, '').replace(/\|/g, '／').trim()}`; }), '',
  '男配:', '  川尻彰: 同班，他唯一的知心朋友', '  长冈芳树: 同班，问题儿童，会威胁女生',
  '  西御寺有友: 同班，财阀独生子，最直接的对手', '  天道新干线: 33 岁体育老师，与主角冲突不断', ''].join('\n');
fs.mkdirSync(path.join(D, '世界书/角色'), { recursive: true });
fs.writeFileSync(path.join(D, 规范化('世界书/角色/速览.yaml')), 速览文本);
统计.文件++; 统计.字符 += 速览文本.length;

console.log('✅ 角色层生成完毕');
console.log('   女角文件 ' + 女角.length + ' 位 × 最多 4 part');
console.log('   共写 ' + 统计.文件 + ' 个文件 / ' + 统计.字符 + ' 字符');
console.log('   定稿转换：破折号 ' + 统计.破 + ' 处 ／ 跨条目指针 ' + 统计.指针 + ' 行 ／ 元叙事 ' + 统计.元 + ' 行');
console.log('   女角名单：' + 女角.join(' '));
