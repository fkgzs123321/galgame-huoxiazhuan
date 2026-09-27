// 验证新版开局表单（照同级生2 结构）：防重入 + chat 层难度 + 切 swipe
import fs from 'fs';
const HTML = fs.readFileSync('E:/Games/写卡/tavern_helper_template/src/欲妈群/正则/开局选择界面.html', 'utf8');
const 脚本 = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];

const 日志 = [];
const 世界 = {
  chat: {},                                   // chat 层
  msg: { 0: { stat_data: { 元数据: { 难度: '普通' } } } },
  lastMsgId: 5, curMsgId: 0,
};

const updateVariablesWith = (fn, o) => {
  if (o.type === 'chat') { const box = {}; fn(box); 世界.chat = Object.assign(世界.chat, box); 日志.push('updateVariablesWith(chat)'); }
  else { const id = o.message_id === 'latest' ? 世界.lastMsgId : o.message_id; 世界.msg[id] = 世界.msg[id] || {}; fn(世界.msg[id]); 日志.push('updateVariablesWith(message ' + id + ')'); }
};
const triggerSlash = (cmd) => { 日志.push('triggerSlash: ' + cmd); const m = /^\/setvar (\S+) (.*)$/.exec(cmd); if (m) { 世界.chat[m[1].replace(/^stat_data\./, '')] = JSON.parse(m[2]); } };
const getVariables = (o) => (o && o.type === 'chat' ? 世界.chat : 世界.msg[世界.lastMsgId]) || {};
const getCurrentMessageId = () => 0;
const getLastMessageId = () => 世界.lastMsgId;
const setChatMessages = async (arr) => {
  日志.push('★ setChatMessages(' + JSON.stringify(arr) + ')  ← 切 swipe');
  世界.msg[0] = { stat_data: { 元数据: { 难度: '普通' } } };   // 模拟 initvar 重建 message 层
  日志.push('   （切 swipe → message 层被 initvar 重建，chat 层不动）');
};

// DOM 假件（带 dataset）
const 元素 = {};
function mk(id, dataKey, val) {
  const el = { id, textContent: '', disabled: false, className: '', addEventListener(t, f) { el['on' + t] = f; },
    getAttribute(k) { return k === dataKey ? val : null; }, setAttribute() { }, _attr: {} };
  元素[id] = el; return el;
}
mk('ymq-root', 'data-ymq-init', null); 元素['ymq-root']._attr = {};
元素['ymq-root'].getAttribute = function (k) { return this._attr[k] || null; };
元素['ymq-root'].setAttribute = function (k, v) { this._attr[k] = v; };
mk('ymq-ok'); mk('ymq-done');
const 难度钮 = ['普通', '困难', '地狱'].map(d => mk('d' + d, 'data-d', d));
const 起点钮 = ['0', '1', '2', '3', '4'].map(s => mk('s' + s, 'data-s', s));
const document = {
  getElementById: id => 元素[id] || mk(id),
  querySelectorAll: sel => sel.indexOf('ymq-diff') >= 0 ? 难度钮 : 起点钮,
  addEventListener() { },
};

console.log('══ 场景：玩家在第 5 楼，回来点开局表单选「地狱」+ 第 3 条场景 ══\n');
new Function('document', 'updateVariablesWith', 'triggerSlash', 'getVariables', 'getCurrentMessageId', 'getLastMessageId', 'setChatMessages', 'console', 'setTimeout',
  脚本)(document, updateVariablesWith, triggerSlash, getVariables, getCurrentMessageId, getLastMessageId, setChatMessages, console, setTimeout);

(async () => {
  元素['d地狱'].onclick();
  元素['s2'].onclick();
  await 元素['ymq-ok'].onclick();
  await new Promise(r => setTimeout(r, 30));
  console.log('── 调用序列 ──');
  日志.forEach(l => console.log('  ' + l));
  console.log('\n── 结果 ──');
  console.log('  chat 层 欲妈群难度        = ' + JSON.stringify(世界.chat['欲妈群难度']));
  console.log('  message 第 0 楼 难度      = ' + JSON.stringify(世界.msg[0].stat_data.元数据.难度) + '（被 initvar 重置，符合预期）');
  console.log('  界面提示                  = ' + 元素['ymq-done'].textContent);
  console.log('\n── 防重入测试（模拟切 swipe 后表单重渲染） ──');
  元素['ymq-root']._attr = { 'data-ymq-init': '1' };   // 上面已经 setAttribute 过
  const 前 = 日志.length;
  new Function('document', 'updateVariablesWith', 'triggerSlash', 'getVariables', 'getCurrentMessageId', 'getLastMessageId', 'setChatMessages', 'console', 'setTimeout',
    脚本)(document, updateVariablesWith, triggerSlash, getVariables, getCurrentMessageId, getLastMessageId, setChatMessages, console, setTimeout);
  console.log('  重跑后新增调用数 = ' + (日志.length - 前) + (日志.length === 前 ? '  ✅ 防重入生效（没有重复初始化）' : '  ❌ 又跑了一遍'));
})();
