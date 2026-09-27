// 专项体检：有来无回 / 没公式 / 没落脚点 / 没闭环
const fs = require('fs');
const path = require('path');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const S = JSON.parse(fs.readFileSync(D + '/tavern-cards-state.json', 'utf8'));

const 条目 = [];
const 扫 = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) 扫(p);
    else if (/\.(yaml|txt)$/.test(f.name)) 条目.push({ 名: f.name.replace(/\.\w+$/, ''), 文件: p, 内容: fs.readFileSync(p, 'utf8') });
  }
};
扫(path.join(D, '世界书'));

console.log('══════ ① 有来无回（提了「之后/下次/以后/后续」但没给结果）══════');
const 来无回 = [];
for (const x of 条目) {
  const 行 = x.内容.split('\n');
  for (let i = 0; i < 行.length; i++) {
    const l = 行[i];
    if (/(之后|下次|以后|后续|接着|然后会|将来|往后)/.test(l) &&
        !/(写进|记进|存进|扣|加|减|置为|清空|触发|结算|进入|变成|改为|下一天|下一层)/.test(l)) {
      来无回.push([x.名, i + 1, l.trim().slice(0, 78)]);
    }
  }
}
if (来无回.length) 来无回.slice(0, 16).forEach(([n, i, l]) => console.log('  ⚠ [' + n + ':' + i + '] ' + l));
else console.log('  无 ✅');

console.log('');
console.log('══════ ② 没具体公式（说了涨/跌/变，但没数字）══════');
const 没公式 = [];
for (const x of 条目) {
  const 行 = x.内容.split('\n');
  for (let i = 0; i < 行.length; i++) {
    const l = 行[i];
    if (/(上涨|下降|增加|减少|变多|变少|累加|衰减|增长|消耗)/.test(l) && !/\d/.test(l) && !/(见|按|＝|=)/.test(l)) {
      没公式.push([x.名, i + 1, l.trim().slice(0, 78)]);
    }
  }
}
if (没公式.length) 没公式.slice(0, 16).forEach(([n, i, l]) => console.log('  ⚠ [' + n + ':' + i + '] ' + l));
else console.log('  无 ✅');

console.log('');
console.log('══════ ③ 没落脚点（写了「可能/或许/看情况」但没给分支）══════');
const 没落点 = [];
for (const x of 条目) {
  const 行 = x.内容.split('\n');
  for (let i = 0; i < 行.length; i++) {
    const l = 行[i];
    if (/(可能|或许|也许|看情况|视情况|酌情)/.test(l) &&
        !/(如果|若|当|时|则|就|分支|两种|三种|之一)/.test(l)) {
      没落点.push([x.名, i + 1, l.trim().slice(0, 78)]);
    }
  }
}
if (没落点.length) 没落点.slice(0, 16).forEach(([n, i, l]) => console.log('  ⚠ [' + n + ':' + i + '] ' + l));
else console.log('  无 ✅');

console.log('');
console.log('══════ ④ 没闭环（说了「每一层/每次」但没给「然后」）══════');
const 没闭环 = [];
for (const x of 条目) {
  const 行 = x.内容.split('\n');
  for (let i = 0; i < 行.length; i++) {
    const l = 行[i];
    if (/(每一层|每层|每天|每次|每一回合)/.test(l) &&
        !/(然后|接着|末尾|结束|之后|再|下一)/.test(l) && l.length < 70) {
      没闭环.push([x.名, i + 1, l.trim().slice(0, 78)]);
    }
  }
}
if (没闭环.length) 没闭环.slice(0, 14).forEach(([n, i, l]) => console.log('  ⚠ [' + n + ':' + i + '] ' + l));
else console.log('  无 ✅');

console.log('');
console.log('══════ ⑤ 会产生误会的关系词（该由用词黑名单管）══════');
const 误会 = [];
for (const x of 条目) {
  const 行 = x.内容.split('\n');
  for (let i = 0; i < 行.length; i++) {
    const l = 行[i];
    if (/(他的选择|他会选|他的反应|他的回应|他决定|他愿意|她在等他|她察觉|她知道我|她看出我)/.test(l)) {
      误会.push([x.名, i + 1, l.trim().slice(0, 78)]);
    }
  }
}
if (误会.length) 误会.forEach(([n, i, l]) => console.log('  ⚠ [' + n + ':' + i + '] ' + l));
else console.log('  无 ✅（用词黑名单生效）');
