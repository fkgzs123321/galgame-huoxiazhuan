import fs from 'fs';
const Q = String.fromCharCode(96);
const D = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/正则/';

// ① 与预设重复的那条 → 留底但禁用（skills：保留原文但 enabled: false）
{
  const F = D + '16-3变量更新对AI隐藏.json';
  const j = JSON.parse(fs.readFileSync(F, 'utf8'));
  j.disabled = true;
  fs.writeFileSync(F, JSON.stringify(j, null, 2) + '\n', 'utf8');
  console.log('✓ 16-3变量更新对AI隐藏 → disabled: true（留底，交给预设）');
}

// ② 清死引用：卡里/世界书里凡是说"由本卡正则隐藏变量更新"之类的，删掉
{
  const 文件 = [
    'E:/Games/写卡/tavern_helper_template/src/欲妈群/世界书/[mvu_plot]输出格式规范.txt',
    'E:/Games/写卡/tavern_helper_template/src/欲妈群/世界书/[mvu_plot]D0系统控制器.txt',
  ];
  const 死引用 = [
    '由正则删除',
    '由正则折叠美化',
    '由本卡正则',
    '卡内正则隐藏',
  ];
  let 总 = 0;
  for (const f of 文件) {
    if (!fs.existsSync(f)) continue;
    let t = fs.readFileSync(f, 'utf8');
    let 本 = 0;
    for (const s of 死引用) {
      const n = (t.split(s).length - 1);
      if (n) { t = t.split(s).join('（由预设控制）'); 本 += n; }
    }
    if (本) { fs.writeFileSync(f, t, 'utf8'); 总 += 本; console.log('  ✓ ' + f.split('/').pop() + '：清 ' + 本 + ' 处死引用'); }
  }
  console.log(总 ? '✓ 共清 ' + 总 + ' 处死引用' : '· 没找到死引用字样');
}

// ③ 核验
{
  const buf = fs.readFileSync('E:/Games/写卡/tavern_helper_template/src/欲妈群/欲妈群.png');
  let p = 8, found = null;
  while (p < buf.length - 8) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'tEXt') {
      const d = buf.slice(p + 8, p + 8 + len); const z = d.indexOf(0);
      if (d.toString('ascii', 0, z) === 'chara') { found = d.slice(z + 1).toString('ascii'); break; }
    }
    p += 12 + len; if (type === 'IEND') break;
  }
  const c = JSON.parse(Buffer.from(found, 'base64').toString('utf8'));
  const rs = c.data.extensions.regex_scripts;
  console.log('');
  console.log('══ 卡里正则（' + rs.length + ' 条）══');
  rs.forEach(r => {
    const s = String(r.replaceString || '');
    console.log('  ' + (r.disabled ? '⏸禁用' : '▶启用') + ' ' + String(r.scriptName).padEnd(24) + ' M/P=' + (r.markdownOnly ? 1 : 0) + '/' + (r.promptOnly ? 1 : 0) + '　' + (s ? s.length + ' 字符' : '空（隐藏）'));
  });
}
