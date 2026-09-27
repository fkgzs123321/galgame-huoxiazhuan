import fs from 'fs';
const B = String.fromCharCode(96); const b = s => B + s + B;
const M = 'E:/Games/写卡/tavern_helper_template/.workbuddy/memory/2026-09-22.md';
const log = `

---

## 界面全走 CDN（@main + purge）＋ 自定义操作（用户：「欲妈群也走CDN」「点一个消失一个，同级生2有很完整的操作」「增加自定义操作，自定义走 AI 判断再按难度技能公式掷骰」）

### ✅ ① 开局表单也上 CDN，loader 改指 @main → **以后永不需重导卡**
\`scripts/push-ui.cjs\` 重写（现在一次做四件事）：
1. 推**两份**：\`正则/状态栏.html → index.html\`、\`正则/开局选择界面.html → opening.html\`
2. \`git add/commit/push\`
3. **卡里两条正则都换成 loader，URL 用 \`@main\`（不再写死 commit）**
4. **调 jsDelivr purge API 清缓存**（实测返回 \`{"status":"finished"}\`）→ 改完立刻生效
5. 自动重打包

CDN：
- \`https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-yumaqun@main/index.html\`
- \`https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-yumaqun@main/opening.html\`

★ **这次要最后导一次卡**（把 @main loader 带进去），之后改界面只需刷新 ✓

### ✅ ② "点一个消失一个"的真相：他看的是旧版
代码是对的（\`doRoll\` 里 \`if(追发) await 推给AI(摘要)\`，照同级生2 的 \`写()\` 抄的：\`/setinput\` → 停 260ms → \`/send\`（带内容）→ \`/trigger\`）。
但 loader 写死 commit → CDN 更新后卡里还指着老 commit，而卡没重导 → 加载旧面板（旧版才是"只清格不推"）。
→ 改 @main + purge 后这个坑消失 ✓

### ✅ ③ 自定义操作（新增）
面板底部新增「我自己要做别的」输入框，三段流程：
1. 写一句 → **[交给她判]** → 推给 AI，让她定 **技能/等级/主对**，写进 \`局面.自定义.{文本,技能,等级,主对}\` + \`待掷=true\`
2. AI 判完 → 面板显示「她已经判过：「…」→ 用 观察（DC12）· 考验 识破」＋ **[掷骰，看看成不成]**
3. 点掷 → 面板按她给的值跑**同一套公式与难度系数**（含阶段 debuff）→ 结果推给 AI → 下一轮

新变量 \`局面.自定义 {文本,技能,等级,主对,待掷}\`；更新规则 + D20 条目都写了流程
（含「★ 你不要掷骰，骰子由前端按你给的值跑」）。另有 [算了，不做了]。

### 验收
面板 JS 通过｜5 份 initvar YAML 通过｜ZOD 有自定义 schema + 待掷｜
两条 loader 都是 @main｜D20 有「自定义动作」节且「阶段 debuff」仍在｜打包 121 条｜commit **d253176**
`;
fs.appendFileSync(M, log, 'utf8');
console.log('✓ 记忆已追加（' + log.length + ' 字符）');
