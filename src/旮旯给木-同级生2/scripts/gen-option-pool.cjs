// ══════════════════════════════════════════════════════════════════
// ① 修完剩余 YAML（值含「: 」/ 缩进处裸标量）
// ② 按 skills 生成选项池 —— 设计（不新增条目，复用现成门控）：
//
//   skills 依据：
//     E4 铁律 ② 所有底座大条目必须走 EJS 段落裁剪，只渲染当前需要的那一段
//     E4 铁律 ③ 单条常驻 ≤ 5,000 字符（config/skills 单条上限）
//     configuration.md:49  EJS 条目在同 part 最多计为 1
//     E4 铁律 3  索引常驻 + 内容触发
//     rules.md  「一个条目只承载一类信息」
//
//   所以 230 条**不能堆一条**，也不该新开 17 条。三层分发：
//     ① 公共池（不涉及人的通用选项）→ 1 条独立小条目（常驻，~700 字符）
//     ② 女角池（每位 8 条）→ 并进该女角的 `NSFW反差与剧情线`，**复用已有的 matchChatMessages 门控**
//     ③ 事件池（按当天剧情锚点）→ 并进 `第NN天`，**复用已有的按天门控**
//   → 新增条目 1 条；每块 ≤ 5,000；零新机制
// ══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');
const 记 = [];

// ── ① YAML 修完 ──
{
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);
  let 修 = 0;
  for (const p of 全) {
    const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    let c = 0;
    const out = L.map(l => {
      const m = l.match(/^(\s*)([^#\s][^:]*):(\s+)(\S.*):\s(.*)$/);
      if (m && m[4].indexOf('"') !== 0 && !/^https?:/.test(m[4])) { c++; return m[1] + m[2] + ': ' + JSON.stringify(m[4] + ': ' + m[5]); }
      return l;
    });
    if (c) { fs.writeFileSync(p, out.join('\n')); 修 += c; }
  }
  let ok = 0; const bad = [];
  for (const p of 全) { try { YAML.parse(fs.readFileSync(p, 'utf8')); ok++; } catch (e) { bad.push(path.basename(p)); } }
  记.push('① YAML 整改：修 ' + 修 + ' 处 → 可解析 ' + ok + '/' + 全.length + (bad.length ? ('（剩 ' + bad.length + '：' + bad.slice(0, 5).join('/') + '）') : ' ✅'));
}

// ── ② 选项池 ──
const 公共 = [
  ['坐在原地不动', 'micro', '这一下不花力气，但时间照走'],
  ['敲敲玻璃', 'micro', '把手按在屏幕上，让她知道你在'],
  ['什么都不做，看着', 'micro', '放弃这一层，交给她'],
  ['走到门口再停下', 'micro', '不出去，只让她看见你想走'],
  ['问她一句', 'mid', '开口问她在干什么'],
  ['装作没看见', 'micro', '把脸转开'],
  ['闭上眼', 'micro', '不看。但听得见'],
  ['去喝水', 'micro', '离开镜头十几秒'],
  ['整理衣服', 'micro', '把皱的地方抚平'],
  ['看窗外', 'micro', '外面在下雪'],
  ['在心里数数', 'micro', '数到几就算几'],
  ['回想她刚才停在哪', 'mid', '调出刚才那两秒'],
  ['找个借口离开', 'mid', '说有事，走一趟'],
  ['伸手去够那个东西', 'strong', '主动伸手'],
  ['咬住不出声', 'strong', '把声音压在喉咙里'],
];
const 女角池 = {
  鸣泽唯: [['叫她一声「唯」', 'mid'], ['问她今天在学校怎么样', 'micro'], ['不叫她，直接走进厨房', 'micro'], ['把她煮的东西吃完', 'mid'], ['提起她八岁那年改口的事', 'strong'], ['让她别管你的事', 'strong'], ['替她挡一次西御寺', 'extreme'], ['把伞留给她，自己淋回去', 'strong']],
  水野友美: [['去图书室找她', 'micro'], ['借走她正在看的那本', 'mid'], ['问她花是给谁的', 'mid'], ['在海岸边叫她', 'strong'], ['把她哭的事说出来', 'strong'], ['装作没看见她在哭', 'mid'], ['拒绝她递来的伞', 'strong'], ['约她去旅行', 'extreme']],
  筱原泉: [['去射箭场看她练习', 'micro'], ['问她短大的事', 'mid'], ['叫她名字不带敬语', 'mid'], ['答应她 28 日那件事', 'strong'], ['在她面前输一次', 'strong'], ['说她在装男人', 'extreme'], ['替她把弓收好', 'mid'], ['公开叫她「泉美」', 'extreme']],
  南川洋子: [['坐上她的后座', 'strong'], ['问她爸那台机车', 'micro'], ['在学校喊她外号', 'mid'], ['陪她去信良家', 'mid'], ['说她「其实很怕一个人」', 'strong'], ['替她挡一次架', 'strong'], ['把她丢下的头盔捡回来', 'mid'], ['在她面前认怂', 'extreme']],
  加藤美纪: [['捡起地上的花瓶碎片', 'micro'], ['摘下她的眼镜', 'extreme'], ['在小卖部买一样东西', 'micro'], ['叫她的名字而不是「同学」', 'strong'], ['在小卖部外等她下班', 'mid'], ['说破她有两副面孔', 'extreme'], ['替她把碎片扫干净', 'mid'], ['问她为什么不说话', 'strong']],
  舞岛可怜: [['去她家楼下等', 'mid'], ['让她多休息', 'micro'], ['问她为什么不常来学校', 'mid'], ['在电视上看她', 'micro'], ['堵在电视台门口', 'strong'], ['让她为了你推掉一次通告', 'extreme'], ['替她拎包', 'mid'], ['在她睡着时走掉', 'strong']],
  杉本樱子: [['去医院看她', 'micro'], ['在树上那次叫她', 'mid'], ['问她窗上的人影是不是她', 'strong'], ['替她带一本书', 'micro'], ['在病房外站一晚上', 'strong'], ['装作她已经不在了', 'lock'], ['把她的死亡误认说出口', 'extreme'], ['在窗下抬头', 'mid']],
  都筑梢: [['在图书室跟她搭话', 'micro'], ['和她打一场网球', 'mid'], ['让她带路', 'micro'], ['在她跑掉后去找她', 'strong'], ['在保健室等她', 'strong'], ['问她躲的人是谁', 'mid'], ['把她藏的地方说出来', 'extreme'], ['不再追她', 'strong']],
  野野村美里: [['在旅行社撞见她', 'micro'], ['问她带的团去哪', 'micro'], ['在周三去如月车站', 'strong'], ['提起她有男朋友', 'strong'], ['在公寓楼下等她', 'mid'], ['让她翘一次班', 'extreme'], ['替她拿一次行李', 'mid'], ['叫她的全名', 'mid']],
  安田爱美: [['在保育园外等她下班', 'mid'], ['替她赶走天道', 'strong'], ['蹲下来和小孩说话', 'micro'], ['问她为什么怕男人', 'strong'], ['圣诞夜扮成圣诞老人', 'mid'], ['在她面前承认你是这一类人', 'extreme'], ['帮她把园区打扫干净', 'mid'], ['不去保育园几天', 'strong']],
  田中美沙: [['去车站接她', 'micro'], ['问她体育大学的事', 'micro'], ['带她去喝一杯', 'mid'], ['送她去车站', 'mid'], ['问她什么时候走', 'strong'], ['在她走之前说一句留下', 'extreme'], ['什么都不说，送她上车', 'strong'], ['把她的东西收好', 'mid']],
  片桐美铃: [['在办公室叫她老师', 'micro'], ['在走廊上拦住她', 'strong'], ['替她把作业交上去', 'micro'], ['在课堂上睡着', 'mid'], ['在下班后等她', 'strong'], ['问她有没有别的身份', 'extreme'], ['把她写给你的东西收起来', 'mid'], ['在毕业前见她一面', 'mid']],
  鸣泽美佐子: [['早上把早餐吃完', 'micro'], ['去《憩》坐一下午', 'mid'], ['替她关一次店', 'strong'], ['问她十年怎么撑下来的', 'strong'], ['在她数钱睡着时给她披衣服', 'mid'], ['叫她一声「妈」', 'extreme'], ['把西御寺的事告诉她', 'strong'], ['深夜让她帮你洗一次背', 'extreme']],
  永岛佐知子: [['去如月神宫找她', 'mid'], ['在旅馆大厅等她', 'micro'], ['问她女儿的事', 'strong'], ['替久美子解一次围', 'strong'], ['把电话里那件事说清', 'extreme'], ['在温泉边让开', 'mid'], ['不去旅馆几天', 'strong'], ['叫她老板娘', 'mid']],
  永岛久美子: [['在 88 公园帮她解围', 'strong'], ['收留她一晚', 'mid'], ['问她为什么不回家', 'strong'], ['陪她在镇上走一圈', 'micro'], ['送她去车站', 'strong'], ['把她留下', 'extreme'], ['说「你该回去」', 'strong'], ['在她睡着时关灯', 'micro']],
};
const 事件池 = {
  1: [['在图书室和她撞上', 'micro'], ['捡起教室的花瓶碎片', 'micro'], ['在保育园外看天道', 'mid'], ['去旅行代理店', 'micro'], ['和洋子打一次架', 'mid']],
  2: [['扶起快被车撞到的园儿', 'strong'], ['在场口站住', 'micro'], ['把爱美的名字记住', 'mid'], ['不去保育园', 'micro'], ['把这件事告诉别人', 'mid']],
  3: [['平安夜待在自宅', 'micro'], ['去《憩》', 'mid'], ['一个人出门走', 'mid'], ['在电话里听她说话', 'micro'], ['买一份礼物', 'strong']],
  4: [['和梢打一场网球', 'mid'], ['去演剧部仓库', 'mid'], ['在 ATARU 买录影带', 'strong'], ['扮成圣诞老人', 'extreme'], ['什么都不做', 'micro']],
  5: [['去学校看看', 'micro'], ['在自宅躺一天', 'micro'], ['去商业区', 'micro'], ['给谁打个电话', 'mid'], ['把账单算一遍', 'mid']],
  6: [['去 ATARU', 'mid'], ['去电影院', 'mid'], ['去旅馆', 'strong'], ['留在自宅', 'micro'], ['在车站坐到天黑', 'micro']],
  7: [['去学校', 'micro'], ['去高台', 'mid'], ['在镇上闲逛', 'micro'], ['去找某一个人', 'strong'], ['一个人待到深夜', 'micro']],
  8: [['去学校查那件事', 'strong'], ['去白蛇池公园', 'mid'], ['不追梢', 'strong'], ['把碎片的事说出去', 'extreme'], ['装作不知道', 'micro']],
  10: [['去跨年', 'mid'], ['一个人在家', 'micro'], ['去旅馆', 'mid'], ['在神社等到零点', 'strong'], ['早睡', 'micro']],
  11: [['收留久美子', 'strong'], ['去市民医院', 'strong'], ['让她帮你洗背', 'extreme'], ['把久美子送回去', 'mid'], ['不接这个电话', 'micro']],
  12: [['陪久美子在镇上走', 'mid'], ['去西御寺家', 'strong'], ['去芳树家', 'mid'], ['在旅馆等她', 'mid'], ['在自宅等消息', 'micro']],
  13: [['去游园地解围', 'strong'], ['去电影院', 'mid'], ['去游乐中心', 'mid'], ['在旅馆大厅出现', 'strong'], ['不去', 'micro']],
  14: [['在 88 公园出手', 'strong'], ['和佐知子碰面', 'strong'], ['回客厅', 'micro'], ['在公园外站着', 'mid'], ['带久美子回镇上', 'extreme']],
  15: [['去高台听告白', 'extreme'], ['拒绝裕子的邀约', 'strong'], ['在房间里等她', 'mid'], ['熄灯装睡', 'mid'], ['去洋子家', 'micro']],
  16: [['把该办的事办完', 'mid'], ['给每个人打一个电话', 'strong'], ['一个人走一遍全镇', 'mid'], ['坐在《憩》', 'micro'], ['早点睡', 'micro']],
  17: [['上屋顶', 'extreme'], ['去保健室', 'strong'], ['去图书室', 'strong'], ['去保育园', 'strong'], ['在自宅等', 'mid']],
};

// ① 公共池 → 1 条独立小条目
{
  const y = ['公共选项池:', '  这是什么: 不涉及具体人的通用选项。求交集后不够三到四个时用它补', '  用法: 按当前情境选合适的，改措辞，不改等级', '  池子:'];
  for (const [t, lv, 注] of 公共) y.push('    - 文本: ' + t + '\n      等级: ' + lv + '\n      注: ' + 注);
  fs.writeFileSync(path.join(WB, '世界观/底座_nanpa2/公共选项池.yaml'), y.join('\n') + '\n');
  记.push('② 公共池：1 条独立条目，' + 公共.length + ' 条选项');
}
// ② 女角池 → 并进各女角的 NSFW反差与剧情线（复用 matchChatMessages 门控）
{
  let n = 0, 位 = 0;
  for (const [名, 池] of Object.entries(女角池)) {
    const p = path.join(WB, '角色/底座_nanpa2', 名, 'NSFW反差与剧情线.yaml');
    if (!fs.existsSync(p)) continue;
    let t = fs.readFileSync(p, 'utf8');
    if (t.includes('她的选项池')) continue;
    const seg = ['', '她的选项池:', '  用法: 她摆选项时，涉及她本人的从这一节取；改措辞，不改等级'];
    for (const [x, lv] of 池) seg.push('    - ' + x + '（' + lv + '）');
    fs.writeFileSync(p, t.trimEnd() + '\n' + seg.join('\n') + '\n');
    n += 池.length; 位++;
  }
  记.push('② 女角池：' + 位 + ' 位 × 各 8 条 = ' + n + ' 条，并进各自 `NSFW反差与剧情线`（复用 matchChatMessages 门控）');
}
// ③ 事件池 → 并进 第NN天（复用按天门控）
{
  let n = 0, 天 = 0;
  for (const [d, 池] of Object.entries(事件池)) {
    const dd = String(d).padStart(2, '0');
    const p = path.join(WB, '时间线/plot', '第' + dd + '天.yaml');
    if (!fs.existsSync(p)) continue;
    let t = fs.readFileSync(p, 'utf8');
    if (t.includes('当日选项池')) continue;
    const seg = ['', '  当日选项池:'];
    for (const [x, lv] of 池) seg.push('    - ' + x + '（' + lv + '）');
    fs.writeFileSync(p, t.trimEnd() + '\n' + seg.join('\n') + '\n');
    n += 池.length; 天++;
  }
  记.push('② 事件池：' + 天 + ' 天 × 各 5 条 = ' + n + ' 条，并进 `第NN天`（复用按天门控）');
}
console.log(记.join('\n'));
console.log('② 选项池合计：' + (公共.length + Object.values(女角池).reduce((a, b) => a + b.length, 0) + Object.values(事件池).reduce((a, b) => a + b.length, 0)) + ' 条');
