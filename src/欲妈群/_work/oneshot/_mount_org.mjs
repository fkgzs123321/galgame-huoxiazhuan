import fs from 'fs';
const F = '_work/gen/_gen_basic.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('_patch_orgasm.json')) { console.log('已挂载'); process.exit(0); }
const a = "  const ov = PRIV[name];\n  if (ov) { d.私密 = { ...d.私密, ...ov }; }";
const b = `  const ov = PRIV[name];
  if (ov) { d.私密 = { ...d.私密, ...ov }; }
  // 高潮单独一份数据、优先级最高（每位一个只属于她的招牌动作，不许互相抄）
  const ORG = fs.existsSync(path.join(import.meta.dirname, '..', 'tmp', '_patch_orgasm.json'))
    ? JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'tmp', '_patch_orgasm.json'), 'utf8')) : {};
  if (ORG[name]) { d.私密 = { ...d.私密, 高潮: ORG[name] }; }`;
if (!s.includes(a)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(F, s.replace(a, b), 'utf8');
console.log('✓ 高潮补丁已挂载（优先级最高）');
