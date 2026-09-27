// 「自己来」改成面板内展开输入区（不再用 window.prompt）
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
let h = fs.readFileSync(p, 'utf8');

/* ① CSS：输入区 */
const CSS = `
/* ══ 自己来 · 面板内输入区 ══ */
#gg2 .cx{margin:10px 0 2px;padding:12px 14px;border-radius:4px;display:none;
  border:1px solid rgba(232,184,75,.42);
  background:linear-gradient(100deg,rgba(232,184,75,.09),rgba(232,184,75,.02))}
#gg2 .cx.on{display:block;animation:cxIn .28s ease-out both}
@keyframes cxIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
#gg2 .cx .hint{font-size:11.5px;color:#8d97ab;margin-bottom:8px;line-height:1.6}
#gg2 .cx .hint b{color:#e8c98a;font-weight:600}
#gg2 .cx textarea{width:100%;min-height:64px;resize:vertical;font-family:inherit;font-size:13.5px;
  line-height:1.65;color:#e6ecf8;background:#0f141c;border:1px solid #333d4d;border-radius:4px;
  padding:9px 11px;outline:none;transition:border-color .2s ease}
#gg2 .cx textarea:focus{border-color:rgba(232,184,75,.6)}
#gg2 .cx .row{display:flex;gap:9px;justify-content:flex-end;margin-top:9px;align-items:center}
#gg2 .cx .cost{font-size:11px;color:#79839c;margin-right:auto;letter-spacing:.05em}
`;
if (!h.includes('自己来 · 面板内输入区')) h = h.replace('</style>', CSS + '\n</style>');

/* ② 结构：放在 fork 三个按钮之后 */
const 旧fork = `H+='<div class="fork">'
        +'<button class="fork-btn" type="button" data-fork="watch">眼睁睁看着</button>'
        +'<button class="fork-btn deny" type="button" data-fork="reject"'+(反抗不够?' disabled title="反抗值不够"':'')+'>拒绝</button>'
        +'<button class="fork-btn custom" type="button" data-fork="custom">自己来</button>'
        +'</div>';`;
const 新fork = `H+='<div class="fork">'
        +'<button class="fork-btn" type="button" data-fork="watch">眼睁睁看着</button>'
        +'<button class="fork-btn deny" type="button" data-fork="reject"'+(反抗不够?' disabled title="反抗值不够"':'')+'>拒绝</button>'
        +'<button class="fork-btn custom" type="button" data-fork="custom">自己来</button>'
        +'</div>';
      H+='<div class="cx" data-cx>'
        +'<div class="hint">不按她摆的来，写一件你想做的事。<b>掏空反抗值，一局顶多一两次。</b></div>'
        +'<textarea data-cx-text placeholder="例：趁她转身，把门锁上"></textarea>'
        +'<div class="row"><span class="cost">消耗 50~70 反抗值</span>'
        +'<button class="fork-btn" type="button" data-cx-cancel>算了</button>'
        +'<button class="fork-btn custom" type="button" data-cx-ok>就这么做</button></div>'
        +'</div>';`;
if (h.includes(旧fork)) { h = h.replace(旧fork, 新fork); console.log('✅ 结构：加了面板内输入区'); }
else console.log('⚠ 结构锚点未命中');

/* ③ JS：点「自己来」→ 展开；「就这么做」→ 执行；「算了」→ 收起 */
const 旧custom = `        if (act === 'custom') {
          var 想做 = (window.prompt('你想做什么？（掏空反抗值，一局顶多一两次）') || '').trim();
          if (!想做) { if (res) { res.className = 'res on no'; res.textContent = '写一句你想做什么。'; } return; }
          var 耗2 = 50 + Math.floor(Math.random() * 21);
          await 写(function (pr, jj) {
            pr.反抗值 = Math.max(0, 反抗 - 耗2);
            jj.玩家拒绝 = '自定义';
            jj.判定结果 = { 选项: 想做, 等级: '自定义', 消耗: 耗2, 结果: '自定义', 效果倍数: 1 };
          }, 'on ig', '自己来：「' + 想做 + '」｜ 扣 ' + 耗2 + ' 反抗值。', '（我不按她摆的来。我要' + 想做 + '。）');
          return;
        }`;
const 新custom = `        if (act === 'custom') {
          var box = 盒.querySelector('[data-cx]');
          if (box) { box.className = box.className.indexOf('on') >= 0 ? 'cx' : 'cx on';
            var ta = box.querySelector('[data-cx-text]'); if (ta && box.className.indexOf('on') >= 0) ta.focus(); }
          return;
        }`;
if (h.includes(旧custom)) { h = h.replace(旧custom, 新custom); console.log('✅ JS：prompt 换成展开输入区'); }
else console.log('⚠ JS 锚点未命中');

/* ④ 新版：绑定「就这么做」/「算了」 */
const 挂点 = `    var forks = 盒.querySelectorAll('.fork-btn');`;
const 新挂 = `    /* 面板内「自己来」的确认与取消 */
    var cxOk = 盒.querySelector('[data-cx-ok]'), cxNo = 盒.querySelector('[data-cx-cancel]'), cxBox = 盒.querySelector('[data-cx]');
    if (cxNo) cxNo.onclick = function () { if (cxBox) cxBox.className = 'cx'; };
    if (cxOk) cxOk.onclick = async function () {
      var ta = 盒.querySelector('[data-cx-text]');
      var 想做 = ta ? String(ta.value || '').trim() : '';
      var res = 盒.querySelector('.res');
      if (!想做) { if (res) { res.className = 'res on no'; res.textContent = '写一句你想做什么。'; } if (ta) ta.focus(); return; }
      var sd = 取数据(楼); if (!sd) return;
      var 反抗 = 数(sd.主角 && sd.主角.反抗值, 0);
      var 耗2 = 50 + Math.floor(Math.random() * 21);
      if (cxBox) cxBox.className = 'cx';
      ta.value = '';
      await 写(function (pr, jj) {
        pr.反抗值 = Math.max(0, 反抗 - 耗2);
        jj.玩家拒绝 = '自定义';
        jj.判定结果 = { 选项: 想做, 等级: '自定义', 消耗: 耗2, 结果: '自定义', 效果倍数: 1 };
      }, 'on ig', '自己来：「' + 想做 + '」｜ 扣 ' + 耗2 + ' 反抗值。', '（我不按她摆的来。我要' + 想做 + '。）');
    };

    var forks = 盒.querySelectorAll('.fork-btn');`;
if (h.includes(挂点) && !h.includes('data-cx-ok]')) { h = h.replace(挂点, 新挂); console.log('✅ JS：绑定了「就这么做」/「算了」'); }
else console.log('⚠ 挂点未命中或已存在');

fs.writeFileSync(p, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
fs.writeFileSync('_tmp_check.js', m[1]);
console.log('   大小: ' + h.length + ' 字符');
