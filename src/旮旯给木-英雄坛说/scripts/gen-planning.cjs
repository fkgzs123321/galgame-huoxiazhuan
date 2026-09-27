// 生成 创作规划.yaml —— ★ 它是「总表 / 索引」，不是「第二份事实来源」
//
// skill（tavern-cards）把 创作规划.yaml 定为「项目级事实来源」，
// 但本卡的事实来源分成了两层：
//   机制层（引擎模板/）   —— 跨底座共用
//   底座层（底座_yingxiong/ 22 份契约）—— 本卡专有，**更细**
// 所以这份规划只做三件事：
//   ① 项目属性（给工具读）
//   ② 世界与角色的**索引**（谁在哪、有哪些条目）
//   ③ 指向契约（不复制内容）
// ★ 铁律「一项目一事实来源」：条目内容改契约，不改进这份。
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const 根 = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-英雄坛说';
const state = JSON.parse(fs.readFileSync(path.join(根, 'tavern-cards-state.json'), 'utf8'));
const 读 = (p) => { try { return YAML.parse(fs.readFileSync(path.join(根, p), 'utf8')) || {}; } catch (e) { return {}; } };

const 地理源 = 读('底座_yingxiong/地理源.yaml');
const 门派表 = 读('底座_yingxiong/门派表.yaml');
const 派表 = 门派表.门派 || 门派表;
const 战力映射 = 读('底座_yingxiong/战力映射.yaml');

// 女角清单（从目录扫）
const 女D = path.join(根, '世界书/角色/底座_yingxiong');
const 女角 = [];
if (fs.existsSync(女D)) for (const d of fs.readdirSync(女D)) {
  const p = path.join(女D, d, '基础信息.yaml');
  if (!fs.existsSync(p)) continue;
  const o = YAML.parse(fs.readFileSync(p, 'utf8')) || {};
  const b = o.基础信息 || o.基本信息 || {};
  const 盘 = YAML.parse(fs.readFileSync(path.join(女D, d, '性格调色盘.yaml'), 'utf8')) || {};
  const k = 盘.性格调色盘 || {};
  女角.push({
    名: d,
    身份: b.身份 || '',
    所在: b.所在 || '',
    底色: k.底色 || '',
    主色调: k.主色调 || '',
    点缀: k.点缀 || '',
  });
}

// 她（八套）
const 她D = path.join(根, '世界书/角色/屏幕外的她');
const 她 = [];
if (fs.existsSync(她D)) for (const f of fs.readdirSync(她D)) {
  if (f.endsWith('.yaml')) 她.push(f.replace('.yaml', ''));
}

// 条目清单（从世界书扫）
const 条目 = {};
function 走(d, 前) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) 走(p, 前 + '/' + e.name);
    else if (e.name.endsWith('.yaml')) {
      const t = 前.replace(/^世界书\/?/, '') || '根';
      (条目[t] = 条目[t] || []).push(e.name.replace('.yaml', ''));
    }
  }
}
走(path.join(根, '世界书'), '');

const 规划 = {
  project: {
    name: state.projectName,
    worldbookName: state.worldbookName,
    form: state.form || 'charactercard',
    mvu: !!state.mvu,
    ui_mode: 'text',
    底座: 'yingxiong',
    机制层: '引擎模板/（跨底座共用，不随本卡变）',
  },

  事实来源: {
    说明: '★ 本卡的事实来源分两层。这份规划是**索引**，不是内容源。',
    机制层: '引擎模板/ —— E0-E6 引擎能力 + T1-T4 契约表 + 校验器',
    底座层: '底座_yingxiong/ 22 份契约 —— 本卡专有，条目内容以它们为准',
    设计稿: '设计规划.md —— 决策记录与理由（不在 prompt 里）',
    铁律: '改条目内容 → 改契约；不要改这份规划。',
  },

  world: {
    overview: '时空扭曲把不同年代的人塞进了同一片大陆。这里没有年号，也没有人能考证自己的来处。',
    时间模型: '年龄主轴 + 两年倒计时（一年长一岁，两年之内得挑）',
    regions: Object.entries(地理源).filter(([k]) => k !== '随机地图').map(([名, v]) => ({
      name: 名,
      scenes: String(v.范围 || '').split(' / ').filter(Boolean),
      description: String(v.概览 || ''),
    })),
    factions: Object.values(派表).filter(p => p && p.名).map(p => ({
      name: p.名,
      description: `${p.特色 || ''}。入门：${p.入门条件 || '无'}`,
      territory: p.所在地 || '',
      key_members: [].concat(p.师承 || []).map(s => s.名).filter(Boolean),
    })),
    旁支: Object.keys(门派表.旁支 || {}),
    战力档: (战力映射.NPC作息 ? '见 底座_yingxiong/战力映射.yaml' : '见 底座_yingxiong/战力映射.yaml'),
  },

  characters: {
    说明: '★ 只有一位角色卡级的本体：「屏幕外的她」。35 位女角与 89 位 NPC 都是底座里的世界人物，不是角色卡角色',
    屏幕外的她: {
      是什么: '同一个玩家，八套不同的玩法',
      八套: 她,
      在哪: '世界书/角色/屏幕外的她/*.yaml',
      怎么分: '同 group 的 use_priority，同一时刻只注一套',
    },
    女角: 女角,
    女角在哪: '世界书/角色/底座_yingxiong/<名>/（基础信息 / 性格调色盘 / NSFW反差与剧情线）',
    NPC在哪: '世界书/NPC/<名>.yaml（89 份；作息见 底座_yingxiong/NPC作息.yaml）',
  },

  entries: {
    说明: '★ 本卡的条目清单（253 条）。完整注册表在 tavern-cards-state.json 的 entryManifest',
    分组: 条目,
    投放策略: {
      大名单: 'scope: catalog → 始终 constant 且不参与计数',
      常驻内容: '必须 EJS 精控（漏控时量会翻十倍）',
      按需内容: 'selective + 关键词就够',
      兜底: '关键词必须含 ≥2 汉字的昵称',
    },
  },

  engine_contracts: {
    说明: '★ 这些是「强制底座填」的契约表。数值契约 AI 只需结果，不进 prompt',
    清单: fs.readdirSync(path.join(根, '底座_yingxiong')).filter(f => f.endsWith('.yaml')),
    在哪: '底座_yingxiong/',
  },

  mvu: {
    变量块: 20,
    schema: 'schema.ts（Zod 校验）',
    initvar: '世界书/变量/initvar.yaml',
    更新规则: '世界书/变量/变量更新规则.yaml',
    变量列表: '世界书/变量/变量列表.yaml（给 AI 认字段；面板显示位置另见 底座_yingxiong/变量可见表.yaml）',
    输出格式: '世界书/变量/变量更新格式.yaml',
    自检: 'scripts/check-ejs-paths.cjs（引用路径与分支取值）',
  },

  ejs: {
    条目总数: 253,
    声明式: '219 条（@@if / @@generate_before / @@private —— 走 ST 原生，不跑引擎）',
    可执行: '3 条（阶段指导 15 块 / 熟练度阶段 8 块 / 判定引擎 2 块）',
    写法约束: '只用 getvar + if/else，不要循环、递归、异步',
    自检: 'scripts/check-ejs-paths.cjs',
  },

  first_messages: state.first_messages,

  自检关: {
    说明: '★ 四道关缺一不可。前三道进 CI 式的例行检查，第四道人工',
    '①': 'test-*.cjs —— 引擎断言（判定 / 战斗 / 强化 / 成长）',
    '②': 'check-ejs-paths.cjs —— EJS 引用路径与分支取值（抓「安静走默认值」）',
    '③': 'check-pages.cjs —— 逐页真渲染（抓「整页白」）',
    '④': '截图人眼 —— 抓「对但难看」',
    '另': 'check-rules.mjs（按 skills 的 rules-check.md 九大类）/ check-contracts.mjs / audit-engine-isolation.mjs / verify-prompt-budget.mjs',
  },
};

fs.writeFileSync(path.join(根, '创作规划.yaml'), YAML.stringify(规划));
console.log('✅ 创作规划.yaml 已生成');
console.log('   地区 ' + 规划.world.regions.length + ' 处');
console.log('   门派 ' + 规划.world.factions.length + ' 个');
console.log('   女角 ' + 女角.length + ' 位 ｜ 她 ' + 她.length + ' 套');
console.log('   条目分组 ' + Object.keys(条目).length + ' 类');
console.log('   契约 ' + 规划.engine_contracts.清单.length + ' 份');
