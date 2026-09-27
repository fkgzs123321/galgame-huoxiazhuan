// _build_yyjs_state.mjs - 怨妇救赎 状态文件生成器
// 生成 src/怨妇救赎/tavern-cards-state.json（条目注册清单），随后用 forge pack 打包
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD_DIR = path.join(__dirname, 'src', '怨妇救赎');
const STATE_PATH = path.join(CARD_DIR, 'tavern-cards-state.json');

const uuid = () => crypto.randomUUID();
const file = (p) => path.relative(CARD_DIR, path.join(CARD_DIR, p)).replace(/\\/g, '/');

// ===== 角色清单 =====
const HEROINES = [
  { name: '林曼云', husband: '周世豪', keys: ['林曼云', '周世豪'] },
  { name: '苏婉君', husband: '李建国', keys: ['苏婉君', '李建国'] },
  { name: '秦月娥', husband: '王福贵', keys: ['秦月娥', '王福贵'] },
  { name: '白芷若', husband: '赵明轩', keys: ['白芷若', '赵明轩'] },
  { name: '陈美兰', husband: '孙德胜', keys: ['陈美兰', '孙德胜', '孙文博'] },
  { name: '温晓棠', husband: '陆鸿铭', keys: ['温晓棠', '陆鸿铭'] },
  { name: '顾清欢', husband: '韩正霆', keys: ['顾清欢', '韩正霆'] },
  { name: '许茉', husband: '郑凯文', keys: ['许茉', '郑凯文'] },
];

// ===== 条目清单 =====
const entryManifest = {
  // ── 世界观（before_char · 常驻）──
  世界观: {
    '[mvu_plot]世界设定': {
      path: file('世界书/世界观/世界设定.yaml'), scope: 'catalog', part: 'region',
      keywords: ['滨海市', '红果', '天命第三者', '红果种子'],
      abstract: '红果短剧宇宙、天命第三者能力、五位有夫之妇与五条狗血主线、双线基调',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'before_character_definition', order: 10 },
    },
    '[mvu_plot]天命之力规则': {
      path: file('世界书/世界观/天命之力规则.yaml'), scope: 'catalog', part: 'region',
      keywords: ['吸收量', '转化率', '天命之力', '觉醒', '掌控值', '怀孕'],
      abstract: '吸收量×转化率觉醒体系：吸收量=多阶段核心指标、转化率每人不同、掌控值=吸收量×转化率、怀孕伴随机制、能力边界',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'before_character_definition', order: 20 },
    },
    '[mvu_plot]对抗与反制': {
      path: file('世界书/世界观/对抗与反制.yaml'), scope: 'catalog', part: 'region',
      keywords: ['对抗', '反制', '反击', '侦探', '律师', '同盟', '反噬'],
      abstract: '防一边倒：对手的主动性（每2-4轮动作）、心思缜密（不降智+官方固化证据）、反击手段（法律/经济/社会/身体/天命反噬）、平衡裁决（按玩家状态化解或得手）、每家的主动敌人速查',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'before_character_definition', order: 27 },
    },
    '[mvu_plot]冲突与法律机制': {
      path: file('世界书/世界观/冲突与法律机制.yaml'), scope: 'catalog', part: 'region',
      keywords: ['法律', '公安', '警察', '曝光', '伦理', '冲突', '报警', '社死'],
      abstract: '天命之力的硬边界（对执法机关无效）、法律公安的绝对权威（取证困难+咬人窗口）、现实伦理与曝光度机制、冲突戏剧套路事件池、玩家家域场域',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'before_character_definition', order: 25 },
    },
    '[mvu_plot]怨妇铁律': {
      path: file('世界书/世界观/怨妇铁律.yaml'), scope: 'catalog', part: 'region',
      keywords: ['铁律', '顺位法则', '绝对服从', '第三者', '意志剥夺', '底线清零', '火葬场'],
      abstract: '怨妇行为十律（按阶段解锁）：角色映射=男性第三者=玩家、她的老公=被绿受害者；阶段2顺位法则/阶段3觉醒三律+双标/阶段4资源危机全效',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'before_character_definition', order: 30 },
    },
  },
  // ── 扮演准则（before_char · 常驻）──
  扮演准则: {
    '===扮演准则开始===': { scope: 'catalog', part: 'separator', keywords: [], abstract: '世界书 UI 分隔符（不注入、不启用）', contents: [{ content: '' }], enabled: false, strategy: { type: 'constant' }, position: { type: 'before_character_definition', order: 38 } },
    '[mvu_plot]扮演准则': {
      path: file('世界书/扮演准则/扮演准则.yaml'), scope: 'catalog', part: 'region', keywords: [],
      abstract: '红果短剧式第三人称文风、双线纪律、吸收量叙事纪律、铁律分阶段纪律、数值纪律、成人内容差异',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'before_character_definition', order: 40 },
    },
    '===扮演准则结束===': { scope: 'catalog', part: 'separator', keywords: [], abstract: '世界书 UI 分隔符（不注入、不启用）', contents: [{ content: '' }], enabled: false, strategy: { type: 'constant' }, position: { type: 'before_character_definition', order: 42 } },
  },
  // ── 角色（after_char）──
  角色: {
    '[mvu_plot]名录总表': {
      path: file('世界书/角色/名录总表.yaml'), scope: 'catalog', part: 'basic',
      keywords: ['有夫之妇', '花名册'],
      abstract: '5 位有夫之妇速览（身份/丈夫/家庭/名器/转化率/剧情线/红果弱点）+玩家能力与机制说明',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'after_character_definition', order: 80 },
    },
    '[mvu_plot]玩家档案': {
      path: file('世界书/角色/玩家档案.yaml'), scope: 'catalog', part: 'other',
      keywords: ['玩家', 'user', '红果种子'],
      abstract: '玩家（天命第三者）人设：普通人外壳+三面性+三色调色盘+二次解释+NSFW（阴茎20cm/持久/精量/性偏好）',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'after_character_definition', order: 85 },
    },
  },
  // ── 阶段指导（depth）──
  阶段指导: {
    '===阶段指导开始===': { scope: 'catalog', part: 'separator', keywords: [], abstract: '世界书 UI 分隔符（不注入、不启用）', contents: [{ content: '' }], enabled: false, strategy: { type: 'constant' }, position: { type: 'at_depth', role: 'system', depth: 0, order: 198 } },
    '[mvu_plot][总控]阶段调度': {
      path: file('世界书/阶段指导/阶段调度.yaml'), scope: 'catalog', part: 'region',
      keywords: ['阶段', '吸收量'],
      abstract: '阶段调度（蓝灯）：按当前目标 getwi 拉取关灯的「{女主}_阶段行为」详细多阶段内容；决裂时追加拉取「追夫火葬场」；自由时段输出提示',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 200 },
    },
    '[mvu_plot][总控]剧情与事件': {
      path: file('世界书/阶段指导/剧情与事件.yaml'), scope: 'catalog', part: 'region',
      keywords: ['剧情', '事件', '推进', '危机'],
      abstract: '剧情推进引擎（蓝灯）：日常事件池按阶段输出、危机事件按丈夫察觉度/资源转移触发、五阶段推进钩子',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 205 },
    },
    '[mvu_plot]危机事件': {
      path: file('世界书/阶段指导/危机事件.yaml'), scope: 'catalog', part: 'region',
      keywords: ["危机","传唤","拘留","立案","诉讼","坐牢","身世","亲子鉴定"],
      abstract: '危机事件系统（蓝灯）：按当前目标危机状态段落控制——传唤→拘留→立案→诉讼(3-5轮)→和解/坐牢全流程 + 怀孕身世危机 + 曝光度≥70预警 + 黑钱池化解',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 215 },
    },
    '[mvu_plot]后宫终局': {
      path: file('世界书/阶段指导/后宫终局.yaml'), scope: 'catalog', part: 'region',
      keywords: ["后宫","女皇宴会","收集","后日谈","种子真相"],
      abstract: '后宫终局（蓝灯）：5女主收集进度+集齐5位解锁女皇宴会/后日谈/种子真相',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 220 },
    },
    '追夫火葬场': {
      scope: 'catalog', part: 'region',
      keywords: ['火葬场', '决裂'],
      abstract: '决裂后八段火葬场流程（傲慢试探→资源封杀→认知崩塌→抛弃一切→极端强制→自毁威胁→替身反噬→终局退场）+复合分支。关灯：由【阶段调度】在决裂时 getwi 拉取，条目内 EJS 按火葬场进度段落控制',
      contents: [{ file: file('世界书/阶段指导/追夫火葬场.yaml') }],
      enabled: false, position: { type: 'at_depth', role: 'system', depth: 0, order: 210 },
    },
    '===阶段指导结束===': { scope: 'catalog', part: 'separator', keywords: [], abstract: '世界书 UI 分隔符（不注入、不启用）', contents: [{ content: '' }], enabled: false, strategy: { type: 'constant' }, position: { type: 'at_depth', role: 'system', depth: 0, order: 218 } },
  },
  // ── MVU（depth）──
  MVU: {
    '===变量开始===': { scope: 'catalog', part: 'separator', keywords: [], abstract: '世界书 UI 分隔符（不注入、不启用）', contents: [{ content: '' }], enabled: false, strategy: { type: 'constant' }, position: { type: 'at_depth', role: 'system', depth: 0, order: 226 } },
    '[InitVar]请勿打开': {
      path: file('世界书/变量/initvar.yaml'), part: 'initvar', keywords: [],
      abstract: '初始变量：时间、玩家、当前目标、5 位女主建档（吸收量/转化率/掌控值/怀孕/阶段/专属/身体/心理）',
      enabled: false, position: { type: 'at_depth', role: 'system', depth: 0, order: 250 },
    },
    '[mvu_update]变量更新规则': {
      path: file('世界书/变量/变量更新规则.yaml'), part: 'update_rules', keywords: [],
      abstract: '全部变量的更新时机与规则：吸收量增量×转化率、掌控值=吸收量×转化率、阶段推导、怀孕概率、火葬场推进',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 240 },
    },
    '[mvu_update]变量字典与范围': {
      path: file('世界书/变量/变量字典与范围.yaml'), part: 'variable_list', keywords: [],
      abstract: '变量字典：全部字段路径、取值范围、阶段推导速查',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 241 },
    },
    '[mvu_plot]叙事输出规范': {
      path: file('世界书/变量/叙事输出规范.yaml'), part: 'output_format', keywords: [],
      abstract: '主模型叙事职责、占位符协议、吸收量叙事纪律、铁律分阶段纪律',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 242 },
    },
    '[mvu_plot]行为与数值机制': {
      path: file('世界书/变量/行为与数值机制.yaml'), part: 'plot', keywords: [],
      abstract: '全变量分档行为映射（欲望度/羞耻感/兴奋/依恋/湿润度/掌控值/亲密值）+ 玩家数值规范（体力性欲勃起门槛/射精衰减/恢复）+ 口胡禁止三原则',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 244 },
    },
    '[mvu_plot]情境上下文EJS': {
      path: file('世界书/变量/情境上下文EJS.yaml'), part: 'output_format', keywords: [],
      abstract: '生成前注入当前时间/玩家状态/当前目标/阶段/吸收量/转化率/掌控值/怀孕/火葬场概览（EJS动态）',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 243 },
    },
    '[mvu_plot]思维链强制输出': {
      path: file('世界书/变量/思维链强制输出.yaml'), part: 'plot', keywords: [],
      abstract: '思维链模板（纯关灯·默认不注入）：想启用时①手动打开此条目 ②或复制内容到模型的预设思维链；启用后每轮先输出 thinking 块核对（阶段/数值驱动/生理怀孕/玩家门槛/变量真源/规则一致）再写正文，正则会折叠隐藏',
      enabled: false, position: { type: 'at_depth', role: 'system', depth: 0, order: 246 },
    },
    '[mvu_update]变量输出格式': {
      path: file('世界书/变量/变量输出格式.txt'), part: 'update_format', keywords: [],
      abstract: '更新模型必须输出的 <UpdateVariable>/<JSONPatch> 协议格式（MagVarUpdate 解析）',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 245 },
    },
    '[mvu_update]变量列表': {
      path: file('世界书/变量/变量列表.txt'), part: 'variable_list', keywords: [],
      abstract: '变量总览（字段速查）',
      enabled: true, strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 246 },
    },
    '===变量结束===': { scope: 'catalog', part: 'separator', keywords: [], abstract: '世界书 UI 分隔符（不注入、不启用）', contents: [{ content: '' }], enabled: false, strategy: { type: 'constant' }, position: { type: 'at_depth', role: 'system', depth: 0, order: 252 } },
  },
};

// ===== 5 位女主三件套注册（基础/私密=蓝灯常驻 / 阶段=关灯，由【阶段调度】getwi 拉取）=====
HEROINES.forEach((h, i) => {
  const base = 90 + i * 3;
  entryManifest['角色']['[mvu_plot]'+h.name+'_基础信息'] = {
    scope: 'catalog', part: 'basic', keywords: h.keys,
    abstract: `${h.name}的基础信息：身份/丈夫/家庭/方言/外貌/背景/关系/三面性/二次解释/三色调色盘（蓝灯常驻）`,
    contents: [{ content: `---\n<character_basic character="${h.name}">` }, { file: file(`世界书/角色/${h.name}/基础.yaml`) }, { content: '</character_basic>' }],
    enabled: true, strategy: { type: 'constant' },
    position: { type: 'after_character_definition', order: base },
  };
  entryManifest['角色'][`${h.name}_私密档案`] = {
    scope: 'specific', part: 'other', keywords: h.keys,
    abstract: `${h.name}的私密档案：三大件细节/名器/技能/特质/缺陷/转化率与吸收体质/被攻略开关。关灯：由【阶段调度】getwi 按当前目标拉取（亲密场景精准注入）`,
    contents: [{ content: `---\n<character_other character="${h.name}">` }, { file: file(`世界书/角色/${h.name}/私密.yaml`) }, { content: '</character_other>' }],
    enabled: false, position: { type: 'after_character_definition', order: base + 1 },
  };
  entryManifest['角色'][`${h.name}_阶段行为`] = {
    scope: 'specific', part: 'other', keywords: h.keys,
    abstract: `${h.name}的五阶段详细行为（每阶段：行为/言语/身体/家庭/玩家可做/晋升），关灯：由【阶段调度】getwi 拉取，条目内 EJS 按阶段段落控制`,
    contents: [{ file: file(`世界书/角色/${h.name}/阶段.yaml`) }],
    enabled: false, position: { type: 'after_character_definition', order: base + 2 },
  };

// ===== 家庭 NPC 注册（绿灯 selective，按家人名关键词触发）=====
  entryManifest['角色']['[mvu_plot]林曼云_家庭NPC'] = {
    scope: 'specific', part: 'other', keywords: ["周晓彤","周老爷","陈桂花"],
    abstract: '周家 NPC：周世豪(霸权镇压丈夫)/周晓彤(17继女)/周老爷(75公公)/陈桂花(70婆婆)——人设/性格/关系/与玩家交集/挣扎定位（绿灯：家人名/女主名出现时加载）',
    contents: [{ file: file('世界书/角色/林曼云_家庭NPC.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["周晓彤","周老爷","陈桂花"] },
    position: { type: 'after_character_definition', order: 125 },
  };
  entryManifest['角色']['[mvu_plot]苏婉君_家庭NPC'] = {
    scope: 'specific', part: 'other', keywords: ["李小满","李老头","刘桂芳"],
    abstract: '李家 NPC：李建国(后知后觉丈夫)/李小满(6女儿)/李老头(55公公)/刘桂芳(52婆婆)（绿灯：家人名/女主名出现时加载）',
    contents: [{ file: file('世界书/角色/苏婉君_家庭NPC.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["李小满","李老头","刘桂芳"] },
    position: { type: 'after_character_definition', order: 126 },
  };
  entryManifest['角色']['[mvu_plot]秦月娥_家庭NPC'] = {
    scope: 'specific', part: 'other', keywords: ["王小雨","孙翠花"],
    abstract: '秦家 NPC：王福贵(窝囊软抗丈夫)/王小雨(19叛逆女儿)/孙翠花(60婆婆)（绿灯：家人名/女主名出现时加载）',
    contents: [{ file: file('世界书/角色/秦月娥_家庭NPC.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["王小雨","孙翠花"] },
    position: { type: 'after_character_definition', order: 127 },
  };
  entryManifest['角色']['[mvu_plot]白芷若_家庭NPC'] = {
    scope: 'specific', part: 'other', keywords: ["赵小棉","赵老头","王美兰"],
    abstract: '白家 NPC：赵明轩(阴谋反噬丈夫)/赵小棉(5女儿)/赵老头(60公公)/王美兰(58婆婆)（绿灯：家人名/女主名出现时加载）',
    contents: [{ file: file('世界书/角色/白芷若_家庭NPC.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["赵小棉","赵老头","王美兰"] },
    position: { type: 'after_character_definition', order: 128 },
  };
  entryManifest['角色']['[mvu_plot]陈美兰_家庭NPC'] = {
    scope: 'specific', part: 'other', keywords: ["孙文静","孙文婷"],
    abstract: '孙家 NPC：孙德胜(扮猪吃虎丈夫)/孙文静(28继女继承人)/孙文婷(25继女)（绿灯：家人名/女主名出现时加载）',
    contents: [{ file: file('世界书/角色/陈美兰_家庭NPC.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["孙文静","孙文婷"] },
    position: { type: 'after_character_definition', order: 129 },
  };
  entryManifest['角色']['[mvu_plot]温晓棠_家庭NPC'] = {
    scope: 'specific', part: 'other', keywords: ["陆晨曦","陆伯年","沈秀兰"],
    abstract: '温家 NPC：陆晨曦(7女儿)/陆伯年(70公公)/沈秀兰(68婆婆)——人设/性格/关系/与玩家交集/挣扎定位（绿灯：家人名/女主名出现时加载）',
    contents: [{ file: file('世界书/角色/温晓棠_家庭NPC.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["陆晨曦","陆伯年","沈秀兰"] },
    position: { type: 'after_character_definition', order: 133 },
  };
  entryManifest['角色']['[mvu_plot]顾清欢_家庭NPC'] = {
    scope: 'specific', part: 'other', keywords: ["韩悠悠","韩德福","王桂兰"],
    abstract: '韩家 NPC：韩悠悠(4女儿)/韩德福(62公公)/王桂兰(60婆婆)——人设/性格/关系/与玩家交集/挣扎定位（绿灯：家人名/女主名出现时加载）',
    contents: [{ file: file('世界书/角色/顾清欢_家庭NPC.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["韩悠悠","韩德福","王桂兰"] },
    position: { type: 'after_character_definition', order: 134 },
  };
  entryManifest['角色']['[mvu_plot]许茉_家庭NPC'] = {
    scope: 'specific', part: 'other', keywords: ["郑想想","郑伯雄","李秀芬"],
    abstract: '郑家 NPC：郑想想(3女儿)/郑伯雄(60公公)/李秀芬(58婆婆)——人设/性格/关系/与玩家交集/挣扎定位（绿灯：家人名/女主名出现时加载）',
    contents: [{ file: file('世界书/角色/许茉_家庭NPC.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["郑想想","郑伯雄","李秀芬"] },
    position: { type: 'after_character_definition', order: 135 },
  };
});


// ===== 老公注册（绿灯：基础信息 + 阶段行为，对齐女性两件套结构）=====
  entryManifest['角色']['[mvu_plot]周世豪_基础信息'] = {
    scope: 'specific', part: 'basic', keywords: ["周世豪"],
    abstract: '周世豪（丈夫）基础信息+三色：身份/外貌/家庭地位/与女主关系/与玩家交集/挣扎流派',
    contents: [{ content: '---\n<character_basic character="周世豪">' }, { file: file('世界书/角色/周世豪_基础信息.yaml') }, { content: '</character_basic>' }],
    enabled: true, strategy: { type: 'selective', keys: ["周世豪"] },
    position: { type: 'after_character_definition', order: 130 },
  };
  entryManifest['角色']['[mvu_plot]周世豪_阶段行为'] = {
    scope: 'specific', part: 'other', keywords: ["周世豪"],
    abstract: '周世豪（丈夫）多阶段反抗行为：按女主阶段1-5段落控制，每阶段详细、流派差异化（绿灯）',
    contents: [{ file: file('世界书/角色/周世豪_阶段行为.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["周世豪"] },
    position: { type: 'after_character_definition', order: 131 },
  };
  entryManifest['角色']['[mvu_plot]李建国_基础信息'] = {
    scope: 'specific', part: 'basic', keywords: ["李建国"],
    abstract: '李建国（丈夫）基础信息+三色：身份/外貌/家庭地位/与女主关系/与玩家交集/挣扎流派',
    contents: [{ content: '---\n<character_basic character="李建国">' }, { file: file('世界书/角色/李建国_基础信息.yaml') }, { content: '</character_basic>' }],
    enabled: true, strategy: { type: 'selective', keys: ["李建国"] },
    position: { type: 'after_character_definition', order: 132 },
  };
  entryManifest['角色']['[mvu_plot]李建国_阶段行为'] = {
    scope: 'specific', part: 'other', keywords: ["李建国"],
    abstract: '李建国（丈夫）多阶段反抗行为：按女主阶段1-5段落控制，每阶段详细、流派差异化（绿灯）',
    contents: [{ file: file('世界书/角色/李建国_阶段行为.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["李建国"] },
    position: { type: 'after_character_definition', order: 133 },
  };
  entryManifest['角色']['[mvu_plot]王福贵_基础信息'] = {
    scope: 'specific', part: 'basic', keywords: ["王福贵"],
    abstract: '王福贵（丈夫）基础信息+三色：身份/外貌/家庭地位/与女主关系/与玩家交集/挣扎流派',
    contents: [{ content: '---\n<character_basic character="王福贵">' }, { file: file('世界书/角色/王福贵_基础信息.yaml') }, { content: '</character_basic>' }],
    enabled: true, strategy: { type: 'selective', keys: ["王福贵"] },
    position: { type: 'after_character_definition', order: 134 },
  };
  entryManifest['角色']['[mvu_plot]王福贵_阶段行为'] = {
    scope: 'specific', part: 'other', keywords: ["王福贵"],
    abstract: '王福贵（丈夫）多阶段反抗行为：按女主阶段1-5段落控制，每阶段详细、流派差异化（绿灯）',
    contents: [{ file: file('世界书/角色/王福贵_阶段行为.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["王福贵"] },
    position: { type: 'after_character_definition', order: 135 },
  };
  entryManifest['角色']['[mvu_plot]赵明轩_基础信息'] = {
    scope: 'specific', part: 'basic', keywords: ["赵明轩"],
    abstract: '赵明轩（丈夫）基础信息+三色：身份/外貌/家庭地位/与女主关系/与玩家交集/挣扎流派',
    contents: [{ content: '---\n<character_basic character="赵明轩">' }, { file: file('世界书/角色/赵明轩_基础信息.yaml') }, { content: '</character_basic>' }],
    enabled: true, strategy: { type: 'selective', keys: ["赵明轩"] },
    position: { type: 'after_character_definition', order: 136 },
  };
  entryManifest['角色']['[mvu_plot]赵明轩_阶段行为'] = {
    scope: 'specific', part: 'other', keywords: ["赵明轩"],
    abstract: '赵明轩（丈夫）多阶段反抗行为：按女主阶段1-5段落控制，每阶段详细、流派差异化（绿灯）',
    contents: [{ file: file('世界书/角色/赵明轩_阶段行为.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["赵明轩"] },
    position: { type: 'after_character_definition', order: 137 },
  };
  entryManifest['角色']['[mvu_plot]孙德胜_基础信息'] = {
    scope: 'specific', part: 'basic', keywords: ["孙德胜"],
    abstract: '孙德胜（丈夫）基础信息+三色：身份/外貌/家庭地位/与女主关系/与玩家交集/挣扎流派',
    contents: [{ content: '---\n<character_basic character="孙德胜">' }, { file: file('世界书/角色/孙德胜_基础信息.yaml') }, { content: '</character_basic>' }],
    enabled: true, strategy: { type: 'selective', keys: ["孙德胜"] },
    position: { type: 'after_character_definition', order: 138 },
  };
  entryManifest['角色']['[mvu_plot]孙德胜_阶段行为'] = {
    scope: 'specific', part: 'other', keywords: ["孙德胜"],
    abstract: '孙德胜（丈夫）多阶段反抗行为：按女主阶段1-5段落控制，每阶段详细、流派差异化（绿灯）',
    contents: [{ file: file('世界书/角色/孙德胜_阶段行为.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["孙德胜"] },
    position: { type: 'after_character_definition', order: 139 },
  };
  entryManifest['角色']['[mvu_plot]陆鸿铭_基础信息'] = {
    scope: 'specific', part: 'basic', keywords: ["陆鸿铭"],
    abstract: '陆鸿铭（丈夫）基础信息+三色：身份/外貌/家庭地位/与女主关系/与玩家交集/挣扎流派',
    contents: [{ content: '---\n<character_basic character="陆鸿铭">' }, { file: file('世界书/角色/陆鸿铭_基础信息.yaml') }, { content: '</character_basic>' }],
    enabled: true, strategy: { type: 'selective', keys: ["陆鸿铭"] },
    position: { type: 'after_character_definition', order: 140 },
  };
  entryManifest['角色']['[mvu_plot]陆鸿铭_阶段行为'] = {
    scope: 'specific', part: 'other', keywords: ["陆鸿铭"],
    abstract: '陆鸿铭（丈夫）多阶段反抗行为：按女主阶段1-5段落控制，每阶段详细、流派差异化（绿灯）',
    contents: [{ file: file('世界书/角色/陆鸿铭_阶段行为.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["陆鸿铭"] },
    position: { type: 'after_character_definition', order: 141 },
  };
  entryManifest['角色']['[mvu_plot]韩正霆_基础信息'] = {
    scope: 'specific', part: 'basic', keywords: ["韩正霆"],
    abstract: '韩正霆（丈夫）基础信息+三色：身份/外貌/家庭地位/与女主关系/与玩家交集/挣扎流派',
    contents: [{ content: '---\n<character_basic character="韩正霆">' }, { file: file('世界书/角色/韩正霆_基础信息.yaml') }, { content: '</character_basic>' }],
    enabled: true, strategy: { type: 'selective', keys: ["韩正霆"] },
    position: { type: 'after_character_definition', order: 142 },
  };
  entryManifest['角色']['[mvu_plot]韩正霆_阶段行为'] = {
    scope: 'specific', part: 'other', keywords: ["韩正霆"],
    abstract: '韩正霆（丈夫）多阶段反抗行为：按女主阶段1-5段落控制，每阶段详细、流派差异化（绿灯）',
    contents: [{ file: file('世界书/角色/韩正霆_阶段行为.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["韩正霆"] },
    position: { type: 'after_character_definition', order: 143 },
  };
  entryManifest['角色']['[mvu_plot]郑凯文_基础信息'] = {
    scope: 'specific', part: 'basic', keywords: ["郑凯文"],
    abstract: '郑凯文（丈夫）基础信息+三色：身份/外貌/家庭地位/与女主关系/与玩家交集/挣扎流派',
    contents: [{ content: '---\n<character_basic character="郑凯文">' }, { file: file('世界书/角色/郑凯文_基础信息.yaml') }, { content: '</character_basic>' }],
    enabled: true, strategy: { type: 'selective', keys: ["郑凯文"] },
    position: { type: 'after_character_definition', order: 144 },
  };
  entryManifest['角色']['[mvu_plot]郑凯文_阶段行为'] = {
    scope: 'specific', part: 'other', keywords: ["郑凯文"],
    abstract: '郑凯文（丈夫）多阶段反抗行为：按女主阶段1-5段落控制，每阶段详细、流派差异化（绿灯）',
    contents: [{ file: file('世界书/角色/郑凯文_阶段行为.yaml') }],
    enabled: true, strategy: { type: 'selective', keys: ["郑凯文"] },
    position: { type: 'after_character_definition', order: 145 },
  };
// ===== 状态文件 =====
const state = {
  projectName: '怨妇救赎',
  worldbookName: '怨妇救赎',
  form: 'charactercard',
  avatar: '头像.png',
  mvu: true,
  entryManifest,
  typeLists: {
    before_char: ['世界观', '扮演准则', '时间线', '地理'],
    after_char: ['角色', 'NPC'],
    depth: ['阶段指导', '事件', 'MVU'],
  },
  strategyThresholds: {
    角色: { basic: { threshold: 5, required: true }, other: { threshold: 2, required: false }, personality: { threshold: 2, required: true }, tri_faceted: { threshold: 2, required: false } },
    事件: 0,
    地理: { faction: { threshold: 4, required: false }, region: { threshold: 4, required: false }, scene: { threshold: 4, required: false } },
    MVU: { initvar: { threshold: null, required: false }, output_format: { threshold: 'Infinity', required: false }, update_rules: { threshold: 'Infinity', required: false }, variable_list: { threshold: 'Infinity', required: false } },
    NPC: 0,
    扮演准则: 'Infinity',
    时间线: { history: { threshold: 'Infinity', required: false }, plot: { threshold: 'Infinity', required: false } },
    世界观: 'Infinity',
    阶段指导: 'Infinity',
  },
  partOrder: {
    角色: ['basic', 'personality', 'tri_faceted', 'other'],
    地理: ['region', 'scene', 'faction'],
    MVU: ['variable_list', 'update_rules', 'output_format', 'initvar'],
    时间线: ['history', 'plot'],
    世界观: ['region'],
    扮演准则: ['region'],
    阶段指导: ['region'],
  },
  depth_defaults: { role: 'system', depth: 0 },
  description: '【怨妇救赎】虚构成人向角色扮演卡（18+），真实向人妻收集。\n<user> 是普通人，左手掌心有一枚来历不明的「天命印记」。与有夫之妇发生关系并使其怀上 <user> 的孩子后，该女性会觉醒「天命之力」——全家（老公/儿子/公公/婆婆/亲戚/保姆）对她言听计从，同时她按「顺位法则」把 <user> 视为生命中最重要的人，对自家丈夫按怨妇铁律行事（绿帽、转移财产、功劳篡改、顶罪、器官榨取……一切资源都流向 <user>）。\n收集制：5 位有夫之妇可攻略（豪门阔太/温柔人妻/卤味店老板娘/女总裁/续弦继母），每人五段式推进：①陌生攻略→②暧昧初孕→③觉醒掌控→④巅峰蜜月→⑤决裂·追夫火葬场（含终局）。多阶段核心指标=吸收量（体内射精后被吸收的量），掌控值=吸收量×转化率（每人不同）。全卡 MVU 变量驱动，EJS 段落控制按当前目标五阶段切换输出，状态栏为内联前端（正则注入）。全虚构、纯文字、真实向成人模拟，无真实人物。',
  first_messages: ['开场白/0.txt'],
  creator: '',
  creator_notes: '使用说明：\n1. 在 SillyTavern 中导入 怨妇救赎.json（角色卡），需启用酒馆助手（Tavern Helper）与 MVU 运行环境。\n2. 当前目标由剧情自然指定（"当前目标"变量）；五阶段由吸收量推导（5=决裂/4=吸收量≥60/3=吸收量≥30/2=吸收量≥1/1=吸收量0），掌控值=吸收量×转化率。\n3. 协议：主模型只叙事并输出 <StatusPlaceHolderImpl/>，更新模型输出 <UpdateVariable> JSONPatch 由 MVU 解析。\n4. 状态栏由正则【状态栏界面】注入内联前端；若未显示请确认正则已启用。\n5. Zod 脚本由卡内 schema.ts 重建（mvu_zod），推荐在支持 MVU/Zod 的酒馆助手环境下运行。',
  version: '1.0',
  create_date: new Date().toISOString(),
  extensions: {
    tavern_helper: {
      scripts: {
        MVU: {
          type: 'script',
          script_file: '脚本/MVU.txt',
          enabled: true,
          id: uuid(),
          info: 'MagVarUpdate 变量解析（怨妇救赎）',
          button: { enabled: true, buttons: [{ name: '刷新变量面板', visible: true }, { name: '刷新读取初始变量', visible: true }, { name: '删除楼层', visible: false }, { name: '新增楼层', visible: false }, { name: '发送额外模型解析', visible: false }, { name: '保存楼层截图', visible: false }] },
          data: {},
        },
      },
      variables: {},
    },
  },
  regex_scripts: {
    '隐藏AI状态栏': { id: uuid(), findRegex: '<StatusPlaceHolderImpl/>', replaceString: '', trimStrings: [], placement: [2], disabled: false, markdownOnly: false, promptOnly: true, runOnEdit: true, substituteRegex: 0, minDepth: -100, maxDepth: 100 },
    '状态栏界面': { id: uuid(), findRegex: '<StatusPlaceHolderImpl/>', replace_file: '正则/状态栏界面.html', trimStrings: [], placement: [2], disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: true, substituteRegex: 0, minDepth: -100, maxDepth: 100 },
    '隐藏AI更新变量': { id: uuid(), findRegex: '/<(update(?:variable)?)>(?:(?!.*<\\/\\1>)(?:(?!<\\1>).)*$|(?:(?!<\\1>).)*<\\/\\1?>)/gsi', replaceString: '', trimStrings: [], placement: [1, 2], disabled: false, markdownOnly: false, promptOnly: true, runOnEdit: false, substituteRegex: 0, minDepth: -100, maxDepth: 100 },
    '变量更新美化': { id: uuid(), findRegex: '/<(update(?:variable)?)>\\s*((?:(?!<\\1>).)*)\\s*<\\/\\1>/gsi', replace_file: '正则/变量更新美化.html', trimStrings: [], placement: [1, 2], disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: false, substituteRegex: 0, minDepth: -100, maxDepth: 100 },
    '变量更新中美化': { id: uuid(), findRegex: '/<(update(?:variable)?)>(?!.*<\\/\\1>)\\s*((?:(?!<\\1>).)*)\\s*$/gsi', replace_file: '正则/变量更新美化.html', trimStrings: [], placement: [1, 2], disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: false, substituteRegex: 0, minDepth: -100, maxDepth: 100 },
    '思维链折叠美化': { id: uuid(), findRegex: '/<(think(?:ing|reasoning)?)>([\\s\\S]*?)<\\/\\1>/gi', replace_file: '正则/思维链折叠.html', trimStrings: [], placement: [2], disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: true, substituteRegex: 0, minDepth: -100, maxDepth: 100 },
    '思维链对AI隐藏': { id: uuid(), findRegex: '/<(think(?:ing|reasoning)?)>[\\s\\S]*?<\\/\\1>/gi', replaceString: '', trimStrings: [], placement: [1, 2], disabled: false, markdownOnly: false, promptOnly: true, runOnEdit: true, substituteRegex: 0, minDepth: -100, maxDepth: 100 },
  },
  initvar_overrides: { '开场白/0.txt': '开场白/initvar/0.yaml' },
  zod: {
    scriptName: 'Zod',
    scriptId: uuid(),
    schemaPath: 'schema.ts',
    importUrl: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js',
  },
};

fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
console.log(`[OK] 已生成 ${STATE_PATH}`);
console.log(`[摘要] 条目数: ${Object.values(state.entryManifest).reduce((a, e) => a + Object.keys(e).length, 0)}`);
for (const [cat, entries] of Object.entries(state.entryManifest)) {
  const enabled = Object.values(entries).filter(e => e.enabled).length;
  console.log(`  ${cat}: ${Object.keys(entries).length} 条（启用 ${enabled}）`);
}
