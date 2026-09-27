// 按 引擎模板 E4 三条门控铁律 ① ：**底座条目必含 `世界.底座` 判定**
// 实现：把 path 换成 contents[0] 的 @@if 门控 + file（conventions.md：装饰器写在 contents 片段里）
// 引擎条目（世界观/引擎/、扮演准则/、阶段指导/）不加门控 —— 它们随引擎走，换底座也要在
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const PROJ = '旮旯给木-同级生2';
const D = path.join(ROOT, 'src', PROJ);
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

const 底座类型 = new Set(['角色', 'NPC', '地理', '时间线', '事件']);
const 引擎路径 = /\/(引擎|扮演准则|阶段指导)\//;
const GATE = "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2'";

const patch = [];
let 已门控 = 0, 引擎免门控 = 0;
for (const [t, es] of Object.entries(S.entryManifest)) {
  for (const [n, e] of Object.entries(es)) {
    const p = e.path || '';
    const is底座 = 底座类型.has(t) || p.includes('底座_nanpa2');
    if (!is底座) { 引擎免门控++; continue; }
    const 已有门控 = JSON.stringify(e.contents || []).includes('世界.底座');
    if (已有门控) { 已门控++; continue; }
    const file = p || (e.contents || []).filter(c => c.file).map(c => c.file)[0];
    if (!file) continue;
    const 基 = '/entryManifest/' + t + '/' + n;
    patch.push({ op: 'add', path: 基 + '/contents', value: [{ content: GATE }, { file }] });
    if (p) patch.push({ op: 'remove', path: 基 + '/path' });
  }
}
console.log('待补门控 ' + patch.filter(x => x.path.endsWith('/contents')).length + ' 条 ／ 引擎条目免门控 ' + 引擎免门控 + ' 条 ／ 已有门控 ' + 已门控 + ' 条');
if (patch.length) {
  const f = path.join(D, '_p.json');
  fs.writeFileSync(f, JSON.stringify(patch));
  console.log(execFileSync('node', [path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs'), 'patch', PROJ, '--file', f], { encoding: 'utf8' }));
  fs.rmSync(f);
}
