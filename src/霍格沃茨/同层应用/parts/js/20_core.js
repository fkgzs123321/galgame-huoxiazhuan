/* ============================================================
   霍格沃茨 · 同层应用 核心层（常量/工具/事件总线）
   ============================================================ */
'use strict';

/* 全局命名空间 */
window.HGW = window.HGW || {};
const App = window.HGW;

/* ========== 常量表 ========== */
App.REALMS = ['初醒', '凝聚', '贯通', '掌控', '精纯', '结晶', '化形', '领域', '本源'];
App.REALM_MUL = [
  0.5, 0.7, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0,
  2.2, 2.5, 2.8, 3.0, 3.3, 3.6, 4.0, 4.5, 5.0, 5.5, 6.0, 7.0, 8.0, 9.0, 10.0,
];
App.REALM_GATE = [
  [30, 60, 100], [150, 200, 250], [320, 390, 450], [530, 620, 700], [800, 900, 1000],
  [1150, 1300, 1500], [1730, 1970, 2200], [2530, 2870, 3200], [3700, 4300, 99999],
];
App.HOUSES = {
  '格兰芬多': { cls: 'gry', color: '#e74c3c', ico: 'ico-crest-gryffindor' },
  '斯莱特林': { cls: 'sly', color: '#27ae60', ico: 'ico-crest-slytherin' },
  '拉文克劳': { cls: 'rav', color: '#3498db', ico: 'ico-crest-ravenclaw' },
  '赫奇帕奇': { cls: 'huf', color: '#f1c40f', ico: 'ico-crest-hufflepuff' },
};
App.SPELLS = [
  { 名: '昏昏倒地', 系数: 3, 描述: '直击咒', 类型: '攻击' },
  { 名: '火焰熊熊', 系数: 2, 描述: '灼热咒', 类型: '攻击' },
  { 名: '摄神取念', 系数: 1, 描述: '精神渗透（她防线低时×2）', 类型: '攻击' },
  { 名: '统统石化', 系数: 2.5, 描述: '僵直咒', 类型: '攻击' },
  { 名: '厉火咒', 系数: 4, 描述: '高阶炽焰', 类型: '攻击' },
  { 名: '粉身碎骨', 系数: 2, 描述: '连击（本回合总伤×1.5）', 类型: '攻击' },
  { 名: '万弹齐发', 系数: 2, 描述: '速攻咒', 类型: '攻击' },
];
App.LIBRARY = [
  { 名: '盔甲护身', 类型: '防御', 描述: '本回合她反击×0.7' },
  { 名: '速速禁锢', 类型: '控制', 描述: '她反击×0.8（持续2回合）' },
  { 名: '愈合如初', 类型: '恢复', 描述: '你防线+8（随等级提升）' },
  { 名: '幻身咒', 类型: '闪避', 描述: '本回合你受反击-30%' },
];
App.ACTS = ['舔舐', '吮吸', '指入', '揉弄', '顶弄', '深顶', '轻抚', '拍打', '啃咬', '含住', '抚摸', '套弄'];
App.PARTS = ['乳尖', '乳肉', '耳垂', '脖颈', '花径', '花核', '会阴', '肛口', '大腿内侧', '臀部', '锁骨', '后背'];
App.STYLES = ['轻柔', '缓慢', '猛烈', '深入', '断续', '缠绵', '粗暴', '克制', '试探'];
App.NO_ACT = {
  '含住': ['臀部', '会阴'],
  '深顶': ['乳尖', '乳肉', '耳垂', '脖颈', '大腿内侧', '臀部', '花核'],
  '指入': ['臀部', '会阴'],
  '顶弄': ['乳尖', '耳垂', '脖颈'],
};
App.SENS = ['花径', '花核', '乳尖', '脖颈', '大腿内侧'];
App.RECIPES = [
  { 名: '欢欣剂', 需求: { 白鲜根: 2, 雏菊根: 3 }, 门槛: 30, 描述: '你情欲+40', 售价: 6, 颜色: '#e8b64c' },
  { 名: '润滑魔油', 需求: { 白鲜根: 1, 雏菊根: 2 }, 门槛: 30, 描述: '亲密中她快感+20', 售价: 5, 颜色: '#f0a6c0' },
  { 名: '安神药剂', 需求: { 曼德拉草: 1 }, 门槛: 45, 描述: '战后魔力恢复+15', 售价: 8, 颜色: '#7fd0a8' },
  { 名: '迷情剂', 需求: { 曼德拉草: 1, 白鲜根: 1 }, 门槛: 55, 描述: '亲密中她情欲+30', 售价: 12, 颜色: '#d4537e' },
  { 名: '复方汤剂', 需求: { 曼德拉草: 2, 白鲜根: 1 }, 门槛: 65, 描述: '伪装身份（事件道具）', 售价: 15, 颜色: '#8e7cc3' },
  { 名: '福灵剂', 需求: { 雏菊根: 3, 龙血: 1 }, 门槛: 70, 描述: '决斗伤害+2', 售价: 20, 颜色: '#e8d48b' },
  { 名: '突破魔药', 需求: { 曼德拉草: 2, 龙血: 1 }, 门槛: 75, 描述: '阶位突破必需', 售价: 30, 颜色: '#ffd54f' },
];
App.SHOP = [
  { 名: '白鲜根', 品级: '普通', 价: 2, 描述: '常见疗伤草药' },
  { 名: '雏菊根', 品级: '普通', 价: 1, 描述: '基础魔药材料' },
  { 名: '曼德拉草', 品级: '精良', 价: 8, 描述: '高阶魔药核心' },
  { 名: '龙血', 品级: '稀有', 价: 20, 描述: '稀有炼药材料' },
  { 名: '凤凰泪', 品级: '传说', 价: 50, 描述: '传说级材料' },
  { 名: '月光草', 品级: '精良', 价: 5, 描述: '夜采草药' },
];
App.MAT_RANK = { 普通: 0, 精良: 10, 稀有: 20, 传说: 30, 神话: 40 };
App.POTION_ICONS = {
  '欢欣剂': '🧡', '润滑魔油': '💧', '安神药剂': '🌿', '迷情剂': '💗',
  '复方汤剂': '🌀', '福灵剂': '✨', '突破魔药': '💠',
};
App.WEEK = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
App.PERIODS = ['上午', '下午', '晚间', '深夜'];
App.SUBJECTS = ['魔咒学', '变形术', '黑魔法防御术', '魔药学', '草药学', '天文学', '魔法史'];
App.STORY_ARC = {
  1: { 名: '魔法石', 描述: '奇洛教授与魔法石、巨怪之夜、魁地奇首赛、独角兽之血、学院杯' },
  2: { 名: '密室', 描述: '密室传说、蛇怪、金妮被日记控制、赫敏被石化、凤凰与毒牙' },
  3: { 名: '阿兹卡班', 描述: '摄魂怪进驻、小天狼星越狱、卢平的守护神课、巴克比克' },
  4: { 名: '火焰杯', 描述: '三强争霸、圣诞舞会、迷宫之夜、塞德里克之死、伏地魔复活' },
  5: { 名: '凤凰社', 描述: '乌姆里奇到任、D.A.军、夜骐、神秘事务司、邓布利多之战' },
  6: { 名: '混血王子', 描述: '魂器课程、魔药课本、黑魔标记之夜、天文塔、邓布利多之死' },
  7: { 名: '死亡圣器', 描述: '逃亡、婚礼被袭、古灵阁、霍格沃茨大战、黎明' },
};
App.SAVE_KEY = 'HGW_SAVES_V1';
App.CFG_KEY = 'HGW_CFG_V1';

/* ========== 工具函数 ========== */
App.clamp = (v, min, max) => Math.max(min, Math.min(max, v));
App.rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
App.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
App.pickN = (arr, n) => {
  const a = arr.slice();
  const out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
};
App.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
App.esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
App.nl2br = (s) => App.esc(s).replace(/\n/g, '<br>');
App.fmtNum = (n) => (n == null ? 0 : Number(n).toLocaleString());
App.now = () => new Date().toLocaleString('zh-CN', { hour12: false });
App.deepGet = (obj, path, dft) => {
  const segs = String(path || '').split('.');
  let o = obj;
  for (const s of segs) {
    if (o == null) return dft;
    o = o[s];
  }
  return o == null ? dft : o;
};
App.deepSet = (obj, path, val) => {
  const segs = String(path || '').split('.');
  let o = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const k = segs[i];
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  }
  o[segs[segs.length - 1]] = val;
};
App.deepMerge = (target, ...srcs) => {
  for (const src of srcs) {
    if (!src || typeof src !== 'object') continue;
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        App.deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    }
  }
  return target;
};
App.houseInfo = (name) => App.HOUSES[name] || { cls: '', color: '#9aa7b8', ico: '' };
App.houseBadge = (name) => {
  const h = App.houseInfo(name);
  return '<span class="hgw-badge ' + h.cls + '">' + (name || '未知学院') + '</span>';
};
App.ico = (id, size) => {
  const s = size ? ' width="' + size + '" height="' + size + '"' : '';
  return '<svg' + s + ' style="vertical-align:-2px"><use href="#' + id + '"/></svg>';
};
App.realmName = (stat) => {
  const rp = (stat.玩家 && stat.玩家.魔力阶位) || {};
  return App.REALMS[App.clamp((rp.大境界 || 1) - 1, 0, 8)] + '·' + (rp.层 || 1);
};
App.realmMul = (stat) => {
  const rp = (stat.玩家 && stat.玩家.魔力阶位) || {};
  const idx = App.clamp(((rp.大境界 || 1) - 1) * 3 + ((rp.层 || 1) - 1), 0, 26);
  return App.REALM_MUL[idx];
};
App.expNeed = (lv) => 100 + lv * 50;
App.gold = (stat) => {
  const w = (stat.玩家 && stat.玩家.财产) || {};
  return Math.round((w.金加隆 || 0) + (w.西可 || 0) / 17 + (w.纳特 || 0) / 493);
};
App.spellInfo = (stat, name) => {
  const spells = (stat.玩家 && stat.玩家.咒语) || {};
  return spells[name] || { 等级: 1, 经验: 0 };
};
App.libInfo = (stat, name) => {
  const lib = (stat.玩家 && stat.玩家.魔咒库) || {};
  return lib[name] || { 等级: 0, 经验: 0 };
};
App.dmgOf = (stat, spell) => {
  const sp = App.spellInfo(stat, spell.名);
  return Math.round(sp.等级 * spell.系数 * App.realmMul(stat));
};
App.charState = (stat, name) => (stat.女巫角色 || {})[name] || {};

/* ========== 事件总线 ========== */
App.events = {};
App.on = function (name, fn) {
  (App.events[name] = App.events[name] || []).push(fn);
  return () => App.off(name, fn);
};
App.off = function (name, fn) {
  const l = App.events[name];
  if (l) App.events[name] = l.filter(f => f !== fn);
};
App.emit = function (name, payload) {
  const l = App.events[name];
  if (l) l.slice().forEach(fn => { try { fn(payload); } catch (e) { console.error('[HGW] event error:', name, e); } });
};

/* ========== 简单 DOM 助手 ========== */
App.$ = (sel, root) => (root || document).querySelector(sel);
App.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
App.el = (tag, attrs, html) => {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'style') e.style.cssText = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  if (html != null) e.innerHTML = html;
  return e;
};

/* 防抖 */
App.debounce = (fn, ms) => {
  let t = null;
  return function (...args) {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn.apply(this, args); }, ms);
  };
};

/* 记录应用日志（本地环形缓冲） */
App.log = [];
App.addLog = function (type, text) {
  App.log.unshift({ type, text, time: App.now(), ts: Date.now() });
  if (App.log.length > 500) App.log.length = 500;
  try {
    const saved = JSON.parse(localStorage.getItem('HGW_APP_LOG_V1') || '[]');
    saved.unshift({ type, text, time: App.now(), ts: Date.now() });
    localStorage.setItem('HGW_APP_LOG_V1', JSON.stringify(saved.slice(0, 300)));
  } catch (e) { /* ignore */ }
};
App.loadLog = function () {
  try { return JSON.parse(localStorage.getItem('HGW_APP_LOG_V1') || '[]'); } catch (e) { return []; }
};

/* 骰子 */
App.rollDice = function (faces) {
  const n = Math.floor(Math.random() * faces) + 1;
  App.addLog('social', '投掷 d' + faces + ' 结果：' + n);
  return n;
};
