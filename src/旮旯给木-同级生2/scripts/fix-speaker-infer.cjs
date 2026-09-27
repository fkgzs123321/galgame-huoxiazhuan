// 说话人推断 —— 不依赖 AI 遵守「名字：「台词」」格式
// 依据用户实测：「多个人对话的时候，没有那么高的识别出来对话，然后更替颜色」
//   → AI 实际写的是自然叙事：「唐响的嘴角勾了起来。／「就它了。」」——**名字和台词不挨着**
//   → 正则只能匹配紧邻的 `名字：「台词」`，**语义关系它拿不到**
//
// 改法：正则只负责把台词包上标记（不带名字），**说话人由脚本推断**：
//   ① 取本楼层的纯文本
//   ② 找出所有「女角名/主角/她」出现的位置
//   ③ 每句台词的说话人 = **它前面最近出现的那个名字**
//      前面没有名字 → **继承上一句的说话人**（galgame 的常规做法）
//   ④ 按名字 hash 到 8 色
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

// ── ① 正则：只包标记，不给名字（台词一律带 class，等脚本上色）──
{
  fs.writeFileSync(path.join(D, '正则/上色_游戏内台词.html'),
    '<span class="ggline">「$1」</span>\n');
  fs.writeFileSync(path.join(D, '正则/上色_带名字的台词.html'),
    '<span class="ggline">$1：「$2」</span>\n');
  const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
  const rx = S.regex_scripts;
  // 删掉那条「带名字」的独立正则（合并进游戏内台词）
  delete rx['带名字的台词上色'];
  rx['游戏内台词上色'] = Object.assign({}, rx['游戏内台词上色'], {
    findRegex: '/「([^」]*)」/g',
  });
  const 序 = ['隐藏状态栏占位符', '状态栏界面', '数值变化上色', '判定结果高亮', '她的声音上色',
    '游戏内台词上色', '内心上色', '系统与那个声音上色', '场景分隔线',
    '对AI隐藏变量更新', '变量更新美化', '变量更新中美化', '对AI隐藏开局选择', '开局选择界面'];
  const 新 = {}; 序.forEach(k => { if (rx[k]) 新[k] = rx[k]; });
  Object.keys(rx).forEach(k => { if (!新[k]) 新[k] = rx[k]; });
  fs.writeFileSync(path.join(D, '_p.json'), JSON.stringify([{ op: 'add', path: '/regex_scripts', value: 新 }]));
  try { execFileSync('node', [forge, 'patch', '旮旯给木-同级生2', '--file', path.join(D, '_p.json')], { encoding: 'utf8' }); }
  catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n')[0]); }
  fs.rmSync(path.join(D, '_p.json'));
  console.log('① 正则简化：台词一律包 .ggline（不再要求 AI 写名字）｜正则 ' + Object.keys(新).length + ' 条');
}

// ── ② 脚本：推断说话人并上色 ──
const 脚本 = `// 说话人推断与分色
// 为什么不用正则给颜色：「谁在说话」是语义关系，正则只能匹配紧邻的「名字：\"台词\"」，
// 而自然叙事里名字和台词往往隔着动作描写（「唐响的嘴角勾了起来。\"就它了。\"」）→ 识别不出。
// 所以：正则只把台词包成 .ggline，说话人由这里按「前面最近出现的名字」推断。
(function () {
  var 板 = ['#8fd0a8', '#9db4e8', '#d8a0e0', '#e9c46a', '#e8a0a0', '#7ec8c8', '#c0a8e8', '#d0b088'];

  // 名字表：优先长名（全名），再短名；「她」算她的声音那一侧，不参与台词分色
  var 名字 = ['鸣泽美佐子', '永岛佐知子', '野野村美里', '永岛久美子', '田中美沙', '片桐美铃',
    '舞岛可怜', '杉本樱子', '加藤美纪', '安田爱美', '水野友美', '筱原泉', '南川洋子', '都筑梢',
    '鸣泽唯', '美佐子', '佐知子', '久美子', '野野村', '美里', '美沙', '美铃', '可怜', '樱子',
    '美纪', '爱美', '友美', '泉', '洋子', '梢', '唯'];

  function 色(n) {
    if (!n) return null;
    var s = 0;
    for (var i = 0; i < n.length; i++) s += n.charCodeAt(i);
    return 板[s % 板.length];
  }

  // 在文本里找「所有名字出现的位置」，按位置排序
  function 标名(文) {
    var 位 = [];
    for (var i = 0; i < 名字.length; i++) {
      var n = 名字[i], p = 0;
      while ((p = 文.indexOf(n, p)) >= 0) { 位.push({ at: p, 名: n }); p += n.length; }
    }
    // 长名优先：同一位置附近重叠时保留更长的
    位.sort(function (a, b) { return a.at - b.at || b.名.length - a.名.length; });
    var 清 = [];
    for (var k = 0; k < 位.length; k++) {
      var 重 = 清.some(function (x) { return Math.abs(x.at - 位[k].at) < 位[k].名.length && x.名.length >= 位[k].名.length; });
      if (!重) 清.push(位[k]);
    }
    return 清;
  }

  function 刷() {
    $('.ggline').each(function () {
      var el = this;
      // 找它所在的那一整块文本（就近取父容器的纯文本）
      var 根 = el.closest('p, .mes_text, div') || el.parentNode;
      var 文 = $(根).text() || '';
      var at = 文.indexOf($(el).text().slice(0, 8));
      if (at < 0) { at = 文.length; }
      var 位 = 标名(文);
      var 该 = null;
      for (var i = 0; i < 位.length; i++) if (位[i].at < at) 该 = 位[i].名;
      if (!该) 该 = $(el).attr('data-n') || null;
      var c = 色(该);
      if (c) { $(el).css('color', c); $(el).attr('data-n', 该 || ''); }
    });
  }

  $(document).ready(刷);
  try {
    if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
      eventOn(tavern_events.MESSAGE_RENDERED, 刷);
      eventOn(tavern_events.MESSAGE_UPDATED, 刷);
      eventOn(tavern_events.CHAT_CHANGED, 刷);
    }
  } catch (e) {}
  try { new MutationObserver(刷).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();
`;
fs.writeFileSync(path.join(D, '脚本/说话人分色.txt'), 脚本);
console.log('② 脚本改为「按前面最近的名字推断说话人」+ 8 色 hash');
