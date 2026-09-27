// 修「本卡变量路径」：AI 写的路径一半不存在 → 整批 JSON Patch 失败
//   实测错的：/场面/地点（应是 /局面/场面/地点）、/时间/时段进度（不存在）
const fs = require('fs');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

/* 从 initvar 抽出真实结构，写进条目（不许 AI 自己编） */
const iv = YAML.parse(fs.readFileSync(D + '/世界书/变量/initvar.yaml', 'utf8'));
const 列 = (o) => Object.keys(o || {}).join(' / ');

const 内容 = `你是负责更新变量的模型。这一层写变量时，路径照下面抄。

■ 顶层只有这十二个键，**不许自己编别的**：
${Object.keys(iv).join(' / ')}

■ 各层的子键（照抄，别记错层级）：
  时间: ${列(iv.时间)}
  主角: ${列(iv.主角)}
  局面: ${列(iv.局面)}
  局面.场面: ${列(iv.局面 && iv.局面.场面)}
  女角: <每位女角一个键，各自有 好感/关系/三部位/身体/记忆 等>
  她: ${列(iv.她)}
  世界 / 当前女角状态 / 经济 / 过程 / 剧情 / 终局

■ 最容易写错的三处（★ 写错会让**整批更新全部失败**）：
  ✗ /场面/地点          → ✓ **/局面/场面/地点**（场面在局面下面，不是顶层！）
  ✗ /时间/时段进度       → ✓ **/时间/时段**（没有「时段进度」这个键）
  ✗ /场面/女角          → ✓ **/当前女角状态** 或 **/女角/<名>**

■ ★★ 一批里只要有一条路径不存在，**整批作废**
  所以写之前先核对每一条的路径。宁可少写一条，不要写错一条。

■ 照抄这几条实际的（把值换成你的）：
  {"op":"replace","path":"/局面/当前选项","value":{"1":{"文本":"…","等级":"微","感觉":"…"},"2":{…},"3":{…},"4":{…}}}
  {"op":"replace","path":"/局面/她的倾向","value":"3"}
  {"op":"replace","path":"/局面/场面/地点","value":"自宅二楼洗手间"}
  {"op":"replace","path":"/主角/反抗值","value":92}
  {"op":"replace","path":"/时间/时段","value":"下午"}
  {"op":"replace","path":"/主角/做事","value":42}

★ 当前选项一次写满四条，键名 "1"~"4"，每条只含 文本/等级/感觉 三个字段。
★ 整个数组包在 <UpdateVariable> 里，先 <Analysis> 再 <JSONPatch>。
`;

fs.writeFileSync(D + '/世界书/变量/本卡变量路径.yaml', 内容);
console.log('✅ 本卡变量路径.yaml 已重写（' + 内容.length + ' 字符）');

/* 规划留痕 */
const P = D + '/创作规划.yaml';
const o = YAML.parse(fs.readFileSync(P, 'utf8'));
o['变更记录'] = o['变更记录'] || [];
o['变更记录'].push({ 日期: '2026-09-16', 内容: ['修 本卡变量路径：AI 写的 /场面/地点 与 /时间/时段进度 不存在 → 整批 JSON Patch 失败；补真实层级与「一条错全批废」的警告'] });
fs.writeFileSync(P, YAML.stringify(o, { lineWidth: 0 }));
console.log('✅ 规划已留痕');
