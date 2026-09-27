// ════════════════════════════════════════════════════════════
// register-base.cjs · 把生成出来的条目注册进 entryManifest
//
// 三条门控铁律之一：**底座条目必含 世界.底座 判定**
//   → 所以底座条目不用 path，改用 contents = [门控片段, file 片段]
//   （一个条目只能有一个装饰器，门控写在 contents[0] 里）
//
// order 只是初值，最终会被 configure 的 tens-group 重排。
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const WB = path.join(D, '世界书');
const 门控 = "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'yingxiong'";

const 清单 = JSON.parse(fs.readFileSync(path.join(D, 'scripts', 'gen-base-manifest.json'), 'utf8'));
const 昵称表 = 清单.角色;

// ── ① 角色速览（索引条目，scope: catalog 不参与同 part 计数）──
const 分组 = { 玉女峰: [], 平安镇: [], 大雪山: [], 商家堡: [], 五指山: [], 武当山: [] };
for (const [名, v] of Object.entries(昵称表)) {
  const 位 = fs.readFileSync(path.join(v.dir, '基础信息.yaml'), 'utf8');
  const 所在 = (位.match(/所在: "?([^"\n]+)"?/) || [])[1] || '';
  const 组 = Object.keys(分组).find((g) => 所在.indexOf(g) >= 0) || '平安镇';
  分组[组].push(名);
}
const 速览 = {
  角色速览: {
    一句话: '这块大陆上三十五位有名字的女性。她按门派与街面分堆，走哪条路决定你会遇见谁。',
    玉女峰花间派: 分组.玉女峰,
    平安镇: 分组.平安镇,
    大雪山雪山派: 分组.大雪山,
    商家堡八卦门: 分组.商家堡,
    五指山红莲教: 分组.五指山,
    武当山: 分组.武当山,
    怎么推进: '与她说话，她会给你一件事。做成了好感涨，做不成好感掉。好感满一百才能谈婚嫁，而她等不了两年',
    从她身上学功夫: '关系到了一见如故她教入门功法，亲密教门派功法中段，热情如火教独门绝招。花间武学男性只有这一条路',
  },
};
fs.writeFileSync(path.join(WB, '角色', '速览.yaml'), YAML.stringify(速览, { lineWidth: 0, defaultStringType: 'QUOTE_DOUBLE' }));

// ── ② 组装 patch ──
const patch = [];
// 类型容器要先建（RFC 6902 的 add 只能在已存在的父路径下增子节点）
for (const t of ['世界观', '地理', '角色']) {
  patch.push({ op: 'add', path: `/entryManifest/${t}`, value: {} });
}
const 基 = (p) => ({ op: 'add', path: p });

// 世界观（无 part，常驻）
Object.entries(清单.世界观).forEach(([名, v], i) => {
  patch.push(基(`/entryManifest/世界观/${名}`).value === undefined
    ? { op: 'add', path: `/entryManifest/世界观/${名}`, value: {
        contents: [{ content: 门控 }, { file: v.path }],
        scope: 'specific',
        keywords: [],
        abstract: '世界观：' + 名,
        enabled: true,
        strategy: { type: 'constant' },
        position: { type: 'before_character_definition', order: 200 + i },
      } }
    : null);
});

// 地理（part: region，关键词触发）
Object.entries(清单.地理).forEach(([名, v], i) => {
  patch.push({
    op: 'add',
    path: `/entryManifest/地理/${名}`,
    value: {
      contents: [{ content: 门控 }, { file: v.path }],
      part: 'region',
      scope: 'specific',
      keywords: v.keywords || [名],
      abstract: '地理/region：' + 名,
      enabled: true,
      strategy: { type: 'selective', keys: v.keywords || [名] },
      position: { type: 'before_character_definition', order: 300 + i },
    },
  });
});

// 角色速览（索引，always constant）
patch.push({
  op: 'add',
  path: '/entryManifest/角色/角色速览',
  value: {
    contents: [{ content: 门控 }, { file: '世界书/角色/速览.yaml' }],
    part: 'other',
    scope: 'catalog',
    keywords: [],
    abstract: '角色/other：角色速览',
    enabled: true,
    strategy: { type: 'constant' },
    position: { type: 'after_character_definition', order: 100 },
  },
});

// 女角 35 位 × (3 或 4) part
const 文件名 = { basic: '基础信息.yaml', personality: '性格调色盘.yaml', tri_faceted: '三面性.yaml', other: 'NSFW反差与剧情线.yaml' };
const PART名 = { basic: '基础信息', personality: '性格调色盘', tri_faceted: '三面性', other: 'NSFW反差与剧情线' };
const 厚度 = { basic: 5, personality: 2, tri_faceted: 2, other: 2 };
let n = 0;
for (const [名, v] of Object.entries(昵称表)) {
  for (const part of ['basic', 'personality', 'tri_faceted', 'other']) {
    const f = path.join(v.dir, 文件名[part]);
    if (!fs.existsSync(f)) continue;
    const 键 = `${名}_${PART名[part]}`;
    n++;
    patch.push({
      op: 'add',
      path: `/entryManifest/角色/${键}`,
      value: {
        contents: [{ content: 门控 }, { file: `世界书/角色/底座_yingxiong/${名}/${文件名[part]}` }],
        part,
        scope: 'specific',
        keywords: v.keywords,
        abstract: `角色/${part}：${键}`,
        enabled: true,
        strategy: { type: 'selective', keys: v.keywords },
        position: { type: 'after_character_definition', order: 110 + n },
      },
    });
  }
}

fs.writeFileSync(path.join(D, 'scripts', 'patch-base.json'), JSON.stringify(patch, null, 1));
console.log('速览已写 → 世界书/角色/速览.yaml');
console.log(`patch 组装完毕：世界观 ${Object.keys(清单.世界观).length} / 地理 ${Object.keys(清单.地理).length} / 角色速览 1 / 女角 ${n} = ${patch.length} 条`);

// ── ③ 应用 ──
const FORGE = path.join(ROOT, '_tc_repo', 'tavern-cards', 'scripts', 'tavern-cards-forge.mjs');
const out = execFileSync('node', [FORGE, 'patch', '旮旯给木-英雄坛说', '--file', path.join(D, 'scripts', 'patch-base.json')], { encoding: 'utf8' });
console.log(out.trim());
