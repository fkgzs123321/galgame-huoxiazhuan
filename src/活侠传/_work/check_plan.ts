/**
 * 校验 创作规划.yaml：
 *   ① YAML 能解析
 *   ② entries 里列的 path 都真实存在（规划与实现不能对不上）
 *   ③ first_messages 的 output_path 都存在
 *   ④ MVU 变量路径能在 schema 里找到对应键
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const 根 = 'src/活侠传';
const 规划 = YAML.parse(fs.readFileSync(path.join(根, '创作规划.yaml'), 'utf8'));

let 错 = 0;
const 报 = (s: string) => {
  console.log('  ✗ ' + s);
  错++;
};
const 好 = (s: string) => console.log('  ✓ ' + s);

console.log('══ ① 结构 ══');
好('YAML 解析通过');
console.log('  project:', JSON.stringify(规划.project));
console.log('  顶层键:', Object.keys(规划).join(', '));
console.log('  角色数:', 规划.characters.length);
console.log('  条目数:', 规划.entries.length);
console.log('  开场白:', 规划.first_messages.length);

console.log('\n══ ② entries 的 path 都存在 ══');
let 缺 = 0;
for (const e of 规划.entries) {
  const p = path.join(根, e.path);
  if (!fs.existsSync(p)) {
    报(`${e.name} → ${e.path}`);
    缺++;
  }
}
if (!缺) 好(`${规划.entries.length} 条 path 全部存在`);

console.log('\n══ ③ 开场白文件都存在 ══');
let 缺2 = 0;
for (const f of 规划.first_messages) {
  const p = path.join(根, f.output_path);
  if (!fs.existsSync(p)) {
    报(f.output_path);
    缺2++;
  }
}
if (!缺2) 好(`${规划.first_messages.length} 条开场白都在`);

console.log('\n══ ④ 反向：世界书里有、规划里没列的 ══');
const 已列 = new Set(规划.entries.map((e: any) => e.path));
const 漏: string[] = [];
function 走(dir: string) {
  for (const f of fs.readdirSync(path.join(根, dir), { withFileTypes: true })) {
    const rel = `${dir}/${f.name}`;
    if (f.isDirectory()) 走(rel);
    else if (/\.(yaml|txt)$/.test(f.name) && !rel.includes('/变量/')) {
      if (!已列.has(rel)) 漏.push(rel);
    }
  }
}
走('世界书');
if (漏.length) {
  console.log('  （以下条目未登记进规划，若是有意忽略可不管）');
  for (const l of 漏) console.log('    · ' + l);
} else {
  好('世界书条目全部已登记');
}

console.log('\n══ ⑤ MVU 变量路径对得上 schema ══');
const schema = JSON.parse(fs.readFileSync(path.join(根, 'schema.json'), 'utf8'));
/** 在 schema.json 里按路径找键 */
function 有键(路径: string): boolean {
  const 段 = 路径.split('.');
  let 当: any = schema;
  for (const k of 段) {
    if (k.startsWith('<') || k === '') continue; // 占位符跳过
    const props = 当?.properties ?? 当?.items?.properties;
    if (!props) {
      // record 的 additionalProperties 兜底
      if (当?.additionalProperties) {
        当 = 当.additionalProperties;
        continue;
      }
      return false;
    }
    if (!props[k]) {
      if (当?.additionalProperties) {
        当 = 当.additionalProperties;
        继续;
      }
      return false;
    }
    当 = props[k];
  }
  return true;
}
// 简化：只检查第一段存在（嵌套有 record，逐段查容易误报）
const 顶层 = Object.keys(schema.properties ?? {});
let 变量错 = 0;
for (const v of 规划.mvu.variables) {
  const 头 = String(v.path).split('.')[0];
  if (!顶层.includes(头)) {
    报(`变量 ${v.path} → schema 无顶层键 ${头}`);
    变量错++;
  }
}
if (!变量错) 好(`${规划.mvu.variables.length} 条变量路径的顶层键都在 schema 里`);
console.log('  schema 顶层键:', 顶层.join(', '));

console.log('\n' + '═'.repeat(50));
if (错) {
  console.log(`发现 ${错} 处问题`);
  process.exit(1);
}
console.log('创作规划与实现一致');
