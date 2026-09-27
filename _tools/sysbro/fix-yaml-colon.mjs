// 修 YAML 结构错误：`键: 值里还有一个 ": "` 会被 YAML 当成嵌套映射
//   规则：行内第 2 个及以后的 「: 」改成全角「：」（YAML 不把全角冒号当映射指示符）
import fs from 'node:fs';
import path from 'node:path';

const CARD = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/';
const 跳过 = /世界书\/(变量|机制)\//;
const files = [];
const walk = (d) => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.txt')) files.push(p);
  }
};
walk(CARD + '世界书');

let 改文件 = 0, 改行 = 0;
const 明细 = [];
for (const p of files) {
  const rel = path.relative(CARD, p).split(path.sep).join('/');
  if (跳过.test(rel)) continue;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  let 动 = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // 只处理「缩进 + 键: 值」这种 YAML 行；值是后面全部
    if (/<%|%>/.test(l)) continue;   /* ★ EJS 代码行绝不动 */
    const m = l.match(/^(\s*)([^\s:#][^:]*):\s(.*)$/);
    if (!m) continue;
    const 值 = m[3];
    if (!/:\s/.test(值)) continue;               // 值里没有第二个冒号
    const 新值 = 值.replace(/:\s/g, '：');
    lines[i] = m[1] + m[2] + ': ' + 新值;
    动 = true; 改行++;
    if (明细.length < 8) 明细.push(rel + ':' + (i + 1) + '  ' + m[2] + ' → 值内冒号改全角');
  }
  if (动) { fs.writeFileSync(p, lines.join('\n')); 改文件++; }
}
console.log('修了', 改文件, '个文件的', 改行, '行');
明细.forEach((x) => console.log('  ' + x));
