import fs from 'fs';
const text = fs.readFileSync('src/欲望都市/创作规划.yaml', 'utf8');
const m = text.match(/^characters:\n([\s\S]*?)(?=^\S|\Z)/m);
const sec = m ? m[1] : '';
const re = /- name: (\S+)\n([\s\S]*?)(?=- name:|\Z)/g;
let mm;
const names = [];
while ((mm = re.exec(sec)) !== null) {
  const name = mm[1], block = mm[2];
  const nsfw = block.match(/nsfw: (.+)/);
  names.push({ name, nsfw: nsfw ? nsfw[1].trim().replace(/['"]/g, '') : '' });
}
// 提取名器名（名器-XXX）
console.log('===== 38 人名器/技能/特质词 =====');
for (const { name, nsfw } of names) {
  const mingqi = nsfw.match(/名器-([^\/(]+)/);
  const jineng = nsfw.match(/技能-([^\/()]+)/);
  console.log(`${name}\t名器=${mingqi ? mingqi[1].trim() : '?'}\t技能=${jineng ? jineng[1].trim() : '?'}\t${nsfw.slice(0, 60)}`);
}

// 检查蓝灯内容是否含这些词
console.log('\n===== 蓝灯条目内容扫描（世界观+MVU）=====');
const blueFiles = [
  '世界书/世界观/世界设定.yaml', '世界书/世界观/飞机杯网络规则.yaml', '世界书/世界观/排班规则.yaml',
  '世界书/世界观/战斗系统.yaml', '世界书/世界观/技能树.yaml', '世界书/世界观/道具与恢复系统.yaml',
  '世界书/世界观/生理数值规范与限制.yaml', '世界书/世界观/学业规则.yaml', '世界书/扮演准则/扮演准则.yaml',
  '世界书/变量/变量更新规则.yaml', '世界书/变量/变量字典与范围.yaml', '世界书/变量/叙事输出规范.yaml',
  '世界书/变量/情境上下文EJS.yaml', '世界书/变量/变量输出格式.txt', '世界书/变量/变量列表.txt',
  '世界书/变量/思维链强制输出.yaml', '世界书/阶段指导/阶段调度.yaml',
];
let allBlue = '';
for (const f of blueFiles) {
  try { allBlue += fs.readFileSync('src/欲望都市/' + f, 'utf8'); } catch (e) {}
}
for (const { name, nsfw } of names) {
  const words = nsfw.match(/[^\/()，,、\s]+/g) || [];
  for (const w of words) {
    if (w.length >= 2 && allBlue.includes(w) && !['名器', '技能', '特质', '缺陷'].includes(w)) {
      console.log(`⚠ ${name} 的词「${w}」出现在蓝灯内容中`);
    }
  }
}
console.log('扫描完成');
