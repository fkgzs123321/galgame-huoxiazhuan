#!/usr/bin/env node
/** 将 npc-catalog 同步到 EJS（角色）动态控制器中的 npcRules 块 */
import fs from 'node:fs';
import path from 'node:path';
import { NPC_CATALOG } from './npc-catalog.mjs';

const EJS_PATH = path.join(
  path.resolve(import.meta.dirname, '..'),
  '世界书/EJS/EJS（角色）动态控制器.txt',
);

const lines = Object.entries(NPC_CATALOG).map(([id, spec]) => {
  const ch = spec.chapters;
  const chPart =
    ch === null || ch === undefined
      ? 'null'
      : `[${ch.map((c) => `'${c}'`).join(',')}]`;
  const kw = `[${spec.keywords.map((k) => `'${k}'`).join(',')}]`;
  return `  { id: '${id}', ch: ${chPart}, kw: ${kw} },`;
});

const block = `const npcRules = [\n${lines.join('\n')}\n];`;

let text = fs.readFileSync(EJS_PATH, 'utf8');
const start = '// NPC_RULES_START';
const end = '// NPC_RULES_END';
const i0 = text.indexOf(start);
const i1 = text.indexOf(end);
if (i0 < 0 || i1 < 0) {
  console.error('markers not found in EJS（角色）');
  process.exit(1);
}
text = `${text.slice(0, i0 + start.length)}\n${block}\n${text.slice(i1)}`;
fs.writeFileSync(EJS_PATH, text, 'utf8');
console.log('updated npcRules in EJS（角色）');
