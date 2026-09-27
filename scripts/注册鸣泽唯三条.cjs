// 注册鸣泽唯的 3 个新条目（NSFW反差 / 选项池 / 剧情线）
const fs = require('fs');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const S = JSON.parse(fs.readFileSync(D + '/tavern-cards-state.json', 'utf8'));

const 模板 = S.entryManifest.角色['鸣泽唯_NSFW反差与剧情线'];
const 底 = "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2' && matchChatMessages(['鸣泽唯', '小唯'], { start: 0 })";

/* ① 删旧 */
delete S.entryManifest.角色['鸣泽唯_NSFW反差与剧情线'];
console.log('✅ ① 删掉 鸣泽唯_NSFW反差与剧情线');

/* ② NSFW反差 + 选项池：selective */
const 两个 = [
  ['鸣泽唯_NSFW反差', 'NSFW反差.yaml', '角色/other：鸣泽唯_NSFW反差', 220],
  ['鸣泽唯_选项池', '选项池.yaml', '角色/other：鸣泽唯_选项池', 221],
];
for (const [名, 文件, 摘要, order] of 两个) {
  const e = JSON.parse(JSON.stringify(模板));
  e.abstract = 摘要;
  e.contents = [{ content: 底 }, { file: '世界书/角色/底座_nanpa2/鸣泽唯/' + 文件 }];
  e.position.order = order;
  S.entryManifest.角色[名] = e;
}

/* ③ 剧情线：constant + EJS 按天分四段 */
S.entryManifest.角色['鸣泽唯_剧情线'] = {
  scope: 'specific',
  part: 'other',
  keywords: ['鸣泽唯', '小唯'],
  abstract: '角色/other：鸣泽唯_剧情线（按 时间.天数 EJS 分四段）',
  contents: [
    { content: 底 },
    { file: '世界书/角色/底座_nanpa2/鸣泽唯/剧情线.yaml' },
  ],
  enabled: true,
  strategy: { type: 'constant' },
  position: { type: 'after_character_definition', order: 230 },
};

fs.writeFileSync(D + '/tavern-cards-state.json', JSON.stringify(S, null, 2));
console.log('✅ ② 注册 3 个：鸣泽唯_NSFW反差 / 鸣泽唯_选项池（selective）｜鸣泽唯_剧情线（constant + 按天 EJS）');
console.log('   角色组条目数: ' + Object.keys(S.entryManifest.角色).length);
