import '../preview';
import { waitUntil } from 'async-wait-until';
import App from './App.vue';
import './global.css';

/**
 * 状态栏启动。
 *
 * ★ 按 AGENTS.md：禁用 DOMContentLoaded，用 jQuery 加载时机 ——
 *   前端界面可能以 `$('body').load(网络链接)` 形式加载，那条路径上
 *   DOMContentLoaded 不会触发。
 */
async function boot() {
  if (typeof waitGlobalInitialized === 'function') {
    await waitGlobalInitialized('Mvu');
  }

  // 等到楼层变量真出现 stat_data 再挂载，避免首帧读到空
  await waitUntil(() => _.has(getVariables({ type: 'message' }), 'stat_data'), {
    timeout: 60_000,
  });

  createApp(App).use(createPinia()).mount('#app');
  console.info('[活侠传] 状态栏已挂载');
}

$(() => {
  errorCatched(boot)();
});

$(window).on('pagehide', () => {
  console.info('[活侠传] 状态栏卸载');
});
