// 归档旧自定义管线（复制，不删除）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日';
const DEST = path.join(ROOT, '_旧版归档_20260923');

fs.mkdirSync(DEST, { recursive: true });

// 目录整体复制
const dirs = ['draft', 'scripts', 'exports', 'reports'];
for (const d of dirs) {
  const src = path.join(ROOT, d);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, path.join(DEST, d), { recursive: true });
  console.log('归档目录:', d);
}

// 单文件复制
const files = [
  'project.yaml', 'plan.md',
  '系统哥的末日.json', '系统哥的末日.png',
  '系统哥的末日·SQL_v4.3.json', 'SQL_v4.3.json',
  'regex-缝合怪美化·回响v15_6.json',
  '酒馆助手脚本-SP·数据库.json',
  '酒馆助手脚本-【骰子系统】-自动更新.json',
];
for (const f of files) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) { console.log('跳过(无):', f); continue; }
  fs.copyFileSync(src, path.join(DEST, f));
  console.log('归档文件:', f);
}

console.log('\n完成 ->', DEST);
