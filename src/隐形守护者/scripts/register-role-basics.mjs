#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'tavern-cards-state.json');

const BASICS = [
  { key: '庄晓曼-基础信息', dir: '庄晓曼', kw: ['庄晓曼', '晓曼'] },
  { key: '武藤纯子-基础信息', dir: '武藤纯子', kw: ['武藤纯子', '纯子'] },
  { key: '陆望舒-基础信息', dir: '陆望舒', kw: ['陆望舒', '望舒'] },
];

let uid = 1500;
const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
state.entryManifest.角色 = state.entryManifest.角色 || {};

for (const b of BASICS) {
  state.entryManifest.角色[b.key] = {
    path: `世界书/角色/${b.dir}/基础信息.yaml`,
    part: 'basic',
    abstract: `${b.dir}摘要卡`,
    keywords: b.kw,
    enabled: false,
    position: { type: 'after_character_definition', order: 53 },
    uid: uid++,
  };
}

if (!state.entryManifest.角色['庄晓曼-调色盘']) {
  state.entryManifest.角色['庄晓曼-调色盘'] = {
    path: '世界书/角色/庄晓曼/调色盘.yaml',
    part: 'personality',
    abstract: '庄晓曼分场景调色',
    keywords: ['庄晓曼', '晓曼'],
    enabled: false,
    position: { type: 'after_character_definition', order: 54 },
    uid: uid++,
  };
}

fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
console.log('registered role basics + 庄晓曼-调色盘');
