// ★ 照「面板职责边界」把臆想的交互全去掉 —— 面板是监控屏，不是操控台
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');
const 前 = t.length;
let 删 = [];

// ── ① 四数条：去掉「投入度」（那是兴奋度，设定说不显示），换成「对她的了解」──
t = t.replace(
  "      { k: \"她的兴致\", v: 兴名(兴), u: Math.round(兴), c: \"gd\" },",
  "      { k: \"对/她的了解\", v: 数((状态.主角 || {}).对她的了解, 0), u: \"级\", c: \"\" },"
);
t = t.replace('      { k: "投入度", v: 兴名(兴), u: Math.round(兴), c: "gd" },',
              '      { k: "对/她的了解", v: 数((状态.主角 || {}).对她的了解, 0), u: "级", c: "" },');

// ── ② 身体页：兴奋度整块去掉（设定：界面上没有任何提示）──
const 兴块 = t.match(/    \/\/ ── 身体页[\s\S]*?<\/div>';\n/);
t = t.replace(
  "      + '<div class=\"yx-w\"><div class=\"yx-ttl\">兴奋</div>'\n      + '<div class=\"yx-bar\"><i class=\"ar\" style=\"width:' + 兴 + '%\"></i></div>'\n      + '<div class=\"yx-nt\">' + Math.round(兴) + '　' + 兴名(兴) + '</div>'\n      + '<div class=\"yx-line\" style=\"margin-top:6px\"><span>兴奋度</span>'\n      + '<span><button class=\"yx-plus\" data-ar=\"-10\">−10</button> <button class=\"yx-plus\" data-ar=\"10\">＋10</button> <button class=\"yx-plus\" data-ar=\"25\">＋25</button></span></div>'\n      + '<div class=\"yx-nt\">单轮最多涨 ' + ((D.NSFW.推进 || {}).单轮上限 || 25) + '（引擎口径）</div>'\n      + '</div></div>';",
  "      + '</div>';"
);

// 兜底：如果上面不匹配，整段删「兴奋」卡
t = t.replace(/'<div class="yx-w"><div class="yx-ttl">兴奋<\/div>'[\s\S]*?'<\/div><\/div>';/, "'</div>';");

// ── ③ 去掉周期「起」按钮 ──
t = t.replace(
  "      + '<div class=\"yx-chips\" style=\"margin-top:7px\">' + 周表.filter(function (k) { return !周期在跑[k]; }).map(function (k) {\n        return '<span class=\"yx-chip yx-cyc\" data-c=\"' + E(k) + '\" style=\"cursor:pointer\">起：' + E((D.NSFW.周期[k] || {}).名 || k) + '</span>';\n      }).join(\"\") + '</div></div></div>';",
  "      + '</div></div>';"
);

// ── ④ 去掉任务「推进 / 放弃」按钮 ──
t = t.replace(
  "        内 += '<div class=\"yx-ops\" style=\"margin-top:9px\"><button class=\"yx-btn pri sm\" data-tadv=\"' + E(x[0]) + '\">推进一层</button>'\n        + '<button class=\"yx-btn dn sm\" data-tgive=\"' + E(x[0]) + '\">放弃</button></div>';",
  "        // ★ 任务进度由她玩出来，面板不提供推进/放弃"
);

// ── ⑤ 去掉请教按钮（技能格与技能树都只显示）──
t = t.replace(
  "        + '<div class=\"yx-ops\" style=\"margin-top:9px\">'\n          + '<button class=\"yx-btn pri sm\" data-sk=\"' + E(名) + '\">请教 1 级</button>'\n          + '<button class=\"yx-btn sm\" data-sk5=\"' + E(名) + '\">连请教 5 级</button></div>';",
  "        ;"
);
t = t.replace(
  "        内 += '<div class=\"yx-ops\" style=\"margin-top:9px\">'\n          + '<button class=\"yx-btn pri sm\" data-sk=\"' + E(名) + '\">请教 1 级</button>'\n          + '<button class=\"yx-btn sm\" data-sk5=\"' + E(名) + '\">连请教 5 级</button></div>';",
  "        // ★ 请教是游戏内动作，面板只显示",
  ''
);
t = t.replace('    开层(名 + "　Lv" + 现, 内 + \'<div class="yx-ops" style="margin-top:12px">\'\n      + \'<button class="yx-btn pri" data-sk="\' + E(名) + \'">请教 1 级</button>\'\n      + \'<button class="yx-btn" data-sk5="\' + E(名) + \'">连请教 5 级</button></div>\');',
              "    开层(名 + \"　Lv\" + 现, 内);");

// ── ⑥ 去掉物品「装备 / 用掉 / 丢掉」──
t = t.replace(
  "    var 槽 = 参 && 参.槽;\n    开层(名, rows + '<div class=\"yx-h\" style=\"margin-top:12px\">能做什么</div>'\n      + '<div class=\"yx-fork\">'\n      + (槽 ? '<button class=\"yx-btn pri\" data-op=\"equip\" data-i=\"' + i + '\" data-slot=\"' + E(槽) + '\">装备</button>' : \"\")\n      + '<button class=\"yx-btn\" data-op=\"use\" data-i=\"' + i + '\">用掉</button>'\n      + '<button class=\"yx-btn dn\" data-op=\"drop\" data-i=\"' + i + '\">丢掉</button>'\n      + '</div>');\n    绑物品按钮();",
  "    开层(名, rows);   // ★ 只显示：装备/用掉/丢掉都是游戏内动作"
);

// ── ⑦ 去掉穿着「换上 / 脱下」──
t = t.replace(
  "  function 开部位(p) {",
  "  /* ★ 穿着只显示，不可点换（穿什么由剧情决定）*/\n  function 开部位(p) {"
);
t = t.replace(
  "      + (有2 ? '<div class=\"yx-fork\" style=\"margin-top:12px\"><button class=\"yx-btn dn\" id=\"yx-takeoff\">脱下</button></div>' : \"\"));",
  "      + \"</div>\");"
);

// ── ⑧ 去掉「动手」按钮（打谁由她的选项决定）──
t = t.replace(
  "        H += '<div class=\"sub\">可交战目标</div><div class=\"foes\">';",
  "        H += '<div class=\"yx-ttl\">可交战目标（打谁由她的选项决定，面板只列）</div><div class=\"yx-chips\">';"
);
t = t.replace(
  "          H += '<button class=\"yx-btn\" data-foe=\"' + E(n) + '\" style=\"border-color:' + 色 + '66;color:' + 色 + '\" title=\"' + 档名(品) + '\">' + E(n) + '</button>';",
  "          H += '<span class=\"yx-ch\" style=\"border-color:' + 色 + '66;color:' + 色 + '\">' + E(n) + '　' + 品名(品) + '</span>';"
);

// ── ⑨ 去掉那些按钮的事件绑定 ──
const 绑段 = [
  '    [].forEach.call(document.querySelectorAll("[data-ar]")',
  '    [].forEach.call(document.querySelectorAll(".yx-cyc")',
  '    [].forEach.call(document.querySelectorAll("[data-tadv]")',
  '    [].forEach.call(document.querySelectorAll("[data-tgive]")',
  '    [].forEach.call(document.querySelectorAll(".yx-foe")',
  '    [].forEach.call(document.querySelectorAll(".yx-slot")',
  '    [].forEach.call(document.querySelectorAll("[data-op]")',
  '    [].forEach.call(document.querySelectorAll(".yx-cell")',
];
for (const 起 of 绑段) {
  const i = t.indexOf(起);
  if (i < 0) continue;
  // 找到这一段的结尾（下一个空行 + 注释，或 }) ;）
  let j = t.indexOf('\n\n', i);
  if (j < 0) j = i + 400;
  t = t.slice(0, i) + '    // （此处原有的按钮绑定已按职责边界移除）\n' + t.slice(j + 1);
  删.push(起.slice(45, 68));
}

fs.writeFileSync(p, t);
console.log('✅ 已按职责边界去掉臆想交互');
console.log('   清理的绑定: ' + (删.length ? 删.join(' / ') : '（无）'));
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
