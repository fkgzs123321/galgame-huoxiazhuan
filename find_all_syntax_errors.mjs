import { readFileSync, writeFileSync } from 'fs';
import * as acorn from 'acorn';

const filePath = 'src/欲妈群/正则/状态栏.html';
const html = readFileSync(filePath, 'utf8');
const scriptMatch = html.match(/(<script>)([\s\S]*?)(<\/script>)/);
let jsCode = scriptMatch[2];

// 循环修复所有语法错误
let fixed = true;
let fixCount = 0;
while (fixed && fixCount < 20) {
  fixed = false;
  try {
    acorn.parse(jsCode, {
      ecmaVersion: 2022,
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true,
    });
    console.log('✓ acorn 解析成功');
    break;
  } catch (err) {
    fixCount++;
    console.log(`\n--- 错误 ${fixCount} ---`);
    console.log('message:', err.message);
    console.log('pos:', err.pos);
    if (err.loc) console.log('line:', err.loc.line, 'column:', err.loc.column);

    const pos = err.pos;
    const before = jsCode.substring(Math.max(0, pos - 80), pos);
    const after = jsCode.substring(pos, pos + 80);
    console.log('错误前80字符:', before);
    console.log('错误处:', after);

    // 尝试自动修复：
    // 情况1: 对象提前闭合 — 模式 "}},xxx:" 应该是 "}},xxx:" 中多了一个 }
    // 检查错误位置前面是否是 "}}" 后面跟 "xxx:"
    const pattern1 = jsCode.substring(Math.max(0, pos - 3), pos + 30);
    console.log('模式1检查:', pattern1);

    // 检查 "}} 后跟 键名:" 的情况（多了一个 }）
    const m1 = jsCode.substring(0, pos).match(/(\}\})([a-zA-Z_]\w*)$/);
    if (m1) {
      console.log('找到模式: }}后跟键名', m1[2], '— 删除一个 }');
      const removePos = pos - 1; // 删除多余的 }
      jsCode = jsCode.substring(0, removePos) + jsCode.substring(removePos + 1);
      fixed = true;
      continue;
    }

    // 情况2: 键名后跟 : 但 : 被认为是意外 token
    // 这通常是因为前面的 } 太多导致的
    // 检查前面是否有 }} 但应该只有一个 }
    const before20 = jsCode.substring(Math.max(0, pos - 20), pos);
    console.log('错误前20字符:', JSON.stringify(before20));

    // 如果无法自动修复，退出
    console.log('无法自动修复，停止');
    break;
  }
}

if (fixCount > 0) {
  console.log('\n共修复', fixCount, '处错误');
}

// 写回文件
if (fixed || fixCount > 0) {
  const newHtml = html.replace(
    /(<script>)([\s\S]*?)(<\/script>)/,
    (match, p1, p2, p3) => p1 + jsCode + p3
  );
  writeFileSync(filePath, newHtml, 'utf8');
  console.log('已写回文件');
}

// 最终验证
try {
  acorn.parse(jsCode, {
    ecmaVersion: 2022,
    sourceType: 'script',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
  });
  console.log('\n✓ 最终验证通过');
} catch (err) {
  console.error('\n✗ 仍有语法错误:', err.message);
  if (err.loc) console.error('  line:', err.loc.line, 'column:', err.loc.column);
  const pos = err.pos;
  console.error('  错误前80字符:', jsCode.substring(Math.max(0, pos - 80), pos));
  console.error('  错误处:', jsCode.substring(pos, pos + 80));
}
