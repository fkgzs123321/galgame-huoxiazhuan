/**
 * MVU stat_data 白名单净化：删除 schema 外顶层键与嵌套杂项，禁止 AI 擅自加字段。
 * 派生字段（$ 开头）由 Zod transform 生成，不得出现在 patch 目标里。
 */
import _ from 'lodash';

const PLOT_KEYS = [
  '当前章节',
  '章节进度',
  '当前节点',
  '序章已完成',
  '主线归属',
  '第二章分歧',
  '第五章分歧',
  '结局分支',
  '已死亡',
  '检查点',
  '已触发事件',
  '已收集线索',
  '已解锁死亡结局',
];

const XIAOTU_KEYS = ['伪装完整度', '身心状态', '公馆资历', '组织信任度', '阵营信用', '能力'];
const ABILITY_KEYS = ['社交伪装', '情报分析', '审讯抗性', '枪械', '格斗', '潜行规避', '权衡狠决'];
const ENEMY_KEYS = ['武藤志雄怀疑度'];
const ORG_KEYS = ['联络状态', '当前任务'];
const REL_KEYS = ['情感值', '信任度', '互信度'];

function pickObj(src, keys) {
  if (!_.isPlainObject(src)) return {};
  const out = {};
  for (const k of keys) {
    if (_.has(src, k)) out[k] = src[k];
  }
  return out;
}

export function sanitizeStatData(stat) {
  if (!_.isPlainObject(stat)) return {};
  const out = {};

  const plot = pickObj(stat.剧情, PLOT_KEYS);
  if (Array.isArray(plot.已触发事件)) plot.已触发事件 = [...plot.已触发事件];
  if (Array.isArray(plot.已收集线索)) plot.已收集线索 = [...plot.已收集线索];
  if (Array.isArray(plot.已解锁死亡结局)) plot.已解锁死亡结局 = [...plot.已解锁死亡结局];
  out.剧情 = plot;

  const xt = pickObj(stat.肖途, XIAOTU_KEYS);
  if (_.isPlainObject(xt.能力)) xt.能力 = pickObj(xt.能力, ABILITY_KEYS);
  out.肖途 = xt;

  out.敌方 = pickObj(stat.敌方, ENEMY_KEYS);
  out.组织 = pickObj(stat.组织, ORG_KEYS);

  const du = stat.对user;
  if (_.isPlainObject(du)) {
    out.对user = {
      方敏: pickObj(du.方敏, REL_KEYS),
      庄晓曼: pickObj(du.庄晓曼, ['情感值', '互信度']),
      武藤纯子: pickObj(du.武藤纯子, REL_KEYS),
      陆望舒: pickObj(du.陆望舒, REL_KEYS),
    };
  } else {
    out.对user = { 方敏: {}, 庄晓曼: {}, 武藤纯子: {}, 陆望舒: {} };
  }

  return out;
}

/** JSONPatch path 是否允许（不含 stat_data 前缀） */
const ALLOWED_PATCH_RE =
  /^\/(剧情\/(当前章节|章节进度|当前节点|序章已完成|主线归属|第二章分歧|第五章分歧|结局分支|已死亡|检查点|已触发事件\/-|已收集线索\/-|已解锁死亡结局\/-)|肖途\/(伪装完整度|身心状态|公馆资历|组织信任度|阵营信用)|敌方\/武藤志雄怀疑度|组织\/(联络状态|当前任务)|对user\/(方敏|庄晓曼|武藤纯子|陆望舒)\/(情感值|信任度|互信度))$/;

export function filterAllowedPatchOps(ops) {
  if (!Array.isArray(ops)) return [];
  return ops.filter((op) => {
    const p = String(op?.path ?? '');
    if (p.startsWith('/肖途/能力')) return false;
    if (p.startsWith('/$') || p.includes('/$')) return false;
    if (op.op === 'delta' && ALLOWED_PATCH_RE.test(p)) return true;
    if ((op.op === 'replace' || op.op === 'insert') && ALLOWED_PATCH_RE.test(p)) return true;
    return false;
  });
}
