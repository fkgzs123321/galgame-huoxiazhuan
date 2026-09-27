// 人形画细一点 + 装备槽与人形并排
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// 把人形 SVG 换成更清楚的版本，槽位改成两栏网格（与人形并列在卡内）
const 旧块 = t.match(/      \+ '<div class="yx-doll">'[\s\S]*?\+ '<\/div>'\n      \+ '<div class="yx-nt">'/);
if (!旧块) { console.error('找不到人形段'); process.exit(1); }

const 新块 = [
  '      + \'<div class="yx-dollwrap">\'',
  '      + \'<div class="yx-doll">\'',
  '      + \'<svg viewBox="0 0 110 210" width="98" height="186">\'',
  '      // 头',
  '      + \'<ellipse cx="55" cy="24" rx="14" ry="17" fill="var(--b3)" stroke="var(--ln3)" stroke-width="0.8"/>\'',
  '      // 颈',
  '      + \'<path d="M50 40 v7 M60 40 v7" stroke="var(--ln3)" stroke-width="0.8"/>\'',
  '      // 躯干（肩宽腰窄）',
  '      + \'<path d="M34 51 Q55 46 76 51 L72 96 Q55 101 38 96 Z" fill="var(--b3)" stroke="var(--ln3)" stroke-width="0.8"/>\'',
  '      // 手臂',
  '      + \'<path d="M35 53 L22 96 L25 116" stroke="var(--ln3)" stroke-width="0.8" fill="none" stroke-linecap="round"/>\'',
  '      + \'<path d="M75 53 L88 96 L85 116" stroke="var(--ln3)" stroke-width="0.8" fill="none" stroke-linecap="round"/>\'',
  '      // 腰带',
  '      + \'<path d="M39 95 h32" stroke="var(--gold)" stroke-width="1.4" opacity=".55"/>\'',
  '      // 腿',
  '      + \'<path d="M44 100 L41 148 L43 176" stroke="var(--ln3)" stroke-width="0.8" fill="none" stroke-linecap="round"/>\'',
  '      + \'<path d="M66 100 L69 148 L67 176" stroke="var(--ln3)" stroke-width="0.8" fill="none" stroke-linecap="round"/>\'',
  '      // 脚',
  '      + \'<path d="M40 177 h8 M62 177 h8" stroke="var(--ln3)" stroke-width="1"/>\'',
  '      // 已穿的位置点亮',
  '      + (穿["外衫"] || 穿["上装"] ? \'<path d="M34 51 Q55 46 76 51 L72 96 Q55 101 38 96 Z" fill="none" stroke="var(--gold)" stroke-width="1.2" opacity=".7"/>\' : "")',
  '      + (穿["下裳"] || 穿["下装"] ? \'<path d="M40 98 L41 148 M70 98 L69 148" stroke="var(--gold)" stroke-width="1.2" opacity=".7"/>\' : "")',
  '      + (穿["鞋履"] || 穿["鞋子"] ? \'<path d="M40 177 h8 M62 177 h8" stroke="var(--gold)" stroke-width="2"/>\' : "")',
  '      + \'</svg></div>\'',
  '',
  '      + \'<div class="yx-slots">\'',
  '      + 部位s.map(function (pn, i) {',
  '          var 有2 = 穿[pn];',
  '          var 位图标 = (pn === "里衣" ? "招架" : pn === "佩饰" || pn === "饰品" ? "星" :',
  '            (pn === "鞋履" || pn === "鞋子" || pn === "布袜" || pn === "袜子") ? "轻功" :',
  '            (pn === "外衫" || pn === "上装") ? "招架" : "环");',
  '          return \'<div class="yx-slot\' + (有2 ? " on" : "") + \'" data-p="\' + E(pn) + \'">\'',
  '            + \'<span class="i2">\' + ic(位图标, 13) + \'</span>\'',
  '            + \'<span class="lbl">\' + E(pn) + \'</span>\'',
  '            + \'<span class="val">\' + (有2 ? E(有2) : "空") + \'</span>\'',
  '            + \'</div>\';',
  '        }).join("")',
  '      + \'</div></div>\'',
  '      + \'<div class="yx-nt">\'',
].join('\n');

t = t.replace(旧块[0], 新块);
fs.writeFileSync(p, t);
console.log('✅ 人形画细了（头/颈/躯干/臂/腰带/腿/脚 + 已穿位置点亮），槽位并排');

// CSS：人形与槽位并排
const gp = 'src/旮旯给木-英雄坛说/正则/_面板骨架.html';
let g = fs.readFileSync(gp, 'utf8');
g = g.replace('.yx-doll{background:var(--b1);border:1px solid var(--ln);border-radius:var(--r3);padding:10px;margin-bottom:10px}',
  '.yx-dollwrap{display:flex;gap:12px;align-items:flex-start}\n.yx-doll{background:var(--b1);border:1px solid var(--ln);border-radius:var(--r3);padding:9px 6px;flex:none}\n@media(max-width:420px){.yx-dollwrap{flex-direction:column;align-items:stretch}.yx-doll{align-self:center}}');
g = g.replace('.yx-slots{display:flex;flex-direction:column;gap:4px}',
  '.yx-slots{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}');
fs.writeFileSync(gp, g);
console.log('✅ CSS：人形与槽位并排（窄屏自动竖排）');
