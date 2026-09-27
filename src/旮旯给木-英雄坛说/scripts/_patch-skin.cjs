// 把逻辑的类名换成新骨架的，并加顶部四数条 + 帮助按钮
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ── 1. 类名映射（★ 先长后短，避免前缀互吃）──
const 映射 = [
  ['yx-panel', 'yx-c'], ['yx-row', 'yx-r'], ['yx-full', 'yx-w'],
  ['yx-body', 'yx-bd'], ['yx-empty', 'yx-e'], ['yx-chips', 'yx-chips'], ['yx-chip', 'yx-ch'],
  ['yx-line', 'yx-ln'], ['yx-sub', 'yx-nt'], ['yx-tip', 'yx-nt'],
  ['yx-opts', 'yx-opts'], ['yx-opt', 'yx-op'],
  ['yx-h', 'yx-ttl'], ['yx-item', 'yx-it'],
  ['yx-warn', 'w'], ['yx-grn', 'gr'], ['yx-gold', 'g'], ['yx-dim', 'yx-nt'],
  ['yx-bar', 'yx-bar'], ['yx-fill-hp', 'hp'], ['yx-fill-mp', 'mp'], ['yx-fill-res', 'rs'],
  ['yx-fill-ar', 'ar'], ['yx-fill-task', 'tk'], ['yx-fill-cyc', 'cy'],
  ['yx-btn deny', 'yx-btn dn'], ['yx-btn custom', 'yx-btn pu'], ['yx-btn go', 'yx-btn pri'],
  ['yx-mask', 'yx-msk'], ['yx-modal', 'yx-md'],
];
// 按前缀边界替换（用正则，避免 yx-h 吃掉 yx-hp 之类）
for (const [a, b] of 映射) {
  if (a === b) continue;
  const re = new RegExp('\\b' + a.replace(/[-]/g, '\\-') + '\\b', 'g');
  t = t.replace(re, b);
}

// ── 2. class 里的旧组合（yx-c yx-w 之类已经被映射好了，这里补两个特例）──
t = t.replace(/class="yx-nt" style="color:var\(--gold\);/g, 'class="yx-nt" style="color:var(--gold);');

// ── 3. 顶部四数条 ──
t = t.replace("  /* ── 总览 ── */", [
  '  /* ── 顶部四数条 ── */',
  '  function 画四数() {',
  '    var T = 状态.时间 || {}, H = 状态.她 || {}, NS = 状态.NSFW || {};',
  '    var B = 状态.身体 || {}, t = 算天赋(状态), d = 派生(t, 状态);',
  '    var hpMax = d.气血上限, hp = 夹(数(B.生命当前), 0, hpMax);',
  '    var 限 = T.她的期限 == null ? 24 : 数(T.她的期限);',
  '    var 兴 = 数(NS.兴奋度);',
  '    var 反 = 夹(数(H.反抗值, 100), 0, 100);',
  '    document.getElementById("yx-quad").innerHTML = [',
  '      { k: "岁数", v: (T.岁数 || 14), u: "岁 · 第 " + (T.月 || 1) + " 月" },',
  '      { k: "她的期限", v: 限, u: "月", c: 限 <= 6 ? "wn" : "" },',
  '      { k: "反抗", v: Math.round(反), u: 反 < 20 ? "快到极限" : "", c: 反 < 20 ? "wn" : "" },',
  '      { k: "她的兴致", v: 档名(兴), u: Math.round(兴), c: "gd" },',
  '    ].map(function (x) {',
  '      return \'<div class="yx-q \' + (x.c || "") + \'"><div class="k">\' + x.k + \'</div>\'',
  '        + \'<div class="v">\' + E(x.v) + (x.u ? \'<u>\' + E(x.u) + "</u>" : "") + "</div></div>";',
  '    }).join("");',
  '    document.getElementById("yx-sub").textContent =',
  '      (状态.场景 || {}).当前地点 ? ((状态.场景 || {}).当前地点) : "——";',
  '  }',
  '',
  '  /* ── 总览 ── */',
].join('\n'));

// ── 4. 页签换成带图标的 ──
t = t.replace(/  var 页表 = \[[\s\S]*?\];/, [
  '  var ICON = {',
  '    overview: \'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>\',',
  '    skills: \'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 2 v6 M12 16 v6 M2 12 h6 M16 12 h6"/><circle cx="12" cy="12" r="3"/></svg>\',',
  '    items: \'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 8 h16 l-1.5 12 a2 2 0 0 1 -2 1.8 h-9 a2 2 0 0 1 -2 -1.8 Z"/><path d="M9 8 V6 a3 3 0 0 1 6 0 v2"/></svg>\',',
  '    tasks: \'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 5 h9 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 V7"/><path d="M7 3 v4 h5"/><path d="M9 13 h6 M9 17 h4"/></svg>\',',
  '    people: \'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><path d="M3 20 a6 6 0 0 1 12 0"/><circle cx="17.5" cy="10" r="2.2"/><path d="M15 19 a5 5 0 0 1 6.5 -1.5"/></svg>\',',
  '    world: \'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12 h18 M12 3 a14 14 0 0 1 0 18 a14 14 0 0 1 0 -18"/></svg>\',',
  '    body: \'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 21 a9 9 0 1 0 0 -18 a9 9 0 0 0 0 18 Z"/><path d="M12 7 v5 l3 2"/></svg>\',',
  '  };',
  '  var 页表 = [',
  '    { id: "overview", 名: "总览" }, { id: "skills", 名: "技能" }, { id: "items", 名: "行囊" },',
  '    { id: "tasks", 名: "活计" }, { id: "people", 名: "人物" }, { id: "world", 名: "世界" },',
  '    { id: "body", 名: "身体" },',
  '  ];',
].join('\n'));

t = t.replace(
  "    document.getElementById('yx-tabs').innerHTML = 页表.map(function (p) {\n      return '<button class=\"yx-tab' + (页 === p.id ? ' on' : '') + '\" data-p=\"' + p.id + '\">' + p.名 + '</button>';\n    }).join('');\n    [].forEach.call(document.querySelectorAll('.yx-tab'), function (b) {",
  "    document.getElementById('yx-tb').innerHTML = 页表.map(function (p) {\n      return '<button class=\"' + (页 === p.id ? 'on' : '') + '\" data-p=\"' + p.id + '\">' + (ICON[p.id] || '') + '<span>' + p.名 + '</span></button>';\n    }).join('');\n    [].forEach.call(document.querySelectorAll('.yx-tb button'), function (b) {"
);

// ── 5. 帮助按钮 ──
t = t.replace("  document.getElementById('yx-close').addEventListener('click', 关层);",
  "  document.getElementById('yx-md-x').addEventListener('click', 关层);\n  document.getElementById('yx-help').addEventListener('click', function () { 页 = 'help'; 画页签(); 画(); });");
t = t.replace("  function 关层() { 层.classList.remove('on'); 遮.classList.remove('on'); }",
  "  function 关层() { 层.classList.remove('on'); 遮.classList.remove('on'); }");
t = t.replace("  var 遮 = document.getElementById('yx-mask');", "  var 遮 = document.getElementById('yx-msk');");
t = t.replace("  var 层 = document.getElementById('yx-modal');", "  var 层 = document.getElementById('yx-md');");
t = t.replace("  var 层内 = document.getElementById('yx-mcontent');", "  var 层内 = document.getElementById('yx-md-c');");
t = t.replace("  var 体 = document.getElementById('yx-body');", "  var 体 = document.getElementById('yx-bd');");

// ── 6. 画() 里调 画四数 ──
t = t.replace("  function 画() {\n    var H = 画出招();", "  function 画() {\n    画四数();\n    var H = 画出招();");

// ── 7. 「说明」不在页签里，但页 === 'help' 仍可渲染 ──
t = t.replace("    if (页 === 'help')", "    if (页 === 'help')");

fs.writeFileSync(p, t);
console.log('✅ 逻辑已适配新骨架（类名映射 + 四数条 + 图标页签 + 帮助按钮）');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
