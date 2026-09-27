import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD_PATH = path.join(__dirname, '飞机杯.json');

const card = JSON.parse(fs.readFileSync(CARD_PATH, 'utf8'));
const entries = card.data.character_book.entries;

const oldSection = `# 输出要求
- 每轮必须更新所有"每轮更新"字段
- 数值变化必须读取当前值后用 replace 输出新值（禁止 delta）
- 新增角色必须先 add 完整对象
- 嵌套对象名：服装/身体部位/生理状态/心理状态/实时状态/互动过程
- 长期跟踪字段在角色对象顶层（扁平）
- 增量更新：有变化才输出，避免臆造数值覆盖未变化字段`;

const newSection = `# 输出要求
- 每轮必须更新所有"每轮更新"字段
- 数值变化必须读取当前值后用 replace 输出新值（禁止 delta）
- 新增角色必须先 add 完整对象
- 嵌套对象名：服装/身体部位/生理状态/心理状态/实时状态/互动过程
- 长期跟踪字段在角色对象顶层（扁平）
- 增量更新：有变化才输出，避免臆造数值覆盖未变化字段
- 首次互动日期格式：YYYY年M月D日（读取顶层日期字段值，禁止用占位符如"2025年X月X日"）
- 关系阶段枚举值：未接触/初识/熟悉/暧昧/心动/亲密/攻略完成/失恋/决裂/疏离（禁止使用枚举外的值，禁止拼接多个阶段如"初识/受孕开始"）`;

if (entries[9].content.includes(oldSection)) {
  entries[9].content = entries[9].content.replace(oldSection, newSection);
  fs.writeFileSync(CARD_PATH, JSON.stringify(card, null, 2), 'utf8');
  console.log('✅ 更新规则已补充：');
  console.log('  - 首次互动日期格式：YYYY年M月D日（读取顶层日期字段值，禁止用占位符）');
  console.log('  - 关系阶段枚举值校验：禁止使用枚举外的值，禁止拼接多个阶段');
} else {
  console.log('❌ 未找到要替换的段落，检查旧内容是否已变化');
  console.log('当前 entries[9].content 前200字:');
  console.log(entries[9].content.slice(0, 200));
}
