// 用游戏 UI 的成熟语言重做三页：
//   行囊 → 物品格子 + 人形装备槽（RPG/galgame 经典）
//   技能 → 图标格 + 等级角标 + 冷却感
//   活计 → 可折叠任务树（主任务 → 子目标，带勾选）
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ══ ① 行囊页：物品格 + 人形装备槽 ══
const 新行囊 = [
  '  function 画行囊() {',
  '    var 包 = 状态.背包 || [];',
  '    var 穿 = ((状态.NSFW || {}).穿着) || {};',
  '    var 物表 = ((D.物品 || {}).示例) || [];',
  '    var 部位s = (D.NSFW.穿着 || {}).部位 || [];',
  '    var H = "";',
  '',
  '    // ── 左：人形装备槽 ──',
  '    H += \'<div class="yx-r"><div class="yx-c" style="max-width:290px">\'',
  '      + \'<div class="yx-ttl">穿着（点槽位换或脱）</div>\'',
  '      + \'<div class="yx-doll">\'',
  '      + \'<svg viewBox="0 0 120 190" width="106" height="168" style="margin:0 auto;display:block">\'',
  '      + \'<ellipse cx="60" cy="26" rx="15" ry="18" fill="var(--b3)" stroke="var(--ln2)" stroke-width="0.8"/>\'',
  '      + \'<path d="M60 46 V112 M60 60 L34 74 M60 60 L86 74 M60 112 L46 152 M60 112 L74 152" stroke="var(--ln2)" stroke-width="0.8" fill="none"/>\'',
  '      + \'<path d="M45 46 h30 v66 h-30 Z" fill="none" stroke="var(--ln)" stroke-width="0.6" stroke-dasharray="3 3"/>\'',
  '      + \'</svg></div>\'',
  '      + \'<div class="yx-slots">\'',
  '      + 部位s.map(function (pn, i) {',
  '          var 有2 = 穿[pn];',
  '          var 角 = ["头", "身", "手", "足", "外", "饰"][i] || "";',
  '          return \'<div class="yx-slot\' + (有2 ? " on" : "") + \'" data-p="\' + E(pn) + \'">\'',
  '            + \'<span class="lbl">\' + E(pn) + \'</span>\'',
  '            + \'<span class="val">\' + (有2 ? E(有2) : "空") + \'</span>\'',
  '            + \'</div>\';',
  '        }).join("")',
  '      + \'</div>\'',
  '      + \'<div class="yx-nt">\' + 露不露(穿).程度',
  '      + (露不露(穿).还剩.length ? "　还剩 " + 露不露(穿).还剩.join(" / ") : "") + \'</div>\'',
  '      + \'</div>\';',
  '',
  '    // ── 右：物品格 ──',
  '    H += \'<div class="yx-c"><div class="yx-ttl">行囊 <em>（\' + 包.length + \' / \' + (D.背包容量 || "∞") + \'）</em></div>\';',
  '    if (!包.length) H += \'<div class="yx-e">身上空着。去换、去买、或者打赢了捡。</div>\';',
  '    else {',
  '      H += \'<div class="yx-grid">\';',
  '      H += 包.map(function (x, i) {',
  '        var 名 = (typeof x === "string") ? x : (x.名 || x.id || "?");',
  '        var 品 = (typeof x === "object" && x.品质) ? x.品质 : "普通";',
  '        var 级 = { 粗劣: "q0", 普通: "q1", 精良: "q2", 珍奇: "q3", 神兵: "q4" }[品] || "q1";',
  '        return \'<div class="yx-cell \' + 级 + \'" data-i="\' + i + \'" data-n="\' + E(名) + \'" title="\' + E(名) + \' · \' + E(品) + \'">\'',
  '          + \'<span class="ic">\' + ic(物品图标(名), 20) + \'</span>\'',
  '          + \'<span class="nm">\' + E(名) + \'</span>\'',
  '          + \'<span class="bdg">\' + E(品.slice(0, 2)) + \'</span>\'',
  '          + \'</div>\';',
  '      }).join("");',
  '      H += \'</div>\';',
  '    }',
  '    H += \'<div class="yx-nt">★ 格子边框颜色 = 品质。点格子看它有什么加成、能装备到哪。</div></div></div>\';',
  '',
  '    // ── 品质表（收进折叠）──',
  '    H += \'<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">品质档位（越往下越难得）</div>\'',
  '      + 折("品质·掉落规则", 品质档表(), (D.品质档 || []).length + " 档")',
  '      + 折("兵器与加成（原作掉落表）", 兵器表(), 物表.length + " 件")',
  '      + \'</div></div>\';',
  '    return H;',
  '  }',
  '',
  '  function 品质档表() {',
  '    var 档 = D.品质档 || [];',
  '    var 计 = { 粗劣: "q0", 普通: "q1", 精良: "q2", 珍奇: "q3", 神兵: "q4" };',
  '    return \'<div class="yx-tblwrap"><table class="yx-tbl"><thead><tr><th>档</th><th>倍率</th><th>掉落权重</th><th>说明</th></tr></thead><tbody>\'',
  '      + 档.map(function (q) {',
  '        return \'<tr><td><span class="yx-pd \' + (计[q.名] || "q1") + \'"></span>\' + E(q.名) + \'</td><td>×\' + q.倍率 + \'</td><td>\' + q.权重 + \'</td><td>\' + E(q.说明 || "") + \'</td></tr>\';',
  '      }).join("") + \'</tbody></table></div>\'',
  '      + \'<div class="yx-nt">加成的算法：<b>加成 = 价格 ÷ 100</b>，再按用途分配到字段上（兵器给攻击，衣裳给防御与上限）</div>\';',
  '  }',
  '  function 兵器表() {',
  '    var 表 = ((D.物品 || {}).示例) || [];',
  '    if (!表.length) return \'<div class="yx-e">契约层还没列兵器。</div>\';',
  '    return \'<div class="yx-tblwrap"><table class="yx-tbl wrap"><thead><tr><th>名</th><th>价格</th><th>加成</th><th>品质</th></tr></thead><tbody>\'',
  '      + 表.map(function (o) {',
  '        return \'<tr><td>\' + ic(物品图标(o.名), 12) + " " + E(o.名) + \'</td><td>\' + (o.价格 ? o.价格 + " 文" : "不卖") + \'</td>\'',
  '          + \'<td>\' + Object.keys(o.加成 || {}).map(function (k) { return k + " " + o.加成[k]; }).join("　") + \'</td>\'',
  '          + \'<td>\' + E(o.品质 || "") + \'</td></tr>\';',
  '      }).join("") + \'</tbody></table></div>\';',
  '  }',
  '',
].join('\n');
const 行囊起 = t.indexOf('  function 画行囊() {');
const 行囊止 = t.indexOf('  /* ── 活计（任务）── */');
if (行囊起 < 0 || 行囊止 < 0) { console.error('找不到 画行囊 或 活计'); process.exit(1); }
t = t.slice(0, 行囊起) + 新行囊 + t.slice(行囊止);

// ══ ② 折叠组件 + 提示条 ══
const 折函数 = [
  '  /* ══ 折叠组件：主项 → 子项 → 子子项 ══ */',
  '  function 折(标题, 内, 副, 图标名, 开) {',
  '    return \'<div class="yx-fl\' + (开 ? " on" : "") + \'">\'',
  '      + \'<div class="hd"><span class="ar">\' + ic("右", 12) + \'</span>\'',
  '      + (图标名 ? \'<span class="i2">\' + ic(图标名, 14) + \'</span>\' : "")',
  '      + \'<span class="t1">\' + E(标题) + \'</span>\'',
  '      + (副 ? \'<span class="t2">\' + E(副) + \'</span>\' : "")',
  '      + \'</div><div class="bd">\' + 内 + \'</div></div>\';',
  '  }',
  '  function 折行(a, b) {',
  '    return \'<div class="rowx"><span class="k2">\' + E(a) + \'</span><span class="v2">\' + b + \'</span></div>\';',
  '  }',
  '',
].join('\n');
t = t.replace('  /* ══ 图标库', 折函数 + '  /* ══ 图标库');

fs.writeFileSync(p, t);
console.log('✅ 行囊页重做成「人形装备槽 + 物品格 + 折叠规则表」');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
