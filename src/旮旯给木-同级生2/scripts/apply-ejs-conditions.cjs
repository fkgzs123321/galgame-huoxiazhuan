// 把 创作规划.yaml 的 ejs.entries 条件真正落到条目上（合并进已有的底座门控，一个条目一个装饰器）
//   ① 第NN天 → 天数 === N      ② region → 当前地点 includes 'X'
//   ③ initvar 补 世界.底座（门控要有依据）
// 变量路径以 状态表.yaml 的顶层键为准：时间.天数 / 场景.当前地点
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const PROJ = '旮旯给木-同级生2';
const D = path.join(ROOT, 'src', PROJ);
const YAML = require(path.join(ROOT, 'node_modules/yaml'));

const 底座 = "getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2'";
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
const 规划 = YAML.parse(fs.readFileSync(path.join(D, '创作规划.yaml'), 'utf8'));

// 规划里写的路径名与本卡实际路径的对应（规划用「世界.」，状态表现在还没有 世界 段）
const 天数条件 = n => `getvar('stat_data.时间.天数', { defaults: 0 }) === ${n}`;
const 地点条件 = r => `getvar('stat_data.场景.当前地点', { defaults: '' }).includes('${r}')`;
const 区域 = ['住宅区', '八十八学园', '商业区', '车站与娱乐', '郊外', '如月町', '温泉乡', '医院'];

const patch = [];
for (let d = 1; d <= 17; d++) {
  const dd = String(d).padStart(2, '0');
  const name = `第${dd}天`;
  const e = (S.entryManifest['时间线'] || {})[name];
  if (!e) continue;
  const file = (e.contents || []).find(c => c.file).file;
  patch.push({ op: 'add', path: `/${'entryManifest'}/时间线/${name}/contents`,
    value: [{ content: `@@if ${底座} && ${天数条件(d)}` }, { file }] });
}
for (const r of 区域) {
  const e = (S.entryManifest['地理'] || {})[r];
  if (!e) continue;
  const file = (e.contents || []).find(c => c.file).file;
  patch.push({ op: 'add', path: `/entryManifest/地理/${r}/contents`,
    value: [{ content: `@@if ${底座} && ${地点条件(r)}` }, { file }] });
}
console.log('待落 EJS 条件：' + patch.length + ' 条（17 天 + 8 region）');
const f = path.join(D, '_p.json');
fs.writeFileSync(f, JSON.stringify(patch));
console.log(execFileSync('node', [path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs'), 'patch', PROJ, '--file', f], { encoding: 'utf8' }));
fs.rmSync(f);
