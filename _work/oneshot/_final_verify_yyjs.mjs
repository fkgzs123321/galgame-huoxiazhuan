// _final_verify_yyjs.mjs - 怨妇救赎 全量终检（v1.8）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD = path.join(__dirname, 'src', '怨妇救赎');
// 支持纯 JSON 或 PNG 卡（forge pack 产物可能是 PNG 二进制写入 .json 名）
function readCardData(fp) {
  const buf = fs.readFileSync(fp);
  if (buf[0] !== 0x89) return JSON.parse(buf.toString('utf8'));
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const ty = buf.slice(pos + 4, pos + 8).toString('latin1');
    if (ty === 'tEXt') {
      const d = buf.slice(pos + 8, pos + 8 + len);
      const nul = d.indexOf(0);
      if (d.slice(0, nul).toString('latin1') === 'chara') {
        return JSON.parse(Buffer.from(d.slice(nul + 1).toString('latin1'), 'base64').toString('utf8'));
      }
    }
    if (ty === 'IEND') break;
    pos += 12 + len;
  }
  throw new Error('PNG 卡内未找到 chara 数据');
}
const card = readCardData(path.join(CARD, '怨妇救赎.json'));
const entries = card.data.character_book.entries;
const s = JSON.stringify(card);
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗', msg); } };

console.log('══════ 怨妇救赎 v1.8 最终体检 ══════\n');

console.log('【一】内容完整度（历轮需求全部在场）');
ok(entries.some(e => String(e.comment||'').includes('天命之力规则')), '天命之力规则（吸收量×转化率觉醒体系）');
ok(entries.some(e => String(e.comment||'').includes('怨妇铁律')), '怨妇铁律（十律按阶段解锁+角色映射）');
ok(entries.some(e => String(e.comment||'').includes('冲突与法律')), '冲突·伦理·法律机制（公安绝对权威+曝光度+案底）');
ok(entries.some(e => String(e.comment||'').includes('对抗与反制')), '对抗与反制（防一边倒）');
ok(entries.some(e => String(e.comment||'').includes('阶段调度')), '阶段调度（getwi 拉取关灯多阶段）');
ok(entries.some(e => String(e.comment||'').includes('剧情与事件')), '剧情与事件（事件池+危机+丈夫挣扎）');
ok(entries.some(e => String(e.comment||'').includes('追夫火葬场')), '追夫火葬场（八段+复合分支）');
ok(entries.some(e => String(e.comment||'').includes('玩家档案')), '玩家档案（普通人+三面性+NSFW 20cm）');
for (const n of ['林曼云', '苏婉君', '秦月娥', '白芷若', '陈美兰']) {
  ok(entries.filter(e => String(e.comment||'').includes(n)).length >= 3, `${n} 三件套（基础/私密/阶段）`);
  ok(s.includes(`丈夫抵抗: ${({林曼云:90,苏婉君:70,秦月娥:40,白芷若:95,陈美兰:85}[n])}`), `${n} 丈夫抵抗初始值`);
}
ok(['霸权镇压', '后知后觉', '窝囊软抗', '阴谋反噬', '扮猪吃虎'].every(w => s.includes(w)), '五丈夫挣扎流派');
ok(s.includes('天命印记') && !s.includes('红果') && !s.includes('短剧') && !s.includes('女二') && !s.includes('第一集'), '红果/短剧清理（天命印记就位，旧词 0 残留）');
ok(s.includes('吸收量') && s.includes('转化率') && s.includes('掌控值'), '核心变量（吸收量/转化率/掌控值）');
ok(s.includes('丈夫抵抗') && s.includes('曝光度') && s.includes('案底'), '对抗变量（丈夫抵抗/曝光度/案底）');
ok(s.includes('家域') && s.includes('不死定律'), '玩家场域（家域/不死定律）');
ok(s.includes('公安') && s.includes('取证困难'), '法律权威（公安高压线/取证困难）');

console.log('\n【二】灯位结构');
const enabled = entries.filter(e => e.enabled);
const consts = enabled.filter(e => e.constant);
const sels = enabled.filter(e => !e.constant && e.selective);
const off = entries.length - enabled.length;
ok(entries.length === 76, `条目总数 ${entries.length}（期望 76）`);
ok(consts.length === 27, `蓝灯 ${consts.length}（期望 27：思维链为纯关灯可选模板）`);
ok(sels.length === 24, `绿灯 ${sels.length}（期望 24：家庭NPC8+老公两件套16）`);
ok(off === 25, `关灯 ${off}（期望 25：8私密+8阶段+火葬场+思维链模板+InitVar+6分隔符）`);
const offNames = off ? entries.filter(e => !e.enabled).map(e => String(e.comment || e.key)).filter(n => !n.includes('===') && !n.includes('InitVar')) : [];
ok(offNames.length === 18, `关灯业务条目 18 个（${offNames.join(',')}）——8私密+8阶段+火葬场由阶段调度 getwi 拉取，思维链为纯关灯可选模板（不自动拉取）`);

console.log('\n【三】正则脚本');
const rs = card.data.extensions.regex_scripts || [];
ok(rs.length === 7, `正则 ${rs.length} 条（+思维链折叠美化/思维链对AI隐藏）`);
ok(rs.some(r => r.scriptName === '变量更新美化' && !r.promptOnly && r.markdownOnly), '变量更新美化（显示层折叠·闭合块）');
ok(rs.some(r => r.scriptName === '变量更新中美化' && !r.promptOnly && r.markdownOnly), '变量更新中美化（显示层折叠·未闭合块）');
ok(rs.some(r => r.scriptName === '状态栏界面' && r.replaceString && r.replaceString.includes('<body')), '状态栏界面（HTML 内联注入）');
ok(rs.some(r => r.scriptName === '隐藏AI更新变量' && r.promptOnly), '隐藏AI更新变量（AI 侧剥离）');

console.log('\n【四】运行时链路');
ok((card.data.extensions?.tavern_helper?.scripts||[]).some(x=>String(x.name||x.scriptName||'').includes('MVU')), 'MVU 脚本内嵌');
ok(String(card.data.first_mes).includes('<initvar>'), '开场白 initvar 初始化块');
ok(String(card.data.first_mes).includes('<StatusPlaceHolderImpl/>'), '开场白状态栏占位符');
ok(!String(card.data.first_mes).includes('第一集') && !String(card.data.first_mes).includes('红果'), '开场白无短剧腔/红果残留');

console.log('\n【五】体积与基线');
function zh(s2) { return (s2.match(/[\u4e00-\u9fff]/g) || []).length; }
let total = 0; let blueZh = 0;
entries.forEach(e => { const c = String(e.content || '').replace(/<%_?[\s\S]*?_?%>/g, ''); const n = zh(c); total += n; if (e.enabled && e.constant) blueZh += n; });
ok(true, `体积 ${(fs.statSync(path.join(CARD, '怨妇救赎.json')).size / 1024).toFixed(0)}KB | 中文总量 ${total} 字 | 蓝灯常驻 ≈ ${blueZh} token`);

console.log(`\n══════ 结论：${fail === 0 ? '全部通过 ✓' : fail + ' 项未过 ✗'} ══════`);
