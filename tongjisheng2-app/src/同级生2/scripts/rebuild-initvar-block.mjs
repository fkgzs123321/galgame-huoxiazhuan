// 把 initvar.yaml 的完整内容按正确格式（三反引号包裹）嵌入首楼 0.txt
// 格式参考：src/角色卡/隐形守护者/开场白.txt
// 步骤：
//   1. 删除首楼现有的 <UpdateVariable>...</UpdateVariable> 块
//   2. 读取 initvar.yaml，去掉顶层 stat_data: 包装
//   3. 按正确格式重新嵌入
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const greetingPath = path.join(projectDir, '开场白', '0.txt');
const initvarPath = path.join(projectDir, '世界书', '变量', 'initvar.yaml');

// 读取 initvar.yaml
const initvarRaw = fs.readFileSync(initvarPath, 'utf8');

// 去掉顶层 stat_data: 包装（首楼 initvar 块直接是 stat_data 下的字段）
// initvar.yaml 格式：
//   stat_data:
//     # comment
//     时间:
//       当前日期: '12-22'
// 转为：
//   时间:
//     当前日期: '12-22'
const statDataMatch = initvarRaw.match(/^stat_data:\s*\n([\s\S]*)$/);
const initvarBody = statDataMatch ? statDataMatch[1] : initvarRaw;

// 读取首楼
let greeting = fs.readFileSync(greetingPath, 'utf8');

// 删除现有的 <UpdateVariable>...</UpdateVariable> 块（含前后空白）
greeting = greeting.replace(/\n*<UpdateVariable>[\s\S]*?<\/UpdateVariable>\n*/g, '\n\n');

// 在 <UpdateTable> 之前插入新的 initvar 块（按隐形守护者格式：三反引号包裹、空行分隔）
const newBlock = [
  '<UpdateVariable>',
  '',
  '<initvar>',
  '',
  '```yaml',
  initvarBody.trim(),
  '```',
  '',
  '</initvar>',
  '',
  '</UpdateVariable>',
  ''
].join('\n');

// 在 <UpdateTable> 之前插入
if (greeting.includes('<UpdateTable>')) {
  greeting = greeting.replace(/<UpdateTable>/, newBlock + '\n<UpdateTable>');
} else {
  // 兜底：在 <StatusPlaceHolderImpl/> 之前插入
  greeting = greeting.replace(/<StatusPlaceHolderImpl\/>/, newBlock + '\n<StatusPlaceHolderImpl/>');
}

fs.writeFileSync(greetingPath, greeting, 'utf8');
console.log('已重建首楼 initvar 块（三反引号包裹格式）');
console.log('文件:', greetingPath);
