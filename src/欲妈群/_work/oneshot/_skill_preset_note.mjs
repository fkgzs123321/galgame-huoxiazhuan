// skills 再补一条：通用指令（如思维链）交给预设时，卡里条目应默认关闭并留底
import fs from 'fs';
const F = '.skills/tavern-cards/references/ui/regex-scripts.md';
let t = fs.readFileSync(F, 'utf8');
const anchor = '**配套检查**：卡里保留的那几条也要按本文件上面的「配对」表核对字段';
if (t.includes('通用指令交给预设时')) { console.log('已有，跳过'); process.exit(0); }
const add = `### 同理：**通用指令**交给预设时，卡里条目默认关闭并留底

不光正则，"思维链规则""输出总则"这类**通用指令**也常被预设统一承担。处理方式：

- 卡里那条**保留原文（留底）但 \`enabled: false\`** —— 不进 prompt、不占预算，玩家想单独用还能打开
- 卡里**别处对它的引用要一起清**（典型的死引用：\`必须输出<xxx>标签\`、\`位于 <xxx> 块之外\`、\`由正则折叠美化\`、开关项注释里的"由正则删除"）
  → 清不干净就会出现"卡说要用标签、预设根本没这回事"的打架
- 顺手把**开关类变量**的注释改成"由预设控制"（变量本身别删，删了要动 schema）
- 内容重做成**纯文字**时，**不要规定任何输出格式**（不写标签名、不写"必须包裹"）—— 格式归预设，卡只讲"要检查什么"

${anchor}`;
t = t.replace(anchor, add);
fs.writeFileSync(F, t, 'utf8');
console.log('✅ 已补「通用指令交给预设」小节');
