// 补面板逻辑：状态一览 / 解锁表 / 门派详情 / 八套对照
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

const 补 = [
  '  /* ── 状态一览（从契约状态表内嵌）── */',
  '  function 画状态一览() {',
  '    var 条 = D.状态 || [];',
  "    if (!条.length) return '';",
  '    var 组 = {};',
  "    条.forEach(function (x) { var g = x.组 || '其他'; (组[g] = 组[g] || []).push(x); });",
  '    var H = \'<div class="yx-row"><div class="yx-panel yx-full"><div class="yx-h">状态一览（\' + 条.length + \' 项）</div>\';',
  '    Object.keys(组).forEach(function (g) {',
  '      H += \'<div class="yx-sub" style="color:var(--gold);margin-top:9px">\' + E(g) + \'</div>\';',
  '      H += \'<table class="yx-tbl wrap"><tbody>\'',
  '        + 组[g].map(function (x) {',
  '          return \'<tr><td style="width:110px">\' + E(x.名) + \'</td><td style="width:90px" class="yx-num">\' + E(String(x.范围 || "").slice(0, 14)) + \'</td>\'',
  '            + \'<td>\' + E(x.意义 || "") + \'</td></tr>\';',
  '        }).join("") + \'</tbody></table>\';',
  '    });',
  '    H += \'</div></div>\';',
  '    return H;',
  '  }',
  '',
  '  /* ── 解锁表（绝招的双条件）── */',
  '  function 画解锁() {',
  '    var 表 = D.解锁表 || [];',
  "    if (!表.length) return '';",
  '    var 值 = {}, 技 = (状态.技能 || {}).基本 || {};',
  '    for (var k in 技) 值[k] = 数(技[k]);',
  '    var H = \'<div class="yx-row"><div class="yx-panel yx-full"><div class="yx-h">绝招的门槛（两门同时到位才开）</div>\'',
  '      + \'<table class="yx-tbl"><thead><tr><th>招</th><th>要什么</th><th>还差</th></tr></thead><tbody>\'',
  '      + 表.map(function (x) {',
  '        var 需 = x.需要 || [];',
  '        var 缺 = 需.filter(function (q) { return 数(值[q.字段]) < 数(q.至少); })',
  '          .map(function (q) { return q.字段 + " 差 " + (数(q.至少) - 数(值[q.字段])); });',
  '        return \'<tr><td>\' + E(x.名) + \'</td><td>\'',
  '          + 需.map(function (q) { return q.字段 + " " + q.至少; }).join("　") + \'</td>\'',
  '          + \'<td>\' + (缺.length ? \'<span class="yx-warn">\' + E(缺.join("；")) + \'</span>\' : \'<span class="yx-grn">够了</span>\') + \'</td></tr>\';',
  '      }).join("") + \'</tbody></table>\'',
  '      + \'<div class="yx-sub">★ 绝招不是独立等级 —— 是两门武功同时到某个级数之后自动可用</div></div></div>\';',
  '    return H;',
  '  }',
  '',
  '  /* ── 八套「她」的对照 ── */',
  '  function 画八套() {',
  '    var 套 = D.八套 || [];',
  "    if (!套.length) return '';",
  '    var 详 = {',
  '      温砚: ["反复试、查攻略、每步都算", "也认真看（怕漏掉救你的线索）", "不会"],',
  '      丰娆: ["换一条线", "快进", "偶尔"],',
  '      舒晏: ["故意让它更难", "反复看同一段", "不会"],',
  '      唐响: ["撞上去", "乱点跳过", "会"],',
  '      沈眠: ["阻止救援", "静静看", "不会"],',
  '      莫漾: ["外挂跳过", "挂机（手离开鼠标）", "会，最懒的"],',
  '      纪清: ["算、找漏洞、改", "也看", "会，为了补漏"],',
  '      郁灼: ["只挑最刺激的", "跳过不能快进的", "—"],',
  '    };',
  '    var H = \'<div class="yx-row"><div class="yx-panel yx-full"><div class="yx-h">屏幕外那 \' + 套.length + \' 种人</div>\'',
  '      + \'<table class="yx-tbl wrap"><thead><tr><th>她</th><th>遇到障碍</th><th>遇到无聊</th><th>会不会开挂</th></tr></thead><tbody>\'',
  '      + 套.map(function (n) {',
  '        var x = 详[n] || ["—", "—", "—"];',
  '        return \'<tr><td>\' + E(n) + \'</td><td>\' + E(x[0]) + \'</td><td>\' + E(x[1]) + \'</td><td>\' + E(x[2]) + \'</td></tr>\';',
  '      }).join("") + \'</tbody></table>\'',
  '      + \'<div class="yx-sub">★ 她做的每件事都不需要理由 —— 她只是在玩。而每一件都变成他的一天。</div></div></div>\';',
  '    return H;',
  '  }',
  '',
  '  /* ── 门派详情（师承链）── */',
  '  function 画门派详() {',
  '    var 派 = D.门派 || {};',
  '    if (!Object.keys(派).length) return "";',
  '    var H = "";',
  '    Object.keys(派).forEach(function (k) {',
  '      var m = 派[k] || {}, 师 = m.师承 || {};',
  '      var 链 = Object.keys(师).map(function (阶) {',
  '        var d = 师[阶] || {};',
  '        return \'<tr><td>\' + E(阶) + \'</td><td>\' + E(d.师父 || "") + \'</td><td>\' + E(d.武功 || "") + \'</td>\'',
  '          + \'<td class="yx-num">\' + E(String(d.门槛 || "无").slice(0, 44)) + \'</td></tr>\';',
  '      }).join("");',
  '      H += \'<div class="yx-panel yx-full"><div class="yx-h">\' + E(k) + (m.所在 ? \'（\' + E(m.所在) + \'）\' : "") + \'</div>\'',
  '        + \'<table class="yx-tbl wrap"><thead><tr><th>阶</th><th>师父</th><th>教什么</th><th>门槛</th></tr></thead><tbody>\'',
  '        + 链 + \'</tbody></table></div>\';',
  '    });',
  '    return \'<div class="yx-row">\' + H + \'</div>\';',
  '  }',
  '',
].join('\n');

const 锚 = '  /* ── 说明 ── */';
if (!t.includes(锚)) { console.error('找不到说明段锚点'); process.exit(1); }
t = t.replace(锚, 补 + 锚);

// 世界页插入
t = t.replace('    if (D.NSFW && D.NSFW.档位 && D.NSFW.档位.length) {',
  '    H += 画解锁();\n    H += 画状态一览();\n    H += 画门派详();\n    if (D.NSFW && D.NSFW.档位 && D.NSFW.档位.length) {');
// 人物页插入八套
t = t.replace('    var 套 = D.八套 || [];', '    H += 画八套();\n    var 套 = D.八套 || [];');

fs.writeFileSync(p, t);
console.log('✅ 逻辑已补：状态一览 / 解锁表 / 门派详情 / 八套对照');
console.log('   文件现在 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
