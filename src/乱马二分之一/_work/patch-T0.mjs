import fs from 'node:fs';

const 目录 = '世界书/扮演准则/';
const 表 = [
  ['加载纪律', '加载纪律.yaml', 1, '引擎层与内容层的优先级；冲突取更具体的那条；正文不解释机制'],
  ['判定引擎', '判定引擎.txt', 2, '判定与战斗结果的注入通道。读局面变量，把引擎算好的结果交给人话，明写不许重算'],
  ['喜剧铁律', '喜剧铁律.yaml', 3, '格斗恋爱喜剧基调；四拍单元铺垫误解爆发收束；禁悲剧化；没人真死真残；诅咒全作无人解除'],
  ['叙述准则', '叙述准则.yaml', 4, '第三人称跟玩家角色；感知范围与越界禁令；玩家输入权；动作与台词规范'],
  ['变身判定权', '变身判定权.yaml', 5, '变身由规则五步判定不由叙事需要决定；湿度结算；目击者三档；体态变化只改身体不改人格'],
  ['认知边界', '认知边界.yaml', 6, '谁知道什么由当前节点决定；九能带刀永远分不清辫子姑娘与乱马；防全知'],
  ['防口胡', '防口胡.yaml', 7, '不许发明招式道具角色设定溺泉；新内容只许来自考据档案与条目'],
  ['推进纪律', '推进纪律.yaml', 8, '四十六节点的推进条件与方式；禁止穿越；世界状态以当前节点为准'],
];

const patch = 表.map(([名, 文件, order, abstract]) => ({
  op: 'add',
  path: '/entryManifest/扮演准则/' + 名,
  value: {
    path: 目录 + 文件,
    scope: 'specific',
    keywords: [],
    abstract,
    strategy: { type: 'constant' },
    position: { type: 'before_character_definition', order },
  },
}));

fs.writeFileSync('src/乱马二分之一/_work/patch-T0.json', JSON.stringify(patch, null, 0));
console.log('已生成 patch，共 ' + patch.length + ' 条注册');
表.forEach(([名, 文件, o]) => console.log('  order ' + String(o).padStart(2) + '  ' + 名.padEnd(6) + 文件));
