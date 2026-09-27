import fs from 'fs';
const F = 'C:/Users/64806/.workbuddy/skills/st-judge-calibration/SKILL.md';
const Q = String.fromCharCode(96);
const b = s => Q + s + Q;
const q = s => Q + Q + Q + s + Q + Q + Q;
let t = fs.readFileSync(F, 'utf8');
const 锚 = '在 Node 里把面板的 script 抠出来真跑一遍（喂假 DOM + 假接口），能直接抓到运行时错误：\n\n别忘了';
const 补 = '在 Node 里把面板的 script 抠出来真跑一遍（喂假 DOM + 假接口），能直接抓到运行时错误：\n\n'
  + q('js') + '\n'
  + 'const 脚本 = [...fs.readFileSync(面板html, \'utf8\').matchAll(/<script>([\\s\\S]*?)<\\/script>/g)][0][1];\n'
  + 'const 假元素 = { style:{}, _a:{}, addEventListener(){}, closest(){ return null },\n'
  + '  getAttribute(k){ return this._a[k] || null }, setAttribute(k,v){ this._a[k] = v },\n'
  + '  classList:{ add(){}, remove(){} } };\n'
  + 'const doc = { getElementById: () => 假元素, querySelector: () => 假元素, querySelectorAll: () => [假元素],\n'
  + '  addEventListener(){}, createElement: () => 假元素, body: 假元素, head: 假元素,\n'
  + '  documentElement: 假元素 };          // ★ 必须有 documentElement（applyTheme 会用它）\n'
  + 'new Function(\'document\',\'window\',\'getVariables\',\'getLastMessageId\',\'triggerSlash\',\'console\',\n'
  + '  \'setTimeout\',\'setInterval\',\'createChatMessages\', 脚本)\n'
  + '  (doc, { frameElement:null }, () => ({ stat_data:{ 元数据:{ 难度:\'困难\' } } }), () => 5,\n'
  + '   () => {}, console, setTimeout, setInterval, () => {});\n'
  + '// 跑到底不抛错 = 代码没问题 → 那"没反应"就是加载了旧文件（缓存）\n'
  + q('') + '\n\n别忘了';
if (t.indexOf(锚) < 0) { console.log('⚠ 锚点未命中'); process.exit(1); }
fs.writeFileSync(F, t.replace(锚, 补), 'utf8');
console.log('✓ skill 第七节代码块已补');
