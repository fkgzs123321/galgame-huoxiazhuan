import '../preview';
import { waitUntil } from 'async-wait-until';
import App from './App.vue';
import '../状态栏/global.css';

/**
 * 开局表单启动。
 *
 * ★ 与状态栏同一套启动纪律（AGENTS.md）：
 *   禁用 DOMContentLoaded，用 jQuery 的加载时机 ——
 *   前端界面可能以 `$('body').load(网络链接)` 形式加载，那条路径上
 *   DOMContentLoaded 不会触发。
 *
 * ★ 等 stat_data 落表再挂载：表单要读写 MVU 变量，
 *   早挂载会读到 undefined。
 */
async function boot() {
  if (typeof waitGlobalInitialized === 'function') {
    await waitGlobalInitialized('Mvu');
  }

  await waitUntil(() => _.has(getVariables({ type: 'message' }), 'stat_data'), {
    timeout: 60_000,
  });

  createApp(App).use(createPinia()).mount('#app');
  console.info('[活侠传] 开局表单已挂载');
}

$(() => {
  errorCatched(boot)();
});

$(window).on('pagehide', () => {
  console.info('[活侠传] 开局表单卸载');
});
