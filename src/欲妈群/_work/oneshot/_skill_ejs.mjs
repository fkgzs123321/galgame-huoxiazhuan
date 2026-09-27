import fs from 'fs';
const F = 'C:/Users/64806/.workbuddy/skills/st-judge-calibration/SKILL.md';
const B = String.fromCharCode(96); const b = s => B + s + B;
const q = s => B + B + B + s + B + B + B;
let t = fs.readFileSync(F, 'utf8');
if (t.includes('## 四、EJS 沙箱')) { console.log('· 已有第四节'); process.exit(0); }

const 补 = `

## 四、EJS 沙箱：只能用 var（踩过整个卡都编译失败）

ST 的 EJS 把代码塞进 ${b('with')} 块里跑，而 **${b('with')} 块内不允许词法声明** ——
${b('const')} / ${b('let')} 一律报 ${b("Unexpected token 'const'")}，**整个条目渲染失败**。

${q('ejs')}
<%-
  var a = getvar('stat_data.局面.判定结果', { defaults: {} }) || {};   // ✅
  // const a = ...                                                   // ❌ 报错
  // let b = ...;                                                    // ❌ 报错
-%>
<%= 拼好的字符串 %>
${q('')}

### 改完必须做两件事

**① 全库扫，不能只修报错那一处**（本次报错只报 D20，实际全库 23 处、9 个文件都坏）：
${q('js')}
// 只查 EJS 段内部，不碰正文
for (const m of [...text.matchAll(/<%[-_]?([\\s\\S]*?)[-_]?%>/g)]) {
  const 净 = m[1].replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/\\/\\/[^\\n]*/g, '');
  if (/\\b(const|let)\\s+[A-Za-z_$]/.test(净)) console.log('❌ 有词法声明');
}
${q('')}

**② 逐个编译验证**（模拟 ${b('with')} 块）：
${q('js')}
try {
  new Function('getvar','setvar','_','z','String','Number','Math','JSON','Array','Object','console',
    'with(arguments[10]||{}){' + 段体 + '}');
} catch (e) { console.log('❌ ' + e.message); }
${q('')}
实测：修完后 44 个段全部能编译、0 错误。

### 顺带两条纪律
- **改了长条目要整体看一遍结构**：反复 patch 会叠出**重复章节、编号倒退、旧参数残留**。
  本次 D20 条目就出现了「一到十三 → 又回到十、十一、十、十」和「同一节重复两遍」。
  发现重复就**整体重写**，别继续叠 patch。
- **同类问题要扫全库**：报错只指一个条目，但同一个错误写法往往在别处也有。
`;
fs.writeFileSync(F, t + 补, 'utf8');
console.log('✓ skill 已补第四节（EJS 沙箱）');
