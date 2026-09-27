import fs from 'fs';
const B = String.fromCharCode(96); const b = s => B + s + B;
const M = 'E:/Games/写卡/tavern_helper_template/.workbuddy/memory/2026-09-22.md';
const log = `

---

## EJS 报错的真因：酒馆里的世界书是旧的（卡是新的）

### 诊断证据
| | 卡里（${b('欲妈群.png')}） | 用户贴的 |
|---|---|---|
| 第 6 行 | ${b('⚠️ ST 的 EJS 沙箱不认 const / let，只能用 var。 */')} | **缺这行** |
| 第 7 行 | ${b('var _判 = getvar(...)')} | （仍是 const） |

★ 报错里的 **「8-」= 这条的 ${b('order')}（order=8）**，不是条目序号 —— 完全对上。

⇒ **结论**：卡里 121 条世界书已全部干净（0 处 const/let），**报错来自酒馆里那本没更新的旧世界书**。

### ★★ 根本原因：世界书不随卡自动更新
导入角色卡时，酒馆会问「是否用卡内世界书覆盖同名世界书」——
- 选了不覆盖 / 跳过 → **旧的那本一直留着** → 报错一直在
- 世界书名 = 「欲妈群」，与卡同名

### ✅ 解决（两条路）
**A. 最快（不用重导卡）**：酒馆 → 🌍 世界书 → 「欲妈群」→ 搜 ${b('const ')} → 改成 ${b('var ')}
（应是 3 处：${b('const _判')} / ${b('const _待')} / ${b('let _出')}）

**B. 彻底（推荐）**：导入导出的世界书 json → 覆盖旧的
→ 新增脚本 ${b('_work/oneshot/_export_worldbook.mjs')}：把卡里的 character_book 转成**酒馆能直接导入的格式**
  （字段映射：${b('keys→key')}／${b('secondary_keys→keysecondary')}／${b('insertion_order→order')}／${b('enabled→disable')}／
   ${b("position 'at_depth'→4, 其它→0")}；其余从 ${b('extensions')} 里取，卡里本来就有全套字段）
→ 产出 ${b('src/欲妈群/欲妈群-世界书.json')}（121 条｜常驻 41｜关闭 8｜含 EJS 12｜**0 处 const/let**）
→ **★ push-ui 已挂上自动导出**：以后每次推送都会刷新这个 json —— **改世界书直接导它，不用再重导卡**

### 验收
导出 json：121 条、EJS 残留 0 ✅｜push-ui 已挂｜打包 121 条

### ★ 教训
**世界书不会跟着卡自动更新** —— 以后凡是改了 ${b('世界书/')} 下的东西，都要同时给一份可导入的 json，
并提醒用户「世界书要单独更新」。
`;
fs.appendFileSync(M, log, 'utf8');
console.log('✓ 记忆已追加（' + log.length + ' 字符）');
