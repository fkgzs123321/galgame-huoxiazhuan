/**
 * 测试 EJS 渲染 D0系统控制器(诊断脚本)
 * 用法:node scripts/test-ejs.mjs
 */
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd(), 'src/content');

// 简易 getwi 加载器
function loadRaw(p) {
  const segs = p.split('/').filter(Boolean);
  let targetPath = '';
  if (segs[0] === 'EJS预处理') {
    targetPath = `ejs/${segs.slice(1).join('/')}.txt`;
  } else if (segs[0] === '角色') {
    targetPath = `character/${segs[1]}/${segs.slice(2).join('/')}.txt`;
  } else if (segs[0] === '世界观' || segs[0] === '世界书') {
    targetPath = `worldbook/${segs.slice(1).join('/')}.txt`;
  } else {
    return null;
  }
  const full = path.join(root, targetPath);
  if (!fs.existsSync(full)) return null;
  let src = fs.readFileSync(full, 'utf8');
  // 剥离装饰器
  src = src.replace(/^@@[a-z_]+\s*\n?/gm, '');
  return src;
}

function expand(source, stack = []) {
  const re = /<%-\s*await\s+getwi\(\s*['"]([^'"]+)['"]\s*\)\s*%>/g;
  return source.replace(re, (full, p1) => {
    const path = String(p1).trim();
    if (stack.includes(path)) return `<!-- getwi:cycle:${path} -->`;
    const sub = loadRaw(path);
    if (!sub) return `<!-- getwi:missing:${path} -->`;
    return expand(sub, [...stack, path]);
  });
}

const d0Path = path.join(root, 'ejs/D0系统控制器.txt');
let d0 = fs.readFileSync(d0Path, 'utf8');
// 剥离装饰器
d0 = d0.replace(/^@@[a-z_]+\s*\n?/gm, '');

console.log('原 D0 长度:', d0.length);
const expanded = expand(d0);
console.log('展开后长度:', expanded.length);
console.log('missing 数:', (expanded.match(/getwi:missing:/g) || []).length);
console.log('cycle 数:', (expanded.match(/getwi:cycle:/g) || []).length);

// 写出展开后内容到文件,便于检查
fs.writeFileSync(path.join(process.cwd(), 'debug-expanded.txt'), expanded, 'utf8');
console.log('展开内容已写出: debug-expanded.txt');

// 尝试编译,看错误
try {
  const fn = ejs.compile(expanded, {
    filename: 'D0系统控制器.txt',
    async: false,
    _with: true,
    debug: false,
    compileDebug: true,
    escape: (s) => s,
  });
  console.log('编译成功,函数长度:', fn.toString().length);
  // 尝试运行
  const ctx = {
    getvar: (p, o) => (o && 'defaults' in o ? o.defaults : undefined),
    setvar: () => {},
    getwi: () => Promise.resolve(''),
    _: { clamp: (v, a, b) => Math.min(Math.max(v, a), b) },
    PLAYER_IDENTITIES: undefined,
    DIFFICULTY_MODIFIERS: undefined,
  };
  const out = fn(ctx, (s) => s, () => {}, () => {});
  console.log('渲染成功,输出长度:', out.length);
} catch (e) {
  console.error('渲染失败:', e.message);
  console.error(e.stack);
}
