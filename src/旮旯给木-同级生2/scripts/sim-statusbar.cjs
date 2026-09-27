// 用桩环境执行状态栏的 JS，抓出 render() 抛在哪
// 桩：document / getVariables / Mvu / SillyTavern / MutationObserver / $
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');

const 数据 = JSON.parse(fs.readFileSync(path.join(D, '世界书/变量/initvar.yaml').replace(/\.yaml$/, '.yaml'), 'utf8').length ? '{}' : '{}');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const stat = YAML.parse(fs.readFileSync(path.join(D, '世界书/变量/initvar.yaml'), 'utf8'));

function 造DOM() {
  const 节点 = {};
  const mk = (id) => ({
    id, textContent: '', innerHTML: '', className: '', hidden: false, disabled: false,
    style: { setProperty() {}, width: '' },
    setAttribute() {}, getAttribute() { return ''; },
    addEventListener() {}, appendChild() {}, querySelectorAll() { return []; },
    classList: { add() {}, remove() {} }, dataset: {},
  });
  return {
    getElementById(id) { if (!节点[id]) 节点[id] = mk(id); return 节点[id]; },
    querySelectorAll() { return []; },
    createElement: mk,
    body: { appendChild() {} },
    addEventListener() {},
  };
}

const html = fs.readFileSync(path.join(D, '正则/状态栏界面.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const code = m[1];

const sandbox = {
  document: 造DOM(),
  window: {}, console,
  getVariables: (o) => (o && o.type === 'chat' ? { stat_data: stat } : { stat_data: stat }),
  Mvu: {
    getMvuData: () => ({ stat_data: stat }),
    eventOn: () => {}, events: { VARIABLE_UPDATE_ENDED: 'v' },
  },
  waitGlobalInitialized: async () => {},
  SillyTavern: { getContext: () => ({ eventSource: { on() {} }, eventTypes: {} }) },
  MutationObserver: class { observe() {} },
  setInterval: () => {}, setTimeout: () => {},
  $: (s) => { const o = { each() { return o; }, attr() { return ''; }, css() { return o; }, length: 0 }; return o; },
  updateVariablesWith: () => {}, triggerSlash: () => {},
  getCurrentMessageId: () => 1, generate: () => {}, setChatMessages: async () => {},
};

try {
  const fn = new Function(...Object.keys(sandbox), 'return ' + code);
  const r = fn(...Object.values(sandbox));
  if (r && typeof r.then === 'function') {
    r.then(() => console.log('✅ render() 执行完成，无异常')).catch(e => console.log('❌ 异步抛错: ' + e.message + '\n' + String(e.stack).split('\n').slice(0, 4).join('\n')));
  } else console.log('✅ 同步执行完成');
} catch (e) {
  console.log('❌ 抛错: ' + e.message);
  console.log(String(e.stack).split('\n').slice(0, 6).join('\n'));
}
