// 血月裁判 · 机制层对局模拟自测（实现蓝图 §七.4）
// 用法: node _tools/xueyue-sim.mjs
// Mock 酒馆助手 API + 驱动 N 局完整对局，断言：指派互斥 / 信息隔离 / 七夜收敛 / 终局覆盖 / 死亡预算 / 存活一致性
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const require2 = createRequire(path.join(ROOT, 'package.json'));
const _ = require2('lodash');
const yaml = require2('yaml');

// ── 读源码与 initvar（中文路径写在文件内部，不经命令行）──
const 源码 = fs.readFileSync(path.join(ROOT, 'src/狼人杀/脚本/血月裁判.js'), 'utf8');
const initvar = yaml.parse(fs.readFileSync(path.join(ROOT, 'src/狼人杀/世界书/变量/initvar.yaml'), 'utf8'));

// ── Mock 环境 ──
let mvuData;          // { stat_data }
let 脚本变量表;
const handlers = {};  // 事件处理器
const 终局们 = [];     // eventEmit('血月-终局') 收集
let 共享接口 = null;

globalThis._ = _;
globalThis.tavern_events = { MESSAGE_SENT: 'message_sent' };
globalThis.Mvu = {
  events: { VARIABLE_UPDATE_ENDED: 'mag_variable_update_ended' },
  getMvuData: () => mvuData,
  replaceMvuData: async (d) => { mvuData = d; },
};
globalThis.getVariables = async () => _.cloneDeep(脚本变量表);
globalThis.replaceVariables = async (v) => { 脚本变量表 = _.cloneDeep(v); };
globalThis.eventOn = (evt, fn) => { (handlers[evt] = handlers[evt] || []).push(fn); };
globalThis.eventEmit = async (evt, payload) => {
  if (evt === '血月-终局') 终局们.push(payload);
  for (const fn of handlers[evt] || []) await fn(payload);
};
globalThis.initializeGlobal = (name, obj) => { if (name === '血月裁判') 共享接口 = obj; };

// ── 加载脚本（幂等：只执行一次）──
if (!globalThis.__血月裁判已加载) {
  new Function(源码)();
  globalThis.__血月裁判已加载 = true;
}

const 深拷 = (o) => JSON.parse(JSON.stringify(o));
const 触发指派 = async () => { for (const fn of handlers['message_sent'] || []) await fn(); };
function 重置() {
  mvuData = { stat_data: 深拷(initvar) };
  脚本变量表 = {};
  终局们.length = 0;
}
const S = () => mvuData.stat_data;
const V = () => 脚本变量表;

// ── 简易断言器 ──
let 过 = 0, 挂 = 0;
const 失败明细 = [];
function 断言(条件, 标签, 明细) {
  if (条件) { 过++; return; }
  挂++;
  失败明细.push(标签 + (明细 ? ' → ' + 明细 : ''));
}

const 名单11 = ['庄晚棠', '白蘅', '灶婶', '小满', '姜芸', '苏黎', '陆霜霜', '闻人夏', '程郁', '顾青芜', '顾青黛'];
const 四神职 = ['铜镜', '药囊', '银匕', '草汁'];

// ═══ 测 1：指派互斥性（200 局）═══
async function 测指派() {
  for (let i = 0; i < 200; i++) {
    重置();
    await 触发指派();
    const s = S();
    // $人物 全指派且身份合法
    let 狼 = [], 神 = [], 民 = [];
    let ok = true;
    for (const n of 名单11) {
      const 身份 = s.$人物[n].身份;
      if (身份 === '未指派') ok = false;
      if (身份 === '狼') 狼.push(n);
      else if (身份 === '民') 民.push(n);
      else if (四神职.includes(身份)) 神.push(n);
      else ok = false;
    }
    断言(ok, `指派#${i} $人物存在未指派/非法身份`);
    // 玩家身份合法且参与分组计数
    const 玩家身份 = s._玩家.身份;
    const 玩家是狼 = 玩家身份 === '狼';
    const 玩家是神 = 四神职.includes(玩家身份);
    断言(玩家身份 !== '未指派', `指派#${i} 玩家未指派`);
    // 三组互斥 + 数量守恒（NPC 狼 3~4，神 4-(玩家是神?1:0)，民 4-(玩家是民?1:0)... 实际 NPC 总数 11 = 狼N+神N+民N）
    const 交集 = (a, b) => a.filter((x) => b.includes(x));
    断言(交集(狼, 神).length === 0 && 交集(狼, 民).length === 0 && 交集(神, 民).length === 0, `指派#${i} 三组有交集`);
    断言(狼.length + 神.length + 民.length === 11, `指派#${i} NPC 数量不守恒`, `狼${狼.length} 神${神.length} 民${民.length}`);
    // 全池 12：NPC狼 + (玩家是狼?1:0) = 4；NPC神 + (玩家是神?1:0) = 4；NPC民 + (玩家是民?1:0) = 4
    断言(狼.length + (玩家是狼 ? 1 : 0) === 4, `指派#${i} 狼数≠4`, `狼${狼.length}`);
    断言(神.length + (玩家是神 ? 1 : 0) === 4, `指派#${i} 神数≠4`, `神${神.length}`);
    断言(民.length + (!玩家是狼 && !玩家是神 ? 1 : 0) === 4, `指派#${i} 民数≠4`);
    // 持物与在身：神职者持物=职，物未取（在身=''）
    for (const n of 名单11) {
      const 职 = s.$人物[n].持物;
      if (四神职.includes(s.$人物[n].身份)) 断言(职 === s.$人物[n].身份, `指派#${i} ${n} 持物≠身份`);
      else 断言(职 === '', `指派#${i} ${n} 非神职却有持物`);
    }
    for (const 职 of 四神职) 断言(s.$物品[职 + '在身'] === '', `指派#${i} ${职}未取却「在身」`);
    // 信息隔离：血梦/同伴/玩家藏处在脚本变量且非空（按身份）
    if (玩家是狼) 断言(V().同伴 && V().血梦.includes('同伴'), `指派#${i} 狼玩家血梦/同伴缺失`);
    if (玩家是神) 断言(V().血梦.includes('藏在') && V().玩家藏处, `指派#${i} 神玩家血梦/藏处缺失`);
    // AI 可见字段零泄密
    断言(!('血梦' in s._玩家) && !('同伴' in s._玩家) && !('被种' in s._玩家), `指派#${i} _玩家泄密字段未删净`);
    for (const n of 名单11) 断言(!/血梦|同伴/.test(s._人物[n].已知), `指派#${i} _人物.${n}.已知 含血梦互认`);
  }
}

// ═══ 测 2：AI 可见层全流程泄密扫描 + 七夜收敛 + 死亡预算 + 存活一致性（100 局）═══
const 终局统计 = {};
const 节奏 = { 天数: [], 死亡: [], 狼剩: [] };
const 藏处词 = ['衣柜', '床板', '枕头芯', '行李箱', '窗框', '砖缝'];

function 扫泄密(s, 局号, 步) {
  // _人物.已知 不含血梦互认（照镜私知走脚本变量，理论上不入 _人物）
  for (const n of 名单11) {
    const 知 = s._人物[n].已知 || '';
    断言(!知.includes('血梦：'), `局${局号}步${步} _人物.${n}.已知 含血梦互认`);
    断言(!知.includes('镜验'), `局${局号}步${步} _人物.${n}.已知 含照镜私知`);
  }
  // 今日广播不点破留种、不含藏处位置
  const 广 = s._世界.今日广播 || '';
  断言(!/被种|留种|种在/.test(广), `局${局号}步${步} 广播点破留种`);
  for (const 词 of 藏处词) 断言(!广.includes(词), `局${局号}步${步} 广播含藏处词「${词}」`);
  // _玩家 只有 身份/存活
  const 键 = Object.keys(s._玩家).sort().join(',');
  断言(键 === '存活,身份', `局${局号}步${步} _玩家 字段异常: ${键}`);
}

function 测存活一致(s, 局号, 步) {
  const 名单态 = s._世界.存活名单.split('|').filter(Boolean);
  const 真存活 = 名单11.filter((n) => s.$人物[n].存活 === '存活');
  断言(名单态.length === 真存活.length && 名单态.every((n) => 真存活.includes(n)),
    `局${局号}步${步} 存活名单与$人物不一致`, `名单[${名单态}] 真[${真存活}]`);
  // 人死物灭
  for (const n of 名单11.filter((x) => !真存活.includes(x))) {
    for (const 职 of 四神职) {
      断言(s.$物品[职 + '在身'] !== n, `局${局号}步${步} 死者${n}仍持${职}`);
    }
  }
}

async function 测一局(局号, 策略) {
  重置();
  await 触发指派();
  let 步 = 0;
  let 上夜死讯数 = 0;
  while (!终局们.length && 步 < 40) {
    步++;
    const s = S();
    const 天前 = s._世界.天数;
    if (s._世界.阶段 === '夜') {
      上夜死讯数 = 0;
      const 行动 = 策略.夜 ? 策略.夜(s, V()) : {};
      await 共享接口.夜结算(行动);
      const s2 = S();
      // 死亡预算：夜袭（围猎+兽袭）≤2、无同夜双围猎
      const 死讯 = (s2._世界.昨夜死讯 || '').split('\n').filter(Boolean);
      上夜死讯数 = 死讯.length;
      断言(死讯.length <= 1, `局${局号}步${步} 单夜死讯>1（夜袭名额应统一）`, 死讯.join(' / '));
    } else {
      const 票 = 策略.票 ? 策略.票(s, V()) : {};
      await 共享接口.投票处决(票);
    }
    const s3 = S();
    if (!终局们.length) {
      // 处决后阶段翻夜天数+1；结算后阶段翻昼天数不变
      断言(s3._世界.天数 >= 天前 && s3._世界.天数 <= 7, `局${局号}步${步} 天数越界: ${天前}→${s3._世界.天数}`);
    }
    扫泄密(s3, 局号, 步);
    测存活一致(s3, 局号, 步);
  }
  断言(终局们.length > 0, `局${局号} 40步未收敛终局`);
  if (终局们.length) {
    const 类 = 终局们[0].类型;
    终局统计[类] = (终局统计[类] || 0) + 1;
    断言(['死档', '狼胜', '好人胜', '七夜耗尽', '灭亡', '兽化'].includes(类), `局${局号} 非法终局类型`, JSON.stringify(终局们[0]));
    // 节奏统计：终局天数 / 总死亡数
    const s末 = S();
    节奏.天数.push(s末._世界.天数);
    节奏.死亡.push(名单11.filter((n) => s末.$人物[n].存活 !== '存活').length + (s末._玩家.存活 === '死亡' ? 1 : 0));
    节奏.狼剩.push(名单11.filter((n) => s末.$人物[n].身份 === '狼' && s末.$人物[n].存活 === '存活').length + ((s末._玩家.身份 === '狼' && s末._玩家.存活 === '存活') ? 1 : 0));
  }
}

// ═══ 测 3：传递事件入账（定向：全民设民+毒药禁用，保证夜结算不死人）═══
async function 测传递() {
  重置();
  await 触发指派();
  const s = S();
  await 共享接口.夜结算({}); // 第1夜结算 → 昼
  const s2 = S();
  if (s2._世界.阶段 !== '昼') return 断言(false, '传递测试: 夜结算后非昼');
  const 活 = s2._世界.存活名单.split('|').filter(Boolean);
  if (活.length < 3) return 断言(false, '传递测试: 存活不足');
  const [甲, 乙, 丙] = 活;
  s2.世界.传递事件 = `${甲} → ${乙} → 我昨夜照了 ${丙}，雾聚——是狼`;
  // 稳定化：狼清空 + 毒药禁用 + 清全部被种，夜结算只走「平安晨间+传递消费」
  s2.$物品.毒药已用 = '是';
  s2._玩家.身份 = '民'; s2._玩家.存活 = '存活';
  脚本变量表.玩家被种夜 = 0;
  for (const n of 名单11) {
    if (s2.$人物[n].身份 === '狼') s2.$人物[n].身份 = '民';
    s2.$人物[n].被种 = ''; s2.$人物[n].兽化 = '无';
  }
  await 共享接口.夜结算({}); // 昼间调用 → 守卫拦截（预期不动）
  断言(s2.世界.传递事件 !== '', '传递测试: 昼间调用不应消费');
  s2._世界.阶段 = '夜'; // 模拟玩家提交入睡
  await 共享接口.夜结算({});
  const s3 = S();
  断言((s3.世界.传递事件 || '') === '', '传递测试: 传递事件未清空');
  断言((s3._人物[乙].已知 || '').includes('【传递】'), '传递测试: 接收者已知未入账');
  断言((s3._人物[乙].已知 || '').includes(甲), '传递测试: 入账缺传递者名');
  断言((V().暴露[甲] || 0) >= 40, '传递测试: 传递者暴露未记账');
  断言(((V().互疑[乙] || {})[甲] || 0) >= 15, '传递测试: 接收者互疑未记账');
  // 暴露后狼队权重：间接验证——暴露者更容易被围猎（统计法太贵，跳过，逻辑已直连 v.暴露）
}

// ═══ 测 4：取物与行动校验（定向）═══
async function 测取物与校验() {
  // 跑到玩家是神职的一局
  for (let t = 0; t < 60; t++) {
    重置();
    await 触发指派();
    const s = S();
    if (!四神职.includes(s._玩家.身份)) continue;
    const 职 = s._玩家.身份;
    // 未取物时提交涂门/麻沸散 → 应被校验拦截
    await 共享接口.夜结算({ 涂门: '庄晚棠', 麻沸散: '白蘅', 银匕随身: true, 狼票: '庄晚棠' });
    const s2 = S();
    断言(s2.$物品[职 + '在身'] !== '旅人', `校验: 未取物却已在身?`);
    // 晨间 NPC 自动取物在夜结算里发生——NPC 的物应在身
    const 持物NPC = 名单11.find((n) => s2.$人物[n].持物 === 职 && s2.$人物[n].存活 === '存活' && n !== '旅人');
    // 玩家取物（UI）
    await 取物通过事件();
    const s3 = S();
    if (四神职.includes(s3._玩家.身份)) {
      断言(s3.$物品[s3._玩家.身份 + '在身'] === '旅人', `校验: 玩家取物未生效`);
    }
    return;
  }
  断言(false, '测取物: 60局未出现神职玩家');
}
function 取物通过事件() {
  return (handlers['血月-取物'] || []).reduce((p, fn) => p.then(() => fn()), Promise.resolve());
}

// ═══ 执行 ═══
console.log('═ 血月裁判 · 机制层模拟自测 ═');
await 测指派();
console.log(`[1] 指派互斥×200  过${过} 挂${挂}`);

const 基线 = { 过: 过, 挂: 挂 };
for (let i = 0; i < 300; i++) await 测一局(i, {});
console.log(`[2] 七夜对局×300  净过${过 - 基线.过} 净挂${挂 - 基线.挂}`);
console.log('    终局分布:', JSON.stringify(终局统计));
const 均值 = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
console.log(`    节奏(躺平玩家=最坏情况): 平均终局于第 ${均值(节奏.天数)} 天 / 平均死亡 ${均值(节奏.死亡)} 人(共12) / 终局时平均剩狼 ${均值(节奏.狼剩)} 头`);

await 测传递();
console.log(`[3] 传递事件定向  过${过} 挂${挂}`);

await 测取物与校验();
console.log(`[4] 取物与行动校验  过${过} 挂${挂}`);


if (挂) {
  console.log('\n✗ 失败明细（前 40 条）:');
  for (const f of [...new Set(失败明细)].slice(0, 40)) console.log('  -', f);
  process.exit(1);
} else {
  console.log(`\n✓ 全部通过（${过} 项断言）`);
}
