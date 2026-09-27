#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { NPC_CATALOG } from './npc-catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'tavern-cards-state.json');
const NPC_DIR = path.join(ROOT, '世界书/NPC');

let err = 0;
for (const name of Object.keys(NPC_CATALOG)) {
  const p = path.join(NPC_DIR, `${name}.yaml`);
  if (!fs.existsSync(p)) {
    console.error('missing yaml', p);
    err++;
    continue;
  }
  const text = fs.readFileSync(p, 'utf8');
  for (const kw of NPC_CATALOG[name].keywords) {
    if (!text.includes(kw)) {
      console.error(`${name}: keyword missing in yaml: ${kw}`);
      err++;
    }
  }
  if (!/类型:\s*NPC/.test(text)) {
    console.error(`${name}: 类型不是 NPC`);
    err++;
  }
}

const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
const manifest = state.entryManifest?.NPC ?? {};
for (const name of Object.keys(NPC_CATALOG)) {
  if (!manifest[name]) {
    console.error('manifest missing NPC', name);
    err++;
  }
}

if (err) {
  console.error(`validate-npcs: ${err} errors`);
  process.exit(1);
}
console.log(`validate-npcs: ${Object.keys(NPC_CATALOG).length} OK`);
