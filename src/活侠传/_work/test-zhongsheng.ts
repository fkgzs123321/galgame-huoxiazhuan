/**
 * 江湖众生相自测
 * 运行：node --import tsx src/活侠传/_work/test-zhongsheng.ts
 */
import { 众生表, 取类, 找相关, 此地有谁 } from '../脚本/众生相';

let 通过 = 0;
let 失败 = 0;
function 断言(名: string, 条件: boolean, 附?: unknown) {
  if (条件) { 通过++; console.log(`  ✓ ${名}`); }
  else { 失败++; console.log(`  ✗ ${名}`); if (附 !== undefined) console.log('      ' + JSON.stringify(附).slice(0, 300)); }
}

console.log('══ ① 规模 ══');
console.log(`  ${众生表.length} 组 / ${众生表.reduce((s, x) => s + x.人数, 0)} 个立绘 / ${众生表.reduce((s, x) => s + x.片段数, 0)} 条片段`);
断言('≥ 50 组', 众生表.length >= 50, 众生表.length);
断言('每组有名字', 众生表.every(x => !!x.名));
断言('名字不重复', new Set(众生表.map(x => x.名)).size === 众生表.length,
  众生表.map(x => x.名).filter((n, i, a) => a.indexOf(n) !== i));

console.log('\n══ ② ★ 繁体已转简体 ══');
{
  const 繁 = /[劍譜輕氣內體學問術養處戰勝傷藥銀錢鐵門雲週選還錄貢貴買賣質趙緣項額聲稱獻獲滿歸機條擇孫嬌師鬥勢兩變煉禦爭絕鐘颯壞兒淨亂後點沒動擠盤閒難圍幫贏書蒼結親識單強頭畫補衛狀產規]/
  const 坏 = 众生表.filter(x => 繁.test(JSON.stringify(x)));
  断言('没有残留繁体', 坏.length === 0, 坏.slice(0, 3).map(x => x.名));
  if (坏.length) console.log('    ' + 坏.slice(0, 6).map(x => x.名).join('、'));
}

console.log('\n══ ③ ★ 名字正确（这是修过的 bug）══');
{
  // 早先版本把「第一行的第一格」当人名 —— 那是场景名，
  // 于是同一个 NPC 被拆成多条、名字还错（如「大师兄玩耍」）。
  // 现在名字来自 ## 标题（组名）。
  //
  // ★ 注意「破庙线」不在这个黑名单里：原文里它**既是组名也是场景名**
  //   （`## 破庙线` 是真的分组标题），所以它是合法组名，不是误报。
  const 场景名 = ['大师兄玩耍', '赠药事件', '大师兄下山', '叶家兄妹上山', '武林大会'];
  const 错 = 众生表.filter(x => 场景名.includes(x.名));
  断言('★ 名字不是场景名', 错.length === 0, 错.map(x => x.名));

  // 应当有真实组名
  for (const 期望 of ['阎关三煞', '破戒僧', '路人侠']) {
    断言(`含「${期望}」`, 众生表.some(x => x.名 === 期望), 众生表.map(x => x.名).slice(0, 8));
  }
}

console.log('\n══ ④ 归类 ══');
{
  const 类 = new Map<string, number>();
  for (const x of 众生表) 类.set(x.类, (类.get(x.类) || 0) + 1);
  for (const [k, n] of [...类].sort((a, b) => b[1] - a[1])) console.log(`    ${k.padEnd(12)} ${n}`);
  const 合法 = new Set(['唐门男弟子', '唐门女弟子', '两大世家', '六大派', '其他门派', '江湖人士', '其他角色']);
  const 非法 = [...类.keys()].filter(k => !合法.has(k));
  断言('★ 归类都是中文且合法', 非法.length === 0, 非法);
  for (const k of ['唐门男弟子', '唐门女弟子', '江湖人士']) {
    断言(`有 ${k}`, 取类(k).length > 0, 取类(k).length);
  }
}

console.log('\n══ ⑤ 身份描述 ══');
{
  const 无身份 = 众生表.filter(x => !x.身份 || x.身份.length < 8);
  console.log(`  身份描述平均 ${(众生表.reduce((s, x) => s + x.身份.length, 0) / 众生表.length).toFixed(0)} 字`);
  断言('每组都有身份', 无身份.length === 0, 无身份.slice(0, 3).map(x => x.名));
  for (const x of 众生表.slice(0, 3)) {
    console.log(`    ${x.名}：${x.身份.slice(0, 60)}`);
  }
}

console.log('\n══ ⑥ 片段 ══');
{
  const 无片段 = 众生表.filter(x => x.片段.length === 0);
  断言('每组都有片段', 无片段.length === 0, 无片段.length);
  const 超长 = 众生表.filter(x => x.片段.some(f => f.故事.length > 200));
  断言('片段已截断（≤200字）', 超长.length === 0, 超长.length);
  const 有场景 = 众生表.filter(x => x.片段.every(f => !!f.场景));
  断言('片段都带场景名', 有场景.length === 众生表.length);
  console.log(`  片段总数 ${众生表.reduce((s, x) => s + x.片段数, 0)}，每组最多保留 3 条`);
}

console.log('\n══ ⑦ ★ 关键词（供世界书触发）══');
{
  const 有关键词 = 众生表.filter(x => x.关键词.length > 0);
  console.log(`  ${有关键词.length} / ${众生表.length} 组有关键词`);
  断言('大部分有关键词', 有关键词.length > 40, 有关键词.length);

  const 计 = new Map<string, number>();
  for (const x of 众生表) for (const k of x.关键词) 计.set(k, (计.get(k) || 0) + 1);
  console.log('  高频关键词：');
  for (const [k, n] of [...计].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${k.padEnd(10)} ${n} 组`);
  }
  断言('★ 唐门是最高频', [...计].sort((a, b) => b[1] - a[1])[0][0] === '唐门', [...计].sort((a, b) => b[1] - a[1])[0]);
}

console.log('\n══ ⑧ ★ 此地有谁（AI 写场景时用）══');
{
  for (const 地 of ['唐门', '伙房', '客栈', '后山']) {
    const 谁 = 此地有谁(地);
    console.log(`    ${地.padEnd(6)} → ${谁.length ? 谁.slice(0, 6).join('、') : '（无）'}`);
  }
  const 唐门 = 此地有谁('唐门');
  断言('★ 唐门找得到人', 唐门.length > 5, 唐门.length);
  const 空 = 此地有谁('不存在的地方');
  断言('不存在的地方返回空', 空.length === 0, 空);
}

console.log('\n══ ⑨ 找相关 ══');
{
  const r = 找相关('叶云舟');
  console.log(`  与「叶云舟」相关的 ${r.length} 组：${r.slice(0, 6).map(x => x.名).join('、')}`);
  断言('★ 找得到叶云舟相关的人', r.length > 0, r.length);
  断言('返回的都是 众生 对象', r.every(x => typeof x.名 === 'string' && Array.isArray(x.片段)));
}

console.log('\n' + '═'.repeat(50));
console.log(`通过 ${通过} / 失败 ${失败}`);
if (失败) { console.log('★ 有失败项'); process.exit(1); }
console.log('全部通过');
