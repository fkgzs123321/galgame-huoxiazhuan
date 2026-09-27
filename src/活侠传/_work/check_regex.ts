/**
 * 验证正则脚本真的进了 PNG，且面板 HTML 完整。
 */
import fs from 'node:fs';

const raw = fs.readFileSync('src/活侠传/活侠传.png');
let pos = 8;
let 内嵌: any = null;
while (pos < raw.length - 8) {
  const len = raw.readUInt32BE(pos);
  const typ = raw.toString('latin1', pos + 4, pos + 8);
  if (typ === 'tEXt') {
    const data = raw.subarray(pos + 8, pos + 8 + len);
    const z = data.indexOf(0);
    if (data.toString('latin1', 0, z) === 'ccv3') {
      try { 内嵌 = JSON.parse(Buffer.from(data.toString('latin1', z + 1), 'base64').toString('utf8')); } catch { /* */ }
    }
  }
  pos += 12 + len;
}

const j = 内嵌.data ?? 内嵌;
let 缺 = 0;
const 查 = (名: string, 条件: boolean, 附?: unknown) => {
  if (!条件) 缺++;
  console.log(`  ${条件 ? '✓' : '✗'} ${名}${附 !== undefined ? '  ' + JSON.stringify(附).slice(0, 120) : ''}`);
};

// ★★ 正则在 `extensions.regex_scripts`，不在顶层。
//    早先读 `j.regex_scripts` 得到空对象，误报「全部不合格」——
//    实际 640 KB 的面板早就内联进去了（PNG 从 654 KB 涨到 2381 KB 就是证据）。
console.log('══ 正则脚本 ══');
const rs = j.extensions?.regex_scripts ?? {};
查('extensions.regex_scripts 非空', Object.keys(rs).length > 0, Object.keys(rs));

for (const [名, r] of Object.entries(rs) as [string, any][]) {
  console.log(`\n  【${名}】`);
  console.log(`    findRegex:     ${r.findRegex}`);
  console.log(`    promptOnly:    ${r.promptOnly}`);
  console.log(`    markdownOnly:  ${r.markdownOnly}`);
  console.log(`    runOnEdit:     ${r.runOnEdit}`);
  console.log(`    placement:     ${JSON.stringify(r.placement)}`);
  if (r.replace_file) {
    console.log(`    replace_file:  ${r.replace_file}`);
    console.log(`    内联 HTML:     ${(r.replaceString ?? '').length} 字符`);
  } else {
    console.log(`    replaceString: ${JSON.stringify(r.replaceString)}`);
  }
}

// 配对检查
const 界面 = rs['状态栏界面'];
const 隐藏 = rs['对AI隐藏状态栏'];
console.log('\n══ 配对检查 ══');
查('两条都在', !!界面 && !!隐藏);
查('findRegex 一致', 界面?.findRegex === 隐藏?.findRegex, 界面?.findRegex);
查('界面 = markdownOnly', 界面?.markdownOnly === true && 界面?.promptOnly === false);
查('隐藏 = promptOnly', 隐藏?.promptOnly === true && 隐藏?.markdownOnly === false);
查('placement 都是 [2]', JSON.stringify(界面?.placement) === '[2]' && JSON.stringify(隐藏?.placement) === '[2]');

console.log('\n══ 面板 HTML 完整性 ══');
const html = 界面?.replaceString ?? '';
查('HTML 非空', html.length > 100000, `${(html.length / 1024).toFixed(0)} KB`);
查('有 DOCTYPE', html.includes('<!DOCTYPE') || html.includes('<!doctype'));
查('有 charset', /charset\s*=\s*["']?utf-8/i.test(html));
查('含挂载点', html.includes('id="app"') || html.includes("querySelector('#app')") || html.includes('createApp'));
// 面板里的招牌内容
查('含「本旬可做的事」（行动面板）', html.includes('本旬可做的事'));
查('含「云开见日」（门派阶段）', html.includes('云开见日'));
查('含「脱皮囊」等物表名', html.includes('鹿皮囊'));
查('含「唐门日常」等世界书文本', html.includes('唐门') || html.includes('活侠传'));

console.log('\n══ 开场白里的占位符 ══');
查('first_mes 带占位符', String(j.first_mes).includes('<StatusPlaceHolderImpl/>'));
const alt = j.alternate_greetings ?? [];
查('所有备用开场白都带占位符', alt.every((a: string) => a.includes('<StatusPlaceHolderImpl/>')), `${alt.length} 条`);

console.log('\n' + '═'.repeat(50));
if (缺) {
  console.log(`✗ 有 ${缺} 项不合格`);
  process.exit(1);
}
console.log('✓ 正则脚本与面板全部就位');
