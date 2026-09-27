// 补齐条目配置：configure 要求「有条件阈值」的条目必须显式声明 scope；
// 凡 strategy 会推导为 selective 的条目必须有 keywords。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const PROJ = '旮旯给木-同级生2';
const D = path.join(ROOT, 'src', PROJ);
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

const patch = [];
const 终局词 = ['终局', '结局', '告白'];

for (const [t, es] of Object.entries(S.entryManifest)) {
  for (const [n, e] of Object.entries(es)) {
    const 基 = '/entryManifest/' + t + '/' + n;
    if (e.scope === undefined) patch.push({ op: 'add', path: 基 + '/scope', value: 'specific' });
    const 无词 = !e.keywords || e.keywords.length === 0;
    if (无词) {
      let kw = null;
      if (n.includes('终局')) kw = 终局词;
      else if (t === 'NPC') kw = [n];
      if (kw) patch.push({ op: 'add', path: 基 + '/keywords', value: kw });
    }
  }
}
console.log('补 scope ' + patch.filter(p => p.path.endsWith('/scope')).length + ' 条 ／ 补 keywords ' + patch.filter(p => p.path.includes('keywords')).length + ' 条');
if (patch.length) {
  const f = path.join(D, '_p.json');
  fs.writeFileSync(f, JSON.stringify(patch));
  console.log(execFileSync('node', [path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs'), 'patch', PROJ, '--file', f], { encoding: 'utf8' }));
  fs.rmSync(f);
}
