#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  CHAPTER3_NODES,
  CHAPTER3_CHOICE_HOME,
  CHAPTER3_CHOICES,
  CHAPTER3_APPLY,
  CHAPTER3_CHECKPOINT_LINES,
} from './chapter3-choices.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, '脚本/第二章写死强制/index.ts');
const OUT = path.join(ROOT, '脚本/第三章写死强制/index.ts');

const ZIBAO_CLUE = '第二章-自保的感慨';
const GATE_ZM = 7;

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
  const lines = ['const CHAPTER3_CHOICES: Record<string, { pass?: unknown; be?: unknown }> = {'];
  for (const node of CHAPTER3_NODES) {
    const r = CHAPTER3_CHOICES[node];
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
  const lines = ['const CHAPTER3_APPLY: Record<string, ApplySpec> = {'];
  for (const [id, spec] of Object.entries(CHAPTER3_APPLY)) {
    const o = [];
    o.push(`be: ${spec.be}`);
    if (spec.ending) o.push(`ending: '${spec.ending}'`);
    o.push(`checkpoint: '${spec.checkpoint}'`);
    o.push(`node: '${spec.node}'`);
    if (spec.chapter) o.push(`chapter: '${spec.chapter}'`);
    if (spec.events) o.push(`events: [${spec.events.map((e) => `'${e}'`).join(', ')}]`);
    if (spec.unlock) o.push(`unlock: '${spec.unlock}'`);
    if (spec.requireZibaoForHuang) o.push(`requireZibaoForHuang: true`);
    if (spec.requireMainClear) o.push(`requireMainClear: true`);
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

let body = fs.readFileSync(SRC, 'utf8');

body = body.replace(/const CHAPTER2_NODES[\s\S]*?^} as const;/m, `const CHAPTER3_NODES = ${JSON.stringify(CHAPTER3_NODES, null, 2)} as const;`);
body = body.replace(/const CHOICE_HOME_NODE[\s\S]*?^};/m, `const CHOICE_HOME_NODE: Record<string, string> = ${JSON.stringify(CHAPTER3_CHOICE_HOME, null, 2)};`);
body = body.replace(/const CHAPTER2_CHOICES[\s\S]*?^};/m, serChoicesBlock());
body = body.replace(
  /type ApplySpec = \{[\s\S]*?\};/m,
  `type ApplySpec = {
  be: boolean;
  ending?: string;
  checkpoint: string;
  node: string;
  chapter?: string;
  events?: string[];
  clues?: string[];
  unlock?: string;
  deltas?: Record<string, number>;
  requireZibaoForHuang?: boolean;
  requireMainClear?: boolean;
};`,
);
body = body.replace(/const CHAPTER2_APPLY[\s\S]*?^};/m, serApplyBlock());
body = body.replace(
  /const CHECKPOINT_CHOICE_LINES[\s\S]*?^};/m,
  `const CHECKPOINT_CHOICE_LINES: Record<string, string> = ${JSON.stringify(CHAPTER3_CHECKPOINT_LINES, null, 2)};`,
);

const subs = [
  ['第二章·狩猎者 二十三选', '第三章·生死途 二十七选'],
  ['CHAPTER2_', 'CHAPTER3_'],
  ['chapter2', 'chapter3'],
  ['Chapter2', 'Chapter3'],
  ['C2-', 'C3-'],
  ['二十三选', '二十七选'],
  ['CHAPTER2_ZIBAO_CLUE', 'CHAPTER3_ZIBAO_CLUE'],
  ['enforceChapter2Write', 'enforceChapter3Write'],
  ['runChapter2PrewriteBeforeGenerate', 'runChapter3PrewriteBeforeGenerate'],
  ['detectChapter2ChoiceGlobal', 'detectChapter3ChoiceGlobal'],
  ['detectChapter2Choice', 'detectChapter3Choice'],
  ['chapter2PlotBaseline', 'chapter3PlotBaseline'],
  ['chapter2NodeIndex', 'chapter3NodeIndex'],
  ['clampChapter2PlotAdvance', 'clampChapter3PlotAdvance'],
  ['syncChapter2ForkArtifacts', 'syncChapter3RouteArtifacts'],
  ['isChapter2Active', 'isChapter3Active'],
  ['第二章写死', '第三章写死'],
  ['第二章选项写死', '第三章选项写死'],
  ['[隐形守护者·第二章写死]', '[隐形守护者·第三章写死]'],
  ['第二章写死强制', '第三章写死强制'],
];
for (const [a, b] of subs) body = body.split(a).join(b);

body = body.replace(
  /function isChapter3Active\(plot: Record<string, unknown> \| undefined\): boolean \{[\s\S]*?\n\}/m,
  `function isChapter3Active(plot: Record<string, unknown> | undefined): boolean {
  if (!plot || plot.已死亡 === true) return false;
  if (plot.当前章节 !== '第三章') return false;
  const events = plot.已触发事件;
  if (!Array.isArray(events)) return false;
  return (events as string[]).includes('第二章-完成');
}`,
);

body = body.replace(
  /function chapter3PlotBaseline\(\)[\s\S]*?^\}/m,
  `function chapter3PlotBaseline(): Record<string, unknown> {
  return {
    当前章节: '第三章',
    章节进度: 0,
    当前节点: '第三章-0',
    序章已完成: true,
    主线归属: '',
    第二章分歧: '自保',
    第五章分歧: '',
    结局分支: '',
    已死亡: false,
    检查点: '第三章-0',
    已触发事件: ['第二章-完成'],
    已收集线索: ['${ZIBAO_CLUE}'],
  };
}`,
);

body = body.replace(
  /function syncChapter3RouteArtifacts\([\s\S]*?^\}/m,
  `function syncChapter3RouteArtifacts(plot: Record<string, unknown>) {
  const clues = plot.已收集线索;
  if (!Array.isArray(clues)) plot.已收集线索 = [];
}`,
);

body = body.replace(
  /if \(spec\.fork2 && !spec\.be\) \{[\s\S]*?plot\.第二章分歧 = spec\.fork2;\s*\}/m,
  '',
);

body = body.replace(
  /if \(choiceId === 'C3-22-A'\) \{[\s\S]*?return base;\s*\}/m,
  `if (choiceId === 'C3-16-A') {
    const zm = Number(_.get(base, '对user.庄晓曼.情感值')) || 0;
    const fork = String(plot.第二章分歧 ?? '');
    const clues = plot.已收集线索 as string[] | undefined;
    const hasZibaoClue = Array.isArray(clues) && clues.includes('${ZIBAO_CLUE}');
    const mainOk = fork === '自保' && hasZibaoClue && zm >= ${GATE_ZM};
    if (!mainOk) {
      plot.已死亡 = true;
      plot.结局分支 = hasZibaoClue && fork === '自保' && zm < ${GATE_ZM} ? '信口雌黄' : '生死归途';
      plot.当前节点 = '第三章-16';
      plot.检查点 = '第三章-16';
      const unlockId = plot.结局分支 === '信口雌黄' ? 'BE-第三章-信口雌黄' : 'BE-第三章-生死归途';
      plot.已解锁死亡结局 = uniqPush(plot.已解锁死亡结局 as string[], unlockId);
      applyDeltas(base, spec.deltas);
      return base;
    }
    plot.当前章节 = '第四章';
    plot.当前节点 = '第四章-0';
    plot.检查点 = '第四章-0';
    plot.章节进度 = 0;
    plot.已死亡 = false;
    plot.结局分支 = '';
    plot.已触发事件 = uniqPush(plot.已触发事件 as string[], '第三章-完成');
    applyDeltas(base, spec.deltas);
    return base;
  }`,
);

body = body.replace(
  /if \(spec\.be\) \{[\s\S]*?plot\.检查点 = spec\.checkpoint;\s*\} else \{[\s\S]*?plot\.检查点 = spec\.checkpoint;\s*\}/m,
  (block) => {
    const inject = `
  if (spec.requireZibaoForHuang && !spec.be) {
    const fork = String(plot.第二章分歧 ?? '');
    const clues = plot.已收集线索 as string[] | undefined;
    const hasZibaoClue = Array.isArray(clues) && clues.includes('${ZIBAO_CLUE}');
    if (fork !== '自保' || !hasZibaoClue) {
      plot.已死亡 = true;
      plot.结局分支 = '生死归途';
      plot.当前节点 = spec.node;
      plot.检查点 = spec.checkpoint;
      plot.已解锁死亡结局 = uniqPush(plot.已解锁死亡结局 as string[], 'BE-第三章-生死归途');
      applyDeltas(base, spec.deltas);
      return base;
    }
  }
`;
    return block.replace('applyDeltas(base, spec.deltas);', `${inject}  applyDeltas(base, spec.deltas);`);
  },
);

body = body.replace(
  /if \(choiceId === 'C3-22-A'\) \{[\s\S]*?plot\.当前节点 !== '第三章-0';\s*\}/m,
  `if (choiceId === 'C3-16-A') {
    return plot.当前章节 !== '第四章' || plot.当前节点 !== '第四章-0';
  }`,
);

body = body.replace(
  /if \(choiceId === 'C3-1-A' && plot\.当前节点 !== '第二章-2' && plot\.当前节点 !== '第二章-3'\)/,
  "if (choiceId === 'C3-1-A' && plot.当前节点 !== '第三章-2')",
);

body = body.replace(/syncChapter3ForkArtifacts/g, 'syncChapter3RouteArtifacts');
body = body.replace(
  /const oldFork = beforePlot\.第二章分歧;[\s\S]*?fixes\.push\('第三章：已回滚擅自修改的第二章分歧'\);/m,
  `const oldFork = beforePlot.第二章分歧;
    if (oldFork && p.第二章分歧 !== oldFork) {
      p.第二章分歧 = oldFork;
      syncChapter3RouteArtifacts(p);
      fixes.push('第三章：已回滚擅自修改的第二章分歧');
    }`,
);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body, 'utf8');
console.log('wrote', OUT);
