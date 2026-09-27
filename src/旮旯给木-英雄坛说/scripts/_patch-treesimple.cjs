// 技能树简化：三层 —— 基本功 → 当前门派武功 → 绝招
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// 重写建树（整段替换：从 function 建树 到 布局 之前）
const a = t.indexOf('  function 建树() {');
const b = t.indexOf('  /* ── 布局：按深度分列');
if (a < 0 || b < 0) { console.error('找不到建树 ' + a + ' ' + b); process.exit(1); }

const 新建树 = [
  '  function 建树() {',
  '    var 节点 = {}, 根s = [], 序 = 0;',
  '    function 加(名, 父, 类, 品, 附) {',
  '      var id = "n" + (序++);',
  '      节点[id] = { id: id, 名: 名, 父: 父 || null, 子: [], 类: 类, 品: 品, 附: 附 || "" };',
  '      if (父 && 节点[父]) 节点[父].子.push(id); else 根s.push(id);',
  '      return id;',
  '    }',
  '    var 当前派 = (状态.场景 || {}).当前门派 || "";',
  '    var 武 = D.门派武功 || {};',
  '    var 已 = {};',
  '    var 技0 = (状态.技能 || {}).基本 || {}, 门0 = (状态.技能 || {}).门派 || {};',
  '    for (var q in 技0) 已[q] = 数(技0[q]);',
  '    for (var q2 in 门0) 已[q2] = 数(门0[q2]);',
  '',
  '    // ── ① 只画【学过的基本功】（没学的也占位，但只画前 10 个）──',
  '    var 基id = {};',
  '    (D.基本武功 || []).forEach(function (n) { 基id[n] = 加(n, null, "基本", "q1"); });',
  '',
  '    // ── ② 当前门派的武功，挂在「基本内功」下（功夫都从内功起）──',
  '    var 主根 = 基id["基本内功"] || 根s[0];',
  '    if (当前派 && 武[当前派]) {',
  '      var 列 = 武[当前派] || [];',
  '      列.forEach(function (名, i) {',
  '        var 品 = i === 列.length - 1 ? "q4" : (i <= 1 ? "q2" : "q3");',
  '        基id[名] = 加(名, 主根, "门派武功", 品, 已[名] ? "已学 " + 已[名] : "");',
  '      });',
  '    }',
  '',
  '    // ── ③ 绝招：挂在【它条件里提到的那门武功】下（只挂一个，避免打结）──',
  '    var 名到id = {};',
  '    Object.keys(节点).forEach(function (id) { 名到id[节点[id].名] = id; });',
  '    (D.绝招 || []).forEach(function (j) {',
  '      if (当前派 && j.派 !== 当前派) return;                   // ★ 只画当前门派的绝招',
  '      var 条 = String(j.条件 || "");',
  '      var 依赖 = Object.keys(名到id).filter(function (n) { return n.length >= 3 && 条.indexOf(n) >= 0; });',
  '      var 品 = (条.match(/≥|>=/g) || []).length >= 2 ? "q4" : "q3";',
  '      var id = 加(j.名, null, "绝招", 品, "冷却 " + (j.冷却 == null ? "—" : j.冷却));',
  '      if (依赖.length) {',
  '        依赖.sort(function (x, y) { return y.length - x.length; });   // 最长=最具体',
  '        var pid = 名到id[依赖[0]];',
  '        if (pid) {',
  '          节点[id].父 = pid; 节点[pid].子.push(id);',
  '          var ri = 根s.indexOf(id); if (ri >= 0) 根s.splice(ri, 1);',
  '          节点[id].附 = "依赖 " + 依赖.length + " 门　" + 节点[id].附;',
  '        }',
  '      }',
  '    });',
  '    return { 节点: 节点, 根: 根s };',
  '  }',
  '',
].join('\n');
t = t.slice(0, a) + 新建树 + t.slice(b);

fs.writeFileSync(p, t);
console.log('✅ 树简化成三层：基本功 → 当前门派武功 → 绝招（只画当前门派）');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
