// 契约：加「技能强化」参数（装备强化已有）
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/底座_yingxiong/物品与品质表.yaml';
let t = fs.readFileSync(p, 'utf8');

const 技能强化 = `
# ── 装备强化（已有，补说明）──
强化说明: '★ 装备强化：拿材料往一件装备上叠层。层数越高加成越大，但每层更贵。上限 10 层。'

# ── 技能强化（★ 新增，与装备强化同一个形状）──
技能强化:
  上限: 10
  每层效果: 0.05
  每层材料: { 灵石: 2, 铁: 1 }
  递增: '第 N 层要 灵石 × 2 × N'
  说明: '★ 技能强化与装备强化是同一个形状（拿材料叠层、层数封顶、每层递增），
    只是作用对象不同：一个加「这门功夫判定时的强度」，一个加「这件装备的加成」。
    —— 这也是「强化」该在引擎层而不是分别写两套的原因。'
  作用: '每层给该技能的判定强度 +5%（在 判定引擎 的 P 值上乘算）'

# ── 强化材料从哪来 ──
强化材料来源:
  铁: '买得到，镇上铁匠'
  灵石: '打坛主、门派门人的掉落；黑森林深处捡'
`;

if (!t.includes('技能强化:')) {
  t = t.replace(/^强化:/m, 技能强化 + '\n强化:');
  fs.writeFileSync(p, t);
  console.log('✅ 契约加了「技能强化」');
} else console.log('（已有 技能强化，跳过）');

// 变量：加 强化 存储
const ip = 'src/旮旯给木-英雄坛说/世界书/变量/initvar.yaml';
let iv = fs.readFileSync(ip, 'utf8');
if (!/^强化:/m.test(iv)) {
  iv = iv.replace(/^背包: \[\]$/m, '背包: []\n\n# ── 强化层数（E8 的持有表：装备与技能各一份）──\n强化:\n  装备: {}\n  技能: {}');
  fs.writeFileSync(ip, iv);
  console.log('✅ initvar 加了「强化」变量');
} else console.log('（已有 强化 变量，跳过）');

const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const o = YAML.parse(fs.readFileSync(p, 'utf8'));
console.log('   契约顶层键: ' + Object.keys(o).join(' / '));
