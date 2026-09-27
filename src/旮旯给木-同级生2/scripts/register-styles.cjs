// 注册三个文风条目到 entryManifest（引擎层，order 50-52）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
S.entryManifest = S.entryManifest || {};
S.entryManifest.世界观 = S.entryManifest.世界观 || {};

// 看现有条目的形状
const 例 = Object.entries(S.entryManifest.世界观)[0];
console.log('现有条目形状：');
console.log('  ' + 例[0] + ' → ' + JSON.stringify(例[1]));

const 模板 = (file, order, keys) => ({
  ...例[1],
  order,
  file: '世界书/文风/' + file,
  keys: keys || [],
  constant: true,
});

for (const [名, order, file] of [['文风_默认', 50, '默认.yaml'], ['文风_无尽骚妈', 51, '无尽骚妈.yaml'], ['文风_母猪', 52, '母猪.yaml']]) {
  S.entryManifest.世界观[名] = 模板(file, order);
  console.log('  注册 ' + 名 + '（order ' + order + '）');
}

fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 4).join(' ')); }
