// 共感瘦身：① 删掉纯重复的模板段（省 token） ② 改掉角色/玩家会看见的共感字样 ③ 真相层单点保留
import fs from 'fs';

const DEL = [ // 直接删掉的重复文本
  // —— 各人 基础信息「共感」段里的模板后半句（真相在 [mvu_plot]共感假阳具系统 §三/§四 已有）
  '他那头是莫名的包裹感、被吮感、被绞紧感，找不到源头；不自觉勃起、莫名射精、腰酸；以为自己出了毛病，不敢说。她用假阳具时必须双向描写，两个视角同一次里都要写足。',
  '他那头是莫名的包裹感、被吮感、被绞紧感，找不到源头；不自觉勃起、莫名射精、腰酸；以为自己出了毛病，不敢说。她用假阳具时必须双向描写。',
  // —— 各人 禁忌 里的第 3 条（纯重复；删掉后生成器会自动重排序号）
  "'不跳过共感：她用假阳具时必须双向描写', ",
];

const SUB = [ // 角色/玩家会看见 → 换掉措辞
  // 群生态扩展
  ['共感/借用互相掩护', '使用记录/借用互相掩护'],
  ['是幻觉，还是共感未灭？（悬念收尾）', '是幻觉，还是那支东西从来没停过？（悬念收尾）'],
  ['是幻觉，还是共感从未真正消失？（开放式收尾）', '是幻觉，还是那支东西从未真正消失？（开放式收尾）'],
  // 秘密任务
  ['（共感验证）', '（当场验证）'],
  // 阶段晋升系统
  ['累计使用假阳具（共感）≥10次', '累计使用那支东西 ≥10次'],
  ['共感测试：使用假阳具时观察{{user}}反应', '对照测试：使用那支东西时观察 {{user}} 反应'],
  ['共感假阳具与真阳具交替使用', '那支东西与别的器具交替使用'],
  ['（如妈妈主动告白/共感过载/群主介入）', '（如妈妈主动告白/那支东西过载/群主介入）'],
  // 线下聚会
  ['"共感展示"：使用假阳具时儿子的同步反应被众人观察', '"使用展示"：使用那支东西时儿子的当场反应被众人观察'],
  ['（调教展示/共感展示等进阶环节）', '（调教展示/使用展示等进阶环节）'],
  // 剧情与事件
  ['醒来发现内裤异常（共感残留）', '醒来发现内裤异常（说不清的潮湿）'],
  // 控制中心（难度档位，玩家可见）
  ['察觉值增长慢、共感描写较温和、郝佳期罪恶感高', '察觉值增长慢、那支东西的描写较温和、郝佳期罪恶感高'],
  ['察觉值增长快、共感强度可达150%、郝佳期罪恶感低、暴露概率高', '察觉值增长快、那支东西的强度可达150%、郝佳期罪恶感低、暴露概率高'],
  // 生成器：小标题去共感
  ["L.push('### 共感假阳具'", "L.push('### 那支东西'"],
];

let delN = 0, subN = 0;
const files = [];
for (const f of fs.readdirSync('_work/data').filter(x => x.endsWith('.mjs'))) files.push('_work/data/' + f);
files.push('_work/tmp/_patch_priv.json', '_work/gen/_gen_basic.mjs',
  ...[...fs.readdirSync('世界书').filter(x => x.endsWith('.txt')).map(x => '世界书/' + x)]);

const cache = {};
for (const f of files) {
  let t; try { t = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const before = t;
  for (const a of DEL) { const n = t.split(a).length - 1; if (n) { t = t.split(a).join(''); delN += n; console.log('  删 ' + f.split(/[\\/]/).pop() + ' ×' + n + '  ' + a.slice(0, 22)); } }
  for (const [a, b] of SUB) { const n = t.split(a).length - 1; if (n) { t = t.split(a).join(b); subN += n; console.log('  改 ' + f.split(/[\\/]/).pop() + ' ×' + n + '  ' + a.slice(0, 22)); } }
  if (t !== before) cache[f] = t;
}
for (const f of Object.keys(cache)) fs.writeFileSync(f, cache[f], 'utf8');
console.log('\n删除 ' + delN + ' 处，改写 ' + subN + ' 处，涉及 ' + Object.keys(cache).length + ' 个文件');
