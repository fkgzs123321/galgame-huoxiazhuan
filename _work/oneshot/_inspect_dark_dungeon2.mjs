// 提取暗黑地牢 MVU 3件套具体内容 + 状态栏 + 脚本结构
import fs from 'fs';

const PNG_PATH = 'src/暗黑地牢/暗黑地牢v2.6.1.png';
const buf = fs.readFileSync(PNG_PATH);

let off = 8;
const chunks = [];
while (off < buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString('ascii', off + 4, off + 8);
  const dataStart = off + 8;
  const dataEnd = dataStart + len;
  chunks.push({ type, len, data: buf.slice(dataStart, dataEnd) });
  if (type === 'IEND') break;
  off = dataEnd + 4;
}

let ccv3Obj = null;
for (const c of chunks) {
  if (c.type === 'tEXt') {
    const kwEnd = c.data.indexOf(0);
    const kw = c.data.toString('ascii', 0, kwEnd);
    const b64 = c.data.toString('ascii', kwEnd + 1);
    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      const obj = JSON.parse(json);
      if (kw === 'ccv3' || kw === 'chara') {
        ccv3Obj = obj;
        break;
      }
    } catch (err) {}
  }
}

const entries = ccv3Obj.data?.character_book?.entries || [];

// 提取3个MVU条目内容
const mvuTargets = ['MVU变量列表', '[mvu_update]变量输出规则', '[mvu_update]变量输出格式'];
for (const target of mvuTargets) {
  const entry = entries.find(e => e.comment === target);
  if (entry) {
    console.log(`\n${'='.repeat(80)}\n【${target}】\n${'='.repeat(80)}`);
    console.log(`enabled=${entry.enabled} | const=${entry.constant} | pos=${entry.position} | depth=${entry.extensions?.depth} | order=${entry.insertion_order}`);
    console.log(`\n--- content (前2000字符) ---\n${(entry.content || '').slice(0, 2000)}`);
    if ((entry.content || '').length > 2000) {
      console.log(`\n--- content 长度: ${entry.content.length} ---`);
    }
  }
}

// 提取一个角色条目看结构
const heroEntry = entries.find(e => e.comment === '人物：女骑士');
if (heroEntry) {
  console.log(`\n${'='.repeat(80)}\n【人物：女骑士】结构示例\n${'='.repeat(80)}`);
  console.log(`enabled=${heroEntry.enabled} | const=${heroEntry.constant} | keys=${JSON.stringify(heroEntry.keys)}`);
  console.log(`\n--- content (前1500字符) ---\n${(heroEntry.content || '').slice(0, 1500)}`);
}

// 查找状态栏相关
console.log(`\n${'='.repeat(80)}\n【状态栏相关】\n${'='.repeat(80)}`);
for (const e of entries) {
  if (e.comment && (e.comment.includes('状态') || e.comment.includes('Status') || e.comment.includes('HTML'))) {
    console.log(`  - ${e.comment} | enabled=${e.enabled} | content长度=${(e.content||'').length}`);
  }
}

// 检查脚本数据
const scripts = ccv3Obj.data?.extensions?.script_storage || ccv3Obj.data?.extensions?.scripts || [];
console.log(`\n${'='.repeat(80)}\n【脚本结构】\n${'='.repeat(80)}`);
console.log('script storage:', JSON.stringify(scripts).slice(0, 500));

// 检查所有 alternate_greetings
console.log(`\n${'='.repeat(80)}\n【开场白 alternate_greetings】\n${'='.repeat(80)}`);
const ag = ccv3Obj.data?.alternate_greetings || [];
console.log(`数量: ${ag.length}`);
for (let i = 0; i < ag.length; i++) {
  const g = ag[i] || '';
  const hasStatus = g.includes('StatusPlaceHolderImpl');
  const hasMvu = g.includes('<UpdateVariable');
  const hasInit = g.includes('initvar') || g.includes('InitVar');
  console.log(`  [${i}] 长度=${g.length} | Status=${hasStatus} | UpdateVar=${hasMvu} | Init=${hasInit} | 前100字符: ${g.slice(0,100).replace(/\n/g,'\\n')}`);
}

// 检查 extensions
console.log(`\n${'='.repeat(80)}\n【extensions 顶层字段】\n${'='.repeat(80)}`);
const ext = ccv3Obj.data?.extensions || {};
console.log('extensions keys:', Object.keys(ext));
if (ext.depth_prompt) console.log('depth_prompt:', JSON.stringify(ext.depth_prompt).slice(0, 500));
if (ext.chat_prompt) console.log('chat_prompt:', JSON.stringify(ext.chat_prompt).slice(0, 500));

// 正则
const regexes = ccv3Obj.data?.character_book?.regex_scripts || ccv3Obj.data?.extensions?.regex_scripts || [];
console.log(`\n--- 正则脚本数量: ${regexes.length} ---`);
for (let i = 0; i < Math.min(regexes.length, 10); i++) {
  const r = regexes[i];
  console.log(`  [${i}] ${r.scriptName || '(无名)'} | findRegex: ${(r.findRegex||'').slice(0,80)}`);
}
