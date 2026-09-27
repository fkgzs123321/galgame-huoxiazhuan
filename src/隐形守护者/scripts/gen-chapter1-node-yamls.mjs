#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { CHAPTER1_CHECKPOINT_LINES } from './chapter1-choices.mjs';

const META = {
  '第一章-0': { file: '第一章-0-章首', title: '章首', order: 212 },
  '第一章-1': { file: '第一章-1-发布会举手', title: '发布会举手', order: 213 },
  '第一章-2': { file: '第一章-2-战争看法', title: '战争看法', order: 214 },
  '第一章-3': { file: '第一章-3-领事质问', title: '领事质问', order: 215 },
  '第一章-4': { file: '第一章-4-潜伏名单', title: '潜伏名单（3项）', order: 216 },
  '第一章-5': { file: '第一章-5-陪纯子', title: '陪武藤纯子', order: 217 },
  '第一章-6': { file: '第一章-6-纯子问话', title: '纯子问话', order: 218 },
  '第一章-7': { file: '第一章-7-遇见方敏', title: '遇见方敏', order: 219 },
  '第一章-8': { file: '第一章-8-三百元', title: '三百元', order: 220 },
  '第一章-9': { file: '第一章-9-来过方家', title: '来过方家', order: 221 },
  '第一章-10': { file: '第一章-10-方老师枪指', title: '方老师枪指', order: 222 },
  '第一章-11': { file: '第一章-11-第一次', title: '第一次杀人', order: 223 },
  '第一章-12': { file: '第一章-12-学生放出来', title: '学生放出来', order: 224 },
  '第一章-13': { file: '第一章-13-了解同学', title: '了解同学', order: 225 },
  '第一章-14': { file: '第一章-14-邀请抗日', title: '邀请抗日', order: 226 },
  '第一章-15': { file: '第一章-15-叛徒信', title: '叛徒信（3项）', order: 227 },
};

const dir = path.resolve(import.meta.dirname, '../世界书/事件/第一章');

for (const [node, m] of Object.entries(META)) {
  const opts = CHAPTER1_CHECKPOINT_LINES[node] || '';
  const optBlock = opts
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n');
  const body = `名称: ${m.file}
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 64
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: ${m.order}

内容: |
  @@if getvar('stat_data.剧情.当前节点', { scope: 'local', defaults: '' }) === '${node}' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【${node} · ${m.title}】

  **【请选择】**
${optBlock}

  选后 **同楼** 写死；分支见《第一章抉择全书-写死表》+机读表。禁止跳关。

  @@endif
`;
  fs.writeFileSync(path.join(dir, `${m.file}.yaml`), body, 'utf8');
  console.log('wrote', m.file);
}
