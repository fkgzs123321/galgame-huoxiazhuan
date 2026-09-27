// 按 skills 规范重做 UI 层（依据 references/ui/regex-scripts.md 原文）
// 修正三处我此前的错误：
//   ① 规范明确「替换文件里用 $1/$2 引用捕获组」→ 上色类**改成 replace_file**（我上轮说必须内联，错了）
//   ② 规范：含 <body> 的界面**首尾用 3 个反引号行包裹**成独立代码块，否则是内嵌片段（<script> 不执行）
//      → 状态栏需要 JS（拒绝按钮跑 LCG）→ **必须走 <body> 版**
//   ③ 变量更新类规范是 3 条（完整标签 / 不完整标签 / 隐藏同时匹配），且 placement 用 [1,2]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const R = path.join(D, '正则');
const 写 = (f, t) => { fs.writeFileSync(path.join(R, f), t); return t.length; };
const 记 = [];

// ── ① 上色类 → replace_file（规范原文：替换文件中用 $1/$2 引用捕获组）──
const s = 'display:block;margin:5px 0;padding:2px 0 2px 11px;line-height:1.95;';
const 上色 = {
  '上色_她的声音': ['她的声音上色', { f: '/〔([^〕]*)〕/g', v: `<span style="${s}border-left:2px solid #b98a2a;color:#f0c964;font-weight:600;background:linear-gradient(90deg,rgba(232,184,75,.10),transparent 70%)">〔$1〕</span>` }],
  '上色_游戏内台词': ['游戏内台词上色', { f: '/「([^」]*)」/g', v: `<span style="${s}border-left:2px solid rgba(143,208,168,.55);color:#9fdcb4;background:linear-gradient(90deg,rgba(143,208,168,.07),transparent 70%)">「$1」</span>` }],
  '上色_内心旁白': ['内心与旁白上色', { f: '/（([^）]*)）/g', v: '<span style="color:#79839a;font-style:italic;font-size:.92em">（$1）</span>' }],
  '上色_系统声音': ['系统与那个声音上色', { f: '/〖([^〗]*)〗/g', v: '<span style="color:#d07a9a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;font-size:.95em">〖$1〗</span>' }],
  '上色_数值变化': ['数值变化上色', { f: '/[（(]([^）)]*(?:反抗值|好感度|信任度|体力|心情|现金|储蓄|技能)[^）)]*)[)）]/g', v: '<span style="color:#93a0b8;font-variant-numeric:tabular-nums">（$1）</span>' }],
  '上色_判定结果': ['判定结果高亮', { f: '/【([^】]{1,24})】/g', v: '<span style="display:inline-block;padding:0 8px;border-radius:7px;background:rgba(232,184,75,.14);border:1px solid rgba(232,184,75,.35);color:#e8c98a;font-weight:600">$1</span>' }],
  '分隔线': ['场景分隔线', { f: '/^\\s*-{3,}\\s*$/gm', v: '<div style="height:1px;margin:14px 0;background:linear-gradient(90deg,transparent,rgba(232,184,75,.35),transparent)"></div>' }],
};

const rx = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8')).regex_scripts;
for (const [文件, [名, { f, v }]] of Object.entries(上色)) {
  写(文件 + '.html', v + '\n');
  rx[名] = Object.assign({}, rx[名], { findRegex: f, replace_file: '正则/' + 文件 + '.html' });
  delete rx[名].replaceString;
}
记.push('① 7 条上色/分割正则 → replace_file（规范支持 $1）');

// ── ② 状态栏 → <body> 版（首尾三反引号包裹，否则 <script> 不执行）──
{
  const p = path.join(R, '状态栏界面.html');
  let h = fs.readFileSync(p, 'utf8');
  if (!h.trim().startsWith('```')) {
    h = '```\n<body>\n' + h.trim() + '\n</body>\n```\n';
    fs.writeFileSync(p, h);
    记.push('② 状态栏界面 → <body> 版（三反引号包裹）。**只此一改，拒绝按钮的 JS 才会真的执行**');
  }
}

// ── ③ 变量更新类 → 规范给的 3 条 + placement [1,2] ──
{
  const 完整 = '/<(update(?:variable)?)>\\s*((?:(?!<\\1>).)*)\\s*<\\/\\1>/gsi';
  const 不完整 = '/<(update(?:variable)?)>(?!.*<\\/\\1>)\\s*((?:(?!<\\1>).)*)\\s*$/gsi';
  const 隐藏 = '/<\\s*(update(?:variable)?)>(?:(?!.*<\\/\\1>)(?:(?!<\\1>).)*$|(?:(?!<\\1>).)*<\\/\\1?>)/gsi';
  写('变量更新美化.html', '<div style="margin:8px 0;padding:6px 10px;border-radius:8px;border:1px dashed #2f3745;background:rgba(255,255,255,.02);color:#525c66;font-size:11.5px;line-height:1.7">$2</div>\n');
  写('变量更新中美化.html', '<div style="margin:8px 0;padding:6px 10px;border-radius:8px;border:1px dashed #3a3020;background:rgba(232,184,75,.04);color:#b98a2a;font-size:11.5px">［正在更新变量…］</div>\n');
  for (const k of Object.keys(rx)) if (/变量更新/.test(k)) delete rx[k];
  const u = i => '00000000-0000-4000-8000-' + String(i).padStart(12, '0');
  rx['对AI隐藏变量更新'] = { id: u(40), findRegex: 隐藏, replaceString: '', trimStrings: [], placement: [1, 2], disabled: false, markdownOnly: false, promptOnly: true, runOnEdit: false, substituteRegex: 0 };
  rx['变量更新美化'] = { id: u(41), findRegex: 完整, replace_file: '正则/变量更新美化.html', trimStrings: [], placement: [1, 2], disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: false, substituteRegex: 0 };
  rx['变量更新中美化'] = { id: u(42), findRegex: 不完整, replace_file: '正则/变量更新中美化.html', trimStrings: [], placement: [1, 2], disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: false, substituteRegex: 0 };
  记.push('③ 变量更新类 → 规范给的 3 条（完整/不完整/隐藏），placement [1,2]');
}

// ── ④ 上色类 placement：规范说「需要对用户输入生效时用 [1,2]」→ 台词上色也对用户输入生效 ──
for (const 名 of ['她的声音上色', '游戏内台词上色', '内心与旁白上色', '系统与那个声音上色']) {
  rx[名].placement = [1, 2];
}
记.push('④ 四类台词上色 placement [1,2]（对用户输入也生效，规范原文）');

// ── 写回 state ──
fs.writeFileSync(path.join(D, '_p.json'), JSON.stringify([{ op: 'add', path: '/regex_scripts', value: rx }]));
try { execFileSync('node', [path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs'), 'patch', '旮旯给木-同级生2', '--file', path.join(D, '_p.json')], { encoding: 'utf8' }); 记.push('⑤ 已写回 state（共 ' + Object.keys(rx).length + ' 条正则）'); }
catch (e) { 记.push('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 2).join(' ')); }
fs.rmSync(path.join(D, '_p.json'));
console.log(记.join('\n'));
