// gen-var-paths.cjs · 把「路径写法」并进 变量列表.yaml 的末尾
//
// ★ 为什么不单开一个条目（2026-09-17 的教训）：
//   1. 单开会占 MVU 常驻预算，而它和「变量列表」内容重叠（都在列字段名）
//   2. 同级生的做法是单开 `[mvu_update]本卡变量路径`，但那**照样算常驻**（前缀只是命名）
//   → 所以并进变量列表：一个条目干两件事，不重复列字段。
//
// ★ 并进来的东西只有三样是变量列表里没有的：
//   ① 「一批里只要有一条路径不存在，整批作废」这条硬规矩
//   ② 动态表（技能.门派 / 关系 / 背包）不要写死键名
//   ③ 照抄样例
//   ★ 字段清单不再重列 —— 上面已经有了。
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const 根 = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-英雄坛说';
const p = path.join(根, '世界书/变量/变量列表.yaml');
let 文 = fs.readFileSync(p, 'utf8');

// 先撤掉上一次单开的那份（若在）
const 单开 = path.join(根, '世界书/变量/本卡变量路径.yaml');
if (fs.existsSync(单开)) { fs.unlinkSync(单开); console.log('   已移除单独的本卡变量路径.yaml'); }

// 撤掉 state 里的注册
const sp = path.join(根, 'tavern-cards-state.json');
const st = JSON.parse(fs.readFileSync(sp, 'utf8'));
if (st.entryManifest.MVU && st.entryManifest.MVU['[mvu_update]本卡变量路径']) {
  delete st.entryManifest.MVU['[mvu_update]本卡变量路径'];
  fs.writeFileSync(sp, JSON.stringify(st, null, 2));
  console.log('   已撤掉 state 里的注册');
}

// 已并过就不重复并
if (文.includes('路径怎么写')) { console.log('✅ 变量列表里已有「路径怎么写」，跳过'); process.exit(0); }

const 块 = [
  '',
  '# ────────────────────────────────────────────────',
  '# 路径怎么写（★ 只在更新变量时用得到，但 MVU 是原子更新，写错一条会拖垮整批）',
  '# ────────────────────────────────────────────────',
  '路径怎么写:',
  '  硬规矩: |',
  '    ① 路径不带 stat_data 前缀，直接以 / 开头',
  '    ② ★★ 一批里只要有一条路径不存在，**整批作废**（JSON Patch 是原子的）。',
  '       所以写之前逐条核对；宁可少写一条，不要写错一条。',
  '    ③ 值一律写实际内容，不要写占位符',
  '    ④ 数值先算再加：old (X) + delta (Y) = new (Z)',
  '    ⑤ 枚举型的值只能填上面列的那几种（如 主角.状态 只有 在线/暂停/离线/冻结）。',
  '       填别的不会报错，但会被落回默认值 —— 等于白写。',
  '  动态表不要写死键名: |',
  '    技能.门派 / 技能.逍遥 —— 键 = 武功名，写 /技能/门派/太极拳',
  '    关系 —— 键 = 女角名，写 /关系/李青照/好感度',
  '    背包 —— 是数组不是对象，整表替换',
  '  照抄这几条（把值换成你的）: |',
  '    {"op":"replace","path":"/局面/当前选项","value":{"1":{"文本":"…","等级":"微","感觉":"…"},"2":{…},"3":{…},"4":{…}}}',
  '    {"op":"replace","path":"/局面/她的倾向","value":"3"}',
  '    {"op":"replace","path":"/她/反抗值","value":92}',
  '    {"op":"replace","path":"/主角/状态","value":"在线"}',
  '    {"op":"replace","path":"/场景/当前地点","value":"武当山"}',
  '    {"op":"replace","path":"/时间/岁数","value":15}',
  '    {"op":"replace","path":"/资源/潜能","value":420}',
  '',
].join('\n');

fs.writeFileSync(p, 文.replace(/\s*$/, '') + '\n' + 块);
console.log('✅ 「路径怎么写」已并进 变量列表.yaml');
console.log('   变量列表现在 ' + fs.statSync(p).size + ' 字节');
