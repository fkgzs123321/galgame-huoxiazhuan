#!/usr/bin/env node
/**
 * 序章写死全表审计：遍历 12 个选项分支，校验写死表/BE范例/EJS/节点 YAML 一致性。
 * 用法：node scripts/validate-prologue-lock.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const WRITE_DEAD = path.join(ROOT, '世界书/事件/序章/序章抉择全书-写死表.yaml');
const BE_SAMPLE = path.join(ROOT, '世界书/事件/序章BE执行范例.yaml');
const EJS_CTRL = path.join(ROOT, '世界书/EJS/EJS（剧情）动态控制器.txt');
const MACHINE = path.join(ROOT, '世界书/事件/序章/序章写死机读表.yaml');

/** @type {Record<string, { pass: boolean, ending?: string, checkpoint?: string, mustDead: boolean, nextNode?: string|null, forbidNext?: string[], mustEvent?: string }>} */
const SPEC = {
  'P1-A': { pass: true, mustDead: false, nextNode: '序章-2', mustEvent: '序章-方汉洲演戏' },
  'P1-B': { pass: false, ending: '新的征程', mustDead: true, nextNode: null, forbidNext: ['序章-2'] },
  'P2-A': { pass: true, mustDead: false, nextNode: '序章-3' },
  'P2-B': { pass: false, ending: '赤诚之道', mustDead: true, nextNode: null },
  'P3-A': { pass: true, mustDead: false, nextNode: '序章-4', mustEvent: '序章-图书馆接头' },
  'P3-B': { pass: false, ending: '好梦还乡', mustDead: true, nextNode: null, forbidNext: ['序章-4', '序章-图书馆接头'] },
  'P3-C': { pass: false, ending: '匹夫之刃', mustDead: true, nextNode: null, forbidNext: ['序章-4'] },
  'P4-A': { pass: true, mustDead: false, nextNode: '序章-5' },
  'P4-B': { pass: false, ending: '随波逐流', mustDead: true, nextNode: null, forbidNext: ['序章-5'] },
  'P5-A': { pass: true, mustDead: false, nextNode: null, optionalJson: true },
  'P5-B': { pass: true, mustDead: false, nextNode: null, optionalJson: true },
  'P5-C': { pass: true, mustDead: false, nextNode: '第一章-0' },
};

function extractJsonBlocks(text, sectionId) {
  const marker = `### ${sectionId} ·`;
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const next = text.indexOf('\n  ### ', start + marker.length);
  const slice = next < 0 ? text.slice(start) : text.slice(start, next);
  const jm = slice.match(/```json\s*([\s\S]*?)```/);
  if (!jm) return null;
  try {
    return JSON.parse(jm[1].trim());
  } catch {
    return null;
  }
}

function patchOps(patch) {
  return Array.isArray(patch) ? patch : [];
}

function analyzePatch(id, patch, spec) {
  const errs = [];
  const ops = patchOps(patch);
  if (!ops.length) errs.push('缺少 JSONPatch 块');

  const deadOp = ops.find((o) => o.path === '/剧情/已死亡');
  const nodeOp = ops.find((o) => o.path === '/剧情/当前节点');
  const endingOp = ops.find((o) => o.path === '/剧情/结局分支');
  const inserts = ops.filter((o) => o.op === 'insert');

  if (spec.mustDead) {
    if (!deadOp || deadOp.value !== true) errs.push('BE 须 replace 已死亡=true');
    if (!endingOp || endingOp.value !== spec.ending) errs.push(`BE 须 结局分支=${spec.ending}`);
    if (nodeOp && spec.forbidNext?.includes(nodeOp.value)) errs.push(`BE 禁止 replace 当前节点→${nodeOp.value}`);
    for (const ins of inserts) {
      const v = String(ins.value ?? '');
      if (spec.forbidNext?.some((f) => v.includes(f.replace('序章-', '')))) errs.push(`BE 禁止 insert ${v}`);
    }
  } else {
    if (deadOp?.value === true) errs.push('通过项不应 已死亡=true');
    if (spec.nextNode && (!nodeOp || nodeOp.value !== spec.nextNode)) {
      errs.push(`通过项须 replace 当前节点→${spec.nextNode}`);
    }
    if (!spec.nextNode && nodeOp && ['序章-4', '序章-5', '第一章-0'].includes(nodeOp.value) && id.startsWith('P5-') && id !== 'P5-C') {
      errs.push(`${id} 不应 replace 当前节点→${nodeOp.value}`);
    }
    if (spec.mustEvent) {
      const has = inserts.some((o) => String(o.value).includes(spec.mustEvent));
      if (!has && (id === 'P1-A' || id === 'P3-A')) errs.push(`须 insert 已触发事件 ${spec.mustEvent}`);
    }
  }
  return errs;
}

async function main() {
  const writeDead = fs.readFileSync(WRITE_DEAD, 'utf8');
  const beSample = fs.readFileSync(BE_SAMPLE, 'utf8');
  const ejs = fs.readFileSync(EJS_CTRL, 'utf8');
  const machine = fs.readFileSync(MACHINE, 'utf8');

  const errors = [];
  const ok = [];

  for (const [id, spec] of Object.entries(SPEC)) {
    const patch = extractJsonBlocks(writeDead, id);
    const errs = [];
    if (!patch && !spec.optionalJson) errs.push('写死表未找到 JSON 块');
    else if (patch) errs.push(...analyzePatch(id, patch, spec));

    if (!spec.pass) {
      const bePatch = extractJsonBlocks(beSample, id.replace('P', 'P').replace(/^(P\d-[A-C])/, '$1'));
      // BE范例 uses **P3-B →** not ###
      const beRe = new RegExp(
        `\\*\\*${id.replace(/-/g, '-')} →[\\s\\S]*?` + '```json\\s*([\\s\\S]*?)```',
        'i',
      );
      const bm = beSample.match(beRe);
      if (!bm) errs.push('序章BE执行范例缺少对应 JSON');
      else {
        try {
          const beOps = JSON.parse(bm[1].trim());
          errs.push(...analyzePatch(id, beOps, spec).filter((e) => !e.includes('缺少 JSONPatch')));
        } catch {
          errs.push('BE范例 JSON 解析失败');
        }
      }
    }

    if (!machine.includes(id)) errors.push(`[机读表] 缺少 ${id}`);
    else ok.push(id);

    if (errs.length) errors.push(`[${id}] ${errs.join('; ')}`);
  }

  if (!ejs.includes('hasLibMeet')) errors.push('[EJS] 缺少 hasLibMeet 图书馆接头门控');
  if (!ejs.includes('deadNow')) errors.push('[EJS] 缺少 deadNow 已死亡门控');
  if (ejs.includes('检查点重来协议')) errors.push('[EJS] 不应再 getwi 已删除的检查点重来协议');
  if (!ejs.includes('序章写死机读表')) errors.push('[EJS] 未 getwi 序章写死机读表');
  if (!ejs.includes('序章选项识别与一致性铁律')) errors.push('[EJS] 未 getwi 序章选项识别铁律');

  const choiceLock = fs.readFileSync(
    path.join(ROOT, '世界书/事件/序章/序章选项识别与一致性铁律.yaml'),
    'utf8',
  );
  if (!choiceLock.includes('绝非我所为') || !choiceLock.includes('P1-B')) {
    errors.push('[选项识别] 缺少 P1-B 辩解关键词');
  }
  if (!choiceLock.includes('P1-B（辩解）独有') || !choiceLock.includes('P3-B')) {
    errors.push('[选项识别] 缺少全序章叙事边界');
  }
  if (!ejs.includes('序章非法节点熔断')) errors.push('[EJS] 未 getwi 序章非法节点熔断');

  const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'tavern-cards-state.json'), 'utf8'));
  const scripts = state.extensions?.tavern_helper?.scripts ?? {};
  if (!scripts['序章写死强制']?.enabled) {
    errors.push('[脚本] 序章写死强制 未在 tavern-cards-state 启用');
  }
  const forceTs = fs.readFileSync(path.join(ROOT, '脚本/序章写死强制/index.ts'), 'utf8');
  if (!forceTs.includes('PROLOGUE_PREWRITE_INJECT') || !forceTs.includes('MESSAGE_SENT')) {
    errors.push('[脚本] 序章写死强制 缺少生成前 injectPrompts');
  }
  if (!forceTs.includes('ensureMessageBranchesBlock')) {
    errors.push('[脚本] 缺少 ensureMessageBranchesBlock 自动补 branches');
  }
  if (!forceTs.includes('dedupeUpdateVariableBlocks')) {
    errors.push('[脚本] 缺少 dedupeUpdateVariableBlocks 去重变量块');
  }

  const { PROLOGUE_APPLY, detectPrologueChoice } = await import('./prologue-choices.mjs');
  if (!PROLOGUE_APPLY['P5-A']) errors.push('[choices] 缺少 P5-A apply');
  if (detectPrologueChoice('序章-1', '老师那绝非我所为听我辩白') !== 'P1-B') {
    errors.push('[choices] P1-B 辩解检测失败');
  }
  if (detectPrologueChoice('序章-3', '回到旅馆好好休息') !== 'P3-B') {
    errors.push('[choices] P3-B 旅馆检测失败');
  }
  if (ejs.includes("n === '序章-4'") && !ejs.includes('hasLibMeet')) {
    errors.push('[EJS] 序章-4 未与 hasLibMeet 绑定');
  }

  const nodeFiles = [
    '序章-1-方汉洲当面对质',
    '序章-2-方敏追问',
    '序章-3-去向选择',
    '序章-4-图书馆等待',
    '序章-5-秘密基地',
  ];
  for (const name of nodeFiles) {
    const p = path.join(ROOT, `世界书/事件/序章/${name}.yaml`);
    const t = fs.readFileSync(p, 'utf8');
    if (!t.includes('已死亡')) errors.push(`[${name}] 缺少 已死亡 条件`);
    if (!t.includes('同楼') && !t.includes('写死表')) errors.push(`[${name}] 缺少选后同楼/写死表指向`);
  }

  console.log('=== 序章写死审计 ===');
  console.log(`选项数: ${Object.keys(SPEC).length}`);
  if (errors.length) {
    console.error(`失败 ${errors.length} 项:`);
    for (const e of errors) console.error('  ✗', e);
    process.exit(1);
  }
  console.log(`通过: 全部 ${ok.length} 个选项分支 + EJS + 节点 YAML`);
  console.log('\n【模拟走查】');
  const sim = [
    ['P1-A', '序章-1', '→序章-2', '活'],
    ['P1-B', '序章-1', 'BE·新的征程', '死'],
    ['P2-A', '序章-2', '→序章-3', '活'],
    ['P2-B', '序章-2', 'BE·赤诚之道', '死'],
    ['P3-A', '序章-3', '→序章-4+接头', '活'],
    ['P3-B', '序章-3', 'BE·好梦还乡（禁止睡醒去图书馆）', '死'],
    ['P3-C', '序章-3', 'BE·匹夫之刃', '死'],
    ['P4-A', '序章-4', '→序章-5', '活'],
    ['P4-B', '序章-4', 'BE·随波逐流', '死'],
    ['P5-A×4', '序章-5', 'append简报', '活'],
    ['P5-B', '序章-5', '回退P5-A', '活'],
    ['P5-C', '序章-5', '→第一章-0', '通关'],
  ];
  for (const row of sim) console.log(`  ${row.join(' | ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
