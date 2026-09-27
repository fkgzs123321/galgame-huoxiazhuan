/* ============================================================
   霍格沃茨 · 同层应用 做爱引擎（亲密 · 本地结算）
   ============================================================ */
'use strict';

App.Love = {
  actions: [],
  fitHints: [],
};

/* ========== 契合度提示 ========== */
App.Love.computeHints = function (stat) {
  const target = (stat.双修 || {}).对象 || (stat.课表 || {}).当前目标 || '';
  const ch = (stat.女巫角色 || {})[target];
  if (!ch) return [];
  const hints = [];
  const bs = ch.身体状态 || {};
  if (bs.胸部 && bs.胸部.敏感度 >= 60) hints.push('她的胸部敏感度 ' + bs.胸部.敏感度 + '——乳尖/乳肉是强点');
  if (bs.阴道 && bs.阴道.敏感度 >= 60) hints.push('她的花径敏感度 ' + bs.阴道.敏感度 + '——花径/花核是强点');
  if (bs.大腿 && bs.大腿.状态 && String(bs.大腿.状态).includes('敏感')) hints.push('她的大腿内侧格外敏感');
  if (bs.脖颈 && bs.脖颈.敏感度 >= 60) hints.push('她的脖颈敏感度 ' + bs.脖颈.敏感度 + '——啃咬脖颈是高伤害部位');
  if (ch.名器) hints.push('名器【' + String(ch.名器).split('—')[0] + '】——结合名器特性选动作');
  const sens = [];
  if (bs.胸部 && bs.胸部.敏感度 >= 55) sens.push('乳尖');
  if (bs.阴道 && bs.阴道.敏感度 >= 55) sens.push('花径');
  if (bs.大腿 && bs.大腿.状态 && String(bs.大腿.状态).includes('敏感')) sens.push('大腿内侧');
  if (sens.length) hints.push('建议优先：' + sens.join('/') + '（命中敏感部位→上佳）');
  return hints;
};

/* ========== 开始亲密 ========== */
App.Love.start = async function (target) {
  const stat = await App.readStat(true);
  const ch = (stat.女巫角色 || {})[target];
  if (!ch) { App.UI.toast('目标不存在', 'danger'); return false; }
  const favor = ch.好感度 || 0;
  if (favor < 30 && !ch.是否缴械) {
    App.UI.toast('她对你还没有足够的信任——好感度 ≥30 或已缴械后才可能答应', 'warn');
    await App.sendAction('（我试探性地靠近' + target + '，想要更进一步……）');
    return false;
  }
  await App.writeStat({
    双修: {
      会话状态: '进行中',
      对象: target,
      主导方: '我来',
      当前体位: '尚未明确',
      本轮动作: [],
      使用物品: '不使用物品',
      修为进度: 0,
      情欲: 0,
      快感: 0,
      堕落: 0,
      顺从: 0,
      高潮待宣: false,
      快感清零: false,
      下轮高潮: false,
      裁决状态: '等待触发',
      可回溯: false,
      历史轮: [],
    },
    课表: { 当前目标: target },
  });
  App.Love.actions = [];
  App.Love.fitHints = App.Love.computeHints(stat);
  App.addLog('love', '开始亲密会话：' + target);
  await App.sendAction('（' + target + '默许了我的亲近——亲密开始）');
  App.UI.confetti(20);
  return true;
};

/* ========== 引导（结算一轮） ========== */
App.Love.guide = async function (actions, leader, pos, item) {
  const stat = await App.readStat(true);
  const d = stat.双修 || {};
  const target = d.对象;
  if (!target || d.会话状态 !== '进行中') {
    App.UI.toast('没有进行中的亲密会话', 'warn');
    return;
  }
  if (!actions.length) { App.UI.toast('先编排动作（1~3 组）', 'warn'); return; }
  const p = stat.玩家 || {};
  const pots = p.魔药 || {};
  const ch = (stat.女巫角色 || {})[target] || {};

  // 品质判定
  let quality = '普通';
  let fits = 0;
  for (const a of actions) {
    if (App.SENS.includes(a.部位)) fits++;
    if (a.风格 === '缠绵' || a.风格 === '轻柔' || a.风格 === '深入') fits++;
  }
  const sub = d.顺从 || 0;
  if (sub >= 60) quality = '上佳';
  else if (fits >= 3) quality = '上佳';
  else if (fits >= 1) quality = '普通';
  else quality = '低效';
  const qm = quality === '上佳' ? 1.5 : (quality === '低效' ? 0.6 : 1);

  // 数值
  let 修为 = Math.round((5 + App.rand(0, 10)) * qm);
  let 情欲 = Math.round((3 + App.rand(0, 5)) * qm);
  let 快感 = Math.round((12 + fits * 4) * (leader === '我来' ? 1 : 1.2));
  let 堕落 = Math.round((2 + App.rand(0, 4)) * qm);
  let 顺从 = Math.round((2 + App.rand(0, 3)) * (leader === '我来' ? 1.3 : 0.8));
  let itemUsed = '';
  if (item === '迷情剂' && pots.迷情剂 > 0) { 情欲 += 30; pots.迷情剂 -= 1; itemUsed = '迷情剂+30情欲'; }
  else if (item === '润滑魔油' && pots.润滑魔油 > 0) { 快感 += 20; pots.润滑魔油 -= 1; itemUsed = '润滑魔油+20快感'; }
  if (pos === '后入式' || pos === '骑乘式' || pos === '正常位') 快感 += 3;

  const np = {
    修为进度: Math.min(100, (d.修为进度 || 0) + 修为),
    情欲: Math.min(100, (d.情欲 || 0) + 情欲),
    快感: Math.min(100, (d.快感 || 0) + 快感),
    堕落: Math.min(100, (d.堕落 || 0) + 堕落),
    顺从: Math.min(100, (d.顺从 || 0) + 顺从),
  };
  const orgasm = np.快感 >= 100;
  if (orgasm) np.高潮待宣 = true;

  const hist = d.历史轮 || [];
  const actStr = actions.map(a => a.行为 + '·' + a.部位 + '·' + a.风格).join(' + ');
  hist.push({ 轮次: hist.length + 1, 动作: actStr, 结果: quality, 修为进度: 修为, 快感变化: 快感, 堕落变化: 堕落, 顺从变化: 顺从 });

  await App.writeStat({
    双修: {
      会话状态: '裁决中',
      当前体位: pos,
      主导方: leader,
      本轮动作: actions.map(a => ({ 行为: a.行为, 部位: a.部位, 风格: a.风格 })),
      使用物品: item,
      修为进度: np.修为进度,
      情欲: np.情欲,
      快感: np.快感,
      堕落: np.堕落,
      顺从: np.顺从,
      高潮待宣: np.高潮待宣,
      可回溯: true,
      历史轮: hist,
    },
    玩家: { 魔药: pots },
  });

  // 周期信息
  const cyc = ch.生理周期 || {};
  const cycNote = '周期:' + (cyc.月经状态 || '?') + ' 排卵日' + (cyc.排卵日 || 14) + ' 避孕' + (cyc.避孕 !== false ? '是' : '否');

  const block = '【双修结算】对象=' + target + '|轮=' + hist.length +
    '|动作=' + actStr +
    '|体位=' + pos + '|主导=' + leader +
    '|品质=' + quality +
    '|修为+' + 修为 + '|情欲+' + 情欲 + '|快感+' + 快感 + '|堕落+' + 堕落 + '|顺从+' + 顺从 +
    (itemUsed ? '|' + itemUsed : '') +
    (orgasm ? '|高潮待宣：快感已满，请在正文宣布高潮' : '') +
    '|' + cycNote;
  await App.sendAction(block);
  App.addLog('love', block);
  App.UI.floatNum('♥ +' + 快感, 'love', window.innerWidth / 2, window.innerHeight / 2 - 30);
  if (orgasm) App.UI.confetti(30);
  return quality;
};

/* ========== 确认高潮 ========== */
App.Love.confirmOrgasm = async function () {
  const stat = await App.readStat(true);
  const d = stat.双修 || {};
  if (!d.高潮待宣) { App.UI.toast('快感未满，暂无高潮待宣', 'warn'); return; }
  const target = d.对象;
  const tc = (stat.女巫角色 || {})[target] || {};
  tc.高潮次数 = (tc.高潮次数 || 0) + 1;
  await App.writeStat({
    双修: {
      高潮待宣: false,
      快感清零: true,
      快感: 0,
      修为进度: Math.min(100, (d.修为进度 || 0) + 20),
      堕落: Math.min(100, (d.堕落 || 0) + 8),
      顺从: Math.min(100, (d.顺从 || 0) + 4),
     },
    女巫角色: target ? { [target]: { 高潮次数: tc.高潮次数 } } : {},
  });
  await App.sendAction('【高潮确认】' + target + ' 高潮已宣布：修为+20，堕落+8，顺从+4');
  App.addLog('love', '高潮确认：' + target + '（累计 ' + tc.高潮次数 + ' 次）');
  App.UI.confetti(50);
  App.UI.toast('🎉 高潮确认！' + target + ' 身体微微颤抖', 'love');
};

/* ========== 回溯 ========== */
App.Love.undo = async function () {
  const stat = await App.readStat(true);
  const d = stat.双修 || {};
  if (!d.可回溯) { App.UI.toast('本回合不可回溯', 'warn'); return; }
  const hist = d.历史轮 || [];
  if (!hist.length) return;
  const last = hist.pop();
  await App.writeStat({
    双修: {
      会话状态: '进行中',
      修为进度: Math.max(0, (d.修为进度 || 0) - last.修为进度),
      快感: Math.max(0, (d.快感 || 0) - last.快感变化),
      堕落: Math.max(0, (d.堕落 || 0) - last.堕落变化),
      顺从: Math.max(0, (d.顺从 || 0) - last.顺从变化),
      可回溯: false,
      历史轮: hist,
    },
  });
  App.UI.toast('已回溯上一轮', 'warn');
};

/* ========== 结束结算 ========== */
App.Love.finish = async function () {
  const stat = await App.readStat(true);
  const d = stat.双修 || {};
  const target = d.对象;
  if (!target) { App.UI.toast('没有会话', 'warn'); return; }
  const 修为 = d.修为进度 || 0;
  const 堕落 = d.堕落 || 0;
  const favorGain = Math.round(修为 / 10);
  const fallGain = Math.round(堕落 / 8);
  const tc = (stat.女巫角色 || {})[target] || {};
  tc.好感度 = Math.min(100, (tc.好感度 || 0) + favorGain);
  tc.堕落值 = Math.min(100, (tc.堕落值 || 0) + fallGain);
  tc.欲望积压 = Math.max(0, (tc.欲望积压 || 0) - 25);
  await App.writeStat({
    双修: { 会话状态: '已结束', 可回溯: false, 高潮待宣: false },
    女巫角色: { [target]: { 好感度: tc.好感度, 堕落值: tc.堕落值, 欲望积压: tc.欲望积压 } },
  });
  await App.sendAction('【双修完成】对象=' + target + '|修为' + 修为 + '|好感+' + favorGain + '|堕落值+' + fallGain);
  App.addLog('love', '亲密结束：' + target + ' 好感+' + favorGain + ' 堕落+' + fallGain);
  App.UI.confetti(40);
  App.UI.toast('💗 亲密结束——关系深化：好感+' + favorGain + ' 堕落+' + fallGain, 'love');
};
