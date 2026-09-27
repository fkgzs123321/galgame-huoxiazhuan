// skills 合规审计 · 第二轮 —— 补齐第一轮没覆盖的 skill 文档
// 依据（逐条引自原文，不看其他卡）：
//   references/rules.md:13                禁止占位符「某城市/某学校/某组织」
//   references/contents-creation/character/basic-info.md:9   性格不写进基础信息
//   references/contents-creation/character/basic-info.md:13/28/36  只写偏离默认认知的特征 / 特征不是美 / 关系写具体画面
//   references/contents-creation/character/npc.md:5/7/28/32/34/50   NPC 不写性格调色盘·三面性 / 独立文件 / 1-2 特征 / 语料纯对话
//   references/contents-creation/character/tri-faceted.md:9/30/32/34/49  不是所有角色都要三面性 / 语料移到面里 / 只写怎么运作 / 两组过渡
//   references/contents-creation/worldbuilding/timeline.md:13  剧情条目是给 AI 的参照，不是读者摘要
//   references/contents-creation/stage-guidance.md:53         阶段名称必须与 MVU 变量取值一致
//   references/contents-creation/first-message.md:63          说明式不能是唯一开场白，且只能在第一位
//   references/mvu/initvar.md:21/48                            initvar 与 schema 一致 / overrides 仅 mvu=true
//   references/ejs/guide.md:178                                @@ 装饰器必须首行
//   references/composition.md:99/107                          每条写完立即注册 / 步骤 3、8 不可跳过
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');
const 结果 = {};
const 加 = (类, 项, 说明) => (结果[类] = 结果[类] || []).push(项 + ' ｜ ' + 说明);

const 读 = p => fs.readFileSync(p, 'utf8');
const S = JSON.parse(读(path.join(D, 'tavern-cards-state.json')));

// ── ① rules.md:13 禁止占位符 ──
const 占位 = /(某城市|某学校|某组织|某公司|某地点|某某|某个人|A 市|X 城|placeholder)/;
const 全文件 = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(yaml|txt)$/.test(f)) 全文件.push(p); } })(WB);
for (const p of 全文件) {
  const rel = path.relative(D, p).replace(/\\/g, '/');
  const t = 读(p);
  t.split(/\r?\n/).forEach((l, i) => { if (占位.test(l)) 加('① 占位符（rules.md:13）', rel + ':' + (i + 1), l.trim().slice(0, 60)); });
}

// ── ② basic-info.md:9 性格不写进基础信息 ──
for (const p of 全文件) {
  const rel = path.relative(D, p).replace(/\\/g, '/');
  if (!/_基础信息\.yaml$|基础信息\.yaml$/.test(rel)) continue;
  const t = 读(p);
  if (/性格调色盘|底色:|主色调:|性格:/.test(t)) 加('② 基础信息含性格（basic-info.md:9）', rel, '出现了性格字段');
}

// ── ③ npc.md:5 NPC 不写性格调色盘/三面性 ──
for (const [n, e] of Object.entries(S.entryManifest.NPC || {})) {
  const f = e.path || ((e.contents || []).find(c => c.file) || {}).file;
  if (!f) continue;
  const t = 读(path.join(D, f));
  if (/性格调色盘|三面性|底色:/.test(t)) 加('③ NPC 写了人设组件（npc.md:5）', n, '含 性格调色盘/三面性');
  if (t.length > 1600) 加('③ NPC 过长（npc.md:28 只写 1-2 特征）', n, t.length + ' 字符');
}

// ── ④ tri-faceted.md:9 不是所有角色都需要三面性 ──
{
  const 有三面 = Object.keys(S.entryManifest.角色 || {}).filter(k => /_三面性$/.test(k));
  加('④ 三面性覆盖（tri-faceted.md:9 需逐人判断）', 有三面.length + ' 位都写了三面性', '规范：找不出两个「压力性质截然不同」的场景就不该写。需人工逐个复核，不能全给');
}

// ── ⑤ tri-faceted.md:32 / npc.md:50 语料纯净度：只保留纯对话 ──
for (const p of 全文件) {
  const rel = path.relative(D, p).replace(/\\/g, '/');
  const t = 读(p);
  const idx = t.indexOf('语料');
  if (idx < 0) continue;
  const 段 = t.slice(idx, idx + 900);
  const 脏 = 段.match(/^.*（[^）]*(他|她|主角|笑|皱眉|点头|摇头|转身|低头)[^）]*）.*$/gm);
  if (脏) 加('⑤ 语料不纯净（tri-faceted.md:32/npc.md:50）', rel, 脏.length + ' 行动作/表情/心理混入（如：' + 脏[0].trim().slice(0, 40) + '）');
}

// ── ⑥ timeline.md:13 剧情条目是给 AI 的参照，不是读者摘要 ──
{
  const e = (S.entryManifest.时间线 || {});
  for (const [n, v] of Object.entries(e)) {
    const f = v.path || ((v.contents || []).find(c => c.file) || {}).file;
    if (!f || !/plot/.test(f)) continue;
    const t = 读(path.join(D, f));
    if (/^\s*（本日无逐日节点）/.test(t)) continue;
    if (!/锚点|触发|条件|地点|时间/.test(t)) 加('⑥ 剧情条目缺 AI 参照要素（timeline.md:13）', n, '没写触发条件/地点/时间');
  }
}

// ── ⑦ stage-guidance.md:53 阶段名称必须与 MVU 变量取值一致 ──
{
  const g = (S.entryManifest.阶段指导 || {})['阶段指导'];
  const t = 读(path.join(D, '世界书/阶段指导/阶段指导.yaml'));
  const 档 = ['新手', '上手', '沉浸', '狂热', '收官'];
  const 缺 = 档.filter(x => !t.includes(x));
  if (缺.length) 加('⑦ 阶段名与变量不一致（stage-guidance.md:53）', '阶段指导', '缺：' + 缺.join('/'));
  加('⑦ 阶段指导条件渲染（stage-guidance.md:62）', '阶段指导', /<%|@@/.test(t) ? '有 EJS ✓' : '★ 无 EJS —— 规范要求「必须使用条件渲染」');
}

// ── ⑧ first-message.md:63 说明式只能在第一位且不能是唯一 ──
{
  const fm = S.first_messages || [];
  const 说明在首位 = /开场白\/0\./.test(fm[0] || '');
  const 有入口 = fm.slice(1).some(x => /\.txt$/.test(x));
  加('⑧ 开场白结构（first-message.md:63）', '共 ' + fm.length + ' 段', (说明在首位 ? '说明式在第一位 ✓' : '★ 说明式不在第一位') + ' ／ ' + (有入口 ? '有游玩入口 ✓' : '★ 缺游玩入口'));
}

// ── ⑨ ejs/guide.md:178 @@ 装饰器必须在文件首行 ──
for (const p of 全文件) {
  const rel = path.relative(D, p).replace(/\\/g, '/');
  const L = 读(p).split(/\r?\n/);
  if (L[0] && L[0].trim().startsWith('@@') === false && L.some((l, i) => i > 0 && l.trim().startsWith('@@  ')))
    加('⑨ 装饰器不在首行（ejs/guide.md:178）', rel, '文件中段出现 @@');
}
// contents[0] 是否以 @@ 开头（正确做法）
{
  let 错 = 0;
  for (const [cat, es] of Object.entries(S.entryManifest))
    for (const [n, e] of Object.entries(es)) {
      const c = (e.contents || [])[0];
      if (c && c.content && c.content.includes('@@') && !c.content.trim().startsWith('@@')) { 加('⑨ 装饰器不在首片段（ejs/guide.md:178）', cat + '/' + n, c.content.slice(0, 50)); 错++; }
    }
  if (!错) 加('⑨ 装饰器位置', '全部 ' + Object.values(S.entryManifest).reduce((a, e) => a + Object.keys(e).length, 0) + ' 条', 'contents[0] 均以 @@ 开头 ✓');
}

// ── ⑩ 立即注册（composition.md:99） ──
{
  const a = Object.values(S.entryManifest).reduce((s, e) => s + Object.keys(e).length, 0);
  加('⑩ 注册状态（composition.md:99）', 'entryManifest ' + a + ' 条', '内容文件 ' + 全文件.length + ' 个 → ' + (a >= 全文件.length ? '一致 ✓' : '★ 有文件未注册'));
}

console.log('═══ skills 合规审计 · 第二轮 ═══');
for (const [类, v] of Object.entries(结果)) {
  console.log('\n【' + 类 + '】');
  v.slice(0, 10).forEach(x => console.log('   ' + x));
  if (v.length > 10) console.log('   …另 ' + (v.length - 10) + ' 条');
}
