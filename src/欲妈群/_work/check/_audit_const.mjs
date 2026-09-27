// 量蓝灯常驻条目的「渲染后」字符数（skills：单条常驻渲染后 ≤ 5000 字符）
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire('E:/Games/写卡/tavern_helper_template/_tools/');
const ejs = require('ejs');

const WB = '世界书';
const state = JSON.parse(fs.readFileSync('tavern-cards-state.json', 'utf8'));

// 收集 constant 且 enabled 的条目
const targets = [];
for (const cat of Object.keys(state.entryManifest || {})) {
  for (const [name, cfg] of Object.entries(state.entryManifest[cat])) {
    const st = cfg.strategy || {};
    if (cfg.enabled && st.type === 'constant' && cfg.path && cfg.path.endsWith('.txt')) {
      targets.push({ name, file: path.basename(cfg.path) });
    }
  }
}

// 假 stat_data（尽量喂满，逼 EJS 走最长分支）
const UID = ['su_mei', 'lin_wanqing', 'su_qing', 'han_xue', 'bai_lu', 'tao_tao', 'lian_nai', 'you_zi', 'xiao_ye', 'qin_yu', 'ling'];
const md = {};
for (const u of UID) md[u] = { 姓名: u, 阶段: 5, 暴露度: 100, 本轮活跃: true, 儿子名: '子' };
const stat = {
  元数据: { 日数: 100, 小时: 22, 时段: '夜晚', 回合: 9, 难度: '普通', 高考日: 100 },
  玩家: { 学业: { 成绩: 50 }, 心理: { 理智: 90, 欲望: 0, 兴奋: 0, 怀疑: 5 }, 技能: { 洞察: 10 }, 察觉值: { 假阳具真相: 100, 群存在: 100, 母亲欲望: 100, 幻触: 5 }, 警觉度: 0, 证据清单: ['a', 'b', 'c'], 今日: { 射精次数: 1, 幻触次数: 1 }, D20历史: [] },
  郝佳期: { 姓名: '郝佳期', 阶段: 5, 阶段进度: 80, 阶段起始日: 1, 群等级: 3, 积分: 400, 心理: { 清醒: 0, 理智: 100, 兴奋: 0, 痴迷: 0, 罪恶感: 0, 勇气: 50, 暴露恐惧: 0, 此刻想法: '' }, 身体: {}, 关系: { 亲密度: 50, 信任度: 60, 边界: 100, 叛逆恐惧: 80 }, 统计: { 偷抚次数: 5, 诱导射精: 5, 假阳具使用: 10, 暴露次数: 5 }, 后门进度: 80, 后门已发现: true },
  假阳具: { 当前持有者: 'hao_jiaqi', 绑定目标: '主角', 共感强度: 100, 借用者: 'su_qing', 借用期限: 1, 是否激活: true, 今日使用: 1, 上次使用时: -1, 持有起始日: 1, 持有到期日: 7, 备注: '' },
  群: { 成员数: 12, 在线数: 8, 活跃度: 78, 今日主题: '主题', 今日主题索引: 3, '30天已用主题': ['a', 'b'], 竞赛进行中: true, 秘密任务: { 成员: 'su_qing', 内容: 'x', 期限日: 9, 进行中: true }, 暴露风险: 50, 联盟: { su_qing: '盟友' }, 周冠军UID: 'hao_jiaqi', 周竞赛历史: [{ 周起始日: 7, 冠军UID: 'hao_jiaqi', 冠军名: '郝佳期', 获胜次数: 3 }], 成员详情: md },
  阶段守卫: { 已锁定: false, 结局已触发: false, 结局类型: null, 后日谈已读: false },
  设置: { 主题: '夜间', 显示思维链: true },
};
const getvar = (p, o) => {
  const parts = String(p).replace(/^stat_data\./, '').split('.');
  let c = stat;
  for (const k of parts) { if (c == null) return o?.defaults ?? undefined; c = c[k]; }
  return c === undefined ? (o?.defaults ?? undefined) : c;
};
const noop = async () => '';
const matchChatMessages = () => true;

const out = [];
for (const t of targets) {
  const fp = path.join(WB, t.file);
  if (!fs.existsSync(fp)) { out.push({ name: t.name, n: -1, note: '文件不存在' }); continue; }
  const raw = fs.readFileSync(fp, 'utf8');
  const body = raw.split('\n').filter(l => !/^\s*@@/.test(l)).join('\n');
  let n, err = '';
  try {
    const r = await ejs.render(body, { getvar, getwi: noop, matchChatMessages, getchr: noop, _: { get: () => undefined, clamp: (v) => v, isArray: Array.isArray, keys: Object.keys, values: Object.values } }, { async: true });
    n = r.length;
  } catch (e) { n = raw.length; err = e.message.split('\n')[0]; }
  out.push({ name: t.name, n, raw: raw.length, err });
}
out.sort((a, b) => b.n - a.n);
console.log('蓝灯常驻 ' + targets.length + ' 条（按渲染后字符降序）');
for (const o of out) {
  const flag = o.n > 5000 ? '★超' : (o.n > 4000 ? '!接近' : '  ');
  console.log(`${flag} ${o.name.padEnd(30)} 渲染${String(o.n).padStart(5)}  原文${String(o.raw ?? '-').padStart(5)} ${o.err ? '渲染失败:' + o.err : ''}`);
}
