// 模拟 ST/MVU 环境，真跑一遍开局表单的「选难度 → 确认」流程，看它到底写没写进去
import fs from 'fs';

const HTML = fs.readFileSync('E:/Games/写卡/tavern_helper_template/src/欲妈群/正则/开局选择界面.html', 'utf8');
const 脚本 = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];

// ── 假环境：把 ST/MVU 的全局都做出来，并记录每一次调用
const 日志 = [];
const 世界 = {
  // 楼层变量（message 层）：第 0 楼 = 开场白所在楼
  msg: { 0: { stat_data: { 元数据: { 难度: '普通', 日数: 1 }, 局面: { 当前选项: {} } } } },
  chat: {},                       // chat 层（/setvar 写这里）
  curMsgId: 0,                    // 表单在第 0 楼
  lastMsgId: 5,                   // ★ 但最新楼层是 5（模拟"玩家已经聊了几楼"）
  setChatMessages: null,
};

const win = {
  Mvu: {
    getMvuData: (o) => {
      const id = o.message_id === 'latest' ? 世界.lastMsgId : o.message_id;
      日志.push('Mvu.getMvuData(' + JSON.stringify(o) + ') → 取楼层 ' + id);
      return JSON.parse(JSON.stringify(世界.msg[id] || { stat_data: {} }));
    },
    replaceMvuData: async (d, o) => {
      const id = o.message_id === 'latest' ? 世界.lastMsgId : o.message_id;
      日志.push('★ Mvu.replaceMvuData → 楼层 ' + id + '　难度=' + (d.stat_data && d.stat_data.元数据 && d.stat_data.元数据.难度));
      世界.msg[id] = d;
    },
  },
};

const updateVariablesWith = (fn, o) => {
  const id = o.type === 'chat' ? 'chat' : (o.message_id === 'latest' ? 世界.lastMsgId : o.message_id);
  const box = o.type === 'chat' ? 世界.chat : (世界.msg[id] = 世界.msg[id] || {});
  fn(o.type === 'chat' ? box : box);         // 简化：直接改那一层
  日志.push('updateVariablesWith(type=' + o.type + ', message_id=' + o.message_id + ')');
};
const triggerSlash = async (cmd) => { 日志.push('triggerSlash: ' + cmd); if (/^\/setvar 欲妈群难度/.test(cmd)) { 世界.chat.欲妈群难度 = cmd.split(' ').pop().replace(/"/g, ''); } };
const getvar = (p, o) => {
  const k = String(p).replace(/^stat_data\./, '');
  const 末 = 世界.msg[世界.lastMsgId] && 世界.msg[世界.lastMsgId].stat_data;
  let v = 末;
  for (const seg of k.split('.')) v = v && v[seg];
  return v === undefined ? (o && o.defaults) : v;
};
const getLastMessageId = () => 世界.lastMsgId;
const getCurrentMessageId = () => 世界.curMsgId;
const setChatMessages = async (arr) => {
  日志.push('★ setChatMessages(' + JSON.stringify(arr) + ')  ← 切 swipe');
  const m = arr[0];
  if (m && m.message_id === 0) {
    // 切 swipe = 用该开场白的 initvar 重建整份变量
    世界.msg[0] = { stat_data: JSON.parse(fs.readFileSync('E:/Games/写卡/tavern_helper_template/src/欲妈群/世界书/变量/initvar.yaml', 'utf8') ? JSON.stringify({ 元数据: { 难度: '普通', 日数: 1 } }) : '{}') };
    日志.push('   （切 swipe 后 MVU 用 initvar 重建 → 难度被重置成 ' + 世界.msg[0].stat_data.元数据.难度 + '）');
  }
};

// ── DOM 假件
const 元素 = {};
const mk = (id, tag) => (元素[id] = { id, tag, textContent: '', disabled: false, className: '', value: '', addEventListener: (t, f) => { 元素[id]['on' + t] = f; }, getAttribute: (k) => 元素[id]['data-' + k] });
['ymq-ok', 'ymq-done'].forEach(id => mk(id, 'button'));
const 难度按钮 = ['普通', '困难', '地狱'].map(d => mk('d-' + d, 'button') && 元素['d-' + d]);
难度按钮.forEach((b, i) => { b.dataset = { d: ['普通', '困难', '地狱'][i] }; b.getAttribute = () => ['普通', '困难', '地狱'][i]; });
const 起点按钮 = ['0', '1', '2', '3', '4'].map(s => { const b = mk('s-' + s, 'button'); b.getAttribute = () => s; return b; });

const document = {
  getElementById: (id) => 元素[id] || (元素[id] = { id, textContent: '', disabled: false, className: '' }),
  querySelectorAll: (sel) => sel.indexOf('ymq-diff') >= 0 ? 难度按钮 : 起点按钮,
  addEventListener: () => { },
};

// ── 跑
const 沙箱 = { window: win, Mvu: win.Mvu, updateVariablesWith, triggerSlash, getvar, getLastMessageId, getCurrentMessageId, setChatMessages, document, console, setTimeout, Promise, JSON, String, Number, Array, Object };

console.log('══ 场景：玩家已经聊到第 5 楼，回来点开局表单选「地狱」 ══\n');
new Function('window', 'Mvu', 'updateVariablesWith', 'triggerSlash', 'getvar', 'getLastMessageId', 'getCurrentMessageId', 'setChatMessages', 'document', 'console', 'setTimeout',
  脚本)(win, win.Mvu, updateVariablesWith, triggerSlash, getvar, getLastMessageId, getCurrentMessageId, setChatMessages, document, console, setTimeout);

// 模拟：点「地狱」→ 点确认
(async () => {
  元素['d-地狱'].onclick && 元素['d-地狱'].onclick();
  await (元素['ymq-ok'].onclick && 元素['ymq-ok'].onclick());
  await new Promise(r => setTimeout(r, 50));
  console.log('── 调用序列 ──');
  日志.forEach(l => console.log('  ' + l));
  console.log('\n── 结果 ──');
  console.log('  第 0 楼 stat_data.元数据.难度 = ' + JSON.stringify(世界.msg[0] && 世界.msg[0].stat_data.元数据.难度));
  console.log('  第 5 楼 stat_data.元数据.难度 = ' + JSON.stringify(世界.msg[5] && 世界.msg[5].stat_data && 世界.msg[5].stat_data.元数据 && 世界.msg[5].stat_data.元数据.难度));
  console.log('  chat 层 欲妈群难度       = ' + JSON.stringify(世界.chat.欲妈群难度));
  console.log('  界面提示                 = ' + 元素['ymq-done'].textContent);
})();
