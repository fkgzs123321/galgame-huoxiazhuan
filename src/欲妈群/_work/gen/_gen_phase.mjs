// 阶段条目生成器：把每位妈妈的 5 档数据写成 名字_阶段N.txt（13键 YAML）
// 用法：node _gen_phase.mjs _data_<uid>.mjs
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const dataFile = process.argv[2];
const mod = await import(pathToFileURL(path.resolve(dataFile)).href);
const C = mod.default;
// 主语返工层：_subj.mjs 若给了该角色该档的 can/cannot/wontdo，覆盖数据文件里的
let SUBJ = {};
for (const f of ['_subj.mjs', '_subj_2.mjs', '_subj_3.mjs']) {
  try { const m = (await import(pathToFileURL(path.resolve(path.join(import.meta.dirname, '..', 'data', f))).href)).default; Object.assign(SUBJ, m); } catch (e) {}
}
const subj = SUBJ[C.name] || SUBJ[C.filePrefix] || {};

const OUT = path.join(process.cwd(), '世界书');
let written = 0;

function blk(text, indent) {
  // 块标量：每行前加缩进
  return String(text).trimEnd().split('\n').map(l => (l.trim() === '' ? '' : indent + l)).join('\n');
}
function list(items, indent) {
  return items.map(i => indent + '- ' + i).join('\n');
}
function kv(obj, indent, order) {
  const keys = order || Object.keys(obj);
  return keys.map(k => {
    const v = obj[k];
    if (Array.isArray(v)) return indent + k + ':\n' + list(v, indent + '  ');
    if (v && typeof v === 'object') return indent + k + ':\n' + kv(v, indent + '  ');
    if (typeof v === 'string' && v.includes('\n')) return indent + k + ': |\n' + blk(v, indent + '  ');
    return indent + k + ': ' + v;
  }).join('\n');
}

for (let i = 0; i < 5; i++) {
  const p = C.phases[i];
  const n = i + 1;
  const gateVar = C.topLevel
    ? `getvar('stat_data.${C.name}.阶段', { defaults: 1 })`
    : `getvar('stat_data.群.成员详情.${C.uid}.阶段', { defaults: 1 })`;

  let s = '';
  s += `@@if ${gateVar} === ${n}\n`;
  s += `_怎么触发: 只当 ${C.topLevel ? C.name : '群.成员详情.' + C.uid}.阶段 落在「${n} ${p.tier}」时\n`;
  s += `区间: ${n}（${p.tier}）\n\n`;

  s += kv({ '★ 本档的边界': p.edge }, '') + '\n\n';
  if (Array.isArray(p.play) && p.play.length) s += kv({ '这一档的戏': p.play }, '') + '\n\n';
  const sp = subj[n] || {};
  s += kv({ '她做得到': sp.can || p.can }, '') + '\n\n';
  s += kv({ '她做不到（★ 不许越过去）': sp.cannot || p.cannot }, '') + '\n\n';
  s += kv({ '她对你的态度': p.attitude }, '') + '\n\n';
  s += kv({ '她给你什么': p.gives }, '') + '\n\n';
  s += kv({ '她会做什么': p.does }, '') + '\n\n';
  s += kv({ '她不会做什么（★ 边界的具体表现）': sp.wontdo || p.wontdo }, '') + '\n\n';
  s += '越界会怎样:\n' + kv(p.breach, '  ') + '\n\n';
  s += '她对你的用词:\n' + kv(p.words, '  ') + '\n\n';
  s += kv({ '她对你说的话': p.lines }, '') + '\n\n';
  s += kv({ '她对你开放到什么程度': p.openness }, '') + '\n';

  const file = path.join(OUT, `${C.filePrefix || C.name}_阶段${n}.txt`);
  fs.writeFileSync(file, s, 'utf8');
  written++;
}
console.log(`[${C.name}] 写出 ${written} 个文件`);
