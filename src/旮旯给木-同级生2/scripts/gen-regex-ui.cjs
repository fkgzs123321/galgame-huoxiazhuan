// 显示层美化：状态栏界面 + 四色台词上色 + 变量块淡化（正则只做显示层，不解析数据）
// 依据 references/ui/regex-scripts.md：每条 UI 元素两个脚本配对
//   隐藏脚本 promptOnly:true / replaceString:"" ；替换脚本 markdownOnly:true / replace_file
// regex_scripts 是**顶层 record**，key = 脚本名（state.ts:204）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const PROJ = '旮旯给木-同级生2';
const D = path.join(ROOT, 'src', PROJ);

const HTML = `<!-- 底座_nanpa2 · 状态栏（纯文本版：只定位，不解析数据；数据由前端/HUD 从 MVU 变量取） -->
<style>
.gg-bar{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;line-height:1.75;
  border:1px solid #3a3f4b;border-radius:8px;padding:10px 12px;margin:6px 0;background:#1b1e24;color:#c9ced8}
.gg-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.gg-tag{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;border:1px solid transparent}
.gg-day{background:#2a3550;border-color:#3d5480;color:#a9c2f0}
.gg-left{background:#4a2430;border-color:#7a3546;color:#f0a9b6}
.gg-slot{background:#243f33;border-color:#3a6b52;color:#a9e0c0}
.gg-cast{background:#3a3346;border-color:#5d5170;color:#c9b8e0}
.gg-num{font-variant-numeric:tabular-nums;letter-spacing:.5px}
.gg-bar2{height:6px;border-radius:3px;background:#2c313a;overflow:hidden;margin:3px 0}
.gg-bar2>i{display:block;height:100%}
.gg-hp>i{background:linear-gradient(90deg,#8c4a4a,#d06a6a)}
.gg-re>i{background:linear-gradient(90deg,#3f6a8c,#5fa8d0)}
.gg-ex>i{background:linear-gradient(90deg,#7a4a8c,#c07ad0)}
.gg-rel{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.gg-rel>span{font-size:12px;padding:1px 7px;border-radius:9px;background:#252a33;border:1px solid #343b47;color:#afb7c4}
/* ── 四色台词（与 叙述准则 的标记规范一一对应）── */
.gg-her{color:#e8b84b}      /* 〔〕屏幕外那个人的声音 */
.gg-line{color:#8fd0a8}     /* 「」游戏内台词 */
.gg-inner{color:#8a93a3;font-style:italic}  /* （）内心与旁白 */
.gg-sys{color:#d07a9a}      /* 〖〗系统与那个声音 */
.gg-var{color:#5c6470;font-size:12px}
</style>
<div class="gg-bar">
  <div class="gg-row">
    <span class="gg-tag gg-day">12-22 · 第 1 天</span>
    <span class="gg-tag gg-left">还剩 17 天</span>
    <span class="gg-tag gg-slot">时段 早</span>
  </div>
  <div class="gg-bar2 gg-hp"><i style="width:80%"></i></div>
  <div class="gg-bar2 gg-re"><i style="width:100%"></i></div>
  <div class="gg-bar2 gg-ex"><i style="width:20%"></i></div>
  <div class="gg-row" style="margin-top:4px">
    <span class="gg-tag gg-cast">📍 自宅</span>
    <span class="gg-tag gg-cast">在场 唯 · 美佐子</span>
    <span class="gg-tag gg-cast">她 温砚</span>
  </div>
  <div class="gg-rel">
    <span>唯 初见</span><span>友美 初见</span><span>泉 初见</span><span>洋子 初见</span>
  </div>
</div>
`;
fs.mkdirSync(path.join(D, '正则'), { recursive: true });
fs.writeFileSync(path.join(D, '正则/状态栏界面.html'), HTML);

const uuid = i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const R = {};
R['隐藏状态栏占位符'] = {
  id: uuid(1), findRegex: '<StatusPlaceHolderImpl/>', replaceString: '',
  placement: [2], promptOnly: true, markdownOnly: false, runOnEdit: true, substituteRegex: 0, trimStrings: [],
};
R['状态栏界面'] = {
  id: uuid(2), findRegex: '<StatusPlaceHolderImpl/>', replace_file: '正则/状态栏界面.html',
  placement: [2], promptOnly: false, markdownOnly: true, runOnEdit: true, substituteRegex: 0, trimStrings: [],
};
const 色 = [
  ['她的声音上色', '〔([^〕]*)〕', '<span class="gg-her">〔$1〕</span>'],
  ['游戏内台词上色', '「([^」]*)」', '<span class="gg-line">「$1」</span>'],
  ['内心与旁白上色', '（([^）]*)）', '<span class="gg-inner">（$1）</span>'],
  ['系统与那个声音上色', '〖([^〗]*)〗', '<span class="gg-sys">〖$1〗</span>'],
];
色.forEach(([名, re, rep], i) => {
  R[名] = { id: uuid(10 + i), findRegex: `/${re}/g`, replaceString: rep,
    placement: [2], promptOnly: false, markdownOnly: true, runOnEdit: false, substituteRegex: 0, trimStrings: [] };
});
R['变量更新块淡化'] = {
  id: uuid(20), findRegex: '/<UpdateVariable>[\\s\\S]*?<\\/UpdateVariable>/g',
  replaceString: '<span class="gg-var">［变量已更新］</span>',
  placement: [2], promptOnly: false, markdownOnly: true, runOnEdit: false, substituteRegex: 0, trimStrings: [],
};

const ov = {};
[2, 3, 4, 5, 6, 7, 8].forEach(n => { ov[`开场白/${n}.txt`] = `开场白/initvar/${n}.yaml`; });

const patch = [
  { op: 'add', path: '/regex_scripts', value: R },
  { op: 'add', path: '/initvar_overrides', value: ov },
];
const f = path.join(D, '_p.json');
fs.writeFileSync(f, JSON.stringify(patch));
console.log(execFileSync('node', [path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs'), 'patch', PROJ, '--file', f], { encoding: 'utf8' }));
fs.rmSync(f);
console.log('✅ 状态栏界面 ' + HTML.length + ' 字符 ／ 正则 ' + Object.keys(R).length + ' 条 ／ initvar_overrides ' + Object.keys(ov).length + ' 条');
