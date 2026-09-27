// 阶段条目残留修正：环境味／职业味 → 体味；器官语境的「那里／那道沟」→ 点名器官
import fs from 'fs';
const J = [
  // ── 环境味 / 职业味 → 一律换成人体的味
  ['_data_han_xue.mjs', '，消毒水的味先到', '，她自己身上那股捂了一天的骚味先到'],
  ['_data_han_xue.mjs', '消毒水的味、她自己腿根焖出来的腥味，两股叠在一起', '她自己腿根焖出来的腥味、腋下捂了一天的骚味，两股叠在一起'],
  ['_data_ling.mjs', '葡萄酒的味、她自己的香水味、腿根焖了一天的那股味，三股叠在一起', '她自己的汗味、腿根焖了一天的那股腥味、腋下那股骚味，三股叠在一起'],
  ['_data_xiao_ye.mjs', '凑近了是一股消毒水盖不住的苦味', '凑近了是一股捂了一天的骚臭味'],
  ['_data_xiao_ye.mjs', '一屋子都是蜡和消毒水混出来的味', '一屋子都是她自己那股骚腥味，混着蜡油'],
  ['_data_you_zi.mjs', '让他闻到颈侧的香水', '让他闻到颈侧的汗味'],
  ['_subj_2.mjs', '颈侧的香水让他闻见', '颈侧的汗味让他闻见'],
  ['_data_you_zi.mjs', '身体乳擦到乳房下缘和腿根，擦到那里的时候手会停一下', '洗完拿手把乳房下缘和腿根那层潮气抹开，抹到腿根的时候手会停一下'],
  // ── 器官语境的模糊指代
  ['_data_bai_lu.mjs', '她另一只手一直压在那里，压着压着指头就陷进去', '她另一只手一直压在自己那个屄上，压着压着指头就陷进去'],
  ['_data_lian_nai.mjs', '停的时候手掌还压在那里不动', '停的时候手掌还压在自己那条骚屄缝上不动'],
  ['_data_lian_nai.mjs', '第一次趁睡用手指轻碰他那里，碰到就缩回', '第一次趁睡用手指轻碰他那根鸡巴，碰到就缩回'],
  ['_data_qin_yu.mjs', '摸到前端那里布已经湿了', '摸到前端龟头那块布已经湿了'],
  ['_data_qin_yu.mjs', '阴道口那里水顺着屁股沟淌到桌面上', '阴道口淌出来的水顺着屁股沟淌到桌面上'],
  ['_data_su_mei.mjs', '裙料在那里洇出一小块深色', '腿间那片裙料洇出一小块深色'],
  ['_data_su_qing.mjs', '撸到前端那里布湿了', '撸到龟头那块布湿了'],
  ['_data_you_zi.mjs', '压着乳头，压得那里一下一下地跳', '压着乳头，压得那两个骚奶头一下一下地跳'],
  // ── 冠状沟要点名
  ['_data_hao_jiaqi.mjs', '指尖在那道沟里', '指尖在冠状沟里'],
  ['_subj.mjs', '指尖在那道沟里', '指尖在冠状沟里'],
  // ── 调色盘：胸前那道沟 → 点名奶沟
  ['_palette_data.mjs', '让胸前那道沟留在取景框里', '让胸前那道挤出来的奶沟留在取景框里'],
];
const cache = {};
let total = 0;
for (const [f, a, b] of J) {
  if (!cache[f]) cache[f] = fs.readFileSync('_work/data/' + f, 'utf8');
  const n = cache[f].split(a).length - 1;
  if (!n) { console.log('⚠ 未命中  ' + f + '  「' + a + '」'); continue; }
  cache[f] = cache[f].split(a).join(b);
  total += n;
  console.log('✓ ' + f + '  ' + n + ' 处  ' + a.slice(0, 22));
}
for (const f of Object.keys(cache)) fs.writeFileSync('_work/data/' + f, cache[f], 'utf8');
console.log('共 ' + total + ' 处');
