// 把 euphoria 的变量结构补齐到本卡 initvar
// 根因：我从 euphoria 搬了**条目**（它们引用 euphoria 的变量），
//       但变量结构是我按 状态表.yaml 另写的 → 两边对不上 → 条目引用到不存在的路径。
// 判据：条目是引擎层（euphoria 原版、已跑通）→ **变量结构以条目为准**，补齐变量。
// 严重度举例：`主角.反抗值` 不存在 → 前端写不进去 → **整套拒绝机制失效**。
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const WB = path.join(D, '世界书');

const 取 = (p) => YAML.parse(fs.readFileSync(p, 'utf8'));
const eu = 取(path.join(ROOT, 'src/旮旯给木-euphoria/世界书/变量/initvar.yaml'));
const me = 取(path.join(WB, '变量/initvar.yaml'));

// 逐条把 euphoria 有、本卡没有的键**按原位补进**（保留本卡已有的值不覆盖）
let 补 = [];
function 合并(dst, src, pre) {
  for (const [k, v] of Object.entries(src)) {
    const p = pre ? pre + '.' + k : k;
    // 底座专属不搬（女角 / 世界 / 局面 的部分，本卡有自己的）
    if (/^(女角|世界|局面)$/.test(k) && pre === '') continue;
    if (dst[k] === undefined) {
      dst[k] = JSON.parse(JSON.stringify(v));
      补.push(p);
    } else if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) {
      合并(dst[k], v, p);
    }
  }
}
合并(me, eu, '');

// 阶段指导 里写的是 `主角.状态`（euphoria 的四态在 主角 下）→ 已由上面补齐

fs.writeFileSync(path.join(WB, '变量/initvar.yaml'), YAML.stringify(me, { lineWidth: 0 }));
console.log('✅ 补齐 ' + 补.length + ' 条路径：');
补.forEach(x => console.log('   + ' + x));

// 复跑路径检查
const { execFileSync } = require('child_process');
console.log('\n' + execFileSync('node', [path.join(D, 'scripts/audit-varpaths.cjs')], { encoding: 'utf8' }).trim());
