// _final_check_yyjs.mjs - 怨妇救赎 终检
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD = path.join(__dirname, 'src', '怨妇救赎');
const card = JSON.parse(fs.readFileSync(path.join(CARD, '怨妇救赎.json'), 'utf8'));
const entries = card.data.character_book.entries;
const enabled = entries.filter(e => e.enabled);
const consts = enabled.filter(e => e.constant);
const sels = enabled.filter(e => !e.constant && e.selective);

console.log('--- 3. 条目统计 ---');
console.log(`总数 ${entries.length} | 启用 ${enabled.length} | 蓝灯 ${consts.length} | 绿灯 ${sels.length} | 关灯 ${entries.length - enabled.length}`);

// 孤儿检查：注册引用的文件都存在
const registered = [];
entries.forEach(e => {
  const c = JSON.stringify(e);
  const m = c.match(/"file":"([^"]+)"/g) || [];
  m.forEach(x => registered.push(x.slice(8, -1)));
});
const missing = registered.filter(f => !fs.existsSync(path.join(CARD, f)));
console.log('引用的文件全部存在:', missing.length ? '✗ ' + missing.join(',') : '✓');

// 未注册的源文件
const all = [];
function walk(d) { fs.readdirSync(d).forEach(f => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(yaml|txt)$/.test(f)) all.push(path.relative(CARD, p).replace(/\\/g, '/')); }); }
walk(CARD);
const unreg = all.filter(f => !registered.includes(f) && !f.startsWith('世界书/变量/initvar') && !f.startsWith('开场白'));
console.log('源文件全部注册:', unreg.length ? '⚠ 未注册: ' + unreg.join(',') : '✓（创作规划/开场白/正则/脚本除外）');

// token 估算
function zhCount(s) { return (s.match(/[\u4e00-\u9fff]/g) || []).length; }
let total = 0; const per = {};
entries.forEach(e => { const c = String(e.content || '').replace(/<%_?[\s\S]*?_?%>/g, ''); const n = zhCount(c); total += n; if (e.enabled) per['蓝灯'] = (per['蓝灯'] || 0) + n; });
console.log('--- 4. token 基线 ---');
console.log(`全卡静态中文 ${total} 字 ≈ ${total} token（蓝灯常驻部分 ≈ ${per['蓝灯'] || 0} token）`);

// 关键链路
console.log('--- 5. 关键链路 ---');
console.log('开场白含initvar块:', String(card.data.first_mes).includes('<initvar>'));
const rs = card.data.extensions?.regex_scripts || {};
console.log('状态栏正则已注册:', !!rs['状态栏界面'], '| 隐藏AI更新变量:', !!rs['隐藏AI更新变量']);
console.log('MVU脚本已内嵌:', !!card.data.extensions?.tavern_helper?.scripts?.MVU);
const zod = card.data.extensions?.zod?.scriptName || card.data.extensions?.world?.zod?.scriptName;
console.log('Zod脚本:', zod || '（schema.ts 已重建进卡）');
console.log('卡体积:', (fs.statSync(path.join(CARD, '怨妇救赎.json')).size / 1024).toFixed(0) + 'KB');
