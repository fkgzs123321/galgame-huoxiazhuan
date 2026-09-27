// 按用户要求：文风条目**不加门控、默认全关**（手动开）
//   ① 撤掉刚加的 @@if 场面门控，改回 path 形式
//   ② 全部 enabled:false —— 运行时一条都不进上下文（关闭条目不占预算）
const fs = require('fs');
const path = require('path');
const ROOT = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const P = path.join(ROOT, 'tavern-cards-state.json');
const S = JSON.parse(fs.readFileSync(P, 'utf8'));
const 准则 = S.entryManifest['扮演准则'];

// 所有文风 / 用词类条目：撤门控 + 关
const 全关 = ['文风_骚妈', '文风_母猪_铁律', '文风_母猪_实样', '文风_母猪_词库', '文风_重口', '文风_脏词标准'];
for (const k of 全关) {
  const e = 准则[k];
  if (!e) { console.log('⚠ 缺 ' + k); continue; }
  // 撤门控 → 回到 path 形式
  if (e.contents) {
    const f = e.contents.find(c => c.file);
    e.path = f ? f.file : ('世界书/扮演准则/' + k + '.yaml');
    delete e.contents;
  }
  if (!e.path) e.path = '世界书/扮演准则/' + k + '.yaml';
  e.enabled = false;
  console.log(`· ${k}  关（order=${e.position.order}）  ← ${e.path}`);
}

fs.writeFileSync(P, JSON.stringify(S, null, 2), 'utf8');
console.log('\n文风/用词类条目状态：');
for (const k of Object.keys(准则)) if (/文风|脏词/.test(k)) console.log(`  ${k}: enabled=${准则[k].enabled}  order=${准则[k].position.order}  ${准则[k].path || '(contents形式)'}`);
