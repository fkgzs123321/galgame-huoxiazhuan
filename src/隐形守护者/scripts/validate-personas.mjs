#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { PERSONA_CATALOG } from './persona-catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROLE = path.join(ROOT, '世界书/角色');
const EJS_ROLE = path.join(ROOT, '世界书/EJS/EJS（角色）动态控制器.txt');
const ejs = fs.readFileSync(EJS_ROLE, 'utf8');

const errors = [];
for (const name of Object.keys(PERSONA_CATALOG)) {
  const p = path.join(ROLE, name, 'Persona.yaml');
  if (!fs.existsSync(p)) errors.push(`缺少 ${p}`);
  else {
    const t = fs.readFileSync(p, 'utf8');
    if (!t.includes('**一、')) errors.push(`${name} Persona 缺七维结构`);
  }
  if (!ejs.includes(`${name}-Persona`)) errors.push(`EJS 未路由 ${name}-Persona`);
}

const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'tavern-cards-state.json'), 'utf8'));
for (const name of Object.keys(PERSONA_CATALOG)) {
  const key = `${name}-Persona`;
  if (!state.entryManifest?.角色?.[key]) errors.push(`manifest 缺 ${key}`);
}

console.log(`Persona 审计: ${Object.keys(PERSONA_CATALOG).length} 人`);
if (errors.length) {
  for (const e of errors) console.error('✗', e);
  process.exit(1);
}
console.log('全部通过');
