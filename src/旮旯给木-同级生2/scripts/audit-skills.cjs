// skills 合规审计器 —— 逐项对照规范原文，**不看其他卡**
// 依据：
//   references/rules-check.md            （10 类写作质量检查，共通依据）
//   references/conventions.md            （keywords 约束、路径、注册）
//   references/configuration.md           （D1+ 禁止、装饰器唯一）
//   references/requirements/entry-types.md（类型边界）
//   references/requirements/planning-yaml.md
//   references/ui/regex-scripts.md        （已单独核过）
// 用法: node audit-skills.cjs
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');

const 检查 = {};
const 加 = (类, 文件, 行号, 内容) => (检查[类] = 检查[类] || []).push({ 文件: 文件.replace(/\\/g, '/'), 行号, 内容: String(内容).slice(0, 70) });

// 引擎/机制条目（这些是给 AI 的规则，不是叙事正文，八股类检查不适用）
const 免检 = /(世界观\/引擎|扮演准则|阶段指导|变量|事件|时间线\/时间轴索引|时间线\/人物出现索引|底座_nanpa2\/八十八町|底座_nanpa2\/关系封闭|底座_nanpa2\/人设补丁)/;

const 文件列表 = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(yaml|txt)$/.test(f)) 文件列表.push(p);
  }
})(WB);

for (const p of 文件列表) {
  const rel = path.relative(D, p);
  const 叙事 = !免检.test(rel);              // 只有叙事内容才套八股/翻译腔检查
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  L.forEach((l, i) => {
    const n = i + 1;
    // ① 破折号（rules-check：全文一律违规，不可保留）
    if (l.includes('——')) 加('① 破折号', rel, n, l);
    if (!叙事) return;
    // ② 八股词汇黑名单
    for (const w of ['似乎', '几乎', '仿佛', '如同', '宛如', '像小兽', '投石入湖', '心湖',
      '嘴角微微上扬', '眼中闪过一丝', '万念俱灰', '陷入极大的恐惧', '涟漪'])
      if (l.includes(w)) 加('② 八股黑名单', rel, n, '[' + w + '] ' + l);
    // ③ 语气声线描写
    if (/带着.{1,6}的(口吻|语气)|用.{1,6}的(口吻|语气)/.test(l)) 加('③ 语气声线', rel, n, l);
    // ④ 否定转折句式
    if (/不是.{1,12}，?(只是|而是)/.test(l)) 加('④ 否定转折', rel, n, l);
    // ⑤ 空洞数字
    if (/目光停留\d|停了\d+\.\d+秒/.test(l)) 加('⑤ 空洞数字', rel, n, l);
    // ⑥ 假性主体 / 远距离叙事 / 被动感受
    for (const re of [/一个念头[在在]/, /一股.{0,6}(涌了上来|蔓延|包裹)/, /她被一种.{0,8}包裹/,
      /她(感到|意识到)(自己|一阵|一种)/, /她(并)?不知道.{0,6}(这|那).{0,4}(将|会)改变/,
      /她对自己说/, /她的语气听不出/, /一股暖意[在在]/, /(这句话|这句话).{0,4}(戳中了|击中)/])
      if (re.test(l)) 加('⑥ 假性主体/远距叙事', rel, n, l);
    // ⑦ 翻译腔
    for (const re of [/^(她|他)是.{1,8}的[。，]/, /对.{1,10}[，,](她|他)(始终|一直)是/, /被.{1,8}(感受到|所)/])
      if (re.test(l)) 加('⑦ 翻译腔', rel, n, l);
  });
  // ⑧ 元叙事（整文件，含注释外的可见文本）
  const t = fs.readFileSync(p, 'utf8');
  for (const re of [/^.*(AI ?写作要点|戏剧用途|本卡专属|本卡独家|用途说明)[:：].*$/gm, /^.*核心冲突_.*$/gm])
    { const m = t.match(re); if (m) m.forEach(x => 加('⑧ 元叙事', rel, 0, x.trim())); }
  // ⑨ 跨条目引用
  { const m = t.match(/^.*(详见|见 ?`|对应「|与.{1,10}配套).*$/gm); if (m) m.forEach(x => 加('⑨ 跨条目引用', rel, 0, x.trim())); }
}

// ⑩ keywords 约束（conventions.md:98-106）
{
  const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
  for (const [cat, es] of Object.entries(S.entryManifest))
    for (const [name, e] of Object.entries(es))
      for (const k of (e.keywords || [])) {
        if ([...k].length === 1) 加('⑩ 单汉字关键词', cat + '/' + name, 0, k);
        if (/^(老师|会长|同学|朋友|医生|导游)$/.test(k)) 加('⑩ 泛用关键词', cat + '/' + name, 0, k);
        if (/^[一二三四五六七八九十百千万]|成精|倾城/.test(k)) 加('⑩ 疑似成语/数字关键词', cat + '/' + name, 0, k);
      }
  // ⑪ D1+ 深度（configuration.md:23 铁律）
  for (const [cat, es] of Object.entries(S.entryManifest))
    for (const [name, e] of Object.entries(es)) {
      const d = e.position && e.position.depth;
      if (d != null && d > 0) 加('⑪ D1+ 深度违规', cat + '/' + name, 0, 'depth=' + d);
    }
  // ⑫ 一个条目只能有一个装饰器
  for (const [cat, es] of Object.entries(S.entryManifest))
    for (const [name, e] of Object.entries(es)) {
      const c0 = String(((e.contents || [])[0] || {}).content || '');
      const n = (c0.match(/@@/g) || []).length;
      if (n > 1) 加('⑫ 多个装饰器', cat + '/' + name, 0, c0.slice(0, 60));
    }
}

console.log('审计 ' + 文件列表.length + ' 个内容文件 + ' + 'entryManifest');
let 总 = 0;
for (const [类, v] of Object.entries(检查).sort()) {
  总 += v.length;
  console.log('\n【' + 类 + '】' + v.length + ' 处');
  v.slice(0, 8).forEach(x => console.log('   ' + x.文件 + (x.行号 ? ':' + x.行号 : '') + '  ' + x.内容));
  if (v.length > 8) console.log('   …另 ' + (v.length - 8) + ' 处');
}
console.log('\n════ 合计 ' + 总 + ' 处 ════');
