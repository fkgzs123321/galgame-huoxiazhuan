/* ============================================================
   霍格沃茨 · 同层应用 启动装配
   ============================================================ */
'use strict';

/* 等待 DOM 就绪后启动 */
(function () {
  function boot() {
    if (!document.getElementById('hgw-app')) {
      // 应用 HTML 尚未注入（srcdoc 场景下 script 在 body 内执行，DOM 已存在）
      // 此处兜底：等待
      setTimeout(boot, 50);
      return;
    }
    App.start().then(() => {
      console.log('[HGW] 霍格沃茨同层应用启动完成 v1.0');
      // 心跳：向宿主 shell 上报启动完成（供 loading 收敛与失败检测）
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            channel: 'hgw-rpc-v1', event: 'app_ready',
            height: Math.max(document.body ? document.body.scrollHeight : 0, window.innerHeight || 900),
          }, '*');
        }
      } catch (e) { }
    }).catch(e => {
      console.error('[HGW] 启动失败:', e);
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ channel: 'hgw-rpc-v1', event: 'app_error', error: String((e && e.message) || e) }, '*');
        }
      } catch (e2) { }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
