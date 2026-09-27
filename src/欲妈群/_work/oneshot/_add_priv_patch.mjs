import fs from 'fs';
const F = '_work/gen/_gen_basic.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('_patch_priv.json')) { console.log('已挂载过'); process.exit(0); }
const a = "for (const [name, d] of Object.entries(P)) {\n  const fp = path.join(WB, name + '_基础信息.txt');";
const b = `// 私密模块「行为+画面」补丁：可覆盖 身体/敏感带/高潮（用户要求所有模块都写成动作和画面）
const PRIV = fs.existsSync(path.join(import.meta.dirname, '..', 'tmp', '_patch_priv.json'))
  ? JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'tmp', '_patch_priv.json'), 'utf8')) : {};

for (const [name, d] of Object.entries(P)) {
  const ov = PRIV[name];
  if (ov) { d.私密 = { ...d.私密, ...ov }; }
  const fp = path.join(WB, name + '_基础信息.txt');`;
if (!s.includes(a)) { console.log('MISS 锚点'); process.exit(1); }
fs.writeFileSync(F, s.replace(a, b), 'utf8');
console.log('✓ 生成器挂上私密补丁');
