// 冒烟：把面板塞进 jsdom 跑一遍，看 同步()/补宏() 有没有报错、值有没有填上
import fs from 'fs';
import { createRequire } from 'module';
const require2 = createRequire('E:/Games/写卡/_tmpdom/');
const { JSDOM } = require2('jsdom');

const P = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/正则/状态栏.html';
let html = fs.readFileSync(P, 'utf8').replace(/^\uFEFF?\s*```(?:html|HTML)?\s*\r?\n/, '').replace(/\r?\n```\s*$/, '');

// 造一份变量（照 initvar.yaml）
const yaml = fs.readFileSync('E:/Games/写卡/tavern_helper_template/src/欲妈群/世界书/变量/initvar.yaml', 'utf8');

const STAT = {
  元数据: { 日数: 7, 小时: 9, 时段: '上午', 回合: 3, 难度: '困难', 高考日: 100 },
  玩家: { 姓名: '', 学校: '上海市上海中学', 学业: { 成绩: 63 }, 身体: { 体力: 71, 性欲: 88 },
    心理: { 理智: 74, 欲望: 41, 兴奋: 12, 怀疑: 9 }, 技能: { 观察: 22, 行动: 17, 意志: 31 },
    察觉值: { 假阳具真相: 18, 群存在: 26, 母亲欲望: 37, 幻触: 12 }, 今日: { 射精次数: 2, 幻触次数: 1 },
    警觉度: 44, 证据清单: '视频、纸团',
    _本轮判定: { 行为: '行动', 投掷: [63.21], 综合: '成功', 警觉: 5, 说明: '做成了，代价记在账上。' } },
  郝佳期: { 群等级: 4, 积分: 120, 阶段: 3, 阶段进度: 46, 阶段起始日: 4,
    心理: { 兴奋: 55, 润滑: 44, 理智: 61, 痴迷: 48, 罪恶感: 22, 勇气: 70, 暴露恐惧: 33, 此刻想法: '他今天安静得反常。' },
    关系: { 亲密度: 66, 信任度: 71, 边界: 58, 叛逆恐惧: 62 },
    统计: { 偷抚次数: 9, 诱导射精: 4, 假阳具使用: 6, 暴露次数: 1 },
    竞赛: { 今日排名: '第2', 今日得分: 33 },
    后门类型: '情感缺口', 后门描述: '她最怕被当成“只有这副身子还有用”。', 后门策略: '先示弱，再让他心疼。',
    后门已发现: true, 后门已利用: false, 后门进度: 72 },
  假阳具: { 当前持有者: 'su_mei', 持有起始日: 5, 持有到期日: 12, 绑定目标: '主角', 今日使用: 3, 上次使用时: -4, 是否激活: true, 借用者: 'lin_wanqing', 借用期限: 2 },
  群: { 成员数: 12, 在线数: 5, 活跃度: 81, 今日主题: '拍到儿子晨勃的高清特写', 暴露风险: 27,
    秘密任务: { 成员: '苏媚', 内容: '拍一段他醒着的正脸', 期限日: 9, 进行中: true },
    联盟: { su_mei: '盟友', lin_wanqing: '对手' }, 周冠军UID: 'hao_jiaqi', 周竞赛历史: '1|郝佳期',
    成员详情: {
      su_mei: { 姓名: '苏媚', 角色: '群主', 儿子名: '（无儿子）', 等级: 5, 在线: true, 阶段: 5, 阶段起始日: 1, 兴奋: 80, 润滑: 70, 罪恶感: 10, 痴迷: 95, 勇气: 100, 暴露恐惧: 5, 关系: { 亲密度: 50, 信任度: 60, 边界: 90 }, 统计: { 假阳具使用: 200, 偷抚次数: 50, 诱导射精: 30, 暴露次数: 0 }, 暴露度: 100, 儿子在场: false, 后门类型: '身份反差', 后门已发现: true, 后门进度: 30, 后门策略: '用群主的身份压他。', 此刻想法: '这孩子还不知道自己已经在镜头里了。' },
      tao_tao: { 姓名: '桃桃', 角色: '进阶', 儿子名: '陶宇', 等级: 2, 在线: false, 阶段: 2, 阶段起始日: 3, 兴奋: 40, 润滑: 30, 罪恶感: 60, 痴迷: 45, 勇气: 40, 暴露恐惧: 50, 关系: { 亲密度: 65, 信任度: 70, 边界: 40 }, 统计: { 假阳具使用: 30, 偷抚次数: 10, 诱导射精: 5, 暴露次数: 0 }, 暴露度: 15, 儿子在场: true, 专属: { 竞技纪录: 7 }, 后门类型: '生理弱点', 后门已发现: false, 后门进度: 10, 后门策略: '', 此刻想法: '' }
    } },
  阶段守卫: { 已锁定: false, 结局已触发: false, 结局类型: null, 后日谈已读: false },
  局面: { 当前选项: { 一: { 文本: '她凑得更近，鼻尖离你那一层皮只有半寸', 等级: '微', 代价: '警觉+3', 技能: '观察', 主对: '识破' }, 二: { 文本: '她抬起手机，把红点对准你那根立着的', 等级: '中', 代价: '', 技能: '行动', 主对: '拦住' }, 三: { 文本: '', 等级: '微', 代价: '', 技能: '行动', 主对: '拦住' }, 四: { 文本: '', 等级: '微', 代价: '', 技能: '行动', 主对: '拦住' } }, 她已选: '二', 自定义: { 文本: '翻身把脸埋进枕头里', 技能: '意志', 等级: '强', 主对: '扛住', 待掷: true } },
  设置: { 主题: '夜间' }
};

const 警告 = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(w) {
    w.console.warn = (...a) => 警告.push('warn: ' + a.map(String).join(' '));
    w.console.error = (...a) => 警告.push('error: ' + a.map(String).join(' '));
    w.getLastMessageId = () => 0;
    w.getVariables = (o) => (o && /message/.test(String(o.type)) && o.message_id === 0) ? { stat_data: STAT } : { 欲妈群难度: '困难' };
    w.updateVariablesWith = (fn) => { fn({ stat_data: STAT }); return true; };
    w.getChatMessages = () => [{ message_id: 0, swipe_id: 7, role: 'assistant' }];
    w.triggerSlash = () => true;
    w.getCurrentMessageId = () => 0;
  }
});
const w = dom.window, d = w.document;

await new Promise(r => setTimeout(r, 300));

const T = id => { const e = d.getElementById(id); return e ? e.textContent : '⟨无#' + id + '⟩'; };
const H = id => { const e = d.getElementById(id); return e ? (e.hidden ? 'hidden' : '显示') : '⟨无⟩'; };

console.log('=== 残留宏字面量：' + (d.body.innerHTML.match(/\{\{format_message_variable/g) || []).length + ' 处 ===');
console.log('难度(swipe 7→困难) :', T('d-diff'));
console.log('小时(补零)         :', T('d-hour'));
console.log('距高考(100-7)      :', T('d-remain'), '| 条宽', d.getElementById('d-exam-bar').style.width);
console.log('郝佳期第N天(7-4+1) :', T('d-mom-days'), '| 本档能到:', T('d-mom-line'));
console.log('持有者(UID→名)     :', T('d-toy-holder'), '| 借用:', H('d-toy-borrow'), T('d-toy-borrower'));
console.log('联盟               :', H('d-ally'), T('d-ally-t'));
console.log('上期结算           :', H('d-week'), T('d-week-t'));
console.log('秘密任务           :', H('d-secret'));
console.log('群周派对           :', T('d-party-t'));
console.log('证据行             :', H('d-ev'), T('d-ev-t').slice(0, 40));
console.log('本轮判定(他)       :', H('d-himv'), T('d-himv-act'), T('d-himv-tier'));
console.log('选项格             : 一=' + H('d-opt-一') + ' 二=' + H('d-opt-二') + ' 三=' + H('d-opt-三') + ' 四=' + H('d-opt-四'));
console.log('选项 DC(一微/二中) :', T('d-dc-一'), T('d-dc-二'), '| 代价一:', H('d-cost-一'), '代价二:', H('d-cost-二'));
console.log('她挑的             :', JSON.stringify(T('d-opt-pick')));
console.log('自定义 DC(强)      :', T('d-cx-dc'), '| ready:', H('d-cx-ready'), '| roll:', H('d-cx-roll'), '| ask:', H('d-cx-ask'));
console.log('后门反抗按钮       :', H('d-btn-back'), T('d-back-p'), T('d-back-tip'));
console.log('弱点               :', H('d-weak'));
console.log('verdict            :', H('d-verdict'), T('d-vd-tier'), '| 侦察:', T('d-vd-r0v'), '| 警觉:', T('d-vd-alertv'));
console.log('成员详情显示       : hao=' + H('d-det-hao_jiaqi') + ' su_mei=' + H('d-det-su_mei'));
console.log('苏媚群P/儿子/后门  :', H('d-party-su_mei'), H('d-son-su_mei'), T('d-bds-su_mei'), H('d-str-su_mei'), H('d-thk-su_mei'));
console.log('桃桃(离线/竞技)    : dot=' + d.getElementById('d-dot-tao_tao').className + ' 竞技=' + H('d-jz-tao_tao') + ' 儿子在场=' + H('d-son-tao_tao') + ' 第N天=' + T('d-days-tao_tao') + ' 阶段条=' + d.getElementById('d-sbar-tao_tao').style.width);
console.log('宏取到的样例       : 成绩=' + [...d.querySelectorAll('b')].slice(0, 1).map(e => e.textContent) + ' 主题=' + d.querySelector('.card .row .v').textContent.slice(0, 30));

console.log('残留明细:', [...d.querySelectorAll('*')].filter(e=>e.outerHTML&&e.outerHTML.includes('{{')).map(e=>e.tagName+'.'+e.className+' :: '+e.outerHTML.slice(0,90)).slice(0,6).join(' || '));console.log('\n=== console 警告/错误 ' + 警告.length + ' 条 ===');
警告.slice(0, 12).forEach(x => console.log('  ' + x));

process.exit(0);
