import fs from 'fs';
import path from 'path';

const PNG_PATH = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/不要玩弄我的鸡吧-forge.png';
const CARD_DIR = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge';

// Read PNG and extract ccv3 tEXt chunk
function readPngCcv3(pngPath) {
  const buf = fs.readFileSync(pngPath);
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'tEXt' || type === 'iTXt') {
      const data = buf.toString('utf-8', offset + 8, offset + 8 + length);
      const nullIdx = data.indexOf('\0');
      const keyword = data.substring(0, nullIdx);
      const text = data.substring(nullIdx + 1);
      if (keyword === 'ccv3') {
        try {
          return JSON.parse(text);
        } catch (e) {
          // try base64
          try {
            return JSON.parse(Buffer.from(text, 'base64').toString('utf-8'));
          } catch (e2) {
            console.error('Failed to parse ccv3 chunk:', e.message, e2.message);
          }
        }
      }
    }
    offset += 8 + length + 4;
  }
  return null;
}

const ccv3 = readPngCcv3(PNG_PATH);
if (!ccv3) {
  console.error('No ccv3 chunk found');
  process.exit(1);
}

const entries = ccv3.data?.character_book?.entries || [];
console.log('Total entries in PNG:', entries.length);

// Build entryPathMap from local files
const wbDir = path.join(CARD_DIR, '世界书');
const localFiles = fs.existsSync(wbDir) ? fs.readdirSync(wbDir).filter(f => f.endsWith('.txt')) : [];
console.log('Local .txt files in 世界书 dir:', localFiles.length);

const prefixes = ['[mvu_plot]', '[mvu_init]', '[mvu_data]', '[mvu_ejs]', '[mvu_global]', '[mvu_control]', '[mvu_util]', '[mvu_stage]', '[mvu_skill]', '[mvu_fui]', '[mvu_npc]', '[mvu_event]', '[mvu_qa]', '[mvu_sys]', '[mvu_rl]', '[mvu_ui]', '[mvu_help]', '[mvu_test]'];

const entryPathMap = {};
for (const f of localFiles) {
  const base = f.replace(/\.txt$/, '');
  entryPathMap[base] = '世界书\\' + f;
}
const manifestKeys = Object.keys(entryPathMap);

function findMatch(comment) {
  if (!comment) return null;
  if (entryPathMap[comment]) return entryPathMap[comment];
  for (const k of manifestKeys) {
    if (k.startsWith(comment) && k.length - comment.length <= 5) return entryPathMap[k];
  }
  for (const pfx of prefixes) {
    const withPfx = pfx + comment;
    if (entryPathMap[withPfx]) return entryPathMap[withPfx];
    for (const k of manifestKeys) {
      if (k === withPfx) return entryPathMap[k];
    }
  }
  for (const pfx of prefixes) {
    if (comment.startsWith(pfx)) {
      const stripped = comment.slice(pfx.length);
      if (entryPathMap[stripped]) return entryPathMap[stripped];
      for (const k of manifestKeys) {
        if (k.startsWith(stripped) && k.length - stripped.length <= 5) return entryPathMap[k];
      }
    }
  }
  for (const pfx of prefixes) {
    const withPfx = pfx + comment;
    const fp = path.join(CARD_DIR, '世界书', withPfx + '.txt');
    if (fs.existsSync(fp)) return '世界书\\' + withPfx + '.txt';
  }
  const fp2 = path.join(CARD_DIR, '世界书', comment + '.txt');
  if (fs.existsSync(fp2)) return '世界书\\' + comment + '.txt';
  if (comment.endsWith('_多阶段')) {
    const name = comment.slice(0, -4);
    const nswName = '[mvu_plot]' + name + '_NSW档案';
    const fp3 = path.join(CARD_DIR, '世界书', nswName + '.txt');
    if (fs.existsSync(fp3)) return '世界书\\' + nswName + '.txt';
  }
  return null;
}

let unmatched = [];
for (const entry of entries) {
  const comment = entry.comment;
  if (!comment) {
    unmatched.push({ comment: '(no comment)', uid: entry.uid });
    continue;
  }
  const relPath = findMatch(comment);
  if (!relPath) {
    unmatched.push({ comment, uid: entry.uid });
  }
}

console.log('\nUnmatched entries:', unmatched.length);
unmatched.forEach(u => {
  console.log(`  uid=${u.uid}  comment="${u.comment}"`);
});

// Also: list entries whose content is suspiciously short or empty
console.log('\nEntries with empty/short content (<10 chars):');
let emptyCount = 0;
for (const entry of entries) {
  if (!entry.content || entry.content.length < 10) {
    console.log(`  uid=${entry.uid}  comment="${entry.comment}"  len=${entry.content?.length || 0}`);
    emptyCount++;
  }
}
console.log('Total empty/short:', emptyCount);
