const fs = require('fs');
const f = 'src/角色卡/同级生2/世界书/系统/表格模板JSON.txt';
let c = fs.readFileSync(f, 'utf8');

// initNode 示例: ..., 0, 0, 0, '', 0, 0, 0, 0, 0, 'C', ...
//                  is_pursued, route_locked, mutex_group='', mutex_partner_id=0 -> '无'
// 精确匹配: "0, '', 0, 0, 0, 0, 0, 'C'" 中的 mutex_partner_id 位置
// 值序列: ..., route_locked=0, mutex_group='', mutex_partner_id=0, h_exp=0, first_kiss=0, first_h=0, advanced_h=0, cup='C'
c = c.replace(/0, '', 0, 0, 0, 0, 0, 'C'/g, "0, '', '无', 0, 0, 0, 0, 'C'");

// insertNode 示例: ..., 0, 0, 0, '', 0, 0, 0, 0, 0, 'B', ...
c = c.replace(/0, '', 0, 0, 0, 0, 0, 'B'/g, "0, '', '无', 0, 0, 0, 0, 'B'");

fs.writeFileSync(f, c);
console.log('INSERT示例修正完成');
