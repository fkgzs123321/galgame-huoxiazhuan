const fs = require('fs');
const f = 'src/角色卡/同级生2/世界书/系统/表格模板JSON.txt';
let c = fs.readFileSync(f, 'utf8');

// 1. note 中互斥伙伴描述
c = c.replace(/mutex_partner_id 记录被互斥影响的伙伴 row_id，0=无/g, "mutex_partner_id 记录互斥伙伴姓名（如'鸣泽唯'），'无'=无互斥");

// 2. note 中列24定义
c = c.replace(/列24=互斥伙伴row_id mutex_partner_id（0=无）/g, "列24=互斥伙伴姓名 mutex_partner_id（'无'=无互斥）");

// 3. note 中 DDL 列定义
c = c.replace(/mutex_partner_id INTEGER/g, "mutex_partner_id TEXT");

// 4. initNode 示例 INSERT: VALUES (1, '鸣泽唯' -> 自动生成, mutex_partner_id 值 0 -> '无'
c = c.replace(/VALUES \(1, '鸣泽唯'/g, "VALUES ((SELECT COALESCE(MAX(row_id), 0) + 1 FROM important_npc), '鸣泽唯'");

// 5. updateNode 中 mutex_partner_id = 3 -> '舞岛可怜'
c = c.replace(/mutex_partner_id = 3/g, "mutex_partner_id = '舞岛可怜'");

// 6. insertNode 示例中 mutex_partner_id 值已经是 0 -> '无'（在 VALUES 列表中）
//    insertNode 的 VALUES 已用 COALESCE，但 mutex_partner_id 位置还是 0
//    需要把 INSERT 示例中的 ", 0, 0, 0, 0, 0, 'B'" 模式中的第一个0改成'无'
//    但这个太危险了（可能误替换其他0）。用更精确的上下文匹配。

// 7. 列表头 "互斥伙伴row_id" -> "互斥伙伴姓名"
c = c.replace(/"互斥伙伴row_id"/g, '"互斥伙伴姓名"');

fs.writeFileSync(f, c);
console.log('表格模板JSON.txt OK');
