// 加图标库 + 折叠层级（主项 → 子项 → 子子项）+ 更多可点区域
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ── ① 图标库（内联 SVG，按用途取名）──
const 图标库 = [
  '  /* ══ 图标库（内联 SVG，不依赖字体）══ */',
  '  var I = {',
  '    拳脚: \'<path d="M7 12 V6 a2 2 0 1 1 4 0 v6 M11 12 V5 a2 2 0 1 1 4 0 v7 M15 12 V7 a2 2 0 1 1 4 0 v8 a6 6 0 0 1 -6 6 H10 a6 6 0 0 1 -6 -6 v-3 a2 2 0 0 1 4 0"/>\',',
  '    内功: \'<circle cx="12" cy="12" r="3"/><path d="M12 3 v3 M12 18 v3 M3 12 h3 M18 12 h3 M5.5 5.5 l2 2 M16.5 16.5 l2 2 M5.5 18.5 l2 -2 M16.5 7.5 l2 -2"/>\',',
  '    轻功: \'<path d="M4 18 h16"/><path d="M8 14 l3 -8 3 8"/><path d="M6 14 h12"/>\',',
  '    剑: \'<path d="M18 3 l3 3 -9 9 -3 -3 Z"/><path d="M9 12 l-4 4 M4 20 l2 -2"/>\',',
  '    刀: \'<path d="M20 3 c-6 1 -11 6 -12 12 l3 3 c6 -1 11 -6 12 -12 Z"/><path d="M5 15 l-2 5 5 -2"/>\',',
  '    杖: \'<path d="M6 21 L18 5"/><circle cx="19" cy="4" r="2"/>\',',
  '    鞭: \'<path d="M4 4 c4 6 12 2 14 8 c2 5 -6 8 -10 5"/><circle cx="4" cy="4" r="1.5"/>\',',
  '    招架: \'<path d="M12 3 L20 6 v6 c0 5 -8 9 -8 9 s-8 -4 -8 -9 V6 Z"/>\',',
  '    书: \'<path d="M4 5 a2 2 0 0 1 2 -2 h5 v18 H6 a2 2 0 0 1 -2 -2 Z"/><path d="M20 5 a2 2 0 0 0 -2 -2 h-5 v18 h5 a2 2 0 0 0 2 -2 Z"/>\',',
  '    法术: \'<path d="M12 2 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"/><path d="M19 15 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1 Z"/>\',',
  '    物品: \'<path d="M4 8 h16 l-1.5 12 a2 2 0 0 1 -2 1.8 h-9 a2 2 0 0 1 -2 -1.8 Z"/><path d="M9 8 V6 a3 3 0 0 1 6 0 v2"/>\',',
  '    任务: \'<path d="M9 5 h9 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 V7"/><path d="M7 3 v4 h5"/><path d="M9 13 h6 M9 17 h4"/>\',',
  '    人: \'<circle cx="12" cy="8" r="4"/><path d="M4 21 a8 8 0 0 1 16 0"/>\',',
  '    两人: \'<circle cx="9" cy="8" r="3"/><path d="M3 20 a6 6 0 0 1 12 0"/><circle cx="17.5" cy="10" r="2.2"/><path d="M15 19 a5 5 0 0 1 6.5 -1.5"/>\',',
  '    地点: \'<path d="M12 22 s7 -7 7 -12 a7 7 0 1 0 -14 0 c0 5 7 12 7 12 Z"/><circle cx="12" cy="10" r="2.5"/>\',',
  '    门派: \'<path d="M4 21 V9 l8 -6 8 6 v12"/><path d="M9 21 v-6 h6 v6"/>\',',
  '    身体: \'<circle cx="12" cy="7" r="3"/><path d="M12 10 v7 M8 13 h8 M10 21 l2 -4 2 4"/>\',',
  '    她: \'<circle cx="12" cy="12" r="9"/><path d="M12 7 v5 l3 2"/>\',',
  '    星: \'<path d="M12 3 l2.6 6.3 6.4 .5 -4.9 4.2 1.5 6.3 -5.6 -3.4 -5.6 3.4 1.5 -6.3 -4.9 -4.2 6.4 -.5 Z"/>\',',
  '    火: \'<path d="M12 3 c3 4 5 6 5 9 a5 5 0 1 1 -10 0 c0 -3 2 -5 5 -9 Z"/><path d="M12 14 c1 2 2 2.5 2 4 a2 2 0 1 1 -4 0 c0 -1.5 1 -2 2 -4 Z"/>\',',
  '    毒: \'<circle cx="12" cy="12" r="7"/><circle cx="9.5" cy="10" r="1.5" fill="currentColor"/><circle cx="14" cy="14" r="1.5" fill="currentColor"/>\',',
  '    心: \'<path d="M12 20 s-8 -5 -8 -10 a4.5 4.5 0 0 1 8 -2.5 a4.5 4.5 0 0 1 8 2.5 c0 5 -8 10 -8 10 Z"/>\',',
  '    锁: \'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11 V7 a4 4 0 0 1 8 0 v4"/>\',',
  '    钟: \'<circle cx="12" cy="13" r="8"/><path d="M12 9 v4 l3 2 M9 21 h6"/>\',',
  '    环: \'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>\',',
  '    折: \'<path d="M6 9 l6 6 6 -6"/>\',',
  '    右: \'<path d="M9 6 l6 6 -6 6"/>\',',
  '    加: \'<path d="M12 5 v14 M5 12 h14"/>\',',
  '    减: \'<path d="M5 12 h14"/>\',',
  '    检: \'<circle cx="11" cy="11" r="7"/><path d="M16 16 l5 5"/>\',',
  '    门: \'<path d="M4 21 V4 a1 1 0 0 1 1 -1 h14 a1 1 0 0 1 1 1 v17"/><circle cx="15" cy="12" r="1" fill="currentColor"/>\',',
  '  };',
  '  /* 取图标：名字命中就返回对应，否则给个通用圆点 */',
  '  function ic(名, s) {',
  '    var sz = s || 13;',
  '    return \'<svg width="\' + sz + \'" height="\' + sz + \'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex:none;vertical-align:-2px">\' + (I[名] || I.环) + "</svg>";',
  '  }',
  '  /* 按功夫名猜图标 */',
  '  function 功夫图标(名) {',
  '    var n = String(名 || "");',
  '    if (n.indexOf("拳") >= 0 || n.indexOf("掌") >= 0 || n.indexOf("手") >= 0) return "拳脚";',
  '    if (n.indexOf("内功") >= 0 || n.indexOf("神功") >= 0 || n.indexOf("一气") >= 0 || n.indexOf("聚顶") >= 0) return "内功";',
  '    if (n.indexOf("轻功") >= 0 || n.indexOf("身法") >= 0 || n.indexOf("踏雪") >= 0) return "轻功";',
  '    if (n.indexOf("剑") >= 0) return "剑";',
  '    if (n.indexOf("刀") >= 0) return "刀";',
  '    if (n.indexOf("杖") >= 0) return "杖";',
  '    if (n.indexOf("鞭") >= 0) return "鞭";',
  '    if (n.indexOf("招架") >= 0) return "招架";',
  '    if (n.indexOf("读书") >= 0 || n.indexOf("写字") >= 0) return "书";',
  '    if (n.indexOf("法术") >= 0 || n.indexOf("诀") >= 0) return "法术";',
  '    return "环";',
  '  }',
  '  /* 按名字猜物品图标 */',
  '  function 物品图标(名) {',
  '    var n = String(名 || "");',
  '    if (n.indexOf("剑") >= 0) return "剑";',
  '    if (n.indexOf("刀") >= 0) return "刀";',
  '    if (n.indexOf("杖") >= 0) return "杖";',
  '    if (n.indexOf("鞭") >= 0) return "鞭";',
  '    if (n.indexOf("甲") >= 0 || n.indexOf("衣") >= 0 || n.indexOf("衫") >= 0 || n.indexOf("裙") >= 0) return "招架";',
  '    if (n.indexOf("丹") >= 0 || n.indexOf("药") >= 0) return "毒";',
  '    if (n.indexOf("酒") >= 0) return "火";',
  '    return "物品";',
  '  }',
  '',
].join('\n');
t = t.replace('  /* ══ 图标库', '  /* ══ 图标库'); // 幂等占位
t = t.replace('  var 页 = "overview", 状态 = {}, 楼 = -1, 选中 = \'\';', 图标库 + '  var 页 = "overview", 状态 = {}, 楼 = -1, 选中 = \'\';');
if (!t.includes('var I = {')) {
  t = t.replace('  var 页 = \'overview\', 状态 = {}, 楼 = -1, 选中 = \'\';', 图标库 + '  var 页 = \'overview\', 状态 = {}, 楼 = -1, 选中 = \'\';');
}

// ── ② 折叠组件 CSS ──
const gp = 'src/旮旯给木-英雄坛说/正则/_面板骨架.html';
let g = fs.readFileSync(gp, 'utf8');
const 折叠CSS = [
  '/* ══ 折叠（主项 → 子项 → 子子项）══ */',
  '.yx-fl{border:1px solid var(--ln);border-radius:var(--r3);background:var(--b0);overflow:hidden;margin-bottom:6px;transition:.16s}',
  '.yx-fl:hover{border-color:var(--ln2)}',
  '.yx-fl>.hd{display:flex;align-items:center;gap:9px;padding:9px 12px;cursor:pointer;transition:.16s}',
  '.yx-fl>.hd:hover{background:var(--b3)}',
  '.yx-fl>.hd .ar{color:var(--t4);transition:transform .2s;flex:none}',
  '.yx-fl.on>.hd .ar{transform:rotate(90deg)}',
  '.yx-fl>.hd .t1{flex:1;color:var(--t1);font-size:12.5px;font-weight:500}',
  '.yx-fl>.hd .t2{color:var(--t3);font-size:11.5px;font-variant-numeric:tabular-nums}',
  '.yx-fl>.bd{display:none;padding:2px 12px 11px 34px;border-top:1px solid var(--ln)}',
  '.yx-fl.on>.bd{display:block}',
  '.yx-fl .yx-fl{margin-top:5px;background:var(--b1)}',
  '.yx-fl .yx-fl>.bd{padding-left:22px}',
  '.yx-fl .rowx{display:flex;align-items:center;gap:9px;padding:5px 0;font-size:12px}',
  '.yx-fl .rowx .k2{color:var(--t3);min-width:64px}',
  '.yx-fl .rowx .v2{color:var(--t1);flex:1}',
  '.yx-fl .tagx{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:20px;',
  '  border:1px solid var(--ln2);font-size:11px;color:var(--t3);margin-right:5px}',
  '.yx-fl .i2{color:var(--t3);flex:none}',
  '.yx-dot{width:6px;height:6px;border-radius:50%;background:var(--ln3);flex:none}',
].join('\n');
g = g.replace('@media(max-width:560px){.yx-quad', 折叠CSS + '\n@media(max-width:560px){.yx-quad');
fs.writeFileSync(gp, g);

fs.writeFileSync(p, t);
console.log('✅ 图标库（29 个 SVG）+ 折叠组件 CSS 已加');
console.log('   逻辑 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
