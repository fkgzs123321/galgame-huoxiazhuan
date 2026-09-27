// 全面台账：把卡里所有「可能指器官的词」逐个列出来（次数 + 上下文），供人工判定
//   分三类候选：① 器官主体词 ② 「器官＋肉」材质词 ③ 部位定位词 ④ 体液词 ⑤ 雄性命根词
import fs from 'node:fs';
import path from 'node:path';

const R = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/';
const 跳过 = ['变量'];
// 词料速查（词表本身）与淫视两篇（照搬规范）单列，先不混入台账
const 照搬文件 = /文风\/(词料速查|淫视叙事总纲|淫视肉体落笔)\.txt$/;

const 候选 = {
  '乳系 · 主体': ['奶子', '奶头', '奶', '乳', '乳房', '奶袋'],
  '乳系 · 材质/部位': ['奶肉', '乳肉', '乳丘', '乳尖', '乳晕', '乳粒', '乳沟', '乳根', '乳饼', '奶包'],
  '屄系 · 主体': ['屄', '逼', '穴', '阴唇', '阴蒂', '屄唇', '屄瓣'],
  '屄系 · 材质/部位': ['屄肉', '腔肉', '屄缝', '屄洞', '屄口', '屄帘', '阴阜', '耻丘', '骚腔', '肉穴', '肉腔'],
  '臀腿系': ['尻', '尻肉', '臀', '臀肉', '屁股', '腚肉', '腿肉', '腿根', '嫩肉', '软肉', '腹股沟', '臀缝', '股沟'],
  '肉体整体（材质词）': ['媚肉', '淫肉', '雌肉', '贱肉', '骚躯', '淫躯', '雌躯', '肉躯', '媚躯', '肉棱', '肉壶', '肉套', '肉便器'],
  '体液': ['淫液', '骚水', '屄水', '白浆', '白浊', '浓精', '种汁', '奶水', '乳汁', '精浆'],
  '命根': ['鸡巴', '屌', '肉茎', '龟头', '卵蛋', '卵袋', '精囊', '棒身'],
};

const walk = (d) => {
  const o = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = d + e.name;
    if (e.isDirectory()) {
      if (跳过.includes(e.name)) continue;
      o.push(...walk(p + '/'));
    } else if (e.name.endsWith('.txt')) o.push(p);
  }
  return o;
};

const 命中 = {}; // word -> {n, 样本[]}
const files = walk(R).filter((p) => !照搬文件.test(p.replace(/\\/g, '/')));

for (const p of files) {
  const rel = path.relative(R, p).split(path.sep).join('/');
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const grp of Object.keys(候选)) {
      for (const w of 候选[grp]) {
        let idx = -1;
        while ((idx = line.indexOf(w, idx + 1)) !== -1) {
          const key = grp + '｜' + w;
          命中[key] = 命中[key] || { n: 0, 样本: [] };
          命中[key].n++;
          if (命中[key].样本.length < 3) {
            命中[key].样本.push(`${rel}:${i + 1} …${line.slice(Math.max(0, idx - 16), idx + w.length + 10)}…`);
          }
        }
      }
    }
  }
}

for (const grp of Object.keys(候选)) {
  console.log('\n═══ ' + grp + ' ═══');
  for (const w of 候选[grp]) {
    const k = grp + '｜' + w;
    if (!命中[k]) {
      console.log('  ' + w + '  —— 0');
      continue;
    }
    console.log('  ' + w + '  —— ' + 命中[k].n);
    for (const s of 命中[k].样本) console.log('      ' + s);
  }
}
