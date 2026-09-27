// 把 X_NSW档案 里「跨阶段恒定」的部分并进 X_基础信息，阶段/模式部分丢弃
// 原文件移入 _removed/NSW档案_20260921/
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const WB = path.join(ROOT, '世界书');
const OUT = path.join(ROOT, '_removed', 'NSW档案_20260921');
fs.mkdirSync(OUT, { recursive: true });

const CH = ['小夜', '怜奈', '林婉清', '柚子', '桃桃', '白露', '秦雨', '群主', '苏晴', '铃', '韩雪'];
const SONS = { 小夜: '夜凉', 怜奈: '温言', 林婉清: '林子墨', 柚子: '唐野', 桃桃: '陶宇', 白露: '白墨', 秦雨: '秦朗', 群主: '', 苏晴: '苏晨', 铃: '林悠', 韩雪: '韩子轩' };

const DROP_SEC = /阶段\d|模式\d|综合状态|与儿子|互动|行为分级|行为分支/;
const DROP_HEAD = /mode=|phase=|综合状态=|^###\s*\d+\.\d+\s*$/;

function canon(title) {
  if (/身体动态状态|身体锚点|身体基础档案|成员核心设定|身体细节/.test(title)) return '身体';
  if (/静态外观/.test(title)) return '静态外观';
  if (/敏感带/.test(title)) return '敏感带';
  if (/共感假阳具/.test(title)) return '共感假阳具';
  if (/高潮描写规范/.test(title)) return '高潮';
  if (/NSFW描写禁忌/.test(title)) return '禁忌';
  if (/play专项/.test(title)) return '专项玩法';
  if (/创伤设定/.test(title)) return '背景补充';
  return '其他';
}

for (const name of CH) {
  const src = path.join(WB, `${name}_NSW档案.txt`);
  if (!fs.existsSync(src)) { console.log(`跳过 ${name}`); continue; }
  let raw = fs.readFileSync(src, 'utf8');
  const origLen = raw.length;
  raw = raw.replace(/@@generate_before/g, '').replace(/<%[\s\S]*?%>/g, '');
  raw = raw.replace(/<\/?member_nsw>/g, '');

  // 按 ## 分块
  const secs = [];
  let cur = { title: '', lines: [] };
  for (const l of raw.split('\n')) {
    if (/^# /.test(l)) continue;
    if (/^## /.test(l)) { secs.push(cur); cur = { title: l.replace(/^##\s*/, '').trim(), lines: [] }; continue; }
    if (/^【/.test(l.trim())) continue;
    cur.lines.push(l);
  }
  secs.push(cur);

  // 保留 + 归并
  const groups = new Map();
  for (const s of secs) {
    if (!s.title || DROP_SEC.test(s.title)) continue;
    const key = canon(s.title);
    if (!groups.has(key)) groups.set(key, []);
    const g = groups.get(key);
    const inner = [];
    let dropping = false;
    for (const l of s.lines) {
      if (DROP_HEAD.test(l.trim())) continue;
      if (/^\|/.test(l) && l.includes('body.')) { dropping = true; continue; }
      if (dropping) { if (/^\|/.test(l)) continue; dropping = false; }
      if (/^#{1,3} /.test(l)) inner.push('#### ' + l.replace(/^#+\s*/, ''));
      else inner.push(l);
    }
    if (inner.join('').trim()) g.push(inner.join('\n').replace(/\n{3,}/g, '\n\n').trim());
  }

  const ORDER = ['身体', '静态外观', '敏感带', '共感假阳具', '高潮', '禁忌', '专项玩法', '背景补充', '其他'];
  const parts = [];
  for (const k of ORDER) {
    if (!groups.has(k)) continue;
    parts.push('### ' + k + '\n' + groups.get(k).join('\n\n'));
  }
  let text = parts.join('\n\n');
  const son = SONS[name];
  text = text.replace(/<%= sonName %>/g, son).replace(/（（））/g, '')
    .replace(/（{{user}}（[^）]*））/g, '').replace(/（{{user}}/g, '（').replace(/{{user}}/g, son || '他')
    .replace(/（\s*）/g, '').replace(/（）/g, '');

  // 写进基础信息
  const bpath = path.join(WB, `${name}_基础信息.txt`);
  if (!fs.existsSync(bpath)) { console.log(`⚠ ${name}_基础信息 不存在`); continue; }
  let base = fs.readFileSync(bpath, 'utf8');
  base = base.replace(/（[^）]*NSW静态外观见NSW档案[^）]*）/g, '')
    .replace(/（[^）]*NSW档案[^）]*）/g, '')
    .replace(/NSW静态外观见NSW档案/g, '')
    .replace(/另见\s*NSW档案/g, '');
  // 阶段行为不该留在基础信息里（已由 X_阶段N 承担）
  base = base.replace(/\n## [^\n]*当前阶段行为[^\n]*\n[\s\S]*?(?=\n## |$)/g, '\n');
  // 若已有「私密」段则先删掉旧的同名段
  base = base.replace(/\n## [^\n]*私密[^\n]*\n[\s\S]*$/, '\n');
  base = base.replace(/\n+$/, '') + '\n\n## 私密档案（NSFW 静态，跨阶段恒定）\n' + text + '\n';
  fs.writeFileSync(bpath, base, 'utf8');

  // 移走原 NSW 档案
  fs.renameSync(src, path.join(OUT, `${name}_NSW档案.txt`));
  console.log(`✅ ${name}｜NSW ${origLen} → 并入 ${text.length} 字符；基础信息现 ${base.length} 字符`);
}
