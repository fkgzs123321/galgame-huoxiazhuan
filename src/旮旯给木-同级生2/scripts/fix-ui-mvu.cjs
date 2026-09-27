// 按 skills 修三处（用户实测：变量不显示 / 正则混乱 / 变量没折叠）
// ① MVU 变量读法（`@types/iframe/exported.mvu.d.ts`）：
//    Mvu.getMvuData({ type:'message', message_id:'latest' }) ／ await waitGlobalInitialized('Mvu')
//    ／ 事件 Mvu.events.VARIABLE_UPDATE_ENDED
//    我原来用 getVariables({type:'chat'}) —— 那是「酒馆变量」，MVU 的 stat_data 在**消息楼层**
// ② 折叠（`references/ui/regex-scripts.md` 示例）：`<details><summary>…</summary><div>$2</div></details>`
// ③ 正则重叠：「内心与旁白上色」匹配 `（…）` 会先吃掉 `（反抗值 -12）` → 数值变化匹配不到
//    → 把「数值变化上色」挪到「内心与旁白上色」**之前**，并让内心旁白排除含数值关键词的
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
const 记 = [];

// ── ① + ③ HTML ──
{
  const p = path.join(D, '正则/状态栏界面.html');
  let h = fs.readFileSync(p, 'utf8');
  if (!h.includes('getMvuData')) {
    // IIFE 改成 async（waitGlobalInitialized 需要 await）
    h = h.replace('(function () {', '(async function () {');
    // 读变量：优先 Mvu，逐级兜底
    h = h.replace(/  function allVars\(\) \{[\s\S]*?\n  \}/,
`  /* MVU 变量读法（@types/iframe/exported.mvu.d.ts）：
     Mvu.getMvuData({ type: 'message', message_id: 'latest' }) 是「最新消息楼层的 mvu 数据」；
     getVariables({type:'chat'}) 是酒馆变量，不是 MVU 的。逐级兜底。 */
  function allVars() {
    try { if (typeof Mvu !== 'undefined' && Mvu.getMvuData) { var d = Mvu.getMvuData({ type: 'message', message_id: 'latest' }); if (d) return d; } } catch (e) {}
    try { if (typeof getVariables === 'function') { var m = getVariables({ type: 'message', message_id: 'latest' }); if (m && m.stat_data) return m; } } catch (e) {}
    try { if (typeof getVariables === 'function') return getVariables({ type: 'chat' }) || {}; } catch (e) {}
    return {};
  }`);
    // 挂载前等 Mvu 初始化
    h = h.replace('  render();\n  try {',
`  try { if (typeof waitGlobalInitialized === 'function') await waitGlobalInitialized('Mvu'); } catch (e) {}
  render();
  try {`);
    // 事件：优先 Mvu 的变量事件
    h = h.replace(/    if \(ctx && ctx\.eventSource && ctx\.eventTypes\) \{[\s\S]*?\n  \} catch \(e\) \{\}/,
`    if (ctx && ctx.eventSource && ctx.eventTypes) {
      var T = ctx.eventTypes;
      [T.MESSAGE_UPDATED, T.MESSAGE_RENDERED, T.MESSAGE_SWIPED, T.CHAT_CHANGED, T.GENERATION_ENDED,
       T.VARIABLES_UPDATED, T.VARIABLE_CHANGED]
        .forEach(function (t) { if (t) ctx.eventSource.on(t, function () { 可能重绘(false); }); });
    }
  } catch (e) {}
  /* MVU 自己的变量事件（比酒馆的 VARIABLES_UPDATED 更准） */
  try {
    if (typeof Mvu !== 'undefined' && Mvu.eventOn && Mvu.events) {
      Mvu.eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, function () { 可能重绘(true); });
    }
  } catch (e) {}`);
    fs.writeFileSync(p, h);
    记.push('① 状态栏：改用 Mvu.getMvuData（消息楼层）＋ waitGlobalInitialized ＋ Mvu 变量事件');
  } else 记.push('① 状态栏已是 Mvu 读法');
}

// ── ③ 正则顺序：数值变化挪到内心旁白之前 ──
{
  const f = path.join(D, '_p.json');
  const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
  const r = S.regex_scripts;
  // 重建一个有序对象：数值变化 → 判定 → 四色（她的声音/台词/内心/系统）→ 分隔 → 变量类
  const 序 = ['隐藏状态栏占位符', '状态栏界面', '数值变化上色', '判定结果高亮',
    '她的声音上色', '游戏内台词上色', '内心与旁白上色', '系统与那个声音上色', '场景分隔线',
    '对AI隐藏变量更新', '变量更新美化', '变量更新中美化', '对AI隐藏开局选择', '开局选择界面'];
  const 新 = {};
  序.forEach(k => { if (r[k]) 新[k] = r[k]; });
  Object.keys(r).forEach(k => { if (!新[k]) 新[k] = r[k]; });
  // 内心旁白排除含数值关键词的（双保险）
  if (新['内心与旁白上色']) {
    新['内心与旁白上色'] = Object.assign({}, 新['内心与旁白上色'], {
      findRegex: '/（((?![^）]*(?:反抗值|好感度|体力|心情|说话|做事|懂东西|激动度|兴奋度|现金|熟练度|进度|裂缝))[^）]*)）/g'
    });
  }
  fs.writeFileSync(f, JSON.stringify([{ op: 'add', path: '/regex_scripts', value: 新 }]));
  try { execFileSync('node', [forge, 'patch', '旮旯给木-同级生2', '--file', f], { encoding: 'utf8' }); 记.push('③ 正则重排：数值变化 排在 内心旁白 之前，且内心旁白排除数值括注'); }
  catch (e) { 记.push('③ ⚠ ' + String(e.stdout || e.message).split('\n')[0]); }
  fs.rmSync(f);
}

// ── ② 变量更新块改成折叠（skills 示例）──
{
  const p = path.join(D, '正则/变量更新美化.html');
  const 新 = `<div style="margin:8px 0">
  <details style="border:1px dashed #2f3745;border-radius:8px;background:rgba(255,255,255,.02);padding:4px 10px">
    <summary style="cursor:pointer;font-size:11.5px;color:#525c66;letter-spacing:.3px;list-style:none">变量已更新（点开看明细）</summary>
    <div style="font-size:11.5px;color:#6b7484;line-height:1.7;white-space:pre-wrap;margin-top:6px">$2</div>
  </details>
</div>
`;
  fs.writeFileSync(p, 新);
  记.push('② 变量更新块 → <details><summary> 折叠（skills regex-scripts.md 的示例形态）');

  const p2 = path.join(D, '正则/变量更新中美化.html');
  fs.writeFileSync(p2, `<div style="margin:8px 0;padding:6px 10px;border-radius:8px;border:1px dashed #3a3020;background:rgba(232,184,75,.04);color:#b98a2a;font-size:11.5px">正在更新变量…</div>
`);
  记.push('② 未闭合态同步');
}
console.log(记.join('\n'));
