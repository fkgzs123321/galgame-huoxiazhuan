// 修三处真问题
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

/* ① 删掉 交互循环 里的旧版「第二段」（和新版并存） */
{
  const p = path.join(D, '世界书/世界观/引擎/交互循环.yaml');
  const o = YAML.parse(fs.readFileSync(p, 'utf8'));
  const s = o['这一层怎么写（叙事结构）'];
  if (s['第二段 · 接着写「你的反应是哪一种」']) {
    delete s['第二段 · 接着写「你的反应是哪一种」'];
    console.log('✅ ① 删掉旧版「第二段 · 你的反应是哪一种」（与新版并存）');
  } else console.log('   ① 旧版已不在');
  // 顺手把「先纠正」那条挪到最前（顺序 = 阅读顺序）
  const 键 = Object.keys(s);
  const 纠正 = 键.find(k => /先纠正/.test(k));
  if (纠正 && 键[0] !== 纠正) {
    const 新s = { [纠正]: s[纠正] };
    for (const k of 键) if (k !== 纠正) 新s[k] = s[k];
    o['这一层怎么写（叙事结构）'] = 新s;
    console.log('   顺带：把「先纠正」挪到第一段之前');
  }
  fs.writeFileSync(p, YAML.stringify(o, { lineWidth: 0 }));
  console.log('   现在的段落顺序: ' + Object.keys(o['这一层怎么写（叙事结构）']).join(' → '));
}

/* ② 八十八町：时段进度 → 时段（那个键不存在） */
{
  const p = path.join(D, '世界书/世界观/底座_nanpa2/八十八町.yaml');
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes('时间.时段进度')) {
    t = t.split('时间.时段进度').join('时间.时段');
    fs.writeFileSync(p, t);
    console.log('✅ ② 八十八町：「时间.时段进度」→「时间.时段」（后者不存在）');
  } else console.log('   ② 已无该键');
}

/* ③ 剧情推进：补「满」是多少 */
{
  const p = path.join(D, '世界书/世界观/引擎/剧情推进.yaml');
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes('游戏进度上涨，满则进入下一天')) {
    t = t.replace('游戏进度上涨，满则进入下一天',
      '游戏进度上涨（每层 +6~10，按这一层做成的事给），涨到 **100** 就进入下一天（世界.游戏进度 范围 0~100）');
    fs.writeFileSync(p, t);
    console.log('✅ ③ 剧情推进：补了「满 = 100」和每层涨幅');
  } else console.log('   ③ 已改');
}

/* 规划留痕 */
{
  const P = path.join(D, '创作规划.yaml');
  const o = YAML.parse(fs.readFileSync(P, 'utf8'));
  o['变更记录'] = o['变更记录'] || [];
  o['变更记录'].push({
    日期: '2026-09-16',
    内容: [
      '专项体检（有来无回/没公式/没落脚点/没闭环）后修三处：',
      '① 删掉 交互循环 里旧版「第二段 · 你的反应是哪一种」（与新版并存，会让 AI 收到两版指令）',
      '② 八十八町：「时间.时段进度」→「时间.时段」（前者不存在）',
      '③ 剧情推进：补「满 = 100」与每层 +6~10',
    ],
  });
  fs.writeFileSync(P, YAML.stringify(o, { lineWidth: 0 }));
}
console.log('\n✅ 规划已留痕');
