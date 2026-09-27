// 照同级生2 重写选项交互：面板内判定 → set 变量 → 面板显示结果 → 不推送、不 await、不 busy
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

// ① 删掉 推给AI（同级生2 没有这套；await /trigger 会永不返回 → busy 卡死 → ✦ 一直转）
{
  const i = t.indexOf('/* ★ 推送链路（照 同级生2）');
  const j = t.indexOf('/* ══ 点了选项就直接走完', i);
  if (i > 0 && j > i) {
    t = t.slice(0, i) + `/* ★ 2026-09-22：删掉「/setinput → /send → /trigger」那套推送。
   同级生2 的 refuse() 根本不做推送 —— 它只在面板里算完、set() 写变量、把结果显示出来，
   AI 下一轮读 局面.判定结果 就知道发生了什么。
   我原来的写法里 await triggerSlash('/trigger') 永不返回 → S.busy 卡在 true → 卡片右上角 ✦ 一直转。 */` + eol + eol + t.slice(j);
    n++; console.log('✓ 删除 推给AI');
  } else console.log('  ⚠ 推给AI 段未定位 i=' + i + ' j=' + j);
}

// ② 看看着她 / 交给她判 / 掷自定义 里对 推给AI 的调用，改成只写变量 + 提示
换(`    await 推给AI("【我这轮的动作】我什么都没做，就看着她。「"+文本+"」\\n★ 按她这一条往下写，不要自己另掷骰、不要改数值。");`,
`    await writeStat(function(box){
      box.玩家=box.玩家||{};
      box.玩家._本轮判定={行为:"看着",综合:"未判定",说明:"他什么都没做，就看着她：「"+文本+"」"};
      box.局面=box.局面||{};
      box.局面.判定结果={选项:文本,等级:"",消耗:0,成功率:0,掷值:0,结果:"未判定",档位:"未判定",说明:"他什么都没做，就看着她。"};
    });
    S.结果="他什么都没做，就看着她。";`,
   '看着她 改写变量');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');
