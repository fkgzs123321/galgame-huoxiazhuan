// 修三处无争议的字段名 bug（不存在的字段／旧名／指代不明）
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;
const 换 = (f, pairs, tag) => {
  let t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t); let h = 0;
  for (const [a, b] of pairs) {
    const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
    const c = t.split(A).length - 1;
    if (!c) { console.log('  ⚠ 未命中 ' + tag + '：' + a.slice(0, 40)); continue; }
    t = t.split(A).join(B); h += c;
  }
  if (h) { fs.writeFileSync(f, t, 'utf8'); n += h; }
  console.log((h ? '✓' : '·') + ' ' + tag.padEnd(22) + h);
};

// ① 不存在的字段「假阳具深度使用」→ 统计.假阳具使用；等级明确为 郝佳期.群等级
换('世界书/[mvu_plot]阶段晋升系统.txt', [
  ['| 3 | 身体教导期 | 主动接触，借口"教育" | 累计射精诱导≥10次 + 假阳具深度使用≥20次 |',
   '| 3 | 身体教导期 | 主动接触，借口"教育" | 统计.诱导射精≥10次 + 统计.假阳具使用≥20次 |'],
  ['- 假阳具深度使用（含吮/插入自身）≥20次', '- 统计.假阳具使用（含吮／插入自身）≥20次'],
  ['2→3 诱导射精≥10／假阳具≥20／等级≥Lv.3', '2→3 统计.诱导射精≥10／统计.假阳具使用≥20／郝佳期.群等级≥3'],
], '阶段3 字段名');

换('世界书/[事件]线下聚会.txt', [
  ['  - 阶段2 → 阶段3的晋升条件中"假阳具深度使用"要求降低5次',
   '  - 阶段2 → 阶段3的晋升条件中「统计.假阳具使用」的要求降低 5 次'],
], '线下聚会 字段名');

// ② _delta_rules 的旧字段名（命名统一时漏在 YAML 文本块里）
{
  const F = '世界书/变量/变量更新规则.yaml';
  let t = fs.readFileSync(F, 'utf8');
  const a4 = t.match(/^.*关系变量（[^\n]*$/m); const a6 = t.match(/^.*累计统计（[^\n]*$/m);
  if (a4 && /与儿子\*/.test(a4[0])) { t = t.replace(a4[0], '    4. 关系变量（关系.${亲密度|信任度|边界}、叛逆恐惧）：单次 ±1~±5'); n++; console.log('✓ _delta_rules 第 4 条 旧名'); }
  if (a6 && /累计\*/.test(a6[0])) { t = t.replace(a6[0], '    6. 累计统计（统计.${偷抚次数|诱导射精|假阳具使用|暴露次数}）：单次 +1，累计只增不减'); n++; console.log('✓ _delta_rules 第 6 条 旧名'); }
  fs.writeFileSync(F, t, 'utf8');
}

console.log('\n共 ' + n + ' 处');
