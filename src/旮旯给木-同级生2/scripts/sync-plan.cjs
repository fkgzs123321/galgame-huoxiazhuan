// 同步创作规划.yaml（skills: 它是项目级事实来源，改动必须先更新它）
//   ① entries 里的「推演链」→「思维链」
//   ② entries 加 5 个文风（默认停用）
//   ③ mvu 段加 2 个 [mvu_update] 条目（配置，不进 entries）
const fs = require('fs');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const P = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/创作规划.yaml';
const o = YAML.parse(fs.readFileSync(P, 'utf8'));

/* ① 改名 */
let 改 = 0;
for (const e of o.entries) {
  if (e && e.name === '推演链') { e.name = '思维链'; if (e.path) e.path = e.path.replace('推演链', '思维链'); 改++; }
}

/* ② 文风进 entries（默认停用） */
const 文风 = ['文风_骚妈', '文风_白洁', '文风_母猪轻', '文风_母猪中', '文风_母猪重'];
const 已有 = new Set(o.entries.map(e => e && e.name));
let 加 = 0;
for (const n of 文风) {
  if (已有.has(n)) continue;
  o.entries.push({
    name: n,
    type: '扮演准则',
    path: '世界书/扮演准则/' + n + '.yaml',
    '默认状态': '停用',
    说明: '文风条，玩家按需开一条。同一时间只开一条',
  });
  加++;
}

/* ③ mvu 段加 [mvu_update] 配置 */
o.mvu = o.mvu || {};
o.mvu['[mvu_update] 提示词条目（配置，非创作条目）'] = {
  说明: '带 [mvu_update] 前缀 → 只发给「负责更新变量的 AI」（额外模型解析开启时生效）。它们不进 entries',
  条目: [
    { name: '[mvu_update]变量输出格式', path: '世界书/变量/变量输出格式.txt', 来源: 'skills 模板（assets/mvu-templates），默认不改' },
    { name: '[mvu_update]选项池输出', path: '世界书/变量/选项池输出.yaml', 用途: '告诉额外模型怎么写 局面.当前选项' },
    { name: '[mvu_update]本卡变量路径', path: '世界书/变量/本卡变量路径.yaml', 用途: '钉死 JSON Patch 的 path 写法（不带 stat_data）' },
  ],
  '★ 为什么单独放这里': '它们是提示词配置，不是创作内容。且必须自包含（额外模型看不到别处），不参与「一处定义」的合并',
};

/* ④ 记一笔本次改动（规划是事实来源，要反映实际状态） */
o['变更记录'] = o['变更记录'] || [];
o['变更记录'].push({
  日期: '2026-09-16',
  内容: [
    '推演链 → 改名 思维链（并精简为八步骨架 + 引用）',
    '新增 5 个文风条目（默认停用，玩家按需开一条）',
    '新增 3 个 [mvu_update] 提示词条目（配置段）',
    '去关卡化：关卡 → 天（含 世界.关卡进度 → 世界.游戏进度）',
    '新增 [mvu_update]选项池输出 / 本卡变量路径（修 path 带 stat_data 的静默失败）',
    '接管选项 UI：大条 + lit + 光泽 + 底部三按钮 + 面板内输入框（不再 prompt）',
    '选项固定四条；叙事四段；回合闭合；三层结构；反抗值涨落写全',
  ],
});

fs.writeFileSync(P, YAML.stringify(o, { lineWidth: 0 }));
console.log('✅ 创作规划.yaml 已同步');
console.log('   改名: ' + 改 + ' 处（推演链 → 思维链）');
console.log('   新增文风: ' + 加 + ' 个（默认停用）');
console.log('   mvu 段: ' + o.mvu['[mvu_update] 提示词条目（配置，非创作条目）'].条目.length + ' 条配置');
console.log('   entries 总数: ' + o.entries.length + '（原 124）');
try { YAML.parse(fs.readFileSync(P, 'utf8')); console.log('   YAML ✅'); } catch (e) { console.log('   ⚠ ' + e.message.split('\n')[0].slice(0, 50)); }
