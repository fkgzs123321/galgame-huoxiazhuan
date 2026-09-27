// 把骨架的 CSS 换成精细版（组件更多、层次更清、有动效）
// 独立脚本，避免 node -e 的转义地狱
const fs = require('fs');
const path = require('path');
const D = 'src/旮旯给木-英雄坛说';
const p = path.join(D, '正则', '_面板骨架.html');
let t = fs.readFileSync(p, 'utf8');

const 新CSS = `
/* ════════════════════════════════════════════════════════════
   英雄坛说面板 · 样式表
   三套主题：江湖（默认）/ 古风 / 极简 —— 同一份结构换变量
   ════════════════════════════════════════════════════════════ */
:root{
  --bg0:#0b0d12; --bg1:#12161f; --bg2:#1a1f2b; --bg3:#212736;
  --line:#2b3344; --line2:#3a4459; --line3:#4a5568;
  --ink:#d8dff0; --ink2:#b8c2d8; --dim:#79839c; --faint:#4e5769;
  --gold:#e8b84b; --gold2:#f0cb70; --grn:#6fcf97; --rose:#e07a9a;
  --blu:#5fa8d0; --pur:#b48ad8; --red:#e0564b; --cyan:#5fc8c8;
  --r:12px; --r2:9px; --r3:6px; --r4:4px;
  --pad:14px 16px;
  --t:.16s cubic-bezier(.4,0,.2,1);
}
[data-theme="ancient"]{
  --bg0:#14100c; --bg1:#1c1712; --bg2:#241d16; --bg3:#2e251c;
  --line:#3d3226; --line2:#4e4030; --line3:#5f4e3a;
  --ink:#e8dcc8; --ink2:#d4c4a8; --dim:#9c8e78; --faint:#6b5f4e;
  --gold:#d9a441; --gold2:#e8bc66; --grn:#7fa860; --rose:#c06a5a;
  --blu:#5b8a9c; --pur:#9a7fae; --red:#bf4a3a; --cyan:#6fa8a0;
}
[data-theme="plain"]{
  --bg0:#ffffff; --bg1:#fafbfc; --bg2:#f3f5f8; --bg3:#e9edf2;
  --line:#dde2e9; --line2:#c8d0da; --line3:#adb8c6;
  --ink:#1f2430; --ink2:#333c4a; --dim:#5c6675; --faint:#9aa3b2;
  --gold:#a67c00; --gold2:#c2951a; --grn:#2e8b57; --rose:#c04070;
  --blu:#3a6ea5; --pur:#7a52aa; --red:#c0392b; --cyan:#2a8f8f;
}

*{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent}
.yx{
  font-family:-apple-system,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;
  color:var(--ink); font-size:13px; line-height:1.62;
  border:1px solid var(--line); border-radius:var(--r);
  background:linear-gradient(180deg,var(--bg1),var(--bg0));
  margin:8px 0; overflow:hidden; max-width:100%;
}
.yx *{max-width:100%}
.yx ::-webkit-scrollbar{width:6px;height:6px}
.yx ::-webkit-scrollbar-thumb{background:var(--line2);border-radius:3px}
.yx ::-webkit-scrollbar-track{background:transparent}

/* ── 顶栏 ── */
.yx-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;
  border-bottom:1px solid var(--line);background:var(--bg2);position:relative}
.yx-seal{width:22px;height:22px;border-radius:var(--r4);border:1px solid var(--gold);
  display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--gold);
  font-weight:500;letter-spacing:0;flex:none}
.yx-title{font-size:13.5px;font-weight:500;letter-spacing:.1em;color:var(--gold)}
.yx-who{font-size:11.5px;color:var(--faint);letter-spacing:.02em}
.yx-tabs{display:flex;gap:3px;margin-left:auto;flex-wrap:wrap}
.yx-tab{padding:4px 12px;border-radius:13px;cursor:pointer;font-size:12px;
  border:1px solid transparent;background:transparent;color:var(--dim);font-family:inherit;
  transition:var(--t);letter-spacing:.02em}
.yx-tab:hover{border-color:var(--line2);color:var(--ink2)}
.yx-tab.on{background:var(--bg3);border-color:var(--gold);color:var(--gold)}
.yx-theme{padding:4px 10px;border-radius:13px;cursor:pointer;font-size:11px;
  border:1px solid var(--line);background:transparent;color:var(--faint);font-family:inherit;transition:var(--t)}
.yx-theme:hover{border-color:var(--line2);color:var(--dim)}

/* ── 主体 ── */
.yx-body{padding:var(--pad)}
.yx-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.yx-row:last-child{margin-bottom:0}
.yx-panel{flex:1;min-width:210px;border:1px solid var(--line);border-radius:var(--r2);
  padding:11px 13px;background:var(--bg2);position:relative;transition:var(--t)}
.yx-panel:hover{border-color:var(--line2)}
.yx-full{flex:1 1 100%}
.yx-h{font-size:10.5px;letter-spacing:.14em;color:var(--faint);margin-bottom:8px;
  text-transform:uppercase;display:flex;align-items:center;gap:7px}
.yx-h::after{content:'';flex:1;height:1px;background:var(--line);opacity:.55}
.yx-col{display:flex;flex-direction:column;gap:5px}
.yx-line{display:flex;justify-content:space-between;gap:10px;align-items:baseline;
  padding:1px 0;font-size:12.5px}
.yx-line>span{color:var(--dim)}
.yx-line>b{font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums}
.yx-sub{font-size:11px;color:var(--faint);margin-top:7px;line-height:1.6}
.yx-empty{color:var(--faint);font-size:12px;padding:6px 0}
.yx-k{color:var(--faint);font-size:11.5px}
.yx-gold{color:var(--gold)} .yx-grn{color:var(--grn)} .yx-warn{color:var(--rose)}
.yx-red{color:var(--red)} .yx-blue{color:var(--blu)} .yx-pur{color:var(--pur)}

/* ── 条 ── */
.yx-bar{height:6px;border-radius:3px;background:var(--bg0);overflow:hidden;
  box-shadow:inset 0 0 0 1px var(--line)}
.yx-bar i{display:block;height:100%;border-radius:3px;transition:width .4s cubic-bezier(.4,0,.2,1)}
.yx-bar.sm{height:4px}
.yx-bar.lg{height:9px}
.yx-fill-hp{background:linear-gradient(90deg,#2f6b4f,var(--grn))}
.yx-fill-mp{background:linear-gradient(90deg,#2f5f8f,var(--blu))}
.yx-fill-res{background:linear-gradient(90deg,#8f3f5c,var(--rose))}
.yx-fill-ar{background:linear-gradient(90deg,#8f5f3f,var(--gold))}
.yx-fill-task{background:linear-gradient(90deg,#3f6b8f,var(--blu))}
.yx-fill-cyc{background:linear-gradient(90deg,#6b3f8f,var(--pur))}

/* ── 出招 ── */
.yx-opts{display:flex;flex-direction:column;gap:6px}
.yx-opt{border:1px solid var(--line);border-radius:var(--r2);padding:8px 11px;cursor:pointer;
  transition:var(--t);background:var(--bg0);position:relative}
.yx-opt::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;
  border-radius:3px 0 0 3px;background:var(--line2);transition:var(--t)}
.yx-opt:hover{border-color:var(--line2);background:var(--bg2)}
.yx-opt.sel{border-color:var(--gold);background:rgba(232,184,75,.08)}
.yx-opt.sel::before{background:var(--gold)}
.yx-opt .r1{display:flex;align-items:baseline;gap:9px}
.yx-opt .no{color:var(--faint);font-size:11px;min-width:14px;font-variant-numeric:tabular-nums}
.yx-opt .tx{flex:1;color:var(--ink)}
.yx-opt .lv{font-size:10.5px;color:var(--dim);white-space:nowrap;
  border:1px solid var(--line);border-radius:var(--r4);padding:0 5px}
.yx-opt .feel{font-size:11.5px;color:var(--faint);margin-top:4px;padding-left:23px}
.yx-opt.L微::before{background:var(--grn)} .yx-opt.L微 .lv{color:var(--grn);border-color:rgba(111,207,151,.35)}
.yx-opt.L中::before{background:var(--blu)} .yx-opt.L中 .lv{color:var(--blu);border-color:rgba(95,168,208,.35)}
.yx-opt.L强::before{background:var(--gold)} .yx-opt.L强 .lv{color:var(--gold);border-color:rgba(232,184,75,.35)}
.yx-opt.L极::before{background:var(--rose)} .yx-opt.L极 .lv{color:var(--rose);border-color:rgba(224,122,154,.35)}
.yx-opt.L锁{opacity:.5} .yx-opt.L锁::before{background:var(--faint)}
.yx-fork{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.yx-btn{flex:1;min-width:88px;padding:7px 11px;border-radius:var(--r2);cursor:pointer;
  font-size:12.5px;border:1px solid var(--line);background:var(--bg2);color:var(--ink2);
  font-family:inherit;transition:var(--t)}
.yx-btn:hover:not(:disabled){border-color:var(--line3);color:var(--ink)}
.yx-btn:disabled{opacity:.38;cursor:not-allowed}
.yx-btn.deny{border-color:rgba(224,122,154,.4);color:var(--rose)}
.yx-btn.deny:hover{border-color:var(--rose);background:rgba(224,122,154,.08)}
.yx-btn.custom{border-color:rgba(180,138,216,.4);color:var(--pur)}
.yx-btn.custom:hover{border-color:var(--pur);background:rgba(180,138,216,.08)}
.yx-btn.go{border-color:rgba(232,184,75,.45);background:rgba(232,184,75,.09);color:var(--gold)}
.yx-btn.go:hover{background:rgba(232,184,75,.16)}
.yx-cx{display:none;margin-top:10px;border:1px dashed var(--line2);border-radius:var(--r2);padding:10px 12px;background:var(--bg0)}
.yx-cx.on{display:block}
.yx-cx textarea{width:100%;min-height:56px;resize:vertical;border-radius:var(--r3);padding:7px 9px;
  border:1px solid var(--line);background:var(--bg1);color:var(--ink);font-family:inherit;font-size:12.5px}
.yx-cx textarea:focus{outline:none;border-color:var(--pur)}
.yx-tip{font-size:11px;color:var(--faint);margin-top:9px;line-height:1.65}

/* ── chip ── */
.yx-chips{display:flex;flex-wrap:wrap;gap:5px}
.yx-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:var(--r3);
  background:var(--bg3);border:1px solid var(--line);font-size:11.5px;color:var(--dim);
  transition:var(--t);cursor:default}
.yx-chip[title]{cursor:pointer}
.yx-chip:hover{border-color:var(--line2)}
.yx-chip.on{border-color:var(--gold);color:var(--gold);background:rgba(232,184,75,.07)}
.yx-chip.g{border-color:rgba(111,207,151,.45);color:var(--grn)}
.yx-chip.r{border-color:rgba(224,122,154,.45);color:var(--rose)}
.yx-chip.b{border-color:rgba(95,168,208,.45);color:var(--blu)}
.yx-chip.off{opacity:.42}

/* ── 行（可点）── */
.yx-item{display:flex;align-items:center;gap:7px;padding:5px 8px;border-radius:var(--r3);
  border:1px solid transparent;transition:var(--t)}
.yx-item:hover{border-color:var(--line);background:var(--bg0)}
.yx-item .nm{flex:1}
.yx-item .vl{color:var(--dim);font-size:12px;font-variant-numeric:tabular-nums}
.yx-plus{background:var(--bg3);border:1px solid var(--line);color:var(--gold);border-radius:var(--r3);
  cursor:pointer;font-family:inherit;font-size:12px;padding:2px 9px;transition:var(--t)}
.yx-plus:hover{border-color:var(--gold);background:rgba(232,184,75,.1)}

/* ── 表 ── */
.yx-tbl{width:100%;border-collapse:collapse;font-size:12px}
.yx-tbl th{text-align:left;color:var(--faint);font-weight:400;font-size:10.5px;
  letter-spacing:.08em;padding:6px 8px;border-bottom:1px solid var(--line2)}
.yx-tbl td{padding:6px 8px;border-bottom:1px solid var(--bg3);color:var(--dim);
  font-variant-numeric:tabular-nums}
.yx-tbl td:first-child{color:var(--ink)}
.yx-tbl tr:last-child td{border-bottom:none}
.yx-tbl tr:hover td{background:var(--bg3)}
.yx-tbl.wrap td{white-space:normal;line-height:1.5}

/* ── 树 ── */
.yx-tree{overflow-x:auto;padding:8px 0}
.yx-tree svg{display:block}

/* ── 弹层 ── */
.yx-mask{position:absolute;inset:0;background:rgba(0,0,0,.6);display:none;z-index:9;
  backdrop-filter:blur(1px)}
.yx-mask.on{display:block}
.yx-modal{position:absolute;left:50%;top:36px;transform:translateX(-50%);width:min(580px,93%);
  max-height:72vh;overflow:auto;background:var(--bg1);border:1px solid var(--line2);
  border-radius:var(--r);padding:16px 18px;z-index:10;display:none;
  box-shadow:0 12px 40px rgba(0,0,0,.45)}
.yx-modal.on{display:block}
.yx-modal h4{margin:0 0 10px;font-size:13.5px;font-weight:500;color:var(--gold);
  letter-spacing:.06em;padding-right:22px}
.yx-modal .close{position:absolute;right:13px;top:11px;cursor:pointer;color:var(--faint);
  font-size:17px;line-height:1;transition:var(--t)}
.yx-modal .close:hover{color:var(--ink)}
.yx-rel-wrap{position:relative}

/* ── 说明 ── */
.yx-help{font-size:12.5px;color:var(--dim);line-height:1.8}
.yx-help h5{color:var(--gold);font-size:12.5px;font-weight:500;margin:15px 0 6px;
  letter-spacing:.06em;padding-bottom:4px;border-bottom:1px solid var(--line)}
.yx-help h5:first-child{margin-top:0}
.yx-help code{background:var(--bg3);padding:1px 6px;border-radius:var(--r4);
  color:var(--gold2);font-size:11.5px;font-family:ui-monospace,monospace}
.yx-help ul{margin:6px 0;padding-left:17px}
.yx-help li{margin:3px 0}
.yx-help li::marker{color:var(--faint)}
.yx-help b{color:var(--ink2);font-weight:500}

/* ── 小工具 ── */
.yx-split{height:1px;background:var(--line);margin:10px 0;opacity:.6}
.yx-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.yx-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
@media(max-width:560px){.yx-grid2,.yx-grid3{grid-template-columns:1fr}}
.yx-stat{border:1px solid var(--line);border-radius:var(--r3);padding:7px 10px;background:var(--bg0)}
.yx-stat .lbl{font-size:10.5px;color:var(--faint);letter-spacing:.06em}
.yx-stat .val{font-size:15px;font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums;
  margin-top:2px}
.yx-stat .val small{font-size:11px;color:var(--dim);font-weight:400;margin-left:2px}
.yx-tag{display:inline-block;padding:0 6px;border-radius:var(--r4);font-size:10.5px;
  border:1px solid var(--line2);color:var(--dim);line-height:1.7}
.yx-tag.rare{border-color:var(--gold);color:var(--gold)}
.yx-num{font-variant-numeric:tabular-nums}
`;

// 替换整个 <style>...</style>
const 旧 = t.match(/<style>[\s\S]*?<\/style>/);
if (!旧) { console.error('找不到 style 段'); process.exit(1); }
t = t.replace(旧[0], '<style>' + 新CSS + '</style>');
fs.writeFileSync(p, t);
console.log('✅ CSS 已换成精细版');
console.log('   旧 ' + Math.round(Buffer.byteLength(旧[0], 'utf8') / 1024) + ' KB → 新 ' + Math.round(Buffer.byteLength('<style>' + 新CSS + '</style>', 'utf8') / 1024) + ' KB');
