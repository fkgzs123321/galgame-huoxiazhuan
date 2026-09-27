// 引擎条目耦合审计：检查 euphoria 的引擎层文件里是否夹带 euphoria 专属内容
// 判据（模块化设计 §三）：「抽掉同级生2/底座的内容，它还成立吗？」成立 = 机制层（可搬）
const fs = require('fs');
const path = require('path');
const ROOT = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-euphoria';

// euphoria 专属词（底座内容）—— 词表要全，否则守卫是假的
const 专属 = ['密室', '合欢', '安藤', '莳羽', '葵菜', '白夜', '真中', '帆刈', '乐园',
  '鬼畜', '学园篇', '学园', '记忆篇', '记忆', '处刑', '处决', '电椅', '监视器', '装置房', '装置',
  '五个人', '都子', '叶线', '梨香', '菜月', '凛音', '五扇门', '第五关', '逃出去',
  '底座_euphoria', '叶'];
// 引擎概念（可保留）
const 引擎概念 = ['摄像头', '四态', '反抗值', '兴奋度', '熟练度', '屏幕外'];

const targets = [];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(yaml|txt|md)$/.test(f)) targets.push(p);
  }
}
for (const sub of ['世界书/世界观/引擎', '世界书/扮演准则', '世界书/阶段指导', '世界书/角色/屏幕外的她']) {
  const d = path.join(ROOT, sub);
  if (fs.existsSync(d)) walk(d);
}

let clean = 0, dirty = 0;
const rows = [];
for (const p of targets) {
  const t = fs.readFileSync(p, 'utf8');
  const hit = 专属.filter(w => t.includes(w));
  const 概念 = 引擎概念.filter(w => t.includes(w));
  const rel = p.replace(ROOT + '\\', '').replace(ROOT + '/', '');
  rows.push({ rel, size: t.length, hit, 概念 });
  if (hit.length) dirty++; else clean++;
}

rows.sort((a, b) => b.hit.length - a.hit.length || a.rel.localeCompare(b.rel));
console.log(''.padEnd(46) + '字符   夹带   引擎概念');
for (const r of rows) {
  const mark = r.hit.length ? '❌' : '✅';
  console.log(mark + ' ' + r.rel.padEnd(42) + String(r.size).padStart(6) + '   ' +
    (r.hit.length ? r.hit.join(',') : '—').padEnd(20) + ' ' + (r.概念.join(',') || '—'));
}
console.log('\n✅ 零耦合 ' + clean + ' 个 / ❌ 夹带底座内容 ' + dirty + ' 个 / 共 ' + targets.length);
