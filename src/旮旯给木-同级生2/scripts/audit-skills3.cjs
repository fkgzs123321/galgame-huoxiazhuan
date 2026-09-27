// skills 合规审计 · 第三轮 —— rules.md（正面规则，此前完全没读）
// 依据（原文）：
//   rules.md 「格式规范」：YAML 中文格式／缩进 2 空格／**数据库格式优先，不是散文：用列表和键值对，不用段落**
//                        ／全文简体中文／禁止占位符
//   rules.md 「角色写作要点」：外貌只写特征／背景只写关键事件／关系写具体画面／行为展现性格／一句一意
//   rules.md 「世界观压缩」「每句话过四问」：删了这句 AI 会错吗／是信息还是装饰／列表能替代吗／不看原文能理解吗
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');
const 结果 = {};
const 加 = (类, 项, 说明) => (结果[类] = 结果[类] || []).push(项 + ' ｜ ' + 说明);

const 全文件 = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(yaml|txt)$/.test(f)) 全文件.push(p); } })(WB);

let 缩进错 = 0, 散文条 = 0, 块标量 = 0, 长句 = 0, 主观词 = 0;
const 散文清单 = [], 主观清单 = [];

for (const p of 全文件) {
  const rel = path.relative(D, p).replace(/\\/g, '/');
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  L.forEach((l, i) => {
    const n = i + 1;
    // ① 缩进：不得用 TAB；缩进应为 2 的倍数
    if (/^\t/.test(l) || /^\t+/.test(l)) { 缩进错++; 加('① 缩进（rules.md 2 空格）', rel + ':' + n, 'TAB 缩进'); }
    else { const sp = l.match(/^ */)[0].length; if (sp % 2 === 1 && l.trim()) { 缩进错++; 加('① 缩进（rules.md 2 空格）', rel + ':' + n, sp + ' 个空格（奇数）'); } }
    // ② 散文：以 `|` 块标量写大段叙述（规范要求列表/键值对）
    if (/:\s*\|[-+]?\s*$/.test(l)) 块标量++;
    // ③ 长句：一「行」超过 60 个汉字 → 是段落不是条目
    const 汉字 = (l.match(/[\u4e00-\u9fa5]/g) || []).length;
    if (汉字 > 60 && !/^#/.test(l)) { 长句++; if (汉字 > 90) 散文清单.push(rel + ':' + n + ' (' + 汉字 + ' 汉字)'); }
  });
  // ④ 主观评价 / AI 已知信息（世界观压缩四问之一）
  const t = fs.readFileSync(p, 'utf8');
  const m = t.match(/^.*(非常(?:美丽|漂亮|可爱)|十分(?:美丽|漂亮)|绝美|惊为天人|倾国倾城|无比|极其).*$/gm);
  if (m) { 主观词 += m.length; m.slice(0, 3).forEach(x => 主观清单.push(rel + ' ｜ ' + x.trim().slice(0, 50))); }
}

console.log('═══ skills 合规审计 · 第三轮（rules.md 正面规则）═══');
console.log('\n【① 缩进（rules.md：2 空格）】' + 缩进错 + ' 处');
(结果['① 缩进（rules.md 2 空格）'] || []).slice(0, 6).forEach(x => console.log('   ' + x));
console.log('\n【② 散文形态】' + 块标量 + ' 个 `|` 块标量 ／ ' + 长句 + ' 行超 60 汉字');
console.log('   规范原文：「**数据库格式优先，不是散文：用列表和键值对，不用段落**」');
散文清单.slice(0, 8).forEach(x => console.log('   ' + x));
console.log('\n【③ 主观评价（世界观压缩四问：是信息还是装饰？）】' + 主观词 + ' 处');
主观清单.slice(0, 6).forEach(x => console.log('   ' + x));
console.log('\n【④ 全文简体中文】已扫过（第二轮已清 10 个文件的日文汉字）');
console.log('\n【⑤ 数据库化率】' + 全文件.length + ' 个文件里，有 ' + (全文件.filter(p => /\|[\s\S]*\|/.test(fs.readFileSync(p, 'utf8'))).length) + ' 个含 markdown 表格（建议改键值对）');
