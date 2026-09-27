const fs = require('fs');
const f = 'src/角色卡/同级生2/世界书/变量/变量输出格式_额外模型.txt';
let c = fs.readFileSync(f, 'utf8');

// 修复错误示例：姓名 value 从数字ID改成字符串姓名
c = c.replace(/{ "op": "replace", "path": "\/当前女角\/姓名", "value": 3 }/g, '{ "op": "replace", "path": "/当前女角/姓名", "value": "舞岛可怜" }');
c = c.replace(/{ "op": "replace", "path": "\/女角\/舞岛可怜\/姓名", "value": 3 }/g, '{ "op": "replace", "path": "/女角/舞岛可怜/姓名", "value": "舞岛可怜" }');
c = c.replace(/{ "op": "replace", "path": "\/女角\/鸣泽唯\/姓名", "value": 1 }/g, '{ "op": "replace", "path": "/女角/鸣泽唯/姓名", "value": "鸣泽唯" }');
c = c.replace(/{ "op": "replace", "path": "\/女角\/加藤美纪\/姓名", "value": 4 }/g, '{ "op": "replace", "path": "/女角/加藤美纪/姓名", "value": "加藤美纪" }');
c = c.replace(/{ "op": "replace", "path": "\/女角\/片桐美铃\/姓名", "value": 11 }/g, '{ "op": "replace", "path": "/女角/片桐美铃/姓名", "value": "片桐美铃" }');

// 修复注释 "女角1 其余45个字段" -> "鸣泽唯 其余45个字段"
c = c.replace(/女角1 其余45个字段/g, '鸣泽唯 其余45个字段');
c = c.replace(/女角4 其余45个字段/g, '加藤美纪 其余45个字段');
c = c.replace(/女角11 其余45个字段/g, '片桐美铃 其余45个字段');

fs.writeFileSync(f, c);
console.log('姓名value修复完成');
