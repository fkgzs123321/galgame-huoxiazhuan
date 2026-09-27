// ════════════════════════════════════════════════════════════
// register-all.cjs · 一次性注册全部条目（引擎层 + 底座层）
//
// ★ 血泪教训（本文件因此而生）：
//   RFC 6902 的 `add` 打在**已存在的路径**上不是"追加"，是"替换"。
//   所以容器（世界观/地理/角色/…）**必须先检查再创建**，
//   否则第二次跑就会把上一批条目整块冲掉。
//
// 门控规则：
//   引擎层（世界观/引擎、扮演准则、阶段指导、屏幕外的她）→ 用 path，不加门控
//   底座层（底座_yingxiong 的世界观/地理/角色）        → 用 contents = [门控, file]
//
// 用法: node scripts/register-all.cjs
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const WB = path.join(D, '世界书');
const STATE = path.join(D, 'tavern-cards-state.json');
const 门控 = "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'yingxiong'";

const S0 = JSON.parse(fs.readFileSync(STATE, 'utf8'));
const 清单 = JSON.parse(fs.readFileSync(path.join(D, 'scripts', 'gen-base-manifest.json'), 'utf8'));
const 角色清单 = JSON.parse(fs.readFileSync(path.join(D, 'scripts', 'gen-char-manifest.json'), 'utf8'));

const patch = [];
// ── 容器：只在缺失时创建 ──
for (const t of ['世界观', '扮演准则', '时间线', '地理', '角色', 'NPC', '阶段指导', '事件', 'MVU']) {
  if (!S0.entryManifest[t]) patch.push({ op: 'add', path: `/entryManifest/${t}`, value: {} });
}

// ── 引擎层（不加门控）──
const 引擎世界观 = ['四态循环', '反抗与判定', '兴奋度机制', '出招', '交互循环', '剧情推进', '边界情况', '离线行动'];
const 引擎准则 = ['加载纪律', '判定引擎', '思维链', '叙述准则', '感知禁令', '玩家的输入', '叙述底线', '文风_骚妈', '文风_母猪中', '文风_母猪轻', '文风_母猪重', '文风_白洁'];
const 引擎阶段 = ['阶段指导', '熟练度阶段'];
const 屏幕外的她 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '郁灼'];

引擎世界观.forEach((名, i) => patch.push(加(`世界书/世界观/引擎/${名}.yaml`, `/entryManifest/世界观/${名}`, 'constant', null, 10 + i, '世界观：' + 名)));
// 3 套备用文风默认关闭（同级生2 也是全关，手动开）。它们备在卡里，不进上下文，不占 token
const 备用文风 = ['文风_母猪轻', '文风_母猪重', '文风_白洁'];
引擎准则.forEach((名, i) => {
  const e = 加(`世界书/扮演准则/${名}.yaml`, `/entryManifest/扮演准则/${名}`, 'constant', null, 30 + i, '扮演准则：' + 名);
  e.value.enabled = !备用文风.includes(名);
  patch.push(e);
});
引擎阶段.forEach((名, i) => patch.push(加(`世界书/阶段指导/${名}.yaml`, `/entryManifest/阶段指导/${名}`, 'constant', null, 60 + i, '阶段指导：' + 名, 'at_depth')));
屏幕外的她.forEach((名, i) => patch.push({
  op: 'add', path: `/entryManifest/角色/她_${名}`,
  value: {
    path: `世界书/角色/屏幕外的她/${名}.yaml`, part: 'other', scope: 'specific',
    keywords: ['她', 名], abstract: `角色/other：她_${名}`, enabled: true,
    strategy: { type: 'selective', keys: ['她', 名] },
    position: { type: 'after_character_definition', order: 90 + i },
  },
}));

// ── 底座层（门控 + 关键词）──
const 底座 = (file, 键路径, part, kws, order, 常驻) => ({
  op: 'add', path: 键路径,
  value: {
    contents: [{ content: 门控 }, { file }],
    ...(part ? { part } : {}),
    scope: 'specific',
    keywords: kws,
    abstract: (part ? `角色/${part}：` : '') ,
    enabled: true,
    strategy: 常驻 ? { type: 'constant' } : { type: 'selective', keys: kws },
    position: part === 'other' || part === 'basic' || part === 'personality'
      ? { type: 'after_character_definition', order }
      : { type: 'before_character_definition', order },
  },
});

Object.entries(清单.世界观).forEach(([名, v], i) => {
  const e = 底座(v.path, `/entryManifest/世界观/${名}`, null, [], 200 + i, true);
  e.value.abstract = '世界观：' + 名;
  patch.push(e);
});
Object.entries(清单.地理).forEach(([名, v], i) => {
  const e = 底座(v.path, `/entryManifest/地理/${名}`, 'region', v.keywords || [名], 300 + i, false);
  e.value.abstract = '地理/region：' + 名;
  patch.push(e);
});

// 角色速览（索引：常驻且不参与同 part 计数）
patch.push({
  op: 'add', path: '/entryManifest/角色/角色速览',
  value: {
    contents: [{ content: 门控 }, { file: '世界书/角色/速览.yaml' }],
    part: 'other', scope: 'catalog', keywords: [], abstract: '角色/other：角色速览',
    enabled: true, strategy: { type: 'constant' },
    position: { type: 'after_character_definition', order: 100 },
  },
});

// 女角 35 位
const 文件名 = { basic: '基础信息.yaml', personality: '性格调色盘.yaml', other: 'NSFW反差与剧情线.yaml' };
const PART名 = { basic: '基础信息', personality: '性格调色盘', other: 'NSFW反差与剧情线' };
let n = 0;
for (const [名, v] of Object.entries(角色清单)) {
  for (const part of ['basic', 'personality', 'other']) {
    if (!fs.existsSync(path.join(v.dir, 文件名[part]))) continue;
    n++;
    const 键 = `${名}_${PART名[part]}`;
    const e = 底座(`世界书/角色/底座_yingxiong/${名}/${文件名[part]}`, `/entryManifest/角色/${键}`, part, v.keywords, 110 + n, false);
    e.value.abstract = `角色/${part}：${键}`;
    patch.push(e);
  }
}

// ── MVU 四条（如果还没注册）──
if (!S0.entryManifest.MVU || !Object.keys(S0.entryManifest.MVU).length) {
  const MVU = {
    '[InitVar]请勿打开': { path: '世界书/变量/initvar.yaml', part: 'initvar' },
    变量列表: { path: '世界书/变量/变量列表.yaml', part: 'variable_list' },
    变量更新规则: { path: '世界书/变量/变量更新规则.yaml', part: 'update_rules' },
    变量输出格式: { path: '世界书/变量/变量输出格式.txt', part: 'output_format' },
  };
  for (const [k, v] of Object.entries(MVU)) {
    patch.push({
      op: 'add', path: `/entryManifest/MVU/${k}`,
      value: {
        path: v.path, scope: 'specific', part: v.part, keywords: [],
        abstract: `MVU/${v.part}：${k}`, enabled: v.part !== 'initvar',
        ...(v.part !== 'initvar' ? { strategy: { type: 'constant' } } : {}),
        position: { type: 'at_depth', role: 'system', depth: 0, order: 160 + Object.keys(MVU).indexOf(k) },
      },
    });
  }
}

function 加(file, 键, 类型, part, order, abstract, 位置) {
  return {
    op: 'add', path: 键,
    value: {
      path: file, ...(part ? { part } : {}), scope: 'specific', keywords: [],
      abstract, enabled: true,
      strategy: { type: 类型 },
      position: 位置 === 'at_depth'
        ? { type: 'at_depth', role: 'system', depth: 0, order }
        : { type: 'before_character_definition', order },
    },
  };
}

fs.writeFileSync(path.join(D, 'scripts', 'patch-all.json'), JSON.stringify(patch, null, 1));
console.log(`patch 共 ${patch.length} 条（其中女角 ${n}）`);

const FORGE = path.join(ROOT, '_tc_repo', 'tavern-cards', 'scripts', 'tavern-cards-forge.mjs');
console.log(execFileSync('node', [FORGE, 'patch', '旮旯给木-英雄坛说', '--file', path.join(D, 'scripts', 'patch-all.json')], { encoding: 'utf8' }).trim());

const S = JSON.parse(fs.readFileSync(STATE, 'utf8'));
let tot = 0;
console.log('\n注册结果：');
for (const [t, es] of Object.entries(S.entryManifest)) {
  const c = Object.keys(es).length; tot += c;
  console.log('  ' + t.padEnd(8) + String(c).padStart(4) + ' 条');
}
console.log('  ' + '-'.repeat(14));
console.log('  合计    ' + String(tot).padStart(4) + ' 条');
