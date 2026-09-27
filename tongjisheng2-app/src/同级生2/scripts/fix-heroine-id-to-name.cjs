#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const HEROINE_NAMES = {
  1: '鸣泽唯', 2: '鸣泽美佐子', 3: '舞岛可怜', 4: '加藤美纪', 5: '筱原泉美',
  6: '南川洋子', 7: '都筑梢江', 8: '水野友美', 9: '安田爱美', 10: '田中美沙',
  11: '片桐美铃', 12: '野野村美里', 13: '永岛久美子', 14: '永岛佐知子', 15: '齐藤澪',
  16: '齐藤澪奈', 17: '铃木美穗', 18: '仁科', 19: '正树夏子', 20: '杉本樱子'
};

const file = 'src/角色卡/同级生2/世界书/变量/initvar.yaml';
let content = fs.readFileSync(file, 'utf8');

// 1. 替换场景.当前女角ID -> 当前女角名
content = content.replace(/^(\s*场景:\s*\n\s*当前地点:[^\n]*\n\s*)当前女角ID:\s*0/m, '$1当前女角名: \'无\'');

// 2. 替换当前女角.女角ID -> 当前女角.姓名
content = content.replace(/^(\s*)女角ID:\s*0(\s*#.*)?$/m, '$1姓名: \'无\'$2');

// 3. 替换女角.'N': -> 女角.'名字':
for (const [id, name] of Object.entries(HEROINE_NAMES)) {
  // 替换 "    'N':" -> "    '名字':"
  const re = new RegExp(`^(\\s*)'${id}':`, 'gm');
  content = content.replace(re, `$1'${name}':`);
  // 替换 "      女角ID: N" -> "      姓名: '名字'"
  const re2 = new RegExp(`^(\\s*)女角ID:\\s*${id}\\s*$`, 'gm');
  content = content.replace(re2, `$1姓名: '${name}'`);
}

// 4. 替换注释中的 "女角.${当前女角ID}.*" -> "女角.${当前女角名}.*"
content = content.replace(/女角\.\$\{当前女角ID\}\.\*/g, '女角.${当前女角名}.*');

// 5. 替换注释中的 "1: { 女角ID: 1, ..." -> "鸣泽唯: { 姓名: '鸣泽唯', ..."
content = content.replace(/#     1: \{ 女角ID: 1,/, '#     鸣泽唯: { 姓名: \'鸣泽唯\',');
content = content.replace(/#     20: \{ 女角ID: 20,/, '#     杉本樱子: { 姓名: \'杉本樱子\',');
content = content.replace(/#     (\d+): \{ 女角ID: \d+,/g, (m, id) => `#     ${HEROINE_NAMES[id]}: { 姓名: '${HEROINE_NAMES[id]}',`);

// 6. 注释 "按 女角ID 索引" -> "按姓名索引"
content = content.replace(/按 女角ID 索引/g, '按姓名索引');

// 7. 注释 "被 D0系统控制器.txt 步骤 11.8 互斥检查 / 结局分支矩阵.txt 读取" 不变

fs.writeFileSync(file, content);
console.log('initvar.yaml OK');
