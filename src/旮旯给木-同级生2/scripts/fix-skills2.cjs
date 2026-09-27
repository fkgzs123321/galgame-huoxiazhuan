// 第二轮审计的整改（依据原文，不看其他卡）
//   ① npc.md:5/7/28/32/34  NPC 不写性格调色盘·三面性·语言规律；只写 1-2 特征；独立文件
//   ② tri-faceted.md:32 / npc.md:50  语料纯净度：只保留纯对话，删掉混入的动作/表情/心理
//   ③ composition.md:99  每个条目写完必须立即注册（找出未注册的文件）
//   ④ rules.md:13  禁止占位符（只清真正的占位符，泛指不算）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const 记 = [];
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

// ── ① 天道新干线：按 npc.md 的结构重写（原来是 2336 字符，含性格调色盘/三面性/语言规律）──
{
  const p = path.join(D, '世界书/NPC/天道新干线.yaml');
  const 新 = `# 天道新干线

基本信息:
  身份: 八十八学园体育老师，33 岁
  与他的关系: 冲突不断。他会当众点名，也会在校务上卡他

外貌特征:
  - 一米八五，肩膀很宽，体育课从来不换鞋，直接穿运动鞋进教室
  - 脖子上挂哨子，说话时习惯用哨子敲讲台

核心关键词: [施压, 当众, 不容置疑]

性格:
  - 点名批评时一定要让全班听见
  - 罚站从不说明理由，只说「你心里清楚」

关系:
  - 对主角：开学第一周就在走廊上叫住他，让他「站到墙边去想清楚」

说话:
  - 「站好了。」
  - 「我不管你有什么理由。」
`;
  fs.writeFileSync(p, 新);
  记.push('① 天道新干线：按 npc.md 重写（2336 → ' + 新.length + ' 字符），删掉性格调色盘/三面性/语言规律');
}

// ── ② 语料纯净度：删掉「语料（…）」这种元叙事行；括注里的动作/表情/心理从语料块剔除 ──
{
  let n = 0, 文件数 = 0;
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(yaml|txt)$/.test(f)) continue;
      let t = fs.readFileSync(p, 'utf8'); const o = t;
      // 元叙事式的语料说明行（给作者看的）
      t = t.replace(/^\s*语料[:：]（[^）]*）\s*$/gm, '');
      t = t.replace(/^\s*语料[:：]\s*\*{0,2}（[^）]*）\*{0,2}\s*$/gm, '');
      // 语料行里的动作/表情/心理括注（tri-faceted.md:32：语料只保留纯对话）
      t = t.split(/\r?\n/).map(l => {
        if (!/^[\s\-•·]*(?:[「『〔]|["“])/.test(l)) return l;
        return l.replace(/（[^）]*(?:笑|皱眉|点头|摇头|转身|低头|看他|看她|顿了|沉默|叹气|抬头)[^）]*）/g, '');
      }).join('\n');
      t = t.replace(/\n{3,}/g, '\n\n');
      if (t !== o) { fs.writeFileSync(p, t); 文件数++; n += (o.length - t.length); }
    }
  })(path.join(D, '世界书'));
  记.push('② 语料纯净度：清理 ' + 文件数 + ' 个文件（省 ' + n + ' 字符）');
}

// ── ③ 找出未注册的内容文件 ──
{
  const 已注册 = new Set();
  for (const [, es] of Object.entries(S.entryManifest))
    for (const [, e] of Object.entries(es)) {
      const f = e.path || ((e.contents || []).find(c => c.file) || {}).file;
      if (f) 已注册.add(f.replace(/\\/g, '/'));
    }
  const 全文件 = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(yaml|txt)$/.test(f)) 全文件.push(path.relative(D, p).replace(/\\/g, '/')); } })(path.join(D, '世界书'));
  const 未注册 = 全文件.filter(f => !已注册.has(f));
  记.push('③ 未注册的内容文件（composition.md:99）：' + (未注册.length ? 未注册.join(' ／ ') : '无 ✓'));
}

// ── ④ 三面性逐个复核（tri-faceted.md:9）——列为待复核，不自动删 ──
{
  const 三面 = Object.keys(S.entryManifest.角色 || {}).filter(k => /_三面性$/.test(k));
  记.push('④ 三面性 ' + 三面.length + ' 位待逐人复核（tri-faceted.md:9「找不出两个压力性质截然不同的场景就不该写」）—— 需你逐个拍板，我不自动删');
}
console.log(记.join('\n'));
