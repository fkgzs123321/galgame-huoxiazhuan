// 阶段条目自检（按各人味道判，不按同一把尺子）
// 脚本只列线索；最终判定人工看。
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), '世界书');

const FLAVOR = {
  郝佳期: '骚妈+母猪',
  韩雪: '骚妈', 铃: '骚妈',
  苏晴: '母猪', 桃桃: '母猪', 柚子: '母猪',
  秦雨: '白洁', 怜奈: '白洁', 林婉清: '白洁',
  苏媚: '母猪', 群主: '母猪', 小夜: '骚妈',
  白露: '淫视'
};

const LI = ['奶子','胸','腿根','屁股','阴部','屄','逼','阴唇','乳尖','奶头','乳晕','屁眼','臀','龟头','鸡巴','茎身','蛋','骚水','口水','奶水','奶腥','精液','浓精','白浆','阴道','阴毛','乳房','小屁股','内裤','裙子','裆'];
const ONO = ['噗叽','咕啾','咕呲','咕叽','啪嗒','啪叽','啪、','窸窣','咯吱','噗','啪','撕','蹭','绷','勒','唔','嗯','呜'];
const SMELL = ['味','腥','香','臭','焖','沐浴露','香皂','洗发水','香水','汗','腋下','颈侧','乳沟','裆'];
// 味道化的脏（白洁/冷冽不许有）
const DIRTY_STRONG = ['骚屄','骚逼','烂屄','黑屄','肥逼','母猪穴','肉便器','精厕','鸡巴套','母猪','母狗','贱货','骚货','小畜生','骚货','屄','逼','鸡巴','操'];
// 通用脏度（骚妈/母猪按这个数）
const DIRTY_ALL = ['屄','逼','鸡巴','操','射','骚','浪','贱','母狗','母猪','肉便器','精厕','烂'];
const BODY = ['夹腿','夹紧','夹住','洇','湿透','发胀','涨','发抖','抖','喘','收紧','一阵绞','绞','淌','爬','黏','烫','绷','抽','屏','咬','抓','抠','掐','溢','漏','颤','脚趾','乳尖','膝盖','腿根','腰塌','僵','弓起','软下去','硬','潮','透','湿','热','红','浪声','叫出声','抖了一下'];
const HIDE = ['睡','醉','半麻','催眠','暗示','不知情','没醒','梦','装着','掖被角','擦干净','裁','名义','藏','不动声色','没看出来'];
const GROUP = ['群里','群内','发群','群里'];

function c(list, s) { return list.reduce((n, t) => n + (s.split(t).length - 1), 0); }

const files = fs.readdirSync(DIR).filter(f => /_阶段\d\.txt$/.test(f)).sort();
let bad = 0;
console.log('文件'.padEnd(15) + '味道'.padEnd(9) + '字\t料\t脏\t强脏\t❤\t拟声\t气味\t身体\t长句\t判定');
for (const f of files) {
  const who = f.split('_')[0];
  const no = Number(f.match(/阶段(\d)/)[1]);
  const fl = FLAVOR[who] || '?';
  const all = fs.readFileSync(path.join(DIR, f), 'utf8');
  const sents = all.replace(/\n/g, '').split(/[。！？]/).filter(x => x.trim());
  const r = {
    f, fl, no,
    字: all.length,
    料: c(LI, all),
    脏: c(DIRTY_ALL, all),
    强脏: c(DIRTY_STRONG, all),
    拟声: c(ONO, all),
    气味: c(SMELL, all),
    '❤': (all.match(/❤/g) || []).length,
    身体: c(BODY, all),
    隐蔽: c(HIDE, all),
    群: c(GROUP, all),
    长句: sents.filter(s => s.length >= 50 && s.length <= 90).length,
    破: (all.match(/——/g) || []).length,
    星: (all.match(/\*\*/g) || []).length,
    叹: (all.match(/！/g) || []).length,
    波浪: (all.match(/~/g) || []).length
  };
  if (who === '铃') { r.脏 += ['cock','fuck','chatte','bite','bais','おまんこ','ちんこ','すけべ','자지','보지'].reduce((n,t)=>n+(all.split(t).length-1),0); }
  const fail = [];
  const FOUR = ['她觉得', '她不知道', '她经常', '她喜欢'];
  const four = FOUR.reduce((n, t) => n + (all.split(t).length - 1), 0);
  if (four > 0) fail.push('四禁句式' + four);
  if (all.includes('冷冽')) fail.push('冷冽字样');
  if (no <= 4 && r.隐蔽 < 1) fail.push('隐蔽');
  if (no === 5 && !/知道|默认|名义|对外|母子/.test(all)) fail.push('阶段5缺对外名义');
  if (r.群 < 1) fail.push('群晒');
  if (r.破 > 0) fail.push('破折号');
  if (r.星 > 0) fail.push('星号');
  const needBody = fl === '冷冽' ? 4 : 6;
  if (r.身体 < needBody) fail.push('身体' + r.身体);
  if (fl === '骚妈' || fl === '骚妈+母猪') {
    const need = no <= 2 ? 6 : (no <= 4 ? 8 : 10);
    if (r.料 < 12) fail.push('料' + r.料);
    if (r.脏 < need) fail.push('脏' + r.脏 + '/' + need);
    if (r['❤'] < 1) fail.push('❤');
    if (r.长句 < 1) fail.push('长句');
  } else if (fl === '母猪') {
    const need = no <= 2 ? 6 : (no <= 4 ? 10 : 14);
    if (r.料 < 12) fail.push('料' + r.料);
    if (r.脏 < need) fail.push('脏' + r.脏 + '/' + need);
    if (r.拟声 < 2) fail.push('拟声' + r.拟声);
  } else if (fl === '白洁') {
    if (r.料 < 12) fail.push('料' + r.料);
    if (r.强脏 > 2) fail.push('串味' + r.强脏);
    if (r['❤'] > 0) fail.push('❤串味');
    if (r.叹 > 0) fail.push('叹号');
  } else if (fl === '冷冽禁用') {
    if (r.强脏 > 0) fail.push('串味' + r.强脏);
    if (r['❤'] > 0) fail.push('❤串味');
    if (r.叹 > 0) fail.push('叹号');
    if (r.波浪 > 0) fail.push('波浪');
  } else if (fl === '淫视') {
    if (r.料 < 12) fail.push('料' + r.料);
  }
  if (fail.length) bad++;
  console.log(f.padEnd(13) + fl.padEnd(7) + r.字 + '\t' + r.料 + '\t' + r.脏 + '\t' + r.强脏 + '\t' + r['❤'] + '\t' + r.拟声 + '\t' + r.气味 + '\t' + r.身体 + '\t' + r.长句 + '\t' + (fail.length ? '✗ ' + fail.join(' ') : '✓'));
}
console.log(`\n共 ${files.length} 档，待改 ${bad} 档`);
