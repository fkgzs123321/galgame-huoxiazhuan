#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { PERSONA_CATALOG } from './persona-catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROLE_DIR = path.join(ROOT, '世界书/角色');

function yamlEntry(name, keywords, body) {
  const kw = keywords.map((k) => `    - ${k}`).join('\n');
  return `名称: ${name}-Persona
类型: 角色
启用: false
激活策略:
  类型: 蓝灯
  优先级: 52
  关键词:
${kw}
插入位置:
  类型: 角色定义后
  顺序: 51

内容: |
  ${body.split('\n').join('\n  ')}
`;
}

let n = 0;
for (const [dirName, spec] of Object.entries(PERSONA_CATALOG)) {
  const dir = path.join(ROLE_DIR, dirName);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, 'Persona.yaml');
  fs.writeFileSync(out, yamlEntry(dirName, spec.keywords, spec.body.trim()), 'utf8');
  n++;
  console.log('wrote', out);
}
console.log(`total ${n} Persona.yaml`);
