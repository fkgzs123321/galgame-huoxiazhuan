// 文风条目改成「手动开关」：默认全关，玩家在酒馆里自己勾；去掉 EJS 门控
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const 目 = path.join(D, '世界书/扮演准则');

/* ── ① 去掉 3 个母猪文件里的 EJS 门控 ── */
for (const f of ['文风_骚妈', '文风_母猪轻', '文风_母猪中', '文风_母猪重', '文风_白洁']) {
  const p = path.join(目, f + '.yaml');
  if (!fs.existsSync(p)) continue;
  let t = fs.readFileSync(p, 'utf8');
  const 前 = t;
  // 去掉开头那行 EJS
  t = t.replace(/^<%_[\s\S]*?_%>\s*\n?/, '');
  // 去掉结尾的 <%_ } _%>
  t = t.replace(/\n?\s*<%_\s*\}\s*_%>\s*$/, '');
  if (t !== 前) { fs.writeFileSync(p, t); console.log('  ✅ 去掉 EJS 门控：' + f); }
  else console.log('  （无 EJS）' + f);
  上顶层(t, f);
}

/* ── ② 「文风取向: xxx」后跟子键的 YAML 问题修掉 ── */
function 上顶层(t, 名) {
  const p = path.join(目, 名 + '.yaml');
  let 行 = t.split(/\r?\n/);
  const 出 = [];
  for (let i = 0; i < 行.length; i++) {
    const m = 行[i].match(/^(\S[^:]*):[ \t]+(\S.*)$/);
    const 下 = 行[i + 1] || '';
    if (m && 下.trim() && /^[ \t]/.test(下) && !下.trim().startsWith('-')) {
      出.push(m[1] + ':');
      出.push('  值: ' + m[2]);
    } else 出.push(行[i]);
  }
  const 新 = 出.join('\n');
  if (新 !== t) fs.writeFileSync(p, 新);
  try { YAML.parse(fs.readFileSync(p, 'utf8')); console.log('     YAML ✅'); }
  catch (e) { console.log('     YAML ⚠ ' + e.message.split('\n')[0].slice(0, 45)); }
}

/* ── ③ 注册：全部 enabled: false ── */
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
const 全 = ['呈现方式', '文风_骚妈', '文风_母猪轻', '文风_母猪中', '文风_母猪重', '文风_白洁'];
const 模板 = (p, o, a) => ({ path: p, scope: 'specific', keywords: [], abstract: a, enabled: false, strategy: { type: 'constant' }, position: { type: 'before_character_definition', order: o } });
S.entryManifest.扮演准则['呈现方式'] = 模板('世界书/扮演准则/呈现方式.yaml', 23, '呈现方式');
S.entryManifest.扮演准则['文风_骚妈'] = 模板('世界书/扮演准则/文风_骚妈.yaml', 24, '文风：骚妈');
S.entryManifest.扮演准则['文风_母猪轻'] = 模板('世界书/扮演准则/文风_母猪轻.yaml', 25, '文风：母猪·轻');
S.entryManifest.扮演准则['文风_母猪中'] = 模板('世界书/扮演准则/文风_母猪中.yaml', 26, '文风：母猪·中');
S.entryManifest.扮演准则['文风_母猪重'] = 模板('世界书/扮演准则/文风_母猪重.yaml', 27, '文风：母猪·重');
S.entryManifest.扮演准则['文风_白洁'] = 模板('世界书/扮演准则/文风_白洁.yaml', 28, '文风：白洁');
fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));
console.log('✅ 6 个文风条目全部 enabled: false（手动开关）');

/* ── ④ 删掉 世界.文风 变量（不需要 EJS 了）── */
const p2 = path.join(D, '世界书/变量/initvar.yaml');
const iv = YAML.parse(fs.readFileSync(p2, 'utf8'));
if (iv.世界 && iv.世界.文风 !== undefined) {
  delete iv.世界.文风;
  fs.writeFileSync(p2, YAML.stringify(iv, { lineWidth: 0 }));
  console.log('✅ 删除变量 世界.文风（不再用 EJS）');
}
