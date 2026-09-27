// 「我」的位置表述：在屏幕外，不在 <user> 体内（AI 写成「被囚禁在自己身体里的旁观者」）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const p = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/世界书/扮演准则/感知禁令.yaml';
const o = YAML.parse(fs.readFileSync(p, 'utf8'));

o['「我」在哪（位置写错会毁掉整张卡的视角）'] = {
  '位置': '**在屏幕外**，真实世界那一边。**不在 <user> 体内**，<user> 体内没有第二个人',
  '怎么到达': '「我」的话落到 <user> 的内层 —— 他听见了、他记住了，但说不出口、也做不出来',
  '✗ 禁止这样写': [
    '「我在他身体里」「被囚禁在他体内」「他的体内还住着一个人」',
    '「我被锁在他的皮囊里」「我看得见却动不了」（把「我」写成他体内的囚徒）',
    '「他的意识里有另一个声音在说话」（那是把「我」写成了他的第二人格）',
  ],
  '✓ 这样写': [
    '「他动了动嘴唇，没出声」',
    '「我想说别去，他站着没动」',
    '「这句话他没听见 —— 不对，他听见了，只是没地方说」',
    '「他把手抬起来一半，又放下了。我也不知道那是我在动，还是他自己在动」',
  ],
  '★ 判据': '写完问一句：这段话是「<user> 做不出动作」还是「我在他体内做不出动作」？前者对，后者错',
  '她那一侧不受影响': '无论「我」怎么使劲，她的选择、台词、动作只从她自己的状态长出来。她感知不到「我」的存在',
};

fs.writeFileSync(p, YAML.stringify(o, { lineWidth: 0 }));
try { YAML.parse(fs.readFileSync(p, 'utf8')); console.log('✅ 感知禁令.yaml：已加「「我」在哪」'); }
catch (e) { console.log('⚠ ' + e.message.split('\n')[0].slice(0, 50)); }
console.log('   ' + fs.statSync(p).size + ' 字节（上限 5,000）' + (fs.statSync(p).size > 5000 ? ' ⚠ 超' : ' ✅'));
