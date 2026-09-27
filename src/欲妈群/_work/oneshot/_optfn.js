/* ★ 选项区由 JS 拼 HTML（照 旮旯给木-同级生2 的 renderOpts）。
   为什么不用宏：宏只在 ST 渲染楼层那一刻填一次，变量之后再怎么变它都不动 ——
   这就是「她在二楼重摆了四个选项、面板还是一楼那四个」的原因。
   JS 每次重绘都重读变量，所以永远是最新的。 */
function 渲染选项(){
  var box=id("d-opts"); if(!box) return 0;
  var 局=(S.stat&&S.stat.局面)||{}, 选项=局.当前选项||{}, 她选=String(局.她已选||"");
  var 本批=批指纹(选项), 已锁=(S.锁批 && S.锁批===本批);
  var 有几格=0, html="";
  ["一","二","三","四"].forEach(function(k){
    var o=选项[k]||{}, 文本=String(o.文本||"").trim();
    if(!文本) return;
    有几格++;
    var 等级=String(o.等级||"微"), 代价=String(o.代价||"").trim(), dc=DC表[等级]||12;
    html += '<div class="opt'+(她选===k?" picked":"")+(已锁?" locked":"")+'" data-opt="'+k+'">'
          + '<b>'+k+'</b>'+esc(文本)
          + '<small>等级 '+esc(等级)+' · 拦它用 <b>'+esc(o.技能||"行动")+'</b>（DC'+dc+'）· 考验 <b>'+esc(o.主对||"拦住")+'</b>'
          + (代价?(' · 代价：'+esc(代价)):"") + '</small>'
          + '<div class="opt-btns"><button data-act="do" data-k="'+k+'"'+(已锁?" disabled":"")+'>选这个</button></div>'
          + '</div>';
  });
  box.innerHTML=html;
  return 有几格;
}
