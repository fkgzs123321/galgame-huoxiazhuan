// 文风收尾：
//   ① 删掉被取代的旧文风（母猪轻/中/重 + 白洁）—— 文件与注册项都删
//   ② 给 5 条文风条目加「场面门控」：只在 NSFW 场面渲染
//      （日常/铺垫走白描，不需要骚妈/母猪；这也正是 skills 说的「style- 按需加载」）
const fs = require('fs');
const path = require('path');
const ROOT = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const P = path.join(ROOT, 'tavern-cards-state.json');
const S = JSON.parse(fs.readFileSync(P, 'utf8'));
const 准则 = S.entryManifest['扮演准则'];

// ── ① 删旧文风 ──
const 旧文件 = ['文风_母猪轻.yaml', '文风_母猪中.yaml', '文风_母猪重.yaml', '文风_白洁.yaml'];
for (const f of 旧文件) {
  const p = path.join(ROOT, '世界书/扮演准则', f);
  if (fs.existsSync(p)) { fs.rmSync(p); console.log('✗ 删文件 ' + f); }
  const k = f.replace('.yaml', '');
  if (准则[k]) { delete 准则[k]; console.log('✗ 删注册项 ' + k); }
}

// ── ② 场面门控 ──
// 判据：场面已经进入 H（体位/留痕 有值），或她的兴奋度已经起来
const 门控 = "@@if getvar('stat_data.局面.场面.体位', { defaults: '' }) !== '' || getvar('stat_data.局面.场面.留痕', { defaults: '' }) !== '' || getvar('stat_data.她.兴奋度', { defaults: 0 }) >= 30";
const 文风条目 = ['文风_骚妈', '文风_母猪_铁律', '文风_母猪_实样', '文风_母猪_词库', '文风_重口'];
for (const k of 文风条目) {
  const e = 准则[k];
  if (!e) { console.log('⚠ 缺 ' + k); continue; }
  // 用 contents 形式：门控 + 文件
  delete e.path;
  e.contents = [{ content: 门控 }, { file: '世界书/扮演准则/' + k.replace(/^文风_/, '文风_') + '.yaml' }];
  // 修正 file 名（条目名与文件名一致）
  e.contents[1].file = '世界书/扮演准则/' + k + '.yaml';
  console.log(`✓ ${k} 加场面门控`);
}

fs.writeFileSync(P, JSON.stringify(S, null, 2), 'utf8');
console.log('\n扮演准则组条目数 =', Object.keys(准则).length);
console.log('文风类条目：');
for (const k of Object.keys(准则)) if (/文风|脏词/.test(k)) console.log(`  ${k}  enabled=${准则[k].enabled}  order=${准则[k].position.order}`);
