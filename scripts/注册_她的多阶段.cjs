// 把「屏幕外的她」从「一人一条文件」改成「一人九条（主体+熟练度5档+目的进度3档）」
// 全部 constant + EJS 精准门控（同时只有 1 主体 + 1 熟练度档 + 1 目的进度档生效）
const fs = require('fs');
const P = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/tavern-cards-state.json';
const S = JSON.parse(fs.readFileSync(P, 'utf8'));

const 底座 = "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2'";
const 人设 = n => ` && getvar('stat_data.她.人设', { defaults: '' }) === '${n}'`;
const 熟练 = (a, b) => ` && getvar('stat_data.她.熟练度', { defaults: 1 }) >= ${a}` + (b ? ` && getvar('stat_data.她.熟练度', { defaults: 1 }) <= ${b}` : '');
const 目的 = (a, b) => ` && getvar('stat_data.她.目的进度', { defaults: 0 }) >= ${a}` + (b ? ` && getvar('stat_data.她.目的进度', { defaults: 0 }) <= ${b}` : '');

/* order 规划：主体 115-122 / 熟练度 131-170 / 目的进度 171-194 */
const 人 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '郁灼'];
const 熟练档 = [['新手', 1, 20], ['上手', 21, 40], ['沉浸', 41, 60], ['狂热', 61, 80], ['收官', 81, 0]];
const 目的档 = [['起步', 0, 33], ['推进', 34, 66], ['快到', 67, 0]];

const 角色 = S.entryManifest['角色'];
const 要处理 = process.argv.slice(2);
const 名单 = 要处理.length ? 要处理 : 人;

/* 找当前最大 order（避免与已有条目冲突） */
let 起点 = 115;

for (const n of 名单) {
  const idx = 人.indexOf(n);
  if (idx < 0) { console.log('跳过未知：' + n); continue; }

  /* 删掉旧的一条式注册（她_XXX，文件是 屏幕外的她/XXX.yaml） */
  const 旧名 = '她_' + n;
  if (角色[旧名]) { delete 角色[旧名]; console.log('删旧项 ' + 旧名); }

  const 基 = `世界书/角色/屏幕外的她/${n}`;
  const mk = (key, file, order, gate) => {
    角色[key] = {
      scope: 'specific',
      part: 'other',
      keywords: [],
      abstract: `角色/other：${key}`,
      contents: [{ content: 底座 + gate }, { file }],
      enabled: true,
      strategy: { type: 'constant' },
      position: { type: 'after_character_definition', order },
    };
  };

  /* 主体 */
  mk(`她_${n}_主体`, `${基}/主体.yaml`, 115 + idx, 人设(n));

  /* 熟练度 5 档 */
  熟练档.forEach(([名, a, b], i) => {
    mk(`她_${n}_熟练度_${名}`, `${基}/熟练度_${名}.yaml`, 131 + idx * 5 + i, 人设(n) + 熟练(a, b));
  });

  /* 目的进度 3 档 */
  目的档.forEach(([名, a, b], i) => {
    mk(`她_${n}_目的进度_${名}`, `${基}/目的进度_${名}.yaml`, 171 + idx * 3 + i, 人设(n) + 目的(a, b));
  });

  console.log(`已注册 ${n}：主体1 + 熟练度5 + 目的进度3 = 9 条`);
}

fs.writeFileSync(P, JSON.stringify(S, null, 2), 'utf8');
console.log('已写回 state.json；角色组条目数 =', Object.keys(S.entryManifest['角色']).length);
