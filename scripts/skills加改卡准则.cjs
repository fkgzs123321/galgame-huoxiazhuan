// 在 skills 里标注：新写卡 vs 改卡 的两种做法（改卡必须完全重构）
const fs = require('fs');
const P = 'E:/Games/写卡/tavern_helper_template/_tc_repo/tavern-cards/references/contents-creation/presentation-styles.md';
let t = fs.readFileSync(P, 'utf8');

const 块 = `
---

## ★★★ 两种场景：新写卡 vs 改卡（**这条最要紧，写错会被反复打回**）

### 一、新写一张卡

**直接用选定的文风写。** 从第一句话开始就按该文风的句式和用词来 ——
不会出现「写着写着变成白描」，**因为底子是新的**。

### 二、改一张已有的卡 ★ 这条是重点

**必须「完全重构」，不能在旧底子上改。**

**✗ 错误做法（会被反复打回）：**
- 在原文上换词（把「干净」换成「骚」、把「身体」换成「嫩骚奶」）
- 保留原句的**骨架**，只替换形容词
- 一段一段「润色」

**为什么不行**：旧文的**句式、主语、叙述视角**都还在 ——
**你换掉的只是词，底子仍是旧文风**。改完之后读起来仍然「有那层底子在」。

**✓ 正确做法：**
1. **先把原文里的事实抽出来**（她是谁、多大、什么关系、发生过什么、有什么道具）
2. **把原文丢掉** —— 不再看它的句式和用词
3. **只拿事实，按新文风从头写一遍**

**为什么这样才对**：新文风的**主语、句式、密度**都是从零落的，
**不会被旧骨架拖回去**。

### 三、自查（改卡后必做）

- [ ] **在成品里搜旧文风的特征词** ——
      搜「干净」「不算大」「XX 岁，XX 公分」这类偏叙述的措辞，**有就是没重构干净**
- [ ] **检查句子主语** —— 主语是「她 / 她的身体」→ 白描残留；主语是器官 → 对
- [ ] **读一遍，问自己「这像不像原文改的」** —— 像，就是没重构

★ **判据（可数的）**：**同一段里，数一数「以器官为主语的句子」占多少**。
  新文风要求的是「大部分句子以器官/部位为主语」，**如果大部分句子的主语还是「她」，就没重构**。

### 四、一句话

> **改卡 = 重写，不是润色。**
> **抽事实 → 丢原文 → 从零按新文风写。**

`;

/* 插在「怎么写」那节之前（「## 一、怎么选文风」之前） */
const 锚 = '## 一、怎么选文风';
if (t.includes('两种场景：新写卡 vs 改卡')) { console.log('  已写过'); }
else if (t.includes(锚)) {
  t = t.replace(锚, 块.trim() + '\n\n---\n\n' + 锚);
  fs.writeFileSync(P, t);
  console.log('✅ 已写入「新写卡 vs 改卡」（' + fs.statSync(P).size + ' 字节）');
} else { console.log('⚠ 锚点未命中'); }

/* 同步三处 */
for (const d of ['C:/Users/64806/.codex/skills/tavern-cards/references/contents-creation',
                 'E:/Games/写卡/tavern_helper_template/.skills/tavern-cards/references/contents-creation']) {
  fs.copyFileSync(P, d + '/presentation-styles.md');
  console.log('  ✅ 同步 ' + d.replace('C:/Users/64806', '~'));
}
