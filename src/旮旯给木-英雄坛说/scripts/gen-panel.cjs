// ════════════════════════════════════════════════════════════
// gen-panel.cjs · 生成完整面板
//
// 参考对象（-V3.738）4.69MB —— 它是把**整个数据库**内嵌进脚本。
// 我们的功能其实更多（8 个引擎 / 125 个能力 / 253 条目），
// 所以面板要把契约层的数据**全编进去**，不是只显示几个数。
//
// 组成 = 骨架 CSS + 全部契约数据 + 完整逻辑
// 产出: 正则/状态栏界面.html
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const 契约 = path.join(D, '底座_yingxiong');
const 世界书 = path.join(D, '世界书');

const 读 = (p, d) => { try { const t = fs.readFileSync(p, 'utf8'); const o = YAML.parse(t); return o == null ? d : o; } catch (e) { return d; } };
const 读文 = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; } };
const 列目录 = (p) => { try { return fs.readdirSync(p); } catch (e) { return []; } };

// ── 读写全 ：契约层 ──
const 物品与品质 = 读(path.join(契约, '物品与品质表.yaml'), {});
const 任务表源 = 读(path.join(契约, '任务表.yaml'), {});
const 门派表 = 读(path.join(契约, '门派表.yaml'), {});
const 旁支 = 门派表.旁支 || {};
const 叛师 = 门派表.叛师 || {};
const 阶段表 = 读(path.join(契约, '阶段表.yaml'), {});
const 状态表 = 读(path.join(契约, '状态表.yaml'), {});
const 时间表 = 读(path.join(契约, '时间表.yaml'), {});
const 目的清单 = 读(path.join(契约, '目的清单.yaml'), {});
const 人设补丁 = 读(path.join(契约, '人设补丁.yaml'), {});
const NSFW契约 = 读(path.join(契约, 'NSFW契约表.yaml'), {});
const 女角设定 = 读(path.join(契约, '女角设定.yaml'), {});
const 成长公式 = 读(path.join(契约, '成长公式表.yaml'), {});

// ── 世界书：地理（每个文件取第一个键）──
const 地理 = {};
for (const f of 列目录(path.join(世界书, '地理'))) {
  if (!f.endsWith('.yaml')) continue;
  const 名 = f.replace('.yaml', '');
  const o = 读(path.join(世界书, '地理', f), {});
  // ★ 地名是文件名，文件里的字段直接是 范围/概览/可做的事/谁在这儿/关键词
  地理[名] = { 概览: o.概览 || '', 范围: o.范围 || [], 可做的事: o.可做的事 || [], 谁在这儿: o.谁在这儿 || [], 关键词: o.关键词 || [] };
}

// ── NPC：全档案（名字 / 身份 / 所在 / 战力 / 会什么）──
const NPC = {};
for (const f of 列目录(path.join(世界书, 'NPC'))) {
  if (!f.endsWith('.yaml')) continue;
  const o = 读(path.join(世界书, 'NPC', f), {});
  const b = o.基础信息 || {};
  const 名 = b.姓名 || f.replace('.yaml', '');
  NPC[名] = {
    身份: b.身份 || '', 所在: String(b.所在 || '').slice(0, 40), 战力: b.战力 || '',
    技能: b.技能 || '', 门槛: b.拜师门槛 || '',
    功能: o.功能定位 || '',
    像什么: (o.外貌特征 || {}).整体印象 || '',
    特征: (o.外貌特征 || {}).关键特征 || '',
    性子: (o.性格核心 || {}).核心特质 || '',
  };
}

// ── 八套「她」──
const 八套 = [];
const 套详 = {};
for (const f of 列目录(path.join(世界书, '角色', '屏幕外的她'))) {
  if (!f.endsWith('.yaml')) continue;
  const n = f.replace('.yaml', '');
  八套.push(n);
  const o = 读(path.join(世界书, '角色', '屏幕外的她', f), {});
  const k = Object.keys(o)[0];
  套详[n] = (k && typeof o[k] === 'object') ? Object.keys(o[k]).slice(0, 12) : [];
}

// ── 门派（源是列表，每项带师承/功法/绝招）──
const 门派列 = Array.isArray(门派表.门派) ? 门派表.门派 : [];
const 门派 = {};
const 绝招 = [];
for (const m of 门派列) {
  if (!m || !m.名) continue;
  门派[m.名] = {
    id: m.id, 所在地: m.所在地 || '', 特色: m.特色 || '', 入门条件: m.入门条件 || '',
    师承: m.师承 || [], 功法: m.功法 || [],
  };
  for (const j of (m.绝招 || [])) {
    绝招.push({ 派: m.名, 名: j.名, 条件: j.条件 || '', 效果: j.效果 || '', 冷却: j.冷却 });
  }
}
// 基本武功（状态表给的清单）
const 基本武功 = (状态表.技能 || {}).基本武功 || [];
const 门派武功 = (状态表.技能 || {}).门派武功 || {};

// 技能树：三层 —— 基本武功 → 门派武功 → 绝招
const 技能树 = {
  基本: 基本武功,
  门派: 门派武功,
  绝招,
};

// ── 状态表：分条（给面板列全）──
const 状态条 = [];
// ★ 状态表是按变量分组的（时间/场景/天赋/…），要展开两层
(function 抽(o, 组) {
  for (const [k, v] of Object.entries(o || {})) {
    if (k === 'meta') continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const 是叶 = ('范围' in v) || ('默认' in v) || ('意义' in v) || ('说明' in v) || ('可见' in v);
      if (是叶) {
        状态条.push({ 组, 名: k, 范围: v.范围 || v.默认 || '', 意义: String(v.意义 || v.说明 || '').slice(0, 70) });
      } else 抽(v, 组 ? 组 + '.' + k : k);
    }
  }
})(状态表, '');
(function 抽状态(o, 前缀) {
  for (const [k, v] of Object.entries(o || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const 值 = v.范围 || v.默认 || v.意义 || v.说明;
      if (值 !== undefined && typeof 值 !== 'object') 状态条.push({ 名: (前缀 ? 前缀 + '.' : '') + k, 说明: String(值).slice(0, 80) });
      else 抽状态(v, 前缀 ? 前缀 + '.' + k : k);
    }
  }
})(状态表, '');
// 状态表顶层若是 { 变量表: {...} } 则展开
if (状态表.状态表) 状态条.length = 0, 抽状态(状态表.状态表, '');

const 数据 = {
  meta: {
    卡名: '英雄坛说', 底座: 'yingxiong',
    生成于: new Date().toISOString().slice(0, 16).replace('T', ' '),
    引擎: 8, 能力: 125,
  },
  物品: 物品与品质.价格转加成 || {},
  品质档: 物品与品质.品质档 || [],
  品级判定: 物品与品质.品级判定 || {},
  面板配置: 物品与品质.面板配置 || {},
  炼丹: (读(path.join(契约, '炼丹.yaml'), {}).炼丹) || {},
  日常与资源: 读(path.join(契约, '日常与资源.yaml'), {}),
  战斗与行动: 读(path.join(契约, '战斗与行动.yaml'), {}),
  英雄榜: (读(path.join(契约, '英雄榜.yaml'), {}).英雄榜) || {},
  强化: 读(path.join(契约, '强化.yaml'), {}).强化 || {},
  检定映射: (读(path.join(契约, '检定映射表.yaml'), {}).检定) || {},
  战力映射: (读(path.join(契约, '战力映射.yaml'), {}).战力映射) || {},
  NPC作息: (读(path.join(契约, 'NPC作息.yaml'), {}).NPC作息) || {},
  品质图例说明: 物品与品质.品质图例说明 || "",
  装备槽: 物品与品质.装备槽 || [],
  消耗门槛: 物品与品质.消耗品门槛 || {},
  背包容量: (物品与品质.背包 || {}).容量 || 0,
  解锁表: (物品与品质.解锁表 || {}).示例 || [],
  任务: 任务表源.任务表 || {},
  任务位上限: (任务表源.meta || {}).任务位上限 || 3,

  阶段: 阶段表,
  状态: 状态条,
  时间: 时间表,
  目的: 目的清单,
  人设: 人设补丁,
  成长公式: 成长公式,
  NSFW: {
    穿着: NSFW契约.穿着 || {},
    身体: NSFW契约.身体 || {},
    周期: NSFW契约.周期表 || {},
    档位: NSFW契约.档位表 || [],
    推进: NSFW契约.推进规则 || {},
    接口: NSFW契约.接口 || {},
  },
  技能树, 绝招, 基本武功, 门派武功, 旁支, 叛师,
  // ★ 门派表本体（开局页选门派 / 世界页六派师承 都要用）
  门派: (门派表.门派 && typeof 门派表.门派 === "object") ? 门派表.门派 : (门派表.示例 || 门派表),
  门派旁支: 旁支, 门派叛师: 叛师,
  女角: 女角设定, 地理, NPC, 八套, 套详,
};

const 规模 = (o) => Buffer.byteLength(JSON.stringify(o), 'utf8');
console.log('内嵌数据：');
for (const [k, v] of Object.entries(数据)) {
  const n = 规模(v);
  if (n > 30) console.log('  ' + k.padEnd(10) + String(Math.round(n / 1024)).padStart(4) + ' KB');
}
console.log('  ──────────────────');
console.log('  合计 ' + Math.round(规模(数据) / 1024) + ' KB');

// ── 合成 ──
const 骨架 = 读文(path.join(D, '正则', '_面板骨架.html'));
const 逻辑 = 读文(path.join(D, '正则', '_面板逻辑.js'));
if (!骨架 || !逻辑) { console.error('缺 _面板骨架.html 或 _面板逻辑.js'); process.exit(1); }

let 出 = 骨架.replace('/*__DATA__*/{}', JSON.stringify(数据)).replace('/*__LOGIC__*/', 逻辑);
// 顺手把逻辑里的 async/await 保留（酒馆助手支持）
// ★ 2026-09-17 修：外面必须包一层代码块标记（照同级生2 的状态栏界面.html）
//   为什么：楼层里插入的是 ``` … ``` 这种代码块，**酒馆助手会执行代码块里的 <script>**。
//   不包的话内容是「裸 HTML」→ 插入后不成代码块 → 酒馆不处理 → **整段 script 不执行**
//   → 面板画得出来但所有按钮点了没反应（这正是英雄坛说之前的症状）。
fs.writeFileSync(path.join(D, '正则', '状态栏界面.html'), '```\n' + 出.trimEnd() + '\n```\n');

const 总 = Buffer.byteLength(出, 'utf8');
const CSS长 = Buffer.byteLength((出.match(/<style>[\s\S]*?<\/style>/) || [''])[0], 'utf8');
const JS长 = Buffer.byteLength(逻辑, 'utf8');
console.log('\n产出 正则/状态栏界面.html');
console.log('  CSS   ' + Math.round(CSS长 / 1024) + ' KB');
console.log('  数据  ' + Math.round(规模(数据) / 1024) + ' KB');
console.log('  逻辑  ' + Math.round(JS长 / 1024) + ' KB');
console.log('  HTML  ' + Math.round((总 - CSS长 - JS长 - 规模(数据)) / 1024) + ' KB');
console.log('  ──────────────');
console.log('  合计  ' + Math.round(总 / 1024) + ' KB');
