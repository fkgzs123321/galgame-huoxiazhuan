#!/usr/bin/env node
const fs = require('fs');

const file = 'src/角色卡/同级生2/世界书/变量/变量输出格式_额外模型.txt';
let c = fs.readFileSync(file, 'utf8');

// 1. 路径替换：/女角/N/女角ID -> /女角/名字/姓名
const NAME_BY_ID = {
  1: '鸣泽唯', 2: '鸣泽美佐子', 3: '舞岛可怜', 4: '加藤美纪', 5: '筱原泉美',
  6: '南川洋子', 7: '都筑梢江', 8: '水野友美', 9: '安田爱美', 10: '田中美沙',
  11: '片桐美铃', 12: '野野村美里', 13: '永岛久美子', 14: '永岛佐知子', 15: '齐藤澪',
  16: '齐藤澪奈', 17: '铃木美穗', 18: '仁科', 19: '正树夏子', 20: '杉本樱子'
};

// 替换 /女角/N/女角ID -> /女角/对应名字/姓名
for (const [id, name] of Object.entries(NAME_BY_ID)) {
  c = c.replace(new RegExp(`/女角/${id}/女角ID`, 'g'), `/女角/${name}/姓名`);
  c = c.replace(new RegExp(`/女角/${id}/`, 'g'), `/女角/${name}/`);
}

// 2. /当前女角/女角ID -> /当前女角/姓名
c = c.replace(/\/当前女角\/女角ID/g, '/当前女角/姓名');

// 3. /场景/当前女角ID -> /场景/当前女角名
c = c.replace(/\/场景\/当前女角ID/g, '/场景/当前女角名');

// 4. 文本中的 "当前女角ID" -> "当前女角名"（仅在描述语境）
c = c.replace(/当前女角ID从 0 变为非 0/g, '当前女角名从"无"变为实际姓名');
c = c.replace(/当前女角ID从一个值变为另一个值/g, '当前女角名从一个姓名变为另一个姓名');
c = c.replace(/当前女角ID = 0 时/g, '当前女角名 = "无" 时');
c = c.replace(/当前女角ID变化/g, '当前女角名变化');
c = c.replace(/当前女角ID = 当前女角ID/g, '当前女角名 = 当前女角名');
c = c.replace(/当前女角ID=2/g, '当前女角名=鸣泽美佐子');
c = c.replace(/当前女角ID = 2/g, '当前女角名 = 鸣泽美佐子');
c = c.replace(/row_id = 当前女角ID/g, 'row_id 通过 WHERE name = 当前女角名 关联');
c = c.replace(/row_id = \\\$\{当前女角ID\}/g, 'row_id 通过 WHERE name = ${当前女角名} 关联');
c = c.replace(/row_id = \\\$\{新ID\}/g, 'row_id 通过 WHERE name = ${新姓名} 关联');

// 5. /女角/${id}/女角ID -> /女角/${姓名}/姓名
c = c.replace(/\/女角\/\$\{id\}\/女角ID/g, '/女角/${姓名}/姓名');
c = c.replace(/\/女角\/\$\{id\}\//g, '/女角/${姓名}/');
c = c.replace(/\/女角\/\$\{当前女角ID\}\//g, '/女角/${当前女角名}/');
c = c.replace(/\/女角\/\$\{新ID\}\//g, '/女角/${新姓名}/');
c = c.replace(/\/女角\/<ID>\//g, '/女角/<姓名>/');
c = c.replace(/\/女角\/<新ID>\//g, '/女角/<新姓名>/');

// 6. 字段清单 "女角ID, 好感度" -> "姓名, 好感度"
c = c.replace(/女角ID, 好感度/g, '姓名, 好感度');
c = c.replace(/- 关系核心\(6\):`\/女角\/\$\{id\}\/女角ID`/g, '- 关系核心(6):`/女角/${姓名}/姓名`');

// 7. JSONPatch 模板里的 "女角ID"
c = c.replace(/{ "op": "replace", "path": "\/当前女角\/女角ID", "value": <ID> }/g, '{ "op": "replace", "path": "/当前女角/姓名", "value": "<姓名>" }');
c = c.replace(/{ "op": "replace", "path": "\/女角\/<ID>\/女角ID", "value": <ID> }/g, '{ "op": "replace", "path": "/女角/<姓名>/姓名", "value": "<姓名>" }');

// 8. 增量示例中 /女角/2/ 已被前面替换为 /女角/鸣泽美佐子/

// 9. 列表里的 "/女角/${id}/*" 路径
c = c.replace(/\/女角\/\$\{id\}\/\*/g, '/女角/${姓名}/*');

// 10. 镜像迁移示例
c = c.replace(/{ "op": "replace", "path": "\/当前女角\/女角ID", "value": 2 }/g, '{ "op": "replace", "path": "/当前女角/姓名", "value": "鸣泽美佐子" }');
c = c.replace(/{ "op": "replace", "path": "\/场景\/当前女角ID", "value": 2 }/g, '{ "op": "replace", "path": "/场景/当前女角名", "value": "鸣泽美佐子" }');

// 11. `${id}` 为女角ID 1-20 -> `${姓名}` 为女角姓名
c = c.replace(/\$\{id\} 为女角ID 1-20/g, '${姓名} 为女角姓名');

// 12. "通过 WHERE name = 当前女角名 关联" 修复（重复替换）
c = c.replace(/row_id 通过 WHERE name = 当前女角名 关联通过 WHERE name = 当前女角名 关联/g, '通过 WHERE name = 当前女角名 关联');

// 13. 错误示例中的 /当前女角/女角ID 已被替换为 /当前女角/姓名
// 错误示例中的 /女角/3/ 已被替换为 /女角/舞岛可怜/

// 14. INSERT 示例（row_id 保留，name 用真实姓名）
c = c.replace(/INSERT INTO important_npc \(row_id, name, gender/g, 'INSERT INTO important_npc (row_id, name, gender');

fs.writeFileSync(file, c);
console.log('变量输出格式_额外模型.txt OK');
