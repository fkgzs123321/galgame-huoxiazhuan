// ① 状态栏美化 v2（更精细的 galgame 质感，仍然只做显示层）
// ② 关键词链路精准化：每个女角/NPC 条目
//      · keywords 补全（全名 + ≥2 汉字昵称，conventions.md:98-106）
//      · contents[0] 加 EJS `matchChatMessages([多称呼], {start:0})` 门控 —— **扫全历史、多称呼、
//        且不受 keywords 的「禁单汉字」限制**（那条限制是给 ST 的 keys 用的，不是给 EJS 用的）
//      · keys_secondary：避免误触发
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const PROJ = '旮旯给木-同级生2';
const D = path.join(ROOT, 'src', PROJ);

// ── ① 状态栏 v2 ──
const HTML = `<!-- 底座_nanpa2 · 状态栏 v2（只定位，不解析数据） -->
<style>
.gg{--bg:#12151b;--bg2:#181c24;--line:#2a3140;--ink:#cdd4e0;--dim:#7d8798;
    font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;line-height:1.7;
    background:linear-gradient(180deg,var(--bg2),var(--bg));border:1px solid var(--line);
    border-radius:10px;overflow:hidden;margin:8px 0;color:var(--ink);box-shadow:0 2px 10px rgba(0,0,0,.35)}
.gg *{box-sizing:border-box}
.gg-top{display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,.02);border-bottom:1px solid var(--line)}
.gg-date{font-size:15px;font-weight:600;letter-spacing:.5px;color:#e6ecf5}
.gg-sub{font-size:11px;color:var(--dim)}
.gg-cd{margin-left:auto;display:flex;align-items:center;gap:6px}
.gg-ring{width:38px;height:38px;border-radius:50%;flex:0 0 auto;
  background:conic-gradient(#c8543f 0 76%,#262d38 76% 100%);display:grid;place-items:center}
.gg-ring>i{width:30px;height:30px;border-radius:50%;background:var(--bg2);display:grid;place-items:center;
  font-size:12px;font-weight:600;color:#e8b84b;font-style:normal}
.gg-slots{display:flex;gap:4px}
.gg-slots>i{width:16px;height:4px;border-radius:2px;background:#262d38}
.gg-slots>i.on{background:#5fa8d0}
.gg-slots>i.now{background:#8fd0a8;box-shadow:0 0 6px rgba(143,208,168,.6)}
.gg-bars{padding:8px 12px;display:grid;grid-template-columns:auto 1fr auto;gap:5px 8px;align-items:center}
.gg-bars b{font-weight:500;font-size:11.5px;color:var(--dim);white-space:nowrap}
.gg-bars u{text-decoration:none;font-size:11.5px;color:var(--dim);font-variant-numeric:tabular-nums}
.gg-track{height:7px;border-radius:4px;background:#1d222b;border:1px solid #252b36;overflow:hidden}
.gg-track>i{display:block;height:100%;border-radius:3px}
.b-hp>i{background:linear-gradient(90deg,#7a3a3a,#cf6a6a)}
.b-re>i{background:linear-gradient(90deg,#345a7a,#5fa8d0)}
.b-ex>i{background:linear-gradient(90deg,#6a3a7a,#c07ad0)}
.gg-cam{display:flex;gap:10px;padding:8px 12px;border-top:1px solid var(--line);background:rgba(0,0,0,.12)}
.gg-win{width:74px;height:56px;flex:0 0 auto;border-radius:6px;border:1px solid #333b48;
  background:radial-gradient(circle at 50% 38%,#2b3444,#151a22);display:grid;place-items:center;
  font-size:10px;color:#5f6a7c;position:relative}
.gg-win:after{content:"";position:absolute;top:4px;right:5px;width:5px;height:5px;border-radius:50%;background:#8fd0a8;box-shadow:0 0 5px #8fd0a8}
.gg-win.pause:after{background:#e8b84b;box-shadow:0 0 5px #e8b84b}
.gg-win.off:after{background:#5f6a7c;box-shadow:none}
.gg-info{flex:1;min-width:0}
.gg-info>div{font-size:12px;color:var(--dim)}
.gg-info b{color:var(--ink);font-weight:500}
.gg-tags{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}
.gg-tags>span{font-size:11.5px;padding:1px 8px;border-radius:9px;background:#20252e;border:1px solid #2b323d;color:#a8b2c1}
.gg-rel{margin-left:auto;font-size:10px}
.gg-her{color:#e8b84b}
.gg-line{color:#8fd0a8}
.gg-inner{color:#8a93a3;font-style:italic}
.gg-sys{color:#d07a9a}
.gg-var{color:#525a66;font-size:11.5px}
</style>
<div class="gg">
  <div class="gg-top">
    <div><div class="gg-date">12-22 周一</div><div class="gg-sub">寒假第一天 · 第 1 天</div></div>
    <div class="gg-cd">
      <div class="gg-slots"><i class="on now"></i><i></i><i></i><i></i><i></i></div>
      <div class="gg-ring"><i>17</i></div>
    </div>
  </div>
  <div class="gg-bars">
    <b>体力</b><div class="gg-track b-hp"><i style="width:80%"></i></div><u>80</u>
    <b>反抗</b><div class="gg-track b-re"><i style="width:100%"></i></div><u>100</u>
    <b>兴奋</b><div class="gg-track b-ex"><i style="width:20%"></i></div><u>20</u>
  </div>
  <div class="gg-cam">
    <div class="gg-win">在线</div>
    <div class="gg-info">
      <div>她 <b>温砚</b> · 目的进度 <b>0%</b></div>
      <div>今日指令 <b>已发布</b> · 她今天还摆了 <b>4</b> 次选项</div>
    </div>
  </div>
  <div class="gg-tags">
    <span>📍 自宅</span><span>时段 早</span><span>在场 唯 · 美佐子</span>
    <span class="gg-rel">唯 初见</span><span class="gg-rel">友美 初见</span>
  </div>
</div>
`;
fs.writeFileSync(path.join(D, '正则/状态栏界面.html'), HTML);

// ── ② 关键词链路 ──
const 匹配词 = {
  鸣泽唯: ['鸣泽唯', '小唯'], 水野友美: ['水野友美', '友美'], 筱原泉: ['筱原泉', '泉'],
  南川洋子: ['南川洋子', '洋子'], 加藤美纪: ['加藤美纪', '美纪'], 舞岛可怜: ['舞岛可怜', '可怜'],
  杉本樱子: ['杉本樱子', '樱子'], 都筑梢: ['都筑梢', '梢', '梢江'],
  野野村美里: ['野野村美里', '美里'], 安田爱美: ['安田爱美', '爱美'],
  田中美沙: ['田中美沙', '美沙'], 片桐美铃: ['片桐美铃', '片桐老师', '美铃'],
  鸣泽美佐子: ['鸣泽美佐子', '美佐子'], 永岛佐知子: ['永岛佐知子', '佐知子'],
  永岛久美子: ['永岛久美子', '久美子'],
  川尻彰: ['川尻彰', '川尻'], 长冈芳树: ['长冈芳树', '芳树'],
  西御寺有友: ['西御寺有友', '西御寺'], 天道新干线: ['天道新干线', '天道'],
};
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
const patch = [];
const G = "getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2'";

for (const [cat, es] of Object.entries(S.entryManifest)) {
  for (const [name, e] of Object.entries(es)) {
    // 女角：名字形如「鸣泽唯_基础信息」
    let 主 = null;
    for (const k of Object.keys(匹配词)) {
      if (name === k + '_基础信息' || name === k + '_性格调色盘' || name === k + '_三面性' || name === k + '_NSFW反差与剧情线') { 主 = k; break; }
    }
    if (!主 && cat === 'NPC' && 匹配词[name]) 主 = name;
    if (!主) continue;
    const 词 = 匹配词[主];
    const 基 = '/entryManifest/' + cat + '/' + name;
    // keywords：全名 + 昵称（全部 ≥2 汉字）
    patch.push({ op: 'add', path: 基 + '/keywords', value: 词 });
    // EJS 门控：扫全历史里有没有出现她的任何称呼（不受 keywords 的单汉字禁令约束）
    const file = (e.path || (e.contents || []).find(c => c.file && c.file).file);
    const m = name.match(/_(基础信息|性格调色盘|三面性|NSFW反差与剧情线)$/);
    if (m && file) {
      const cond = `${G} && matchChatMessages([${词.map(w => `'${w}'`).join(', ')}], { start: 0 })`;
      patch.push({ op: 'add', path: 基 + '/contents', value: [{ content: '@@if ' + cond }, { file }] });
      if (e.path) patch.push({ op: 'remove', path: 基 + '/path' });
    }
    // 二次过滤：主关键词命中后，必须还要有一个称呼出现在同段（减少误触发）
    if (e.strategy) patch.push({ op: 'add', path: 基 + '/strategy/keys_secondary', value: { logic: 'and_any', keys: 词 } });
  }
}
console.log('待改条目 ' + new Set(patch.map(p => p.path.split('/').slice(2, 4).join('/'))).size + ' 条 ／ patch ' + patch.length + ' 项');
const f = path.join(D, '_p.json');
fs.writeFileSync(f, JSON.stringify(patch));
console.log(execFileSync('node', [path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs'), 'patch', PROJ, '--file', f], { encoding: 'utf8' }));
fs.rmSync(f);
console.log('✅ 状态栏 v2 ' + HTML.length + ' 字符');
