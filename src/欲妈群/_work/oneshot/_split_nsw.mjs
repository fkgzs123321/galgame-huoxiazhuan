import fs from 'fs';
import path from 'path';
const DIR = '世界书';
const CH = ['小夜','怜奈','林婉清','柚子','桃桃','白露','秦雨','群主','苏晴','铃','韩雪'];
const SONS = { 小夜:'夜凉', 怜奈:'温言', 林婉清:'林子墨', 柚子:'唐野', 桃桃:'陶宇', 白露:'白墨', 秦雨:'秦朗', 群主:'（无儿子）', 苏晴:'苏晨', 铃:'林悠', 韩雪:'韩子轩' };
const DROP = /阶段\d|模式\d|综合状态|与儿子|互动|行为分级|行为分支/;

for (const name of CH) {
  const f = path.join(DIR, `${name}_NSW档案.txt`);
  if (!fs.existsSync(f)) { console.log(`跳过 ${name}（无 NSW）`); continue; }
  let raw = fs.readFileSync(f, 'utf8');
  // 去掉头部 EJS 与 wrapper
  raw = raw.replace(/@@generate_before/g, '');
  raw = raw.replace(/<%[\s\S]*?%>/g, '');
  raw = raw.replace(/<member_nsw>/g, '').replace(/<\/member_nsw>/g, '');
  const lines = raw.split('\n');
  // 按 ## 分块
  const secs = [];
  let cur = { title: '', lines: [] };
  for (const l of lines) {
    if (/^# /.test(l)) continue;              // 丢掉 # X · 私密档案
    if (/^## /.test(l)) { secs.push(cur); cur = { title: l.replace(/^##\s*/, '').trim(), lines: [] }; continue; }
    if (/^【/.test(l.trim())) continue;
    cur.lines.push(l);
  }
  secs.push(cur);
  let out = [];
  for (const s of secs) {
    if (s.title === '' ) { continue; }
    if (DROP.test(s.title)) continue;
    out.push('### ' + s.title);
    out.push(...s.lines);
  }
  // 清死变量表
  const kept = [];
  let dropping = false;
  for (const l of out) {
    if (/^\|/.test(l) && l.includes('body.')) { dropping = true; continue; }
    if (dropping) { if (/^\|/.test(l)) continue; dropping = false; }
    kept.push(l);
  }
  let text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  text = text.replace(/<%= sonName %>/g, SONS[name]);
  console.log(`═══ ${name}｜保留 ${text.length} 字符（原 ${raw.length}）`);
  console.log(text.split('\n').filter(l => /^###/.test(l)).join(' ｜ '));
  fs.writeFileSync(path.join('_tmp_nsw', `${name}.md`), text, 'utf8');
}
