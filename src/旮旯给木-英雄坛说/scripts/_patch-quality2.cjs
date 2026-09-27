// 把品质色铺到每一类：技能格 / 任务 / 绝招 / 可接任务 / 可交战目标 + 品质图例
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ── ① 品级判定器（按契约的「品级判定」规则）──
const 判级器 = [
  '  /* ══ 品级判定（规则来自契约：物品与品质表.yaml 的「品级判定」）══ */',
  '  var 档s = (D.品质档 || []);',
  '  function 档键(名) {',
  '    for (var i = 0; i < 档s.length; i++) if (档s[i].名 === 名) return 档s[i].键;',
  '    return "q1";',
  '  }',
  '  function 档色(键) {',
  '    for (var i = 0; i < 档s.length; i++) if (档s[i].键 === 键) return 档s[i].色;',
  '    return "#e8e8e8";',
  '  }',
  '  function 档名(键) {',
  '    for (var i = 0; i < 档s.length; i++) if (档s[i].键 === 键) return 档s[i].名;',
  '    return "良品";',
  '  }',
  '  /* 武功：按师承层级与门派地位 */',
  '  function 武功品级(名) {',
  '    var 派 = D.门派 || {}, 武 = D.门派武功 || {};',
  '    // 基本武功一律良品',
  '    if ((D.基本武功 || []).indexOf(名) >= 0) return "q1";',
  '    for (var k in 武) {',
  '      var 列 = 武[k] || [];',
  '      var i = 列.indexOf(名);',
  '      if (i < 0) continue;',
  '      // 列内顺序：入门 → 主力 → 进阶 → 镇派',
  '      if (i === 0) return "q2";           // 入门：上品',
  '      if (i === 列.length - 1) return "q4"; // 镇派绝学：极品',
  '      return i === 1 ? "q2" : "q3";        // 主力上品 / 进阶精品',
  '    }',
  '    return "q2";',
  '  }',
  '  /* 绝招：按条件严苛度（几个「≥N」）*/',
  '  function 绝招品级(条件) {',
  '    var s = String(条件 || "");',
  '    var n = (s.match(/≥|>=|以上/g) || []).length;',
  '    if (n >= 3) return "q4";',
  '    if (n === 2) return "q3";',
  '    return "q2";',
  '  }',
  '  /* 任务：按前置门槛与后果重量 */',
  '  function 任务品级(k) {',
  '    var d = (D.任务 || {})[k] || {};',
  '    var 前 = (d.前置 || []).length;',
  '    var 败 = d.失败后果 || {};',
  '    var 说 = String(d.说明 || "") + String(d.失败后果 ? JSON.stringify(d.失败后果) : "");',
  '    if (说.indexOf("会死") >= 0 || 说.indexOf("命") >= 0 && 说.indexOf("-1") >= 0) return "q4";',
  '    if (说.indexOf("不可逆") >= 0 || 说.indexOf("关闭") >= 0) return "q3";',
  '    if (前 > 0) return "q2";',
  '    return "q1";',
  '  }',
  '  /* 物品：按价格折算 */',
  '  function 物品品级(名) {',
  '    var 表 = ((D.物品 || {}).示例) || [];',
  '    for (var i = 0; i < 表.length; i++) {',
  '      if (表[i].名 !== 名) continue;',
  '      var 价 = 数(表[i].价格);',
  '      if (价 <= 0) return 档键(表[i].品质 || "极品");',
  '      if (价 < 100) return "q0";',
  '      if (价 < 2000) return "q1";',
  '      if (价 < 10000) return "q2";',
  '      if (价 < 50000) return "q3";',
  '      return "q4";',
  '    }',
  '    return "q1";',
  '  }',
  '  /* NPC：按战力档 */',
  '  function NPC品级(名) {',
  '    var w = 数((D.NPC || {})[名] ? D.NPC[名].战力 : 0);',
  '    if (w >= 50000) return "q5";',
  '    if (w >= 30000) return "q4";',
  '    if (w >= 10000) return "q3";',
  '    if (w >= 1000) return "q2";',
  '    if (w >= 300) return "q1";',
  '    return "q0";',
  '  }',
  '  /* 带品质色的名字 */',
  '  function 染(名, 键) {',
  '    return \'<span style="color:\' + 档色(键) + \'">\' + E(名) + "</span>";',
  '  }',
  '',
].join('\n');
t = t.replace('  /* ══ 图标库', 判级器 + '  /* ══ 图标库');

// ── ② 技能格上色 ──
t = t.replace(
  "        return '<div class=\"yx-sk\" data-skk=\"' + E(名) + '\">'",
  "        var 品 = 武功品级(名), 色 = 档色(品);\n        return '<div class=\"yx-sk\" data-skk=\"' + E(名) + '\" style=\"border-color:' + 色 + '66\">'"
);
t = t.replace(
  "+ '<circle cx=\"18\" cy=\"18\" r=\"15\" fill=\"none\" stroke=\"var(--ln)\" stroke-width=\"2.5\"/>'",
  "+ '<circle cx=\"18\" cy=\"18\" r=\"15\" fill=\"none\" stroke=\"' + 色 + '22\" stroke-width=\"2.5\"/>'"
);
t = t.replace(
  "+ '<circle cx=\"18\" cy=\"18\" r=\"15\" fill=\"none\" stroke=\"var(--gold)\" stroke-width=\"2.5\" '",
  "+ '<circle cx=\"18\" cy=\"18\" r=\"15\" fill=\"none\" stroke=\"' + 色 + '\" stroke-width=\"2.5\" '"
);
t = t.replace(
  "+ '</svg><span class=\"ic\">' + ic(功夫图标(名), 17) + '</span></div>'",
  "+ '</svg><span class=\"ic\" style=\"color:' + 色 + '\">' + ic(功夫图标(名), 17) + '</span></div>'"
);
t = t.replace(
  "+ '<div class=\"nm\">' + E(名) + '</div>'",
  "+ '<div class=\"nm\">' + 染(名, 品) + '</div>'"
);
t = t.replace(
  "+ '<div class=\"bdg\">' + (够 ? \"可升\" : \"潜能不足\") + '</div>'",
  "+ '<div class=\"bdg\" style=\"color:' + 色 + ';border-color:' + 色 + '66\">' + 档名(品) + (够 ? \" · 可升\" : \"\") + '</div>'"
);

// ── ③ 任务折叠项上色 ──
t = t.replace(
  "      var 图 = d.类型 === \"判定\" ? \"检\" : d.类型 === \"收集\" ? \"物品\" : \"任务\";\n      return '<div class=\"yx-fl' + (需 > 0 && 进 > 0 ? \"\" : \"\") + '\">'",
  "      var 图 = d.类型 === \"判定\" ? \"检\" : d.类型 === \"收集\" ? \"物品\" : \"任务\";\n      var 品 = 任务品级(x[0]), 色 = 档色(品);\n      return '<div class=\"yx-fl\" style=\"border-left:2px solid ' + 色 + '66\">'"
);
t = t.replace(
  "        + '<span class=\"i2\">' + ic(图, 14) + '</span>'\n        + '<span class=\"t1\">' + E(r.名 || d.名 || x[0]) + '</span>'",
  "        + '<span class=\"i2\" style=\"color:' + 色 + '\">' + ic(图, 14) + '</span>'\n        + '<span class=\"t1\">' + 染(r.名 || d.名 || x[0], 品) + '</span>'"
);
t = t.replace(
  "        + '<span class=\"t2\">' + (需 > 0 ? (进 + \"/\" + 需) : \"进行中\") + '</span></div>'",
  "        + '<span class=\"t2\" style=\"color:' + 色 + '88\">' + 档名(品) + '</span>'\n        + '<span class=\"t2\">' + (需 > 0 ? (进 + \"/\" + 需) : \"进行中\") + '</span></div>'"
);

// ── ④ 可接任务上色 ──
t = t.replace(
  "      var 图 = d.类型 === \"判定\" ? \"检\" : d.类型 === \"收集\" ? \"物品\" : \"任务\";\n      var 内 = 折行(\"委托人\"",
  "      var 图 = d.类型 === \"判定\" ? \"检\" : d.类型 === \"收集\" ? \"物品\" : \"任务\";\n      var 品 = 任务品级(k), 色 = 档色(品);\n      var 内 = 折行(\"品级\", \'<span style=\"color:\' + 色 + \'\">\' + 档名(品) + \"</span>\") + 折行(\"委托人\""
);
t = t.replace(
  "      return 折(d.名 || k, 内, d.接的谁 || \"\", 图);",
  "      return 折(\'<span style=\"color:\' + 色 + \'\">\' + E(d.名 || k) + \"</span>\", 内, (d.接的谁 || \"\") + \"　\" + 档名(品), 图);"
);

// ── ⑤ 绝招表上色 ──
t = t.replace(
  "        + 绝.map(function (x) {\n          return '<tr><td>' + E(x.派) + '</td><td>' + E(x.名) + '</td><td class=\"yx-num\">' + E(x.条件) + '</td>'",
  "        + 绝.map(function (x) {\n          var 品 = 绝招品级(x.条件), 色 = 档色(品);\n          return '<tr><td>' + E(x.派) + '</td><td>\' + \'<span style=\"color:\' + 色 + \'\">\' + E(x.名) + \'</span>\' + \'</td><td class=\"yx-num\">\' + \'<span style=\"color:\' + 色 + \'88;font-size:11px\">\' + 档名(品) + \'</span> \' + E(x.条件) + \'</td>\'"
);
t = t.replace(
  "            + '<td>' + E(x.效果) + '</td><td class=\"yx-num\">' + (x.冷却 == null ? \"—\" : x.冷却 + \" 回合\") + '</td></tr>';",
  "            + '<td>' + E(x.效果) + '</td><td class=\"yx-num\">' + (x.冷却 == null ? \"—\" : x.冷却 + \" 回合\") + '</td></tr>';"
);

// ── ⑥ 可交战目标上色（找动手区）──
t = t.replace(
  "        H += '<div class=\"sub\">可交战目标</div><div class=\"foes\">';\n        在场.forEach(function (n) { H += '<button class=\"foe\" data-foe=\"' + E(n) + '\">' + E(n) + '</button>'; });",
  "        H += '<div class=\"sub\">可交战目标</div><div class=\"foes\">';\n        在场.forEach(function (n) {\n          var 品 = NPC品级(n), 色 = 档色(品);\n          H += '<button class=\"yx-btn\" data-foe=\"' + E(n) + '\" style=\"border-color:' + 色 + '66;color:' + 色 + '\" title=\"' + 档名(品) + '\">' + E(n) + '</button>';\n        });"
);

// ── ⑦ 品质图例（行囊页加一行色卡）──
t = t.replace(
  "      + 折(\"品质·掉落规则\", 品质档表(), (D.品质档 || []).length + \" 档\")",
  "      + \'<div class=\"yx-legend\">\' + 档s.map(function (q) {\n          return \'<span class=\"lg\"><i style=\"background:\' + q.色 + \'\"></i>\' + E(q.名) + \'</span>\';\n        }).join(\"\") + \"</div>\"\n      + 折(\"品级判定（六类东西怎么定档）\", 品级判定表(), \"6 类\")"
);

const 品级判定表 = [
  '  function 品级判定表() {',
  '    var 判 = D.品级判定 || {};',
  '    var H = "";',
  '    Object.keys(判).forEach(function (k) {',
  '      var d = 判[k] || {};',
  '      H += \'<div class="yx-k2">\' + E(k) + "</div>";',
  '      H += \'<div class="rowx"><span class="k2">规则</span><span class="v2">\' + E(d.规则 || "") + "</span></div>";',
  '      if (d.分界) {',
  '        H += Object.keys(d.分界).map(function (q) {',
  '          return \'<div class="rowx"><span class="k2" style="color:\' + 档色(档键(q)) + \'">\' + E(q) + \'</span><span class="v2">\' + E(String(d.分界[q])) + "</span></div>";',
  '        }).join("");',
  '      }',
  '    });',
  '    H += \'<div class="yx-nt">\' + E(D.品质图例说明 || "") + "</div>";',
  '    return H;',
  '  }',
  '',
].join('\n');
t = t.replace('  function 品质档表() {', 品级判定表 + '  function 品质档表() {');

// 品质档表里加颜色点
t = t.replace(
  "        return '<tr><td><span class=\"yx-pd ' + (计[q.名] || \"q1\") + '\"></span>' + E(q.名) + '</td><td>×' + q.倍率 + '</td><td>' + q.权重 + '</td><td>' + E(q.说明 || \"\") + '</td></tr>';",
  "        return '<tr><td><span class=\"yx-pd\" style=\"background:' + q.色 + '\"></span><span style=\"color:' + q.色 + '\">' + E(q.名) + '</span></td><td>×' + q.倍率 + '</td><td>' + q.权重 + '</td><td>' + E(q.含义 || q.说明 || \"\") + '</td></tr>';"
);
t = t.replace('    var 计 = { 粗劣: \"q0\", 普通: \"q1\", 精良: \"q2\", 珍奇: \"q3\", 神兵: \"q4\" };\n', '');

fs.writeFileSync(p, t);
console.log('✅ 品质色铺到 6 类：技能格 / 任务 / 绝招 / 可接任务 / 可交战目标 / 品质图例');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
