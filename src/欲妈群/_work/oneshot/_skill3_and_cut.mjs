// ① 技能 5→3（观察/行动/意志）＋ ③ 砍 D20历史、假阳具.备注
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;
const 换 = (f, pairs, tag) => {
  let t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t); let hit = 0;
  for (const [a, b] of pairs) {
    const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
    const c = t.split(A).length - 1;
    if (!c) { console.log('  ⚠ 未命中 ' + tag + '：' + a.slice(0, 34)); continue; }
    t = t.split(A).join(B); hit += c;
  }
  if (hit) { fs.writeFileSync(f, t, 'utf8'); n += hit; }
  console.log((hit ? '✓' : '·') + ' ' + tag.padEnd(16) + hit);
};
const 删行 = (f, 匹配, tag, 范围) => {
  const raw = fs.readFileSync(f, 'utf8'); const eol = eolOf(raw);
  const L = raw.split(/\r?\n/);
  let lo = 0, hi = L.length;
  if (范围) { const s = L.findIndex(l => l.includes(范围[0])); if (s >= 0) { lo = s; const e = L.findIndex((l, i) => i > s && l.includes(范围[1])); if (e >= 0) hi = e; } }
  let c = 0;
  for (let i = hi - 1; i >= lo; i--) if (匹配(L[i])) { L.splice(i, 1); c++; }
  if (c) { fs.writeFileSync(f, L.join(eol), 'utf8'); n += c; }
  console.log((c ? '✓' : '·') + ' ' + tag.padEnd(16) + c + ' 行');
};

// ═══ ① 技能 5→3 ═══
换('schema.ts', [[
  `const PlayerSkillsSchema = z.object({
  洞察: pct.prefault(10),
  冥想: pct.prefault(5),
  伪装: pct.prefault(8),
  意志: pct.prefault(15),
  调查: pct.prefault(5),
}).prefault({});`,
  `const PlayerSkillsSchema = z.object({
  观察: pct.prefault(10), // 察觉异常 / 找线索（原 洞察＋调查）
  行动: pct.prefault(8),  // 隐藏反应 / 当场做什么（原 伪装）
  意志: pct.prefault(15), // 抵抗诱惑 / 拦住她（原 意志＋冥想）
}).prefault({});`,
]], 'schema 技能');

for (const f of ['世界书/变量/initvar.yaml', '开场白/initvar/1.yaml', '开场白/initvar/2.yaml', '开场白/initvar/3.yaml', '开场白/initvar/4.yaml']) {
  换(f, [[
    `  技能:
    洞察: 10
    冥想: 5
    伪装: 8
    意志: 15
    调查: 5`,
    `  技能:
    观察: 10
    行动: 8
    意志: 15`,
  ]], f.split('/').pop() + ' 技能');
}

换('世界书/变量/变量更新规则.yaml', [[
  '      洞察|冥想|伪装|意志|调查: { range: 0~100, check: 对应行为+1~+3 }',
  '      观察|行动|意志: { range: 0~100, check: 对应行为+1~+3 }',
]], '更新规则 技能');

换('世界书/[mvu_plot]D20对抗判定系统.txt', [[
  `| 冥想（抵抗幻触） | will | 10 | dildo_resonance | 抵抗假阳具共感 |
| 洞察（察觉异常） | insight | 12 | 0 | 察觉角色异常行为 |
| 伪装（隐藏反应） | disguise | 10 | insight | 隐藏自身反应 |
| 意志（抵抗诱惑） | will | 12 | arousal | 抵抗角色诱惑 |
| 调查（寻找线索） | investigation | 15 | 0 | 寻找线索/证据 |
| 拒绝（拦住她） | will | 12 | will | 用意志对抗她正要做的这件事 |`,
  `| 观察（察觉异常／找线索） | insight | 12 | 0 | 察觉到她在做什么、找到线索与证据 |
| 行动（隐藏反应／当场做什么） | disguise | 10 | insight | 藏住自己的反应、当场动手 |
| 意志（抵抗诱惑／拦住她） | will | 12 | arousal | 顶住诱惑、拒绝她正要做的这件事 |`,
], ['用在哪里（要骰）：玩家行为判定（冥想/洞察/伪装/意志/调查）', '用在哪里（要骰）：玩家行为判定（观察／行动／意志）']], 'D20 技能表');

换('世界书/玩家档案.txt', [[
  `| 洞察 | 10 | 粗心大意，难察觉异常 |
| 冥想 | 5 | 不会用；用来压住幻触与冲动 |
| 伪装 | 8 | 不善隐藏情绪，容易被看穿 |
| 意志 | 15 | 抵抗诱惑的能力一般（修正=(理智-欲望)/10） |
| 调查 | 5 | 缺乏调查意识 |`,
  `| 观察 | 10 | 粗心大意，难察觉异常，也缺乏调查意识 |
| 行动 | 8 | 不善隐藏情绪，容易被看穿 |
| 意志 | 15 | 抵抗诱惑的能力一般（修正=(理智-欲望)/10） |`,
]], '玩家档案 技能表');

换('世界书/[mvu_plot]玩家指令约束.txt', [[
  '- 自救行为（始终保有）：冥想/调查/求助/报警/搬走 → 欲望回落理智回升',
  '- 自救行为（始终保有）：观察／求助／报警／搬走 → 欲望回落理智回升',
], ['- 必须 D20 判定（调查技能）：成功发现线索；失败未发现/被撞见', '- 必须 D20 判定（观察技能）：成功发现线索；失败未发现/被撞见']], '玩家指令约束');

换('正则/状态栏.html', [
  ['   技能:{洞察:10,冥想:5,伪装:8,意志:15,调查:5},', '   技能:{观察:10,行动:8,意志:15},'],
  ['var SKILLS={洞察:{dc:12},冥想:{dc:10},伪装:{dc:10},意志:{dc:12},调查:{dc:15}};', 'var SKILLS={观察:{dc:12},行动:{dc:10},意志:{dc:12}};'],
  ['    var order=["洞察","冥想","伪装","意志","调查","拒绝","后门反抗"];', '    var order=["观察","行动","意志","拒绝","后门反抗"];'],
  ['    var 技=isBack?num((p.技能||{}).调查,0):num((p.技能||{})[skill],0);', '    var 技=isBack?num((p.技能||{}).观察,0):num((p.技能||{})[skill],0);'],
], '状态栏 技能');

// ═══ ③ 砍 D20历史 / 备注 ═══
删行('schema.ts', l => /^\s{2}D20历史: str\(''\),/.test(l), 'schema D20历史');
删行('schema.ts', l => /^\s{2}备注: str\(''\),/.test(l), 'schema 备注伪阳具', ['const DildoSchema', 'const GroupMemberDetailSchema']);
for (const f of ['世界书/变量/initvar.yaml', '开场白/initvar/1.yaml', '开场白/initvar/2.yaml', '开场白/initvar/3.yaml', '开场白/initvar/4.yaml']) {
  删行(f, l => /^\s{4}D20历史: ""/.test(l), f.split('/').pop() + ' D20历史');
  删行(f, l => /^\s{6}备注: ""/.test(l), f.split('/').pop() + ' 备注', ['假阳具:', '}']);
}
删行('正则/状态栏.html', l => /^\s{6}if\(hist\.length\)\{/.test(l) || /判定历史（/.test(l) || /hist\.slice\(-10\)/.test(l) || /s\+="<\/details><\/div>";/.test(l) || /还没有判定记录/.test(l) || /^\s{4}\}else\{$/.test(l), '状态栏 历史渲染段', ['function renderDice', 'return s+"</div></div>";']);
换('正则/状态栏.html', [
  ['证据清单:"",D20历史:"",_本轮判定:{}', '证据清单:"",_本轮判定:{}'],
  ['借用期限:0,备注:""}', '借用期限:0}'],
  ['  if(t.备注) s+=\'<div class="row"><span class="k">备注</span><span class="v" style="font-weight:400">\'+esc(t.备注)+"</span></div>";\n', ''],
  ['  var p=g("玩家",{}), last=p._本轮判定||{}, hist=String(p.D20历史||"").split("；").filter(Boolean);', '  var p=g("玩家",{}), last=p._本轮判定||{};'],
  ['      var _h=String(box.玩家.D20历史||"").split("；").filter(Boolean);\n      _h.push(rec);\n      box.玩家.D20历史=_h.slice(-10).join("；");\n', ''],
], '状态栏 砍D20历史/备注');

换('世界书/[mvu_plot]D20对抗判定系统.txt', [[
  '- 判定结果与警觉度增量由状态栏面板写入 `玩家._本轮判定` 与 `玩家.D20历史`（各保留最近 10 条），AI 只读不写，也不要手写判定结果',
  '- 判定结果与警觉度增量由状态栏面板写入 `玩家._本轮判定`，AI 只读不写，也不要手写判定结果',
]], 'D20 条目');
删行('世界书/变量/变量更新规则.yaml', l => /D20历史: \{ type: string/.test(l), '更新规则 D20历史');
换('世界书/变量/变量输出格式.txt', [[
  '- ★ 下列三个由状态栏面板自动记账，你不要写：群.30天已用主题、群.周竞赛历史、玩家.D20历史',
  '- ★ 下列两个由状态栏面板自动记账，你不要写：群.30天已用主题、群.周竞赛历史',
]], '变量输出格式');

console.log('\n共 ' + n + ' 处');
