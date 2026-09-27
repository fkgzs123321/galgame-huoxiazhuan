// 把品质水印用上（物品格 + 技能格 + 技能树节点）
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');
let n = 0;

// ① 物品格：加品质水印
const 旧物 = "          + '<span class=\"bdg\">' + E(品.slice(0, 2)) + '</span>'";
const 新物 = "          + '<span class=\"yx-wm\">' + E(品) + '</span>'\n          + '<span class=\"bdg\">' + E(品.slice(0, 2)) + '</span>'";
if (t.includes(旧物)) { t = t.replace(旧物, 新物); n++; }

// ② 技能格：加品级水印
const 旧技 = "          + '<div class=\"bdg\" style=\"color:' + 色 + ';border-color:' + 色 + '66\">' + 品名(品) + (够 ? \" · 可升\" : \"\") + '</div>'\n          + '</div>';";
const 新技 = "          + '<span class=\"yx-wm\">' + 品名(品) + '</span>'\n          + '<div class=\"bdg\" style=\"color:' + 色 + ';border-color:' + 色 + '66\">' + 品名(品) + (够 ? \" · 可升\" : \"\") + '</div>'\n          + '</div>';";
if (t.includes(旧技)) { t = t.replace(旧技, 新技); n++; }
else {
  // 兜底：按特征找
  const i = t.indexOf("品名(品) + (够 ? \" · 可升\" : \"\")");
  if (i > 0) {
    const 行起 = t.lastIndexOf('\n', i);
    t = t.slice(0, 行起) + "\n          + '<span class=\"yx-wm\">' + 品名(品) + '</span>'" + t.slice(行起);
    n++;
  }
}

// ③ 技能树节点：在 SVG 里加品质水印（文字斜置）
const 旧树 = "      if (有) s += '<text x=\"' + (p.x + 宽 - 8) + '\" y=\"' + (p.y + 4) + '\" text-anchor=\"end\" fill=\"' + 色 + '\" font-size=\"10\">' + v + \"</text>\";";
const 新树 = 旧树 + "\n      s += '<text x=\"' + (p.x + 宽 - 6) + '\" y=\"' + (p.y + 16) + '\" text-anchor=\"end\" fill=\"' + 色 + '\" font-size=\"9\" opacity=\".38\">' + 品名(n.品) + '</text>';";
if (t.includes(旧树)) { t = t.replace(旧树, 新树); n++; }

fs.writeFileSync(p, t);
console.log('✅ 品质水印已用在 ' + n + ' 处（物品格 / 技能格 / 技能树节点）');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
