// 全面体检：找「为精简而缺失 / 不详细 / 没边界 / 极度压缩」的地方
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const S = JSON.parse(fs.readFileSync(D + '/tavern-cards-state.json', 'utf8'));
const iv = YAML.parse(fs.readFileSync(D + '/世界书/变量/initvar.yaml', 'utf8'));
const 规 = YAML.parse(fs.readFileSync(D + '/创作规划.yaml', 'utf8'));

const 条目 = [];   // {组, 名, path, 内容}
for (const [组, 条] of Object.entries(S.entryManifest)) {
  for (const [名, v] of Object.entries(条)) {
    let 内容 = '';
    if (v.path && fs.existsSync(path.join(D, v.path))) 内容 = fs.readFileSync(path.join(D, v.path), 'utf8');
    else if (v.contents) for (const c of v.contents) {
      if (c.file && fs.existsSync(path.join(D, c.file))) 内容 += fs.readFileSync(path.join(D, c.file), 'utf8');
      else if (c.content) 内容 += c.content;
    }
    条目.push({ 组, 名, path: v.path || '(contents)', 内容, 长度: 内容.length, 启用: v.enabled !== false });
  }
}

const 常驻 = 条目.filter(x => {
  const v = (S.entryManifest[x.组] || {})[x.名] || {};
  return x.启用 && (v.strategy || {}).type === 'constant';
});

console.log('══════ A. 极度压缩（常驻条目过短 = 可能被压掉了内容）══════');
const 短 = 常驻.filter(x => x.长度 > 0 && x.长度 < 600).sort((a, b) => a.长度 - b.长度);
if (短.length) 短.forEach(x => console.log('  ⚠ ' + String(x.长度).padStart(5) + '  [' + x.组 + '] ' + x.名 + '  → ' + x.path));
else console.log('  无 ✅');

console.log('');
console.log('══════ B. 有指令无边界（写了「几条/多久/多少」但没给上下限）══════');
const 边界词 = /(\d+)\s*条|(\d+)\s*个|(\d+)\s*次|当\s*(\d+)|上限|下限|不超过|至少|最多/;
const 无边 = [];
for (const x of 条目) {
  if (!x.内容) continue;
  const 行 = x.内容.split('\n');
  for (let i = 0; i < 行.length; i++) {
    const l = 行[i];
    // 写了数量词，但同行/邻近没有约束字
    if (/\d+\s*(条|个|次)/.test(l) &&
      !/(至少|最多|不超过|不许少|不少于|固定|上限|下限|以内|以上|以下|范围)/.test(l) &&
      !/(至少|最多|不超过|不许少|固定|上限|下限)/.test(行[i + 1] || '') &&
      !/(至少|最多|不超过|不许少|固定|上限|下限)/.test(行[i - 1] || '')) {
      无边.push([x.名, i + 1, l.trim().slice(0, 70)]);
    }
  }
}
if (无边.length) 无边.slice(0, 14).forEach(([n, i, l]) => console.log('  ⚠ [' + n + ':' + i + '] ' + l));
else console.log('  无 ✅');

console.log('');
console.log('══════ C. 引用了不存在的东西（「见 XXX」落不到实处）══════');
const 全部文件 = [];
const 扫 = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? 扫(p) : /\.(yaml|txt|md)$/.test(f.name) && 全部文件.push(f.name.replace(/\.\w+$/, '')); } };
扫(path.join(D, '世界书'));
const 坏引用 = [];
for (const x of 条目) {
  if (!x.内容) continue;
  for (const m of x.内容.matchAll(/(?:见|指向|看)\s*([《「【]?[\u4e00-\u9fa5]{2,10}[》」】]?)/g)) {
    const 名 = m[1].replace(/[《》「」【】]/g, '');
    if (/^(上|下|前|后|本|此|该|别|其他|她|他|它|你|我|谁|什么|怎么|多少|这|那|例|方案|条件|结果|时候|情况|问题|方式|东西|地方|人)/.test(名)) continue;
    if (全部文件.some(f => f.includes(名) || 名.includes(f))) continue;
    if (Object.values(S.entryManifest).some(g => Object.keys(g).some(k => k.includes(名)))) continue;
    坏引用.push([x.名, 名]);
  }
}
const 坏集 = [...new Set(坏引用.map(x => x[1]))];
if (坏集.length) 坏集.slice(0, 16).forEach(n => console.log('  ⚠ 「见 ' + n + '」→ 找不到（出自 ' + 坏引用.filter(x => x[1] === n).map(x => x[0]).slice(0, 3).join(',') + '）'));
else console.log('  无 ✅');

console.log('');
console.log('══════ D. 变量：initvar 有的键，变量列表有没有说明 ══════');
const 变量列表 = fs.readFileSync(D + '/世界书/变量/变量列表.yaml', 'utf8');
const 扁平 = (o, p = '') => {
  const r = [];
  for (const [k, v] of Object.entries(o || {})) {
    const 路 = p ? p + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) r.push(...扁平(v, 路));
    else r.push(路);
  }
  return r;
};
const 全部键 = 扁平(iv);
const 没说明 = 全部键.filter(k => {
  const 尾 = k.split('.').pop();
  return !变量列表.includes(k) && !变量列表.includes(尾);
});
console.log('  initvar 叶子键: ' + 全部键.length + ' 个');
if (没说明.length) { console.log('  ⚠ 变量列表里没提到的: ' + 没说明.length + ' 个'); 没说明.slice(0, 20).forEach(k => console.log('      ' + k)); }
else console.log('  全部有说明 ✅');

console.log('');
console.log('══════ E. 变量更新规则：initvar 的键有没有「怎么变」的规则 ══════');
const 更新规则 = fs.readFileSync(D + '/世界书/变量/变量更新规则.yaml', 'utf8');
const 顶层键 = Object.keys(iv);
const 无规则 = [];
for (const t of 顶层键) {
  const 子 = 扁平(iv[t] || {}, t);
  for (const k of 子) {
    if (!更新规则.includes(k) && !更新规则.includes(k.split('.').pop())) 无规则.push(k);
  }
}
if (无规则.length) { console.log('  ⚠ 没有更新规则的变量: ' + 无规则.length + ' / ' + 全部键.length); 无规则.slice(0, 20).forEach(k => console.log('      ' + k)); }
else console.log('  全部有规则 ✅');
