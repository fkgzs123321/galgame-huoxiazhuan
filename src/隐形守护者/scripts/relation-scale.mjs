/**
 * 关系数值尺度（全卡统一）
 * - 情感 -10~+10：一章内典型净增 ≤5，原著庄第二章末≥4、第三章主路≥7
 * - 信任/互信 0~50：方敏可交底≥35；庄协同互信≥33且情感≥3
 */
export const REL_EMOTION_MIN = -10;
export const REL_EMOTION_MAX = 10;
export const REL_TRUST_MAX = 50;

export const GATE_FANG_TRUST = 35;
export const GATE_ZHUANG_EMOTION_CH2_END = 4;
export const GATE_ZHUANG_EMOTION_CH3_MAIN = 7;
export const GATE_ZHUANG_MUTUAL_OPS = 33;
export const GATE_ZHUANG_EMOTION_OPS = 3;

export const INIT_TRUST = { 方敏: 20, 武藤纯子: 20, 庄晓曼互信: 10 };

/** @param {string} path @param {number} value */
export function clampRelationValue(path, value) {
  if (path.includes('情感值')) {
    return Math.max(REL_EMOTION_MIN, Math.min(REL_EMOTION_MAX, Math.round(value)));
  }
  if (path.includes('信任') || path.includes('互信')) {
    return Math.max(0, Math.min(REL_TRUST_MAX, Math.round(value)));
  }
  return value;
}

/** @param {Record<string, unknown>} applyMap */
export function formatApplyDeltasTable(applyMap, title) {
  const lines = [`### ${title}`, '', '| 选项 ID | 节点 | 关系/肖途数值变化 | 备注 |', '|---------|------|-------------------|------|'];
  for (const [id, spec] of Object.entries(applyMap).sort(([a], [b]) => a.localeCompare(b))) {
    const d = spec.deltas || {};
    const rel = Object.entries(d)
      .filter(([k]) => k.startsWith('对user.'))
      .map(([k, v]) => `${k.replace('对user.', '')} ${v >= 0 ? '+' : ''}${v}`)
      .join('；');
    const xt = Object.entries(d)
      .filter(([k]) => !k.startsWith('对user.'))
      .map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`)
      .join('；');
    const changes = [rel, xt].filter(Boolean).join(' / ') || '—';
    let note = spec.be ? `BE·${spec.ending || ''}` : `→ ${spec.node || spec.checkpoint || ''}`;
    if (spec.fork2) note += `；分歧=${spec.fork2}`;
    if (spec.requireZhuangEmotionMin != null) note += `；庄情感≥${spec.requireZhuangEmotionMin}`;
    lines.push(`| ${id} | ${spec.checkpoint || '—'} | ${changes} | ${note} |`);
  }
  return lines.join('\n');
}
