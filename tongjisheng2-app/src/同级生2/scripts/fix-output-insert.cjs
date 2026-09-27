const fs = require('fs');
const f = 'src/角色卡/同级生2/世界书/变量/变量输出格式_额外模型.txt';
let c = fs.readFileSync(f, 'utf8');

// INSERT 示例中 mutex_partner_id 值 0 -> '无'
// 精确匹配: 0, 0, 0, '', 0, 0, 0, 0, 0, 'C' 中的第5个0（mutex_partner_id）
c = c.replace(/0, 0, 0, '', 0, 0, 0, 0, 0, 'C'/g, "0, 0, 0, '', '无', 0, 0, 0, 0, 'C'");

// 50字段模板中也有: "value": "无"（第11条，已正确）
// 检查50字段模板里的互斥伙伴ID值
c = c.replace(/{ "op": "replace", "path": "\/当前女角\/互斥伙伴ID", "value": 0 }/g, '{ "op": "replace", "path": "/当前女角/互斥伙伴ID", "value": "无" }');

fs.writeFileSync(f, c);
console.log('变量输出格式 INSERT 修正完成');
