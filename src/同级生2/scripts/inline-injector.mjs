import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const injectorPath = path.join(projectDir, '脚本', '表格模板注入器.txt');
const indexYamlPath = path.join(projectDir, 'index.yaml');

// 读取注入器脚本内容
const injectorContent = fs.readFileSync(injectorPath, 'utf8');

// 读取 index.yaml
let yaml = fs.readFileSync(indexYamlPath, 'utf8');

// 构造新的脚本库条目（10 空格缩进，匹配现有脚本条目格式）
const newEntry = `      # ── 表格模板注入器：raft_13 通用轮子，按钮触发 importTemplateFromData 创建预设 ──
      - 名称: 表格模板注入器
        id: b3f2a1c4-0005-4000-8000-000000000005
        启用: true
        类型: 脚本
        内容: |-
${injectorContent.split('\n').map(l => '          ' + l).join('\n')}
`;

// 定位 Zod 脚本块的结束位置（最后一行 `          });`，即 registerMvuSchema 调用块结束）
// 使用正则匹配，容忍空白差异
const zodEndRe = /\$\(\(\) => \{\s*\n\s*registerMvuSchema\(Schema\);\s*\n\s*\}\);/;
const match = yaml.match(zodEndRe);
if (!match) {
  console.error('ERROR: Could not find Zod script end marker in index.yaml');
  process.exit(1);
}
const zodEndIdx = match.index;
const zodEndMarker = match[0];
const insertPos = zodEndIdx + zodEndMarker.length;

// 检查是否已经插入过（幂等）
const alreadyInserted = yaml.includes('表格模板注入器');
if (alreadyInserted) {
  console.log('Injector entry already exists in index.yaml, skipping.');
  process.exit(0);
}

// 插入新条目（前面加一个空行分隔）
const newYaml = yaml.slice(0, insertPos) + '\n\n' + newEntry + yaml.slice(insertPos);
fs.writeFileSync(indexYamlPath, newYaml, 'utf8');
console.log(`Inlined 表格模板注入器.txt into index.yaml (${injectorContent.split('\n').length} lines)`);
