// 修技能树：① 单父（不打结）② 按列纵向布局（不重叠）③ 补回点击绑定
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ── ① 建树：绝招只挂【一个】父（选依赖里最长的那个，最具体），避免打结 ──
const 旧多父 = `      // ★ 一个绝招可以挂在多个父下 —— 这就是交叉与分叉
      if (依赖.length) {
        依赖.forEach(function (n) {
          var pid = 名到id[n];
          if (!pid) return;
          节点[id].父 = pid;
          节点[pid].子.push(id);
          var ri = 根s.indexOf(id); if (ri >= 0) 根s.splice(ri, 1);
        });
        // 若原本无父（不可能走到这），兜底挂到第一个依赖
        if (根s.indexOf(id) >= 0 && 依赖[0]) { /* 已处理 */ }
      }`;
const 新单父 = `      // ★ 只挂【一个】父 —— 树不是图。
      //   挂多父会让「布局只放一次、连线却画多次」，线全缠在一起（被打结过）。
      //   选依赖里名字最长的那个当父（最长 = 最具体）。
      if (依赖.length) {
        依赖.sort(function (a, b) { return b.length - a.length; });
        var pid = 名到id[依赖[0]];
        if (pid) {
          节点[id].父 = pid;
          节点[pid].子.push(id);
          var ri = 根s.indexOf(id); if (ri >= 0) 根s.splice(ri, 1);
          节点[id].附 = 节点[id].附 + "　依赖 " + 依赖.length + " 门";
        }
      }`;
if (t.includes(旧多父)) { t = t.replace(旧多父, 新单父); console.log('✅ ① 改成单父'); }
else console.log('⚠️ ① 没匹配上');

// ── ② 布局：按深度分列 + 列内纵向排（绝不重叠）──
const a = t.indexOf('  function 布局(树) {');
const b = t.indexOf('  /* ── 画树（SVG：先连线，再节点）── */');
if (a < 0 || b < 0) { console.error('找不到 布局'); process.exit(1); }
const 新布局 = [
  '  /* ── 布局：按深度分列，列内纵向排（★ 绝不重叠）── */',
  '  function 布局(树) {',
  '    var 节点 = 树.节点;',
  '    var X0 = 12, 列宽 = 140, 行高 = 30;',
  '    // 递归算深度',
  '    var 深 = {};',
  '    function 算深(id, d, 防) {',
  '      if (防 > 20) return;                       // 防意外递归',
  '      if (深[id] === undefined || d > 深[id]) 深[id] = d;',
  '      (节点[id].子 || []).forEach(function (c) { if (节点[c]) 算深(c, d + 1, (防 || 0) + 1); });',
  '    }',
  '    (树.根 || []).forEach(function (r) { 算深(r, 0, 0); });',
  '    Object.keys(节点).forEach(function (id) { if (深[id] === undefined) 深[id] = 0; });',
  '    // 按深度归列',
  '    var 列 = {};',
  '    Object.keys(节点).forEach(function (id) {',
  '      var d = 深[id];',
  '      (列[d] = 列[d] || []).push(id);',
  '    });',
  '    // ★ 列内排序：先按「父在上一列的位置」排，再按名字 —— 这样连线不会交叉太多',
  '    var 位 = {}, 最深 = 0, 最多 = 0;',
  '    Object.keys(列).map(Number).sort(function (x, y) { return x - y; }).forEach(function (d) {',
  '      var 本列 = 列[d];',
  '      本列.sort(function (x, y) {',
  '        var px = 节点[x].父 ? (位[节点[x].父] || {}).序 : -1;',
  '        var py = 节点[y].父 ? (位[节点[y].父] || {}).序 : -1;',
  '        if (px !== py) return (px || 0) - (py || 0);',
  '        return String(节点[x].名).localeCompare(String(节点[y].名));',
  '      });',
  '      本列.forEach(function (id, i) {',
  '        位[id] = { x: X0 + d * 列宽, y: 30 + i * 行高, 序: i, 深: d };',
  '      });',
  '      最多 = Math.max(最多, 本列.length);',
  '      最深 = Math.max(最深, d);',
  '    });',
  '    return { 位: 位, 宽: X0 * 2 + (最深 + 1) * 列宽, 高: Math.max(100, 最多 * 行高 + 52), 深: 深 };',
  '  }',
  '',
].join('\n');
t = t.slice(0, a) + 新布局 + t.slice(b);
console.log('✅ ② 布局改成按列纵向排（不重叠）');

// ── ③ 画树：边改成从「父右边中点」到「子左边中点」，并用贝塞尔减少交叉感 ──
t = t.replace(
  "        var mx = p.x + 58;\n        s += '<path d=\"M' + (p.x + 116) + \" \" + p.y + \" H\" + mx + \" V\" + q.y + \" H\" + q.x + '\" fill=\"none\" stroke=\"var(--ln3)\" stroke-width=\"1\" opacity=\".7\"/>';",
  "        var x1 = p.x + 116, y1 = p.y, x2 = q.x, y2 = q.y, mx = (x1 + x2) / 2;\n        s += '<path d=\"M' + x1 + \" \" + y1 + \" C\" + mx + \" \" + y1 + \",\" + mx + \" \" + y2 + \",\" + x2 + \" \" + y2 + '\" fill=\"none\" stroke=\"var(--ln3)\" stroke-width=\"1\" opacity=\".55\"/>';"
);

// ── ④ 补回点击绑定（确认在不在）──
if (!t.includes('.yx-tn")')) {
  t = t.replace('    // ── 动手 ──', [
    '    // ── 技能树节点（点开看详情）──',
    '    [].forEach.call(document.querySelectorAll(".yx-tn"), function (c) {',
    '      c.addEventListener("click", function (ev) {',
    '        ev.stopPropagation();',
    '        开技能(c.getAttribute("data-tn"));',
    '      });',
    '    });',
    '',
    '    // ── 动手 ──',
  ].join('\n'));
  console.log('✅ ④ 点击绑定已补');
} else console.log('（④ 绑定已在）');

fs.writeFileSync(p, t);
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
