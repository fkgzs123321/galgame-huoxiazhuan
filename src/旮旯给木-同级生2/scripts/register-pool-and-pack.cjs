// 注册公共选项池条目 + 打包 + 复验（避开 shell 转义）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const PROJ = '旮旯给木-同级生2';
const D = path.join(ROOT, 'src', PROJ);
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

if (!(S.entryManifest['世界观'] || {})['公共选项池']) {
  const patch = [{
    op: 'add', path: '/entryManifest/世界观/公共选项池',
    value: {
      abstract: '底座_nanpa2：不涉及具体人的通用选项，求交集后不够三四个时用',
      keywords: [], scope: 'specific',
      contents: [
        { content: "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2'" },
        { file: '世界书/世界观/底座_nanpa2/公共选项池.yaml' },
      ],
      position: { type: 'before_character_definition', order: 263 },
    },
  }];
  const f = path.join(D, '_p.json');
  fs.writeFileSync(f, JSON.stringify(patch));
  try { console.log(execFileSync('node', [forge, 'patch', PROJ, '--file', f], { encoding: 'utf8' }).split('\n')[0]); }
  catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 2).join(' ')); }
  fs.rmSync(f);
}
console.log(execFileSync('node', [forge, 'pack', PROJ], { encoding: 'utf8' }).trim().split('\n').pop());
console.log(execFileSync('node', [path.join(D, 'scripts/verify-prompt-budget.mjs'), D], { encoding: 'utf8' })
  .split('\n').filter(l => /^违规|常驻合计|T0 宪法|T1 状态|T3 底座|MVU/.test(l)).join('\n'));
console.log('卡：' + fs.statSync(path.join(D, PROJ + '.json')).size + ' 字节');
