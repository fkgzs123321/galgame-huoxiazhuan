import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
const WB = '世界书';
let P = {};
for (const f of ['_basic_data.mjs', '_basic_data_2.mjs', '_basic_data_3.mjs']) {
  const fp = path.join(import.meta.dirname, '..', 'data', f);
  if (!fs.existsSync(fp)) continue;
  Object.assign(P, (await import(pathToFileURL(fp).href)).default);
}

// 私密模块「行为+画面」补丁：可覆盖 身体/敏感带/高潮（用户要求所有模块都写成动作和画面）
const PRIV = fs.existsSync(path.join(import.meta.dirname, '..', 'tmp', '_patch_priv.json'))
  ? JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'tmp', '_patch_priv.json'), 'utf8')) : {};

for (const [name, d] of Object.entries(P)) {
  const ov = PRIV[name];
  if (ov) { d.私密 = { ...d.私密, ...ov }; }
  // 高潮单独一份数据、优先级最高（每位一个只属于她的招牌动作，不许互相抄）
  const ORG = fs.existsSync(path.join(import.meta.dirname, '..', 'tmp', '_patch_orgasm.json'))
    ? JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'tmp', '_patch_orgasm.json'), 'utf8')) : {};
  if (ORG[name]) { d.私密 = { ...d.私密, 高潮: ORG[name] }; }
  const fp = path.join(WB, name + '_基础信息.txt');
  // 气味：数据源里没给就沿用旧文件里那段（由 _gen_palette.mjs 写）
  let 气味 = d.气味 || null;
  if (!气味 && fs.existsSync(fp)) {
    const m = fs.readFileSync(fp, 'utf8').match(/### 气味[\s\S]*?(?=\n### |\n## |$)/);
    if (m) 气味 = m[0].replace(/^### 气味\s*/, '').split(/\n/).filter(l => l.trim()).map(l => l.replace(/^-\s*/, ''));
  }
  const L = [];
  L.push('# ' + name, '');
  L.push('## 一、基本信息', d.基本信息, '');
  L.push('## 二、外貌特征');
  L.push('### 体型落点', d.外貌.体型落点, '');
  L.push('### 影像', d.外貌.影像, '');
  L.push('### 识别特征', d.外貌.识别特征, '');
  L.push('## 三、背景设定', d.背景, '');
  L.push('## 四、关系设定');
  L.push(d.关系.跟儿子.includes('：') ? d.关系.跟儿子 : '跟儿子：' + d.关系.跟儿子, '');
  L.push(d.关系.跟群, '');
  L.push('## 五、地域', d.地域, '');
  L.push('## 六、性格', d.性格, '');
  L.push('## 七、群内发言', d.群内发言, '');
  L.push('## 八、专属后门', d.后门, '');
  L.push('## 九、认知边界', d.认知, '');
  L.push('## 私密档案（NSFW 静态，跨阶段恒定）', '');
  L.push('### 身体', d.私密.身体, '');
  L.push('### 敏感带', d.私密.敏感带, '');
  L.push('### 那支东西', d.私密.共感, '');
  L.push('### 高潮', d.私密.高潮, '');
  if (气味) { L.push('### 气味'); 气味.forEach(x => L.push('- ' + x)); L.push(''); }
  L.push('### 专属禁忌');
  d.禁忌.forEach((t, i) => L.push((i + 1) + '. ' + t));
  L.push('');
  L.push('## 与群里其他人', d.与群, '');
  L.push('## 这条线', d.这条线, '');
  fs.writeFileSync(fp, L.join('\n'), 'utf8');
  console.log('✓ ' + name + '  ' + fs.statSync(fp).size + ' 字节' + (气味 ? '（气味 ' + (d.气味 ? '来自数据源' : '沿用旧文') + '）' : ''));
}
