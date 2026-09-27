// 按 skills conventions.md 的「双 AI 发送路由」给 packer 加 comment 前缀
//   [mvu_plot]   → 只发剧情 AI
//   [mvu_update] → 只发变量模型
//   无前缀       → 发两个（默认；本卡走「额外模型」，所以剧情内容会白喂给变量模型）
// 只改打包出来的 comment，不动 entryManifest／文件名 → classify()／parseArchiveType()／
// BLUE_LIGHT_ORDER／GREEN_LIGHTS 的名字匹配全部不受影响。
import fs from 'fs';
const F = 'pack_yumq.mjs';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;

// ① 在 buildEntries 之前插入助手
const anchor = 'function buildEntries() {';
const helper = [
  '// ===== 双 AI 发送路由：给 comment 加前缀（skills conventions.md）=====',
  '// 本卡走「额外模型解析」，MVU 会把 [mvu_plot] 条目从变量模型的上下文里删掉、无前缀条目留下。',
  '// 所以「与变量追踪无关」的条目必须加 [mvu_plot]，否则变量模型每轮白收两万字剧情内容。',
  '// ★ 只改打包后的 comment；state／entryManifest／文件名一律不动。',
  'const HAS_MVU_PREFIX = /^\\[(mvu_plot|mvu_update|initvar|InitVar)\\]/;',
  "const PLOT_EXTRA = ['[总控]阶段', '[总控]剧情与事件', '[总控]角色速览', '[世界观]欲妈群机制', '[场景]隐秘场所', '[事件]线下聚会', '[规则]随机欲妈生成'];",
  'function mvuComment(name) {',
  '  if (HAS_MVU_PREFIX.test(name)) return name;                       // 已合规，原样',
  "  if (name === 'MVU变量列表') return '[mvu_update]' + name;          // 它是给变量模型的清单",
  "  const isArchive = /_(基础信息|调色盘|阶段\\d)$/.test(name) && CHARACTERS.some(c => name.startsWith(c + '_'));",
  "  if (isArchive || name === '玩家档案' || PLOT_EXTRA.includes(name)) return '[mvu_plot]' + name;",
  '  return name;                                                      // 其余保守不动',
  '}',
  '',
  '',
].join(eol);
if (!t.includes(anchor)) { console.log('⚠ 找不到 buildEntries 锚点'); process.exit(1); }
if (t.includes('function mvuComment')) console.log('（已有 mvuComment，跳过插入）');
else { t = t.replace(anchor, helper + anchor); n++; console.log('✓ 插入 mvuComment 助手'); }

// ② comment 走助手
const c0 = '      comment: entryName,';
const c1 = '      comment: mvuComment(entryName),';
const k = t.split(c0).length - 1;
if (k !== 1) console.log('⚠ comment 行命中 ' + k + ' 处（预期 1）');
else { t = t.replace(c0, c1); n++; console.log('✓ comment: entryName → mvuComment(entryName)'); }

fs.writeFileSync(F, t, 'utf8');
console.log('共 ' + n + ' 处');
