// 命名统一：11 位成员详情里的「与儿子*／累计*」→ 与郝佳期同构的「关系.*／统计.*」
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;
const ed = (f, pairs, tag) => {
  let t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t); let hit = 0;
  for (const [a, b] of pairs) {
    const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
    const c = t.split(A).length - 1;
    if (!c) { console.log('  ⚠ 未命中 ' + a.slice(0, 40)); continue; }
    t = t.split(A).join(B); hit += c;
  }
  if (hit) { fs.writeFileSync(f, t, 'utf8'); n += hit; }
  console.log((hit ? '✓' : '·') + ' ' + tag.padEnd(18) + hit);
};

// ── ① schema.ts：7 个平铺字段 → 关系/统计 两个子对象
ed('schema.ts', [[
  `  与儿子亲密度: pct.prefault(70),
  与儿子信任度: pct.prefault(80),
  与儿子边界: pct.prefault(50),
  累计假阳具: num,
  累计偷抚: num,
  累计诱导射精: num,
  累计暴露: num,`,
  `  关系: z.object({
    亲密度: pct.prefault(70),
    信任度: pct.prefault(80),
    边界: pct.prefault(50),
  }).prefault({}).catch({}),
  统计: z.object({
    假阳具使用: num,
    偷抚次数: num,
    诱导射精: num,
    暴露次数: num,
  }).prefault({}).catch({}),`,
]], 'schema.ts');

// ── ② 5 份 initvar：11 位 × 7 行 → 嵌套（值原样保留）
{
  const re = /^( {6})与儿子亲密度: (\d+)\r?\n {6}与儿子信任度: (\d+)\r?\n {6}与儿子边界: (\d+)\r?\n {6}累计假阳具: (\d+)\r?\n {6}累计偷抚: (\d+)\r?\n {6}累计诱导射精: (\d+)\r?\n {6}累计暴露: (\d+)$/gm;
  for (const f of ['世界书/变量/initvar.yaml', '开场白/initvar/1.yaml', '开场白/initvar/2.yaml', '开场白/initvar/3.yaml', '开场白/initvar/4.yaml']) {
    let t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t);
    let c = 0;
    t = t.replace(re, (m, sp, a, b, d, e2, f2, g2, h2) => {
      c++;
      return [sp + '关系:', sp + '  亲密度: ' + a, sp + '  信任度: ' + b, sp + '  边界: ' + d,
        sp + '统计:', sp + '  假阳具使用: ' + e2, sp + '  偷抚次数: ' + f2, sp + '  诱导射精: ' + g2, sp + '  暴露次数: ' + h2].join(eol);
    });
    if (c) { fs.writeFileSync(f, t, 'utf8'); n += c; }
    console.log((c ? '✓' : '·') + ' ' + f.split('/').pop().padEnd(18) + c + ' 位');
  }
}

// ── ③ 世界书读点
ed('世界书/[mvu_plot]阶段晋升系统.txt', [
  ['累计偷抚≥5 ／ 累计假阳具使用≥10', '统计.偷抚次数≥5 ／ 统计.假阳具使用≥10'],
  ['累计暴露≥3次未拒绝', '统计.暴露次数≥3次未拒绝'],
  ['- 累计偷抚{{user}}（趁睡）≥5次', '- 统计.偷抚次数≥5次'],
  ['- 累计暴露次数≥3次且{{user}}未拒绝', '- 统计.暴露次数≥3次且{{user}}未拒绝'],
  ['- 晋升驱动：累计偷抚/假阳具使用/诱导射精/暴露次数', '- 晋升驱动：统计.偷抚次数／假阳具使用／诱导射精／暴露次数'],
  ['任一成员的累计暴露≥10', '任一成员的统计.暴露次数≥10'],
  ['任一成员累计暴露≥10', '任一成员统计.暴露次数≥10'],
], '阶段晋升系统');
ed('世界书/[事件]线下聚会.txt', [[
  '她去了之后 `累计暴露` +1', '她去了之后 `统计.暴露次数` +1',
]], '线下聚会');
ed('世界书/[总控]剧情与事件.txt', [[
  '或累计暴露≥3次未拒绝', '或统计.暴露次数≥3次未拒绝',
]], '剧情与事件');
ed('世界书/变量/变量更新规则.yaml', [
  ['她去了之后 `累计暴露` +1', '她去了之后 `统计.暴露次数` +1'],
  ['任一成员累计暴露≥10', '任一成员统计.暴露次数≥10'],
  ['    与儿子亲密度|与儿子信任度|与儿子边界: { range: 0~100 }', '    关系.${亲密度|信任度|边界}: { range: 0~100 }'],
  ['    累计假阳具|累计偷抚|累计诱导射精|累计暴露: { check: 累计只增不减 }', '    统计.${假阳具使用|偷抚次数|诱导射精|暴露次数}: { check: 累计只增不减 }'],
], '变量更新规则');

// ── ④ 状态栏渲染
ed('正则/状态栏.html', [[
  `  s+='<div class="row"><span class="k">与儿子</span><span class="v">亲密'+Math.round(pct(d.与儿子亲密度))+" · 信任"+Math.round(pct(d.与儿子信任度))+" · 边界"+Math.round(pct(d.与儿子边界))+"</span></div>";
  s+='<div class="row"><span class="k">累计</span><span class="v" style="font-weight:400">假阳具'+num(d.累计假阳具)+" · 偷抚"+num(d.累计偷抚)+" · 诱导"+num(d.累计诱导射精)+" · 暴露"+num(d.累计暴露)+"</span></div>";`,
  `  var _r=d.关系||{}, _s=d.统计||{};
  s+='<div class="row"><span class="k">与儿子</span><span class="v">亲密'+Math.round(pct(_r.亲密度))+" · 信任"+Math.round(pct(_r.信任度))+" · 边界"+Math.round(pct(_r.边界))+"</span></div>";
  s+='<div class="row"><span class="k">累计</span><span class="v" style="font-weight:400">假阳具'+num(_s.假阳具使用)+" · 偷抚"+num(_s.偷抚次数)+" · 诱导"+num(_s.诱导射精)+" · 暴露"+num(_s.暴露次数)+"</span></div>";`,
]], '状态栏渲染');

console.log('\n共 ' + n + ' 处');
