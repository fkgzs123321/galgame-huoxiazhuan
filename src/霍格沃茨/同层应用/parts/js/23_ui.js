/* ============================================================
   霍格沃茨 · 同层应用 UI 组件库（Toast/Modal/Confirm/Prompt/Drawer/特效）
   ============================================================ */
'use strict';

App.UI = {};

/* ========== Toast 通知 ========== */
App.UI.toast = function (msg, type, duration) {
  type = type || 'ok';
  duration = duration || 3200;
  const icons = { ok: '✅', warn: '⚠️', danger: '❌', love: '💗', magic: '✨', gold: '🌟' };
  const root = App.$('#hgw-toasts');
  if (!root) return;
  const el = App.el('div', { class: 'hgw-toast ' + type }, '<span class="tic">' + (icons[type] || 'ℹ️') + '</span><span class="msg">' + msg + '</span>');
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, duration);
};

/* ========== Modal 模态框 ========== */
App.UI.modal = function (opts) {
  // opts: { title, icon, body(html|node), footer(html), wide|xl|sm, onClose, closeBtn }
  const root = App.$('#hgw-modal-root');
  const overlay = App.el('div', { class: 'hgw-overlay' });
  const modal = App.el('div', { class: 'hgw-modal' + (opts.wide ? ' wide' : '') + (opts.xl ? ' xl' : '') + (opts.sm ? ' sm' : '') });
  const head = App.el('div', { class: 'hgw-modal-head' });
  head.innerHTML = '<div class="mtitle">' + (opts.icon ? '<span>' + opts.icon + '</span>' : '') + App.esc(opts.title || '') + '</div>';
  if (opts.closeBtn !== false) {
    const closeBtn = App.el('button', { class: 'mclose', 'aria-label': '关闭' }, '✕');
    closeBtn.addEventListener('click', () => close());
    head.appendChild(closeBtn);
  }
  const body = App.el('div', { class: 'hgw-modal-body' });
  if (typeof opts.body === 'string') body.innerHTML = opts.body;
  else if (opts.body) body.appendChild(opts.body);
  modal.appendChild(head);
  modal.appendChild(body);
  if (opts.footer) {
    const foot = App.el('div', { class: 'hgw-modal-foot' });
    foot.innerHTML = opts.footer;
    modal.appendChild(foot);
  }
  overlay.appendChild(modal);
  root.appendChild(overlay);
  function close() {
    modal.classList.add('hide');
    overlay.classList.add('hide');
    setTimeout(() => { overlay.remove(); if (opts.onClose) opts.onClose(); }, 220);
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay && opts.closable !== false) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  return { overlay, modal, body, close };
};

/* ========== Confirm 确认框 ========== */
App.UI.confirm = function (opts) {
  // opts: { title, msg, sub, icon('warn'|'danger'|'ok'|'love'), okText, cancelText, onOk }
  const ico = { warn: '⚠️', danger: '💀', ok: '✅', love: '💗' };
  return new Promise((resolve) => {
    const m = App.UI.modal({
      title: opts.title || '确认',
      sm: true,
      body: '<div class="hgw-confirm">' +
        '<div class="icon-box ' + (opts.icon || 'warn') + '">' + (ico[opts.icon] || '❓') + '</div>' +
        '<div class="cmsg">' + App.esc(opts.msg || '确定吗？') + '</div>' +
        (opts.sub ? '<div class="csub">' + App.esc(opts.sub) + '</div>' : '') +
        '</div>',
      footer: '<button class="hgw-btn ghost" data-c="0">' + App.esc(opts.cancelText || '取消') + '</button>' +
        '<button class="hgw-btn ' + (opts.icon === 'danger' ? 'danger' : 'ok') + '" data-c="1">' + App.esc(opts.okText || '确定') + '</button>',
      closeBtn: false,
      onClose: () => resolve(false),
    });
    m.modal.querySelector('[data-c="0"]').addEventListener('click', () => { m.close(); resolve(false); });
    m.modal.querySelector('[data-c="1"]').addEventListener('click', () => { m.close(); resolve(true); if (opts.onOk) opts.onOk(); });
  });
};

/* ========== Prompt 输入框 ========== */
App.UI.prompt = function (opts) {
  // opts: { title, msg, placeholder, value, okText, onOk(value) }
  return new Promise((resolve) => {
    const input = App.el('input', { class: 'pinput', placeholder: opts.placeholder || '', value: opts.value || '' });
    const m = App.UI.modal({
      title: opts.title || '输入',
      sm: true,
      body: '<div class="hgw-prompt">' +
        (opts.msg ? '<div class="pmsg">' + App.esc(opts.msg) + '</div>' : '') +
        '</div>',
      footer: '<button class="hgw-btn ghost" data-c="0">取消</button><button class="hgw-btn ok" data-c="1">' + App.esc(opts.okText || '确定') + '</button>',
      closeBtn: false,
      onClose: () => resolve(null),
    });
    m.body.querySelector('.hgw-prompt').appendChild(input);
    input.focus();
    const doOk = () => { const v = input.value.trim(); m.close(); resolve(v); if (opts.onOk) opts.onOk(v); };
    m.modal.querySelector('[data-c="0"]').addEventListener('click', () => { m.close(); resolve(null); });
    m.modal.querySelector('[data-c="1"]').addEventListener('click', doOk);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doOk(); });
  });
};

/* ========== Drawer 抽屉 ========== */
App.UI.drawer = function (opts) {
  // opts: { title, body(html|node), onClose }
  const overlay = App.el('div', { class: 'hgw-drawer-overlay' });
  const drawer = App.el('div', { class: 'hgw-drawer' });
  const head = App.el('div', { class: 'hgw-drawer-head' });
  head.innerHTML = '<div class="dtitle">' + App.esc(opts.title || '') + '</div>';
  const closeBtn = App.el('button', { class: 'mclose' }, '✕');
  closeBtn.addEventListener('click', close);
  head.appendChild(closeBtn);
  const body = App.el('div', { class: 'hgw-drawer-body' });
  if (typeof opts.body === 'string') body.innerHTML = opts.body;
  else if (opts.body) body.appendChild(opts.body);
  drawer.appendChild(head);
  drawer.appendChild(body);
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
  function close() {
    drawer.classList.add('hide');
    overlay.classList.add('hide');
    setTimeout(() => { overlay.remove(); drawer.remove(); if (opts.onClose) opts.onClose(); }, 250);
  }
  overlay.addEventListener('click', close);
  return { overlay, drawer, body, close };
};

/* ========== 飘字特效 ========== */
App.UI.floatNum = function (text, cls, x, y) {
  const el = App.el('div', { class: 'hgw-float-num ' + (cls || '') }, App.esc(text));
  el.style.left = (x != null ? x : window.innerWidth / 2 - 20) + 'px';
  el.style.top = (y != null ? y : window.innerHeight / 2 - 30) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
};

/* ========== 魔咒闪光 ========== */
App.UI.spellFlash = function (color) {
  const el = App.el('div', { class: 'hgw-spell-flash ' + (color || 'gold') });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 450);
};

/* ========== 金粉撒落 ========== */
App.UI.confetti = function (n) {
  n = n || 40;
  const colors = ['#e8d48b', '#c9a227', '#7fd0a8', '#d4537e', '#8e7cc3', '#e74c3c'];
  for (let i = 0; i < n; i++) {
    const el = App.el('div', { class: 'hgw-confetti' });
    const size = App.rand(4, 9);
    el.style.cssText = 'left:' + (Math.random() * 100) + 'vw;width:' + size + 'px;height:' + size + 'px;background:' + App.pick(colors) + ';animation-duration:' + (App.rand(18, 30) / 10) + 's;animation-delay:' + (Math.random() * 1.5) + 's;border-radius:' + (Math.random() > 0.5 ? '50%' : '2px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
};

/* ========== 结算块渲染（消息内显示） ========== */
App.UI.renderSettleBlock = function (text) {
  // 把 【xxx结算】 摘要化显示
  return text
    .replace(/【(对抗|双修|突破|多人对抗|高潮|炼药|完成)结算】/g, '<span class="settle-tag">【$1结算】</span>')
    .replace(/【(对抗|双修|突破|多人对抗|高潮|炼药|完成)结算】/g, '<span class="settle-tag">【$1】</span>');
};

/* ========== 进度条 HTML ========== */
App.UI.bar = function (val, color, label, showNum) {
  const v = App.clamp(val || 0, 0, 100);
  const c = color || '';
  return '<div class="hgw-bar-label"><span>' + App.esc(label || '') + '</span>' +
    (showNum !== false ? '<span class="num">' + Math.round(v) + (showNum === 'pct' ? '%' : '') + '</span>' : '') +
    '</div><div class="hgw-bar ' + c + '"><i style="width:' + v + '%"></i></div>';
};

/* ========== 空状态 ========== */
App.UI.empty = function (icon, text) {
  return '<div class="hgw-empty"><span class="icon">' + icon + '</span><span>' + App.esc(text) + '</span></div>';
};

/* ========== 加载态 ========== */
App.UI.loading = function (text) {
  return '<div class="hgw-loading"><span class="spinner"></span><span>' + App.esc(text || '加载中…') + '</span></div>';
};
