// 逐角色终检表里「可数但还没跑」的几条
import fs from 'node:fs';
import path from 'node:path';

const CARD = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/';
const SKILL = 'E:/Games/写卡/tavern_helper_template/.skills/tavern-cards/references/contents-creation/';

// 词料库（从 craft-05 现场抽）
const c5 = fs.readFileSync(SKILL + 'presentation-craft-05-词汇规范.md', 'utf8');
const 段 = c5.slice(c5.indexOf('词料:'), c5.indexOf('雌性贬低'));
const 标签 = new Set(['形态', '质感', '色态', '功能', '气味', '浓度', '状态', '残留', '畜化', '脏污', '物化', '唇舌', '乳尖乳晕', '子宫', '淫液', '口舌喉', '肉感', '肌肤质感', '妆与淫颜', '行为词根', '用途', '取用', '适用部位', '禁用部位', '词池', '质量关', '密度']);
const 词料 = new Set();
for (const t0 of 段.split(/[｜/\n、,，:：]/)) {
  const t = t0.trim().replace(/^[-*·\s]+/, '');
  if (t.length < 2 || t.length > 12 || 标签.has(t) || !/[\u4e00-\u9fa5]/.test(t)) continue;
  if (/^(例如|示例|合格|不合格|正确|错误|用法|注意|说明|理由)/.test(t)) continue;
  词料.add(t);
}

// 环境味黑名单（终检表：气味段只写体味）
const 环境味 = ['松节油', '消毒水', '旧书页', '香水', '皂香', '皂角', '焚香', '茶香', '颜料', '咖啡香', '烟草味', '香水味', '粉底', '花露水', '洗衣液', '洗洁精'];

const 名单 = ['苏婉', '陈雪华', '林雅芝', '王秀兰', '赵敏', '孙莉', '周慧敏', '吴琼', '郑秀', '沈梦瑶'];
let 通过 = 0, 失败 = 0;
const t = (名, ok, d) => { if (ok) { 通过++; console.log('  [OK]   ' + 名 + (d ? '  ' + d : '')); } else { 失败++; console.log('  [FAIL] ' + 名 + (d ? '  ' + d : '')); } };

console.log('═══ 一、词料命中 ≥ 12 / 档（终检表的门槛是 12，不是 10）═══');
for (const w of 名单) {
  const p = CARD + '世界书/角色/' + w + '/多阶段.txt';
  const raw = fs.readFileSync(p, 'utf8');
  let 命中 = 0;
  for (const k of 词料) if (raw.includes(k)) 命中++;
  t(w + ' 多阶段', 命中 >= 12, 命中 + ' 命中');
}

console.log('\n═══ 二、句长（长句要铺到 50~80 字，那是下限）═══');
for (const w of 名单) {
  const raw = fs.readFileSync(CARD + '世界书/角色/' + w + '/多阶段.txt', 'utf8');
  const 句 = raw.split(/[。；\n]/).map((s) => s.replace(/^[\s\-：:]+/, '').trim()).filter((s) => s.length > 0 && !/^<%|%>$|^阶段|^她是谁|^本档/.test(s));
  const 长 = 句.filter((s) => s.length >= 50).length;
  const 最长 = Math.max(...句.map((s) => s.length));
  t(w + ' 有 50 字以上的长句', 长 >= 3, '长句 ' + 长 + ' 条 / 最长 ' + 最长 + ' 字');
}

console.log('\n═══ 三、气味只写体味（无环境味 / 物件味）═══');
{
  const 坏 = [];
  for (const dir of ['世界书/角色', '世界书/NPC']) {
    const d = CARD + dir;
    if (!fs.existsSync(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const files = e.isDirectory() ? fs.readdirSync(path.join(d, e.name)).map((f) => path.join(d, e.name, f)) : [path.join(d, e.name)];
      for (const f of files) {
        const rel = path.relative(CARD, f).split(path.sep).join('/');
        const txt = fs.readFileSync(f, 'utf8');
        环境味.forEach((w0) => { if (txt.includes(w0)) 坏.push(rel + ' → ' + w0); });
      }
    }
  }
  t('没有环境味/物件味', 坏.length === 0, 坏.slice(0, 5).join(' | '));
}

console.log('\n═══ 四、行为判据：每个模块有「她做了什么 → 身体什么变化 → 弄完又干什么」═══');
for (const w of 名单) {
  const raw = fs.readFileSync(CARD + '世界书/角色/' + w + '/多阶段.txt', 'utf8');
  // 收尾动作：独有触发那一栏必须有具体动作
  const 独 = (raw.match(/独有触发: ([^\n]*)/g) || []).length;
  const 有动作的独 = (raw.match(/独有触发: [^\n]*(伸|按|抓|擦|摸|挤|掐|抠|跪|推|拽|捏|掰|握|放|拉|收|摆|转|扣|拎|捡|拧|蹭|贴|压|扯|掀|甩|抵|勾|叠|塞|换|看|站|念|咬|泡|关|开|扯|挽|抖|摘|戴|收|撕|写|折|端|倒|系|解|穿|脱|拨|踩|跺|夹|抽|顶|压|抱|扶|捶|敲|拍|怼|蹲|爬|躺|靠|贴|转|划|刮|掀|扯|洗|盖|停|练|发|补|用|答|拂|合|翻|掩)/g) || []).length;
  t(w + ' 每档的收尾都有具体动作', 独 >= 7 && 有动作的独 === 独, 独 + ' 档 / 有动作 ' + 有动作的独);
}

console.log('\n' + '='.repeat(56));
console.log('通过 ' + 通过 + ' / 失败 ' + 失败);
