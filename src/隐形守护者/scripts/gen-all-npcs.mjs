#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { NPC_CATALOG } from './npc-catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const NPC_DIR = path.join(ROOT, '世界书/NPC');

let order = 120;

function yamlEntry(name, spec) {
  const kw = spec.keywords.map((k) => `    - ${k}`).join('\n');
  const body = [
    `【${name} · NPC 运作档案】性格七维见同包「${name}-Persona」（EJS 注入）。`,
    '',
    spec.matrix ? `能力矩阵：${spec.matrix}` : '',
    spec.mvu ? `MVU：${spec.mvu}` : '',
    '',
    spec.rules.trim(),
    '',
    '**铁律**：遵守《角色能力矩阵》对比铁律与《潜伏悬疑正文铁律》；禁止 OOC 降智或全知。',
  ]
    .filter(Boolean)
    .join('\n');

  const o = order++;
  return `名称: ${name}
类型: NPC
启用: false
激活策略:
  类型: 绿灯
  优先级: 50
  关键词:
${kw}
插入位置:
  类型: 角色定义后
  顺序: ${o}

内容: |
  ${body.split('\n').join('\n  ')}
`;
}

fs.mkdirSync(NPC_DIR, { recursive: true });
let n = 0;
for (const [name, spec] of Object.entries(NPC_CATALOG)) {
  const out = path.join(NPC_DIR, `${name}.yaml`);
  fs.writeFileSync(out, yamlEntry(name, spec), 'utf8');
  n++;
  console.log('wrote', out);
}
console.log(`total ${n} NPC yaml`);
