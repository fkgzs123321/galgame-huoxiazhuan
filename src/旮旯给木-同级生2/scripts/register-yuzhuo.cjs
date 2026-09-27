// 补注册 她_郁灼（第八套「她」漏注册）
const fs = require('fs');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const S = JSON.parse(fs.readFileSync(D + '/tavern-cards-state.json', 'utf8'));

/* 看七套的 order */
console.log('═══ 七套「她」的 order ═══');
for (const n of ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清']) {
  const e = S.entryManifest.角色['她_' + n];
  console.log('  她_' + n.padEnd(4) + ' order ' + (e && e.position ? e.position.order : '—'));
}

/* ① 先更新规划 */
const P = D + '/创作规划.yaml';
const o = YAML.parse(fs.readFileSync(P, 'utf8'));
o['变更记录'] = o['变更记录'] || [];
o['变更记录'].push({ 日期: '2026-09-16', 内容: ['补注册 她_郁灼（第八套「她」此前漏注册，导致选郁灼仍显示温砚）'] });
if (!o.entries.some(e => e && e.name === '她_郁灼')) {
  o.entries.push({ name: '她_郁灼', type: '角色', path: null, 说明: '第八套「她」（郁灼）的人设条目，EJS 门控 她.人设 === 郁灼' });
}
fs.writeFileSync(P, YAML.stringify(o, { lineWidth: 0 }));
console.log('\n✅ ① 规划已更新（补登记 她_郁灼）');

/* ② 注册（照 她_纪清 复制） */
const 模板 = S.entryManifest.角色['她_纪清'];
const GPA = "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2' && getvar('stat_data.她.人设', { defaults: '' }) === '郁灼'";
S.entryManifest.角色['她_郁灼'] = {
  scope: 'specific',
  part: 'other',
  keywords: ['郁灼'],
  abstract: '角色/personality：她_郁灼',
  contents: [
    { content: GPA },
    { file: '世界书/角色/屏幕外的她/郁灼.yaml' },
  ],
  enabled: true,
  strategy: { type: 'selective', keys: ['郁灼'] },
  position: { type: 'after_character_definition', order: (模板.position.order + 1) },
};
fs.writeFileSync(D + '/tavern-cards-state.json', JSON.stringify(S, null, 2));
console.log('✅ ② 已注册 她_郁灼（order ' + S.entryManifest.角色['她_郁灼'].position.order + '）');
console.log('   角色组「她_」条目: ' + Object.keys(S.entryManifest.角色).filter(k => /^她_/.test(k)).join(' / '));
