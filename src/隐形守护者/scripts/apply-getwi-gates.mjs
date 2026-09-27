#!/usr/bin/env node
/**
 * 对标 Lovelive偶像计划3.3 ejs版本/_unpacked：
 * - 蓝灯：EJS 控制器、MVU/ERA 变量规则、世界观/系统说明、角色「基础摘要卡」、核心玩法规则
 * - 灰灯：序章分拆/大章剧本、角色分阶段·调色盘（由 EJS getwi 按需注入）
 * - 勿开：InitVar、剧情注入路由、与基础卡重复的 NPC 绿灯条
 */
import fs from 'node:fs';
import path from 'node:path';
import { PERSONA_CATALOG } from './persona-catalog.mjs';
import { NPC_CATALOG } from './npc-catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'tavern-cards-state.json');

function listYamlStems(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace(/\.yaml$/, ''));
  } catch {
    return [];
  }
}

const CH2_EVENT_DISABLED = listYamlStems(path.join(ROOT, '世界书/事件/第二章'));

/** Lovelive 范本 ON：世界观、偶像系统、能力档案、ERA 规则、🩷 角色摘要、EJS 两控制器 */
const ALWAYS_ENABLED = new Set([
  'EJS预处理',
  'EJS变量定义片段',
  'EJS（规则）动态控制器',
  'EJS（剧情）动态控制器',
  'EJS（角色）动态控制器',
  // MVU ≈ ERA 变量操作规则 + 意图说明
  '变量列表',
  '变量与注入规划',
  '[mvu_update]变量更新规则',
  '[mvu_update]判定公式总表',
  '[mvu_update]变量输出格式（额外模型）',
  // 世界观 ≈ 世界观 + 偶像能力值全员档案 + 偶像系统
  '世界设定',
  '角色能力矩阵',
  '特工能力边界',
  '能力档位说明',
  '主线章节表',
  '结局谱系',
  '插件栈与分工',
  '条件模板说明',
  'SQL填表规则',
  // 玩法 ≈ 好感度规则 + 配角出场
  '扮演准则',
  '潜伏悬疑正文铁律',
  '防抉择剧透',
  '抉择呈现规范',
  '防谍战口胡',
  '死亡结局处理',
  // 角色基础卡 ≈ 🩷* 全员摘要（不用 NPC 短条重复）
  '肖途-基础信息',
  '肖途-三面性',
  '肖途-行为基调',
  '方敏-基础信息',
  '方汉洲-基础信息',
  // 本卡主持（范本无同名条，等价于常驻「世界反应」+ 阶段指导 EJS）
  '阶段指导',
]);

/** Lovelive 范本 OFF：*_阶段*、事件、制作人分支、（别开）* */
const PERSONA_DISABLED = [...Object.keys(PERSONA_CATALOG).map((n) => `${n}-Persona`), 'Persona全书索引'];
const NPC_DISABLED = [...Object.keys(NPC_CATALOG), 'NPC全书索引'];

const ALWAYS_DISABLED = new Set([
  ...PERSONA_DISABLED,
  ...NPC_DISABLED,
  '剧情注入路由',
  '[InitVar]请勿打开',
  '序章-潜伏归来',
  '序章-事件',
  '抉择校验表',
  '序章BE执行范例',
  '序章BE后禁止续玩',
  '序章写死机读表',
  '序章选项识别与一致性铁律',
  '序章非法节点熔断',
  '序章节点推进铁律',
  '序章抉择全书-写死表',
  '序章-1-方汉洲当面对质',
  '序章主持',
  '序章-2-方敏追问',
  '序章-3-去向选择',
  '序章-4-图书馆等待',
  '序章-5-秘密基地',
  '第一章-太阳之影',
  '第一章主持',
  '第一章抉择全书-写死表',
  '第一章写死机读表',
  '第一章选项识别与一致性铁律',
  '第一章节点推进铁律',
  '第一章BE执行范例',
  '第一章BE后禁止续玩',
  '第一章当前节点选项·常亮',
  '第一章-1-发布会举手',
  '第一章-10-方老师枪指',
  '第一章非法节点熔断',
  '第一章-2-战争看法',
  '第一章-3-领事质问',
  '第一章-4-潜伏名单',
  '第一章-5-陪纯子',
  '第一章-6-纯子问话',
  '第一章-7-遇见方敏',
  '第一章-8-三百元',
  '第一章-9-来过方家',
  '第一章-11-第一次',
  '第一章-12-学生放出来',
  '第一章-13-了解同学',
  '第一章-14-邀请抗日',
  '第一章-15-叛徒信',
  '第一章-0-章首',
  '第二章主持',
  '第二章抉择全书-写死表',
  '第二章写死机读表',
  '第二章选项识别与一致性铁律',
  '第二章节点推进铁律',
  '第二章BE执行范例',
  '第二章BE后禁止续玩',
  '第二章当前节点选项·常亮',
  '第二章非法节点熔断',
  '第二章-狩猎者',
  ...CH2_EVENT_DISABLED,
  '方敏-调色盘',
  '方敏-分阶段-数据库条件',
  '方汉洲-调色盘·序章',
  '庄晓曼-基础信息',
  '武藤纯子-基础信息',
  '陆望舒-基础信息',
  '庄晓曼-调色盘',
  '开局初始化SQL',
  '全局正则导入说明',
  '前端面板说明',
  // 主模型变量输出格式（与额外模型互斥；默认关，见 变量输出格式.yaml / 变量输出格式.txt）
  '[mvu_update]变量输出格式',
  '变量输出格式',
]);

const EJS_CONTROLLER_FILES = /EJS预处理|EJS变量定义片段|EJS（规则）|EJS（剧情）|EJS（角色）/;

const EJS_CONTROLLERS = {
  'EJS（规则）动态控制器': {
    path: '世界书/EJS/EJS（规则）动态控制器.txt',
    abstract: 'getwi 开局SQL/正则/面板说明（可选灰灯）',
    keywords: [],
    uid: 80,
    enabled: true,
    strategy: { type: 'constant' },
    position: { type: 'before_character_definition', order: 25 },
  },
  'EJS（剧情）动态控制器': {
    path: '世界书/EJS/EJS（剧情）动态控制器.txt',
    abstract: 'is_prologue/is_chapter1 时 getwi 写死表+分节点剧本',
    keywords: [],
    uid: 81,
    enabled: true,
    strategy: { type: 'constant' },
    position: { type: 'at_depth', role: 'system', depth: 0, order: 70 },
  },
  'EJS（角色）动态控制器': {
    path: '世界书/EJS/EJS（角色）动态控制器.txt',
    abstract: 'getwi Persona+NPC绿灯档案+方敏/方汉洲/庄晓曼调色盘',
    keywords: [],
    uid: 82,
    enabled: true,
    strategy: { type: 'constant' },
    position: { type: 'after_character_definition', order: 55 },
  },
};

function walkManifestLeaves(manifest, fn) {
  for (const [key, val] of Object.entries(manifest)) {
    if (!val || typeof val !== 'object') continue;
    if (val.path) fn(key, val);
    else walkManifestLeaves(val, fn);
  }
}

function collectAlwaysEnabledPaths(state) {
  const paths = new Set();
  walkManifestLeaves(state.entryManifest, (key, leaf) => {
    if (ALWAYS_ENABLED.has(key) && leaf.path) paths.add(leaf.path.replace(/\\/g, '/'));
  });
  return paths;
}

function patchState() {
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  let on = 0;
  let off = 0;

  walkManifestLeaves(state.entryManifest, (key, leaf) => {
    if (key.startsWith('[门控]')) {
      leaf.enabled = false;
      off++;
      return;
    }
    if (ALWAYS_ENABLED.has(key)) {
      leaf.enabled = true;
      on++;
      return;
    }
    if (ALWAYS_DISABLED.has(key) || key === '剧情注入路由') {
      leaf.enabled = false;
      off++;
      return;
    }
    if (leaf.enabled !== false) {
      leaf.enabled = false;
      off++;
    }
  });

  if (!state.entryManifest.EJS预处理) state.entryManifest.EJS预处理 = {};
  state.entryManifest.EJS预处理 = {
    ...state.entryManifest.EJS预处理,
    ...EJS_CONTROLLERS,
  };
  delete state.entryManifest['门控'];

  state.creator_notes =
    'Lovelive式：蓝灯=MVU+世界观+角色基础卡+扮演+阶段指导+三EJS；写死表/分节点/Persona=灰灯，EJS（剧情）+EJS（角色）按章节/关键词 getwi。勿开InitVar。';

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
  console.log(`state: 蓝灯=${on}, 灰灯=${off}`);
}

function patchYamlEnable(dir, alwaysPaths) {
  let on = 0;
  let off = 0;
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (file.name === '门控') continue;
      const sub = patchYamlEnable(p, alwaysPaths);
      on += sub.on;
      off += sub.off;
      continue;
    }
    if (!/\.(yaml|txt)$/i.test(file.name)) continue;
    if (p.includes(`${path.sep}门控${path.sep}`)) continue;
    if (EJS_CONTROLLER_FILES.test(file.name)) continue;

    let text = fs.readFileSync(p, 'utf8');
    if (!/^名称:/m.test(text) && !/^启用:/m.test(text)) continue;

    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    const shouldOn = [...alwaysPaths].some((ap) => rel === ap || rel.endsWith(ap));

    const next = text.replace(
      /^启用:\s*(true|false)\s*$/m,
      shouldOn ? '启用: true' : '启用: false',
    );
    if (next !== text) {
      fs.writeFileSync(p, next, 'utf8');
      if (shouldOn) on++;
      else off++;
    }
  }
  return { on, off };
}

patchState();
const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
const alwaysPaths = collectAlwaysEnabledPaths(state);
const { on, off } = patchYamlEnable(path.join(ROOT, '世界书'), alwaysPaths);
console.log(`yaml 启用→true: ${on}, 启用→false: ${off}`);
