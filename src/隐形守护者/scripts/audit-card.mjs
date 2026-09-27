#!/usr/bin/env node
/**
 * 隐形守护者 · 一致性审计（manifest 路径、写死表、Persona/NPC）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { NPC_CATALOG } from './npc-catalog.mjs';
import { PERSONA_CATALOG } from './persona-catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'tavern-cards-state.json');

function walkManifest(manifest, fn, prefix = '') {
  for (const [key, val] of Object.entries(manifest ?? {})) {
    if (!val || typeof val !== 'object') continue;
    if (val.path) fn(prefix ? `${prefix}/${key}` : key, val);
    else walkManifest(val, fn, prefix ? `${prefix}/${key}` : key);
  }
}

let issues = [];

const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
walkManifest(state.entryManifest, (_key, leaf) => {
  const full = path.join(ROOT, leaf.path);
  if (!fs.existsSync(full)) issues.push(`manifest 缺文件: ${leaf.path}`);
});

for (const name of Object.keys(PERSONA_CATALOG)) {
  const p = path.join(ROOT, `世界书/角色/${name}/Persona.yaml`);
  if (!fs.existsSync(p)) issues.push(`缺 Persona: ${name}`);
}
for (const name of Object.keys(NPC_CATALOG)) {
  const p = path.join(ROOT, `世界书/NPC/${name}.yaml`);
  if (!fs.existsSync(p)) issues.push(`缺 NPC: ${name}`);
}

const plannedRoleBasic = ['庄晓曼', '武藤纯子', '陆望舒'];
for (const name of plannedRoleBasic) {
  const p = path.join(ROOT, `世界书/角色/${name}/基础信息.yaml`);
  if (!fs.existsSync(p)) issues.push(`创作规划有基础信息但未落地: ${name}/基础信息.yaml`);
}

const validators = [
  'validate-prologue-lock.mjs',
  'validate-chapter1-lock.mjs',
  'validate-chapter2-lock.mjs',
  'validate-chapter3-lock.mjs',
  'audit-chapter3-full.mjs',
  'validate-personas.mjs',
  'validate-npcs.mjs',
];
for (const v of validators) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', v)], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    issues.push(`${v} 失败:\n${r.stderr || r.stdout}`);
  }
}

if (issues.length) {
  console.error('audit-card: 发现问题\n' + issues.map((x) => `- ${x}`).join('\n'));
  process.exit(1);
}
console.log('audit-card: 全部通过');
