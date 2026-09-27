// 绑折叠与格子的交互
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

const 新增 = [
  '    // ── 折叠展开 ──',
  '    [].forEach.call(document.querySelectorAll(".yx-fl > .hd"), function (h) {',
  '      h.addEventListener("click", function () { h.parentNode.classList.toggle("on"); });',
  '    });',
  '',
  '    // ── 物品格 / 装备槽 ──',
  '    [].forEach.call(document.querySelectorAll(".yx-cell"), function (c) {',
  '      c.addEventListener("click", function () {',
  '        开物品(数(c.getAttribute("data-i")), c.getAttribute("data-n"));',
  '      });',
  '    });',
  '    [].forEach.call(document.querySelectorAll(".yx-slot"), function (c) {',
  '      c.addEventListener("click", function () { 开部位(c.getAttribute("data-p")); });',
  '    });',
  '',
  '    // 物品 / 部位 / 任务 / 兴奋度 / 周期',
].join('\n');

if (!t.includes('折叠展开')) {
  t = t.replace('    // 物品 / 部位 / 任务 / 兴奋度 / 周期', 新增);
  console.log('✅ 绑上了折叠与格子');
} else console.log('（已绑过，跳过）');

fs.writeFileSync(p, t);
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
