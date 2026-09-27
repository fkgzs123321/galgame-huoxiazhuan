// 把「屏幕外的她」从 9 条/人 合并成 2 条/人：
//   主体（人设）        order 29~36
//   阶段（熟练度5档+目的进度3档，条目内 EJS 裁剪） order 37~44
// order 归位到 机制层规范.md 的 T1 状态层（20-49）
const fs = require('fs');
const path = require('path');
const P = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/tavern-cards-state.json';
const DIR = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/世界书/角色/屏幕外的她';
const S = JSON.parse(fs.readFileSync(P, 'utf8'));

const 人 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '郁灼'];
const 底座 = "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2'";
const 人设 = n => ` && getvar('stat_data.她.人设', { defaults: '' }) === '${n}'`;

const 角色 = S.entryManifest['角色'];
const 要处理 = process.argv.slice(2);
const 名单 = 要处理.length ? 要处理 : 人;
let 删注册 = 0, 删文件 = 0;

for (const n of 名单) {
  const idx = 人.indexOf(n);
  if (idx < 0) { console.log('跳过未知：' + n); continue; }
  const 目录 = path.join(DIR, n);

  // 1) 删掉旧的 9 条注册
  for (const k of Object.keys(角色)) {
    if (k === `她_${n}` || k.startsWith(`她_${n}_熟练度_`) || k.startsWith(`她_${n}_目的进度_`) || k === `她_${n}_主体`) {
      delete 角色[k]; 删注册++;
    }
  }

  // 2) 删掉拆开的 8 个文件（熟练度×5 + 目的进度×3）
  const 旧文件 = [
    ...['新手', '上手', '沉浸', '狂热', '收官'].map(x => `熟练度_${x}.yaml`),
    ...['起步', '推进', '快到'].map(x => `目的进度_${x}.yaml`),
  ];
  for (const f of 旧文件) {
    const p = path.join(目录, f);
    if (fs.existsSync(p)) { fs.rmSync(p); 删文件++; }
  }

  // 3) 注册 2 条
  const mk = (key, file, order) => {
    角色[key] = {
      scope: 'specific', part: 'other', keywords: [],
      abstract: `角色/other：${key}`,
      contents: [{ content: 底座 + 人设(n) }, { file }],
      enabled: true,
      strategy: { type: 'constant' },
      position: { type: 'after_character_definition', order },
    };
  };
  mk(`她_${n}_主体`, `世界书/角色/屏幕外的她/${n}/主体.yaml`, 29 + idx);
  mk(`她_${n}_阶段`, `世界书/角色/屏幕外的她/${n}/阶段.yaml`, 37 + idx);

  const 余 = fs.readdirSync(目录);
  console.log(`${n}: 主体=${29 + idx} 阶段=${37 + idx} ｜ 目录剩 [${余.join(', ')}]`);
}

fs.writeFileSync(P, JSON.stringify(S, null, 2), 'utf8');
console.log(`\n删注册 ${删注册} 条 / 删文件 ${删文件} 个`);
console.log('角色组条目数 =', Object.keys(角色).length);
