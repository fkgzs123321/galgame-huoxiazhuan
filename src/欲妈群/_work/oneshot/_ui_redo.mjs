// 状态栏：重做 命名统一渲染 + 技能5→3 + 砍D20历史/备注（hist 段用括号配对精确删）
import fs from 'fs';
const F = '正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;
const 换 = (a, b, tag) => {
  const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
  const c = t.split(A).length - 1;
  if (!c) { console.log('  ⚠ 未命中 ' + tag); return; }
  t = t.split(A).join(B); n += c; console.log('✓ ' + tag);
};

// ── ① 命名统一：成员详情的 与儿子*/累计* → 关系/统计
换(
`  s+='<div class="row"><span class="k">与儿子</span><span class="v">亲密'+Math.round(pct(d.与儿子亲密度))+" · 信任"+Math.round(pct(d.与儿子信任度))+" · 边界"+Math.round(pct(d.与儿子边界))+"</span></div>";
  s+='<div class="row"><span class="k">累计</span><span class="v" style="font-weight:400">假阳具'+num(d.累计假阳具)+" · 偷抚"+num(d.累计偷抚)+" · 诱导"+num(d.累计诱导射精)+" · 暴露"+num(d.累计暴露)+"</span></div>";`,
`  var _r=d.关系||{}, _s=d.统计||{};
  s+='<div class="row"><span class="k">与儿子</span><span class="v">亲密'+Math.round(pct(_r.亲密度))+" · 信任"+Math.round(pct(_r.信任度))+" · 边界"+Math.round(pct(_r.边界))+"</span></div>";
  s+='<div class="row"><span class="k">累计</span><span class="v" style="font-weight:400">假阳具'+num(_s.假阳具使用)+" · 偷抚"+num(_s.偷抚次数)+" · 诱导"+num(_s.诱导射精)+" · 暴露"+num(_s.暴露次数)+"</span></div>";`,
'命名统一渲染');

// ── ② 技能 5→3
换('   技能:{洞察:10,冥想:5,伪装:8,意志:15,调查:5},', '   技能:{观察:10,行动:8,意志:15},', '技能默认值');
换('var SKILLS={洞察:{dc:12},冥想:{dc:10},伪装:{dc:10},意志:{dc:12},调查:{dc:15}};', 'var SKILLS={观察:{dc:12},行动:{dc:10},意志:{dc:12}};', 'SKILLS 表');
换('    var order=["洞察","冥想","伪装","意志","调查","拒绝","后门反抗"];', '    var order=["观察","行动","意志","拒绝","后门反抗"];', 'order');
换('    var 技=isBack?num((p.技能||{}).调查,0):num((p.技能||{})[skill],0);', '    var 技=isBack?num((p.技能||{}).观察,0):num((p.技能||{})[skill],0);', '后门用观察');

// ── ③ 砍 D20历史 / 假阳具备注
换('证据清单:"",D20历史:"",_本轮判定:{}', '证据清单:"",_本轮判定:{}', '默认值 D20历史');
换('借用期限:0,备注:""}', '借用期限:0}', '默认值 备注');
换('  if(t.备注) s+=\'<div class="row"><span class="k">备注</span><span class="v" style="font-weight:400">\'+esc(t.备注)+"</span></div>";' + '\n', '', '备注渲染');
换('  var p=g("玩家",{}), last=p._本轮判定||{}, hist=String(p.D20历史||"").split("；").filter(Boolean);', '  var p=g("玩家",{}), last=p._本轮判定||{};', 'hist 定义行');
换(`      var _h=String(box.玩家.D20历史||"").split("；").filter(Boolean);
      _h.push(rec);
      box.玩家.D20历史=_h.slice(-10).join("；");
`, '', '判定写入段');

// ── hist 渲染段：括号配对精确删
{
  const L = t.split(/\r?\n/);
  const i0 = L.findIndex(l => /^\s*if\(hist\.length\)\{$/.test(l));
  if (i0 < 0) console.log('· hist 段未找到（可能已删）');
  else {
    let depth = 0, end = -1;
    for (let i = i0; i < L.length; i++) {
      for (const ch of L[i]) { if (ch === '{') depth++; else if (ch === '}') depth--; }
      if (depth === 0 && i >= i0) { end = i; break; }
    }
    if (end < 0) console.log('⚠ hist 段括号不配对');
    else {
      console.log('✓ 删 hist 渲染段 L' + (i0 + 1) + '-L' + (end + 1) + '（' + (end - i0 + 1) + ' 行）');
      L.splice(i0, end - i0 + 1); t = L.join(eol); n++;
    }
  }
}

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');
