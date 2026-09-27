#!/usr/bin/env node
/** 由 chapter1 写死脚本模板 + chapter2-choices.mjs 生成 第二章写死强制/index.ts */
import fs from 'node:fs';
import path from 'node:path';
import {
  CHAPTER2_NODES,
  CHAPTER2_CHOICE_HOME,
  CHAPTER2_CHOICES,
  CHAPTER2_APPLY,
  CHAPTER2_CHECKPOINT_LINES,
} from './chapter2-choices.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, '脚本/第一章写死强制/index.ts');
const OUT = path.join(ROOT, '脚本/第二章写死强制/index.ts');

function serRegex(r) {
  return `/${r.source}/${r.flags}`;
}

function serRule(rule) {
  const parts = [`id: '${rule.id}'`, `match: [${rule.match.map(serRegex).join(', ')}]`];
  if (rule.forbidIfMatch?.length) {
    parts.push(`forbidIfMatch: [${rule.forbidIfMatch.map(serRegex).join(', ')}]`);
  }
  return `{ ${parts.join(', ')} }`;
}

function serChoicesBlock() {
  const lines = ['const CHAPTER2_CHOICES: Record<string, { pass?: unknown; be?: unknown }> = {'];
  for (const node of CHAPTER2_NODES) {
    const r = CHAPTER2_CHOICES[node];
    if (!r) continue;
    lines.push(`  '${node}': {`);
    const passes = [r.pass].flat().filter(Boolean);
    if (passes.length === 1) lines.push(`    pass: ${serRule(passes[0])},`);
    else if (passes.length > 1) lines.push(`    pass: [${passes.map(serRule).join(', ')}],`);
    const bes = [r.be].flat().filter(Boolean);
    if (bes.length) lines.push(`    be: [${bes.map(serRule).join(', ')}],`);
    lines.push('  },');
  }
  lines.push('};');
  return lines.join('\n');
}

function serApplyBlock() {
  const lines = ['const CHAPTER2_APPLY: Record<string, ApplySpec> = {'];
  for (const [id, spec] of Object.entries(CHAPTER2_APPLY)) {
    const o = [];
    o.push(`be: ${spec.be}`);
    if (spec.ending) o.push(`ending: '${spec.ending}'`);
    o.push(`checkpoint: '${spec.checkpoint}'`);
    o.push(`node: '${spec.node}'`);
    if (spec.chapter) o.push(`chapter: '${spec.chapter}'`);
    if (spec.events) o.push(`events: [${spec.events.map((e) => `'${e}'`).join(', ')}]`);
    if (spec.clues) o.push(`clues: [${spec.clues.map((e) => `'${e}'`).join(', ')}]`);
    if (spec.unlock) o.push(`unlock: '${spec.unlock}'`);
    if (spec.fork2) o.push(`fork2: '${spec.fork2}'`);
    if (spec.requireZhuangEmotionMin != null) o.push(`requireZhuangEmotionMin: ${spec.requireZhuangEmotionMin}`);
    if (spec.deltas) {
      const d = Object.entries(spec.deltas)
        .map(([k, v]) => `'${k}': ${v}`)
        .join(', ');
      o.push(`deltas: { ${d} }`);
    }
    lines.push(`  '${id}': { ${o.join(', ')} },`);
  }
  lines.push('};');
  return lines.join('\n');
}

function serHomeBlock() {
  return `const CHOICE_HOME_NODE: Record<string, string> = ${JSON.stringify(CHAPTER2_CHOICE_HOME, null, 2)};`;
}

function serNodesBlock() {
  return `const CHAPTER2_NODES = ${JSON.stringify(CHAPTER2_NODES, null, 2)} as const;`;
}

function serCheckpointBlock() {
  return `const CHECKPOINT_CHOICE_LINES: Record<string, string> = ${JSON.stringify(CHAPTER2_CHECKPOINT_LINES, null, 2)};`;
}

let body = fs.readFileSync(SRC, 'utf8');

body = body.replace(
  /const CHAPTER1_NODES[\s\S]*?^} as const;/m,
  serNodesBlock(),
);
body = body.replace(
  /const CHOICE_HOME_NODE[\s\S]*?^};/m,
  serHomeBlock(),
);
body = body.replace(
  /const CHAPTER1_CHOICES[\s\S]*?^};/m,
  serChoicesBlock(),
);
body = body.replace(/type ApplySpec = \{[\s\S]*?\};/m, (m) =>
  m.replace(
    '};',
    `  fork2?: string;
  requireZhuangEmotionMin?: number;
};`,
  ),
);
body = body.replace(
  /const CHAPTER1_APPLY[\s\S]*?^};/m,
  serApplyBlock(),
);
body = body.replace(
  /const CHECKPOINT_CHOICE_LINES[\s\S]*?^};/m,
  serCheckpointBlock(),
);

const subs = [
  ['第一章·太阳之影 十五选', '第二章·狩猎者 二十三选'],
  ['CHAPTER1_', 'CHAPTER2_'],
  ['chapter1', 'chapter2'],
  ['Chapter1', 'Chapter2'],
  ['C1-', 'C2-'],
  ['第一章', '第二章'],
  ['十五选', '二十三选'],
  ['序章已完成', '第一章已完成'],
  ['第一章-完成', '第一章-完成'],
];
for (const [a, b] of subs) body = body.split(a).join(b);

body = body.replace(
  /function isChapter2Active\(plot[\s\S]*?return plot\.当前章节 === '第二章';/m,
  `function isChapter2Active(plot: Record<string, unknown> | undefined): boolean {
  if (!plot || plot.已死亡 === true) return false;
  const events = plot.已触发事件;
  const done =
    Array.isArray(events) &&
    (events as string[]).some((e) => e === '第一章-完成' || e === '第一章-太阳之影通关');
  if (!done && plot.当前章节 !== '第二章') return false;
  return plot.当前章节 === '第二章' || (plot.当前章节 === '第二章' && plot.当前节点 === '第二章-0');
}`,
);

// Fix botched isChapter2Active - simpler version
body = body.replace(
  /function isChapter2Active\(plot: Record<string, unknown> \| undefined\): boolean \{[\s\S]*?\n\}/m,
  `function isChapter2Active(plot: Record<string, unknown> | undefined): boolean {
  if (!plot || plot.已死亡 === true) return false;
  if (plot.当前章节 !== '第二章') return false;
  const events = plot.已触发事件;
  if (!Array.isArray(events)) return false;
  return (events as string[]).includes('第一章-完成');
}`,
);

body = body.replace(
  /function chapter2PlotBaseline\(\)[\s\S]*?^\}/m,
  `function chapter2PlotBaseline(): Record<string, unknown> {
  return {
    当前章节: '第二章',
    章节进度: 0,
    当前节点: '第二章-0',
    序章已完成: true,
    主线归属: '',
    第二章分歧: '',
    第五章分歧: '',
    结局分支: '',
    已死亡: false,
    检查点: '第二章-0',
    已触发事件: ['第一章-完成'],
    已收集线索: [],
  };
}`,
);

body = body.replace(
  /if \(choiceId === 'C2-15-A'\) \{[\s\S]*?return base;\s*\}/m,
  `if (choiceId === 'C2-22-A') {
    const z = Number(_.get(base, '对user.庄晓曼.情感值')) || 0;
    const min = spec.requireZhuangEmotionMin ?? 0;
    if (z < min) {
      plot.已死亡 = true;
      plot.结局分支 = '甜蜜子弹';
      plot.当前节点 = '第二章-22';
      plot.检查点 = '第二章-22';
      plot.已解锁死亡结局 = uniqPush(plot.已解锁死亡结局 as string[], 'BE-第二章-甜蜜子弹');
      applyDeltas(base, spec.deltas);
      return base;
    }
    plot.当前章节 = '第三章';
    plot.当前节点 = '第三章-0';
    plot.检查点 = '第三章-0';
    plot.章节进度 = 0;
    plot.已死亡 = false;
    plot.结局分支 = '';
    plot.已触发事件 = uniqPush(plot.已触发事件 as string[], '第二章-完成');
    applyDeltas(base, spec.deltas);
    return base;
  }`,
);

body = body.replace(
  /if \(spec\.be\) \{[\s\S]*?plot\.检查点 = spec\.checkpoint;\s*\} else \{[\s\S]*?plot\.检查点 = spec\.checkpoint;\s*\}/m,
  (block) => {
    const extra = `
  if (spec.fork2 && !spec.be) {
    plot.第二章分歧 = spec.fork2;
  }
`;
    return block.replace('applyDeltas(base, spec.deltas);', `${extra}  applyDeltas(base, spec.deltas);`);
  },
);

body = body.replace(
  /if \(choiceId === 'C2-1-A' && plot\.当前节点 !== '第二章-2'\)/,
  "if (choiceId === 'C2-1-A' && plot.当前节点 !== '第二章-2' && plot.当前节点 !== '第二章-3')",
);
body = body.replace(
  /if \(choiceId === 'C2-15-A'\) \{[\s\S]*?plot\.当前节点 !== '第二章-0';\s*\}/m,
  `if (choiceId === 'C2-22-A') {
    return plot.当前章节 !== '第三章' || plot.当前节点 !== '第三章-0';
  }`,
);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body, 'utf8');
console.log('wrote', OUT);
