// 恢复 <user> 侧的交互 + 接上装备强化 / 技能强化
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');
let n = 0;
const 换 = (a, b) => { if (t.includes(a)) { const c = t.split(a).length - 1; t = t.split(a).join(b); n += c; return true; } return false; };

// ══ ① 强化引擎（面板侧，与机制层同口径）══
const 强化工具 = [
  '  /* ══ 强化（与机制层同口径：拿材料叠层、层数封顶、每层递增）══ */',
  '  function 强化参数() {',
  '    var 说 = D.技能强化 || {};',
  '    var 装 = D.强化 || {};',
  '    return {',
  '      装上限: 数(装.上限, 10), 装每层: 数(装.每层倍率, 0.1), 装材料: 装.每层材料 || { 铁: 2, 灵石: 1 },',
  '      技上限: 数(说.上限, 10), 技每层: 数(说.每层效果, 0.05), 技材料: 说.每层材料 || { 灵石: 2, 铁: 1 },',
  '    };',
  '  }',
  '  function 叠层加成(基础, 层, 每层倍率) { return Math.round(基础 * (1 + 每层倍率 * 层) * 100) / 100; }',
  '  function 要的材料(每层材料, 层) {',
  '    var 出 = {};',
  '    Object.keys(每层材料).forEach(function (k) { 出[k] = 数(每层材料[k]) * (层 + 1); });',
  '    return 出;',
  '  }',
  '  function 材料够吗(要) {',
  '    var 有 = (状态.资源 || {});',
  '    var 缺 = [];',
  '    Object.keys(要).forEach(function (k) { if (数(有[k]) < 要[k]) 缺.push(k + " 差 " + (要[k] - 数(有[k]))); });',
  '    return { 够: !缺.length, 缺: 缺 };',
  '  }',
  '  function 取层(类, 名) { return 数(((状态.强化 || {})[类] || {})[名], 0); }',
  '',
].join('\n');
t = t.replace('  /* ══ 品级判定', 强化工具 + '  /* ══ 品级判定');

// ══ ② 物品弹层：恢复 装备/用掉/丢掉 + 新增 强化 ══
换(
  '    开层(名, rows);   // ★ 只显示：装备/用掉/丢掉都是游戏内动作',
  [
    '    // ★ <user> 侧的动作：装备 / 用掉 / 丢掉 / 强化（都在他能做的范围内）',
    '    var 槽2 = 参 && 参.槽, 层x = 取层("装备", 名), P = 强化参数();',
    '    var 要x = 要的材料(P.装材料, 层x), 门x = 材料够吗(要x);',
    '    rows += 折行("强化层数", 层x + " / " + P.装上限 + (层x > 0 ? \'　<span class="gr">加成 ×\' + (1 + P.装每层 * 层x).toFixed(2) + "</span>" : ""));',
    '    rows += 折行("下一层要", Object.keys(要x).map(function (k) { return E(k) + " " + 要x[k]; }).join("　") + (门x.够 ? \' <span class="gr">（足）</span>\' : \' <span class="w">（\' + E(门x.缺.join("；")) + "）</span>"));',
    '    开层(名, rows',
    '      + \'<div class="yx-ops" style="margin-top:12px">\'',
    '      + (槽2 ? \'<button class="yx-btn pri" data-op="equip" data-i="\' + i + \'" data-slot="\' + E(槽2) + \'">装备</button>\' : "")',
    '      + \'<button class="yx-btn" data-op="enh" data-i="\' + i + \'">强化 +1</button>\'',
    '      + \'<button class="yx-btn" data-op="use" data-i="\' + i + \'">用掉</button>\'',
    '      + \'<button class="yx-btn dn" data-op="drop" data-i="\' + i + \'">丢掉</button></div>\');',
    '    绑物品按钮();',
  ].join('\n')
);

// ══ ③ 物品按钮的处理（含强化）══
t = t.replace(
  '        if (op === "equip") {',
  [
    '        if (op === "enh") {',
    '          var P = 强化参数(), 层x = 取层("装备", 名), 要x = 要的材料(P.装材料, 层x);',
    '          var 门x = 材料够吗(要x);',
    '          if (!门x.够) { alert("材料不够：" + 门x.缺.join("；")); return; }',
    '          if (层x >= P.装上限) { alert("已经到上限 " + P.装上限 + " 层了"); return; }',
    '          写(function (sd) {',
    '            sd.资源 = sd.资源 || {}; sd.强化 = sd.强化 || { 装备: {}, 技能: {} };',
    '            Object.keys(要x).forEach(function (k) { sd.资源[k] = 数(sd.资源[k]) - 要x[k]; });',
    '            sd.强化.装备 = sd.强化.装备 || {};',
    '            sd.强化.装备[名] = 层x + 1;',
    '          });',
    '        } else if (op === "equip") {'
  ].join('\n')
);

// ══ ④ 穿着：恢复 换上 / 脱下 ══
换('  /* ★ 穿着只显示，不可点换（穿什么由剧情决定）*/', '  /* 穿着（★ <user> 能动：换或脱）*/');
换(
  "      + \"</div>\");",
  "      + (有2 ? '<div class=\"yx-ops\" style=\"margin-top:12px\"><button class=\"yx-btn dn\" id=\"yx-takeoff\">脱下</button></div>' : \"\"));"
);

// ══ ⑤ 任务：恢复 接取 / 推进 / 放弃 ══
换(
  '        // ★ 任务进度由她玩出来，面板不提供推进/放弃',
  [
    '        内 += \'<div class="yx-ops" style="margin-top:9px">\'',
    '          + \'<button class="yx-btn pri sm" data-tadv="\' + E(x[0]) + \'">推进一层</button>\'',
    '          + \'<button class="yx-btn dn sm" data-tgive="\' + E(x[0]) + \'">放弃</button></div>\';',
  ].join('\n')
);

// ══ ⑥ 技能：恢复请教 + 新增技能强化 ══
换(
  '        ;\n      }).join("");',
  [
    '        var 层j = 取层("技能", 名), Pj = 强化参数();',
    '        var 要j = 要的材料(Pj.技材料, 层j), 门j = 材料够吗(要j);',
    '        内 += 折行("技能强化", 层j + " / " + Pj.技上限 + (层j > 0 ? \'　<span class="gr">判定强度 +\' + (Pj.技每层 * 层j * 100).toFixed(0) + "%</span>" : ""));',
    '        内 += \'<div class="yx-ops" style="margin-top:9px">\'',
    '          + \'<button class="yx-btn pri sm" data-sk="\' + E(名) + \'">请教 1 级</button>\'',
    '          + \'<button class="yx-btn sm" data-sk5="\' + E(名) + \'">连请教 5 级</button>\'',
    '          + \'<button class="yx-btn sm" data-skenh="\' + E(名) + \'">强化 +1</button></div>\';',
    '      }).join("");',
  ].join('\n')
);
// 技能弹层（开技能）也加上
换(
  '    开层(名 + "　Lv" + 现, 内);',
  [
    '    var 层k = 取层("技能", 名), Pk = 强化参数();',
    '    var 要k = 要的材料(Pk.技材料, 层k), 门k = 材料够吗(要k);',
    '    内 += 折行("技能强化", 层k + " / " + Pk.技上限 + (层k > 0 ? \'　<span class="gr">判定强度 +\' + (Pk.技每层 * 层k * 100).toFixed(0) + "%</span>" : ""));',
    '    内 += 折行("下一层要", Object.keys(要k).map(function (q) { return E(q) + " " + 要k[q]; }).join("　") + (门k.够 ? \' <span class="gr">（足）</span>\' : \' <span class="w">（不足）</span>\'));',
    '    开层(名 + "　Lv" + 现, 内 + \'<div class="yx-ops" style="margin-top:12px">\'',
    '      + \'<button class="yx-btn pri" data-sk="\' + E(名) + \'">请教 1 级</button>\'',
    '      + \'<button class="yx-btn" data-sk5="\' + E(名) + \'">连请教 5 级</button>\'',
    '      + \'<button class="yx-btn" data-skenh="\' + E(名) + \'">强化 +1</button></div>\');',
    '    绑请教();',
  ].join('\n')
);

// ══ ⑦ 动手：恢复 ══
换(
  '        H += \'<div class="yx-ttl">可交战目标（打谁由她的选项决定，面板只列）</div><div class="yx-chips">\';',
  '        H += \'<div class="yx-ttl">可交战目标</div><div class="yx-foes">\';'
);
换(
  "          H += '<span class=\"yx-ch\" style=\"border-color:' + 色 + '66;color:' + 色 + '\">' + E(n) + '　' + 品名(品) + '</span>';",
  "          H += '<button class=\"yx-btn\" data-foe=\"' + E(n) + '\" style=\"border-color:' + 色 + '66;color:' + 色 + '\" title=\"' + 品名(品) + '\">' + E(n) + '</button>';"
);

// ══ ⑧ 把删掉的绑定加回来（含技能强化）══
const 新绑定 = [
  '',
  '    // ── <user> 侧的动作绑定（装备/穿着/任务/请教/强化/动手）──',
  '    [].forEach.call(document.querySelectorAll(".yx-cell"), function (c) {',
  '      c.addEventListener("click", function () { 开物品(数(c.getAttribute("data-i")), c.getAttribute("data-n")); });',
  '    });',
  '    [].forEach.call(document.querySelectorAll(".yx-slot"), function (c) {',
  '      c.addEventListener("click", function () { 开部位(c.getAttribute("data-p")); });',
  '    });',
  '    [].forEach.call(document.querySelectorAll("[data-sk]"), function (b) {',
  '      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 请教(b.getAttribute("data-sk")); });',
  '    });',
  '    [].forEach.call(document.querySelectorAll("[data-sk5]"), function (b) {',
  '      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 请教(b.getAttribute("data-sk5"), 5); });',
  '    });',
  '    [].forEach.call(document.querySelectorAll("[data-skenh]"), function (b) {',
  '      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 强化技能(b.getAttribute("data-skenh")); });',
  '    });',
  '    [].forEach.call(document.querySelectorAll("[data-tadv]"), function (b) {',
  '      b.addEventListener("click", function (e) {',
  '        e.stopPropagation(); var k = b.getAttribute("data-tadv");',
  '        写(function (sd) { sd.任务 = sd.任务 || {}; var r = sd.任务[k] || {}; r.进度 = 数(r.进度) + 1;',
  '          if (数(r.需要) > 0 && r.进度 >= 数(r.需要)) r.状态 = "完成"; sd.任务[k] = r; });',
  '      });',
  '    });',
  '    [].forEach.call(document.querySelectorAll("[data-tgive]"), function (b) {',
  '      b.addEventListener("click", function (e) {',
  '        e.stopPropagation(); var k = b.getAttribute("data-tgive");',
  '        写(function (sd) { sd.任务 = sd.任务 || {}; if (sd.任务[k]) sd.任务[k].状态 = "失败"; });',
  '      });',
  '    });',
  '    [].forEach.call(document.querySelectorAll("[data-foe]"), function (b) {',
  '      b.addEventListener("click", function () { 动手(b.getAttribute("data-foe")); });',
  '    });',
].join('\n');
t = t.replace('    // （此处原有的按钮绑定已按职责边界移除）', 新绑定);

// ══ ⑨ 强化技能的函数 ══
t = t.replace('  /* ── 物品操作 ── */', [
  '  /* 技能强化（★ 与装备强化同一个形状）*/',
  '  function 强化技能(名) {',
  '    var P = 强化参数(), 层 = 取层("技能", 名), 要 = 要的材料(P.技材料, 层);',
  '    var 门 = 材料够吗(要);',
  '    if (!门.够) { alert("材料不够：" + 门.缺.join("；")); return; }',
  '    if (层 >= P.技上限) { alert("已经到上限 " + P.技上限 + " 层了"); return; }',
  '    写(function (sd) {',
  '      sd.资源 = sd.资源 || {}; sd.强化 = sd.强化 || { 装备: {}, 技能: {} };',
  '      Object.keys(要).forEach(function (k) { sd.资源[k] = 数(sd.资源[k]) - 要[k]; });',
  '      sd.强化.技能 = sd.强化.技能 || {};',
  '      sd.强化.技能[名] = 层 + 1;',
  '    });',
  '  }',
  '',
  '  /* ── 物品操作 ── */',
].join('\n'));

fs.writeFileSync(p, t);
console.log('✅ 恢复交互 + 接上强化：共改动 ' + n + ' 处');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
