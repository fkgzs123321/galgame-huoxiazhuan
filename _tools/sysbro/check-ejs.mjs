// EJS 收尾检查（ejs/guide.md §EJS 收尾检查）+ 全量 YAML 解析
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('E:/Games/写卡/tavern_helper_template/');
let YAML = null;
try { YAML = require('yaml'); } catch (e) {}

const CARD = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/';
const files = [];
const walk = (d) => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(txt|yaml)$/.test(e.name)) files.push(p);
  }
};
walk(CARD + '世界书');

let 通过 = 0, 失败 = 0;
const t = (名, ok, d) => { if (ok) { 通过++; console.log('  [OK]   ' + 名 + (d ? '  ' + d : '')); } else { 失败++; console.log('  [FAIL] ' + 名 + (d ? '  ' + d : '')); } };

console.log('═══ 一、全量 YAML 解析（guide 明说：其它 YAML 它不管，必须自己跑）═══');
if (!YAML) { console.log('  ⚠ 没装 yaml 包，跳过'); }
else {
  // ★ 口径：只有「首行就是一条映射（键: 且冒号后为空）」的文件才算 YAML 文件。
  //    说明文体（首行是裸标题）与 EJS 条目（首行是 @@ 装饰器）不承担 YAML 语义，跳过。
  // ★ 例外豁免：文风层 5 份是「规范条文」，skills 明令规范条文用说明文体 ——
  //    它们只受「不许写 markdown」约束（下面第五条单查），不承担 YAML 语义。
  const 说明文体 = /世界书\/文风\//;
  const yamls = files.filter((f) => {
    if (说明文体.test(path.relative(CARD, f).split(path.sep).join('/'))) return false;
    const t = fs.readFileSync(f, 'utf8');
    const 首行 = (t.split('\n').find((x) => x.trim()) || '').trim();
    return /^[^\s:][^:]*:\s*$/.test(首行);
  });
  const 坏 = [];
  for (const p of yamls) {
    const rel = path.relative(CARD, p).split(path.sep).join('/');
    try { YAML.parse(fs.readFileSync(p, 'utf8')); } catch (e) { 坏.push([rel, e.message.split('\n')[0].slice(0, 70)]); }
  }
  t('全部 ' + yamls.length + ' 个 .txt/.yaml 都能被 YAML 解析', 坏.length === 0, 坏.length ? '' : '');
  坏.forEach(([f, m]) => console.log('     ✗ ' + f + ' → ' + m));
}

console.log('\n═══ 二、@@ 装饰器必须在首行 ═══');
{
  const 坏 = [];
  for (const p of files) {
    const rel = path.relative(CARD, p).split(path.sep).join('/');
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    const i = lines.findIndex((l) => /^@@/.test(l));
    if (i > 0) 坏.push(rel + ' → 第 ' + (i + 1) + ' 行');
  }
  t('装饰器（若有）都在文件首行', 坏.length === 0, 坏.join(' | '));
}

console.log('\n═══ 三、@@if 条件写法（getvar + stat_data 前缀 + 无裸标识符）═══');
{
  const 裸标识 = /(current_|\.includes\(|\.length\s*[><=]|\?(\.|\[))/;
  let 检查 = 0, 缺前缀 = [], 裸引用 = [], 没默认值 = [];
  for (const p of files) {
    const rel = path.relative(CARD, p).split(path.sep).join('/');
    const txt = fs.readFileSync(p, 'utf8');
    const 行 = txt.split('\n').filter((l) => /getvar\(|@@if/.test(l));
    for (const l of 行) {
      if (/getvar\(/.test(l)) {
        检查++;
        if (!/stat_data\./.test(l)) 缺前缀.push(rel + ' → ' + l.trim().slice(0, 50));
        if (!/defaults/.test(l)) 没默认值.push(rel + ' → ' + l.trim().slice(0, 50));
        if (裸标识.test(l.replace(/getvar\([^)]*\)/g, ''))) 裸引用.push(rel + ' → ' + l.trim().slice(0, 50));
      }
    }
  }
  t('getvar 全部带 stat_data. 前缀', 缺前缀.length === 0, 缺前缀.slice(0, 3).join(' | '));
  t('getvar 全部带 defaults（读不到时走兜底）', 没默认值.length === 0, 没默认值.slice(0, 3).join(' | '));
  t('条件里没有裸标识符引用', 裸引用.length === 0, 裸引用.slice(0, 3).join(' | '));
  console.log('     （共检查 ' + 检查 + ' 条 getvar）');
}

console.log('\n═══ 四、段落控制分支必须覆盖所有情况（if / else if / else）═══');
{
  const 坏 = [];
  for (const p of files) {
    const rel = path.relative(CARD, p).split(path.sep).join('/');
    const txt = fs.readFileSync(p, 'utf8');
    if (!/<%_?\s*if/.test(txt)) continue;
    const hasElseIf = /else if/.test(txt);
    const tail = txt.slice(-900);
    if (!/else\s*\{/.test(tail)) 坏.push(rel + '（结尾没有 else 兜底）');
  }
  t('所有 EJS 分支条目都以 else 收尾', 坏.length === 0, 坏.join(' | '));
}

console.log('\n═══ 五、YAML 内容文件里没有 markdown 语法 ═══');
{
  const 坏 = [];
  for (const p of files.filter((f) => /\.(yaml)$/.test(f))) {
    const rel = path.relative(CARD, p).split(path.sep).join('/');
    const txt = fs.readFileSync(p, 'utf8');
    if (/\*\*/.test(txt)) 坏.push(rel + ' → Markdown 粗体');
    if (/^[^#\n]*──[^#\n]*$/m.test(txt)) 坏.push(rel + ' → 裸分隔线 ──');
  }
  t('.yaml 里没有 `**` 与裸 `──` 分隔线', 坏.length === 0, 坏.join(' | '));
}

console.log('\n' + '='.repeat(56));
console.log('通过 ' + 通过 + ' / 失败 ' + 失败);
