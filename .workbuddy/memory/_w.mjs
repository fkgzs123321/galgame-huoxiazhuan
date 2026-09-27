import fs from 'fs';
fs.appendFileSync('2026-09-21.md', `

---

## 轮次：工作区整理（用户：「可以，没用的可以删除了」）

### 先备份
\`E:/Games/写卡/tavern_helper_template/_backup_清理前_20260921/\`，**117 项**（卡内 42 ＋ 根目录 75），动手前逐项核对过关键文件在不在。

### 整理结果
| 位置 | 之前 | 之后 |
|---|---|---|
| \`src/欲妈群/\` 根 | 40+ 个 \`_*\` 散件 | 只留 \`_removed/\` ＋ \`_work/\`，其余是卡的正式内容 |
| 仓库根 | 40+ 个 \`_*.mjs/.cjs/.py/.json\` ＋ 6 个 \`.log\` | **9 个 \`_*\` 目录**（全是活的基础设施） |

新建结构：
- \`src/欲妈群/_work/{gen,data,check,oneshot,drafts,tmp}\` ＋ 一份 README
- \`_work/oneshot/\`（根，68 个各卡一次性脚本）＋ 一份 README

**真删的**：6 个 \`.log\`、\`_env_userpath_backup_*.txt\`、\`src/欲妈群/_tmp_nsw/\`（NSW 提取中间物，源头在 \`_removed\` 和备份里）。全部已进备份。

### 顺带做的工程化
- \`_gen_phase.mjs\` 找 \`_subj*.mjs\` 改成按 \`import.meta.dirname\` 定位（原来按 cwd），\`_gen_palette.mjs\` 同改
- 补 \`import { pathToFileURL } from 'url'\`（改路径时漏的）
- **新目录下端到端重跑通过**：12 位阶段重生成 ✓、调色盘＋气味 ✓、60 档 0 待改 ✓、常驻超线 0 ✓、打包 120 条 ✓

### 没动的
- \`_removed/\` 里的 \`[总控]事件.txt\` / \`[总控]剧情.txt\` / \`_opt.mjs\` —— 那是**另一个 agent 的移出物**，不碰
- 卡根目录的 \`变量/\`（空目录，疑似另一 agent 在建）
- 根目录**非 \`_\` 开头**的历史脚本（\`analyze_card.js\`、\`check_state*.mjs\` 等）—— 不在本次范围

### 坑
- \`node _cleanup.mjs\` 这种**临时拼的整理脚本会莫名其妙 exit 127 且无输出**（写了两版都不跑）→ 改成命令行分步执行就通了。**大动作别写一次性大脚本，分步做、每步可核对。**
- \`fs.cpSync\` 拷单个文件到 `\\\\?\\` 长路径会报 "The operation completed successfully" → 文件用 \`fs.copyFileSync\`，只有目录才用 \`cpSync\`。
`, 'utf8');
console.log('ok');
