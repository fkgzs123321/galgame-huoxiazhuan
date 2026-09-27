// 删掉空转变量 设置.显示思维链（7 处）
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;

// ① schema.ts
{
  const F = 'schema.ts'; let t = fs.readFileSync(F, 'utf8');
  const a = '  显示思维链: bool(true),\n';
  const c = t.split(a).length - 1;
  if (c) { t = t.replace(a, ''); fs.writeFileSync(F, t, 'utf8'); n += c; console.log('✓ schema.ts 删 ' + c + ' 行'); }
  else console.log('⚠ schema.ts 未命中');
}

// ② [控制中心]
{
  const F = '世界书/[mvu_plot][控制中心]功能开关与配置.txt';
  const L = fs.readFileSync(F, 'utf8').split(/\r?\n/);
  const i = L.findIndex(l => /显示思维链/.test(l));
  if (i >= 0) { L.splice(i, 1); fs.writeFileSync(F, L.join(eolOf(fs.readFileSync(F, 'utf8'))), 'utf8'); n++; console.log('✓ 控制中心 删 L' + (i + 1)); }
  else console.log('⚠ 控制中心 未命中');
}

// ③ 5 份 initvar
for (const F of ['世界书/变量/initvar.yaml', '开场白/initvar/1.yaml', '开场白/initvar/2.yaml', '开场白/initvar/3.yaml', '开场白/initvar/4.yaml']) {
  const raw = fs.readFileSync(F, 'utf8'); const eol = eolOf(raw);
  const L = raw.split(/\r?\n/); const i = L.findIndex(l => /显示思维链/.test(l));
  if (i >= 0) { L.splice(i, 1); fs.writeFileSync(F, L.join(eol), 'utf8'); n++; console.log('✓ ' + F.split('/').pop() + ' 删 L' + (i + 1)); }
  else console.log('⚠ ' + F + ' 未命中');
}

// ④ 状态栏：默认值 / 两行按钮 / 事件
{
  const F = '正则/状态栏.html'; let t = fs.readFileSync(F, 'utf8'); const eol = eolOf(t);
  const R = [
    ['设置:{主题:"夜间",显示思维链:true}};', '设置:{主题:"夜间"}};'],
    ['  s+=\'<div class="row"><span class="k">思维链</span><span class="v" style="display:flex;gap:6px">\'+\n     \'<button class="btn-min\'+((st.显示思维链!==false)?" on":"")+\'" data-act="chain" data-val="true">显示</button>\'+\n     \'<button class="btn-min\'+((st.显示思维链===false)?" on":"")+\'" data-act="chain" data-val="false">隐藏</button></span></div>\';\n', ''],
    ['  else if(act==="chain") setVar("设置.显示思维链",el.getAttribute("data-val")==="true");\n', ''],
  ];
  let hit = 0;
  for (const [a, b] of R) {
    const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
    const c = t.split(A).length - 1;
    if (!c) { console.log('  ⚠ 状态栏未命中：' + a.slice(0, 40)); continue; }
    t = t.split(A).join(B); hit += c;
  }
  fs.writeFileSync(F, t, 'utf8'); n += hit;
  console.log('✓ 状态栏 删 ' + hit + '/3 处；残留「显示思维链」：' + (t.match(/显示思维链/g) || []).length);
}
console.log('\n共 ' + n + ' 处');
