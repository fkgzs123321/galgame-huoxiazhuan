// 回滚：user 的讲话与内心合回一类（用户原话：「user 的讲话和内心用一个颜色」）
// 我把上一条「分离！」误读成设计要求 → 擅自拆成『』+（）→ 回滚
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const p = path.join(D, '世界书/扮演准则/叙述准则.yaml');
let t = fs.readFileSync(p, 'utf8');

const 新段 = [
  '标记规范:',
  '  总则: 四类标记各管一个人的「说」与「想」。同一个人的说话和念头用同一个标记、同一个颜色',
  '  屏幕外的那个人:',
  '    标记: 〔〕',
  '    范围: 她的原话、她的念头、从屏幕外落下来的声音，全部放这一对里',
  '    例: 〔怎么都不讲话。〕',
  '  游戏里的角色:',
  '    标记: 「」',
  '    范围: 女角与男配说出口的话，以及他们的内心。两者同标记、同颜色，不分开',
  '    例: 「没关系的。」／「他今天怎么一直不看我。」',
  '  <user>:',
  '    标记: （）',
  '    范围: 他说出口的话 + 他没出声的那一层。两者同标记、同颜色，不分开',
  '    例: （我不想的。）／（我问她一句就好。）',
  '  环境与旁白:',
  '    标记: 不加括号，直接写',
  '    范围: 第三人称的动作、反应、环境、光线、声音',
  '    为什么: 它是底，不需要抢注意力，靠分段和位置区分',
  '  四条硬规则:',
  '    - 只有上面四类。别的括号一律不要用',
  '    - 说话的人是谁，靠「名字 + 台词」说清楚，不要只靠括号',
  '    - 旁白与环境不加括号，加了会被当成别的东西上色',
  '    - 标记只是标记，不要写成「『她说了』」这种解释',
].join('\n') + '\n';

const i = t.indexOf('标记规范:');
const j = t.indexOf('\n笔触:', i);
t = t.slice(0, i) + 新段 + t.slice(j + 1);
fs.writeFileSync(p, t);

const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
try { YAML.parse(fs.readFileSync(p, 'utf8')); console.log('✅ 叙述准则 YAML 通过'); }
catch (e) { const ln = e.linePos ? e.linePos[0].line : 0; const L = fs.readFileSync(p, 'utf8').split(/\r?\n/); console.log('❌ 第' + ln + '行: ' + e.message.split('\n')[0].slice(0, 50) + '\n   ' + (L[ln - 1] || '')); }
console.log('   user 的讲话与内心已合回一类（（））｜『』已删');
