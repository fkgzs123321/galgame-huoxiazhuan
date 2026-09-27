// 补交互：行囊（装备/使用/丢）· 身体（换装/调兴奋/起周期）· 活计（接/推进/弃）
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ── 1. 行囊：物品可点 → 弹层操作 ──
t = t.replace(
  "    else H += '<div class=\"yx-chips\">' + 包.map(function (x) {\n      var 名 = (typeof x === 'string') ? x : (x.名 || x.id || '?');\n      var 品 = (typeof x === 'object' && x.品质) ? x.品质 : '';\n      return '<span class=\"yx-chip' + (品 === '神兵' ? ' r' : 品 === '珍奇' ? ' on' : '') + '\">' + E(名) + (品 ? ' · ' + E(品) : '') + '</span>';\n    }).join('') + '</div>';",
  "    else H += '<div class=\"yx-chips\">' + 包.map(function (x, i) {\n      var 名 = (typeof x === 'string') ? x : (x.名 || x.id || '?');\n      var 品 = (typeof x === 'object' && x.品质) ? x.品质 : '';\n      return '<span class=\"yx-chip yx-use\" data-i=\"' + i + '\" data-n=\"' + E(名) + '\" style=\"cursor:pointer\">' + E(名) + (品 ? ' · ' + E(品) : '') + '</span>';\n    }).join('') + '</div>';"
);

// ── 2. 身体页：部位可点 + 兴奋度加减 + 周期可起 ──
t = t.replace(
  "      + (D.NSFW.穿着.部位 || []).map(function (p) {\n        var 有2 = 穿[p];\n        return '<span class=\"yx-chip' + (有2 ? ' on' : '') + '\">' + E(p) + (有2 ? '：' + E(有2) : '') + '</span>';\n      }).join('') + '</div><div class=\"yx-sub\">' + 露不露(穿).程度",
  "      + (D.NSFW.穿着.部位 || []).map(function (p) {\n        var 有2 = 穿[p];\n        return '<span class=\"yx-chip yx-cloth' + (有2 ? ' on' : '') + '\" data-p=\"' + E(p) + '\" style=\"cursor:pointer\">' + E(p) + (有2 ? '：' + E(有2) : '　') + '</span>';\n      }).join('') + '</div><div class=\"yx-sub\">' + 露不露(穿).程度"
);
t = t.replace(
  "      + '<div class=\"yx-sub\">' + Math.round(兴) + '　' + 档名(兴) + '</div>'",
  "      + '<div class=\"yx-line\" style=\"margin-top:6px\"><span>' + Math.round(兴) + '　' + 档名(兴) + '</span>'\n      + '<span><button class=\"yx-plus\" data-ar=\"-10\">−10</button> <button class=\"yx-plus\" data-ar=\"10\">＋10</button> <button class=\"yx-plus\" data-ar=\"25\">＋25</button></span></div>'\n      + '<div class=\"yx-sub\">单轮最多涨 ' + ((D.NSFW.推进 || {}).单轮上限 || 25) + '（引擎口径）</div>'"
);
// 周期：加「起一个」按钮
t = t.replace(
  "      + '<div class=\"yx-sub\">★ 周期不只装这个 —— 养伤、闭关、毒发都是同一个形状。中断也照落账。</div></div></div>';",
  "      + '<div class=\"yx-sub\">★ 周期不只装这个 —— 养伤、闭关、毒发都是同一个形状。中断也照落账。</div>'\n      + '<div class=\"yx-chips\" style=\"margin-top:7px\">' + 周表.filter(function (k) { return !周期在跑[k]; }).map(function (k) {\n        return '<span class=\"yx-chip yx-cyc\" data-c=\"' + E(k) + '\" style=\"cursor:pointer\">起：' + E((D.NSFW.周期[k] || {}).名 || k) + '</span>';\n      }).join('') + '</div></div></div>';"
);

// ── 3. 活计页：任务可点 ──
t = t.replace(
  "    H += 在做.length ? 在做.map(function (x) {\n      var 需 = 数(x[1].需要), 进 = 数(x[1].进度);\n      return '<div style=\"margin-bottom:8px\"><div class=\"yx-line\"><span>' + E(x[1].名 || x[0]) + '</span><b>'",
  "    H += 在做.length ? 在做.map(function (x) {\n      var 需 = 数(x[1].需要), 进 = 数(x[1].进度);\n      return '<div class=\"yx-task\" data-t=\"' + E(x[0]) + '\" style=\"margin-bottom:8px;cursor:pointer\"><div class=\"yx-line\"><span>' + E(x[1].名 || x[0]) + '</span><b>'"
);

// ── 4. 新函数：装备 / 用 / 丢 / 换装 / 调兴奋 / 起周期 / 接任务 ──
const 新函数 = [
  '  /* ── 物品操作 ── */',
  '  function 开物品(i, 名) {',
  '    var 包 = 状态.背包 || [];',
  '    var x = 包[i];',
  '    var 物 = (typeof x === "object") ? x : { 名: 名 };',
  '    var 例表 = ((D.物品 || {}).示例 || []);',
  '    var 参 = null;',
  '    for (var q = 0; q < 例表.length; q++) if (例表[q].名 === 名) 参 = 例表[q];',
  '    var rows = "";',
  '    if (参) {',
  '      rows += 行("价格", 参.价格 ? 参.价格 + " 文" : "不卖") + 行("品质", 参.品质 || "") + 行("槽位", 参.槽 || "");',
  '      rows += "<div class=\\"yx-h\\" style=\\"margin-top:10px\\">加成（按价格推）</div>";',
  '      rows += Object.keys(参.加成 || {}).map(function (k) { return 行(k, "+" + 参.加成[k]); }).join("");',
  '      rows += \'<div class="yx-sub">加成 = 价格 ÷ 100，再按用途分配到字段上</div>\';',
  '    } else rows += \'<div class="yx-empty">契约层没有这件的更多资料。</div>\';',
  '    var 槽 = 参 && 参.槽;',
  '    开层(名, rows + \'<div class="yx-h" style="margin-top:12px">能做什么</div>\'',
  '      + \'<div class="yx-fork">\'',
  '      + (槽 ? \'<button class="yx-btn go" data-op="equip" data-i="\' + i + \'" data-slot="\' + E(槽) + \'">装备</button>\' : "")',
  '      + \'<button class="yx-btn" data-op="use" data-i="\' + i + \'">用掉</button>\'',
  '      + \'<button class="yx-btn deny" data-op="drop" data-i="\' + i + \'">丢掉</button>\'',
  '      + \'</div>\');',
  '    绑物品按钮();',
  '  }',
  '  function 绑物品按钮() {',
  '    [].forEach.call(层.querySelectorAll("[data-op]"), function (b) {',
  '      b.addEventListener("click", function () {',
  '        var op = b.getAttribute("data-op"), i = 数(b.getAttribute("data-i"));',
  '        var 槽 = b.getAttribute("data-slot");',
  '        var 包 = 状态.背包 || [], x = 包[i];',
  '        var 名 = (typeof x === "string") ? x : (x.名 || "");',
  '        关层();',
  '        if (op === "equip") {',
  '          写(function (sd) {',
  '            sd.NSFW = sd.NSFW || {}; sd.NSFW.穿着 = sd.NSFW.穿着 || {};',
  '            sd.NSFW.穿着[槽] = 名;   // ★ 换了就换，旧的自动被替下',
  '          });',
  '        } else if (op === "use") {',
  '          写(function (sd) { sd.背包 = (sd.背包 || []).filter(function (_, k) { return k !== i; }); });',
  '        } else {',
  '          写(function (sd) { sd.背包 = (sd.背包 || []).filter(function (_, k) { return k !== i; }); });',
  '        }',
  '      });',
  '    });',
  '  }',
  '',
  '  /* ── 穿着：点部位换或脱 ── */',
  '  function 开部位(p) {',
  '    var 穿 = ((状态.NSFW || {}).穿着) || {};',
  '    var 有2 = 穿[p];',
  '    var 包 = (状态.背包 || []).filter(function (x) {',
  '      var n = (typeof x === "string") ? x : (x.名 || "");',
  '      var 例 = ((D.物品 || {}).示例 || []).filter(function (y) { return y.名 === n; })[0];',
  '      return 例 && (例.槽 || "").indexOf(p.slice(0, 1)) >= 0;',
  '    });',
  '    开层(p, (有2 ? 行("现在", 有2) : \'<div class="yx-empty">这一处空着。</div>\')',
  '      + \'<div class="yx-h" style="margin-top:11px">能换上的</div>\'',
  '      + (包.length ? \'<div class="yx-chips">\' + 包.map(function (x) {',
  '          var n = (typeof x === "string") ? x : (x.名 || "");',
  '          return \'<span class="yx-chip yx-wear" data-p="\' + E(p) + \'" data-n="\' + E(n) + \'" style="cursor:pointer">\' + E(n) + \'</span>\';',
  '        }).join("") + \'</div>\' : \'<div class="yx-empty">身上没有这一处的衣物。</div>\')',
  '      + (有2 ? \'<div class="yx-fork" style="margin-top:12px"><button class="yx-btn deny" id="yx-takeoff">脱下</button></div>\' : ""));',
  '    var tk = document.getElementById("yx-takeoff");',
  '    if (tk) tk.addEventListener("click", function () { 关层(); 写(function (sd) { sd.NSFW.穿着[p] = ""; }); });',
  '    [].forEach.call(层.querySelectorAll(".yx-wear"), function (c) {',
  '      c.addEventListener("click", function () {',
  '        var n = c.getAttribute("data-n"); 关层();',
  '        写(function (sd) { sd.NSFW = sd.NSFW || {}; sd.NSFW.穿着 = sd.NSFW.穿着 || {}; sd.NSFW.穿着[p] = n; });',
  '      });',
  '    });',
  '  }',
  '',
  '  /* ── 任务：推进 / 放弃 ── */',
  '  function 开任务(k) {',
  '    var x = (状态.任务 || {})[k] || {};',
  '    var d = (D.任务 || {})[k] || {};',
  '    开层(x.名 || d.名 || k,',
  '      行("状态", x.状态 || "进行") + 行("进度", x.需字 = (数(x.进度) + (数(x.需要) ? " / " + 数(x.需要) : "")))',
  '      + (d.接的谁 ? 行("谁给的", d.接的谁) : "")',
  '      + (d.说明 ? \'<div class="yx-sub" style="margin-top:8px">\' + E(d.说明) + "</div>" : "")',
  '      + \'<div class="yx-h" style="margin-top:12px">做成给什么</div>\'',
  '      + (d.完成后果 ? Object.keys(d.完成后果).map(function (q) { return 行(q, "+" + d.完成后果[q]); }).join("") : \'<div class="yx-empty">—</div>\')',
  '      + \'<div class="yx-h" style="margin-top:10px">砸了怎么着</div>\'',
  '      + (d.失败后果 && Object.keys(d.失败后果).length ? Object.keys(d.失败后果).map(function (q) { return 行(q, d.失败后果[q], "yx-warn"); }).join("") : \'<div class="yx-empty">—</div>\')',
  '      + \'<div class="yx-fork" style="margin-top:12px">\'',
  '      + \'<button class="yx-btn go" id="yx-tadv">推进一层</button>\'',
  '      + \'<button class="yx-btn deny" id="yx-tgive">放弃</button></div>\'',
  '      + \'<div class="yx-tip">★ 失败也是结算 —— 好感掉、线关掉，不是「什么都没发生」。</div>\');',
  '    var a = document.getElementById("yx-tadv"), b2 = document.getElementById("yx-tgive");',
  '    if (a) a.addEventListener("click", function () {',
  '      关层();',
  '      写(function (sd) {',
  '        sd.任务 = sd.任务 || {}; var r = sd.任务[k] || {};',
  '        r.进度 = 数(r.进度) + 1;',
  '        if (数(r.需要) > 0 && r.进度 >= 数(r.需要)) r.状态 = "完成";',
  '        sd.任务[k] = r;',
  '      });',
  '    });',
  '    if (b2) b2.addEventListener("click", function () {',
  '      关层();',
  '      写(function (sd) { sd.任务 = sd.任务 || {}; if (sd.任务[k]) sd.任务[k].状态 = "失败"; });',
  '    });',
  '  }',
  '',
].join('\n');

t = t.replace('  /* ── 状态一览（从契约状态表内嵌）── */', 新函数 + '  /* ── 状态一览（从契约状态表内嵌）── */');

// ── 5. 绑事件（在画() 里）──
t = t.replace(
  "    // 人物页：点名字看档案",
  [
    '    // 物品 / 部位 / 任务 / 兴奋度 / 周期',
    '    [].forEach.call(document.querySelectorAll(".yx-use"), function (c) {',
    '      c.addEventListener("click", function () { 开物品(数(c.getAttribute("data-i")), c.getAttribute("data-n")); });',
    '    });',
    '    [].forEach.call(document.querySelectorAll(".yx-cloth"), function (c) {',
    '      c.addEventListener("click", function () { 开部位(c.getAttribute("data-p")); });',
    '    });',
    '    [].forEach.call(document.querySelectorAll(".yx-task"), function (c) {',
    '      c.addEventListener("click", function () { 开任务(c.getAttribute("data-t")); });',
    '    });',
    '    [].forEach.call(document.querySelectorAll("[data-ar]"), function (b) {',
    '      b.addEventListener("click", function () {',
    '        var 增 = 数(b.getAttribute("data-ar"));',
    '        var 上 = 数((D.NSFW.推进 || {}).单轮上限, 25);',
    '        if (增 > 上) 增 = 上;   // ★ 引擎口径：单轮封顶',
    '        写(function (sd) { sd.NSFW = sd.NSFW || {}; sd.NSFW.兴奋度 = 夹(数(sd.NSFW.兴奋度) + 增, 0, 100); });',
    '      });',
    '    });',
    '    [].forEach.call(document.querySelectorAll(".yx-cyc"), function (c) {',
    '      c.addEventListener("click", function () {',
    '        var k = c.getAttribute("data-c"), d = (D.NSFW.周期 || {})[k] || {};',
    '        写(function (sd) {',
    '          sd.NSFW = sd.NSFW || {}; sd.NSFW.周期 = sd.NSFW.周期 || {};',
    '          sd.NSFW.周期[k] = { 名: d.名 || k, 已经过: 0, 进度: 1, 当前阶段: "" };',
    '        });',
    '      });',
    '    });',
    '',
    '    // 人物页：点名字看档案',
  ].join('\n')
);

fs.writeFileSync(p, t);
console.log('✅ 交互已补：物品（装备/用/丢）· 部位（换/脱）· 任务（推进/放弃）· 兴奋度（±）· 周期（起）');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
