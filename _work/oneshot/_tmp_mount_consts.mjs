// 数据表顶层声明挂载 v2：全局扫描 <% %> 块（跨行），深度跟踪
import fs from 'fs';

const files = [
  'EJS预处理/全局规则总表.txt',
  'EJS预处理/固定物品效果表.txt',
  'EJS预处理/属性技能骰子联动.txt',
  'EJS预处理/LCG骰子/引擎.txt',
  'EJS预处理/女角偏好系数表.txt',
  'EJS预处理/个人反应属性.txt',
  'EJS预处理/属性系统.txt',
  'EJS预处理/阶段联动框架.txt',
  'EJS预处理/全局规则-NSFW身体规则.txt',
  'EJS预处理/全局规则-技能系统.txt',
  'EJS预处理/防口胡机制.txt',
];
const ROOT = 'src/同级生2/世界书/';

function processFile(rel) {
  const f = ROOT + rel;
  if (!fs.existsSync(f)) { console.log('MISS:', rel); return; }
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');
  const changedLines = new Set();
  const detail = [];

  // 找出所有 <% ... %> 块（跨行）
  const blocks = []; // {startLine, endLine, code}
  let i = 0;
  while (i < content.length) {
    const s = content.indexOf('<%', i);
    if (s === -1) break;
    const e = content.indexOf('%>', s + 2);
    if (e === -1) break;
    const code = content.slice(s + 2, e);
    const startLine = content.slice(0, s).split('\n').length - 1;
    const endLine = content.slice(0, e).split('\n').length - 1;
    blocks.push({ startLine, endLine, code });
    i = e + 2;
  }

  for (const block of blocks) {
    if (block.code.startsWith('#') || block.code.startsWith('/*') || block.code.trimStart().startsWith('*')) continue;
    const codeLines = block.code.split('\n');
    let depth = 0;
    for (let li = 0; li < codeLines.length; li++) {
      const lineNo = block.startLine + li;
      const rawLine = codeLines[li];
      if (depth === 0) {
        const m = rawLine.match(/^\s*(?:var|const|let)\s+([A-Z][A-Za-z0-9_$]*)\s*=/);
        if (m) {
          const re = new RegExp(`\\b(?:var|const|let)\\s+(${m[1]})\\s*=`, 'g');
          lines[lineNo] = lines[lineNo].replace(re, 'this.$1 =');
          changedLines.add(lineNo);
          detail.push(`L${lineNo + 1}: ${m[1]} → this.${m[1]}`);
        } else {
          const mi = rawLine.match(/^\s*if \(typeof ([A-Z][A-Za-z0-9_$]*) === 'undefined'\)\s*var \1\s*=/);
          if (mi) {
            const re = new RegExp(`(typeof\\s+)(${mi[1]})(\\s*=== 'undefined'\\s*\\)\\s*)var \\2(\\s*=)`, 'g');
            lines[lineNo] = lines[lineNo].replace(re, '$1this.$2$3this.$2$4');
            changedLines.add(lineNo);
            detail.push(`L${lineNo + 1}: ${mi[1]} → this.${mi[1]} (if形式)`);
          } else {
            const mf = rawLine.match(/^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/);
            if (mf) {
              const re = new RegExp(`\\bfunction\\s+(${mf[1]})\\s*\\(`, 'g');
              lines[lineNo] = lines[lineNo].replace(re, 'this.$1 = function $1(');
              changedLines.add(lineNo);
              detail.push(`L${lineNo + 1}: function ${mf[1]} → this.${mf[1]}`);
            }
          }
        }
      }
      // 深度更新（忽略字符串内的括号——用简单计数，罕见误判）
      for (const ch of rawLine) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (depth < 0) depth = 0;
    }
  }

  if (changedLines.size > 0) {
    fs.writeFileSync(f, lines.join('\n'), 'utf-8');
  }
  console.log(`=== ${rel}: 修改 ${changedLines.size} 行 / ${detail.length} 处 ===`);
  for (const d of detail.slice(0, 40)) console.log('   ', d);
  if (detail.length > 40) console.log(`    ... 共 ${detail.length} 处`);
}

for (const f of files) processFile(f);
console.log('\n全部完成');
