#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { NPC_CATALOG } from './npc-catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'tavern-cards-state.json');

let uid = 1400;

const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
state.entryManifest = state.entryManifest || {};
state.entryManifest.NPC = state.entryManifest.NPC || {};

for (const [name, spec] of Object.entries(NPC_CATALOG)) {
  state.entryManifest.NPC[name] = {
    path: `世界书/NPC/${name}.yaml`,
    abstract: spec.abstract,
    keywords: spec.keywords,
    enabled: false,
    strategy: { type: 'selective', keys: spec.keywords },
    position: { type: 'after_character_definition', order: 120 },
    uid: uid++,
  };
}

state.entryManifest.NPC['NPC全书索引'] = {
  path: '世界书/NPC/NPC全书索引.yaml',
  abstract: 'NPC绿灯索引（勿开常亮）',
  keywords: ['NPC', '运作档案'],
  enabled: false,
  position: { type: 'after_character_definition', order: 199 },
  uid: uid++,
};

fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
console.log(`registered ${Object.keys(NPC_CATALOG).length} NPC entries`);
