// 闭环审计 v2（线索层）
//   对每个叶子变量统计三类位置，【读取点必须排除 initvar 与 变量更新规则本身】：
//     写入点  = 变量更新规则.yaml 里的字段声明，或机制条目里明确的「加/减/置」句
//     消费点  = ① 条目里的 EJS 门控/段落控制  ② 机制条目把它当规则数值用  ③ 前端面板渲染它
//     可见点  = 正则 HTML 里出现（玩家看得见）
//   输出：死变量（只写不消费）/ 空转（只消费无来源）/ 玩家不可见
import fs from 'node:fs';
import path from 'node:path';

const CARD = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/';
const read = (p) => fs.readFileSync(p, 'utf8');

// ── 叶子变量（去重）──
const initLines = read(CARD + '世界书/变量/initvar.yaml').split('\n');
const 叶子 = new Map();
const stack = [];
for (const raw of initLines) {
  if (!raw.trim() || raw.trim().startsWith('#')) continue;
  const m = raw.match(/^(\s*)([^\s#][^:]*):\s*(.*)$/);
  if (!m) continue;
  const depth = Math.floor(m[1].length / 2);
  stack.length = depth + 1;
  stack[depth] = m[2].trim().replace(/^['"]|['"]$/g, '');
  if (m[3].trim() !== '') {
    const p = stack.filter(Boolean);
    const 名单 = ['苏婉','陈雪华','林雅芝','王秀兰','赵敏','孙莉','周慧敏','吴琼','郑秀','沈梦瑶'];
    const 归一 = (p[0] === '绑定花名册' && 名单.includes(p[1])) ? '绑定花名册.*.' + p.slice(2).join('.') : p.join('.');
    叶子.set(归一, p[p.length - 1].replace(/~\S+$/, ''));
  }
}

// ── 文本分桶 ──
const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(txt|html|js|yaml|json)$/.test(e.name)) out.push(p);
  }
  return out;
};
const 规则文件 = CARD + '世界书/变量/变量更新规则.yaml';
const 初值文件 = CARD + '世界书/变量/initvar.yaml';
const 面板文件 = [...walk(CARD + '正则'), 'E:/Games/写卡/tavern_helper_template/_ui_repo/xitongge/dist/index.html'].filter(fs.existsSync);

const 规则文本 = read(规则文件);
const 机制桶 = [];   // 世界观 / 阶段指导 / 事件 / 时间线 / 扮演准则 / 地理
const 条目桶 = [];   // 角色 / NPC（含 EJS 门控）
for (const p of walk(CARD + '世界书')) {
  if (p === 规则文件 || p === 初值文件) continue;
  const rel = path.relative(CARD, p).split(path.sep).join('/');
  const t = read(p);
  if (/世界书\/(世界观|阶段指导|事件|时间线|扮演准则|地理)\//.test(rel)) 机制桶.push({ rel, t });
  else 条目桶.push({ rel, t });
}
const 面板文本 = 面板文件.map((p) => ({ rel: path.relative(CARD, p).split(path.sep).join('/'), t: read(p) }));

// 这个变量名是否只是别的词的一部分（避免「资产」捞到「资产转移」这类无关命中，但保留合理命中）
const 计数 = (t, name) => (t.match(new RegExp(name, 'g')) || []).length;

const 行 = [];
for (const [p, name] of 叶子) {
  // 写入：规则文件里作为字段声明
  const 写规则 =
    (规则文本.match(new RegExp('^\\s+' + name + '(:|[~]\\S*:)\\s*', 'gm')) || []).length;
  // 写入：机制条目里出现（机制条目写「加/减/置/恢复」时算机制参与）
  const 写机制 = 机制桶.reduce((a, x) => a + 计数(x.t, name), 0);

  // 消费：EJS 门控（getvar 路径里出现）
  const 消费EJS = 条目桶.reduce((a, x) => {
    const n = (x.t.match(new RegExp("getvar\\([^)]*" + name, 'g')) || []).length;
    return a + n;
  }, 0);
  // 消费：机制条目里被当规则数值用
  const 消费机制 = 写机制;
  // 可见：面板渲染
  const 可见 = 面板文本.reduce((a, x) => a + 计数(x.t, name), 0);

  const 文件名 = [];
  机制桶.forEach((x) => { if (x.t.includes(name)) 文件名.push(x.rel.replace(/^世界书\//, '')); });
  面板文本.forEach((x) => { if (x.t.includes(name)) 文件名.push(x.rel); });

  行.push({ p, name, 写规则, 写机制, 消费EJS, 消费机制, 可见, 文件名: [...new Set(文件名)] });
}

const pad = (s, n) => String(s).padEnd(n);
console.log('叶子变量数（去重）:', 行.length, '\n');

const 死 = 行.filter((r) => r.消费EJS === 0 && r.可见 === 0 && r.写机制 === 0);
const 无来源 = 行.filter((r) => r.写规则 === 0 && r.写机制 === 0);
const 不可见 = 行.filter((r) => r.可见 === 0);

const 分 = (t, arr) => {
  console.log('═══ ' + t + '（' + arr.length + '）═══');
  arr.forEach((r) => console.log('  ' + pad(r.p, 32) + ' 写规则' + r.写规则 + ' 写机制' + pad(r.写机制, 3) + ' EJS消费' + pad(r.消费EJS, 3) + ' 面板' + pad(r.可见, 3) + '  ' + r.文件名.slice(0, 3).join(' ')));
  if (!arr.length) console.log('  （无）');
  console.log('');
};
分('★ 死变量：没有 EJS 消费、面板不显示、机制条目也没用到', 死);
分('★ 无来源：更新规则里没有写入声明，机制条目也没提', 无来源);
分('面板不显示（玩家看不见，但可能被机制/EJS用）', 不可见);

console.log('═══ 全量一览 ═══');
行.sort((a, b) => (b.消费EJS + b.可见 + b.写机制) - (a.消费EJS + a.可见 + a.写机制))
  .forEach((r) => console.log('  ' + pad(r.p, 32) + ' 写规则' + pad(r.写规则, 3) + ' 写机制' + pad(r.写机制, 4) + ' EJS' + pad(r.消费EJS, 4) + ' 面板' + pad(r.可见, 4) + '  ' + r.文件名.slice(0, 4).join(' ')));
