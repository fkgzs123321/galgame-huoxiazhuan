// 时间轴层 + 地理层生成器
// 数据源：人物出现总表.txt（EJS 条目，9542 字符 → 超单条上限，**必须拆**）
//   ① 时间轴索引    = 骨架 + 女角/男配 id + 周间休假 + 规则（常驻索引）
//   ② 人物出现索引  = SCHEDULE + 查询函数（按需）—— 两件合起来 = 原文件减去 DATE_OVERRIDES
//   ③ 第01~17天 ×17 = DATE_OVERRIDES[N] + 剧情线当天事件（EJS 按天，★ 主题轴）
// 地理层：地理速览.yaml → 1 条；地理条目.md 的 8 个 region → 8 条

// ── 格式规范化（rules.md：数据库格式优先，用列表和键值对，不用段落）──
function 规范化(t) {
  const L = String(t).split(/\r?\n/);
  let 块缩进 = -1;
  return L.map(l => {
    const 块头 = l.match(/^(\s*)[^#\s][^:]*:\s*[|>][-+]?\s*$/);
    if (块头) { 块缩进 = 块头[1].length; return l; }
    if (块缩进 >= 0) {
      if (l.trim() === '') return l;
      const ind = l.match(/^ */)[0].length;
      if (ind > 块缩进) return l;
      块缩进 = -1;
    }
    const ind = l.match(/^ */)[0].length;
    if (!l.trim() || ind === 0) return l;
    if (/^\s*(-|#|\.\.\.)/.test(l)) return l;
    if (/:\s/.test(l) || /:\s*$/.test(l)) return l;
    if (/^\s*[|>]/.test(l)) return l;
    return ' '.repeat(ind) + '- ' + l.trim();
  }).join('\n');
}

const fs = require('fs');
const path = require('path');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const 源 = path.join(D, '底座_nanpa2');

// ── 工具 ──
const 汉 = s => s.replace(/篠原/g,'筱原').replace(/桜/g,'樱').replace(/宮/g,'宫').replace(/靜/g,'静').replace(/繪/g,'绘').replace(/沢/g,'泽');
const 清 = s => 汉(s).replace(/\s*——\s*/g, '，').replace(/※（[^）]*）/g, '').replace(/※/g, '')
  .replace(/\n{3,}/g, '\n\n').trim();
function 抽块(text, 起) {
  const i = text.indexOf(起); if (i < 0) return '';
  const j = text.indexOf('{', i); let d = 0, k = j;
  for (; k < text.length; k++) { if (text[k] === '{') d++; else if (text[k] === '}') { d--; if (!d) break; } }
  return text.slice(i, k + 1);
}
const 写 = (rel, body) => { const p = path.join(D, '世界书', rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, 规范化(body)); return body.length; };

// ── 读人物出现总表 ──
const 总表 = fs.readFileSync(path.join(源, '人物出现总表.txt'), 'utf8');
const HEROINE = 抽块(总表, 'const HEROINE');
const NPC块 = 抽块(总表, 'const NPC');
const 周休 = 抽块(总表, 'const WEEKDAY_OFFS');

// 解析 DATE_OVERRIDES 的每一天（按行首的两空格 + `N:` 作边界，避免跨条目串行）
const dov块 = 抽块(总表, 'const DATE_OVERRIDES');
const 天 = {};
{
  const 存 = (n, body) => {
    const g = (k) => { const r = body.match(new RegExp(k + ":\\s*'([^']*)'")); return r ? r[1] : ''; };
    const arr = (k) => { const r = body.match(new RegExp(k + ':\\s*\\[([^\\]]*)\\]')); return r ? r[1].split(',').map(x => +x.trim()).filter(Boolean) : []; };
    const spec = body.match(/special:\s*'([\s\S]*?)'\s*,?\s*\}/);
    const 拼 = body.match(/special:\s*'([\s\S]*?)'/) ;
    天[n] = { date: g('date'), note: g('note'), locked: arr('locked'),
      unlock: arr('new_unlock'), special: (spec ? spec[1] : (拼 ? 拼[1] : '')) };
  };
  let cur = null, buf = [];
  for (const l of dov块.split(/\r?\n/)) {
    const m = l.match(/^\s{2}(\d+):\s*\{/);
    if (m) { if (cur !== null) 存(cur, buf.join('\n')); cur = +m[1]; buf = [l]; }
    else if (cur !== null) buf.push(l);
  }
  if (cur !== null) 存(cur, buf.join('\n'));
}
if (!天[17]) { 天[17] = { date: '01-07', note: '告白日。深夜结算', locked: [6, 7], unlock: [], special: '' }; }

// ── 从剧情线抽逐日事件（按天归并）──
const 剧 = fs.readFileSync(path.join(源, '剧情线.md'), 'utf8');
const 事件 = {};   // day → [ {线, 文本} ]
{
  const 段 = 剧.split(/^## /m);
  for (const s of 段) {
    const t = s.match(/^(\d+(?:\.\d+)?)\s*·?\s*(.+)$/m); if (!t) continue;
    const 线 = t[2].replace(/（.*?）/g, '').trim();
    const code = s.match(/```\s*\n([\s\S]*?)```/);
    if (!code) continue;
    let cur = 0;
    for (const l of code[1].split(/\r?\n/)) {
      const m = l.match(/^\s*(\d{1,2})\s*[/.月]\s*(\d{1,2})/);
      if (m) { const mo = +m[1], dd = +m[2]; const day = mo === 12 ? dd - 21 : (mo === 1 ? 10 + dd : 0); if (day >= 1 && day <= 17) cur = day; else cur = 0; }
      if (cur && l.trim()) (事件[cur] = 事件[cur] || []).push({ 线, 文本: 清(l) });
    }
  }
}
const 名 = id => { const m = HEROINE.match(new RegExp('\\b' + id + ":\\s*'([^']+)'")); return m ? m[1] : id; };

// ── ① 时间轴索引（常驻）──
const 时间轴索引 = `# 时间轴索引

时间轴索引:
  这是什么: |
    这张卡的时间维度。**整个游戏就是这十七天**，一天一关，关内五个时段。
    每一天的详情不在本条，在本条指向的「第NN天」条目里。

  骨架:
    总长: 17 天
    起止: 12-22（寒假第一天）到 01-07（告白日）
    时段: [早, 上午, 下午, 晚, 深夜]
    星期: 由天数推导，12-22 是周五

  女角 id 表:
${HEROINE.replace(/^const HEROINE\s*=\s*/, '').split('\n').slice(0, 4).map(l => '    ' + l.trim()).join('\n')}

  男配（不占 id，AI 按名字引用）:
${NPC块.replace(/^const NPC\s*=\s*/, '').split('\n').map(l => '    ' + l.trim()).join('\n')}

  周间休假:
${周休.replace(/^const WEEKDAY_OFFS\s*=\s*/, '').split('\n').map(l => '    ' + l.trim()).join('\n')}

  硬规则:
    - 每一天只有登场名单里的人可以出现，名单外的一律锁定
    - 五个时段是她的资源，不是 <user> 的；见 阶段指导
    - 当天要发生的事写在「第NN天」里，本条只给骨架

  当天的覆盖与锁定见: 第01天 ~ 第17天
`;
const 字符1 = 写('时间线/时间轴索引.yaml', 时间轴索引);

// ── ② 人物出现索引（SCHEDULE + 查询函数）──
const SCHEDULE = 抽块(总表, 'const SCHEDULE');
const 查询 = 总表.slice(总表.indexOf('const _dayCount'), 总表.indexOf('[人物出现总表已加载'));
const 人物出现索引 = `# 人物出现索引

人物出现索引:
  这是什么: |
    按「时段 × 地点」查此刻有谁。默认模式在这里，某一天的特殊覆盖见「第NN天」。
    名单为空 = 该地点此刻没人。AI 不得凭空塞人。

  默认日程表:
${SCHEDULE.replace(/^const SCHEDULE\s*=\s*/, '').split('\n').map(l => l ? '    ' + l.trim() : '').join('\n')}

  查询:
${查询.split('\n').map(l => l ? '    ' + l.trim() : '').join('\n')}
`;
const 字符2 = 写('时间线/人物出现索引.yaml', 人物出现索引);

// ── ③ 每天 ──
let 字符3 = 0;
const 天文件 = [];
for (let d = 1; d <= 17; d++) {
  const dd = String(d).padStart(2, '0');
  const x = 天[d] || {};
  const 可遇 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    .filter(id => !(x.locked || []).includes(id)).map(名);
  const 锁 = (x.locked || []).map(名);
  const 线组 = {};
  for (const e of (事件[d] || [])) {
    const g = (线组[e.线] = 线组[e.线] || []);
    const 规范 = e.文本.replace(/[\s　]/g, '').replace(/（主）|\(主\)|★/g, '');
    // 去重：与已有行互为子串的丢掉（两个来源同一件事，措辞略有出入）
    if (g.some(x => { const y = x.replace(/[\s　]/g, '').replace(/（主）|\(主\)|★/g, ''); return y.includes(规范) || 规范.includes(y); })) continue;
    g.push(e.文本);
  }
  const body = `# 第${dd}天 · ${x.date || ''}

第${dd}天:
  日期: ${x.date || ''}
  可遇: ${可遇.join(' / ') || '—'}
  锁定: ${锁.join(' / ') || '—'}
${(x.unlock || []).length ? '  本日解锁: ' + x.unlock.map(名).join(' / ') + '\n' : ''}${x.note ? '  当日基调: ' + 清(x.note) + '\n' : ''}${x.special ? '  当日必发生: ' + 清(x.special) + '\n' : ''}
  事件锚点:
${Object.keys(线组).length ? Object.entries(线组).map(([k, v]) => '    ' + k + ':\n' + v.map(t => '      ' + t).join('\n')).join('\n') : '    （本日无逐日节点）'}
`;
  字符3 += 写(`时间线/plot/第${dd}天.yaml`, body);
  天文件.push(dd + '(' + (事件[d] || []).length + '条)');
}

console.log('✅ 时间轴层');
console.log('   时间轴索引   ' + 字符1 + ' 字符');
console.log('   人物出现索引 ' + 字符2 + ' 字符');
console.log('   第01~17天    共 ' + 字符3 + ' 字符');
console.log('   每天事件数: ' + 天文件.join(' '));
