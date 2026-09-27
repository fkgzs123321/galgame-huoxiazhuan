const fs = require('fs');
const filePath = 'src/角色卡/同级生2/开场白/0.txt';
let content = fs.readFileSync(filePath, 'utf8');

// 定位 <initvar> 块内的 yaml 代码块
const initvarStart = content.indexOf('```yaml\n# ════════════════════════════════════════════════════════════\n# 同级生2 initvar.yaml');
if (initvarStart < 0) {
  console.error('未找到 initvar YAML 块');
  process.exit(1);
}

// 找到 yaml 块结束位置（配对的 ``` ）
let yamlEnd = content.indexOf('\n```\n', initvarStart + 10);
if (yamlEnd < 0) {
  console.error('未找到 initvar YAML 块结束');
  process.exit(1);
}

const yamlBlock = content.slice(initvarStart, yamlEnd);
console.log('YAML 块长度:', yamlBlock.length);

// 1. 删除 "stat_data:" 行（及前后空行）
let newBlock = yamlBlock.replace(/\nstat_data:\n/, '\n');

// 2. 将命名空间从 4 空格缩进改为 2 空格缩进
//    匹配行首 2 空格 + 命名空间名 + 冒号（原本是 4 空格在 stat_data 下）
//    实际上原 YAML 是：
//    stat_data:
//      时间:
//        当前日期: '12-22'
//    删除 stat_data 后，时间: 应该是顶层（0 缩进），当前日期: 应该是 2 空格
//    所以需要把所有 4 空格缩进改为 2 空格，把所有 6 空格改为 4 空格...
//    
//    更好的方案：用 YAML 解析重建
const yaml = require('yaml');
// 提取纯 YAML 内容（去掉 ```yaml 标记和结尾 ```）
const yamlContent = yamlBlock.replace(/^```yaml\n/, '').replace(/\n```$/, '');
// 去掉开头的注释行和 stat_data: 包装
const lines = yamlContent.split('\n');
const newLines = [];
let skipStatData = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line === 'stat_data:') {
    skipStatData = true;
    continue;
  }
  if (skipStatData) {
    // stat_data 下的内容，缩进 -2 空格
    if (line.startsWith('  ')) {
      newLines.push(line.slice(2));
    } else if (line.trim() === '' || line.startsWith('#')) {
      // 注释或空行，保持原样但去掉 2 空格前缀（如果有）
      if (line.startsWith('  ')) {
        newLines.push(line.slice(2));
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  } else {
    newLines.push(line);
  }
}
const newYamlContent = newLines.join('\n');

// 解析验证
try {
  const parsed = yaml.parse(newYamlContent);
  const keys = Object.keys(parsed || {});
  console.log('解析成功，顶层命名空间:', keys.join(', '));
  if (keys.includes('stat_data')) {
    console.error('错误：仍包含 stat_data 顶层');
    process.exit(1);
  }
  if (!keys.includes('时间')) {
    console.error('错误：缺少 时间 命名空间');
    process.exit(1);
  }
} catch (e) {
  console.error('YAML 解析失败:', e.message);
  process.exit(1);
}

// 重建块
const newYamlBlock = '```yaml\n' + newYamlContent + '\n```';
const newContent = content.slice(0, initvarStart) + newYamlBlock + content.slice(yamlEnd + 4); // +4 跳过 \n```\n

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('已写入', filePath);
console.log('新文件大小:', newContent.length);
