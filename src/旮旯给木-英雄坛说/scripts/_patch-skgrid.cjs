// 技能页：折叠列表 → 技能格子（图标 + 环形等级 + 角标），点开看详情
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// 找技能页里「已学」渲染那段（从 if(!已学.length) 到 H += 那句说明）
const 起 = t.indexOf("    if (!已学.length) H += '<div class=\"yx-e\">还没学任何功夫。去找个师傅，或者去翻秘籍。</div>';");
const 止 = t.indexOf("    H += '<div class=\"yx-nt\">升级消耗见各项展开；点开可见通向的绝招。</div></div></div>';");
if (起 < 0 || 止 < 0) { console.error('找不到技能渲染段 ' + 起 + ' ' + 止); process.exit(1); }
const 止末 = 止 + "    H += '<div class=\"yx-nt\">升级消耗见各项展开；点开可见通向的绝招。</div></div></div>';".length;

const 新段 = [
  '    // ★ 技能格子（游戏技能栏的做法：图标 + 环形等级 + 角标）',
  '    if (!已学.length) H += \'<div class="yx-e">尚无已学技能。需拜师或寻秘籍。</div>\';',
  '    else {',
  '      var 绝全 = D.绝招 || [];',
  '      H += \'<div class="yx-skgrid">\';',
  '      H += 已学.map(function (x) {',
  '        var 名 = x[0], 现 = 数(x[1]), 类 = x[2];',
  '        var 悟 = Math.max(1, t.悟性);',
  '        var 要 = Math.max(1, Math.round(355.06 * (现 + 1) / 悟));',
  '        var pct = Math.min(100, Math.round(现 / 255 * 100));',
  '        var 够 = 数((状态.资源 || {}).潜能) >= 要;',
  '        var 环 = 2 * Math.PI * 15;',
  '        var 弧 = 环 * pct / 100;',
  '        return \'<div class="yx-sk" data-skk="\' + E(名) + \'">\'',
  '          + \'<div class="ring"><svg viewBox="0 0 36 36" width="36" height="36">\'',
  '          + \'<circle cx="18" cy="18" r="15" fill="none" stroke="var(--ln)" stroke-width="2.5"/>\'',
  '          + \'<circle cx="18" cy="18" r="15" fill="none" stroke="var(--gold)" stroke-width="2.5" \'',
  '          +   \'stroke-dasharray="\' + 弧 + " " + 环 + \'" stroke-linecap="round" transform="rotate(-90 18 18)" opacity=".85"/>\'',
  '          + \'</svg><span class="ic">\' + ic(功夫图标(名), 17) + \'</span></div>\'',
  '          + \'<div class="nm">\' + E(名) + \'</div>\'',
  '          + \'<div class="lv">\' + 现 + \'</div>\'',
  '          + \'<div class="bdg">\' + (够 ? "可升" : "潜能不足") + \'</div>\'',
  '          + \'</div>\';',
  '      }).join("");',
  '      H += \'</div>\';',
  '      H += \'<div class="yx-nt">点格子看升级消耗与通向的绝招。环为当前等级（上限 255）。</div>\';',
  '    }',
  '    H += \'</div></div>\';',
].join('\n');

t = t.slice(0, 起) + 新段 + t.slice(止末);

// 点技能格 → 弹层（详情 + 请教按钮）
const 详情 = [
  '  /* 技能格子的详情弹层 */',
  '  function 开技能(名) {',
  '    var 技 = (状态.技能 || {}).基本 || {}, 门技 = (状态.技能 || {}).门派 || {};',
  '    var 现 = 有(技, 名) ? 数(技[名]) : 数(门技[名]);',
  '    var t = 算天赋(状态), 悟 = Math.max(1, t.悟性);',
  '    var 要 = Math.max(1, Math.round(355.06 * (现 + 1) / 悟));',
  '    var 类 = 有(技, 名) ? "基本" : "门派";',
  '    var nf = 10 - (现 % 10 || 0);',
  '    var 对应 = { "基本拳脚": "膂力", "基本轻功": "敏捷", "基本内功": "根骨", "读书写字": "悟性" }[名];',
  '    var 内 = "";',
  '    内 += 折行("当前等级", 现 + " / 255");',
  '    内 += 折行("分类", 类);',
  '    内 += 折行("升级消耗", 要 + " 潜能" + (数((状态.资源 || {}).潜能) >= 要 ? \' <span class="gr">（足）</span>\' : \' <span class="w">（不足）</span>\'));',
  '    内 += 折行("天赋反哺", nf === 10 ? \'<span class="gr">本级触发</span>\' : ("距反哺 " + nf + " 级"));',
  '    if (对应) 内 += 折行("对应天赋", 对应);',
  '    var 关绝 = (D.绝招 || []).filter(function (j) { return String(j.条件 || "").indexOf(名) >= 0; });',
  '    if (关绝.length) {',
  '      内 += \'<div class="yx-k2">通向的绝招</div>\';',
  '      内 += 关绝.map(function (j) {',
  '        return \'<div class="rowx"><span class="k2">\' + ic("法术", 12) + " " + E(j.名) + \'</span><span class="v2">\' + E(j.条件) + \'</span></div>\'',
  '          + (j.效果 ? \'<div class="rowx"><span class="k2"></span><span class="v2" style="color:var(--t3);font-size:11.5px">\' + E(j.效果) + "　冷却 " + (j.冷却 == null ? "—" : j.冷却) + "</span></div>" : "");',
  '      }).join("");',
  '    }',
  '    开层(名 + "　Lv" + 现, 内 + \'<div class="yx-ops" style="margin-top:12px">\'',
  '      + \'<button class="yx-btn pri" data-sk="\' + E(名) + \'">请教 1 级</button>\'',
  '      + \'<button class="yx-btn" data-sk5="\' + E(名) + \'">连请教 5 级</button></div>\');',
  '    // 弹层里的按钮要重新绑（因为开层会重建 innerHTML）',
  '    绑请教();',
  '  }',
  '  function 绑请教() {',
  '    [].forEach.call(层.querySelectorAll("[data-sk]"), function (b) {',
  '      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 请教(b.getAttribute("data-sk")); });',
  '    });',
  '    [].forEach.call(层.querySelectorAll("[data-sk5]"), function (b) {',
  '      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 请教(b.getAttribute("data-sk5"), 5); });',
  '    });',
  '  }',
  '',
].join('\n');
t = t.replace('  /* 技能格子的详情弹层 */', '  /* 技能格子的详情弹层 */');
t = t.replace('  /* ── 物品操作 ── */', 详情 + '  /* ── 物品操作 ── */');

// 绑技能格点击
t = t.replace('    // ── 物品格 / 装备槽 ──', [
  '    // ── 技能格 ──',
  '    [].forEach.call(document.querySelectorAll(".yx-sk"), function (c) {',
  '      c.addEventListener("click", function () { 开技能(c.getAttribute("data-skk")); });',
  '    });',
  '',
  '    // ── 物品格 / 装备槽 ──',
].join('\n'));

fs.writeFileSync(p, t);
console.log('✅ 技能页：改成技能格子（环形等级 + 图标 + 角标），点开看详情与通向的绝招');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');

// CSS
const gp = 'src/旮旯给木-英雄坛说/正则/_面板骨架.html';
let g = fs.readFileSync(gp, 'utf8');
const css = [
  '/* ══ 技能格（游戏技能栏）══ */',
  '.yx-skgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:9px}',
  '.yx-sk{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;',
  '  padding:11px 6px 9px;border-radius:var(--r3);border:1px solid var(--ln);background:var(--b0);',
  '  cursor:pointer;transition:.16s}',
  '.yx-sk:hover{border-color:var(--ln3);transform:translateY(-2px);box-shadow:var(--sh)}',
  '.yx-sk .ring{position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center}',
  '.yx-sk .ring svg{position:absolute;inset:0}',
  '.yx-sk .ring .ic{color:var(--gold);display:flex;z-index:1}',
  '.yx-sk .nm{font-size:11px;color:var(--t1);text-align:center;line-height:1.25;margin-top:3px;',
  '  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
  '.yx-sk .lv{font-size:14px;font-weight:500;color:var(--t1);font-variant-numeric:tabular-nums}',
  '.yx-sk .bdg{font-size:9.5px;color:var(--t4);border:1px solid var(--ln2);border-radius:20px;padding:0 6px}',
  '.yx-sk .bdg:contains("可升"){color:var(--grn)}',
].join('\n');
g = g.replace('@media(max-width:560px){.yx-quad', css + '\n@media(max-width:560px){.yx-quad');
fs.writeFileSync(gp, g);
console.log('✅ 技能格 CSS 已加');
