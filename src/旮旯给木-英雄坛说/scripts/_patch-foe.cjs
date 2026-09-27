// 把「动手」区补回来（挂在总览页的「上一场」之前）
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

if (t.includes('data-foe=')) { console.log('（动手区已在，跳过）'); process.exit(0); }

const 动手区 = [
  '    // ── 动手（★ <user> 侧动作，语义：他在动手）──',
  '    var 地点 = C.当前地点 || "";',
  '    var 在场 = Object.keys(D.NPC || {}).filter(function (n) {',
  '      var w = String((D.NPC[n] || {}).所在 || "");',
  '      return 地点 && w.indexOf(地点.slice(0, 3)) >= 0;',
  '    }).slice(0, 8);',
  '    if (在场.length) {',
  '      H4 += \'<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">可交战目标 <em>（这一带能打的）</em></div><div class="yx-foes">\';',
  '      在场.forEach(function (n) {',
  '        var 品 = NPC品级(n), 色 = 档色(品);',
  '        H4 += \'<button class="yx-btn" data-foe="\' + E(n) + \'" style="border-color:\' + 色 + \'66;color:\' + 色 + \'" title="\' + 品名(品) + \'">\' + E(n) + \'</button>\';',
  '      });',
  '      H4 += \'</div><div class="yx-nt">战斗在前端逐回合真跑（掷值确定，同一局面重跑结果一致），结果写进「上一场」。</div></div></div>\';',
  '    }',
  '',
].join('\n');

// H4 是总览页「上一场」用的变量；插在它声明之后
const 锚 = '    var H4 = \'\';';
if (!t.includes(锚)) {
  // 若没有 H4，就在「上一场」段之前造一个
  const i = t.indexOf("var 战 = 局.战斗结果;");
  if (i < 0) { console.error('找不到「上一场」段'); process.exit(1); }
  t = t.slice(0, i) + '    var H4 = "";\n' + 动手区 + t.slice(i);
  t = t.replace('    return H1 + H2 + H3 + H4;', '    return H1 + H2 + H3 + H4;');
} else {
  t = t.replace(锚, 锚 + '\n' + 动手区);
}

// 绑回动手
if (!t.includes('".yx-btn[data-foe]"') && !t.includes('[data-foe]')) {
  t = t.replace('    // ── 技能树节点 ──', [
    '    // ── 动手 ──',
    '    [].forEach.call(document.querySelectorAll("[data-foe]"), function (b) {',
    '      b.addEventListener("click", function () { 动手(b.getAttribute("data-foe")); });',
    '    });',
    '',
    '    // ── 技能树节点 ──',
  ].join('\n'));
}

fs.writeFileSync(p, t);
console.log('✅ 动手区已补回');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
