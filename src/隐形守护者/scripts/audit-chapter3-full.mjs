#!/usr/bin/env node
/**
 * 第三章全量遍历审计（对照 chapter3-choices 真相源 + 一二章包结构）
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  CHAPTER3_NODES,
  CHAPTER3_CHOICES,
  CHAPTER3_APPLY,
  CHAPTER3_CHOICE_HOME,
  CHAPTER3_CHECKPOINT_LINES,
  CHAPTER3_NODE_HINTS,
} from './chapter3-choices.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CH3_DIR = path.join(ROOT, '世界书/事件/第三章');
const CH2_DIR = path.join(ROOT, '世界书/事件/第二章');
const FORCE_TS = path.join(ROOT, '脚本/第三章写死强制/index.ts');
const EJS_CTRL = path.join(ROOT, '世界书/EJS/EJS（剧情）动态控制器.txt');
const EJS_PRE = path.join(ROOT, '世界书/EJS/EJS预处理.txt');
const PACKED = path.join(ROOT, '隐形守护者.json');

const errors = [];
const warns = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warns.push(msg);
}

// --- 1. choices 内部一致性 ---
for (const node of CHAPTER3_NODES) {
  if (!CHAPTER3_CHOICES[node]) err(`[choices] 节点 ${node} 无 CHAPTER3_CHOICES 规则`);
  if (!CHAPTER3_CHECKPOINT_LINES[node]) err(`[choices] 节点 ${node} 无 CHECKPOINT_LINES`);
  if (!CHAPTER3_NODE_HINTS[node]) warn(`[choices] 节点 ${node} 无 NODE_HINTS`);
}

for (const [id, home] of Object.entries(CHAPTER3_CHOICE_HOME)) {
  if (!CHAPTER3_APPLY[id]) err(`[choices] HOME 有 ${id} 但 APPLY 无`);
  if (!CHAPTER3_NODES.includes(home)) err(`[choices] ${id} 归属节点 ${home} 不在 NODES`);
  const spec = CHAPTER3_APPLY[id];
  if (spec && CHAPTER3_CHOICE_HOME[id] !== home) err(`[choices] ${id} HOME 不一致`);
}

for (const [id, spec] of Object.entries(CHAPTER3_APPLY)) {
  if (!CHAPTER3_CHOICE_HOME[id]) err(`[choices] APPLY 有 ${id} 但 CHOICE_HOME 无`);
  const home = CHAPTER3_CHOICE_HOME[id];
  const rules = CHAPTER3_CHOICES[home];
  if (!rules) err(`[choices] ${id} 的 home ${home} 无 rules`);
  const allIds = new Set();
  for (const p of [rules.pass].flat().filter(Boolean)) {
    for (const x of [p].flat()) allIds.add(x.id);
  }
  for (const b of [rules.be].flat().filter(Boolean)) {
    for (const x of [b].flat()) allIds.add(x.id);
  }
  if (!allIds.has(id)) err(`[choices] ${id} 不在 ${home} 的 pass/be 规则里`);
  if (spec.be && !spec.ending) err(`[choices] ${id} be=true 无 ending`);
  if (spec.be && !spec.unlock) warn(`[choices] ${id} be=true 无 unlock`);
  if (!spec.be && spec.node !== spec.checkpoint && id !== 'C3-16-A') {
    warn(`[choices] ${id} node≠checkpoint (${spec.node} vs ${spec.checkpoint})`);
  }
}

// --- 2. 写死脚本 vs choices ---
const ts = fs.readFileSync(FORCE_TS, 'utf8');
for (const id of Object.keys(CHAPTER3_APPLY)) {
  if (!ts.includes(`'${id}'`)) err(`[脚本] index.ts 缺少 APPLY id ${id}`);
}
for (const node of CHAPTER3_NODES) {
  if (!ts.includes(`'${node}'`)) err(`[脚本] index.ts CHAPTER3_NODES 缺 ${node}`);
}
if (/第三章-1[7-9]|第三章-2[0-9]/.test(ts)) err('[脚本] 残留 第三章-17~22');
const nodeCountInTs = (ts.match(/'第三章-\d+'/g) || []).filter((s, i, a) => a.indexOf(s) === i);
const tsNodesBlock = ts.match(/const CHAPTER3_NODES = \[([\s\S]*?)\] as const/)?.[1] ?? '';
const tsNodeList = [...tsNodesBlock.matchAll(/'(第三章-\d+)'/g)].map((m) => m[1]);
if (tsNodeList.length !== CHAPTER3_NODES.length) {
  err(`[脚本] CHAPTER3_NODES 长度 ${tsNodeList.length} ≠ choices ${CHAPTER3_NODES.length}`);
}
for (const n of CHAPTER3_NODES) {
  if (!tsNodeList.includes(n)) err(`[脚本] CHAPTER3_NODES 数组缺 ${n}`);
}
if (!ts.includes('enforceChapter3Write')) err('[脚本] 无 enforceChapter3Write');
if (!ts.includes('requireZibaoForHuang')) err('[脚本] 无黄夫人门闩');
if (!ts.includes('C3-16-A')) err('[脚本] 无章末 C3-16-A');
if (ts.includes('第三章分歧')) err('[脚本] 残留 第三章分歧');
if (!ts.includes('第二章-自保的感慨')) err('[脚本] 线索名被错误替换');
if (!ts.includes("includes('第二章-完成')")) err('[脚本] 入口未要求 第二章-完成');

// --- 3. 世界书文件遍历 ---
const CH2_INFRA = [
  '抉择全书-写死表',
  '写死机读表',
  '当前节点选项·常亮',
  '选项识别与一致性铁律',
  '节点推进铁律',
  '非法节点熔断',
  'BE执行范例',
  'BE后禁止续玩',
];
for (const suffix of CH2_INFRA) {
  const p = path.join(CH3_DIR, `第三章${suffix}.yaml`);
  if (!fs.existsSync(p)) err(`[世界书] 缺 ${path.basename(p)}`);
}

const ch3Files = fs.readdirSync(CH3_DIR).filter((f) => f.endsWith('.yaml'));
const nodeYaml = ch3Files.filter((f) => /^第三章-\d+/.test(f));
if (nodeYaml.length !== CHAPTER3_NODES.length) {
  err(`[世界书] 分节点 YAML ${nodeYaml.length} ≠ 节点数 ${CHAPTER3_NODES.length}`);
}
for (const node of CHAPTER3_NODES) {
  const hint = CHAPTER3_NODE_HINTS[node];
  const slug = (hint ?? '节点').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').slice(0, 12);
  const match = ch3Files.find((f) => f.startsWith(`${node}-`));
  if (!match) err(`[世界书] 缺分节点文件 ${node}-*.yaml`);
}

const always = fs.readFileSync(path.join(CH3_DIR, '第三章当前节点选项·常亮.yaml'), 'utf8');
for (const [node, lines] of Object.entries(CHAPTER3_CHECKPOINT_LINES)) {
  for (const line of lines.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (!always.includes(t.replace(/^A\.\s*/, 'A. '))) {
      const core = t.replace(/^[A-D]\.\s*/, '').slice(0, 8);
      if (core && !always.includes(core)) err(`[常亮] ${node} 缺选项行: ${t.slice(0, 40)}`);
    }
  }
}

const machine = fs.readFileSync(path.join(CH3_DIR, '第三章写死机读表.yaml'), 'utf8');
for (const id of Object.keys(CHAPTER3_APPLY)) {
  if (!machine.includes(id)) err(`[机读表] 缺 ${id}`);
}

const beSample = fs.readFileSync(path.join(CH3_DIR, '第三章BE执行范例.yaml'), 'utf8');
for (const [id, spec] of Object.entries(CHAPTER3_APPLY)) {
  if (spec.be && spec.ending && !beSample.includes(spec.ending)) {
    err(`[BE范例] ${id} 结局「${spec.ending}」未收录`);
  }
}
for (const end of ['信口雌黄', '生死归途']) {
  if (!beSample.includes(end)) err(`[BE范例] 缺门闩结局 ${end}`);
}

// 分节点叙事厚度（对照第二章）
const ch2Sample = fs.readFileSync(path.join(CH2_DIR, '第二章-14-自保共荣.yaml'), 'utf8');
const ch3Sample = fs.readFileSync(
  path.join(CH3_DIR, nodeYaml.find((f) => f.includes('14')) ?? ''),
  'utf8',
);
const ch2HasSelect = ch2Sample.includes('【请选择】');
const ch3HasSelect = ch3Sample.includes('【请选择】');
if (!ch3HasSelect && ch2HasSelect) {
  warn(`[叙事] 第三章分节点无「【请选择】」块（${nodeYaml.find((f) => f.includes('14'))}），仅为占位，未达第二章节点粒度`);
}
let stubCount = 0;
for (const f of nodeYaml) {
  const body = fs.readFileSync(path.join(CH3_DIR, f), 'utf8');
  if (body.includes('本节点选项见《第三章当前节点选项·常亮》')) stubCount++;
}
if (stubCount === nodeYaml.length) {
  warn(`[叙事] 全部 ${stubCount} 个分节点 YAML 为占位模板，无独立导演稿`);
}

// --- 4. EJS ---
const ejs = fs.readFileSync(EJS_CTRL, 'utf8');
const pre = fs.readFileSync(EJS_PRE, 'utf8');
if (!pre.includes('is_chapter3')) err('[EJS预处理] 无 is_chapter3');
if (!pre.includes('ch2_done')) err('[EJS预处理] 无 ch2_done');
if (!pre.includes('ch3_main_ok')) err('[EJS预处理] 无 ch3_main_ok');
const infraNames = CH2_INFRA.map((s) => `第三章${s}`);
for (const name of infraNames) {
  if (!ejs.includes(name)) err(`[EJS剧情] 未 getwi ${name}`);
}
const ch3OrderMatch = ejs.match(/const ch3Order = \[([\s\S]*?)\]/);
if (!ch3OrderMatch) err('[EJS剧情] 无 ch3Order');
else {
  for (const node of CHAPTER3_NODES) {
    if (!ch3OrderMatch[1].includes(`'${node}'`)) err(`[EJS剧情] ch3Order 缺 ${node}`);
  }
}
for (const node of CHAPTER3_NODES) {
  const hint = CHAPTER3_NODE_HINTS[node];
  const slug = (hint ?? '节点').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').slice(0, 12);
  const wiName = `${node}-${slug}`;
  if (!ejs.includes(wiName)) err(`[EJS剧情] 未 getwi 分节点 ${wiName}`);
  const match = ch3Files.find((f) => f.startsWith(`${node}-`));
  if (match) {
    const entryName = match.replace(/\.yaml$/, '');
    if (entryName !== wiName) err(`[EJS] getwi ${wiName} 与文件 ${entryName} 不一致`);
  }
}

// --- 5. manifest & pack ---
const statePath = path.join(ROOT, 'tavern-cards-state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const manifest = state.entryManifest?.事件 ?? {};
for (const name of [...infraNames, '第三章-生死途', ...nodeYaml.map((f) => f.replace(/\.yaml$/, ''))]) {
  if (!manifest[name]) err(`[manifest] 事件缺 ${name}`);
}
if (!state.extensions?.tavern_helper?.scripts?.['第三章写死强制']?.enabled) {
  err('[manifest] 第三章写死强制 未启用');
}
if (fs.existsSync(PACKED)) {
  const packed = fs.readFileSync(PACKED, 'utf8');
  if (!packed.includes('enforceChapter3Write')) err('[pack] 打包 JSON 无 enforceChapter3Write');
  if (/第三章-2[0-2]/.test(packed)) err('[pack] 打包 JSON 残留 第三章-20~22');
  for (const id of ['C3-14-B', 'C3-16-A']) {
    if (!packed.includes(id)) err(`[pack] 缺 ${id}`);
  }
}

// --- 6. 阶段指导 ---
const host = path.join(ROOT, '世界书/阶段指导/第三章主持.yaml');
if (!fs.existsSync(host)) err('[阶段指导] 缺 第三章主持.yaml');
const stageTxt = fs.readFileSync(path.join(ROOT, '世界书/阶段指导/阶段指导.txt'), 'utf8');
if (!stageTxt.includes('第三章')) warn('[阶段指导] 阶段指导.txt 第三章描述较少');

// --- 7. 与第二章出口衔接 ---
const c2Ts = fs.readFileSync(path.join(ROOT, '脚本/第二章写死强制/index.ts'), 'utf8');
if (!c2Ts.includes('第三章-0')) err('[衔接] 第二章章末未指向 第三章-0');

console.log('=== 第三章全量遍历审计 ===');
console.log(`节点: ${CHAPTER3_NODES.length} | APPLY: ${Object.keys(CHAPTER3_APPLY).length} | 分节点YAML: ${nodeYaml.length}`);
if (warns.length) {
  console.log('\n⚠ 警告 (' + warns.length + '):');
  console.log(warns.map((w) => `  - ${w}`).join('\n'));
}
if (errors.length) {
  console.log('\n✗ 错误 (' + errors.length + '):');
  console.error(errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('\n✓ 机制层遍历：无错误');
if (warns.length) {
  console.log('（有叙事层警告，见上；不阻断打包）');
  process.exit(0);
}
console.log('✓ 无警告');
