import { readFileSync, writeFileSync } from 'fs';
import * as acorn from 'acorn';

const filePath = 'src/欲妈群/正则/状态栏.html';
const html = readFileSync(filePath, 'utf8');
const scriptMatch = html.match(/(<script>)([\s\S]*?)(<\/script>)/);
let jsCode = scriptMatch[2];

// 已知问题1: d20_history:[]}} 多了一个 }，导致 DEFAULT_STAT 对象提前闭合
// 应该是 d20_history:[]} (只闭合 player 对象，不闭合 DEFAULT_STAT)
const fix1 = jsCode.replace('d20_history:[]}},hao_jiaqi', 'd20_history:[]},hao_jiaqi');
if (fix1 !== jsCode) {
  console.log('✓ 修复1: d20_history:[]}} → d20_history:[]}');
  jsCode = fix1;
} else {
  console.log('✗ 未找到 d20_history:[]}},hao_jiaqi');
}

// 循环检查并修复其他语法错误
let iteration = 0;
while (iteration < 30) {
  iteration++;
  try {
    acorn.parse(jsCode, {
      ecmaVersion: 2022,
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true,
    });
    console.log(`\n✓ 第${iteration}次验证通过`);
    break;
  } catch (err) {
    console.log(`\n--- 第${iteration}次错误 ---`);
    console.log('message:', err.message);
    if (err.loc) console.log('line:', err.loc.line, 'column:', err.loc.column);

    const pos = err.pos;
    const before = jsCode.substring(Math.max(0, pos - 100), pos);
    const after = jsCode.substring(pos, pos + 100);
    console.log('错误前100字符:', before);
    console.log('错误处:', after);

    // 尝试自动修复：}},键名 或 }}键名 的情况（多了一个 }）
    // 模式: }},键名: → 应该是 },键名:
    // 模式: }}键名: → 应该是 }键名:
    const beforeStr = jsCode.substring(0, pos);
    const m = beforeStr.match(/(\}\}),?(\w+)$/);
    if (m) {
      console.log('修复: ' + m[1] + (m[0].includes(',') ? ',' : '') + m[2] + ' → }' + (m[0].includes(',') ? ',' : '') + m[2] + ' (删除多余的 })');
      // 找到 }} 的位置，删除一个 }
      const doubleBracePos = beforeStr.length - m[0].length;
      jsCode = jsCode.substring(0, doubleBracePos + 1) + jsCode.substring(doubleBracePos + 2);
      continue;
    }

    // 尝试修复：多余的 } 在末尾
    if (err.message.includes('Unexpected token') && after.startsWith('}')) {
      console.log('尝试删除多余的 }');
      jsCode = jsCode.substring(0, pos) + jsCode.substring(pos + 1);
      continue;
    }

    console.log('无法自动修复，停止');
    break;
  }
}

// 写回文件
const newHtml = html.replace(
  /(<script>)([\s\S]*?)(<\/script>)/,
  (match, p1, p2, p3) => p1 + jsCode + p3
);
writeFileSync(filePath, newHtml, 'utf8');
console.log('\n已写回文件');
