// 修正：熟练度才是「阶段」这个结构唯一的驱动变量
//   1) 阶段.yaml —— 只留熟练度 5 档；删掉「目的进度 3 档」整段（它不该分阶段）
//   2) 主体.yaml —— 补一段「她离目标还有多远」，用**一句话规则**代替原来的 3 档文本
const fs = require('fs');
const path = require('path');
const DIR = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/世界书/角色/屏幕外的她';
const 人 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '郁灼'];

const 新头部 = (名) => `熟练度阶段（★ 一个条目、5 档，条目内 EJS 精准裁剪，只渲染当前那一档）

怎么触发: 她.人设 === '${名}' 时本条目才加载；内部再按 她.熟练度 裁出一档，其余不渲染
熟练度（0~100）: 她运用「手段」的老练度。★ 引擎四处读它 —— 误点概率 / 反抗成功率惩罚（新手 0 → 收官 .4）/ 离线痕迹扫描强度 / 她上线多久
  新手 1~20 ｜ 上手 21~40 ｜ 沉浸 41~60 ｜ 狂热 61~80 ｜ 收官 81~100

★ 这里只有熟练度一个变量。
  目的进度不是阶段 —— 它是一个数，规矩见 主体.yaml 的「她离目标还有多远」。

<% { %>
<%_ const 熟 = getvar('stat_data.她.熟练度', { defaults: 1 }); _%>
`;

const 主体段 = `  她离目标还有多远（★ 这是数，不是阶段）:
    - 她.目的进度 是一个 0~100 的数，按上面「她要拿到什么」那一条涨落
    - ★ 规律只有一条：越接近目标她越急、越舍不得失手；刚起步的时候，她还留着余地
    - 这个数只改变她的心态，不改变她是谁 —— 她的手段和她的身体，永远看她的熟练度
`;

let 阶段改 = 0, 主体改 = 0;
for (const n of 人) {
  // ── 1) 阶段：砍掉目的进度段，换掉头部 ──
  const p1 = path.join(DIR, n, '阶段.yaml');
  let t = fs.readFileSync(p1, 'utf8');
  const i = t.indexOf('【目的进度');
  if (i < 0) { console.log(`⚠ ${n}/阶段.yaml 没找到「【目的进度」`); continue; }
  // 头部到「【熟练度」之间的部分整体替换
  const 熟段起 = t.indexOf('【熟练度 · 只渲染当前这一档】');
  if (熟段起 < 0) { console.log(`⚠ ${n}/阶段.yaml 没找到熟练度段`); continue; }
  let 熟段 = t.slice(熟段起, i).trimEnd();
  // 熟段末尾是熟练度链的 <%_ } _%>；补上块作用域收尾
  if (!/<%_?\s*\}\s*_?%>\s*$/.test(熟段)) console.log(`⚠ ${n}/阶段.yaml 熟练度段结尾异常`);
  const 新 = 新头部(n) + '\n' + 熟段 + '\n<% } %>\n';
  fs.writeFileSync(p1, 新, 'utf8');
  阶段改++;

  // ── 2) 主体：插入「她离目标还有多远」 ──
  const p2 = path.join(DIR, n, '主体.yaml');
  let m = fs.readFileSync(p2, 'utf8');
  if (m.includes('她离目标还有多远')) { console.log(`  ${n}/主体.yaml 已有该段，跳过`); continue; }
  if (!/^  现实干扰:/m.test(m)) { console.log(`⚠ ${n}/主体.yaml 没找到「现实干扰」锚点`); continue; }
  m = m.replace(/^  现实干扰:/m, 主体段 + '  现实干扰:');
  fs.writeFileSync(p2, m, 'utf8');
  主体改++;
}
console.log(`\n阶段文件改 ${阶段改} 个 / 主体文件改 ${主体改} 个`);
