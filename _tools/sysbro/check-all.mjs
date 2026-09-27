// check-all.mjs · 按 rules-check.md 逐条实现的全覆盖检查器
//   每一条判据都对应 skills 里的原文，不凭印象。
//   用法: node _tools/sysbro/check-all.mjs [--verbose]
import fs from 'node:fs';
import path from 'node:path';

const CARD = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/';
const SKILL = 'E:/Games/写卡/tavern_helper_template/.skills/tavern-cards/references/contents-creation/';
const VERBOSE = process.argv.includes('--verbose');

// ── 词料表（从 craft-05 现场抽，保证与规范同步）──
const craft05 = fs.readFileSync(SKILL + 'presentation-craft-05-词汇规范.md', 'utf8');
const 词料段 = craft05.slice(craft05.indexOf('词料:'), craft05.indexOf('雌性贬低'));
const 标签 = new Set(['形态', '质感', '色态', '功能', '气味', '浓度', '状态', '残留', '畜化', '脏污', '物化', '唇舌', '乳尖乳晕', '子宫', '淫液', '口舌喉', '肉感', '肌肤质感', '妆与淫颜', '行为词根', '用途', '取用', '适用部位', '禁用部位', '词池', '质量关', '密度']);
const 词料集 = new Set();
for (const tok of 词料段.split(/[｜/\n、,，:：]/)) {
  const t = tok.trim().replace(/^[-*·\s]+/, '');
  if (t.length < 2 || t.length > 12) continue;
  if (标签.has(t)) continue;
  if (!/[\u4e00-\u9fa5]/.test(t)) continue;
  if (/^(例如|示例|合格|不合格|正确|错误|用法|注意|说明|理由)/.test(t)) continue;
  词料集.add(t);
}

// ── 黑名单（rules-check.md 原文）──
const 词汇黑名单 = ['似乎', '几乎', '仿佛', '如同', '宛如', '像小兽', '投石入湖', '心湖泛起涟漪', '嘴角微微上扬', '眼中闪过一丝', '陷入极大的恐惧', '万念俱灰'];
const 句式黑名单 = [/不是[^，。]{1,12}，?只是/, /她很(温柔|善良|独立|坚强)/, /目光(停留|停)[^。]{0,6}\d/];
const 假性主体 = ['一个念头', '一股莫名的', '涌了上来', '涌上心头', '这句话戳中', '被一种', '包裹着'];
const 远距离叙事 = ['她感到', '她感觉到', '她意识到', '她对自己说', '她并不知道', '她心里泛起', '在心里蔓延', '蔓延开来', '她明白过来'];
const 翻译腔 = [/被[^，。]{1,8}所/, /对这件事/, /^[^，。]{2,8}，?她至今仍在/, /一种[^，。]{2,8}被她/, /进行了[一二三四五六七八九十]/];
const 元叙事 = ['AI 写作要点', '写作要点', '戏剧用途', '本卡独家', '本卡专属', '核心冲突_', '此处说明', '本文档', '供参考', '写作时注意', '作者注', '注：本条'];
const 跨条目引用 = ['详见', '参见', '配套说明', '对应「', '系列」', '见上文', '见下文', '同上'];

const 四禁 = ['她觉得', '她不知道', '她经常', '她喜欢'];
const 模糊指代 = ['那两团', '那两坨', '那两片', '那两瓣', '那两点', '那道沟', '那道缝', '那处', '那东西'];
const 材质词 = ['奶肉', '乳肉', '腔肉', '尻肉', '臀肉', '腚肉'];

const 器官头 = ['奶子', '奶头', '乳丘', '乳尖', '乳晕', '乳粒', '乳房', '屄', '逼', '屄唇', '尻', '臀', '腚', '屁股', '腿根'];
const 身体反应 = ['夹腿', '洇', '发胀', '抖', '喘', '收紧', '绞', '淌', '黏', '颤'];
const 动作词 = ['伸手', '按住', '扯', '攥', '跪', '推', '抓', '咬', '掐', '掰', '摸', '拍', '压', '拉', '掀', '拧', '甩', '夹', '贴', '蹭', '抵', '勾', '跨', '坐', '趴', '躺', '站', '走', '拿', '放', '放回', '擦', '挤', '按', '解', '扣', '穿', '脱', '拨', '转', '抬', '低'];

// ── 扫文件 ──
const 跳过 = /变量\/(initvar|变量更新规则|变量列表|变量输出格式)/;
const 跳过机制 = /机制\/判定引擎/;   // 引擎代码不是正文
const 词表文件 = /文风\/词料速查/;    // 它本身就是词表与禁则清单，列这些词是它的职责
const files = [];
const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.txt')) out.push(p);
  }
  return out;
};
for (const p of walk(CARD + '世界书')) {
  const rel = path.relative(CARD, p).split(path.sep).join('/');
  if (跳过.test(rel) || 跳过机制.test(rel) || 词表文件.test(rel)) continue;
  files.push(p);
}
for (const p of walk(CARD + '预设')) files.push(p);
for (const p of walk(CARD + '开场白')) files.push(p);

const 违规 = [];
const 统计 = { 破折号: 0, 顿号排比: 0, 词汇黑名单: 0, 句式黑名单: 0, 假性主体: 0, 远距离叙事: 0, 翻译腔: 0, 元叙事: 0, 跨条目引用: 0, 重复片段: 0, 敏感标点: 0 };
const 低词料 = [], 无动作 = [];

for (const p of files) {
  const rel = path.relative(CARD, p).split(path.sep).join('/');
  const raw = fs.readFileSync(p, 'utf8');
  const lines = raw.split('\n');

  // 1 破折号（rules-check 明令 0）
  if (raw.includes('——')) { 统计.破折号++; 违规.push([rel, '破折号', '出现「——」']); }

  // 2 顿号排比（composition.md：禁止「顿号与破折号排比」）
  //   ★ 口径：排比 = 平行短句；纯名词列举不算。且只对正文型条目查（说明文体天然在列举）
  if (/^(角色|NPC|事件|地理|开场白|预设)\//.test(rel)) {
    const 动词 = /[说走看想笑哭要给拿放站坐抱推抓咬问答喊叫打踢扯拽揉捏掐掰跪趴躺摸擦挤压拉掀拧甩夹贴蹭抵勾跨穿脱拨转抬低]/;
    lines.forEach((l, i) => {
      const 段 = l.split('、');
      if (段.length < 3) return;
      const 带动词 = 段.filter((x) => 动词.test(x)).length;
      if (带动词 >= 3) { 统计.顿号排比++; 违规.push([rel + ':' + (i + 1), '顿号排比', l.trim().slice(0, 50)]); }
    });
  }

  // 3~8 黑名单
  const 查 = (arr, 名) => arr.forEach((w) => {
    const hit = typeof w === 'string' ? raw.includes(w) : w.test(raw);
    if (hit) { 统计[名]++; 违规.push([rel, 名, typeof w === 'string' ? w : String(w)]); }
  });
  查(词汇黑名单, '词汇黑名单'); 查(句式黑名单, '句式黑名单'); 查(假性主体, '假性主体');
  查(远距离叙事, '远距离叙事'); 查(翻译腔, '翻译腔'); 查(元叙事, '元叙事'); 查(跨条目引用, '跨条目引用');

  // 9 敏感标点（反引号 / Markdown 粗体 / 星号独占行）
  if (/`/.test(raw) && !/词料速查/.test(rel)) { 统计.敏感标点++; 违规.push([rel, '敏感标点', '反引号']); }
  if (/\*\*/.test(raw) && !/变量输出格式/.test(rel)) { 统计.敏感标点++; 违规.push([rel, '敏感标点', 'Markdown 粗体']); }

  // 10 四禁句式 / 模糊指代 / 材质词（沿用已验证的口径）
  lines.forEach((l, i) => {
    四禁.forEach((w) => { if (l.includes(w)) 违规.push([rel + ':' + (i + 1), '四禁句式', w]); });
    材质词.forEach((w) => {
      let x = -1;
      while ((x = l.indexOf(w, x + 1)) !== -1) {
        if (/词料速查|永不得|禁则|材质词/.test(l)) break;
        const pre = l.slice(Math.max(0, x - 1), x);
        if (/[脏臭腥黑骚烂淫臊馊秽贱雌畜母]/.test(pre)) continue;   /* 带脏字前缀 = 合格 */
        违规.push([rel + ':' + (i + 1), '材质词顶替', w]);
      }
    });
    模糊指代.forEach((w) => {
      let x = -1;
      while ((x = l.indexOf(w, x + 1)) !== -1) {
        const after = l.slice(x + w.length, x + w.length + 14);
        if (/(的)?(疤|门缝|细绳|膜|骨线|横口|文身|印|布|层|里|处|东西|地方|形状|味道|声音|姿势|角度|节奏|手段|裂缝|几秒|分钟|小时)/.test(after)) continue;
        if (/(奶子|奶头|乳丘|乳尖|乳晕|乳粒|屄|逼|尻|臀|腚|屁股|腿根|媚肉|骚|臭|烂|淫)/.test(after)) continue;
        const before = l.slice(Math.max(0, x - 10), x);
        if (/(奶子|奶头|乳丘|乳尖|乳晕|乳粒|屄|逼|尻|臀|腚|屁股|腿根|媚肉|骚|臭|烂|淫)/.test(before)) continue;   /* 器官名在前面也算合格 */
        if (/一律禁止|模糊指代|指代/.test(l)) continue;
        违规.push([rel + ':' + (i + 1), '模糊指代', w + ' → ' + after.slice(0, 12)]);
      }
    });
  });

  // 11 段落自我重复：同一段里 14 字以上的片段不许出现第二次
  const 段 = raw.split(/\n\s*\n/);
  段.forEach((seg, si) => {
    const 片 = [];
    const clean = seg.split('\n').filter((x) => !/<%/.test(x)).join('').replace(/\s+/g, '');
    for (let i = 0; i + 14 <= clean.length; i += 4) 片.push(clean.slice(i, i + 14));
    const seen = new Set(), dup = new Set();
    for (const f of 片) { if (seen.has(f)) dup.add(f); else seen.add(f); }
    if (dup.size) { 统计.重复片段++; 违规.push([rel + ' 第' + (si + 1) + '段', '段落自我重复', [...dup].slice(0, 2).join(' | ')]); }
  });

  // 12 词料命中 + 行为判据（只对「正文型」条目：角色/NPC/事件/地理/世界观）
  if (/^(角色|NPC|事件|地理|世界观)\//.test(rel)) {
    let 命中 = 0;
    for (const w of 词料集) if (raw.includes(w)) 命中++;
    if (命中 < 10) 低词料.push([rel, 命中]);
    const 动作数 = 动作词.filter((w) => raw.includes(w)).length;
    if (动作数 === 0) 无动作.push([rel, 0]);
  }
}

// ── 输出 ──
const pad = (s, n) => String(s).padEnd(n);
console.log('════════════════════════════════════════════════════════');
console.log('rules-check.md 全覆盖检查 · 扫 ' + files.length + ' 个文件');
console.log('════════════════════════════════════════════════════════');
console.log('词料库抽取:', 词料集.size, '个词\n');

console.log('【按判据分类】');
for (const [k, v] of Object.entries(统计)) if (v) console.log('  ' + pad(k, 14) + v);
const 其他 = 违规.filter((v) => !(v[1] in 统计) && v[1] !== '材质词顶替');
const 材质数 = 违规.filter((v) => v[1] === '材质词顶替').length;
const 四禁数 = 违规.filter((v) => v[1] === '四禁句式').length;
const 模糊数 = 违规.filter((v) => v[1] === '模糊指代').length;
if (材质数) console.log('  ' + pad('材质词顶替', 14) + 材质数);
if (四禁数) console.log('  ' + pad('四禁句式', 14) + 四禁数);
if (模糊数) console.log('  ' + pad('模糊指代', 14) + 模糊数);

if (低词料.length) {
  console.log('\n【词料命中 < 10（个位数 = 没在用素材库）】');
  低词料.forEach(([f, n]) => console.log('  ' + pad(n, 4) + f));
}
if (无动作.length) {
  console.log('\n【零个动作的条目（一律重写）】');
  无动作.forEach(([f]) => console.log('  ' + f));
}
if (违规.length) {
  console.log('\n【违规明细' + (VERBOSE ? '' : ' · 前 40') + '】');
  违规.slice(0, VERBOSE ? 999 : 40).forEach(([f, k, d]) => console.log('  ' + pad(k, 14) + pad(f, 46) + d));
  if (!VERBOSE && 违规.length > 40) console.log('  …还有 ' + (违规.length - 40) + ' 条');
}
const 总违规 = 违规.length + 低词料.length + 无动作.length;
console.log('\n' + (总违规 ? '不通过：共 ' + 总违规 + ' 处' : '通过：全部判据 0 违规'));
process.exit(总违规 ? 1 : 0);
