#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { PERSONA_CATALOG } from './persona-catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'tavern-cards-state.json');

let uid = 1300;
function leaf(name, keywords) {
  const dir = name;
  return {
    path: `世界书/角色/${dir}/Persona.yaml`,
    part: 'personality',
    abstract: `${name}七维Persona`,
    keywords,
    enabled: false,
    position: { type: 'at_depth', role: 'system', depth: 0, order: 99 },
    uid: uid++,
  };
}

const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
state.entryManifest = state.entryManifest || {};
state.entryManifest.角色 = state.entryManifest.角色 || {};

for (const [name, spec] of Object.entries(PERSONA_CATALOG)) {
  const key = `${name}-Persona`;
  state.entryManifest.角色[key] = leaf(name, spec.keywords);
}

state.entryManifest.角色['Persona全书索引'] = {
  path: '世界书/角色/Persona全书索引.yaml',
  abstract: 'Persona灰灯索引（勿开常亮）',
  keywords: ['Persona', '画像'],
  enabled: false,
  position: { type: 'at_depth', role: 'system', depth: 0, order: 99 },
  uid: uid++,
};

fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
console.log(`registered ${Object.keys(PERSONA_CATALOG).length} Persona entries`);
