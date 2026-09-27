import fs from 'fs';
const WB = '世界书';
const REM = '_removed/人物拉取重构_20260921';
fs.mkdirSync(REM, { recursive: true });

// ① 阶段边界表搬进 [mvu_plot]阶段骨架
const stageFile = WB + '/[mvu_plot]阶段骨架.txt';
let stage = fs.readFileSync(stageFile, 'utf8').replace(/\s+$/, '');
if (!stage.includes('每个阶段允许到哪一步')) {
  stage += '\n\n## 每个阶段允许到哪一步（照表写，不许跳）\n' +
    '| 场景 | 阶段1 | 阶段2 | 阶段3 | 阶段4 | 阶段5 |\n|---|---|---|---|---|---|\n' +
    '| 擦边诱惑 | ✓ | ✓ | ✓ | ✓ | ✓ |\n' +
    '| 偷拍晨勃 | ✓ | ✓ | ✓ | ✓ | ✓ |\n' +
    '| 假阳具独用 | ✓ | ✓ | ✓ | ✓ | ✓ |\n' +
    '| 趁睡偷抚 | ✗ | ✓ | ✓ | ✓ | ✓ |\n' +
    '| 趁睡口交 | ✗ | ✓ | ✓ | ✓ | ✓ |\n' +
    '| 借口性教育 | ✗ | ✗ | ✓ | ✓ | ✓ |\n' +
    '| 共同洗澡 | ✗ | ✗ | ✓ | ✓ | ✓ |\n' +
    '| 互相检查 | ✗ | ✗ | ✓ | ✓ | ✓ |\n' +
    '| 完整口交 | ✗ | ✗ | ✓ | ✓ | ✓ |\n' +
    '| 完整性交 | ✗ | ✗ | ✗ | ✓ | ✓ |\n' +
    '| 强迫限制 | ✗ | ✗ | ✗ | ✗ | ✓ |\n';
  fs.writeFileSync(stageFile, stage, 'utf8');
  console.log('阶段骨架 加入阶段边界表');
}

// ② [总控]NSFW 里有用的规范并进 [mvu_plot]私密通用规范
const specFile = WB + '/[mvu_plot]私密通用规范.txt';
let spec = fs.readFileSync(specFile, 'utf8').replace(/\s+$/, '');
if (!spec.includes('篇幅与感官')) {
  spec += '\n\n## 篇幅与感官\n' +
    '- 单次性行为描写 ≤ 500 字；共感描写 ≤ 200 字；整段私密内容不超过回复总长的 50%\n' +
    '- 四类感官都要有着落：视觉（肉怎么晃、体液怎么拉丝、皮肉怎么泛红）、触觉（热度与脉动、温度、湿润）、听觉（喘息、心跳、水声、布料的摩擦）、嗅觉（体香、汗、分泌物）\n' +
    '- 群消息里的私密内容必须包在群消息标签内，用文字写照片与视频，不出现真实图片\n\n' +
    '## 共感双向描写的固定骨架\n' +
    '- 用假阳具（正向共感）：她一侧写抵入的温度与充实、摩擦、她以为那是自己「想」出来的；他一侧写莫名被包裹、被吮、被夹紧，不受控地勃起与射精\n' +
    '- 他自慰或性行为（反向共感）：他一侧照常写；她一侧同步感知，引出她的嫉妒、痴迷或当场打断。这是本卡冲突的主要来源\n' +
    '- 群成员分享（群内共感）：各人用符合自己写法的方式在群里描述，这同时是他「察觉群存在」的暗线来源\n\n' +
    '## 底线\n' +
    '- 他的反应必须真实：不是享受，是困惑、恐惧、自我怀疑，不许接受得太快\n' +
    '- 不许连续高潮、不许超生理的体液量、不许美化偷拍与传播隐私\n' +
    '- 不许出现未成年性暗示\n';
  fs.writeFileSync(specFile, spec, 'utf8');
  console.log('私密通用规范 并入篇幅/感官/共感骨架/底线');
}

// ③ 删两个自创调度器 + 12 份剧情线
const del = ['[总控]人物.txt', '[总控]NSFW.txt'];
for (const f of fs.readdirSync(WB)) if (f.endsWith('_独立剧情线.txt')) del.push(f);
let n = 0;
for (const f of del) {
  const a = WB + '/' + f;
  if (!fs.existsSync(a)) { console.log('缺 ' + a); continue; }
  fs.renameSync(a, REM + '/' + f);
  n++;
}
console.log('移出 ' + n + ' 个条目 -> ' + REM);

// ④ D0 去掉两处 getwi
const d0 = WB + '/[mvu_plot]D0系统控制器.txt';
let d = fs.readFileSync(d0, 'utf8');
d = d.replace(/<%\/\* [^\n]*8\. 调用人物总控[\s\S]*?<%- await getwi\('\[总控\]人物'\) %>\n\n/, '');
d = d.replace(/<%\/\* [^\n]*9\. 调用NSFW总控[\s\S]*?<%- await getwi\('\[总控\]NSFW'\) %>\n\n/, '');
d = d.replace(/<%\/\* [^\n]*10-13\. 事件\/剧情\/阶段总控、玩家指令约束 已蓝灯常驻，无需 getwi [^\n]*\/%>/,
  [
    '<%/* ─── 8. 角色档案与私密规范：按 skills 的 scope 规则自己激活，不需要 getwi 调度 ───',
    '   依据 skills 的 requirements/entries-dynamics-style.md：默认 scope = specific（仅相关时激活），',
    '   只在「角色速览 / 地理速览」这类需要全局常驻时才用 catalog。',
    '   本卡：角色速览 ＝ 常驻；各角色的 基础信息（含私密静态）/ 调色盘 / 阶段N ＝ specific + 关键词',
    '   （角色名｜儿子名｜群昵称），由 ST 原生关键词触发，谁出场谁激活。',
    '   事件/剧情/阶段总控与玩家指令约束仍为蓝灯常驻。 */%>',
  ].join('\n'));
d = d.replace('职责：读MVU变量→时间轴推进→getwi[总控]人物/[总控]NSFW（按场景拉角色剧情线）→输出合法性清单',
              '职责：读MVU变量→时间轴推进→输出合法性清单（角色档案按 scope 自行激活，D0 不再 getwi 调度）');
fs.writeFileSync(d0, d, 'utf8');
console.log('D0 剩余 getwi ' + (d.match(/getwi\(/g) || []).length + ' 处');

// ⑤ pack 更新
const pk = '../pack_yumq.mjs';
let p = fs.readFileSync(pk, 'utf8');
p = p.replace("  if (entryName.includes('_独立剧情线')) return '_独立剧情线';\n", '');
p = p.replace("const isCharArchive = entryName.includes('_基础信息') || entryName.includes('_独立剧情线') ||",
              "const isCharArchive = entryName.includes('_基础信息') ||");
p = p.replace(/\/\/ 2\. 独立剧情线：保持关灯[\s\S]*?严禁再注入 @@if（双装饰器会破坏解析）/,
  '// 2. 本卡没有独立剧情线条目：剧情已按阶段下沉到 X_阶段N 的「这一档的戏」');
p = p.replace(/      \/\/ 独立剧情线：保持关灯[\s\S]*?严禁注入 @@if（双装饰器会破坏解析）/,
  '      // 角色档案按 skills 的 scope 规则自己激活（specific + 关键词），无需 getwi');
fs.writeFileSync(pk, p, 'utf8');
console.log('pack 剩余 _独立剧情线 ' + (p.match(/_独立剧情线/g) || []).length + ' 处');
