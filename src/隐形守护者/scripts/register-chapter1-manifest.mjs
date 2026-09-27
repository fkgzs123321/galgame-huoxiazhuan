#!/usr/bin/env node
/** 将第一章分节点、Persona、熔断 登记到 entryManifest（灰灯 enabled:false） */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'tavern-cards-state.json');

const ADDS = {
  事件: {
    '第一章-0-章首': { path: '世界书/事件/第一章/第一章-0-章首.yaml', abstract: '第一章-0', keywords: ['第一章'] },
    第一章非法节点熔断: {
      path: '世界书/事件/第一章/第一章非法节点熔断.yaml',
      abstract: '第一章节点超前于检查点熔断',
      keywords: ['第一章', '熔断'],
    },
    '第一章-2-战争看法': { path: '世界书/事件/第一章/第一章-2-战争看法.yaml', abstract: '第一章-2', keywords: ['第一章'] },
    '第一章-3-领事质问': { path: '世界书/事件/第一章/第一章-3-领事质问.yaml', abstract: '第一章-3', keywords: ['第一章'] },
    '第一章-4-潜伏名单': { path: '世界书/事件/第一章/第一章-4-潜伏名单.yaml', abstract: '第一章-4', keywords: ['第一章'] },
    '第一章-5-陪纯子': { path: '世界书/事件/第一章/第一章-5-陪纯子.yaml', abstract: '第一章-5', keywords: ['第一章', '纯子'] },
    '第一章-6-纯子问话': { path: '世界书/事件/第一章/第一章-6-纯子问话.yaml', abstract: '第一章-6', keywords: ['第一章', '纯子'] },
    '第一章-7-遇见方敏': { path: '世界书/事件/第一章/第一章-7-遇见方敏.yaml', abstract: '第一章-7', keywords: ['第一章', '方敏'] },
    '第一章-8-三百元': { path: '世界书/事件/第一章/第一章-8-三百元.yaml', abstract: '第一章-8', keywords: ['第一章'] },
    '第一章-9-来过方家': { path: '世界书/事件/第一章/第一章-9-来过方家.yaml', abstract: '第一章-9', keywords: ['第一章', '方家'] },
    '第一章-11-第一次': { path: '世界书/事件/第一章/第一章-11-第一次.yaml', abstract: '第一章-11', keywords: ['第一章'] },
    '第一章-12-学生放出来': { path: '世界书/事件/第一章/第一章-12-学生放出来.yaml', abstract: '第一章-12', keywords: ['第一章'] },
    '第一章-13-了解同学': { path: '世界书/事件/第一章/第一章-13-了解同学.yaml', abstract: '第一章-13', keywords: ['第一章'] },
    '第一章-14-邀请抗日': { path: '世界书/事件/第一章/第一章-14-邀请抗日.yaml', abstract: '第一章-14', keywords: ['第一章'] },
    '第一章-15-叛徒信': { path: '世界书/事件/第一章/第一章-15-叛徒信.yaml', abstract: '第一章-15', keywords: ['第一章'] },
  },
  角色: {
    '肖途-Persona': { path: '世界书/角色/肖途/Persona.yaml', part: 'personality', abstract: '肖途七维Persona', keywords: ['肖途'] },
    '方敏-Persona': { path: '世界书/角色/方敏/Persona.yaml', part: 'personality', abstract: '方敏七维Persona', keywords: ['方敏'] },
    '方汉洲-Persona': { path: '世界书/角色/方汉洲/Persona.yaml', part: 'personality', abstract: '方汉洲七维Persona', keywords: ['方汉洲', '老师'] },
    '武藤志雄-Persona': { path: '世界书/角色/武藤志雄/Persona.yaml', part: 'personality', abstract: '武藤志雄七维Persona', keywords: ['武藤志雄'] },
    '武藤纯子-Persona': { path: '世界书/角色/武藤纯子/Persona.yaml', part: 'personality', abstract: '武藤纯子七维Persona', keywords: ['武藤纯子', '纯子'] },
  },
};

let uid = 1200;
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
fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
console.log('registered chapter1 manifest entries');
