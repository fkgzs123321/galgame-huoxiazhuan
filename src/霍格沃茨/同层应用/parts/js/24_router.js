/* ============================================================
   霍格沃茨 · 同层应用 路由与主框架
   ============================================================ */
'use strict';

App.views = {};
App.currentView = 'home';
App.genState = 'idle';

/* ========== 视图注册 ========== */
App.registerView = function (name, renderFn, opts) {
  App.views[name] = { render: renderFn, opts: opts || {} };
};

/* ========== 切换视图 ========== */
App.navigate = async function (name) {
  const v = App.views[name];
  if (!v) { console.warn('[HGW] 未知视图:', name); return; }
  App.currentView = name;
  // 导航高亮
  App.$$('#hgw-nav .hgw-nav-item').forEach(el => el.classList.toggle('on', el.dataset.nav === name));
  const inner = App.$('#hgw-view-inner');
  if (!inner) return;
  inner.innerHTML = App.UI.loading();
  try {
    await v.render(inner);
  } catch (e) {
    console.error('[HGW] 视图渲染失败:', name, e);
    inner.innerHTML = App.UI.empty('⚠️', '视图渲染出错：' + e.message);
  }
  // 滚动到顶
  const view = App.$('#hgw-view');
  if (view) view.scrollTop = 0;
};

/* ========== 顶栏刷新 ========== */
App.refreshTopbar = async function () {
  const stat = App._stat || {};
  const t = stat.时间 || {};
  const p = stat.玩家 || {};
  const at = p.属性 || {};
  const st = p.状态 || {};
  const rp = p.魔力阶位 || {};
  const set = (id, txt) => { const el = App.$(id); if (el) el.textContent = txt; };
  set('#hgw-top-time', (t.学期描述 || '') + ' ' + (t.时段 || ''));
  set('#hgw-top-realm', App.realmName(stat) + ' ' + (rp.层进度 || 0) + '%');
  set('#hgw-top-mp', (at.魔力值 || 0) + ' / 阶×' + App.realmMul(stat));
  set('#hgw-top-lust', (st.情欲 || 0) + '/' + (st.快感 || 0));
  set('#hgw-top-gold', App.gold(stat));
  set('#hgw-top-week', t.日期 || '');
  // 导航迷你卡
  set('#hgw-nav-name', '你 · 转学生');
  set('#hgw-nav-lv', (p.学业 && p.学业.年级 ? p.学业.年级 + '年级' : '一年级') + ' · ' + ((p.学业 && p.学业.学院) || '格兰芬多'));
  const cnt = Object.keys(stat.女巫角色 || {}).length;
  set('#hgw-nav-roster-count', cnt);
};

/* ========== 生成状态灯 ========== */
App.setGenState = function (state) {
  App.genState = state;
  const el = App.$('#hgw-genstate');
  const txt = App.$('#hgw-genstate-txt');
  if (!el) return;
  el.className = state === 'busy' ? 'busy' : 'idle';
  if (txt) txt.textContent = state === 'busy' ? '生成中…' : (state === 'sending' ? '发送中…' : (state === 'stopped' ? '已停止' : '空闲'));
};

/* ========== 顶部按钮绑定 ========== */
App.bindTopbar = function () {
  // Logo 点击回首页
  const logo = App.$('#hgw-logo');
  if (logo) logo.addEventListener('click', () => App.navigate('home'));
  // 迷你卡点击去状态
  const mini = App.$('#hgw-nav-mini');
  if (mini) mini.addEventListener('click', () => App.navigate('status'));
};

/* ========== 导航绑定 ========== */
App.bindNav = function () {
  App.$$('#hgw-nav .hgw-nav-item').forEach(el => {
    el.addEventListener('click', () => App.navigate(el.dataset.nav));
  });
};

/* ========== 输入栏绑定 ========== */
App.bindInput = function () {
  const input = App.$('#hgw-input');
  const send = App.$('#hgw-btn-send');
  const roll = App.$('#hgw-btn-roll');
  if (!input) return;
  const autoGrow = () => {
    input.style.height = 'auto';
    input.style.height = Math.min(120, input.scrollHeight) + 'px';
  };
  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  if (send) send.addEventListener('click', doSend);
  if (roll) roll.addEventListener('click', () => {
    const n = App.rand(1, 20);
    App.UI.toast('🎲 投出 d20：' + n + (n === 20 ? ' —— 大成功！' : (n === 1 ? ' —— 大失败！' : '')), n === 20 ? 'gold' : (n === 1 ? 'warn' : 'magic'));
    App.sendAction('（我投了个 d20，结果：' + n + '）');
  });
  async function doSend() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    autoGrow();
    // 独立 AI 模式：输入直接走用户配置的 API
    if (App.cfg && App.cfg.aiMode === 'independent' && App.AI && App.AI.enabled()) {
      App.setGenState('sending');
      const reply = await App.aiChat(text);
      if (reply != null) {
        // 本地回显：AI 回复 + 用户消息
        const body = App.$('#hgw-chat-body');
        if (body) {
          body.insertAdjacentHTML('beforeend', App.renderMsg ? renderChatMsgLocal(text, 'user') : '');
          body.insertAdjacentHTML('beforeend', App.renderMsg ? renderChatMsgLocal(reply, 'ai') : '');
          body.scrollTop = body.scrollHeight;
        } else {
          // 非聊天视图也提示
          App.UI.toast('独立 AI 已回复（切到聊天界面查看）', 'ok');
        }
        App.refreshTopbar();
      }
      App.setGenState('idle');
      return;
    }
    App.setGenState('sending');
    await App.sendAction(text);
    App.setGenState('busy');
  }
  function renderChatMsgLocal(text, role) {
    const name = role === 'user' ? '你' : '霍格沃茨';
    return '<div class="hgw-cmsg ' + role + '"><div class="cm-head"><span class="cm-ava">' + (role === 'user' ? '🧙' : '👩') + '</span><span class="cm-name">' + name + '</span></div><div class="cm-body">' + App.nl2br(text) + '</div></div>';
  }
};

/* ========== 启动 ========== */
App.start = async function () {
  try {
    await App.initBridge();
  } catch (e) { /* 降级模式 */ }
  // 加载状态
  await App.readStat(true);
  App._stat = App.normalizeStat(App._stat);
  // 首次初始化：角色级变量为空/残缺时，把补全后的完整默认 stat 持久化写回
  // （防：新聊天无 stat_data → 写回基于空 stat → 数据永久残缺）
  // 带延迟重试：应用启动早期桥可能未就绪（RPC 超时静默失败），桥就绪后补做
  const tryInitStat = async () => {
    try {
      const p = App._stat.玩家 || {};
      const wc = Object.keys(App._stat.女巫角色 || {}).length;
      if (!p.属性 || !p.学业 || wc === 0) {
        await App.writeStat(App._topPatch(App._stat));
        console.log('[HGW] stat_data 首次初始化完成（角色级变量已持久化）');
      }
    } catch (e) { console.warn('[HGW] stat 初始化写回失败', e); }
  };
  await tryInitStat();
  if (!App.BRIDGE_READY) setTimeout(tryInitStat, 2500);
  // 本地 UI 配置
  App.cfg = {};
  try { App.cfg = JSON.parse(localStorage.getItem(App.CFG_KEY) || '{}'); } catch (e) { App.cfg = {}; }
  App.saveCfg = function () {
    try { localStorage.setItem(App.CFG_KEY, JSON.stringify(App.cfg)); } catch (e) { /* ignore */ }
  };
  // 渲染骨架
  App.bindTopbar();
  App.bindNav();
  App.bindInput();
  App.refreshTopbar();
  // 默认视图：首次进入先做开局引导（分院仪式·角色创建），完成后进主聊天
  let guideDone = false;
  try { guideDone = !!localStorage.getItem('HGW_GUIDE_DONE'); } catch (e) { }
  await App.navigate(guideDone ? 'story' : 'create');
  // 记忆自动总结（新楼层 → 自动压缩入库，静默）
  if (App.summarizeNewFloors) App.summarizeNewFloors(false).catch(() => { });
  // 自动推演（轮次阈值 → 全员演化，静默）
  if (App.checkAutoEvolution) App.checkAutoEvolution(false).catch(() => { });
  // 桥接就绪通知
  if (App.BRIDGE_READY) {
    App.rpc(App.RPC.SET_GEN_STATE, { state: 'idle' });
    console.log('[HGW] 桥接就绪，同层应用启动完成');
  } else {
    console.warn('[HGW] 本地降级模式：界面可用，行动不会进入真实聊天');
    App.UI.toast('本地预览模式：行动不发送到酒馆', 'warn', 4000);
  }
  App.emit('app_ready', {});
};

/* 消息监听：shell 转发的状态推送 */
window.addEventListener('message', function (ev) {
  const d = ev.data;
  if (!d || d.channel !== App.RPC.CHANNEL) return;
  if (d.event === 'stat_pushed') {
    if (d.stat) { App._stat = d.stat; App.emit('stat_changed', d.stat); }
    if (App.currentView && App.views[App.currentView]) {
      const inner = App.$('#hgw-view-inner');
      if (inner) App.views[App.currentView].render(inner);
    }
    App.refreshTopbar();
  }
  if (d.event === 'gen_state') {
    App.setGenState(d.state || 'idle');
  }
  if (d.event === 'transcript_changed') {
    if (App.currentView === 'story') App.navigate('story');
    // 自动记忆（楼层阈值：每 N 层中期 / 每 M 层长期，静默）
    if (App.summarizeNewFloors) App.summarizeNewFloors(false).catch(() => { });
    // 自动推演（轮次阈值：全员演化，静默）
    if (App.checkAutoEvolution) App.checkAutoEvolution(false).catch(() => { });
  }
});
