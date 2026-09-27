#!/usr/bin/env node
const fs = require('fs');

const HEROINE_NAMES = {
  1: '鸣泽唯', 2: '鸣泽美佐子', 3: '舞岛可怜', 4: '加藤美纪', 5: '筱原泉美',
  6: '南川洋子', 7: '都筑梢江', 8: '水野友美', 9: '安田爱美', 10: '田中美沙',
  11: '片桐美铃', 12: '野野村美里', 13: '永岛久美子', 14: '永岛佐知子', 15: '齐藤澪',
  16: '齐藤澪奈', 17: '铃木美穗', 18: '仁科', 19: '正树夏子', 20: '杉本樱子'
};

const file = 'src/角色卡/同级生2/开场白/0.txt';
let c = fs.readFileSync(file, 'utf8');

// 1. 场景.当前女角ID -> 当前女角名
c = c.replace(/(  )当前女角ID:\s*0/, '$1当前女角名: \'无\'');

// 2. 当前女角.女角ID -> 姓名（顶层缩进2空格）
c = c.replace(/(^当前女角:\s*\n  # ═══ 关系核心（6 个） ═══\n  )女角ID:\s*0/, '$1姓名: \'无\'');

// 3. 女角.'N': -> 女角.'名字':（缩进2空格）
for (const [id, name] of Object.entries(HEROINE_NAMES)) {
  const re = new RegExp(`^(\\s*)'${id}':`, 'gm');
  c = c.replace(re, `$1'${name}':`);
  // 内部 女角ID: N -> 姓名: '名字'（缩进4空格）
  const re2 = new RegExp(`^(\\s*)女角ID:\\s*${id}\\s*$`, 'gm');
  c = c.replace(re2, `$1姓名: '${name}'`);
}

// 4. 注释里的路径引用
c = c.replace(/女角\.\$\{当前女角ID\}\.\*/g, '女角.${当前女角名}.*');

// 5. 注释 "按 女角ID 索引"
c = c.replace(/按 女角ID 索引/g, '按姓名索引');

// 6. 注释示例 "1: { 女角ID: 1, ..."
c = c.replace(/#     (\d+): \{ 女角ID: \d+,/g, (m, id) => `#     ${HEROINE_NAMES[id]}: { 姓名: '${HEROINE_NAMES[id]}',`);

fs.writeFileSync(file, c);
console.log('0.txt OK');
