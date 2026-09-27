// 技能页：表格式 → 带图标的折叠项（每个功夫展开看成本/反哺/相关绝招）
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// 把技能表的 tbody 换成折叠项列表
const 旧表 = t.match(/    H \+= '<table class="yx-tbl"><thead><tr><th>功夫<\/th>[\s\S]*?H \+= '<\/tbody><\/table><\/div><\/div>';/);
if (!旧表) { console.error('找不到技能表段'); process.exit(1); }

const 新表 = [
  '    if (!已学.length) H += \'<div class="yx-e">还没学任何功夫。去找个师傅，或者去翻秘籍。</div>\';',
  '    else {',
  '      var 绝全 = D.绝招 || [];',
  '      H += 已学.map(function (x) {',
  '        var 名 = x[0], 现 = 数(x[1]), 类 = x[2];',
  '        var 悟 = Math.max(1, t.悟性);',
  '        var 要 = Math.max(1, Math.round(355.06 * (现 + 1) / 悟));',
  '        var nf = 10 - (现 % 10 || 0);',
  '        var 够 = 数((状态.资源 || {}).潜能) >= 要;',
  '        var 内 = "";',
  '        内 += 折行("现在", 现 + " 级");',
  '        内 += 折行("下一级要", 要 + " 潜能" + (够 ? \' <span class="gr">（够）</span>\' : \' <span class="w">（不够）</span>\'));',
  '        内 += 折行("反哺", nf === 10 ? \'<span class="gr">下一级就给天赋 +1</span>\' : "还 " + nf + " 级");',
  '        var 对应 = { 基本拳脚: "膂力", 基本轻功: "敏捷", 基本内功: "根骨", 读书写字: "悟性" }[名];',
  '        if (对应) 内 += 折行("养哪个天赋", 对应);',
  '        // 子子项：跟这门有关的绝招',
  '        var 关绝 = 绝全.filter(function (j) { return String(j.条件 || "").indexOf(名) >= 0; });',
  '        if (关绝.length) {',
  '          内 += \'<div class="yx-k2">这门功夫通向的绝招</div>\';',
  '          内 += 关绝.map(function (j) {',
  '            return \'<div class="rowx"><span class="k2">\' + ic("法术", 12) + " " + E(j.名) + \'</span><span class="v2">\' + E(j.条件) + \'</span></div>\';',
  '          }).join("");',
  '        }',
  '        内 += \'<div class="yx-ops" style="margin-top:9px">\'',
  '          + \'<button class="yx-btn pri sm" data-sk="\' + E(名) + \'">请教 1 级</button>\'',
  '          + \'<button class="yx-btn sm" data-sk5="\' + E(名) + \'">连请教 5 级</button></div>\';',
  '        return 折(名 + "　" + 现, 内, 类 + "　" + 要 + " 潜能", 功夫图标(名));',
  '      }).join("");',
  '    }',
  '    H += \'<div class="yx-nt">★ 成本 = 355.06 × (等级+1) ÷ 悟性。点开每一项看它通向哪些绝招。</div></div></div>\';',
].join('\n');

t = t.replace(旧表[0], 新表);
fs.writeFileSync(p, t);
console.log('✅ 技能页：换成折叠项（图标 + 成本/反哺/通向的绝招）');
