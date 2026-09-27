import fs from 'fs';
const base = 'e:/Games/写卡/tavern_resource-main/src/角色卡/同级生2';
const j = JSON.parse(fs.readFileSync(base + '/世界书/系统/表格模板JSON.txt', 'utf8'));
const keys = Object.keys(j).filter(k => k.startsWith('sheet_')).sort((a, b) => j[a].orderNo - j[b].orderNo);
let out = '-- ════════════════════════════════════════════════════════════\n';
out += '-- 同级生2 SPV chatSheets 表格模板 v3.0（11 表，基于 SQL_v4.3.json 扩展）\n';
out += '-- 由"📦 创建同级生2表格模板"按钮脚本调用 AutoCardUpdaterAPI.createTables 注入\n';
out += '-- AI 通过 <UpdateTable> 块输出 SQL 语句，SPV 扩展自动执行\n';
out += '-- DDL 注释必须与表头一致，避免 SPV 解析告警\n';
out += '-- v3.0：以验证过的 SQL_v4.3.json 11表为基底，表内增加同级生2专属字段\n';
out += '-- ════════════════════════════════════════════════════════════\n\n';
let idx = 1;
for (const k of keys) {
  const s = j[k];
  out += `-- ════════════════════════════════════════════════════════════\n`;
  out += `-- 表 ${idx}：${s.name}（${s.content[0].length} 列）\n`;
  out += `-- ════════════════════════════════════════════════════════════\n`;
  out += s.sourceData.ddl + '\n\n';
  idx++;
}
fs.writeFileSync(base + '/世界书/系统/表格模板.txt', out, 'utf8');
console.log(`已生成 表格模板.txt (${out.length} 字符, ${keys.length} 表)`);
