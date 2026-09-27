/* ============================================================
   霍格沃茨 · 同层应用 课表视图
   ============================================================ */
'use strict';

App.registerView('schedule', async function (box) {
  const stat = await App.readStat();
  const cd = stat.课表 || {};
  const sessions = cd.今日场次 || {};
  const target = cd.当前目标 || '';
  const chars = stat.女巫角色 || {};

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🗓️</span>今日课表<span class="sub">谁在线 = 可接触性 · 不是谁找你</span></div>';
  h += '<div class="hgw-session-grid">';
  for (const pd of App.PERIODS) {
    const s = sessions[pd];
    h += '<div class="hgw-session-card' + (s && s.参与者 && s.参与者.includes(target) ? ' current' : '') + '">';
    h += '<div class="sess-head"><span class="sess-time">' + pd + '</span>';
    if (s) h += '<span class="hgw-badge ' + (s.结果 === '你胜' ? 'ok' : (s.结果 === '你败' ? 'danger' : 'ghost')) + '">' + (s.结果 || '未开战') + '</span>';
    h += '</div>';
    if (s && s.参与者) {
      const names = String(s.参与者).split('、').filter(Boolean);
      h += '<div class="sess-parts">';
      for (const n of names) {
        const c = chars[n] || {};
        const info = App.houseInfo(c.学院);
        h += '<span class="hgw-badge ' + info.cls + '" data-pick="' + n + '" style="cursor:pointer" title="设为当前目标">' + n + '</span>';
      }
      h += '</div>';
      h += '<div class="sess-pick"><button class="hgw-btn sm" data-pickall="' + pd + '">设为目标（首个）</button></div>';
    } else {
      h += '<div class="hgw-note">这个时段没有人在——或尚未生成课表。</div>';
    }
    h += '</div>';
  }
  h += '</div>';
  h += '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">';
  h += '<button class="hgw-btn ok" id="hgw-sched-gen">✨ 生成课表</button>';
  h += '<button class="hgw-btn magic" id="hgw-sched-day">🌙 推进一天</button>';
  h += '<button class="hgw-btn danger" id="hgw-sched-clear">🗑 清空目标</button>';
  h += '</div>';
  h += '<div class="hgw-note" style="margin-top:10px">当前目标：<strong>' + (target || '无') + '</strong> —— 调度器按此 getwi 加载她的性格/性癖标签条目。课表只决定「谁在」，搭话、约见、决斗都需要你主动。</div>';
  h += '</div>';

  box.innerHTML = h;

  box.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      App.writeStat({ 课表: { 当前目标: pick.dataset.pick } });
      App.UI.toast('已设当前目标：' + pick.dataset.pick, 'gold');
      App.navigate('schedule');
      return;
    }
    const pickAll = e.target.closest('[data-pickall]');
    if (pickAll) {
      const s = sessions[pickAll.dataset.pickall];
      if (s && s.参与者) {
        const first = String(s.参与者).split('、')[0];
        App.writeStat({ 课表: { 当前目标: first } });
        App.UI.toast('已设当前目标：' + first, 'gold');
        App.navigate('schedule');
      }
      return;
    }
  });
  const g = App.$('#hgw-sched-gen');
  if (g) g.addEventListener('click', generateSchedule);
  const d = App.$('#hgw-sched-day');
  if (d) d.addEventListener('click', () => nextDay());
  const c = App.$('#hgw-sched-clear');
  if (c) c.addEventListener('click', async () => {
    await App.writeStat({ 课表: { 当前目标: '' } });
    App.UI.toast('已清空目标', 'warn');
    App.navigate('schedule');
  });
});

/* ========== 课表生成 ========== */
async function generateSchedule() {
  const stat = await App.readStat(true);
  const chars = stat.女巫角色 || {};
  const names = Object.keys(chars);
  if (!names.length) {
    App.UI.toast('还没有女巫建档——先让 AI 在剧情中引入角色', 'warn');
    return;
  }
  const byStack = (arr) => arr.slice().sort((a, b) => (chars[b].欲望积压 || 0) - (chars[a].欲望积压 || 0));
  const pick = (pool) => { const arr = byStack(pool); return arr.length ? arr.slice(0, Math.min(3, arr.length)).join('、') : ''; };
  const sessions = {};
  for (const pd of App.PERIODS) {
    sessions[pd] = { 参与者: pick(names), 结果: '未开战', 是否参战: false };
  }
  await App.writeStat({ 课表: { 今日场次: sessions } });
  App.addLog('social', '生成今日课表');
  App.UI.confetti(16);
  App.UI.toast('今日课表已生成——看看谁在线', 'gold');
  App.navigate('schedule');
}
App.generateSchedule = generateSchedule;

/* ========== 推进一天 ========== */
async function nextDay() {
  const stat = await App.readStat(true);
  const t = stat.时间 || {};
  const chars = stat.女巫角色 || {};
  const p = stat.玩家 || {};
  const wi = App.WEEK.indexOf(t.星期 || '星期一');
  t.星期 = App.WEEK[(wi + 1) % 7];
  const dayMap = { '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 7 };
  const curDay = dayMap[t.星期] || 1;
  t.日期 = '199' + String(t.学年 || 1) + '年9月' + Math.min(30, Math.max(1, curDay)) + '日';
  for (const n in chars) {
    const c = chars[n];
    if (!c) continue;
    c.欲望积压 = App.clamp((c.欲望积压 || 0) + Math.max(2, Math.round((c.压力值 || 50) / 20)), 0, 100);
    if (c.堕落值 > 0) c.堕落值 = Math.max(0, Math.round(c.堕落值 - 2));
    if (c.心理状态) c.心理状态.欲望度 = App.clamp((c.心理状态.欲望度 || 0) + Math.round((c.欲望积压 || 0) / 25), 0, 100);
    c.今日已使用 = false;
  }
  if (p.属性) p.属性.体力 = App.clamp((p.属性.体力 || 0) + 40, 0, 100);
  if (p.生理) {
    p.生理.射精冷却剩余 = Math.max(0, (p.生理.射精冷却剩余 || 0) - 1);
    p.生理.今日射精次数 = 0;
  }
  const names = Object.keys(chars);
  const byStack = (arr) => arr.slice().sort((a, b) => (chars[b].欲望积压 || 0) - (chars[a].欲望积压 || 0));
  const pick = (pool) => { const arr = byStack(pool); return arr.length ? arr.slice(0, Math.min(3, arr.length)).join('、') : ''; };
  const sessions = {};
  for (const pd of App.PERIODS) sessions[pd] = { 参与者: pick(names), 结果: '未开战', 是否参战: false };
  // 植入念头阶段推进（潜伏→萌芽）
  const jumps = App.advanceImplant ? App.advanceImplant(stat) : [];
  await App.writeStat({ 时间: t, 女巫角色: chars, 玩家: p, 课表: { 今日场次: sessions, 当前目标: '' } });
  if (jumps && jumps.length) App.UI.toast('🧠 念头浮现：' + jumps.join('、'), 'magic');
  App.addLog('social', '推进一天 → ' + t.日期 + ' ' + t.星期);
  App.UI.toast('时间推进一天：' + t.日期 + ' ' + t.星期, 'magic');
  await App.refreshTopbar();
  App.navigate('schedule');
}
App.nextDay = nextDay;
