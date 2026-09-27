// 批量展开地理条目
//   依据：地理源（范围/概览/可做/在场/注）+ 门派表（师承/特色/功法）+ 档案（身份/所在）
//   ★ 只做「展开」，不新增设定，氛围是表现层，由本文件的映射给出
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const 根 = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-英雄坛说';
const 读 = (p) => { try { return YAML.parse(fs.readFileSync(p, 'utf8')) || {}; } catch (e) { return {}; } };

const 地理源 = 读(path.join(根, '底座_yingxiong/地理源.yaml'));
const 门派表 = 读(path.join(根, '底座_yingxiong/门派表.yaml'));
const 派表 = 门派表.门派 || 门派表;
const 派列 = Object.values(派表).filter(x => x && typeof x === 'object' && x.名);
const 门派在哪 = {};
派列.forEach(p => { if (p.所在地) 门派在哪[String(p.所在地)] = p; });

// ── 读全部档案（★ 两种键名都认：NPC 用「基础信息」、女角用「基本信息」）──
const 档 = {};
function 收(o, 名) {
  const b = o.基础信息 || o.基本信息 || o;
  if (!b || typeof b !== 'object') return;
  const 真名 = b.姓名 || 名;
  档[真名] = { 身份: b.身份 || '', 所在: b.所在 || '' };
}
const npcD = path.join(根, '世界书/NPC');
if (fs.existsSync(npcD)) for (const f of fs.readdirSync(npcD)) {
  if (f.endsWith('.yaml')) 收(读(path.join(npcD, f)), f.replace('.yaml', ''));
}
const 女D = path.join(根, '世界书/角色/底座_yingxiong');
if (fs.existsSync(女D)) for (const d of fs.readdirSync(女D)) {
  const p = path.join(女D, d, '基础信息.yaml');
  if (fs.existsSync(p)) 收(读(p), d);
}

// ── 氛围（逐个手写，只写已有设定能支持的感觉）──
const 氛围 = {
  平安镇: { 看: '青石路、挑水的人、棚下切肉的案板。远处有山，山上有塔', 听: '说书人在茶棚里讲一百年前的事。街口有人喊价', 闻: '草味、肉味、烧饼的味道混在一起', 时令: '赶集的日子街上挤满人；下雨天青石路滑，摊子都收进棚里' },
  玉女峰: { 看: '满山的花，房子藏在花里。塔楼最高，花园在塔楼上面', 听: '风过花丛的声音。偶尔有琴', 闻: '花。太多花了，闻久了会晕', 时令: '春末花最盛；冬天花落光，山道反而好走' },
  大雪山: { 看: '长年积雪。山腰以上没路，只有踩出来的痕', 听: '风。除了风几乎没有别的声音', 闻: '雪和铁的味道，教场的兵器都冻着', 时令: '风停的日子难得；一过午就起风，那时候谁也看不见谁' },
  商家堡: { 看: '砖墙、货栈、账房。堡里人不多，东西不少', 听: '算盘声。一天到晚都有', 闻: '铜钱、陈年木料、灯油', 时令: '年底最忙，账房通宵亮灯；别的日子反而闲' },
  五指山: { 看: '五座石峰竖着。教坛在山道上，人按衣服颜色站', 听: '有人念经，念的是听不大懂的东西', 闻: '香、皮子、汗', 时令: '教里点名的日子，山道上排满了人；平时只有教众' },
  冰火岛: { 看: '一边热泉一边雪。渡口的船是平的，没有篷', 听: '水声。热泉那边的水声和雪那边的风声各占一半', 闻: '硫磺。船靠岸之前就闻到了', 时令: '冬天热泉那边雪少，路反而好走；夏天两边都难受' },
  黑森林: { 看: '越往里越不见天。树干粗，地上没什么草', 听: '没有鸟。走一段才有一声响动，不知道是什么', 闻: '潮湿、铁锈。第二间屋子那边有炉火气', 时令: '雨季后地上全是烂泥；雪天反而好走，但冷' },
  灵心观: { 看: '观门不大，前殿也小。后屋最里面有一间亮着灯', 听: '很静。香火声都没有', 闻: '香。味道很淡，淡到像不是烧给自己闻的', 时令: '逢七做法事，那天观里人多；平时只有那几个不婚娶的人' }
};

let 做 = 0;
for (const [名, v] of Object.entries(地理源)) {
  if (名 === '随机地图') continue;
  if (!v || typeof v !== 'object') continue;
  const 范 = String(v.范围 || '').split(' / ').map(s => s.trim()).filter(Boolean);
  const 可 = String(v.可做的事 || '').split(' / ').map(s => s.trim()).filter(Boolean);
  const 谁 = String(v.谁在这儿 || '').split(' / ').map(s => s.trim()).filter(Boolean);
  const 派 = 门派在哪[名];

  const L = [];
  L.push('范围: "' + (v.范围 || '') + '"');
  L.push('概览: "' + (v.概览 || '') + '"');
  L.push('');

  L.push('子地点:');
  for (const z of 范) {
    L.push('  ' + z + ': |');
    const 在 = 谁.filter(n => String((档[n] || {}).所在 || '').indexOf(z) >= 0);
    if (在.length) {
      L.push('    常在这儿：' + 在.map(n => n + '（' + String((档[n] || {}).身份 || '').slice(0, 14) + '）').join('；'));
    } else {
      L.push('    这一带没什么人。');
    }
  }

  if (派) {
    if (派.师承 && 派.师承.length) {
      L.push('');
      L.push('师承阶梯:');
      L.push("  说明: '★ " + 派.名 + "是分级的。上一级的师傅教完了，你才轮到找下一级，不能跳'");
      const 级名 = ['第一级', '第二级', '第三级', '第四级', '掌门'];
      [].concat(派.师承).forEach((s, i) => {
        L.push('  ' + (级名[i] || ('第' + (i + 1) + '级')) + ':');
        L.push('    师父: ' + String(s.名 || ''));
        L.push("    看什么: '" + String(s.条件 || '无').replace(/'/g, '') + "'");
      });
    }
    L.push('');
    L.push('门派: ' + 派.名);
    if (派.特色) L.push("  特色: '" + String(派.特色).replace(/'/g, '') + "'");
    if (派.入门条件) L.push("  入门: '" + String(派.入门条件).replace(/'/g, '') + "'");
    if (派.功法) L.push('  功法: ' + [].concat(派.功法).join(' / '));
  }

  L.push('');
  L.push('可做的事:');
  可.forEach(x => L.push("  - '" + x.replace(/'/g, '') + "'"));

  L.push('');
  L.push('谁在这儿:');
  谁.forEach(n => {
    const o = 档[n] || {};
    L.push('  - { 名: ' + n + ", 身份: '" + String(o.身份 || '').replace(/'/g, '').slice(0, 30) + "' }");
  });

  const 氛 = 氛围[名];
  if (氛) {
    L.push('');
    L.push('氛围:');
    L.push("  看: '" + 氛.看 + "'");
    L.push("  听: '" + 氛.听 + "'");
    L.push("  闻: '" + 氛.闻 + "'");
    L.push("  时令: '" + 氛.时令 + "'");
  }

  if (v.注) L.push('\n注: "' + String(v.注).replace(/"/g, '') + '"');

  const 词 = [名].concat(派 ? [派.名] : []).concat(范).concat(可);
  L.push('');
  L.push('关键词:');
  [...new Set(词)].filter(Boolean).forEach(w => L.push('  - "' + w + '"'));

  const 文 = L.join('\n') + '\n';
  fs.writeFileSync(path.join(根, '世界书/地理', 名 + '.yaml'), 文);
  console.log('  ✅ ' + 名.padEnd(6) + String(Math.round(Buffer.byteLength(文, 'utf8') / 1024)).padStart(2) + ' KB' + (派 ? '　' + 派.名 : ''));
  做++;
}
console.log('\n共展开 ' + 做 + ' 处');
