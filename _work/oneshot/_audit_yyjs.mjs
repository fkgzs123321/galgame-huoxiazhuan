// _audit_yyjs.mjs - 怨妇救赎 灯位+EJS 全量审计
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD = path.join(__dirname, 'src', '怨妇救赎');
// 支持纯 JSON 或 PNG 卡
function readCardData(fp) {
  const buf = fs.readFileSync(fp);
  if (buf[0] !== 0x89) return JSON.parse(buf.toString('utf8'));
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const ty = buf.slice(pos + 4, pos + 8).toString('latin1');
    if (ty === 'tEXt') {
      const d = buf.slice(pos + 8, pos + 8 + len);
      const nul = d.indexOf(0);
      if (d.slice(0, nul).toString('latin1') === 'chara') {
        return JSON.parse(Buffer.from(d.slice(nul + 1).toString('latin1'), 'base64').toString('utf8'));
      }
    }
    if (ty === 'IEND') break;
    pos += 12 + len;
  }
  throw new Error('PNG 卡内未找到 chara 数据');
}
const card = readCardData(path.join(CARD, '怨妇救赎.json'));
const entries = card.data.character_book.entries;

console.log('══════ 一、灯位审计 ══════');
const byFlag = { 蓝灯: [], 绿灯: [], 关灯: [] };
entries.forEach(e => {
  if (!e.enabled) { byFlag.关灯.push(String(e.comment || e.key || e.id)); return; }
  const nm = String(e.comment || e.key || '');
  if (e.constant) byFlag.蓝灯.push(nm);
  else if (e.selective) byFlag.绿灯.push(nm);
  else byFlag.其他?.push ? byFlag.其他.push(nm) : (byFlag['其他'] = [nm]);
});
for (const k of ['蓝灯', '绿灯', '关灯']) {
  console.log(`\n【${k}】${byFlag[k] ? byFlag[k].length : 0} 条`);
  (byFlag[k] || []).forEach(n => console.log('  ·', n));
}
if (byFlag['其他']) { console.log('\n【未分类(无constant/selective)】'); byFlag['其他'].forEach(n => console.log('  ·', n)); }

console.log('\n══════ 二、绿灯关键词审计 ══════');
entries.filter(e => e.enabled && e.selective).forEach(e => {
  console.log(`  ${String(e.comment || e.key)} | keys=[${(e.keys || []).join(', ')}]`);
});

console.log('\n══════ 三、EJS getvar 路径 vs schema 审计 ══════');
// 从 schema.ts 提取合法字段集
const schema = fs.readFileSync(path.join(CARD, 'schema.ts'), 'utf8');
const validTop = ['时间', '玩家', '当前目标', '女主'];
const validWomanFields = new Set();
// 女主 record 的字段（4 空格缩进的 `键: z.` 行）
const fieldRe = /^\s{4}([\u4e00-\u9fffA-Za-z]+): z\./gm;
let fm;
while ((fm = fieldRe.exec(schema)) !== null) validWomanFields.add(fm[1]);
const validBodyFields = ['胸部', '阴道', '肛门', '嘴', '肌肤', '大腿', '臀部'];
const validBodySub = { 胸部: ['状态', '敏感度'], 阴道: ['状态', '湿润度', '敏感度'], 肛门: ['状态'], 嘴: ['状态'], 肌肤: ['状态', '体温'], 大腿: ['状态'], 臀部: ['状态'] };
const validPsychFields = ['欲望度', '羞耻感', '兴奋', '依恋', '精神状态'];
console.log('schema 女主字段:', [...validWomanFields].join(', '));

// 收集所有 getvar 路径
const paths = new Map(); // path -> 条目名
const dynPatterns = [];
entries.forEach(e => {
  const nm = String(e.comment || e.key || '');
  const c = String(e.content || '');
  const re = /getvar\(['"](stat_data\.[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(c)) !== null) {
    const p = m[1];
    if (p.includes("' + ") || p.includes('" + ')) dynPatterns.push({ nm, p });
    else {
      if (!paths.has(p)) paths.set(p, []);
      paths.get(p).push(nm);
    }
  }
});

let errCount = 0;
for (const [p, nms] of paths) {
  const segs = p.split('.');
  const ok = (() => {
    if (!segs[0] === 'stat_data') return false;
    if (segs[1] === '时间' && ['日期', '星期', '时段'].includes(segs[2])) return true;
    if (segs[1] === '玩家' && ['体力', '性欲', '勃起度', '资金池', '全网名声'].includes(segs[2])) return true;
    if (segs[1] === '当前目标' && segs.length === 2) return true;
    if (segs[1] === '女主' && segs.length === 3) return true; // 存在性检查 stat_data.女主.{名}
    if (segs[1] === '女主' && segs.length >= 4) {
      const f = segs[3];
      if (validWomanFields.has(f)) {
        if (f === '身体状态' && segs.length === 5) return validBodyFields.includes(segs[4]);
        if (f === '身体状态' && segs.length === 6) return (validBodySub[segs[4]] || []).includes(segs[5]);
        if (f === '心理状态' && segs.length === 5) return validPsychFields.includes(segs[4]);
        if (f === '专属') return true;
        return true; // 简单字段（含 决裂/怀孕/阶段等）
      }
      return false;
    }
    return false;
  })();
  if (!ok) { errCount++; console.log(`  ✗ ${p}  ← ${nms.join(', ')}`); }
}
console.log(errCount === 0 ? '  ✓ 全部静态 getvar 路径合法' : `  ⚠ ${errCount} 条路径异常`);

console.log('\n动态路径（拼接，人工核对）:');
dynPatterns.forEach(d => console.log(`  · [${d.nm}] ${d.p.slice(0, 100)}`));

console.log('\n══════ 四、@@if / @@generate_before 装饰器审计 ══════');
entries.forEach(e => {
  const nm = String(e.comment || e.key || '');
  const c = String(e.content || '');
  if (c.startsWith('@@if')) {
    const open = (c.match(/getvar\(/g) || []).length;
    const cond = c.split('\n')[0];
    console.log(`  ${nm} | ${cond.slice(0, 110)}${open > 0 ? '' : ' ⚠无getvar'}`);
  }
  if (c.includes('@@generate_before')) console.log(`  ${nm} | @@generate_before 前置执行`);
});
