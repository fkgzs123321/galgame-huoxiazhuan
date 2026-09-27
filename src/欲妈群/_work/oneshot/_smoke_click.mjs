// 冒烟 2：点按钮 —— 顺着 / 拒 / 交给她判 / 掷自定义 / 切主题 / 点成员 / 后门反抗
import fs from 'fs';
import { createRequire } from 'module';
const require2 = createRequire('E:/Games/写卡/_tmpdom/');
const { JSDOM, VirtualConsole } = require2('jsdom');

const P = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/正则/状态栏.html';
let html = fs.readFileSync(P, 'utf8').replace(/^\uFEFF?\s*```(?:html|HTML)?\s*\r?\n/, '').replace(/\r?\n```\s*$/, '');

const STAT = {
  元数据: { 日数: 7, 小时: 9, 时段: '上午', 回合: 3, 难度: '普通', 高考日: 100 },
  玩家: { 学业: { 成绩: 63 }, 心理: { 理智: 74, 欲望: 41, 兴奋: 12, 怀疑: 9 }, 技能: { 观察: 22, 行动: 17, 意志: 31 }, 警觉度: 44, 证据清单: '', _本轮判定: {} },
  郝佳期: { 阶段: 3, 阶段进度: 46, 阶段起始日: 4, 群等级: 3, 积分: 5, 心理: { 理智: 61, 勇气: 70, 痴迷: 48, 兴奋: 55, 暴露恐惧: 33 }, 关系: { 信任度: 71 }, 后门进度: 72, 后门已发现: true, 后门已利用: false },
  群: { 成员数: 12, 在线数: 5, 活跃度: 81, 今日主题: '主题X', 周冠军UID: 'hao_jiaqi', 暴露风险: 10, 秘密任务: { 进行中: false }, 联盟: {}, 周竞赛历史: '', 成员详情: {} },
  假阳具: { 当前持有者: 'hao_jiaqi', 是否激活: true, 借用者: '' },
  阶段守卫: { 结局已触发: false },
  局面: { 当前选项: { 一: { 文本: '她凑得更近', 等级: '微', 代价: '警觉+3', 技能: '观察', 主对: '识破' }, 二: { 文本: '她抬手机', 等级: '中', 代价: '', 技能: '行动', 主对: '拦住' }, 三: { 文本: '', 等级: '微', 代价: '', 技能: '行动', 主对: '拦住' }, 四: { 文本: '', 等级: '微', 代价: '', 技能: '行动', 主对: '拦住' } }, 她已选: '', 自定义: { 文本: '翻身装睡', 技能: '意志', 等级: '强', 主对: '扛住', 待掷: true } },
  设置: { 主题: '夜间' }
};

const 日志 = [];
const 写入 = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/CSS/.test(e.message)) 日志.push('JSDOM: ' + e.message.slice(0, 200)); });
const dom = new JSDOM(html, {
  runScripts: 'dangerously', virtualConsole: vc,
  beforeParse(w) {
    w.console.warn = (...a) => 日志.push('warn: ' + a.map(String).join(' ').slice(0, 160));
    w.console.error = (...a) => 日志.push('err: ' + a.map(String).join(' ').slice(0, 160));
    w.getLastMessageId = () => 0;
    w.getVariables = (o) => (/message/.test(String(o.type)) && o.message_id === 0) ? { stat_data: STAT } : {};
    w.updateVariablesWith = (fn, o) => { 写入.push(String(o && o.type)); fn({ stat_data: STAT }); return true; };
    w.getChatMessages = () => [{ message_id: 0, swipe_id: 0 }];
    w.triggerSlash = () => true;
    w.getCurrentMessageId = () => 0;
  }
});
const w = dom.window, d = w.document;
const 等 = ms => new Promise(r => setTimeout(r, ms));
await 等(300);

async function 点(sel, 名) {
  const el = d.querySelector(sel);
  if (!el) { console.log('✗ ' + 名 + '：找不到 ' + sel); return; }
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await 等(150);
  const r = d.getElementById('ymq-res');
  console.log('· ' + 名 + ' → 结果区: ' + JSON.stringify(((r && r.textContent) || '').slice(0, 70)) + ' | 结果区显示:' + (r && !r.hidden));
}

await 点('[data-act="do"][data-k="一"]', '顺着·第一条');
await 点('[data-act="no"][data-k="二"]', '拒·第二条');
await 点('[data-act="watch"]', '我不动就看着她');
await 点('[data-act="rollcx"]', '掷自定义');
await 点('[data-act="roll"][data-skill="观察"]', '单掷·观察');
await 点('[data-act="roll"][data-skill="后门反抗"]', '后门反抗');
await 点('[data-act="theme"][data-val="浅色"]', '切浅色主题');
await 点('[data-uid="su_mei"]', '点成员(苏媚)');
await 点('[data-act="refresh"]', '刷新按钮');

console.log('\n写入变量次数: ' + 写入.length + '（通道: ' + [...new Set(写入)].join(',') + '）');
console.log('主题属性: ' + d.documentElement.getAttribute('data-theme'));
console.log('判定写入: ' + JSON.stringify(STAT.玩家._本轮判定));
console.log('警觉度: ' + STAT.玩家.警觉度 + '　技能: ' + JSON.stringify(STAT.玩家.技能));
console.log('\n=== 告警 ' + 日志.length + ' 条 ===');
日志.slice(0, 10).forEach(x => console.log('  ' + x));
process.exit(0);
