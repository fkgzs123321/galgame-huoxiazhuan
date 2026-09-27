import fs from 'fs';
const F = 'C:/Users/64806/.workbuddy/skills/st-judge-calibration/SKILL.md';
const Q = String.fromCharCode(96); const b = s => Q + s + Q;
let t = fs.readFileSync(F, 'utf8');
if (t.includes('美化正则"活着"的三个条件')) { console.log('· 已有'); process.exit(0); }

const 补 = `

## 六、美化正则"活着"的三个条件（排查死卡片）

一条美化正则要真生效，三件事缺一不可：

1. **有正则** —— 存在一条 ${b('findRegex')} 匹配它
2. **有人产出那个标签** —— 在**全卡**（世界书 ＋ ${b('first_mes')} ＋ MVU 脚本 ＋ 正则）里搜这个标签名，看是谁写的
   → ★ **把「正则自己的 ${b('replaceString')}」排除掉**（那是它自己产的，不算产出者），否则会误判成"活着"
3. **${b('placement')} 对准产出者的角色**
   - 标签由 **AI** 输出 → 用 ${b('[2]')}（AI 楼层）
   - 标签由 **面板** 推（${b("role:'user'")}）→ **必须带 ${b('[1]')}**，只写 ${b('[2]')} 永远不美化

少任何一个，玩家看到的就是**裸尖括号源码**（这类是硬伤，比写得不好严重）。

### 改口径时必须全库搜旧标签名

本次把判定正则从 ${b('<D20Judge>')} 改成 ${b('<判定>')}，结果旧标签藏在 **3 个文件 9 处**
（其中一条还写着"必须完整输出 3 轮 ${b('<D20Judge>')} 块"）——
**只改正则不改它们，等于换了个名字的死标签。**

搜的时候连同旧口径一起搜：
${b('<旧标签>')} ／ ${b('3轮')} ／ ${b('侦察轮')} ／ ${b('行动轮')} ／ ${b('反应轮')}
`;
fs.writeFileSync(F, t + 补, 'utf8');
console.log('✓ skill 已补第六节（' + 补.length + ' 字符）');
