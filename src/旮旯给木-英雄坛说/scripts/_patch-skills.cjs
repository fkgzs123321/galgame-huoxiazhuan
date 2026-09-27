// 重写技能页：真技能树（三层 SVG，节点可点）+ 绝招表（条件/效果/冷却）+ 公式说明
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ── 1. 新的技能页 ──
const 新技能页 = [
  '  function 画技能() {',
  '    var 技 = (状态.技能 || {}).基本 || {}, 门技 = (状态.技能 || {}).门派 || {};',
  '    var t = 算天赋(状态);',
  '    var 已学 = [];',
  '    for (var k in 技) if (数(技[k]) > 0) 已学.push([k, 技[k], "基本"]);',
  '    for (var j in 门技) if (数(门技[j]) > 0) 已学.push([j, 门技[j], "门派"]);',
  '',
  '    var H = "";',
  '    // ── 成本公式（可交互的计算器）──',
  '    H += \'<div class="yx-row"><div class="yx-panel yx-full"><div class="yx-h">请教成本（公式）</div>\'',
  '      + \'<div class="yx-help" style="font-size:12px">\'',
  '      + \'<code>成本 = 355.06 × (当前等级 + 1) ÷ max(1, 悟性)</code>\'',
  '      + \'<ul><li>常数 <code>355.06</code> 是从原作反解出来的（一门学满 250 级的总消耗）</li>\'',
  '      + \'<li>你的悟性 <b>\' + t.悟性 + "</b>　潜能 <b>" + 数((状态.资源 || {}).潜能) + \'</b></li>\'',
  '      + \'<li>所以悟性越高，同一级花的潜能越少 —— 这就是为什么开局要先读书</li></ul></div>\'',
  '      + \'<table class="yx-tbl"><thead><tr><th>功夫</th><th>类别</th><th>现在</th><th>下一级要</th><th>反哺</th><th>操作</th></tr></thead><tbody>\';',
  '    if (!已学.length) H += \'<tr><td colspan="6" class="yx-empty">还没学任何功夫。去找个师傅，或者去翻秘籍。</td></tr>\';',
  '    else H += 已学.map(function (x) {',
  '      var 现 = 数(x[1]), 悟 = Math.max(1, t.悟性);',
  '      var 要 = Math.max(1, Math.round(355.06 * (现 + 1) / 悟));',
  '      var nf = 10 - (现 % 10 || 0);',
  '      var 够 = 数((状态.资源 || {}).潜能) >= 要;',
  '      return \'<tr><td>\' + E(x[0]) + \'</td><td>\' + x[2] + \'</td><td class="yx-num">\' + 现 + \'</td>\'',
  '        + \'<td class="yx-num">\' + 要 + (够 ? "" : \' <span class="yx-warn">不够</span>\') + \'</td>\'',
  '        + \'<td>\' + (nf === 10 ? \'<span class="yx-grn">下一级</span>\' : "还 " + nf + " 级") + \'</td>\'',
  '        + \'<td><button class="yx-plus" data-sk="\' + E(x[0]) + \'">＋1</button> \'',
  '        + \'<button class="yx-plus" data-sk5="\' + E(x[0]) + \'" title="连请教五级">＋5</button></td></tr>\';',
  '    }).join("");',
  '    H += \'</tbody></table></div></div>\';',
  '',
  '    // ── 技能树（三层 SVG）──',
  '    H += \'<div class="yx-row"><div class="yx-panel yx-full"><div class="yx-h">技能树（点节点看条件）</div>\'',
  '      + \'<div class="yx-tree">\' + 画树() + \'</div>\'',
  '      + \'<div class="yx-sub">基本武功 → 门派武功 → 绝招。★ 绝招不是独立等级，是几门同时到位才开。</div>\'',
  '      + \'</div></div>\';',
  '',
  '    // ── 绝招表（条件 / 效果 / 冷却）──',
  '    var 绝 = D.绝招 || [];',
  '    if (绝.length) {',
  '      H += \'<div class="yx-row"><div class="yx-panel yx-full"><div class="yx-h">绝招（\' + 绝.length + \'）</div>\'',
  '        + \'<table class="yx-tbl wrap"><thead><tr><th>派</th><th>招</th><th>条件</th><th>效果</th><th>冷却</th></tr></thead><tbody>\'',
  '        + 绝.map(function (x) {',
  '          return \'<tr><td>\' + E(x.派) + \'</td><td>\' + E(x.名) + \'</td><td class="yx-num">\' + E(x.条件) + \'</td>\'',
  '            + \'<td>\' + E(x.效果) + \'</td><td class="yx-num">\' + (x.冷却 == null ? "—" : x.冷却 + " 回合") + \'</td></tr>\';',
  '        }).join("") + \'</tbody></table></div></div>\';',
  '    }',
  '',
  '    // ── 十门基本功 ──',
  '    var 基 = D.基本武功 || [];',
  '    if (基.length) {',
  '      H += \'<div class="yx-row"><div class="yx-panel yx-full"><div class="yx-h">十门基本功（反哺的来源）</div><div class="yx-chips">\'',
  '        + 基.map(function (n) {',
  '          var v = 数(技[n]);',
  '          return \'<span class="yx-chip\' + (v > 0 ? " on" : " off") + \'">\' + E(n) + (v > 0 ? " " + v : "") + \'</span>\';',
  '        }).join("") + \'</div>\'',
  '        + \'<div class="yx-sub">每满十级 → 一个天赋 +1。基本拳脚→膂力、基本轻功→敏捷、基本内功→根骨、读书写字→悟性</div></div></div>\';',
  '    }',
  '    return H;',
  '  }',
  '',
].join('\n');

// 替换旧的 画技能（从 `function 画技能` 到它结束的 `}` 之后）
const 起 = t.indexOf('  function 画技能() {');
const 止 = t.indexOf('  function 画树()');
if (起 < 0 || 止 < 0) { console.error('找不到 画技能 或 画树'); process.exit(1); }
t = t.slice(0, 起) + 新技能页 + t.slice(止);

// ── 2. 新的技能树（三层，真画）──
const 新树 = [
  '  function 画树() {',
  '    var T = D.技能树 || {};',
  '    var 基 = T.基本 || [], 派 = T.门派 || {}, 绝 = T.绝招 || [];',
  '    if (!基.length && !Object.keys(派).length) return \'<div class="yx-empty">契约层还没填技能树。</div>\';',
  '    var 有 = {};',
  '    var 技 = (状态.技能 || {}).基本 || {}, 门技 = (状态.技能 || {}).门派 || {};',
  '    for (var k in 技) if (数(技[k]) > 0) 有[k] = 数(技[k]);',
  '    for (var j in 门技) if (数(门技[j]) > 0) 有[j] = 数(门技[j]);',
  '',
  '    var 列宽 = [150, 175, 195];',
  '    var 高 = 34;',
  '    var 行数 = Math.max(基.length, 6, 5);',
  '    var W = 列宽[0] + 列宽[1] + 列宽[2] + 80;',
  '    var Hh = 行数 * 高 + 46;',
  '    var s = \'<svg viewBox="0 0 \' + W + " " + Hh + \'" width="\' + W + \'" height="\' + Hh + \'">\';',
  '',
  '    // 列标题',
  '    var 头 = ["基本武功", "门派武功", "绝招"];',
  '    var 头x = [4, 列宽[0] + 34, 列宽[0] + 列宽[1] + 62];',
  '    for (var i = 0; i < 3; i++) {',
  '      s += \'<text x="\' + 头x[i] + \'" y="14" fill="var(--gold)" font-size="11" letter-spacing="1">\' + 头[i] + "</text>";',
  '    }',
  '',
  '    // ① 基本武功（一列）',
  '    var 位 = {};',
  '    基.forEach(function (n, i) {',
  '      var y = 30 + i * 高;',
  '      var v = 数(有[n]);',
  '      var on = v > 0;',
  '      位[n] = y + 9;',
  '      s += \'<rect x="4" y="\' + y + \'" width="\' + (列宽[0] - 14) + \'" height="20" rx="5" fill="\' + (on ? "var(--bg3)" : "var(--bg0)") + \'" stroke="\' + (on ? "var(--gold)" : "var(--line)") + \'" stroke-width="0.5"/>\';',
  '      s += \'<text x="12" y="\' + (y + 14) + \'" fill="\' + (on ? "var(--gold)" : "var(--faint)") + \'" font-size="11">\' + E(n) + (on ? "  " + v : "") + "</text>";',
  '    });',
  '',
  '    // ② 门派武功（按当前门派；没门派就把所有派列出来按行分）',
  '    var 当前派 = (状态.场景 || {}).当前门派;',
  '    var 派名 = Object.keys(派);',
  '    var 要画的派 = (当前派 && 派[当前派]) ? [当前派] : 派名.slice(0, 2);',
  '    var y2 = 30;',
  '    要画的派.forEach(function (派名2) {',
  '      var 列 = 派[派名2] || [];',
  '      s += \'<text x="\' + (列宽[0] + 34) + \'" y="\' + (y2 - 4) + \'" fill="var(--dim)" font-size="10">\' + E(派名2) + "</text>";',
  '      列.forEach(function (n, i) {',
  '        var y = y2 + 8 + i * 高;',
  '        var v = 数(有[n]);',
  '        var on = v > 0;',
  '        s += \'<rect x="\' + (列宽[0] + 34) + \'" y="\' + y + \'" width="\' + (列宽[1] - 14) + \'" height="20" rx="5" fill="\' + (on ? "var(--bg3)" : "var(--bg0)") + \'" stroke="\' + (on ? "var(--blu)" : "var(--line)") + \'" stroke-width="0.5"/>\';',
  '        s += \'<text x="\' + (列宽[0] + 42) + \'" y="\' + (y + 14) + \'" fill="\' + (on ? "var(--blu)" : "var(--faint)") + \'" font-size="11">\' + E(n) + (on ? "  " + v : "") + "</text>";',
  '        // 从基本内功拉一条虚线到门派武功（表示基础）',
  '        if (位["基本内功"] !== undefined) {',
  '          s += \'<path d="M\' + (列宽[0] - 10) + " " + 位["基本内功"] + " H" + (列宽[0] + 20) + " V" + (y + 10) + " H" + (列宽[0] + 33) + \'" fill="none" stroke="var(--line2)" stroke-width="0.5" stroke-dasharray="3 3" opacity="0.5"/>\';',
  '        }',
  '      });',
  '      y2 += 8 + 列.length * 高 + 14;',
  '    });',
  '',
  '    // ③ 绝招（这一派的所有绝招，带条件）',
  '    var 本派绝 = 绝.filter(function (x) { return 要画的派.indexOf(x.派) >= 0; });',
  '    var y3 = 30;',
  '    本派绝.forEach(function (x, i) {',
  '      var y = y3 + i * (高 + 10);',
  '      var 够了 = 判绝招够没(x.条件, 有);',
  '      s += \'<rect x="\' + (列宽[0] + 列宽[1] + 62) + \'" y="\' + y + \'" width="\' + (列宽[2] - 20) + \'" height="28" rx="5" fill="var(--bg0)" stroke="\' + (够了 ? "var(--gold)" : "var(--line)") + \'" stroke-width="0.5"/>\';',
  '      s += \'<text x="\' + (列宽[0] + 列宽[1] + 70) + \'" y="\' + (y + 12) + \'" fill="\' + (够了 ? "var(--gold)" : "var(--ink2)") + \'" font-size="11">\' + E(x.名) + "</text>";',
  '      s += \'<text x="\' + (列宽[0] + 列宽[1] + 70) + \'" y="\' + (y + 23) + \'" fill="var(--faint)" font-size="9.5">\' + E(String(x.条件 || "").slice(0, 26)) + "</text>";',
  '    });',
  '',
  '    s += "</svg>";',
  '    return s;',
  '  }',
  '',
  '  /* 判绝招条件够没：把「基本内功/太极神功 ≥80」这种字符串拆开比 */',
  '  function 判绝招够没(条件, 有) {',
  '    if (!条件) return false;',
  '    var m = String(条件).match(/≥\\s*(\\d+)/);',
  '    if (!m) return false;',
  '    var 要 = Number(m[1]);',
  '    var 名 = String(条件).split(/[\\/≥]/).map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^\\d+$/.test(x) && x.indexOf("级") < 0; });',
  '    for (var i = 0; i < 名.length; i++) {',
  '      if (数(有[名[i]]) < 要) return false;',
  '    }',
  '    return 名.length > 0;',
  '  }',
  '',
].join('\n');

// 替换旧的 画树
const 树起 = t.indexOf('  function 画树() {');
const 树止 = t.indexOf('  /* ── 行囊 ── */');
if (树起 < 0 || 树止 < 0) { console.error('找不到 画树'); process.exit(1); }
t = t.slice(0, 树起) + 新树 + t.slice(树止);

// ── 3. ＋5 按钮的绑定 ──
t = t.replace("      b.addEventListener('click', function () { 请教(b.getAttribute('data-sk')); });",
  "      b.addEventListener('click', function () { 请教(b.getAttribute('data-sk')); });\n    });\n    [].forEach.call(document.querySelectorAll('.yx-plus[data-sk5]'), function (b) {\n      b.addEventListener('click', function () { 请教(b.getAttribute('data-sk5'), 5); });");

// ── 4. 请教支持连升 ──
t = t.replace("  function 请教(名) {\n    var t = 算天赋(状态);", "  function 请教(名, 次) {\n    var 次s = Math.max(1, 数(次, 1));\n    var t = 算天赋(状态);");
t = t.replace("    var 要 = Math.max(1, Math.round(355.06 * (现 + 1) / Math.max(1, t.悟性)));\n    var 潜 = 数((状态.资源 || {}).潜能);",
  "    var 总 = 0, 现2 = 现;\n    for (var i2 = 0; i2 < 次s; i2++) { 总 += Math.max(1, Math.round(355.06 * (现2 + 1) / Math.max(1, t.悟性))); 现2++; }\n    var 要 = 总;\n    var 潜 = 数((状态.资源 || {}).潜能);");
t = t.replace("      if (有((sd.技能 || {}).基本, 名)) sd.技能.基本[名] = 现 + 1;\n      else { sd.技能.门派 = sd.技能.门派 || {}; sd.技能.门派[名] = 现 + 1; }",
  "      if (有((sd.技能 || {}).基本, 名)) sd.技能.基本[名] = 现 + 次s;\n      else { sd.技能.门派 = sd.技能.门派 || {}; sd.技能.门派[名] = 现 + 次s; }");

fs.writeFileSync(p, t);
console.log('✅ 技能页重写：成本公式 + 真技能树（三层 SVG）+ 绝招表（条件/效果/冷却）+ 连升五级');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
