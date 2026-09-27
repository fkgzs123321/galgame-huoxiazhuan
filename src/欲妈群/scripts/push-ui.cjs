#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// push-ui.cjs · 把欲妈群的两套界面推到 CDN 仓库，并把卡里的地址换成 loader
//
// 推两份：
//   src/欲妈群/正则/状态栏.html      → index.html    （状态栏面板）
//   src/欲妈群/正则/开局选择界面.html → opening.html  （开局表单）
//
// ★ 为什么改成 @main（2026-09-22 改）：
//   原来 loader 写死 commit 号。好处是"改完立刻生效"，坏处是
//   **每改一次就要重新导入一次卡**（loader 在卡里）—— 实操上太烦。
//   现在 loader 指向 @main，**配好一次之后永远不用再导卡**；
//   jsDelivr 对 @main 有 ~12h 缓存，所以本脚本推完会**调 purge API 主动清缓存**。
//   purge 万一失败，等缓存过期或强刷也能拿到新版。
//
// 为什么正则里只能放 loader：
//   正则 replaceString 里塞完整 HTML，``` 代码块会被当纯文本渲染，玩家看到一屏源码。
//   所以代码块里只放 <script>$('body').load(URL)</script>，真界面从 CDN 取。
//   载入失败必须看得见（状态码 + 地址），否则屏幕上只有「面板没了」。
//
// 用法: node src/欲妈群/scripts/push-ui.cjs ["提交信息"]
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const CARD = path.join(ROOT, 'src', '欲妈群');
const PUSH = path.join(CARD, '_cdn');   // ★ CDN 仓库副本放在欲妈群文件夹里（别再放根目录那个位置）
const REPO = 'fkgzs123321/galgame-yumaqun';
const CDN = 'https://testingcf.jsdelivr.net/gh/' + REPO;
const 提交信息 = process.argv[2] || '欲妈群界面更新';

/* ★★ 2026-09-23：状态栏已改【内联】（replace_file），不再依赖 CDN 仓库。
   仓库不存在也继续跑（只做打包 + 导世界书）。 */
const 有仓库 = fs.existsSync(PUSH);
if (!有仓库) console.log('（未找到 CDN 仓库副本，跳过推送，只打包）');

// ★ 远端必须是纯 HTML：loader 用 $("body").load(U) 把它注入页面，
//   带上首尾围栏的话那对围栏会变成字面文本显示在界面顶部与底部。
const 剥围栏 = t => t.replace(/^\uFEFF?\s*```(?:html|HTML)?\s*\r?\n/, '').replace(/\r?\n```\s*$/, '');

/* ★★ 2026-09-23：状态栏与开局表单都改成【内联】（replace_file）了，不再走 CDN。
   原因：状态栏的值要由 ST 在渲染楼层时替换 {{format_message_variable::…}} 宏，
   走 CDN 注入的内容未必经过宏替换 → 值永远是旧的（"变量不显示到面板"的根因）。
   所以 ①②③ 三步（推 CDN / 提交 / 改 loader）整段停用，只保留【打包】与【导出世界书】。
   历史实现见 git 记录；若以后要回到 CDN 模式，把下面这段恢复即可。 */

/* —— 以下为停用的 CDN 推送逻辑（保留备查） ——
const 清单 = [ { 源: path.join(CARD, "正则", "状态栏.html"), 子: "index.html", 名: "状态栏" } ];
... 见 git 历史 ...
—— 停用结束 —— */
// ── ④ 清 jsDelivr 缓存 + 重打包
(async () => {
  console.log('');
  for (const x of (有仓库 ? 清单 : [])) {
    const u = 'https://purge.jsdelivr.net/gh/' + REPO + '@main/' + x.子;
    try {
      const r = await fetch(u);
      const t = (await r.text()).trim();
      console.log('purge ' + x.子 + '：' + (r.ok ? '✓' : '✗') + ' ' + t.slice(0, 100));
    } catch (e) { console.log('purge ' + x.子 + ' 失败（不影响推送，等缓存过期即可）：' + e.message); }
  }
  try {
    const pack = execFileSync('node', [path.join(ROOT, 'pack_yumq.mjs')], { encoding: 'utf8' });
    /* ★ 顺便把世界书导成酒馆能直接导入的 json —— 改世界书时用它覆盖，不用重导卡 */
    try {
      const ex = execFileSync('node', [path.join(CARD, '_work', 'oneshot', '_export_worldbook.mjs')], { encoding: 'utf8' });
      console.log(ex.split('\n').filter(l => /已导出|条目 |残留/.test(l)).join('\n'));
    } catch (e) { console.log('⚠ 世界书导出失败：' + e.message); }
    console.log('\n' + pack.split('\n').filter(l => /世界书条目|打包完成/.test(l)).join('\n'));
  } catch (e) { console.log('⚠ 重打包失败：' + e.message); }
  console.log('\nCDN：' + CDN + '@main/index.html');
  console.log('     ' + CDN + '@main/opening.html');
  if (HASH) console.log('（本次 commit ' + HASH + '）');
})();
