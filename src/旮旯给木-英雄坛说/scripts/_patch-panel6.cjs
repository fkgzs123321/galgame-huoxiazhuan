// 补全强化辅助函数 + 重写开物品（四段式）+ 英雄榜 + 体力消耗
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ══ ① 强化辅助（面板侧，与机制层同口径）══
const 助手 = [
  '  /* ══ 强化辅助（四段式 —— 与机制层 物品引擎 同口径）══ */',
  '  function 强参数() {',
  '    var Z = D.强化 || {};',
  '    return {',
  '      上限: 数(Z.上限, 16), 倍: 数(Z.每层倍率, 0.1), 材料: Z.每层材料 || { 铁: 2, 灵石: 1 },',
  '      表: Z.成功率表 || [], 护门: 数((Z.保护石 || {}).门槛, 7), 垫上: 数((Z.垫子 || {}).上限, 10),',
  '    };',
  '  }',
  '  function 强档(层) {',
  '    var 表 = 强参数().表, n = 数(层);',
  '    for (var i = 0; i < 表.length; i++) if (n >= 数(表[i].从) && n < 数(表[i].到)) return 表[i];',
  '    var 末 = 表.length ? 表[表.length - 1] : { 成功率: 0.1, 失败: "分解" };',
  '    return { 成功率: Math.max(0.05, 数(末.成功率) - 0.02 * (n - 数(末.到))), 失败: 末.失败, 区: "分解区" };',
  '  }',
  '  function 区名(档) { return (档 && 档.区) ? 档.区 : (数(档.成功率) >= 1 ? "白送区" : "—"); }',
  '  function 算成功率(档, 附符, 护石, 垫) {',
  '    if (数(垫) >= 强参数().垫上) return 1;',
  '    var r = 数(档.成功率, 0.1);',
  '    if (附符) r = Math.min(1, r + 0.12);',
  '    return r;',
  '  }',
  '  function 垫计数() { return 数(((状态.强化 || {}).垫子), 0); }',
  '  function 护石能用(层) { return 数(层) >= 强参数().护门; }',
  '',
].join('\n');
if (!t.includes('function 强档(')) {
  t = t.replace('  /* ══ 图标库', 助手 + '  /* ══ 图标库');
}

// ══ ② 重写 开物品（四段式强化 + 强化符/保护石开关）══
const a = t.indexOf('  function 开物品(');
const b = t.indexOf('  function 绑物品按钮(');
if (a < 0 || b < 0) { console.error('找不到 开物品'); process.exit(1); }

const 新开物品 = [
  '  /* 弹层里的两个开关（强化符 / 保护石）—— 记在临时态里 */',
  '  var 附符 = false, 护石 = false;',
  '',
  '  function 开物品(i, 名) {',
  '    var 包 = 状态.背包 || [], x = 包[i];',
  '    var 例表 = ((D.物品 || {}).示例) || [];',
  '    var 参 = null;',
  '    for (var q = 0; q < 例表.length; q++) if (例表[q].名 === 名) 参 = 例表[q];',
  '    var rows = "";',
  '    var 品 = 物品品级(名), 色 = 档色(品);',
  '    rows += 折行("品级", \'<span style="color:\' + 色 + \'">\' + 品名(品) + "</span>");',
  '    if (参) {',
  '      rows += 折行("价格", 参.价格 ? 参.价格 + " 文" : "不卖");',
  '      rows += 折行("槽位", 参.槽 || "—");',
  '      rows += \'<div class="yx-k2">加成（按价格推）</div>\';',
  '      rows += Object.keys(参.加成 || {}).map(function (k) { return 折行(k, "+" + 参.加成[k]); }).join("");',
  '    }',
  '    // ★ 强化（四段式）',
  '    var P = 强参数(), 层 = 取层("装备", 名);',
  '    var 档 = 强档(层), 率 = 算成功率(档, 附符, 护石, 垫计数());',
  '    var 要 = 要的材料(P.材料, 层), 门 = 材料够吗(要);',
  '    rows += \'<div class="yx-k2">强化 · ' + 区名(档) + "</div>";',
  '    rows += 折行("层数", 层 + " / " + P.上限 + (层 > 0 ? \'　<span class="gr">加成 ×\' + (1 + P.倍 * 层).toFixed(2) + "</span>" : ""));',
  '    rows += 折行("成功率", \'<b style="color:\' + (率 >= 0.6 ? "var(--grn)" : 率 >= 0.3 ? "var(--gold)" : "var(--rose)") + \'">\' + Math.round(率 * 100) + "%</b>" + (附符 ? "（含符 +12%）" : ""));',
  '    rows += 折行("失败会", \'<span class="\' + (档.失败 === "分解" || 档.失败 === "归零" ? "w" : "") + \'">\' + E(档.失败 || "必成") + "</span>" + (护石 && 护石能用(层) ? \'　<span class="gr">（护石保住了）</span>\' : ""));',
  '    rows += 折行("垫子", 垫计数() + " / " + P.垫上 + (垫计数() >= P.垫上 ? \' <span class="gr">下一发必成</span>\' : \'\'));',
  '    rows += 折行("下一层要", Object.keys(要).map(function (k) { return E(k) + " " + 要[k]; }).join("　") + (门.够 ? \' <span class="gr">（足）</span>\' : \' <span class="w">（不足）</span>\'));',
  '    // 两个开关',
  '    rows += \'<div class="yx-chips" style="margin-top:8px">\'',
  '      + \'<span class="yx-ch clk\' + (附符 ? " on" : "") + \'" data-tg="符">强化符 +12%</span>\'',
  '      + \'<span class="yx-ch clk\' + (护石 ? " on" : "") + \'" data-tg="石">保护石\' + (护石能用(层) ? "" : "（+7 起）") + "</span></div>";',
  '    var 槽 = 参 && 参.槽;',
  '    var 禁 = !在据点();',
  '    开层(名, rows + (禁 ? \'<div class="yx-nt w">★ 须回驻地才能强化</div>\' : "") + \'<div class="yx-ops" style="margin-top:12px">\'',
  '      + (槽 ? \'<button class="yx-btn pri" data-op="equip" data-i="\' + i + \'" data-slot="\' + E(槽) + \'">装备</button>\' : "")',
  '      + \'<button class="yx-btn" data-op="enh" data-i="\' + i + \'"\' + (禁 ? " disabled" : "") + \'>强化 +1</button>\'',
  '      + \'<button class="yx-btn" data-op="use" data-i="\' + i + \'">用掉</button>\'',
  '      + \'<button class="yx-btn dn" data-op="drop" data-i="\' + i + \'">丢掉</button></div>\');',
  '    绑物品按钮();',
  '    [].forEach.call(层.querySelectorAll("[data-tg]"), function (c) {',
  '      c.addEventListener("click", function () {',
  '        if (c.getAttribute("data-tg") === "符") 附符 = !附符; else 护石 = !护石;',
  '        开物品(i, 名);',
  '      });',
  '    });',
  '  }',
  '',
].join('\n');
t = t.slice(0, a) + 新开物品 + t.slice(b);

// ══ ③ 强化按钮的处理改成四段式 ══
const 旧处 = t.match(/        if \(op === "enh"\) \{[\s\S]*?\n        \} else if \(op === "equip"\) \{/);
if (旧处) {
  t = t.replace(旧处[0], [
    '        if (op === "enh") {',
    '          var P = 强参数(), 层 = 取层("装备", 名);',
    '          if (!在据点()) { alert("须回驻地才能强化"); return; }',
    '          var 档 = 强档(层), 率 = 算成功率(档, 附符, 护石, 垫计数());',
    '          var 要 = 要的材料(P.材料, 层), 门 = 材料够吗(要);',
    '          if (层 >= P.上限) { alert("已到上限 " + P.上限); return; }',
    '          if (!门.够) { alert("材料不够：" + 门.缺.join("；")); return; }',
    '          var 用垫 = 垫计数() >= P.垫上;',
    '          var 掷 = Math.random(), 成 = 掷 < 率;',
    '          var 果 = "";',
    '          if (!成 && !(护石 && 护石能用(层))) 果 = 档.失败 || "掉1级";',
    '          写(function (sd) {',
    '            sd.资源 = sd.资源 || {}; sd.强化 = sd.强化 || { 装备: {}, 技能: {}, 垫子: 0 };',
    '            Object.keys(要).forEach(function (k) { sd.资源[k] = 数(sd.资源[k]) - 要[k]; });',
    '            sd.强化.装备 = sd.强化.装备 || {};',
    '            if (成) { sd.强化.装备[名] = 层 + 1; if (用垫) sd.强化.垫子 = 0; }',
    '            else if (果 === "归零") sd.强化.装备[名] = 0;',
    '            else if (果 === "分解") {',
    '              sd.强化.装备[名] = 0;',
    '              sd.背包 = (sd.背包 || []).filter(function (y) { return (typeof y === "string" ? y : y.名) !== 名; });',
    '              sd.强化.垫子 = Math.min(P.垫上, 垫计数() + 1);',
    '            } else if (果 === "掉1级") sd.强化.装备[名] = Math.max(0, 层 - 1);',
    '          });',
    '          alert((成 ? "★ 强化成功！+ " + (层 + 1) : "失败 —— " + (果 === "无变化" || !果 ? "护石保住了，停在 +" + 层 : 果))',
    '            + (用垫 ? "（用了垫子保底）" : ""));',
    '        } else if (op === "equip") {'
  ].join('\n'));
}

fs.writeFileSync(p, t);
console.log('✅ 补全强化辅助 + 重写开物品（四段式）');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
