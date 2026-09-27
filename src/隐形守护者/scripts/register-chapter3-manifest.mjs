#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'tavern-cards-state.json');
const ch3Dir = path.join(ROOT, '世界书/事件/第三章');

const nodeFiles = fs
  .readdirSync(ch3Dir)
  .filter((f) => f.startsWith('第三章-') && f.endsWith('.yaml'))
  .map((f) => f.replace(/\.yaml$/, ''));

const ADDS = {
  事件: {
    '第三章非法节点熔断': { path: '世界书/事件/第三章/第三章非法节点熔断.yaml', abstract: '第三章节点超前熔断', keywords: ['第三章'] },
    '第三章抉择全书-写死表': { path: '世界书/事件/第三章/第三章抉择全书-写死表.yaml', abstract: '第三章写死表', keywords: ['第三章'] },
    '第三章写死机读表': { path: '世界书/事件/第三章/第三章写死机读表.yaml', abstract: '第三章机读表', keywords: ['第三章'] },
    '第三章当前节点选项·常亮': { path: '世界书/事件/第三章/第三章当前节点选项·常亮.yaml', abstract: '第三章常亮选项', keywords: ['第三章'] },
    '第三章选项识别与一致性铁律': { path: '世界书/事件/第三章/第三章选项识别与一致性铁律.yaml', abstract: '第三章识别铁律', keywords: ['第三章'] },
    '第三章节点推进铁律': { path: '世界书/事件/第三章/第三章节点推进铁律.yaml', abstract: '第三章推进铁律', keywords: ['第三章'] },
    '第三章BE执行范例': { path: '世界书/事件/第三章/第三章BE执行范例.yaml', abstract: '第三章BE范例', keywords: ['第三章'] },
    '第三章BE后禁止续玩': { path: '世界书/事件/第三章/第三章BE后禁止续玩.yaml', abstract: '第三章BE后禁玩', keywords: ['第三章'] },
    '第三章-生死途': { path: '世界书/事件/第三章.yaml', abstract: '第三章节点链', keywords: ['第三章', '生死途'] },
  },
  阶段指导: {
    '第三章主持': { path: '世界书/阶段指导/第三章主持.yaml', abstract: '第三章主持', keywords: ['第三章'] },
  },
};

for (const file of nodeFiles) {
  ADDS.事件[file] = {
    path: `世界书/事件/第三章/${file}.yaml`,
    abstract: file,
    keywords: ['第三章'],
  };
}

let uid = 1400;
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
if (!state.extensions.tavern_helper.scripts['第三章写死强制']) {
  state.extensions.tavern_helper.scripts['第三章写死强制'] = {
    type: 'script',
    script_file: '脚本/第三章写死强制/index.ts',
    enabled: true,
    id: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
    info: '第三章二十七选写死；自保/共荣圈暗线；自动补 branches',
    button: { enabled: true, buttons: [] },
    data: {},
  };
}
fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
console.log('registered chapter3 manifest + script');
