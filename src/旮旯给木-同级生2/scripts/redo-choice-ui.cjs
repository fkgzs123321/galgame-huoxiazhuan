// 选项 UI 照 euphoria 重做：
//   ① 选项整行大条（padding 11/16，字 14px），不是小条
//   ② .lit 机制：只有「她看中的那条」是亮的，其他模糊+暗
//   ③ hover 金色光泽从左扫过 + 右移 4px
//   ④ 按等级变色（强/极 → 暖色）
//   ⑤ .picked 选中态 / .lv-锁 灰掉
//   ⑥ 底部居中三个按钮：眼睁睁看着 / 拒绝 / 自己来（不再每项一对）
//   ⑦ 选项下面一行「感觉」
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
let h = fs.readFileSync(p, 'utf8');

/* ── ① 追加 euphoria 风格的选项 CSS（覆盖旧的）── */
const 新CSS = `
/* ══ 选项 · 照 euphoria 重做 ══ */
#gg2 .opts{list-style:none;margin:0 0 11px;padding:0;display:flex;flex-direction:column;gap:8px}
#gg2 .opt{position:relative;display:block;padding:12px 16px 12px 14px;border-radius:4px;
  cursor:pointer;overflow:hidden;border:1px solid #2b3344;
  background:linear-gradient(100deg,rgba(233,230,223,.055),rgba(233,230,223,.02));
  opacity:.34;filter:blur(.4px);
  transition:opacity .55s ease,filter .55s ease,border-color .22s ease,transform .22s ease,background .22s ease}
#gg2 .opt.lit{opacity:1;filter:none}
#gg2 .opt::after{content:'';position:absolute;top:0;bottom:0;left:-60%;width:55%;
  background:linear-gradient(100deg,transparent,rgba(232,184,75,.16),transparent);
  transform:skewX(-14deg);transition:left .45s ease;pointer-events:none}
#gg2 .opt.lit:hover{transform:translateX(5px);border-color:rgba(232,184,75,.55);
  background:linear-gradient(100deg,rgba(232,184,75,.11),rgba(233,230,223,.03))}
#gg2 .opt.lit:hover::after{left:120%}
#gg2 .opt .row1{display:flex;align-items:center;gap:12px}
#gg2 .opt .no{font-size:11px;color:#79839c;flex:none;width:18px;font-variant-numeric:tabular-nums;
  transition:color .2s ease}
#gg2 .opt.lit:hover .no{color:#e8b84b}
#gg2 .opt .tx{flex:1;font-size:14.5px;line-height:1.5;letter-spacing:.01em}
#gg2 .opt.lv-强 .tx,#gg2 .opt.lv-极 .tx{color:#eda793}
#gg2 .opt .lv{font-size:10.5px;color:#4e5769;flex:none;letter-spacing:.08em;
  font-variant-numeric:tabular-nums}
#gg2 .opt .feel{margin:6px 0 0 30px;font-size:12px;line-height:1.65;color:#79839c;
  transition:color .2s ease}
#gg2 .opt.lit:hover .feel{color:#e8b84b;opacity:.94}
#gg2 .opt.she{border-color:rgba(232,184,75,.5);
  background:linear-gradient(100deg,rgba(232,184,75,.15),rgba(232,184,75,.04))}
#gg2 .opt.she .no{color:#e8b84b}
#gg2 .opt.lv-锁{opacity:.18;cursor:not-allowed;filter:grayscale(1)}
#gg2 .opt.lv-锁:hover{transform:none;border-color:#2b3344}
#gg2 .opt .btns{display:none}

/* ══ 底部三个按钮 · 照 euphoria ══ */
#gg2 .fork{display:flex;gap:9px;justify-content:center;margin:12px 0 4px}
#gg2 .fork-btn{min-width:128px;padding:11px 22px;cursor:pointer;font-family:inherit;font-size:13px;
  letter-spacing:.1em;border-radius:4px;color:#aab3c6;
  background:linear-gradient(180deg,rgba(233,230,223,.07),rgba(233,230,223,.02));
  border:1px solid #2b3344;transition:all .2s ease}
#gg2 .fork-btn:hover:not(:disabled){color:#eef2fa;border-color:#41506b;
  background:linear-gradient(180deg,rgba(233,230,223,.13),rgba(233,230,223,.05))}
#gg2 .fork-btn.deny{border-color:rgba(207,74,48,.44);color:#e6907c}
#gg2 .fork-btn.deny:hover:not(:disabled){background:linear-gradient(180deg,rgba(207,74,48,.2),rgba(207,74,48,.06));color:#ffb3a0}
#gg2 .fork-btn.custom{border-color:rgba(232,184,75,.4);color:#e8c98a}
#gg2 .fork-btn.custom:hover:not(:disabled){background:linear-gradient(180deg,rgba(232,184,75,.18),rgba(232,184,75,.05))}
#gg2 .fork-btn:disabled{border-color:#262d38;background:#181d24;color:#4a5361;cursor:not-allowed}
`;

if (!h.includes('照 euphoria 重做')) {
  h = h.replace('</style>', 新CSS + '\n</style>');
  console.log('✅ 追加 euphoria 风格的选项 CSS');
}

/* ── ② 结构：把「每项一对按钮」拆掉，改成底部三个 ── */
// 选项行：去掉 btns，加 .lit（她选中的亮）/ she
h = h.replace(
  /H\+='<div class="opts">';/,
  `H+='<div class="opts">';`
);
h = h.replace(
  `H+='<div class="opt'+(被选?' she':'')+'">'
          +'<span class="no">'+E(选键[k])+'</span><span class="tx">'+E(s.文本||'')+'</span>'
          +'<span class="lv '+等级[lv].k+'">'+lv+(等级[lv].c?' '+等级[lv].c[0]+'~'+等级[lv].c[1]:'')+'</span>'
          +'<span class="btns">'
          +'<button class="ig" type="button" data-ig="'+E(选键[k])+'">无视</button>'
          +'<button class="rj" type="button" data-k="'+E(选键[k])+'"'+(反抗不够?' disabled title="反抗值不够"':'')+'>拒绝</button>'
          +'</span></div>';`,
  `H+='<div class="opt'+(被选?' she lit':' lit')+' lv-'+lv+'" data-k="'+E(选键[k])+'">'
          +'<span class="row1"><span class="no">'+E(选键[k])+'</span>'
          +'<span class="tx">'+E(s.文本||'')+'</span>'
          +'<span class="lv">'+lv+(等级[lv].c?' '+等级[lv].c[0]+'~'+等级[lv].c[1]:'')+'</span></span>'
          +(s.感觉?'<div class="feel">'+E(s.感觉)+'</div>':'')
          +'</div>';`
);
console.log('   选项行 → ' + (h.includes('class="feel"') ? '✅ 大条 + lit + feel' : '⚠ 未替换'));

/* ── ③ 底部三个按钮替掉「自己来」那一行 ── */
h = h.replace(
  /H\+='<div class="opt" style="border-style:dashed;margin-top:6px">'[\s\S]*?\+'<\/span><\/div>';/,
  `H+='<div class="fork">'
        +'<button class="fork-btn" type="button" data-fork="watch">眼睁睁看着</button>'
        +'<button class="fork-btn deny" type="button" data-fork="reject"'+(反抗不够?' disabled title="反抗值不够"':'')+'>拒绝</button>'
        +'<button class="fork-btn custom" type="button" data-fork="custom">自己来</button>'
        +'</div>';`
);
console.log('   按钮 → ' + (h.includes('data-fork="watch"') ? '✅ 底部三个' : '⚠ 未替换'));

fs.writeFileSync(p, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('✅ 语法通过（' + h.length + ' 字符）'); }
catch (e) { console.log('❌ ' + e.message.slice(0, 90)); }
