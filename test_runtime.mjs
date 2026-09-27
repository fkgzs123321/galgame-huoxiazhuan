// 用模拟的浏览器环境执行 script 块，捕获运行时错误
import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('src/欲妈群/正则/状态栏.html', 'utf-8');

// 提取 script 块
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.log('❌ 未找到 script 块');
  process.exit(1);
}
const scriptCode = scriptMatch[1];

// 构造模拟的 DOM 和浏览器环境
const elements = new Map();

function makeElement(id) {
  return {
    id: id,
    innerHTML: '',
    innerText: '',
    textContent: '',
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); },
    },
    attributes: {},
    getAttribute(name) { return this.attributes[name] || null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    hasAttribute(name) { return name in this.attributes; },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener(event, handler, capture) {
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push({ handler, capture });
    },
    closest(selector) { return null; },
    parentElement: null,
    tagName: 'DIV',
    _children: [],
    appendChild(child) { this._children.push(child); return child; },
  };
}

const rootElement = makeElement('sb-root');
const bodyElement = makeElement('sb-body');
const contentElement = makeElement('sb-content');
contentElement.innerHTML = '<div class="uninit-state" id="sb-placeholder">⏳ 欲妈群状态栏启动中…</div>';
const documentElement = makeElement('documentElement');
documentElement.attributes = {};

const document = {
  getElementById(id) {
    if (id === 'sb-root') return rootElement;
    if (id === 'sb-body') return bodyElement;
    if (id === 'sb-content') return contentElement;
    if (id === 'sb-placeholder') return { innerHTML: '', innerText: '⏳ 欲妈群状态栏启动中…' };
    return null;
  },
  documentElement: documentElement,
  body: bodyElement,
  createElement(tag) { return makeElement(tag); },
  addEventListener(event, handler) {},
};

const window_obj = {
  _: undefined,
  Mvu: undefined,
  parent: null,  // 会设为自身
  top: null,
  location: { origin: 'http://localhost:7777' },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; },
  },
  addEventListener(event, handler) {},
  postMessage(data, origin) {},
  frameElement: null,
  message_id: 0,
};

window_obj.parent = window_obj;
window_obj.top = window_obj;
window_obj.window = window_obj;

const context = {
  window: window_obj,
  document,
  console: {
    log: (...args) => console.log('[页面日志]', ...args),
    error: (...args) => console.error('[页面错误]', ...args),
    warn: (...args) => console.warn('[页面警告]', ...args),
    info: (...args) => console.info('[页面信息]', ...args),
  },
  setTimeout: (fn, ms) => {
    // 不实际执行 setTimeout，只记录
    return 0;
  },
  clearTimeout: () => {},
  Date: Date,
  Math: Math,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  JSON: JSON,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Error: Error,
  RegExp: RegExp,
  Promise: Promise,
};

// 将 window 的属性复制到全局
for (const k of Object.keys(window_obj)) {
  context[k] = window_obj[k];
}
context.window = window_obj;
context.document = document;
context.console = context.console;
context.setTimeout = context.setTimeout;
context.clearTimeout = context.clearTimeout;
context.Date = Date;
context.Math = Math;
context.parseInt = parseInt;
context.parseFloat = parseFloat;
context.isNaN = isNaN;
context.JSON = JSON;
context.Array = Array;
context.Object = Object;
context.String = String;
context.Number = Number;
context.Boolean = Boolean;
context.Error = Error;
context.RegExp = RegExp;
context.Promise = Promise;

// 创建上下文
vm.createContext(context);

// 执行 script
console.log('开始执行 script 块...');
console.log('Script 长度:', scriptCode.length);

try {
  vm.runInContext(scriptCode, context, { filename: 'statusbar.js', timeout: 5000 });
  console.log('✓ Script 执行完成（无错误）');
} catch (e) {
  console.log('✗ Script 执行出错:');
  console.log('  错误类型:', e.name);
  console.log('  错误消息:', e.message);
  if (e.stack) {
    console.log('  堆栈:');
    e.stack.split('\n').forEach((line, i) => {
      if (i < 10) console.log('    ' + line);
    });
  }
}

// 检查执行后的状态
console.log('\n=== 执行后状态检查 ===');
console.log('window._ 类型:', typeof context.window._);
console.log('window._ 是函数:', typeof context.window._ === 'function');
console.log('window._.get 是否存在:', typeof context.window._?.get === 'function');
console.log('DEFAULT_STAT 类型:', typeof context.DEFAULT_STAT);
console.log('State 类型:', typeof context.State);
console.log('render 类型:', typeof context.render);
console.log('renderContent 类型:', typeof context.renderContent);

if (typeof context.State === 'object' && context.State) {
  console.log('State.stat 是否有数据:', !!context.State.stat);
  console.log('State.error:', context.State.error);
  console.log('State.refreshing:', context.State.refreshing);
}

if (contentElement.innerHTML) {
  console.log('\n=== #sb-content 内容 ===');
  console.log('innerHTML 长度:', contentElement.innerHTML.length);
  console.log('innerHTML 前200字符:', contentElement.innerHTML.slice(0, 200));
  if (contentElement.innerHTML.includes('启动中')) {
    console.log('⚠ 仍显示"启动中" - render() 未被调用或失败');
  } else if (contentElement.innerHTML.includes('error-state')) {
    console.log('⚠ 显示错误信息');
  } else {
    console.log('✓ 已渲染内容');
  }
} else {
  console.log('\n⚠ #sb-content innerHTML 为空');
}
