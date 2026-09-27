// 淫视体检 · 按「淫视改写规范.md」的可数判据量每一份文件
// 用法: node scripts/检查淫视.cjs [女角名...]    不给名字 = 全量
const fs = require('fs');
const path = require('path');

const 根 = path.join(__dirname, '..', '世界书', '角色', '底座_nanpa2');

// 🅱️4 词料（抽常用的那一批；命中数是下限判据，不是穷举）
const 词料 = ('沉坠奶肉 吊钟骚奶 紧致翘挺小奶 小巧胸弧 腻软奶肉 涨硬凸起的奶头 浅粉乳尖 粗挺乳粒 被嗦得发亮的乳粒 ' +
  '肥尻 焖熟桃尻 腴软肥尻 安产型肥尻 深邃臀缝 臀腿折痕 焖出潮气的臀沟 ' +
  '纤细骚腿 丰润长腿 腿根嫩肉 腹股沟线 ' +
  '滚烫肥屄 泥泞淫屄 肥美耻丘 媚穴 肉腔 屄口 肉缝 嫩肉 ' +
  '肥厚阴唇 焖熟屄唇 涨硬阴蒂 阴蒂 ' +
  '清亮骚水 腥甜屄水 骚水 淫液 湿痕 ' +
  '骚躯 焖熟淫躯 白腻肉躯 媚肉 雌肉 白到透粉 薄嫩皮肉 骚肉 奶肉 尻肉 腰线 臀缝').split(/\s+/);

// 身体段用的主语候选（器官/部位）
const 器官主语 = /^(那|这|两|一|三)?(两团|两瓣|两条|两片|一圈|一块|一截|一对|一团|那道|那截|那两|那只|整片|整团|整条|满|媚肉|奶肉|尻肉|屄肉|嫩肉|骚水|乳尖|奶头|腰线|臀线|腿根|肉缝|屄口|阴唇|阴蒂|乳粒|奶子|屁股|腰)/;

const 只测 = process.argv.slice(2);
const 女角 = fs.readdirSync(根).filter((d) => fs.statSync(path.join(根, d)).isDirectory());
const 目标 = 只测.length ? 女角.filter((d) => 只测.includes(d)) : 女角;

const 汇总 = [];
console.log('══════ 淫视体检 ══════');
for (const 人 of 目标) {
  const 目录 = path.join(根, 人);
  const 文件 = fs.readdirSync(目录).filter((f) => /\.yaml$/.test(f) && !/\.bak/.test(f)).sort();
  const 行 = [];
  for (const f of 文件) {
    const t = fs.readFileSync(path.join(目录, f), 'utf8');
    const 破折号 = (t.match(/——/g) || []).length;
    // 顿号排比：一行里出现 2 个以上「、」视为三项并列
    const 顿号排比 = t.split('\n').filter((l) => (l.match(/、/g) || []).length >= 2).length;
    const 命中词 = 词料.filter((w) => t.includes(w)).length;
    // 句长：按句号/换行切，取中文句子的平均长度（只在正文行上量）
    const 句 = t.split(/[。！？\n]/).map((s) => s.trim()).filter((s) => s.length >= 6);
    const 均句长 = 句.length ? Math.round(句.reduce((a, b) => a + b.length, 0) / 句.length) : 0;
    // 主语：含「她」的句子 vs 器官开头的句子
    const 含她 = 句.filter((s) => /她/.test(s)).length;
    const 器官句 = 句.filter((s) => 器官主语.test(s)).length;
    const 器官比 = 句.length ? Math.round((器官句 / 句.length) * 100) : 0;
    行.push({ f, 字符: t.length, 破折号, 顿号排比, 命中词, 均句长, 器官比, 含她 });
  }
  汇总.push({ 人, 行 });
}

const 超长 = [];
for (const { 人, 行 } of 汇总) {
  const 坏 = 行.filter((r) => r.破折号 || r.顿号排比 || r.字符 > 4500);
  const 标 = 坏.length ? '⚠️' : '  ';
  console.log(标 + ' ' + 人.padEnd(7) + ' 文件' + String(行.length).padStart(3) +
    ' ／ 破折号 ' + 行.reduce((a, r) => a + r.破折号, 0) +
    ' ／ 顿号排比 ' + 行.reduce((a, r) => a + r.顿号排比, 0) +
    ' ／ 词料均 ' + Math.round(行.reduce((a, r) => a + r.命中词, 0) / 行.length) +
    ' ／ 均句长 ' + Math.round(行.reduce((a, r) => a + r.均句长, 0) / 行.length) +
    ' ／ 器官主语比 ' + Math.round(行.reduce((a, r) => a + r.器官比, 0) / 行.length) + '%');
  for (const r of 坏) 超长.push(人 + '/' + r.f + '  ' +
    [r.破折号 ? '破折号' + r.破折号 : '', r.顿号排比 ? '顿号排比' + r.顿号排比 : '', r.字符 > 4500 ? '超长' + r.字符 : ''].filter(Boolean).join(' '));
}
if (超长.length) { console.log('\n待修：'); 超长.forEach((x) => console.log('   ' + x)); }
else console.log('\n✅ 破折号 / 顿号排比 / 长度 全部合规');
