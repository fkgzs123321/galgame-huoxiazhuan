// 定点替换：把「那两团 / 那处 / 那两片 / 那两点 / 那道缝」这类模糊指代换成「器官名＋脏字定语」
// 按角色各自的奶子叫法与屄的叫法分别替换；男根语境单独走规则（不许换错器官）
import fs from 'fs';
import path from 'path';

const DIR = '_work/data';

// 每位角色的器官叫法（奶 / 屄）
const NOUN = {
  hao_jiaqi:   { n: '那两坨 G 杯的肥奶子', v: '那个熟屄' },
  han_xue:     { n: '那两坨奶子', v: '那个臭屄' },
  ling:        { n: '那两坨 K 杯的沉奶子', v: '那个骚逼' },
  su_qing:     { n: '那两坨涨得发沉的奶子', v: '那个骚逼' },
  tao_tao:     { n: '那两坨练出来的奶肉', v: '那个骚逼' },
  you_zi:      { n: '那两只填出来的假奶子', v: '那个黑到发紫的骚逼' },
  qin_yu:      { n: '那两只不大的奶子', v: '那个骚逼' },
  lian_nai:    { n: '那两只奶子', v: '那条骚屄缝' },
  lin_wanqing: { n: '那两坨奶肉', v: '那个屄' },
  bai_lu:      { n: '那两只奶子', v: '那个屄' },
  xiao_ye:     { n: '那两只奶子', v: '那个骚逼' },
  su_mei:      { n: '那两坨老奶子', v: '那个骚逼' },
};
// 角色名 → key（subj 文件里是按中文名分节的）
const NAME2KEY = {
  郝佳期: 'hao_jiaqi', 韩雪: 'han_xue', 铃: 'ling', 苏晴: 'su_qing', 桃桃: 'tao_tao', 柚子: 'you_zi',
  秦雨: 'qin_yu', 怜奈: 'lian_nai', 林婉清: 'lin_wanqing', 白露: 'bai_lu', 小夜: 'xiao_ye', 苏媚: 'su_mei',
};

const ascii = s => s.replace(/^那/, '');

// 规则表：[正则, 生成器(p)]，顺序即优先级
const RULES = [
  // ── 专门语境（先处理，避免误伤）
  [/两片厚、外翻着/g, () => '那两片厚屄唇外翻着'],
  [/那处剃得只剩青茬/g, () => '那个剃得只剩青茬的骚逼'],
  [/那处是生过孩子的熟屄/g, () => '那个生过孩子的熟屄'],
  [/那处熟透的屄/g, () => '那个熟透的屄'],
  [/那处熟屄/g, () => '那个熟屄'],
  [/那处屄/g, p => p.v],
  [/那处黑到发紫的两片厚肉/g, () => '那两片黑到发紫的厚屄唇'],
  [/那处黑到发紫的两片肉/g, () => '那两片黑到发紫的肥屄唇'],
  [/那处是真黑，两片肉厚而外翻/g, () => '那个骚逼是真黑，两片厚屄唇外翻'],
  [/那处干净浅粉，两片屄唇薄而内藏/g, () => '那个屄干净浅粉，两片屄唇薄而内藏'],
  [/那处颜色浅褐、两片肉薄而内藏/g, () => '那个屄颜色浅褐、两片肉薄而内藏'],
  [/那处颜色浅褐、边缘/g, () => '那个屄颜色浅褐、边缘'],
  [/那处颜色重、两片厚屄唇外翻/g, () => '那个骚逼颜色重、两片厚屄唇外翻'],
  [/那处两片薄肉之间的缝/g, () => '那两片薄肉之间那条缝'],
  [/那处分开，拉出一条细丝/g, () => '那两片屄唇分开，拉出一条细丝'],
  [/那处又补了两笔/g, () => '画布上那块又补了两笔'],
  [/那处盖住/g, () => '画布上那块盖住'],
  [/那处上，布面上的颜色/g, () => '那个骚逼压上去，布面上的颜色'],
  [/那处从裤腰里掏出来/g, () => '那根鸡巴从裤腰里掏出来'],
  [/他那处含到腿根发淌/g, () => '他那根鸡巴含到腿根发淌'],
  [/那处照得发亮：缝/g, () => '那个骚逼照得发亮：屄缝'],
  [/那处缝/g, () => '那条屄缝'],
  [/那处的缝/g, () => '那条屄缝'],
  [/那处的湿度/g, p => p.v + '的湿度'],
  // ── 屄的通用
  [/那处/g, p => p.v],
  // ── 奶子
  [/那两团骚奶子/g, () => '那两坨骚奶子'],
  [/那两团奶肉/g, () => '那两坨奶肉'],
  [/那两团乳房/g, p => p.n],
  [/那两团东西/g, p => p.n],
  [/两团东西/g, p => ascii(p.n)],
  [/那两团发红的肉/g, p => p.n],
  [/那两团横铺的肉/g, p => p.n],
  [/两只填出来的圆/g, p => ascii(p.n)],
  [/那两团/g, p => p.n],
  // ── 屄唇 / 奶头 / 缝
  [/那两片厚肉/g, () => '那两片厚屄唇'],
  [/那两片肉/g, () => '那两片骚屄唇'],
  [/那两片/g, () => '那两片骚屄唇'],
  [/那两点/g, () => '那两个骚奶头'],
  [/那道缝把布洇出/g, () => '那条屄缝把布洇出'],
];

let touched = 0, total = 0;
for (const f of fs.readdirSync(DIR).filter(x => /^(_data_.*|_subj(_\d+)?)\.mjs$/.test(x))) {
  const fp = path.join(DIR, f);
  const src = fs.readFileSync(fp, 'utf8');
  let curKey = /^_data_/.test(f) ? f.replace(/^_data_/, '').replace(/\.mjs$/, '') : null;
  const lines = src.split('\n');
  let changed = 0;
  const out = lines.map(l => {
    if (!curKey) {
      const m = l.match(/^  (\S+):\s*\{/);
      if (m && NAME2KEY[m[1]]) curKey = NAME2KEY[m[1]];
    }
    if (!curKey || !NOUN[curKey]) return l;
    const p = NOUN[curKey];
    let nl = l;
    for (const [re, gen] of RULES) {
      re.lastIndex = 0;
      if (!re.test(nl)) continue;
      re.lastIndex = 0;
      nl = nl.replace(re, (...a) => { changed++; return gen(p, ...a); });
    }
    return nl;
  });
  if (changed) { fs.writeFileSync(fp, out.join('\n'), 'utf8'); touched++; }
  total += changed;
  console.log(f + '  替换 ' + changed + ' 处');
}
console.log('共 ' + total + ' 处 / ' + touched + ' 个文件');
