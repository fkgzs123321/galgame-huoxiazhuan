// 在 skills 里写死「严禁冷冽／白描写卡」，并同步到 _tc_repo
import fs from 'fs';
import path from 'path';

const BAN = `> ## ⛔ 全局硬禁：严禁用「冷冽」与「白描」写卡
>
> **范围：本工作区所有 NSFW 角色卡，无一例外。**
>
> 1. **「冷冽」这套文风禁止用于任何角色卡的任何条目**（基础信息 / 阶段 / 调色盘 / 私密档案 / 剧情线 / 预设 / 开场白）。
> 2. **白描同样禁止**：只写动作不写肉、一段一栏的登记表、只给体面不给器官与体液的旁白，均判不合格。
> 3. **替代方案只有一条**：**以「淫视」为叙述底色**（叙述者本身就是下流胚子，镜头贴在肉体上，主语尽量落在器官／部位上），
>    再按该角色的本味**叠一层**（无尽骚妈 / 母猪 / 少妇白洁 / 阶段性反差）。
>    少妇白洁叠淫视时，器官词照样直白落地，只是不脏化；**「沉重」不等于「没有身体反应」**。
> 4. **可数判据**（写完必须过）：
>    - 每 1000 字里，**以器官／部位为主语的句子 ≥ 8 句**
>    - **器官词命中 ≥ 12 次／档**（白洁档用她的词表：乳房、阴道、阴部、阴毛、小屁股、内裤、裆）
>    - **身体反应（夹腿／洇／发胀／抖／喘／收紧／绞／淌／黏／颤）≥ 6 处／档**
>    - **体温、气味、体液、材质受力**四类里至少三类落在明面上
>    - 「她想要／她觉得／她不知道／她经常／她喜欢」**0 处**
> 5. 违反上述任一条 ＝ **未完成**，不得声称 done。
`;

const targets = [
  '.skills/tavern-cards/references/contents-creation/presentation-styles.md',
  '.skills/tavern-cards/references/contents-creation/presentation-style-05-冷冽.md',
  '.skills/tavern-cards/references/contents-creation/character/by-style/05-冷冽/基础信息.md',
  '.skills/tavern-cards/references/contents-creation/character/by-style/05-冷冽/多阶段.md',
  '.skills/tavern-cards/references/contents-creation/character/by-style/05-冷冽/性格调色盘.md',
];

for (const t of targets) {
  const full = path.join(process.cwd(), t);
  if (!fs.existsSync(full)) { console.log('⚠ 缺文件 ' + t); continue; }
  let s = fs.readFileSync(full, 'utf8');
  if (s.includes('全局硬禁：严禁用')) { console.log('跳过（已有） ' + t); continue; }
  // 插在第一个标题行之后，保证在文件最显眼处
  const lines = s.split('\n');
  const idx = lines.findIndex(l => /^#\s/.test(l));
  const out = idx >= 0
    ? [...lines.slice(0, idx + 1), '', BAN, ...lines.slice(idx + 1)].join('\n')
    : BAN + '\n\n' + s;
  fs.writeFileSync(full, out, 'utf8');
  console.log('✅ 写入 ' + t);
}

// rules-check.md 追加一节
const rc = path.join(process.cwd(), '.skills/tavern-cards/references/rules-check.md');
let r = fs.readFileSync(rc, 'utf8');
if (!r.includes('全局硬禁：严禁用')) {
  r = r.replace(/^# 写作质量检查\n/, '# 写作质量检查\n\n' + BAN + '\n');
  fs.writeFileSync(rc, r, 'utf8');
  console.log('✅ 写入 rules-check.md');
} else console.log('跳过（已有） rules-check.md');

// 同步到 _tc_repo
const src = path.join(process.cwd(), '.skills/tavern-cards/references');
const dst = path.join(process.cwd(), '_tc_repo/tavern-cards/references');
let n = 0;
for (const rel of [
  'contents-creation/presentation-styles.md',
  'contents-creation/presentation-style-05-冷冽.md',
  'contents-creation/character/by-style/05-冷冽/基础信息.md',
  'contents-creation/character/by-style/05-冷冽/多阶段.md',
  'contents-creation/character/by-style/05-冷冽/性格调色盘.md',
  'rules-check.md',
]) {
  const a = path.join(src, rel), b = path.join(dst, rel);
  if (!fs.existsSync(a)) { console.log('⚠ 源缺失 ' + rel); continue; }
  fs.mkdirSync(path.dirname(b), { recursive: true });
  fs.copyFileSync(a, b);
  n++;
}
console.log('同步到 _tc_repo: ' + n + ' 个文件');
