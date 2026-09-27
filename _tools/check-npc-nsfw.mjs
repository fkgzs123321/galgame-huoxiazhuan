// NPC 条目 NSFW 落笔判据扫描器 —— 只按词表捞线索，判定人工
// 用法: node check-npc-nsfw.mjs <NPC目录>
import fs from 'fs';
import path from 'path';

const dir = process.argv[2];
if (!dir) { console.error('用法: node check-npc-nsfw.mjs <NPC目录>'); process.exit(1); }

// 体面词黑名单（出现即线索：可能=体面词顶替器官）
const TIDY = ['有分寸的曲线', '曲线', '身段匀称', '丰满', '凹凸有致', '曼妙', '优美'];
// 四句式禁用
const BANNED = ['她觉得', '她不知道', '她经常', '她喜欢', '她不觉得', '她自己不知道'];
// 器官词（出现即计主语线索）
const ORGAN = /骚奶子|肥奶子|奶子|骚奶头|奶头|肥尻|骚尻|臀|两瓣|乳沟|腰|大腿|腿根|后颈|手腕|下唇|锁骨|肩|膝盖|皮肤|血管|指腹|指甲/;
// 「她/她的」开头的描写句线索
const SHE = /她(的|)(做|怎么|怎么说话|怎么)/;

const files = fs.readdirSync(dir).filter(f => f.endsWith('.yaml'));
let allPass = true;
const tidyHitsAll = [], sheHitsAll = [], organCount = {};

for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = raw.split(/\r?\n/);
  // 身段节内容（多行块）
  const segStart = lines.findIndex(l => l.trim().startsWith('身段:'));
  const body = segStart >= 0 ? lines.slice(segStart + 1).filter(l => l.startsWith('    ') || l.trim() === '').join('\n') : '';
  const hits = { tidy: [], banned: [], sheLines: 0, organLines: 0 };
  for (const w of TIDY) if (raw.includes(w)) hits.tidy.push(w);
  for (const w of BANNED) if (raw.includes(w)) hits.banned.push(w);
  for (const l of body.split('\n')) {
    if (ORGAN.test(l)) hits.organLines++;
    if (/她\s*(坐|走|站|蹲|弯|抬|攥|捻|摸|咬|递|低头|仰|把)/.test(l)) hits.sheLines++; // 行为句允许，只列线索
  }
  organCount[f] = (raw.match(/骚奶子|肥奶子|骚奶头|肥尻|骚尻/g) || []).length;
  const flag = (hits.tidy.length || hits.banned.length) ? '⚠' : '·';
  if (hits.tidy.length || hits.banned.length) allPass = false;
  console.log(flag, path.basename(f), '| 身段节器官主语句:', hits.organLines, '| 脏器官词全条目:', organCount[f], hits.tidy.length ? '| 体面词⚠: ' + hits.tidy.join(',') : '', hits.banned.length ? '| 四句式⚠: ' + hits.banned.join(',') : '');
}
console.log(allPass ? '── 词表扫描无命中（判定仍需人工眼读动作链/重样/主语占比）' : '── 有命中，逐条人工复核');
