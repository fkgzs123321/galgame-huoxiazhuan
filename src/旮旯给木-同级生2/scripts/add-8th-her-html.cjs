// ③④ 改 opening.html：套数组加第 8 项 + 注释补 9=郁灼
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/opening.html';
let h = fs.readFileSync(p, 'utf8');

const 纪清行 = "{ k: '纪清', 号: '清', 句: '一格都不能漏。', 注: '她不是在玩，是在施工', tag: ['全收集', 'risk'] }";
const 郁灼行 = "{ k: '郁灼', 号: '灼', 句: '我来的，不是看你们谈恋爱的。', 注: '跳剧情，只带最狠的那条', tag: ['爆表', 'risk'] }";

if (!h.includes('郁灼')) {
  if (!h.includes(纪清行)) { console.log('❌ 找不到纪清那一行'); process.exit(1); }
  h = h.replace(纪清行, 纪清行 + ',\n    ' + 郁灼行);
  console.log('✅ 套数组：加第 8 项（郁灼）');
} else console.log('   套数组已有');

const 旧注 = '//   0=说明式  1=表单  2=温砚 3=丰娆 4=舒晏 5=唐响 6=沈眠 7=莫漾 8=纪清';
const 新注 = '//   0=说明式  1=表单  2=温砚 3=丰娆 4=舒晏 5=唐响 6=沈眠 7=莫漾 8=纪清 9=郁灼';
if (h.includes(旧注) && !h.includes('9=郁灼')) {
  h = h.replace(旧注, 新注);
  console.log('✅ 注释：补 9=郁灼');
} else console.log('   注释已有或未命中');

fs.writeFileSync(p, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('✅ 语法通过（' + h.length + ' 字符）'); }
catch (e) { console.log('❌ ' + e.message.slice(0, 80)); process.exit(1); }

/* 验证 */
const 名 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '郁灼'];
const 全 = 名.every(n => h.includes(n));
console.log('套数组含 8 个她: ' + 全);
console.log('注释含 9=郁灼: ' + h.includes('9=郁灼'));
// swipe_id 自动算的验证
const 数组 = (h.match(/\{ k: '[^']+', 号: '[^']+'/g) || []).map(s => (s.match(/'([^']+)', 号/) || [])[1]);
console.log('套数组顺序: ' + 数组.join(' / '));
console.log('→ 郁灼 的 swipe_id = 2 + ' + 数组.indexOf('郁灼') + ' = ' + (2 + 数组.indexOf('郁灼')));
