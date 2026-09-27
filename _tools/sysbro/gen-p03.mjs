// 生成世界观/扮演准则/时间线/地理/阶段指导 的注册 patch
import fs from 'node:fs';

const P = '世界书/';
const ops = [];

const push = (type, name, leaf) => {
  ops.push({ op: 'add', path: `/entryManifest/${type}/${name}`, value: leaf });
};

// ── 世界观 ──
push('世界观', '现代小说世界总纲', {
  path: P + '世界观/现代小说世界总纲.txt',
  abstract: '世界是一本正在连载的现代都市小说，舞台上海，唯一超现实物是只对林天可见的死心塌地系统；现实性基线为硬现实',
  keywords: [],
});
push('世界观', '死心塌地系统', {
  path: P + '世界观/死心塌地系统.txt',
  abstract: '系统机制：绑定条件与名额、解绑三档代价、绑定深度、九项权限与余量、评价值归零的三段处置、不死定律、预判、第四面墙、水军、锁死与场域',
  keywords: [],
});
push('世界观', '财富等级体系', {
  path: P + '世界观/财富等级体系.txt',
  abstract: 'A1 到 A15 完整对照表与名额规则；本局刻度为 A9 五亿八名额已满，上两级对应两个空位',
  keywords: [],
});
push('世界观', '小说评论系统', {
  path: P + '世界观/小说评论系统.txt',
  abstract: '读者评论区：出现方式、六类语气、倾向随评价值分档、评论反向影响评价值、<user> 的间接战场、读者的硬边界',
  keywords: [],
});
push('世界观', '人设崩塌评价系统', {
  path: P + '世界观/人设崩塌评价系统.txt',
  abstract: '评价值定义与七档语义、涨落规则（单次下降≤3 回升≤12）、五种下降原因、归零的三段含义',
  keywords: [],
});

// ── 扮演准则 ──
push('扮演准则', '叙述视角与防出戏', {
  path: P + '扮演准则/叙述视角与防出戏.txt',
  abstract: '第三人称有限视角跟 <user>、全知段边界、元层与剧情的隔离、元叙事禁令、角色语域不被文风改写、时间写法',
  keywords: [],
});
push('扮演准则', '约束_防全知', {
  path: P + '扮演准则/约束_防全知.txt',
  abstract: '<user> 的信息边界：绝不可知项、只能观察的表象、六条禁止写法、真相的三条摸法、巧合的呈现规则',
  keywords: [],
});
push('扮演准则', '约束_防神化与呈现逻辑', {
  path: P + '扮演准则/约束_防神化与呈现逻辑.txt',
  abstract: '防的是呈现逻辑不是强度：冲突裁决三段顺序、结果怎么安排得像真的、系统自身的六条约束',
  keywords: [],
});
push('扮演准则', '约束_防绝望', {
  path: P + '扮演准则/约束_防绝望.txt',
  abstract: '<user> 的八条真实手段、为什么很难的三点、每轮要留下东西的节奏、六条反面写法、长期节奏',
  keywords: [],
});
push('扮演准则', '约束_合理性与法律道德', {
  path: P + '扮演准则/约束_合理性与法律道德.txt',
  abstract: '财富转移/行为变化/社会反应三处必须自洽、法律程序真写、短剧逻辑豁免、法律豁免与评价值跌破十的窗口',
  keywords: [],
});
push('扮演准则', '约束_系统行为准则', {
  path: P + '扮演准则/约束_系统行为准则.txt',
  abstract: '林天的决策逻辑：四类目标、面对 <user> 的判断、五条绝不做的事、认知边界、每轮必须有具体动作',
  keywords: [],
});
push('扮演准则', '思维链强制推理', {
  path: P + '扮演准则/思维链强制推理.txt',
  abstract: '每轮落笔前的十二段内部推理：定位/信息边界/林天决策/合理性/交涉/读者反应/评价更新/女性状态/<user> 状态/约束自查/防元层/变量更新',
  keywords: [],
});

// ── 时间线 ──
push('时间线', '剧情进度与章节节奏', {
  path: P + '时间线/剧情进度与章节节奏.txt',
  part: 'plot',
  abstract: '开局时间点与三方刻度、三条推进源、<user> 能改与不能改的、章节六到八轮与节点、三条结局线',
  keywords: [],
});

// ── 地理（@@if 门控） ──
const geoIf = (cond, file, extra) => ({
  contents: [{ content: cond }, { file }],
  ...extra,
});
push('地理', '上海', geoIf(
  "getvar('stat_data.世界.地点', { defaults: '' }).length > 0",
  P + '地理/上海.txt',
  { part: 'region', abstract: '上海的基调与外界固定配置：体面与实惠并重、媒体密度、金融法律资源、程序的两面性；写场景要写具体场所' , keywords: ['上海', '外滩', '陆家嘴', '黄浦江'] }
));
push('地理', '场景_林天产业', geoIf(
  "['外滩顶层公寓','外滩会所','城郊别墅','夜场','便利店'].some(k => getvar('stat_data.世界.地点', { defaults: '' }).includes(k))",
  P + '地理/场景_林天产业.txt',
  { part: 'scene', abstract: '林天的主场：外滩顶层公寓、外滩会所、城郊别墅、夜场、连锁便利店；场内监控与录音恰好故障，场域效果生效', keywords: ['公寓', '会所', '别墅', '夜场', '便利店'] }
));
push('地理', '场景_苏婉与市区', geoIf(
  "['苏婉集团','陆家嘴','家','幼儿园','医院','老城厢','菜场'].some(k => getvar('stat_data.世界.地点', { defaults: '' }).includes(k))",
  P + '地理/场景_苏婉与市区.txt',
  { part: 'scene', abstract: '苏婉集团总部、家、幼儿园、医院、老城厢、菜场；<user> 最熟的地盘，熟悉不等于安全', keywords: ['苏婉集团', '家', '幼儿园', '老城厢', '菜场'] }
));

// ── 阶段指导 ──
push('阶段指导', '回合行动规则', {
  path: P + '阶段指导/回合行动规则.txt',
  abstract: '每轮五段结构（林天先手/阻力判定/<user> 后手/冲突结算/世界反应）、行动类型与冷却、林天每轮两件事、单轮一次决定性进展、章节节点',
  keywords: [],
});
push('阶段指导', '交涉体系', {
  path: P + '阶段指导/交涉体系.txt',
  abstract: '交涉：何谓进交涉、四维属性、三幕制、d20 判定公式与固定加减八、六档差值门槛、压制状态、共识分、证据系统、僵持规则、判定落在面板',
  keywords: [],
});
push('阶段指导', '评价值档位主持', {
  path: P + '阶段指导/评价值档位主持.txt',
  abstract: '按评价值七档段落控制林天的行为模式与可用能力，每轮只渲染当前一档',
  keywords: [],
});

fs.writeFileSync('E:/Games/写卡/tavern_helper_template/_tools/sysbro/p03-rules.json', JSON.stringify(ops, null, 2));
console.log('ops =', ops.length);
