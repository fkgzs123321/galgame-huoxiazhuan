
(function () {
  var NS = 'ymq';
  var ROOT = document.getElementById(NS + '-root');
  if (!ROOT) return;
  /* ★★ 防重入（照同级生2）：切 swipe 后这块会重新渲染，不加这个就会反复重跑、卡死 */
  if (ROOT.getAttribute('data-' + NS + '-init') === '1') return;
  ROOT.setAttribute('data-' + NS + '-init', '1');

  var 难度 = '';      // 不预选
  var 场景 = '0';     // 默认停在第 1 条
  var 已定 = false;

  /* ── 读写：照同级生2，只三条。难度存 chat 层 —— 切 swipe 会重建 message 层的变量，
        而 chat 层不会被动，所以难度放在 chat 层才留得住。 ── */
  function allVars() {
    try { return (typeof getVariables === 'function' ? getVariables({ type: 'chat' }) : {}) || {}; }
    catch (e) { return {}; }
  }
  function walk(o, p) {
    var q = String(p || '').replace(/^stat_data\./, '').split('.');
    var c = (o && o.stat_data !== undefined) ? o.stat_data : o;
    for (var i = 0; i < q.length && c != null; i++) c = c[q[i]];
    return c;
  }
  function setLocal(o, p, v) {
    var q = String(p).replace(/^stat_data\./, '').split('.');
    if (o.stat_data === undefined) o.stat_data = {};
    var c = o.stat_data;
    for (var i = 0; i < q.length - 1; i++) { if (typeof c[q[i]] !== 'object' || c[q[i]] === null) c[q[i]] = {}; c = c[q[i]]; }
    c[q[q.length - 1]] = v;
  }
  function set(p, v) {
    var full = 'stat_data.' + String(p).replace(/^stat_data\./, '');
    try { if (typeof updateVariablesWith === 'function') updateVariablesWith(function (x) { x = x || {}; setLocal(x, full, v); return x; }, { type: 'chat' }); } catch (e) {}
    try {
      if (typeof updateVariablesWith === 'function' && typeof getCurrentMessageId === 'function')
        updateVariablesWith(function (x) { x = x || {}; setLocal(x, full, v); return x; }, { type: 'message', message_id: getCurrentMessageId() });
    } catch (e) {}
    try { if (typeof triggerSlash === 'function') triggerSlash('/setvar 欲妈群难度 ' + JSON.stringify(v)); } catch (e) {}
  }

  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('#ymq-diff button'), function (b) {
      b.className = (b.getAttribute('data-d') === 难度) ? 'on' : '';
    });
    Array.prototype.forEach.call(document.querySelectorAll('#ymq-start button'), function (b) {
      b.className = (b.getAttribute('data-s') === 场景) ? 'on' : '';
    });
    var ok = document.getElementById('ymq-ok');
    if (已定) { ok.disabled = true; ok.textContent = '已经定下来了'; }
    else if (!难度) { ok.disabled = true; ok.textContent = '先选一个难度'; }
    else { ok.disabled = false; ok.textContent = '定下来，开始：' + 难度 + ' · 「' + 场景 + '」'; }
  }

  Array.prototype.forEach.call(document.querySelectorAll('#ymq-diff button'), function (b) {
    b.addEventListener('click', function () { 难度 = b.getAttribute('data-d'); render(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('#ymq-start button'), function (b) {
    b.addEventListener('click', function () { 场景 = b.getAttribute('data-s'); render(); });
  });

  /* ★ 确认后「触发对应的开场场景」（照同级生2） */
  document.getElementById('ymq-ok').addEventListener('click', async function () {
    if (已定 || !难度) return;
    var ok = document.getElementById('ymq-ok'), d = document.getElementById('ymq-done');
    ok.disabled = true; ok.textContent = '正在开局…';
    /* ★ 难度不再写成变量：15 个开局各自带 initvar（里面已经写好难度），切 swipe 就等于定了难度。 */
    var 难序={"普通":0,"困难":1,"地狱":2}[难度]||0;
    var 场序=parseInt(场景, 10) || 0;
    var swipe_id=难序*5+场序;
    try {
      if (typeof setChatMessages === 'function') {
        await setChatMessages([{ message_id: 0, swipe_id: swipe_id }]);
        已定 = true;
        d.textContent = '已定：' + 难度 + '。切到那一刻了 —— 这条消息往上滑一层就是开局。';
      } else throw new Error('没有 setChatMessages');
    } catch (e) {
      try {
        if (typeof generate === 'function') {
          generate({ user_input: '【开局】他定下了难度「' + 难度 + '」。从第 ' + (swipe_id + 1) + ' 条开场白那一刻开始。', should_stream: true });
          已定 = true;
          d.textContent = '已定：' + 难度 + '。由她开第一局。';
          render(); return;
        }
      } catch (e2) {}
      已定 = true;
      d.textContent = '难度已写入，但没能自动跳转（' + e.message + '）。请手动把开场白切到第 ' + (swipe_id + 1) + ' 条。';
    }
    render();
  });

  render();
})();
