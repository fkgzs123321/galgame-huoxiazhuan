// 批量注册全部条目（按 创作规划.yaml 的 name/type/part/path/keywords）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const PROJ = '旮旯给木-同级生2';
const D = path.join(ROOT, 'src', PROJ);
const YAML = require(path.join(ROOT, 'node_modules/yaml'));

const 规划 = YAML.parse(fs.readFileSync(path.join(D, '创作规划.yaml'), 'utf8'));
const patch = [];
const 缺文件 = [];

const 已有 = new Set(); for (const [t, es] of Object.entries(JSON.parse(fs.readFileSync(path.join(D,'tavern-cards-state.json'),'utf8')).entryManifest)) for (const n of Object.keys(es)) 已有.add(t+'/'+n);
for (const e of 规划.entries) {
  if (已有.has(e.type + '/' + e.name)) continue;
  const 有内容 = e.contents || (e.path && fs.existsSync(path.join(D, e.path)));
  if (!有内容) { 缺文件.push(e.name + ' ← ' + e.path); continue; }
  const v = { abstract: e.purpose || `${e.type}${e.part ? '/' + e.part : ''}：${e.name}`, keywords: e.keywords || [] };
  if (e.contents) v.contents = e.contents; else v.path = e.path;
  if (e.part) v.part = e.part;
  if (e.scope) v.scope = e.scope;
  // group 不用：forge 的 use_scoring 有 default+transform 的读回 bug（写 null 后无法再解析）
  patch.push({ op: 'add', path: `/entryManifest/${e.type}/${e.name}`, value: v });
}

console.log('待注册 ' + patch.length + ' 条' + (缺文件.length ? '；缺文件 ' + 缺文件.length + ' 条' : ''));
缺文件.forEach(x => console.log('   ⛔ ' + x));

fs.writeFileSync(path.join(D, '_patch.json'), JSON.stringify(patch));
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
try {
  console.log(execFileSync('node', [forge, 'patch', PROJ, '--file', path.join(D, '_patch.json')], { cwd: ROOT, encoding: 'utf8' }));
} catch (e) { console.log('❌ ' + (e.stdout || '') + (e.stderr || e.message)); }
fs.rmSync(path.join(D, '_patch.json'));

const s = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
let n = 0; const rows = [];
for (const [t, es] of Object.entries(s.entryManifest)) { const c = Object.keys(es).length; if (c) { n += c; rows.push(t + ' ' + c); } }
console.log('\n已注册合计 ' + n + ' 条：' + rows.join(' ｜ '));
console.log('创作规划共 ' + 规划.entries.length + ' 条 → 完成 ' + n + '/' + 规划.entries.length);
