import fs from 'fs';
const F = 'C:/Users/64806/.workbuddy/skills/st-judge-calibration/SKILL.md';
const Q = String.fromCharCode(96);
const b = s => Q + s + Q;
let t = fs.readFileSync(F, 'utf8');
if (t.includes('世界书不会跟着卡自动更新')) { console.log('· 已有'); process.exit(0); }

const 补 = `

## 五、世界书不会跟着卡自动更新（又一个"改完没生效"的坑）

导入角色卡时酒馆会问「是否用卡内世界书覆盖同名世界书」—— **选了不覆盖或跳过，旧世界书就一直留着**。
表现：卡里明明改好了，酒馆里还是报旧错（本次是 EJS 报 ${b("Unexpected token 'const'")}）。

**诊断**：报错里的编号是条目的 ${b('order')}（不是条目序号）—— 拿它去对卡里那一条就能确认是哪条。

**三个解法**：
1. **手动改那一条**（最快，往往就改几个词）
2. **导出一份可导入的世界书 json 给他的酒馆** —— 以后改世界书直接导它，**不用重导卡**
3. 重导卡 + 导入弹窗里选「覆盖」

**转换要点**（卡里的 ${b('character_book')} → 酒馆导入格式）：
- ${b('keys')} → ${b('key')}
- ${b('secondary_keys')} → ${b('keysecondary')}
- ${b('insertion_order')} → ${b('order')}
- ${b('enabled')} → ${b('disable')}（**取反**）
- ${b('position')}：卡片写 ${b("'at_depth'")} → ${b('4')}，其它 → ${b('0')}
- 其余字段（excludeRecursion / probability / depth / group …）从 ${b('extensions')} 里取 —— 卡里通常已有全套

**最佳实践：把它挂进推送脚本，每次改完自动重导出一份。**
（本次实现：${b('_work/oneshot/_export_worldbook.mjs')} + 挂在 ${b('scripts/push-ui.cjs')} 末尾）
`;
fs.writeFileSync(F, t + 补, 'utf8');
console.log('✓ skill 已补第五节');
