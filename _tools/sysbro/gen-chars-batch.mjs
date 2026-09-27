// 通用：为一批角色生成注册 patch
//   用法: node gen-chars-batch.mjs 林雅芝:雅芝 王秀兰:秀兰
import fs from 'node:fs';

const P = '世界书/角色/';
const pairs = process.argv.slice(2).map((s) => s.split(':'));
if (!pairs.length) throw new Error('需要 名字:昵称 参数');

const ops = [];
const add = (name, leaf) => ops.push({ op: 'add', path: `/entryManifest/角色/${name}`, value: leaf });

const tag = (t, who, file, extra) => ({
  contents: [{ content: `---\n<${t} character="${who}">` }, { file }, { content: `</${t}>` }],
  ...extra,
});

for (const [name, nick] of pairs) {
  const kw = [name, nick];
  add(`${name}_基础信息`, tag('character_basic', name, `${P}${name}/基础信息.txt`, {
    part: 'basic',
    scope: 'specific',
    abstract: `${name}的基础信息：身份、体型落点与识别特征、身体此刻的样子、背景、关系、她身上那一处招牌动作`,
    keywords: kw,
  }));
  add(`${name}_性格调色盘`, tag('character_palette', name, `${P}${name}/性格调色盘.txt`, {
    part: 'personality',
    scope: 'specific',
    abstract: `${name}的性格调色盘：底色 + 按时期七档的主色调、点缀与各自衍生行为`,
    keywords: kw,
  }));
  add(`${name}_多阶段`, {
    contents: [
      { content: `@@if getvar('stat_data.镜头.对象', { defaults: '' }) === '${name}' || matchChatMessages(['${name}', '${nick}'])` },
      { content: `---\n<character_stage character="${name}">` },
      { file: `${P}${name}/多阶段.txt` },
      { content: `</character_stage>` },
    ],
    part: 'other',
    scope: 'specific',
    abstract: `${name}的档位行为：按时期七档给出她是谁、本档边界、会做与不做、身体那一处、说什么、与林天与她那边的男人、越界后果、独有触发。仅镜头落在她身上时渲染`,
    keywords: kw,
  });
  add(`${name}_语料库`, tag('character_speech', name, `${P}${name}/语料库.txt`, {
    part: 'other',
    scope: 'specific',
    abstract: `${name}语料：对林天、对她那边的男人、对外人、独处五种场合的纯对话与口癖`,
    keywords: kw,
  }));
}

const out = 'E:/Games/写卡/tavern_helper_template/_tools/sysbro/p-chars.json';
fs.writeFileSync(out, JSON.stringify(ops, null, 2));
console.log('ops =', ops.length, '->', out);
