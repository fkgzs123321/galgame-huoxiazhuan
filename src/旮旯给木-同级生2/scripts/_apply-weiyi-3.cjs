// 淫视 v2 · 鸣泽唯（第 3 批：把 好感 / 依恋 顶过 2500）
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..', '世界书', '角色', '底座_nanpa2', '鸣泽唯');

const 补 = {
  '好感度_好感.yaml': `  - ★ 她换下的内衣不再直接扔进洗衣篮，会先叠一下再放。叠的时候她自己看一眼那圈细带上的勒痕
  - ★ 他要是晚回来，她把灯留着，人坐在灯底下。灯只照着上半身，家居服领口松着，锁骨往下那一片白全在光里
`,
  '好感度_依恋.yaml': `  - ★ 她会在他面前把校服脱下来换成家居服，不再关门。换的时候她背对着，肩胛骨动一下，薄棉从头上抽出来的时候腰上那一截整条露在外头
  - ★ 他要是伸手把她拦住，她不挣。整个人会软下来一点，往前倾，胸隔着布压在他身上，乳尖先顶着他
  - ★ 她开始用嘴。第一次做的时候牙齿磕了一下，她自己停下来，抬头看他，脸烧着，可没缩回去
`,
};

for (const [名, 插] of Object.entries(补)) {
  const fp = path.join(D, 名);
  let t = fs.readFileSync(fp, 'utf8');
  t = t.replace('她不会做什么（★ 边界的具体表现）:', 插 + '\n她不会做什么（★ 边界的具体表现）:');
  if (名 === '好感度_依恋.yaml') {
    t = t.replace(/^她对你开放到什么程度:.*$/m,
      '她对你开放到什么程度: 她在门口坐到他回来，校服还没换。薄棉校裙被自己坐得收了半掌，裙摆翻上来压不住腿根那圈嫩肉。会自己把手伸过去，会自己先撩起来一点，然后停在那儿等他。撩起来的时候两瓣焖熟屄唇自己分了一线，骚水先淌出来亮了一片，顺着一侧腿根往下爬，她自己低头看见了，脸更红。换了家居服以后她不再关门，弯腰的时候领口整个垂下来，那两团奶肉在布底下坠着晃，浅粉乳尖隔着布顶成两个点。他要是把她拦下来，她整个人会先僵一下再软下去，腰自己塌半截，两条腿并紧又松开。她永远留最后一寸让他主动。');
  }
  fs.writeFileSync(fp, t, 'utf8');
}

console.log('══════ 鸣泽唯 · 全量复验 ══════');
const 目录 = D;
let 达标 = 0, 全 = 0;
for (const f of fs.readdirSync(目录).filter((x) => /\.yaml$/.test(x) && !/\.bak/.test(x)).sort()) {
  const t = fs.readFileSync(path.join(目录, f), 'utf8');
  const 破 = (t.match(/——/g) || []).length;
  const 顿 = t.split('\n').filter((l) => (l.match(/、/g) || []).length >= 2).length;
  const 范围内 = !/三面性|选项池/.test(f);
  const ok = t.length >= 2500 && t.length <= 4500 && !破 && !顿;
  if (范围内) { 全++; if (ok) 达标++; }
  console.log((范围内 ? (ok ? '✅' : '⚠️') : '  ') + ' ' + f.padEnd(24) + String(t.length).padStart(5) + ' 字符  破折号 ' + 破 + '  顿号排比 ' + 顿);
}
console.log('范围内达标 ' + 达标 + ' / ' + 全);
