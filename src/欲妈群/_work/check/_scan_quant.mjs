// 模糊指代扫描（收紧版）：只报「换了主语却没说是什么器官」的写法
//   ⛔ 那两团 / 那两坨 / 那两片 / 那两瓣 / 那两点 / 那处 / 那道缝 / 两团东西 …
//   ✅ 放过：那只手 / 两只手 / 两只脚 / 那截脖子 / 那道下颌线 / 那截衬衫 / 那只管子（后面紧跟部位名）
// 用法：node _work/check/_scan_quant.mjs [目录] [文件名关键词]
import fs from 'fs';
const DIR = process.argv[2] || '_work/data';
const KW = process.argv[3] || '_data_';
const BAD = /(那两团|那两坨|那两片|那两瓣|那两点|那处|那道缝|两团东西|两只填出来的)/g;
const OKAFTER = /^[^，。；、）】]{0,6}?(手|脚|腿|膝|脖子|颈|下颌|肩|背|腰|眼|衬衫|管子|杆|碗|脚踝|腕|布|纸|笔|椅子)/;
const files = fs.readdirSync(DIR).filter(f => f.includes(KW) && f.endsWith('.mjs'));
let n = 0;
for (const f of files) {
  fs.readFileSync(DIR + '/' + f, 'utf8').split('\n').forEach((l, i) => {
    BAD.lastIndex = 0; let m;
    while ((m = BAD.exec(l))) {
      const tail = l.slice(m.index + m[0].length);
      if (m[0].startsWith('那只') || m[0].startsWith('两只')) continue;
      if (OKAFTER.test(tail)) continue;
      console.log(f + ':' + (i + 1) + '  「' + m[0] + tail.slice(0, 14) + '」');
      n++;
    }
  });
}
console.log('模糊指代 ' + n + ' 处 / ' + files.length + ' 个数据文件');
