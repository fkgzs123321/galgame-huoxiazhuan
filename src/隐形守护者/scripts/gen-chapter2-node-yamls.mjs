#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { CHAPTER2_CHECKPOINT_LINES } from './chapter2-choices.mjs';

const META = {
  '第二章-0': { file: '第二章-0-章首', title: '章首·李峰开场', order: 230 },
  '第二章-1': { file: '第二章-1-李峰开场', title: '李峰误会/领事', order: 231 },
  '第二章-2': { file: '第二章-2-胡一彪', title: '胡一彪秘密', order: 232 },
  '第二章-3': { file: '第二章-3-顾君如', title: '顾君如·再也回不去', order: 233 },
  '第二章-4': { file: '第二章-4-搭话', title: '上前/留大厅', order: 234 },
  '第二章-5': { file: '第二章-5-宴会分支', title: '宴会分支（4项）', order: 235 },
  '第二章-6': { file: '第二章-6-跟上', title: '跟上吴明达', order: 236 },
  '第二章-7': { file: '第二章-7-射杀吴', title: '射杀吴明达', order: 237 },
  '第二章-8': { file: '第二章-8-射杀顾', title: '射杀顾君如', order: 238 },
  '第二章-9': { file: '第二章-9-答应', title: '答应/拒绝', order: 239 },
  '第二章-10': { file: '第二章-10-毙了我', title: '那你毙了我吧', order: 240 },
  '第二章-11': { file: '第二章-11-放过', title: '放过顾父母', order: 241 },
  '第二章-12': { file: '第二章-12-闪身', title: '闪身避开', order: 242 },
  '第二章-13': { file: '第二章-13-李峰问', title: '李峰问动机', order: 243 },
  '第二章-14': { file: '第二章-14-自保共荣', title: '自保/共荣圈', order: 244 },
  '第二章-15': { file: '第二章-15-握手', title: '兴荣帮握手', order: 245 },
  '第二章-16': { file: '第二章-16-据实', title: '据实相告', order: 246 },
  '第二章-17': { file: '第二章-17-情报', title: '情报/女人/钱', order: 247 },
  '第二章-18': { file: '第二章-18-介意', title: '介意', order: 248 },
  '第二章-19': { file: '第二章-19-武藤', title: '武藤志雄纯子', order: 249 },
  '第二章-20': { file: '第二章-20-故人泪', title: '故人泪', order: 250 },
  '第二章-21': { file: '第二章-21-有几滴', title: '有那么几滴', order: 251 },
  '第二章-22': { file: '第二章-22-倒酒', title: '为她倒酒（章末）', order: 252 },
};

const dir = path.resolve(import.meta.dirname, '../世界书/事件/第二章');

for (const [node, m] of Object.entries(META)) {
  const opts = CHAPTER2_CHECKPOINT_LINES[node] || '';
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

  选后 **同楼** 写死；分支见《第二章抉择全书-写死表》+机读表。禁止跳关。

  @@endif
`;
  fs.writeFileSync(path.join(dir, `${m.file}.yaml`), body, 'utf8');
  console.log('wrote', m.file);
}
