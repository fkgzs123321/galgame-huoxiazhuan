// 文风条目按 skills 最新三层结构重整：
//   用词层（总是加载）  : 文风_脏词标准（已启用）
//   素材层（总是加载）  : 文风_母猪_词库 / 文风_重口
//   文风层（本卡固定用）: 文风_骚妈（无尽骚妈）/ 文风_母猪_铁律 / 文风_母猪_实样
// 旧的 母猪轻/中/重 / 白洁 保持关闭（被新体系取代，文件留着以备别的卡用）
const fs = require('fs');
const P = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/tavern-cards-state.json';
const S = JSON.parse(fs.readFileSync(P, 'utf8'));
const 准则 = S.entryManifest['扮演准则'];

const 注册 = (名, 文件, order, abstract) => {
  准则[名] = {
    path: '世界书/扮演准则/' + 文件,
    scope: 'specific',
    keywords: [],
    abstract: abstract,
    enabled: true,
    strategy: { type: 'constant' },
    position: { type: 'before_character_definition', order: order },
  };
  console.log(`✓ ${名}  order=${order}  ← ${文件}`);
};

// ① 无尽骚妈（内容已替换为 skills 最新版）→ 启用
if (准则['文风_骚妈']) { 准则['文风_骚妈'].enabled = true; 准则['文风_骚妈'].abstract = '文风：无尽骚妈（4 手法 + 20 实样）'; console.log('✓ 文风_骚妈  order=24  （启用）'); }

// ② 母猪三件：铁律（三级表+13铁律+LL+四阶段+句式+负面）／实样（15 场景）／词库（器官同义词·体型·拟声）
注册('文风_母猪_铁律', '文风_母猪_铁律.yaml', 25, '文风：母猪·铁律（三级表 + 13 铁律 + LL 两档 + 四阶段循环）');
注册('文风_母猪_实样', '文风_母猪_实样.yaml', 26, '文风：母猪·实样（15 个场景：一级×3 二级×3 三级×9）');
注册('文风_母猪_词库', '文风_母猪_词库.yaml', 27, '文风：素材（器官同义词库 / 体型词表 / 拟声词库）');
注册('文风_重口', '文风_重口.yaml', 28, '文风：重口素材（脏话麻花 + 变态场景，严禁照抄）');

// ③ 旧条目保持关闭
for (const k of ['文风_母猪轻', '文风_母猪中', '文风_母猪重', '文风_白洁']) {
  if (准则[k]) { 准则[k].enabled = false; console.log(`· ${k} 保持关闭（被新体系取代）`); }
}

fs.writeFileSync(P, JSON.stringify(S, null, 2), 'utf8');
console.log('\n扮演准则组条目数 =', Object.keys(准则).length);
console.log('启用的文风类条目：');
for (const k of Object.keys(准则)) if (/文风|脏词/.test(k) && 准则[k].enabled) console.log('  ' + k + '  order=' + 准则[k].position.order);
