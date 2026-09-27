import '../preview';
import { waitUntil } from 'async-wait-until';
import App from './App.vue';

async function boot() {
  if (typeof waitGlobalInitialized === 'function') {
    await waitGlobalInitialized('Mvu');
  }
  await waitUntil(() => _.has(getVariables({ type: 'message' }), 'stat_data'));
  createApp(App).use(createPinia()).mount('#app');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot(), { once: true });
} else {
  void boot();
}
