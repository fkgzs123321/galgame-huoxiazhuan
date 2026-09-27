// configure 之后重排 order：tens-group 只按「类型顺序 + 关键词重叠」分块，不认语义分层，
// 结果是 索引/「她_」/阶段指导/终局/MVU 被排到 300-480（= 底座区）→ 违反 E4 的 order 分区。
// 本脚本按校验器的分层体系重排：非底座 < 200，底座 ≥ 200（引擎 1-99 / T1 100-129 / 底座 200+）。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const PROJ = '旮旯给木-同级生2';
const D = path.join(ROOT, 'src', PROJ);
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

const T0_NAMES = ['加载纪律', '四态循环', '反抗与判定', '剧情推进', '交互循环', '出招', '兴奋度机制', '推演链', '叙述准则', '感知禁令', '玩家的输入'];
const T1_NAMES = ['边界情况', '离线行动', '熟练度阶段', '阶段指导', '终局', '开局'];

function 分层(name, cat, p) {
  const bare = name.replace(/^\[[^\]]+\]/, '');
  if (cat === 'MVU') return 'MVU';
  if (T0_NAMES.includes(bare)) return 'T0';
  if (T1_NAMES.includes(bare)) return 'T1';
  if (p.includes('角色/屏幕外的她/')) return 'T1';
  if (/速览|索引/.test(name)) return 'T1';
  if (p.includes('世界观/引擎/')) return 'T0';
  if (p.includes('扮演准则/')) return 'T0';
  if (p.includes('阶段指导/')) return 'T1';
  if (p.includes('事件/')) return 'T1';
  if (p.includes('底座_')) return 'T3_BASE';
  if (p.includes('时间线/')) return 'T3_DAY';
  if (p.includes('地理/')) return 'T3_GEO';
  if (p.includes('NPC/')) return 'T3_NPC';
  if (cat === '角色') return 'T4';
  if (p.includes('契约')) return 'T2';
  return 'UNKNOWN';
}
// 起始 order（区间不重叠）
const 基 = { T0: 10, T1: 100, T4: 130, T2: 150, MVU: 160,
  T3_BASE: 200, T3_GEO: 300, T3_NPC: 320, T3_DAY: 340, UNKNOWN: 380 };

// 按「类型 + 创作规划顺序」稳定排序，再在区间内递增
const 序 = [];
for (const [cat, es] of Object.entries(S.entryManifest)) {
  for (const [name, e] of Object.entries(es)) {
    const p = e.path || ((e.contents || []).find(c => c.file) || {}).file || '';
    const gated = JSON.stringify(e.contents || []).includes('世界.底座');
    if (gated && !/底座_|事件\/|时间线\/|地理\/|NPC\//.test(p)) { /* 见下：按门控再分 */ }
    序.push({ cat, name, p, 层: 分层(name, cat, p), e });
  }
}
// 「她_」「速览/索引」在 T1 里定序；其余按层内名字
序.sort((a, b) => a.层.localeCompare(b.层) || a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name, 'zh'));

const 计数 = {};
const patch = [];
for (const r of 序) {
  计数[r.层] = (计数[r.层] || 0) + 1;
  const order = (基[r.层] || 500) + 计数[r.层] - 1;
  if ((r.e.position || {}).order !== order) {
    patch.push({ op: 'add', path: '/entryManifest/' + r.cat + '/' + r.name + '/position/order', value: order });
  }
}
console.log('分层计数：' + JSON.stringify(计数));
console.log('待改 order：' + patch.length + ' 条');
if (patch.length) {
  const f = path.join(D, '_p.json');
  fs.writeFileSync(f, JSON.stringify(patch));
  console.log(execFileSync('node', [path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs'), 'patch', PROJ, '--file', f], { encoding: 'utf8' }));
  fs.rmSync(f);
}
