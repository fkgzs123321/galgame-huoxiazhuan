#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'tavern-cards-state.json');
const ch2Dir = path.join(ROOT, '世界书/事件/第二章');

const nodeFiles = fs
  .readdirSync(ch2Dir)
  .filter((f) => f.startsWith('第二章-') && f.endsWith('.yaml'))
  .map((f) => f.replace(/\.yaml$/, ''));

const ADDS = {
  事件: {
    '第二章非法节点熔断': { path: '世界书/事件/第二章/第二章非法节点熔断.yaml', abstract: '第二章节点超前熔断', keywords: ['第二章'] },
    '第二章抉择全书-写死表': { path: '世界书/事件/第二章/第二章抉择全书-写死表.yaml', abstract: '第二章写死表', keywords: ['第二章'] },
    '第二章写死机读表': { path: '世界书/事件/第二章/第二章写死机读表.yaml', abstract: '第二章机读表', keywords: ['第二章'] },
    '第二章当前节点选项·常亮': { path: '世界书/事件/第二章/第二章当前节点选项·常亮.yaml', abstract: '第二章常亮选项', keywords: ['第二章'] },
    '第二章选项识别与一致性铁律': { path: '世界书/事件/第二章/第二章选项识别与一致性铁律.yaml', abstract: '第二章识别铁律', keywords: ['第二章'] },
    '第二章节点推进铁律': { path: '世界书/事件/第二章/第二章节点推进铁律.yaml', abstract: '第二章推进铁律', keywords: ['第二章'] },
    '第二章BE执行范例': { path: '世界书/事件/第二章/第二章BE执行范例.yaml', abstract: '第二章BE范例', keywords: ['第二章'] },
    '第二章BE后禁止续玩': { path: '世界书/事件/第二章/第二章BE后禁止续玩.yaml', abstract: '第二章BE后禁玩', keywords: ['第二章'] },
    '第二章-狩猎者': { path: '世界书/事件/第二章.yaml', abstract: '第二章节点链', keywords: ['第二章', '狩猎者'] },
  },
  阶段指导: {
    '第二章主持': { path: '世界书/阶段指导/第二章主持.yaml', abstract: '第二章主持', keywords: ['第二章'] },
  },
};

for (const file of nodeFiles) {
  ADDS.事件[file] = {
    path: `世界书/事件/第二章/${file}.yaml`,
    abstract: file,
    keywords: ['第二章'],
  };
}

let uid = 1300;
function leaf(val) {
  return {
    ...val,
    enabled: false,
    position: val.position ?? { type: 'at_depth', role: 'system', depth: 0, order: 99 },
    uid: uid++,
  };
}

const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
state.entryManifest = state.entryManifest || {};
for (const [group, entries] of Object.entries(ADDS)) {
  state.entryManifest[group] = state.entryManifest[group] || {};
  for (const [key, val] of Object.entries(entries)) {
    state.entryManifest[group][key] = leaf(val);
  }
}
if (!state.extensions.tavern_helper.scripts['第二章写死强制']) {
  state.extensions.tavern_helper.scripts['第二章写死强制'] = {
    type: 'script',
    script_file: '脚本/第二章写死强制/index.ts',
    enabled: true,
    id: 'c0d5e4f3-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    info: '第二章二十三选写死；自动补 branches',
    button: { enabled: true, buttons: [] },
    data: {},
  };
}
fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
console.log('registered chapter2 manifest + script');
