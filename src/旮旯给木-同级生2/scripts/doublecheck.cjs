// 按 skills 的 DoubleCheck 给这张卡做体检
//   A. 完整性：规划 entries ↔ state.entryManifest ↔ 文件
//   B. 格式规范：keywords 单汉字 / 繁体字 / 命名路径
//   C. 跨条目引用：引用的条目是否存在
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const 规划 = YAML.parse(fs.readFileSync(path.join(D, '创作规划.yaml'), 'utf8'));
const state = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

const 全部注册 = {};
for (const [组, 条] of Object.entries(state.entryManifest || {})) {
  for (const [名, v] of Object.entries(条)) 全部注册[名] = { 组, ...v };
}

console.log('═══ A. 完整性 ═══');
/* A1: 规划 entries 里的条目，是否都注册了 */
let A1 = [];
for (const e of (规划.entries || [])) {
  if (!e || !e.name) continue;
  if (!全部注册[e.name]) A1.push(e.name);
}
console.log('  A1 规划有、但没注册的条目: ' + (A1.length ? A1.length + ' 个 → ' + A1.join(' / ') : '无 ✅'));

/* A2: 已注册的条目，文件是否存在 */
let A2 = [];
for (const [名, v] of Object.entries(全部注册)) {
  const p = v.path;
  if (!p) continue;
  if (!fs.existsSync(path.join(D, p))) A2.push(名 + ' → ' + p);
}
console.log('  A2 已注册、但文件缺失的: ' + (A2.length ? A2.length + ' 个 → ' + A2.join(' / ') : '无 ✅'));

/* A3: 注册了但不在规划里（漏登记的） */
const 规划名 = new Set((规划.entries || []).map(e => e && e.name).filter(Boolean));
const B_例外 = /^\[mvu_update\]|^\[mvu_plot\]|^\[InitVar\]/;
let A3 = [];
for (const 名 of Object.keys(全部注册)) {
  if (!规划名.has(名) && !B_例外.test(名) && !/^文风_/.test(名)) A3.push(名);
}
console.log('  A3 注册了、规划里漏登记的: ' + (A3.length ? A3.length + ' 个 → ' + A3.join(' / ') : '无 ✅'));

console.log('');
console.log('═══ B. 格式规范 ═══');
/* B1: keywords 单汉字 */
let B1 = [];
for (const [名, v] of Object.entries(全部注册)) {
  for (const k of (v.keywords || [])) {
    if (/^[\u4e00-\u9fa5]\$/.test(k)) B1.push(名 + ' → 「' + k + '」');
  }
}
console.log('  B1 keywords 含单汉字: ' + (B1.length ? B1.length + ' 处 → ' + B1.join(' / ') : '无 ✅'));

/* B2: 繁体字 / 日文汉字（常见几个） */
const 繁 = ['裡', '們', '個', '說', '這', '來', '時', '關', '點', '樣', '隻', '為', '髮', '餘', '體', '點'];
let B2 = [];
const 扫 = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) 扫(p);
    else if (/\.(yaml|txt)$/.test(f.name)) {
      const t = fs.readFileSync(p, 'utf8');
      const 命中 = 繁.filter(c => t.includes(c));
      if (命中.length) B2.push(f.name + ' → ' + 命中.join(''));
    }
  }
};
扫(path.join(D, '世界书'));
console.log('  B2 疑似繁体字: ' + (B2.length ? B2.length + ' 处 → ' + B2.slice(0, 5).join(' / ') : '无 ✅'));

/* B3: path 与文件名一致性 */
let B3 = [];
for (const [名, v] of Object.entries(全部注册)) {
  if (!v.path) continue;
  const 基 = path.basename(v.path).replace(/\.(yaml|txt)\$/, '');
  if (基 !== 名 && !B_例外.test(名) && !/^文风_/.test(名) && !/^\[/.test(名)) B3.push(名 + ' ≠ ' + 基);
}
console.log('  B3 条目名与文件名不一致: ' + (B3.length ? B3.length + ' 处 → ' + B3.slice(0, 6).join(' / ') : '无 ✅'));

console.log('');
console.log('═══ C. 跨条目引用（引用要能落到真实条目）═══');
const 引用 = [];
const 扫引用 = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) 扫引用(p);
    else if (/\.(yaml|txt)$/.test(f.name)) {
      const t = fs.readFileSync(p, 'utf8');
      for (const m of t.matchAll(/见\s*([\u4e00-\u9fa5]{2,8})/g)) 引用.push([f.name, m[1]]);
    }
  }
};
扫引用(path.join(D, '世界书'));
const 引用名 = [...new Set(引用.map(x => x[1]))];
let C = [];
for (const r of 引用名) {
  const 有 = 全部注册[r] || 引用名.some(() => false) ||
    Object.keys(全部注册).some(k => k.includes(r)) ||
    fs.existsSync(path.join(D, '世界书')) && (() => {
      const 找 = (dir) => {
        for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
          const p2 = path.join(dir, f.name);
          if (f.isDirectory()) { if (找(p2)) return true; }
          else if (f.name.includes(r)) return true;
        }
        return false;
      };
      return 找(path.join(D, '世界书'));
    })();
  if (!有) C.push(r);
}
console.log('  引用的名字共 ' + 引用名.length + ' 个');
console.log('  C 引用落不到实处的: ' + (C.length ? C.length + ' 个 → ' + C.join(' / ') : '无 ✅'));
