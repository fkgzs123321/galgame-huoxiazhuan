// 全面验证打包产物：灯状态、绿灯 keys、速览总表、getwi 目标条目、AI推理链
import fs from 'fs';
import { parse } from 'yaml';

const index = parse(fs.readFileSync('src/同级生2/index.yaml', 'utf-8'));
const entries = [];
function walk(list, folder = []) {
  for (const it of list) {
    if (it.文件夹 && it.条目) walk(it.条目, [...folder, it.文件夹]);
    else if (it.名称) {
      entries.push({
        name: it.名称,
        enabled: it.启用 !== false,
        type: it.激活策略?.类型,
        keys: it.激活策略?.关键字 || it.激活策略?.关键词 || [],
        order: it.插入位置?.顺序,
        file: it.文件,
      });
    }
  }
}
walk(index.条目);

// 灯状态分布
const dist = { 蓝灯: 0, 绿灯: 0, 关灯: 0, 启用其他: 0 };
for (const e of entries) {
  if (!e.enabled) dist.关灯++;
  else if (e.type === '蓝灯') dist.蓝灯++;
  else if (e.type === '绿灯') dist.绿灯++;
  else dist.启用其他++;
}
console.log('条目总数:', entries.length, '| 分布:', JSON.stringify(dist));

// 绿灯 keys
console.log('\n=== 绿灯条目 keys ===');
const greens = entries.filter((e) => e.enabled && e.type === '绿灯');
for (const g of greens) {
  console.log(`  ${g.name}: keys=${JSON.stringify(g.keys)}`);
}

// 速览总表
const suLan = entries.find((e) => e.name === '角色速览总表');
console.log('\n速览总表:', suLan ? `启用=${suLan.enabled} 类型=${suLan.type} 顺序=${suLan.order}` : '❌未注册');

// AI推理链
const reason = entries.find((e) => e.name === 'AI推理链');
console.log('AI推理链:', reason ? `启用=${reason.enabled} 类型=${reason.type} 顺序=${reason.order}` : '❌未注册');

// 顺序冲突检查
console.log('\n=== 插入顺序冲突（同顺序>1条）===');
const orderMap = new Map();
for (const e of entries) {
  if (!e.order) continue;
  if (!orderMap.has(e.order)) orderMap.set(e.order, []);
  orderMap.get(e.order).push(e.name);
}
let conflict = 0;
for (const [o, names] of orderMap) {
  if (names.length > 1) { conflict++; console.log(`  顺序${o}: ${names.join(', ')}`); }
}
console.log('顺序冲突组数:', conflict);
