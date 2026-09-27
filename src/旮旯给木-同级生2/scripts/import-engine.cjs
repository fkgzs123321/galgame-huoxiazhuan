// 建世界书目录树 + 只搬「零耦合」的引擎条目（夹带的先不搬，等剥离）
const fs = require('fs');
const path = require('path');
const SRC = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-euphoria';
const DST = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

const 专属 = ['密室', '合欢', '安藤', '莳羽', '葵菜', '白夜', '真中', '帆刈', '乐园计划',
  '鬼畜', '学园篇', '记忆篇', '处刑', '电椅', '监视器', '装置房', '五个人', '密室世界', '底座_euphoria'];

// 目标目录树（按 创作规划.yaml 的 path）
const DIRS = ['世界书/世界观/引擎', '世界书/世界观/底座_nanpa2', '世界书/扮演准则',
  '世界书/时间线/plot', '世界书/地理', '世界书/角色/底座_nanpa2', '世界书/角色/屏幕外的她',
  '世界书/NPC', '世界书/阶段指导', '世界书/事件', '世界书/变量', '正则', '脚本', '开场白/initvar'];
for (const d of DIRS) fs.mkdirSync(path.join(DST, d), { recursive: true });

// 待搬清单（相对 SRC）
const 候选 = [
  ...[...[''],].flatMap(() => ['四态循环', '反抗与判定', '兴奋度机制', '出招', '交互循环', '剧情推进', '边界情况', '离线行动']
    .map(n => `世界书/世界观/引擎/${n}.yaml`)),
  ...['加载纪律', '判定引擎', '推演链', '叙述准则', '感知禁令', '玩家的输入']
    .map(n => `世界书/扮演准则/${n}.yaml`),
  '世界书/阶段指导/阶段指导.yaml',
  ...['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '熟练度阶段']
    .map(n => `世界书/角色/屏幕外的她/${n}.yaml`),
];

const moved = [], blocked = [];
for (const rel of 候选) {
  const src = path.join(SRC, rel);
  if (!fs.existsSync(src)) { blocked.push([rel, '源文件不存在']); continue; }
  const t = fs.readFileSync(src, 'utf8');
  const hit = 专属.filter(w => t.includes(w));
  if (hit.length) { blocked.push([rel, hit.join(',')]); continue; }
  const dst = path.join(DST, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, t);
  moved.push([rel, t.length]);
}

console.log('✅ 已搬入 ' + moved.length + ' 个（零耦合）：');
moved.forEach(([r, n]) => console.log('   ' + r.padEnd(44) + String(n).padStart(6) + ' 字符'));
console.log('\n⛔ 拦住 ' + blocked.length + ' 个（夹带底座内容，**剥离后才能搬**）：');
blocked.forEach(([r, w]) => console.log('   ' + r.padEnd(44) + w));
console.log('\n目录树：');
for (const d of DIRS) console.log('   世界书/… ' + d.replace('世界书/', ''));
