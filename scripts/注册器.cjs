// 通用注册器：把某几位的 15 个文件注册进 state（order 从 200 起，按位排）
const fs = require('fs');
const path = require('path');
const P = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/tavern-cards-state.json';
const S = JSON.parse(fs.readFileSync(P, 'utf8'));
const 档名 = ['仇视', '厌恶', '排斥', '冷淡', '不反感', '中立', '好感', '喜欢', '依恋', '沦陷', '独占'];

/* 每位分配一段 order：第 idx 位用 200 + idx*40 起 */
const 要注册 = process.argv.slice(2);

const 全部 = Object.keys(S.entryManifest.角色);
/* 找已有的最大 order，往后排 */
let 起点 = 200;
全部.forEach(k => { const o = S.entryManifest.角色[k].position && S.entryManifest.角色[k].position.order; if (o && o > 起点) 起点 = o; });
起点 = Math.ceil(起点 / 40) * 40 + 40;

const 模板 = S.entryManifest.角色['鸣泽唯_基础信息'];

要注册.forEach((位, i) => {
  const 基 = 起点 + i * 40;
  const 词 = [位];
  const 底 = "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2' && matchChatMessages([" + JSON.stringify(词) + "], { start: 0 })";
  const 好变量 = "getvar('stat_data.女角." + 位 + ".好感度', { defaults: 0 })";

  /* 4 个普通条目 */
  [['基础信息', 'basic'], ['性格调色盘', 'personality'], ['三面性', 'other'], ['剧情线', 'other']].forEach(([文件, part], j) => {
    const e = JSON.parse(JSON.stringify(模板));
    e.part = part;
    e.keywords = 词;
    e.abstract = '角色/' + part + '：' + 位 + '_' + 文件;
    e.contents = [{ content: 底 }, { file: '世界书/角色/底座_nanpa2/' + 位 + '/' + 文件 + '.yaml' }];
    e.position.order = 基 + j;
    if (e.strategy) { e.strategy.type = 'selective'; e.strategy.keys = 词; }
    S.entryManifest.角色[位 + '_' + 文件] = e;
  });

  /* 11 档 */
  档名.forEach((名, j) => {
    const lo = [-9999, -80, -60, -40, -20, 0, 1, 21, 46, 71, 96][j];
    const hi = [-81, -61, -41, -21, -1, 0, 20, 45, 70, 95, 9999][j];
    const 条件 = lo === -9999 ? 底 + ' && ' + 好变量 + ' <= -81'
      : hi === 9999 ? 底 + ' && ' + 好变量 + ' >= 96'
        : (lo === 0 && hi === 0) ? 底 + ' && ' + 好变量 + ' === 0'
          : 底 + ' && ' + 好变量 + ' >= ' + lo + ' && ' + 好变量 + ' <= ' + hi;
    const e = JSON.parse(JSON.stringify(模板));
    e.part = 'other';
    e.keywords = 词;
    e.abstract = 位 + ' 好感度档：' + 名;
    e.contents = [{ content: 条件 }, { file: '世界书/角色/底座_nanpa2/' + 位 + '/好感度_' + 名 + '.yaml' }];
    e.strategy = { type: 'constant' };
    e.position.order = 基 + 10 + j;
    S.entryManifest.角色[位 + '_好感度_' + 名] = e;
  });

  console.log('  ✅ ' + 位.padEnd(11) + ' 注册 15 条（order ' + 基 + '~' + (基 + 20) + '）');
});

fs.writeFileSync(P, JSON.stringify(S, null, 2));
console.log('  角色组条目数: ' + Object.keys(S.entryManifest.角色).length);
