/* ============================================================
   霍格沃茨 · 同层应用 主聊天界面（RPG 沉浸式）
   场景横幅 + 对话对象卡 + 玩家状态条 + 战斗内嵌 + 消息流 + 快捷动作
   ============================================================ */
'use strict';

/* ========== 场景横幅 ========== */
function sceneBanner(stat) {
  const t = stat.时间 || {};
  const year = t.学年 || 1;
  const arc = App.STORY_ARC[year] || { 名: '霍格沃茨', 描述: '' };
  const icoMap = { 上午: '🌅', 下午: '☀️', 晚间: '🌆', 深夜: '🌙' };
  return '<div id="hgw-chat-scene">' +
    '<span class="sc-ico">' + (icoMap[t.时段] || '🏰') + '</span>' +
    '<div class="sc-info"><div class="sc-where">' + App.esc(t.日期 || '') + ' · ' + App.esc(t.时段 || '') + ' · ' + App.esc(t.学期描述 || '') + '</div>' +
    '<div class="sc-when">《' + App.esc(arc.名) + '》· ' + App.esc(arc.描述 || '') + '</div></div>' +
    '<div class="sc-tags"><span class="hgw-badge gold">' + year + '年级</span>' +
    '<span class="hgw-badge magic">' + App.realmName(stat) + '</span></div></div>';
}

/* ========== 对话对象卡 ========== */
function targetCard(stat) {
  const target = (stat.课表 || {}).当前目标 || '';
  const chars = stat.女巫角色 || {};
  const names = Object.keys(chars);
  if (!target || !chars[target]) {
    // 无目标：显示可对话对象速选
    let h = '<div id="hgw-chat-target">' +
      '<div class="ct-ava" style="background:linear-gradient(135deg,#2c3e50,#1a252f)">👥</div>' +
      '<div class="ct-info"><div class="ct-name">选择对话对象</div>' +
      '<div class="ct-meta">' + (names.length ? '点击下面任意女巫设为当前目标——调度器将加载她的性格/性癖条目' : '在剧情中结识女巫后，这里会出现她们的档案') + '</div>' +
      '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">' + names.slice(0, 6).map(n => {
        const c = chars[n] || {};
        const info = App.houseInfo(c.学院);
        return '<span class="hgw-badge ' + info.cls + '" data-chattarget="' + n + '" style="cursor:pointer">' + n + '</span>';
      }).join('') + '</div></div></div>';
    return h;
  }
  const c = chars[target] || {};
  const info = App.houseInfo(c.学院);
  const bars = [
    ['♥ 好感', c.好感度 || 0, info.cls === 'gry' ? 'pink' : 'pink'],
    ['⚔ 服气', c.缴械值 || 0, 'red'],
    ['💜 堕落', c.堕落值 || 0, 'purple'],
    ['🔥 积压', c.欲望积压 || 0, ''],
  ];
  return '<div id="hgw-chat-target">' +
    '<div class="ct-ava" style="background:linear-gradient(135deg,' + info.color + '88,#1a252f)">👩</div>' +
    '<div class="ct-info">' +
    '<div class="ct-name">' + App.esc(target) + App.houseBadge(c.学院) + '<span class="hgw-badge gold">目标</span></div>' +
    '<div class="ct-meta">' + App.esc(String(c.身份 || '').slice(0, 24)) + ' ｜ 名器：' + App.esc(String(c.名器 || '').split('—')[0]) + '</div>' +
    '<div class="ct-bars">' + bars.map(([lb, v, color]) =>
      '<div class="ct-bar">' + App.UI.bar(v, color, lb, true) + '</div>').join('') + '</div>' +
    '</div>' +
    '<div class="ct-actions">' +
    '<button class="hgw-btn sm ghost" data-ct="detail">📋 档案</button>' +
    '<button class="hgw-btn sm danger" data-ct="battle">⚔️ 决斗</button>' +
    '<button class="hgw-btn sm love" data-ct="love">💗 亲密</button>' +
    '</div></div>';
}

/* ========== 玩家状态条 ========== */
function playerBar(stat) {
  const p = stat.玩家 || {};
  const at = p.属性 || {};
  const st = p.状态 || {};
  const btl = (stat.课表 || {}).战斗 || {};
  const hpMax = btl.主角防守值上限 || Math.round((at.魔力值 || 76) * 1.2 * App.realmMul(stat));
  const hpNow = btl.主角防守值 != null ? btl.主角防守值 : hpMax;
  return '<div id="hgw-chat-playerbar">' +
    '<div class="pb-ava">🧙</div>' +
    '<span class="pb-item"><span class="ic">💠</span><span class="vl">' + App.realmName(stat) + '</span></span>' +
    '<span class="pb-item"><span class="ic">🪙</span><span class="vl">' + App.gold(stat) + '</span></span>' +
    '<span class="pb-item"><span class="ic">⚡</span><span class="vl">' + (p.胜点 || 0) + '</span></span>' +
    '<div class="pb-bars">' +
    App.UI.bar(hpNow, 'green', '魔力盾', true) +
    App.UI.bar(at.体力 || 0, '', '体力', true) +
    App.UI.bar(st.情欲 || 0, 'pink', '情欲', true) +
    '</div></div>';
}

/* ========== 战斗内嵌条 ========== */
function duelBar(stat) {
  const cd = stat.课表 || {};
  const btl = cd.战斗 || {};
  const target = cd.当前目标 || '';
  if (cd.战斗状态 !== '进行中' || !target) return '';
  const playerMax = btl.主角防守值上限 || 96;
  const playerHp = btl.主角防守值 != null ? btl.主角防守值 : playerMax;
  const herMax = btl.她防守值上限 || 44;
  const herHp = btl.她防守值 != null ? btl.她防守值 : herMax;
  return '<div id="hgw-chat-duel">' +
    '<span class="dd-name">🧙 你</span>' +
    '<div class="dd-bar">' + App.UI.bar(playerHp, 'green', '', true) + '</div>' +
    '<span class="dd-vs">VS</span>' +
    '<div class="dd-bar">' + App.UI.bar(herHp, 'red', '', true) + '</div>' +
    '<span class="dd-name">' + App.esc(target) + '</span>' +
    '<button class="hgw-btn sm danger dd-btn" data-ct="battle">⚔️ 进入决斗</button></div>';
}

/* ========== 右侧信息栏（玩家/魔咒/物品/目标/课表/装备） ========== */
function sidebarPanel(stat) {
  const p = stat.玩家 || {};
  const at = p.属性 || {};
  const st = p.状态 || {};
  const rp = p.魔力阶位 || {};
  const spells = p.咒语 || {};
  const lib = p.魔咒库 || {};
  const pots = p.魔药 || {};
  const mats = p.材料 || {};
  const eq = p.装备 || {};
  const chars = stat.女巫角色 || {};
  const target = (stat.课表 || {}).当前目标 || '';
  const cd = stat.课表 || {};
  const sessions = cd.今日场次 || {};

  let h = '<div id="hgw-sidebar">';

  // —— 玩家卡 ——
  h += '<div class="hgw-sec-card sb-player">' +
    '<div class="sp-ava">🧙</div>' +
    '<div class="sp-name">你 · 转学生</div>' +
    '<div class="sp-realm">' + App.realmName(stat) + ' · 系数×' + App.realmMul(stat) + '</div>' +
    '<div class="sp-bars">' +
    App.UI.bar(at.魔力值 || 0, 'gold', '魔力', true) +
    App.UI.bar(at.体力 || 0, 'green', '体力', true) +
    App.UI.bar(st.情欲 || 0, 'pink', '情欲', true) +
    App.UI.bar(st.快感 || 0, 'red', '快感', true) +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:#9aa7b8">' +
    '<span>🪙 <b style="color:#e8d48b">' + App.gold(stat) + '</b></span>' +
    '<span>⚡ 胜点 <b style="color:#c3b4e8">' + (p.胜点 || 0) + '</b></span>' +
    '<span>🏆 <b style="color:#e8d48b">' + ((p.战绩 || {}).决斗荣誉 || 0) + '</b></span>' +
    '</div></div>';

  // —— 魔咒 ——
  h += '<div class="hgw-sec-card"><div class="sc-title"><span class="ic">🪄</span>魔咒<span class="more" data-navto="status">全部 →</span></div>';
  let spellCount = 0;
  for (const s of App.SPELLS) {
    const sp = spells[s.名] || { 等级: 1, 经验: 0 };
    const pct = Math.min(100, (sp.经验 || 0) / App.expNeed(sp.等级 || 1) * 100);
    h += '<div class="sb-spell"><span class="ss-name">' + s.名 + '</span><span class="ss-lv">Lv' + (sp.等级 || 1) + '</span><div class="ss-exp hgw-bar thin gold"><i style="width:' + pct + '%"></i></div></div>';
    spellCount++;
  }
  for (const k in lib) {
    const lv = lib[k].等级 || 1;
    h += '<div class="sb-spell ext"><span class="ss-name">' + k + '</span><span class="ss-lv">Lv' + lv + '</span><div class="ss-exp hgw-bar thin purple"><i style="width:100%"></i></div></div>';
    spellCount++;
  }
  if (!spellCount) h += '<div class="sb-no-target">暂无魔咒</div>';
  h += '</div>';

  // —— 物品 ——
  h += '<div class="hgw-sec-card"><div class="sc-title"><span class="ic">🎒</span>物品<span class="more" data-navto="status">背包 →</span></div><div class="sb-items">';
  let itemCount = 0;
  for (const k in pots) {
    if (pots[k] > 0) {
      h += '<div class="sb-item"><div class="si-ico">' + (App.POTION_ICONS[k] || '🧴') + '</div><div class="si-num">×' + pots[k] + '</div><div class="si-name">' + k + '</div></div>';
      itemCount++;
    }
  }
  for (const k in mats) {
    const m = mats[k] || {};
    if (m.数量 > 0) {
      h += '<div class="sb-item"><div class="si-ico">🌿</div><div class="si-num">×' + m.数量 + '</div><div class="si-name">' + k + '</div></div>';
      itemCount++;
    }
  }
  if (!itemCount) h += '<div class="sb-no-target" style="grid-column:1/-1">空空如也</div>';
  h += '</div></div>';

  // —— 当前目标/任务 ——
  h += '<div class="hgw-sec-card"><div class="sc-title"><span class="ic">🎯</span>当前目标<span class="more" data-navto="roster">名录 →</span></div>';
  if (target && chars[target]) {
    const c = chars[target] || {};
    h += '<div class="sb-target">' +
      '<div class="st-head">👩 ' + App.esc(target) + '</div>' +
      '<div class="st-namei">名器：' + App.esc(String(c.名器 || '').split('—')[0]) + ' ｜ ' + App.esc(c.身份 || '').slice(0, 14) + '</div>' +
      '<div class="st-bars">' +
      App.UI.bar(c.好感度 || 0, 'pink', '♥ 好感', true) +
      App.UI.bar(c.缴械值 || 0, 'red', '⚔ 服气', true) +
      App.UI.bar(c.堕落值 || 0, 'purple', '💜 堕落', true) +
      App.UI.bar(c.欲望积压 || 0, '', '🔥 积压', true) +
      '</div></div>';
  } else {
    h += '<div class="sb-no-target">未设目标。在聊天顶部点选女巫，或在名录里选择——调度器将按目标加载她的性格/性癖条目。</div>';
  }
  h += '</div>';

  // —— 今日场次（迷你课表） ——
  h += '<div class="hgw-sec-card"><div class="sc-title"><span class="ic">🗓️</span>今日场次<span class="more" data-navto="schedule">课表 →</span></div>';
  let hasSess = false;
  for (const pd of App.PERIODS) {
    const s = sessions[pd];
    if (s && s.参与者) {
      hasSess = true;
      h += '<div class="sb-session"><span class="ss-time">' + pd + '</span><span class="ss-who">' + App.esc(s.参与者) + '</span><span class="ss-res hgw-badge ' + (s.结果 === '你胜' ? 'ok' : s.结果 === '你败' ? 'danger' : 'ghost') + '" style="font-size:8px;padding:0 5px">' + (s.结果 || '未开战') + '</span></div>';
    }
  }
  if (!hasSess) h += '<div class="sb-no-target">尚未生成课表——去课表页点「生成课表」</div>';
  h += '</div>';

  // —— 装备 ——
  if (eq && Object.keys(eq).length) {
    h += '<div class="hgw-sec-card"><div class="sc-title"><span class="ic">🛡️</span>装备</div>';
    for (const k in eq) {
      const e = eq[k] || {};
      if (e.名) h += '<div class="sb-equip"><span class="eq-ico">' + (k === '魔杖' ? '🪄' : k === '巫师袍' ? '🧥' : '💍') + '</span><span class="eq-name">' + App.esc(e.名) + '</span><span class="eq-rank rar-' + String(e.品级 || '普通').toLowerCase() + '">' + (e.品级 || '普通') + '</span></div>';
    }
    h += '</div>';
  }

  h += '</div>';
  return h;
}

/* ========== 快捷动作 ========== */
function quickActions(stat) {
  const target = (stat.课表 || {}).当前目标 || '';
  const tgt = target ? '（对' + target + '）' : '';
  const acts = [
    ['💬 搭话', '（我走向' + (target || '礼堂长桌旁的人') + '，自然地打了个招呼）'],
    ['🌹 调情', '（我凑近' + (target || '她') + '，压低声音说了句暧昧的话）'],
    ['👀 观察', '（我留意着' + (target || '四周') + '的一举一动，记下她的状态）'],
    ['🎁 送礼', '（我拿出准备好的小礼物，递给' + (target || '她') + '）'],
  ];
  if (target) {
    acts.push(['⚔️ 邀战', '（我向' + target + '发起决斗挑战，扬了扬魔杖）']);
    acts.push(['💗 邀约', '（我试着邀请' + target + '单独相处）']);
  }
  acts.push(['📅 看课表', 'goto:schedule'], ['🌙 推进一天', 'goto:nextday'], ['🏰 大厅', 'goto:home']);
  let h = '<div id="hgw-chat-quick"><span class="qk-label">快捷行动' + tgt + '：</span>';
  for (const [label, action] of acts) {
    const isGo = String(action).startsWith('goto:');
    h += '<button class="hgw-btn sm ' + (isGo ? 'ghost' : '') + '" data-qk="' + (isGo ? action : action) + '">' + label + '</button>';
  }
  h += '</div>';
  return h;
}

/* ========== 消息渲染（RPG 气泡） ========== */
function renderMsg(m) {
  const role = m.role === 'user' ? 'user' : (m.role === 'system' ? 'sys' : 'ai');
  if (role === 'sys') {
    return '<div class="hgw-cmsg sys"><div class="cm-body">' + App.esc(String(m.message || '')) + '</div></div>';
  }
  const name = m.name || (m.role === 'user' ? '你' : '');
  // 学院色（按 name 匹配女巫）
  let cls = '';
  const stat = App._stat || {};
  const ch = (stat.女巫角色 || {})[String(name).split(' ')[0]] || (stat.女巫角色 || {})[name];
  if (ch && ch.学院) cls = App.houseInfo(ch.学院).cls;
  let text = String(m.message || '');
  // 结算块 → 卡片
  text = text.replace(/(【(对抗|双修|突破|植入|高潮确认|双修完成|炼药)结算】[^\n]*)/g,
    '<div class="hgw-settle-card">$1</div>');
  return '<div class="hgw-cmsg ' + role + ' ' + cls + '">' +
    '<div class="cm-head"><span class="cm-ava">' + (m.role === 'user' ? '🧙' : '👩') + '</span><span class="cm-name">' + App.esc(name) + '</span></div>' +
    '<div class="cm-body">' + App.nl2br(text) + '</div></div>';
}

/* ========== 主聊天视图 ========== */
App.registerView('story', async function (box) {
  const stat = await App.readStat();
  const msgs = await App.getTranscript();
  const target = (stat.课表 || {}).当前目标 || '';
  const chars = stat.女巫角色 || {};
  const hasChar = Object.keys(chars).length > 0;

  let h = '';
  h += '<div class="hgw-chat-layout">';
  h += '<div class="hgw-chat-main">';
  h += sceneBanner(stat);
  h += targetCard(stat);
  h += playerBar(stat);
  h += duelBar(stat);
  h += '<div id="hgw-chat-body">';

  if (!msgs.length || !localStorage.getItem('HGW_GUIDE_V1')) {
    // 欢迎横幅（首次进入必显示，之后仅在空聊天显示；可"知道了"关闭）
    h += '<div class="hgw-chat-welcome">' +
      '<div class="wl-title">⚡ 欢迎来到霍格沃茨</div>' +
      '<div class="wl-text">1991 年 9 月 1 日，你踏进霍格沃茨——这里是你的主聊天界面。<br>' +
      (hasChar ? '在下方输入你的第一个行动，或点击快捷行动按钮开始。' : '在剧情中认识女巫后，她们会出现在顶部对象卡。') + '<br>' +
      '<span class="hgw-text-faint">【酒馆内】对话经真实楼层发送，AI 回复出现在这里。' +
      '【本地预览】行动只打印到控制台，不会发送。</span></div>' +
      '<div class="wl-actions">' +
      (hasChar ? '<button class="hgw-btn ok sm" data-wl="talk">💬 打招呼</button><button class="hgw-btn magic sm" data-wl="observe">👀 观察四周</button>' : '') +
      '<button class="hgw-btn sm" data-wl="home">🏰 查看城堡大厅</button>' +
      '<button class="hgw-btn sm" data-wl="schedule">🗓️ 今日课表</button>' +
      '<button class="hgw-btn sm" data-wl="guide">✔ 知道了，开始游玩</button>' +
      '</div></div>';
  } else {
    const list = msgs.slice(-50);
    for (const m of list) h += renderMsg(m);
  }
  h += '</div>';
  h += quickActions(stat);
  h += '</div>';
  h += sidebarPanel(stat);
  h += '</div>';

  box.innerHTML = h;
  // 滚动到底
  const body = App.$('#hgw-chat-body');
  if (body) body.scrollTop = body.scrollHeight;

  /* 事件绑定 */
  // 右栏更多跳转
  App.$$('[data-navto]', box).forEach(el => el.addEventListener('click', () => App.navigate(el.dataset.navto)));
  // 选目标
  App.$$('[data-chattarget]', box).forEach(el => el.addEventListener('click', async () => {
    await App.writeStat({ 课表: { 当前目标: el.dataset.chattarget } });
    App.UI.toast('已设目标：' + el.dataset.chattarget, 'gold');
    App.navigate('story');
  }));
  // 对象卡动作
  App.$$('[data-ct]', box).forEach(el => el.addEventListener('click', () => {
    const act = el.dataset.ct;
    if (act === 'detail') App.openCharDetail ? App.openCharDetail(target) : App.navigate('roster');
    else if (act === 'battle') App.navigate('battle');
    else if (act === 'love') App.navigate('love');
  }));
  // 快捷动作
  App.$$('[data-qk]', box).forEach(el => el.addEventListener('click', async () => {
    const action = el.dataset.qk;
    if (action.startsWith('goto:')) {
      const dest = action.slice(5);
      if (dest === 'nextday') { await App.nextDay(); App.navigate('schedule'); }
      else App.navigate(dest);
      return;
    }
    App.setGenState('sending');
    await App.sendAction(action);
    App.setGenState('busy');
    // 本地模式立即回显
    if (!App.BRIDGE_READY) {
      const body2 = App.$('#hgw-chat-body');
      if (body2) {
        body2.insertAdjacentHTML('beforeend', renderMsg({ role: 'user', message: action }));
        body2.scrollTop = body2.scrollHeight;
      }
    }
  }));
  // 欢迎横幅动作
  App.$$('[data-wl]', box).forEach(el => el.addEventListener('click', async () => {
    const act = el.dataset.wl;
    if (act === 'talk') await App.sendAction('（我走向' + (target || '礼堂长桌旁的女巫们') + '，自然地打了个招呼）');
    else if (act === 'observe') await App.sendAction('（我环顾四周，观察今天城堡里的气氛和人们的表情）');
    else if (act === 'home') App.navigate('home');
    else if (act === 'schedule') App.navigate('schedule');
    else if (act === 'guide') {
      try { localStorage.setItem('HGW_GUIDE_V1', '1'); } catch (e) { }
      App.UI.toast('欢迎横幅已收起——随时可到「帮助」页查看玩法', 'ok');
      App.navigate('story');
    }
  }));
});

/* ========== 城堡大厅视图（保留） ========== */
App.registerView('home', async function (box) {
  const stat = await App.readStat();
  const t = stat.时间 || {};
  const year = t.学年 || 1;
  const arc = App.STORY_ARC[year] || { 名: '未知学年', 描述: '' };
  const p = stat.玩家 || {};
  const rp = p.魔力阶位 || {};

  let h = '';
  // —— 英雄区 ——
  h += '<div id="hgw-home-hero" class="hgw-fade-in">';
  h += '<div class="hero-title">⚡ 霍格沃茨 · ' + arc.名 + '篇</div>';
  h += '<div class="hero-sub">' + App.esc(t.日期 + ' · ' + (t.星期 || '') + ' · ' + (t.时段 || '') + ' · ' + (t.学期描述 || '')) + ' —— ' + App.esc(arc.描述) + '</div>';
  h += '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">';
  h += '<button class="hgw-btn ok lg" id="hgw-go-chat">💬 进入聊天/剧情</button>';
  h += '<button class="hgw-btn magic lg" id="hgw-go-schedule">🗓️ 今日课表</button>';
  h += '</div>';
  h += '<div class="hero-chips">';
  h += '<span class="hgw-badge gold">📅 ' + App.esc(t.学期描述 || '') + '</span>';
  h += '<span class="hgw-badge magic">💠 阶位 ' + App.realmName(stat) + '</span>';
  h += '<span class="hgw-badge">🛡️ 魔力 ' + ((p.属性 || {}).魔力值 || 0) + '</span>';
  h += '<span class="hgw-badge">🪙 ' + App.gold(stat) + ' 加隆</span>';
  h += '<span class="hgw-badge love">♥ 情欲 ' + ((p.状态 || {}).情欲 || 0) + '</span>';
  h += '<span class="hgw-badge magic">⚡ 胜点 ' + (p.胜点 || 0) + '</span>';
  h += '</div></div>';

  // —— 快速入口 ——
  h += '<div class="hgw-panel"><div class="panel-title"><span>🧭</span>快捷入口<span class="sub">one tap 直达玩法</span></div><div class="hgw-grid cols-3">';
  const quick = [
    { nav: 'story', ico: '💬', name: '聊天/剧情', desc: '主聊天界面 · 与她们对话' },
    { nav: 'schedule', ico: '🗓️', name: '今日课表', desc: '谁此刻在城堡里' },
    { nav: 'battle', ico: '⚔️', name: '决斗', desc: '魔咒对轰 · 缴械胜' },
    { nav: 'love', ico: '♥', name: '亲密', desc: '五维推进 · 关系深化' },
    { nav: 'brew', ico: '🧪', name: '炼药', desc: '配方 → 魔药 · 生产' },
    { nav: 'shop', ico: '🏪', name: '对角巷', desc: '金加隆 → 材料' },
    { nav: 'roster', ico: '👥', name: '女巫名录', desc: Object.keys(stat.女巫角色 || {}).length + ' 人已建档' },
    { nav: 'implant', ico: '🧠', name: '念头植入', desc: '胜点 ' + (p.胜点 || 0) + ' · 改造她们' },
    { nav: 'breakthrough', ico: '💠', name: '魔力突破', desc: '层进度 ' + (rp.层进度 || 0) + '%' },
  ];
  for (const q of quick) {
    h += '<div class="hgw-card clickable hgw-quick" data-nav="' + q.nav + '"><div class="card-title"><span>' + q.ico + '</span>' + q.name + '</div><div class="card-body">' + q.desc + '</div></div>';
  }
  h += '</div></div>';

  // —— 学年时间线 ——
  h += '<div class="hgw-panel"><div class="panel-title"><span>🕐</span>学年时间线<span class="sub">原著七部曲 · 你在其中</span></div><div class="hgw-timeline">';
  for (let y = 7; y >= 1; y--) {
    const a = App.STORY_ARC[y];
    const cls = y < year ? 'done' : (y === year ? 'now' : '');
    h += '<div class="hgw-tl-item ' + cls + ' hgw-tl-year" data-year="' + y + '">';
    h += '<div class="tl-title"><span class="hgw-badge ' + (y === year ? 'gold' : 'ghost') + '">' + y + '年级</span>' + App.esc(a.名) + (y === year ? ' <span class="hgw-badge warn">当前</span>' : '') + '</div>';
    h += '<div class="tl-sub">' + App.esc(a.描述) + '</div>';
    h += '</div>';
  }
  h += '</div></div>';

  box.innerHTML = h;

  const goChat = App.$('#hgw-go-chat');
  if (goChat) goChat.addEventListener('click', () => App.navigate('story'));
  const goSched = App.$('#hgw-go-schedule');
  if (goSched) goSched.addEventListener('click', () => App.navigate('schedule'));
  App.$$('.hgw-quick', box).forEach(el => el.addEventListener('click', () => App.navigate(el.dataset.nav)));
  App.$$('.hgw-tl-year', box).forEach(el => el.addEventListener('click', () => {
    const y = el.dataset.year;
    App.UI.toast('《' + (App.STORY_ARC[y] || {}).名 + '》——在剧情中推进学年，或让 AI 处理学年更替', 'magic');
  }));
});
