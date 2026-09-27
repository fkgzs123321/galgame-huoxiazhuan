// 活计页：任务改成「带图标的折叠项 + 子目标」
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

const 新活计 = [
  '  function 画活计() {',
  '    var 任 = 状态.任务 || {};',
  '    var 在做 = [], 完了 = [], 断了 = [];',
  '    for (var k in 任) {',
  '      var x = 任[k];',
  '      if (!x) continue;',
  '      if (x.状态 === "完成") 完了.push([k, x]);',
  '      else if (x.状态 === "失败") 断了.push([k, x]);',
  '      else 在做.push([k, x]);',
  '    }',
  '    var 全 = D.任务 || {};',
  '    var H = "";',
  '',
  '    // ── 在做（折叠项）──',
  '    H += \'<div class="yx-r"><div class="yx-c"><div class="yx-ttl">在做 <em>\' + 在做.length + " / " + (D.任务位上限 || 3) + \'</em></div>\';',
  '    if (!在做.length) H += \'<div class="yx-e">手上没有活。</div>\';',
  '    else H += 在做.map(function (x) {',
  '      var d = 全[x[0]] || {}, r = x[1];',
  '      var 需 = 数(r.需要), 进 = 数(r.进度);',
  '      var pct = 需 > 0 ? Math.round(进 / 需 * 100) : 0;',
  '      var 内 = "";',
  '      // 子项：谁给的 / 类型 / 期限',
  '      内 += 折行("谁给的", E(d.接的谁 || "—"));',
  '      内 += 折行("类型", E(d.类型 || "计数"));',
  '      if (d.期限) 内 += 折行("期限", d.期限 + " 轮");',
  '      内 += 折行("进度", (需 > 0 ? (进 + " / " + 需) : "做"));',
  '      // 子子项：成了给什么 / 砸了怎么着',
  '      if (d.完成后果) {',
  '        内 += \'<div class="yx-k2">做成给什么</div>\' + Object.keys(d.完成后果).map(function (q) {',
  '          return \'<div class="rowx"><span class="k2">\' + E(q) + \'</span><span class="v2 gr">+\' + d.完成后果[q] + "</span></div>";',
  '        }).join("");',
  '      }',
  '      if (d.失败后果 && Object.keys(d.失败后果).length) {',
  '        内 += \'<div class="yx-k2">砸了怎么着</div>\' + Object.keys(d.失败后果).map(function (q) {',
  '          return \'<div class="rowx"><span class="k2">\' + E(q) + \'</span><span class="v2 w">\' + d.失败后果[q] + "</span></div>";',
  '        }).join("");',
  '      }',
  '      if (d.说明) 内 += \'<div class="yx-nt">\' + E(d.说明) + "</div>";',
  '      内 += \'<div class="yx-ops" style="margin-top:9px"><button class="yx-btn pri sm" data-tadv="\' + E(x[0]) + \'">推进一层</button>\'',
  '        + \'<button class="yx-btn dn sm" data-tgive="\' + E(x[0]) + \'">放弃</button></div>\';',
  '      var 图 = d.类型 === "判定" ? "检" : d.类型 === "收集" ? "物品" : "任务";',
  '      return \'<div class="yx-fl\' + (需 > 0 && 进 > 0 ? "" : "") + \'">\'',
  '        + \'<div class="hd"><span class="ar">\' + ic("右", 12) + \'</span>\'',
  '        + \'<span class="i2">\' + ic(图, 14) + \'</span>\'',
  '        + \'<span class="t1">\' + E(r.名 || d.名 || x[0]) + \'</span>\'',
  '        + \'<span class="t2">\' + (需 > 0 ? (进 + "/" + 需) : "做") + \'</span></div>\'',
  '        + (需 > 0 ? \'<div class="yx-bar tk" style="margin:0 12px 6px"><i class="tk" style="width:\' + pct + \'%"></i></div>\' : "")',
  '        + \'<div class="bd">\' + 内 + "</div></div>";',
  '    }).join("");',
  '    H += "</div>";',
  '',
  '    // ── 了结 ──',
  '    H += \'<div class="yx-c"><div class="yx-ttl">了结</div>\';',
  '    H += \'<div class="yx-grid2"><div class="yx-stat"><div class="lbl">完成</div><div class="val gr">\' + 完了.length + "</div></div>"',
  '      + \'<div class="yx-stat"><div class="lbl">失败</div><div class="val\' + (断了.length ? " w" : "") + \'">\' + 断了.length + "</div></div></div>";',
  '    if (完了.length) H += \'<div class="yx-nt">做过：\' + 完了.map(function (x) { return E(x[1].名 || x[0]); }).join("　") + "</div>";',
  '    if (断了.length) H += \'<div class="yx-nt w">断过：\' + 断了.map(function (x) { return E(x[1].名 || x[0]); }).join("　") + "</div>";',
  '    H += \'<div class="yx-nt">★ 失败也是结算 —— 好感掉、线关掉，不是「什么都没发生」。</div></div></div>\';',
  '',
  '    // ── 能接的活（折叠，每个一项）──',
  '    H += \'<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">这个世上能接的活 <em>\' + Object.keys(全).length + \'</em></div>\';',
  '    H += Object.keys(全).map(function (k) {',
  '      var d = 全[k] || {};',
  '      var 图 = d.类型 === "判定" ? "检" : d.类型 === "收集" ? "物品" : "任务";',
  '      var 内 = 折行("谁给的", E(d.接的谁 || "—")) + 折行("类型", E(d.类型 || ""));',
  '      if (d.前置) 内 += 折行("门槛", d.前置.map(function (q) { return E(q.字段) + " " + q.至少; }).join("　"));',
  '      if (d.需要) 内 += 折行("要多少", d.需要);',
  '      if (d.可重复) 内 += 折行("能不能反复做", d.可重复 ? "能" : "一次");',
  '      if (d.完成后果) 内 += \'<div class="yx-k2">做成给什么</div>\' + Object.keys(d.完成后果).map(function (q) {',
  '        return \'<div class="rowx"><span class="k2">\' + E(q) + \'</span><span class="v2 gr">+\' + d.完成后果[q] + "</span></div>"; }).join("");',
  '      if (d.失败后果 && Object.keys(d.失败后果).length) 内 += \'<div class="yx-k2">砸了怎么着</div>\' + Object.keys(d.失败后果).map(function (q) {',
  '        return \'<div class="rowx"><span class="k2">\' + E(q) + \'</span><span class="v2 w">\' + d.失败后果[q] + "</span></div>"; }).join("");',
  '      if (d.说明) 内 += \'<div class="yx-nt">\' + E(d.说明) + "</div>";',
  '      return 折(d.名 || k, 内, d.接的谁 || "", 图);',
  '    }).join("");',
  '    H += "</div></div>";',
  '    return H;',
  '  }',
  '',
].join('\n');

const 起 = t.indexOf('  function 画活计() {');
const 止 = t.indexOf('  /* ── 人物（关系 + 女角 + NPC）── */');
if (起 < 0 || 止 < 0) { console.error('找不到 画活计'); process.exit(1); }
t = t.slice(0, 起) + 新活计 + t.slice(止);

// 展开按钮的事件（在画() 里绑）
const 绑 = [
  '    [].forEach.call(document.querySelectorAll("[data-tadv]"), function (b) {',
  '      b.addEventListener("click", function (e) {',
  '        e.stopPropagation();',
  '        关层();',
  '        var k = b.getAttribute("data-tadv");',
  '        写(function (sd) {',
  '          sd.任务 = sd.任务 || {}; var r = sd.任务[k] || {};',
  '          r.进度 = 数(r.进度) + 1;',
  '          if (数(r.需要) > 0 && r.进度 >= 数(r.需要)) r.状态 = "完成";',
  '          sd.任务[k] = r;',
  '        });',
  '      });',
  '    });',
  '    [].forEach.call(document.querySelectorAll("[data-tgive]"), function (b) {',
  '      b.addEventListener("click", function (e) {',
  '        e.stopPropagation();',
  '        var k = b.getAttribute("data-tgive");',
  '        写(function (sd) { sd.任务 = sd.任务 || {}; if (sd.任务[k]) sd.任务[k].状态 = "失败"; });',
  '      });',
  '    });',
  '',
  '    // ── 折叠展开 ──',
].join('\n');
t = t.replace('    // ── 折叠展开 ──', 绑);

fs.writeFileSync(p, t);
console.log('✅ 活计页重做：任务折叠项（图标 + 子项「谁给的/类型/进度」+ 子子项「成了给什么/砸了怎么着」）');

// 补 .yx-k2 样式
const gp = 'src/旮旯给木-英雄坛说/正则/_面板骨架.html';
let g = fs.readFileSync(gp, 'utf8');
g = g.replace(".yx-fl .tagx{", ".yx-fl .yx-k2{font-size:11px;color:var(--gold);letter-spacing:.06em;margin:9px 0 3px;padding-bottom:3px;border-bottom:1px dashed var(--ln)}\n.yx-fl .tagx{");
fs.writeFileSync(gp, g);
console.log('✅ 补了 .yx-k2 样式');
