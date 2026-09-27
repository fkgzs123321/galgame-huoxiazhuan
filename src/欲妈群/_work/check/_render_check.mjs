import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire('E:/Games/写卡/tavern_helper_template/_tools/');
const ejs = require('ejs');

const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const body = src.split('\n').filter(l => !/^\s*@@/.test(l)).join('\n');

// 伪造 stat_data
const stat = { 群: { 成员详情: {} }, 玩家: { 察觉值: {} }, 郝佳期: { 阶段: 1 } };
const uids = ['su_mei','lin_wanqing','su_qing','han_xue','bai_lu','tao_tao','lian_nai','you_zi','xiao_ye','qin_yu','ling'];
const active = (process.argv[3] || '').split(',').filter(Boolean);
for (const u of uids) stat.群.成员详情[u] = { 本轮活跃: active.includes(u) || active.length === 0 };
for (const u of active) if (stat.群.成员详情[u]) stat.群.成员详情[u].本轮活跃 = true;

const getvar = (p, o) => {
  const parts = String(p).replace(/^stat_data\./, '').split('.');
  let cur = stat;
  for (const k of parts) { if (cur == null) return o?.defaults ?? undefined; cur = cur[k]; }
  return cur === undefined ? (o?.defaults ?? undefined) : cur;
};
const out = await ejs.render(body, { getvar, getwi: async () => '' }, { async: true });
const onCount = (out.match(/^### /gm) || []).length;
const backCount = (out.match(/她的弱点后门：/g) || []).length;
const empties = out.split('\n').filter((l,i,a)=> l.trim()==='' && i>0 && i<a.length-1 && a[i-1].trim()==='').length;
console.log('文件:', file);
console.log('渲染后字符数:', out.length, '| 出场块:', onCount, '| 后门行:', backCount, '| 连续空行:', empties);
console.log('---- 预览 ----');
console.log(out.length > 1600 ? out.slice(0, 1600) + '\n...' : out);
