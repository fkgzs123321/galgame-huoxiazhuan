const fs = require('fs');
const xy = JSON.parse(fs.readFileSync('./src/星月私立高等学院 MVU_3.9.6/星月解包.json', 'utf-8'));
const j = JSON.parse(fs.readFileSync('./dist/不要玩弄我的鸡吧-forge.json', 'utf-8'));

console.log('=== 星月卡脚本字段 ===');
const xyCc = xy.data.extensions.tavern_helper.scripts.find(s => s.name.includes('控制中心'));
console.log('字段:', Object.keys(xyCc).join(', '));
console.log('type:', xyCc.type);
console.log('enabled:', xyCc.enabled);
console.log('button:', JSON.stringify(xyCc.button));
console.log('export_with:', JSON.stringify(xyCc.export_with));
console.log('data:', JSON.stringify(xyCc.data));
console.log('info:', xyCc.info);
console.log('id:', xyCc.id);

console.log('\n=== 本卡脚本字段 ===');
const myCc = j.data.extensions.tavern_helper.scripts.find(s => s.name === '控制中心');
console.log('字段:', Object.keys(myCc).join(', '));
console.log('type:', myCc.type);
console.log('enabled:', myCc.enabled);
console.log('button:', JSON.stringify(myCc.button));
console.log('export_with:', JSON.stringify(myCc.export_with));
console.log('data:', JSON.stringify(myCc.data));
console.log('info:', myCc.info);
console.log('id:', myCc.id);

// 对比所有字段
console.log('\n=== 字段差异 ===');
const xyKeys = new Set(Object.keys(xyCc));
const myKeys = new Set(Object.keys(myCc));
console.log('星月有本卡无:', [...xyKeys].filter(k => !myKeys.has(k)).join(', ') || '无');
console.log('本卡有星月无:', [...myKeys].filter(k => !xyKeys.has(k)).join(', ') || '无');

// 检查 tavern_helper 顶层结构
console.log('\n=== tavern_helper 顶层 ===');
console.log('星月:', Object.keys(xy.data.extensions.tavern_helper).join(', '));
console.log('本卡:', Object.keys(j.data.extensions.tavern_helper).join(', '));

// 检查 extensions 顶层
console.log('\n=== extensions 顶层 ===');
console.log('星月:', Object.keys(xy.data.extensions).join(', '));
console.log('本卡:', Object.keys(j.data.extensions).join(', '));
