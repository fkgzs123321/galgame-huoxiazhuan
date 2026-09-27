#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// 逐页自检 —— 每一页都渲染一遍，抓「整页白 / 报错 / 太空」
//
// ★ 为什么需要它：改完面板跑语法检查是**不够的** ——
//   语法没错、逻辑也跑得通，但某一页可能因为一个未定义的变量**整页空白**。
//   这类错只有「真渲染一遍」才现形（活计页就这么白过一整轮）。
//
// 用法: node scripts/check-pages.cjs
// ════════════════════════════════════════════════════════════
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const 根 = path.join(__dirname, '..');
const 预览 = path.join(根, 'scripts', '_preview.html');
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => fs.existsSync(p));

if (!EDGE) { console.error('找不到 Edge'); process.exit(1); }

// 页面清单（从产物里读，保证不漏）
const 产物 = fs.readFileSync(path.join(根, '正则', '状态栏界面.html'), 'utf8');
const 页s = [...产物.matchAll(/\{ id: "([a-z]+)", 名: "([^"]+)" \}/g)].map(m => [m[1], m[2]]);
if (!页s.length) { console.error('读不到页签表'); process.exit(1); }

// 先重建预览
try { execSync(`node "${path.join(根, 'scripts', '_make-preview.cjs')}"`, { stdio: 'ignore' }); } catch (e) { }

const url = 'file:///' + 预览.replace(/\\/g, '/');
let 过 = 0, 败 = 0;

console.log('═════ 逐页自检（' + 页s.length + ' 页）═════\n');

for (const [id, 名] of 页s) {
  let dom = '';
  try {
    dom = execFileSync(EDGE, [
      '--headless=new', '--disable-gpu', '--dump-dom',
      '--virtual-time-budget=3500', url + '?page=' + id,
    ], { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { dom = ''; }

  // 取 yx-bd 的内容（配平 div）
  const i = dom.indexOf('class="yx-bd"');
  let 段 = '';
  if (i >= 0) {
    const 起 = dom.indexOf('>', i) + 1;
    let 深 = 1, j = 起;
    while (j < dom.length && 深 > 0) {
      const a = dom.indexOf('<div', j), b = dom.indexOf('</div>', j);
      if (b < 0) break;
      if (a >= 0 && a < b) { 深++; j = a + 4; } else { 深--; j = b + 6; }
    }
    段 = dom.slice(起, j - 6);
  }

  const 报错 = 段.indexOf('渲染出错') >= 0;
  const 太空 = 段.length < 200;
  const 标 = 报错 ? '★ 报错' : (太空 ? '★ 太空' : '✅');
  if (报错 || 太空) 败++; else 过++;

  let 详 = '';
  if (报错) {
    const k = 段.indexOf('yx-nt w');
    if (k >= 0) 详 = '　' + 段.slice(k + 9, k + 90).replace(/<[^>]*>/g, '').trim();
  }
  console.log('  ' + 名.padEnd(6) + '(' + id.padEnd(9) + ') ' + 标 + 详);
}

console.log('\n通过 ' + 过 + ' ｜ 有问题 ' + 败);
process.exit(败 ? 1 : 0);
