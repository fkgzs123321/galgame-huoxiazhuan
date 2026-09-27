// 面板：体力/行动点 + 强化四段式 + 英雄榜 + 据点锁
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');
let 改 = [];

// ══ ① 四数条：加体力与行动点（改成六项）══
const 旧四 = t.match(/    document\.getElementById\("yx-quad"\)\.innerHTML = \[[\s\S]*?\]\.map\(function \(x\) \{/);
if (旧四) {
  t = t.replace(旧四[0], [
    '    var 体力 = 数((状态.时间 || {}).体力, 100);',
    '    var 行动点 = 数((状态.时间 || {}).行动点, 3);',
    '    document.getElementById("yx-quad").innerHTML = [',
    '      { k: "岁数", v: (T.岁数 || 14), u: "岁 · 第 " + (T.月 || 1) + " 月" },',
    '      { k: "体力", v: Math.round(体力), u: 体力 < 30 ? "乏了" : "", c: 体力 < 30 ? "wn" : "" },',
    '      { k: "行动点", v: 行动点, u: "/ 3", c: 行动点 > 0 ? "" : "wn" },',
    '      { k: "耐心", v: 限, u: "月", c: 限 <= 6 ? "wn" : "" },',
    '      { k: "反抗", v: Math.round(反), u: 反 < 20 ? "快到极限" : "", c: 反 < 20 ? "wn" : "" },',
    '      { k: "对/她的了解", v: 数((状态.主角 || {}).对她的了解, 0), u: "级", c: "" },',
    '    ].map(function (x) {',
  ].join('\n'));
  改.push('四数条→六项');
}

// ══ ② 据点判定（强化/炼丹/请教 只在驻地可用）══
const 据点 = [
  '  /* ★ 据点（出处：主神空间的「乐园」）—— 只有回到驻地才能请教/强化/炼丹 */',
  '  function 在据点() {',
  '    var 地 = String((状态.场景 || {}).当前地点 || "");',
  '    var 驻 = ((D.日常与资源 || {}).据点 || {});',
  '    var 列 = (驻.英雄坛说的据点 || []).concat(["驻地", "客栈", "山门", "门派"]);',
  '    for (var i = 0; i < 列.length; i++) if (地.indexOf(String(列[i]).slice(0, 2)) >= 0) return true;',
  '    return !地;   // 没写地点时不禁（免得卡住）',
  '  }',
  '  function 据点名() { return (状态.场景 || {}).当前地点 || "驻地"; }',
  '',
].join('\n');
t = t.replace('  /* ══ 图标库', 据点 + '  /* ══ 图标库');
改.push('据点判定');

// ══ ③ 强化弹层改成四段式 ══
const 旧强化 = t.indexOf('    // ★ 强化（与机制层同口径）');
if (旧强化 > 0) {
  const 止 = t.indexOf('    绑物品按钮();', 旧强化);
  if (止 > 0) {
    t = t.slice(0, 旧强化) + [
      '    // ★ 强化（四段式 —— 出处：主神空间的装备强化）',
      '    var P = 强化参数(), 层 = 取层("装备", 名);',
      '    var 档 = 强档(层), 率 = 成功率(档, 附符, 护石, 垫);',
      '    rows += \'<div class="yx-k2">强化（\' + 区名(档) + \'）</div>\';',
      '    rows += 折行("层数", 层 + " / " + P.装上限);',
      '    rows += 折行("成功率", \'<b style="color:\' + (率 >= 0.6 ? "var(--grn)" : 率 >= 0.3 ? "var(--gold)" : "var(--rose)") + \'">\' + Math.round(率 * 100) + "%</b>" + (附符 ? "（含强化符 +12%）" : ""));',
      '    rows += 折行("失败会", \'<span class="\' + (档.失败 === "分解" ? "w" : 档.失败 === "归零" ? "w" : "") + \'">\' + E(档.失败 || "必成") + "</span>");',
      '    rows += 折行("垫子保底", 垫 + " / 10" + (垫 >= 10 ? \' <span class="gr">（下一发必成）</span>\' : ""));',
      '    rows += 折行("下一层要", Object.keys(要).map(function (k) { return E(k) + " " + 要[k]; }).join("　") + (门.够 ? \' <span class="gr">（足）</span>\' : \' <span class="w">（不足）</span>\'));',
      '    var 已装 = 装中 && 装中[槽];',
    ].join('\n') + t.slice(止);
    改.push('强化四段式');
  }
}

fs.writeFileSync(p, t);
console.log('✅ 面板改造：' + 改.join(' / '));
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
