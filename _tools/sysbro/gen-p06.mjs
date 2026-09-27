// 生成角色层注册 patch
import fs from 'node:fs';

const P = '世界书/角色/';
const ops = [];
const add = (name, leaf) => ops.push({ op: 'add', path: `/entryManifest/角色/${name}`, value: leaf });

const tag = (t, who, file, extra = {}) => ({
  contents: [
    { content: `---\n<${t} character="${who}">` },
    { file },
    { content: `</${t}>` },
  ],
  ...extra,
});

// ── 速览（catalog，常驻） ──
add('角色速览', {
  path: P + '角色速览.txt',
  scope: 'catalog',
  abstract: '角色速览：三方定位、已绑定八人（身份/时期/识别特征一句话）、未绑定两人、十八位关键家属索引；识别用，不含细节',
  keywords: [],
});

// ── 玩家档案 ──
add('玩家档案_基础信息', {
  path: P + '玩家/基础信息.txt',
  part: 'basic',
  scope: 'specific',
  abstract: '被夺妻的一方：三十五岁 A9，苏婉集团副董，近三个月瘦一圈，眼下青黑，鬓角白了；不知道系统的存在',
  keywords: ['副董'],
});
add('玩家_心理阶段', {
  path: P + '玩家/心理阶段.txt',
  part: 'other',
  abstract: '按觉醒度四档段落控制 <user> 的心理与行动倾向：蒙在鼓里／起疑／反扑／收网',
  keywords: [],
});

// ── 林天（AI 自主扮演的反派） ──
add('林天_基础信息', tag('character_basic', '林天', P + '林天/基础信息.txt', {
  part: 'basic',
  scope: 'specific',
  abstract: '林天：二十八岁，死心塌地系统宿主，A9（五亿），对外是壳公司群实控人；左眉骨浅疤、左手腕水滴烫伤、一只磨白的 Zippo',
  keywords: ['林天', '林总'],
}));
add('林天_性格调色盘', tag('character_palette', '林天', P + '林天/性格调色盘.txt', {
  part: 'personality',
  abstract: '林天的性格调色盘：底色玩世不恭，按评价值七档给出主色调与点缀及各自衍生行为',
  keywords: ['林天', '林总'],
}));
add('林天_多阶段', tag('character_stage', '林天', P + '林天/多阶段.txt', {
  part: 'other',
  strategy: { type: 'constant' },
  abstract: '林天的档位行为：按评价值七档给出本档边界、会做与不会做、他的手、说话方式、对对<user>与身边人、越界后果、独有触发。常驻',
  keywords: [],
}));
add('林天_语料库', tag('character_speech', '林天', P + '林天/语料库.txt', {
  part: 'other',
  abstract: '林天语料：对<user>、对被绑定者日常与带压、对苏婉、对下属、独处五种场合的纯对话与口癖',
  keywords: ['林天', '林总'],
}));

// ── 苏婉（<user> 的妻子，本轮目标） ──
const suwanGate = (file, t, extra) =>
  ({
    contents: [
      { content: `@@if getvar('stat_data.镜头.对象', { defaults: '' }) === '苏婉' || matchChatMessages(['苏婉', '婉婉'])` },
      { content: `---\n<${t} character="苏婉">` },
      { file },
      { content: `</${t}>` },
    ],
    ...extra,
  });

add('苏婉_基础信息', tag('character_basic', '苏婉', P + '苏婉/基础信息.txt', {
  part: 'basic',
  scope: 'specific',
  abstract: '苏婉：三十三岁，苏婉集团董事长 A9，<user> 的妻子，青梅竹马二十年结婚七年，儿子乐乐六岁；体型落点高挑＋纤细，婚戒不许人碰',
  keywords: ['苏婉', '婉婉'],
}));
add('苏婉_性格调色盘', tag('character_palette', '苏婉', P + '苏婉/性格调色盘.txt', {
  part: 'personality',
  abstract: '苏婉的性格调色盘：底色温柔贤惠，按时期七档给出主色调与点缀及各自衍生行为',
  keywords: ['苏婉', '婉婉'],
}));
add('苏婉_多阶段', suwanGate(P + '苏婉/多阶段.txt', 'character_stage', {
  part: 'other',
  strategy: { type: 'constant' },
  abstract: '苏婉的档位行为：按时期七档给出她此刻是谁、本档边界、会做与不会做、身体那一处、说什么、与<user>与林天、越界后果、独有触发。仅镜头落在她身上时渲染',
  keywords: ['苏婉', '婉婉'],
}));
add('苏婉_语料库', tag('character_speech', '苏婉', P + '苏婉/语料库.txt', {
  part: 'other',
  abstract: '苏婉语料：日常、关系变化时、对林天、对下属、独处五种场合的纯对话与口癖',
  keywords: ['苏婉', '婉婉'],
}));

fs.writeFileSync('E:/Games/写卡/tavern_helper_template/_tools/sysbro/p06-chars.json', JSON.stringify(ops, null, 2));
console.log('ops =', ops.length);
