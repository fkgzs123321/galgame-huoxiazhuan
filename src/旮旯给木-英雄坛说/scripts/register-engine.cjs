// ════════════════════════════════════════════════════════════
// register-engine.cjs · 注册引擎层条目
//
// ★ 引擎层条目**不加底座门控** —— 它们随引擎走，换底座也要在。
//   所以用 path 而不是 contents（门控只加给底座条目）
//
// ★ 同时抽公共底线：
//   两套文风里各自带了一份完全相同的「底线」，重复常驻等于白烧 token。
//   抽成一条独立的 叙述底线.yaml，两套文风只留自己那一半。
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const WB = path.join(D, '世界书');
const BK = path.join(WB, '扮演准则');
const 切点 = '【底线 · 不管用哪套文风都成立】';

// ── ① 抽公共底线 ──
const 文风 = ['文风_骚妈.yaml', '文风_母猪中.yaml'];
let 底线块 = null;
for (const f of 文风) {
  const p = path.join(BK, f);
  const t = fs.readFileSync(p, 'utf8');
  const i = t.indexOf(切点);
  if (i < 0) { console.log('⚠️ ' + f + ' 没有底线段，跳过抽取'); continue; }
  底线块 = t.slice(i);
  fs.writeFileSync(p, t.slice(0, i).replace(/\s+$/, '') + '\n');
}
if (底线块) {
  fs.writeFileSync(path.join(BK, '叙述底线.yaml'),
    '# 两套文风共用的底线。原文在各自文件里各有一份，抽出来只留一处\n' + 底线块);
  console.log('✅ 已抽公共底线 → 扮演准则/叙述底线.yaml（' + 底线块.length + ' 字符，两套文风各减这么多）');
}

// ── ② 引擎层条目清单 ──
const 世界观_引擎 = ['四态循环', '反抗与判定', '兴奋度机制', '出招', '交互循环', '剧情推进', '边界情况', '离线行动'];
const 扮演准则 = ['加载纪律', '判定引擎', '思维链', '叙述准则', '感知禁令', '玩家的输入', '叙述底线', '文风_骚妈', '文风_母猪中'];
const 阶段指导 = ['阶段指导', '熟练度阶段'];
const 屏幕外的她 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '郁灼'];

const patch = [];
for (const t of ['世界观', '扮演准则', '阶段指导', '角色']) {
  patch.push({ op: 'add', path: `/entryManifest/${t}`, value: {} });
}

世界观_引擎.forEach((名, i) => patch.push({
  op: 'add', path: `/entryManifest/世界观/${名}`,
  value: {
    path: `世界书/世界观/引擎/${名}.yaml`,
    scope: 'specific',
    keywords: [],
    abstract: '世界观：' + 名,
    enabled: true,
    strategy: { type: 'constant' },
    position: { type: 'before_character_definition', order: 10 + i },
  },
}));

扮演准则.forEach((名, i) => patch.push({
  op: 'add', path: `/entryManifest/扮演准则/${名}`,
  value: {
    path: `世界书/扮演准则/${名}.yaml`,
    scope: 'specific',
    keywords: [],
    abstract: '扮演准则：' + 名,
    enabled: true,
    strategy: { type: 'constant' },
    position: { type: 'before_character_definition', order: 30 + i },
  },
}));

阶段指导.forEach((名, i) => patch.push({
  op: 'add', path: `/entryManifest/阶段指导/${名}`,
  value: {
    path: `世界书/阶段指导/${名}.yaml`,
    scope: 'specific',
    keywords: [],
    abstract: '阶段指导：' + 名,
    enabled: true,
    strategy: { type: 'constant' },
    position: { type: 'at_depth', role: 'system', depth: 0, order: 60 + i },
  },
}));

// 屏幕外的她：角色类型 + part other（与同级生2 同构）
屏幕外的她.forEach((名, i) => patch.push({
  op: 'add', path: `/entryManifest/角色/她_${名}`,
  value: {
    path: `世界书/角色/屏幕外的她/${名}.yaml`,
    part: 'other',
    scope: 'specific',
    keywords: ['她', 名],
    abstract: `角色/other：她_${名}`,
    enabled: true,
    strategy: { type: 'selective', keys: ['她', 名] },
    position: { type: 'after_character_definition', order: 90 + i },
  },
}));

fs.writeFileSync(path.join(D, 'scripts', 'patch-engine.json'), JSON.stringify(patch, null, 1));
console.log(`引擎层 patch：世界观 ${世界观_引擎.length} / 扮演准则 ${扮演准则.length} / 阶段指导 ${阶段指导.length} / 她 ${屏幕外的她.length} = ${patch.length - 4} 条`);

const FORGE = path.join(ROOT, '_tc_repo', 'tavern-cards', 'scripts', 'tavern-cards-forge.mjs');
console.log(execFileSync('node', [FORGE, 'patch', '旮旯给木-英雄坛说', '--file', path.join(D, 'scripts', 'patch-engine.json')], { encoding: 'utf8' }).trim());
