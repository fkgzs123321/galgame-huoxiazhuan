#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// check-rules.mjs · 按 tavern-cards/references/rules-check.md 扫全部条目
//
// ★ 规范里有 9 大类检查。本脚本按类逐条实现：
//   ① 绝对零度      主观评价 / 陈旧比喻 / 堆砌形容词 / 模糊意象
//   ② 八股化        词表黑名单 + 句式黑名单 + ★ 破折号
//   ③ 具体性        抽象标签 / 笼统表述 / 空洞关系
//   ④ 活人感        （开场白专用，只列线索）
//   ⑤ 假性主体      无生命主语 / 情绪被动承受
//   ⑥ 远距离叙事    情绪宣告 / 自我认知宣告 / 上帝视角 / 疏离描写
//   ⑦ 翻译腔        系表 / 介词前置 / 被动式 / 宾语前置
//   ⑧ 元叙事        写作指引 / 分析框架 / 用途说明 / 标记词
//   ⑨ 跨条目         重复（列线索）/ 引用（硬违规）
//
// ★ 铁律：脚本只「列线索」，判定必须人工。
//   硬违规（命中即必须改）与软线索（要人看）分开报。
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const WB = path.resolve(path.join(__dirname, '..', '世界书'));
// 只扫「进 prompt 的条目」；契约层（底座_xxx）与脚本不过这套
const 跳过目录 = ['底座_yingxiong', 'scripts'];
// ★ 规则文档目录：里面的『对自己说』是在**规定**怎么写，不是在写内容，不算违规
const 规则文档 = ['扮演准则'];

// ── 硬违规：命中即必须改 ──
const 硬 = [
  { 类: '②八股·破折号', re: /——/g, 说明: '删掉破折号连同后半段，前半段是否仍完整？完整则后半段冗余' },
  { 类: '⑨跨条目引用', re: /详见\s|参见\s|见《|如上所述|如前所述|与.{2,10}配套|对应「|系列里/g, 说明: '每条必须独立可读；EJS 条件块之间也互不可见' },
  { 类: '⑧元叙事', re: /戏剧用途|写作要点|写作指引|本条规则|本卡独家|本卡专属|此阶段让|承担反差功能/g, 说明: '给作者看的笔记要删' },
  { 类: '⑥远距离·上帝视角', re: /并不知道.{0,12}将|并不知道.{0,12}会/g, 说明: '读者不需要被预告' },
  { 类: '⑥远距离·疏离描写', re: /语气听不出|听不出任何情绪|看不出任何表情/g, 说明: '删，让对话本身传达' },
  { 类: '②八股·微表情', re: /嘴角微微上扬|眼中闪过一丝|眼中闪过一抹|眼底闪过一丝/g, 说明: '改为简洁动作' },
  { 类: '②八股·语气声线', re: /带着.{1,6}的口吻|用.{1,6}的语气|语气中带着/g, 说明: '让对话本身承担' },
  { 类: '②八股·极端情绪', re: /陷入极大的|万念俱灰|铺天盖地|滔天的/g, 说明: '改为具体行为或状态' },
  { 类: '②八股·陈旧比喻', re: /像小兽|投石入湖|心湖泛起|泛起涟漪/g, 说明: '删除比喻，直陈事实' },
  { 类: '③空洞数字', re: /停留了?[0-9.]+秒|注视了?[0-9.]+秒/g, 说明: '删' },
];

// ── 软线索：列出来给人看，不自动判违规 ──
const 软 = [
  { 类: '②八股·模糊词', re: /似乎|仿佛|宛如|如同/g, 说明: '改为具体描述（先看是不是真需要）' },
  { 类: '②八股·否定转折', re: /不是[^，。]{1,12}，只是|不是[^，。]{1,12}，而是/g, 说明: '只保留后半句' },
  { 类: '⑤假性主体·抽象概念', re: /一个(念头|想法|感觉)[^，。]{0,4}(成形|冒了?出来|升起)/g, 说明: '命名实际行为者，或改成「她想到」' },
  { 类: '⑤假性主体·感受自动发生', re: /一股[^，。]{0,6}(涌了?上来|蔓延|升起)|被一种[^，。]{0,8}(包裹|笼罩)/g, 说明: '改为直接展现行为' },
  { 类: '⑥远距离·情绪宣告', re: /感到了?一阵|感到了?一种/g, 说明: '改为行为或对话' },
  { 类: '⑥远距离·自我认知宣告', re: /意识到自己|对自己说/g, 说明: '删「意识到/对自己说」，留内容' },
  { 类: '⑦翻译腔·系表判断', re: /(?:她|他|它|这个人|那个人)是[^，。]{1,10}(?:性格|类型|那种人|的人)[，。]/g, 说明: '判断是否符合「主→状→动→宾」自然语序' },
  { 类: '⑦翻译腔·被字句', re: /被她听见|被他看见|被她感受到/g, 说明: '改主动' },
  { 类: '①绝对零度·堆砌形容词', re: /[，、](精美绝伦|无与伦比|美轮美奂|惊心动魄)的/g, 说明: '保必要特征即可' },
  { 类: '①绝对零度·模糊意象', re: /那个地方|那种东西|那样的事/g, 说明: '改成具体指称' },
];

function walk(d, 出) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) {
      if (跳过目录.includes(e.name)) continue;
      walk(f, 出);
    } else if (/\.(yaml|txt|md)$/.test(e.name)) 出.push(f);
  }
  return 出;
}

const 文件s = walk(WB, []);
const 硬明细 = [], 软明细 = [];
let 硬数 = 0, 软数 = 0;

for (const f of 文件s) {
  const 行s = fs.readFileSync(f, 'utf8').split('\n');
  const 短 = path.relative(WB, f);
  const 是规则文档 = 规则文档.some(d => 短.startsWith(d));
  for (const r of 硬) {
    for (let i = 0; i < 行s.length; i++) {
      const m = 行s[i].match(r.re);
      if (m) { 硬数 += m.length; 硬明细.push({ 类: r.类, 文件: 短, 行: i + 1, 例: m[0], 说明: r.说明 }); }
    }
  }
  for (const r of 软) {
    if (是规则文档 && r.类.includes("自我认知")) continue;   // 规则文档里提这句是正当的
    for (let i = 0; i < 行s.length; i++) {
      const m = 行s[i].match(r.re);
      if (m) { 软数 += m.length; 软明细.push({ 类: r.类, 文件: 短, 行: i + 1, 例: m[0], 说明: r.说明 }); }
    }
  }
}

const 按类 = (a) => { const g = {}; for (const x of a) (g[x.类] = g[x.类] || []).push(x); return g; };

console.log('═'.repeat(72));
console.log('rules-check · 旮旯给木-英雄坛说/世界书 ｜ 扫了 ' + 文件s.length + ' 份');
console.log('依据：tavern-cards/references/rules-check.md 的 9 大类');
console.log('═'.repeat(72));

console.log('\n【硬违规】命中即必须改');
const 硬组 = 按类(硬明细);
if (!Object.keys(硬组).length) console.log('  ✅ 无');
else for (const [k, v] of Object.entries(硬组)) {
  console.log('  ' + k + '　' + v.length + ' 处');
  console.log('     ' + v[0].说明);
  v.slice(0, 5).forEach(x => console.log('     · ' + x.文件 + ':' + x.行 + '　「' + x.例 + '」'));
  if (v.length > 5) console.log('     …… 还有 ' + (v.length - 5) + ' 处');
}

console.log('\n【软线索】要人看，不自动判违规');
const 软组 = 按类(软明细);
if (!Object.keys(软组).length) console.log('  ✅ 无');
else for (const [k, v] of Object.entries(软组)) {
  console.log('  ' + k + '　' + v.length + ' 处　（' + v[0].说明 + '）');
  v.slice(0, 3).forEach(x => console.log('     · ' + x.文件 + ':' + x.行 + '　「' + x.例 + '」'));
  if (v.length > 3) console.log('     …… 还有 ' + (v.length - 3) + ' 处');
}

console.log('\n' + '─'.repeat(72));
console.log('硬违规 ' + 硬数 + ' 处 ｜ 软线索 ' + 软数 + ' 处');
console.log('★ 脚本只列线索，判定必须人工 —— 软线索看着像违规，可能正是对的。');
console.log('★ 三类未脚本化，要人工过：④活人感（开场白）/ ⑨跨条目重复 / ③具体性');
console.log('─'.repeat(72));
process.exit(硬数 ? 1 : 0);
