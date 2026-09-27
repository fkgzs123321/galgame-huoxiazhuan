// ════════════════════════════════════════════════════════════
// sync-engine.cjs · 把同级生2 最新的机制层同步过来
//
// 同级生2 是这个系列机制层的**活体**，它在持续更新；英雄坛说是它的下游。
// 所以每次它更新，这里要跑一次。
//
// ★ 同步不是复制。它里面混着同级生2 自己的底座内容，直接搬会把它的世界观带进来。
//   所以：① 先按替换表做适配  ② 再用专属词审计验证  ③ 不干净的报出来人工处理
//
// 用法: node scripts/sync-engine.cjs [--dry]
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const SRC = path.join(ROOT, 'src', '旮旯给木-同级生2', '世界书');
const DST = path.join(ROOT, 'src', '旮旯给木-英雄坛说', '世界书');
const dry = process.argv.includes('--dry');

// ── 同级生2 的机制层（下游要跟的）──
const 同步表 = [
  '世界观/引擎/交互循环.yaml',
  '世界观/引擎/出招.yaml',
  '世界观/引擎/反抗与判定.yaml',
  '世界观/引擎/四态循环.yaml',
  '世界观/引擎/离线行动.yaml',
  '世界观/引擎/兴奋度机制.yaml',
  '世界观/引擎/剧情推进.yaml',
  '世界观/引擎/边界情况.yaml',
  '扮演准则/加载纪律.yaml',
  '扮演准则/叙述准则.yaml',
  '扮演准则/感知禁令.yaml',
  '扮演准则/判定引擎.yaml',
  '扮演准则/思维链.yaml',

  '扮演准则/文风_骚妈.yaml',
  '扮演准则/文风_母猪中.yaml',
  '扮演准则/文风_母猪轻.yaml',   // 独有
  '扮演准则/文风_母猪重.yaml',   // 独有
  '扮演准则/文风_白洁.yaml',     // 独有
  '阶段指导/阶段指导.yaml',
  '阶段指导/熟练度阶段.yaml',
];

// ── 适配替换（顺序有意：长的先替）──
const 替换 = [
  // 底座类目
  ['世界观/底座_nanpa2/', '世界观/底座_yingxiong/'],
  ['角色/底座_nanpa2/', '角色/底座_yingxiong/'],
  ['底座_nanpa2', '底座_yingxiong'],
  ["=== 'nanpa2'", "=== 'yingxiong'"],
  // 通道名统一（我们的口径是「自定义」，同级生2 用「自己来」）
  ['「自己来」', '「自定义」'],
  ['自己来', '自定义'],
  // 同级生2 特有的世界观词 → 我们的
  ['八十八町', '平安镇'],
  ['八十八学园', '武当山'],
  ['如月町', '商家堡'],
  ['温泉乡', '大雪山'],
  ['88市民医院', '灵心观'],
  ['八十八海岸', '冰火岛'],
  ['保育园', '桃花源'],
  ['寒假', '这两年'],
  ['日期', '岁数'],
  ['时段', '时间进度'],
  ['天数', '月'],
  ['第几天', '第几个月'],
  ['十七天', '这两年'],
  ['17 天', '两年'],
];

// ── 审计：搬完不能残留的同级生2 内容 ──
const 禁用 = [
  'nanpa2', 'euphoria', '底座_nanpa2', '八十八町', '八十八学园', '如月町', '温泉乡', '保育园',
  '鸣泽', '水野', '筱原', '南川', '加藤', '舞岛', '杉本', '都筑', '野野村', '安田', '田中美沙',
  '片桐', '永岛', '川尻', '长冈', '西御寺', '天道', '自己来',
];

const 已同步 = [], 未同步 = [];
for (const rel of 同步表) {
  const s = path.join(SRC, rel);
  if (!fs.existsSync(s)) { 未同步.push([rel, '源文件不存在']); continue; }
  let t = fs.readFileSync(s, 'utf8');
  for (const [a, b] of 替换) t = t.split(a).join(b);
  const 命中 = 禁用.filter((w) => t.includes(w));
  if (命中.length) { 未同步.push([rel, '仍含：' + 命中.join('/')]); continue; }
  const d = path.join(DST, rel);
  if (!dry) {
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.writeFileSync(d, t);
  }
  已同步.push(rel + '  ' + Buffer.byteLength(t, 'utf8') + ' 字节');
}

console.log((dry ? '【预演】' : '') + '同步 ' + 已同步.length + ' 个文件：');
已同步.forEach((x) => console.log('  ✅ ' + x));
if (未同步.length) {
  console.log('\n未同步 ' + 未同步.length + ' 个（要人工处理）：');
  未同步.forEach(([r, w]) => console.log('  ⚠️ ' + r + '\n        ' + w));
}
console.log('\n注意：同步完要重跑 check-rules / check-contracts / 预算校验，然后重新注册（新增条目）与 pack。');
