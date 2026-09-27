// 按说话人分色：一条正则定位 + 一个脚本上色
// 设计（依据 skills references/ui/regex-scripts.md「前端界面的正则只负责定位、不解析数据」）：
//   ① 正则 A：`名字：「台词」` → `<span class="ggspk" data-n="名字">…</span>`（**只定位，不决定颜色**）
//   ② 正则 B：行首无名字的 `「台词」` → 默认色兜底
//   ③ 脚本：读 data-n → 按名字 hash 到 8 色调色板 → 上色（同一名字跨楼层颜色一致）
// ★ 顺序：A 必须在 B 之前（A 处理过的行首是 `<`，B 用行首锚定就不会重复包）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

// ── ① 两条正则的替换文件 ──
const 名在前 = `<span class="ggspk" data-n="$1" style="color:#9fdcb4">$1：「$2」</span>
`;
fs.writeFileSync(path.join(D, '正则/上色_带名字的台词.html'), 名在前);
const 无名 = `<span class="ggspk" style="color:#9fdcb4">「$1」</span>
`;
fs.writeFileSync(path.join(D, '正则/上色_游戏内台词.html'), 无名);
console.log('① 两个替换文件已就位');

// ── ② 脚本：读 data-n 按名字上色 ──
const 脚本 = `// 说话人分色 —— 读 .ggspk[data-n]，按名字 hash 到 8 色调色板
// 依据：正则只定位（给出 data-n），颜色由这里决定，同一名字跨楼层一致
(function () {
  var 板 = ['#8fd0a8', '#9db4e8', '#d8a0e0', '#e9c46a', '#e8a0a0', '#7ec8c8', '#c0a8e8', '#d0b088'];
  function 色(n) {
    if (!n) return '';
    var s = 0;
    for (var i = 0; i < n.length; i++) s += n.charCodeAt(i);
    return 板[s % 板.length];
  }
  function 刷() {
    $('.ggspk[data-n]').each(function () {
      var n = $(this).attr('data-n');
      if (!n) return;
      var c = 色(n);
      if (c) $(this).css('color', c);
    });
  }
  $(document).ready(刷);
  if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
    eventOn(tavern_events.MESSAGE_RENDERED, 刷);
    eventOn(tavern_events.MESSAGE_UPDATED, 刷);
    eventOn(tavern_events.CHAT_CHANGED, 刷);
  }
  // 兜底：楼层 DOM 变化时也刷
  try {
    new MutationObserver(刷).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
})();
`;
fs.writeFileSync(path.join(D, '脚本/说话人分色.txt'), 脚本);
console.log('② 脚本/说话人分色.txt 已写');

// ── ③ patch state：加脚本 + 换「游戏内台词上色」为两条 ──
{
  const Sf = path.join(D, 'tavern-cards-state.json');
  const S = JSON.parse(fs.readFileSync(Sf, 'utf8'));
  const patch = [];

  // 脚本：照 MVU 那条的形状加
  if (!(S.extensions.tavern_helper.scripts || {})['说话人分色']) {
    const mv = S.extensions.tavern_helper.scripts.MVU;
    patch.push({
      op: 'add', path: '/extensions/tavern_helper/scripts/说话人分色',
      value: { type: 'script', script_file: '脚本/说话人分色.txt', enabled: true, id: '9a1b2c3d-4e5f-4a6b-8c7d-1e2f3a4b5c6d', info: '', button: { enabled: false, buttons: [] }, data: {} },
    });
  }

  // 正则：删掉旧的「游戏内台词上色」，加两条
  const rx = S.regex_scripts;
  delete rx['游戏内台词上色'];
  rx['带名字的台词上色'] = {
    id: '00000000-0000-4000-8000-000000000061',
    findRegex: '/([\\u4e00-\\u9fa5]{1,6})[：:]\\s*「([^」]*)」/g',
    replace_file: '正则/上色_带名字的台词.html',
    trimStrings: [], placement: [1, 2], disabled: false,
    markdownOnly: true, promptOnly: false, runOnEdit: false, substituteRegex: 0,
  };
  rx['游戏内台词上色'] = {
    id: '00000000-0000-4000-8000-000000000011',
    findRegex: '/^「([^」]*)」/gm',
    replace_file: '正则/上色_游戏内台词.html',
    trimStrings: [], placement: [1, 2], disabled: false,
    markdownOnly: true, promptOnly: false, runOnEdit: false, substituteRegex: 0,
  };
  // 重排：带名字的排在兜底之前
  const 序 = ['隐藏状态栏占位符', '状态栏界面', '数值变化上色', '判定结果高亮', '她的声音上色',
    '带名字的台词上色', '游戏内台词上色', '内心上色', '系统与那个声音上色', '场景分隔线',
    '对AI隐藏变量更新', '变量更新美化', '变量更新中美化', '对AI隐藏开局选择', '开局选择界面'];
  const 新 = {}; 序.forEach(k => { if (rx[k]) 新[k] = rx[k]; });
  Object.keys(rx).forEach(k => { if (!新[k]) 新[k] = rx[k]; });
  patch.push({ op: 'add', path: '/regex_scripts', value: 新 });

  fs.writeFileSync(path.join(D, '_p.json'), JSON.stringify(patch));
  try {
    console.log(execFileSync('node', [forge, 'patch', '旮旯给木-同级生2', '--file', path.join(D, '_p.json')], { encoding: 'utf8' }).split('\n')[0]);
  } catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 3).join(' ')); }
  fs.rmSync(path.join(D, '_p.json'));
  console.log('③ state 已更新：15 条正则 + 2 个脚本');
}
