// 照英雄坛说：删 NSFW反差；基础信息 = 基本信息/外貌特征/背景设定/关系设定/她是谁/她的骚/身体/骚的反应/感官
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/世界书/角色/底座_nanpa2/鸣泽唯';

const 基 = YAML.parse(fs.readFileSync(path.join(D, '基础信息.yaml'), 'utf8'));

/* ① 「身体」从 外貌特征 里提出来 */
const 身体 = {};
for (const k of ['身体', '奶子', '屁股', '腰腹', '逼', '奶头', '特色']) {
  if (基.外貌特征 && 基.外貌特征[k] !== undefined) { 身体[k] = 基.外貌特征[k]; delete 基.外貌特征[k]; }
}
/* 若身体本来就在顶层（用户原版），直接用原版 */
const 身体源 = Object.keys(身体).length ? 身体 : (基.身体 || {});

/* ② 结果：照英雄坛说的顺序 */
const 结果 = {};
结果['基本信息'] = 基.基本信息;
结果['外貌特征'] = 基.外貌特征;
结果['背景设定'] = 基.背景设定;
结果['关系设定'] = 基.关系设定;
结果['她是谁'] = 基['她是谁'];
结果['她的骚'] = 基['她的骚'];
结果['身体'] = 身体源;
结果['骚的反应'] = [
  '★ 她不淫叫，她咬 —— 咬嘴唇、咬手背、咬他的肩膀。出声比做这事还难',
  '★ 她唯一会主动的一刻：他睡着以后，她会自己把腿分开一点，试一下，然后立刻并上',
  '★ 第一次之后她不敢看他，三天里端菜都端低一点，把脸挡在碗后面',
  '★ 身体先叛变，嘴后认 —— 说「不要」的时候下面已经在淌',
  '★ 一被点破就停 —— 他要是在那时候把「你其实在意我」说出来，她整个人停在原地。这比任何身体接触都致命',
].join('\n');
结果['感官'] = 基['感官'];

fs.writeFileSync(path.join(D, '基础信息.yaml'), YAML.stringify(结果, { lineWidth: 0 }));
console.log('✅ ① 基础信息 照英雄坛说重排（' + fs.statSync(path.join(D, '基础信息.yaml')).size + ' 字节）');
console.log('   顶层键: ' + Object.keys(结果).join(' / '));
console.log('   外貌特征: ' + Object.keys(结果.外貌特征).join(' / '));
console.log('   身体:     ' + Object.keys(结果.身体).join(' / '));

/* ③ 删 NSFW反差.yaml */
const p = path.join(D, 'NSFW反差.yaml');
if (fs.existsSync(p)) { fs.rmSync(p); console.log('✅ ② 已删除 NSFW反差.yaml'); }

console.log('\n鸣泽唯 目录:');
for (const f of fs.readdirSync(D).sort()) console.log('  ' + String(fs.statSync(path.join(D, f)).size).padStart(6) + '  ' + f);
