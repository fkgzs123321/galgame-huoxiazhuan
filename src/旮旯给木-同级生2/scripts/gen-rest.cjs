// 生成剩余条目：地理层 + 底座世界规则 + 主角 + 男配 + MVU + 终局
// 原则：能从工程文件机械派生的不手写；必须自撰的只写「AI 会错的那部分」

// ── 格式规范化（rules.md：数据库格式优先，用列表和键值对，不用段落）──
function 规范化(t) {
  const L = String(t).split(/\r?\n/);
  let 块缩进 = -1;
  return L.map(l => {
    const 块头 = l.match(/^(\s*)[^#\s][^:]*:\s*[|>][-+]?\s*$/);
    if (块头) { 块缩进 = 块头[1].length; return l; }
    if (块缩进 >= 0) {
      if (l.trim() === '') return l;
      const ind = l.match(/^ */)[0].length;
      if (ind > 块缩进) return l;
      块缩进 = -1;
    }
    const ind = l.match(/^ */)[0].length;
    if (!l.trim() || ind === 0) return l;
    if (/^\s*(-|#|\.\.\.)/.test(l)) return l;
    if (/:\s/.test(l) || /:\s*$/.test(l)) return l;
    if (/^\s*[|>]/.test(l)) return l;
    return ' '.repeat(ind) + '- ' + l.trim();
  }).join('\n');
}

const fs = require('fs');
const path = require('path');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const 源 = path.join(D, '底座_nanpa2');
const EU = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-euphoria';
const 写 = (rel, body) => { const p = path.join(D, '世界书', rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, 规范化(body)); return body.length; };
const 清 = s => s.replace(/\s*——\s*/g, '，').replace(/※（[^）]*）/g, '').replace(/※/g, '')
  .replace(/^.*见\s*`[^`]+\.(md|yaml|txt)`.*$/gm, '').replace(/^\s*定性依据[:：].*$/gm, '')
  .replace(/^\s*（无[^）]*）$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
const 切节 = (t, re) => { const o = new Map(); let cur = null, b = [];
  for (const l of t.split(/\r?\n/)) { const m = l.match(re); if (m) { if (cur) o.set(cur, b.join('\n')); cur = m[1].replace(/（.*?）/g, '').trim(); b = []; } else if (cur) b.push(l); }
  if (cur) o.set(cur, b.join('\n')); return o; };
const 取块 = s => { const m = (s || '').match(/```\s*\n([\s\S]*?)```/); return m ? m[1].trim() : ''; };

let 汇 = [];

// ── 1 地理层 ──
const 速览 = fs.readFileSync(path.join(源, '地理速览.yaml'), 'utf8');
汇.push(['地理速览', 写('地理/地理速览.yaml', 清(速览))]);

const 地区 = 切节(fs.readFileSync(path.join(源, '地理条目.md'), 'utf8'), /^## region · (.+?)\s*$/);
for (const [名, body] of 地区) {
  const code = 取块(body);
  const tail = body.replace(/```[\s\S]*?```/g, '').trim();
  汇.push(['地理/' + 名, 写(`地理/${名}.yaml`, 清(`# ${名}\n\n${code}\n\n${tail}\n`))]);
}

// ── 2 底座世界规则 ──
const 状态表 = fs.readFileSync(path.join(源, '状态表.yaml'), 'utf8');
const 八十八町 = `# 八十八町

八十八町:
  这是什么: |
    日本一个普通的冬天小镇。现实世界，没有超自然。全部角色为成年人。
    他在这个镇上寄住了十年，是镇上的名人（传闻很多）。

  三条世界规则:
    时间是被访问行为消耗的:
      含义: 去一个地方、见一个人，都要花掉三周里的一部分
      落点: 扣「时间.时段进度」，累积超了才推进时段
      为什么重要: 她一天只有五个时段，所以必须取舍
    只能选一个:
      含义: 世界层面只承认一段关系成立
      落点: 同时推多条线，嫉妒值加速；两条互斥线都踩，会触发关系封闭
      注: 这是**世界的性质**。谁能不能绕过它是玩法，卡不解释
    层1 支配者（D0 指令系统）:
      含义: 系统每天发布一条今日指令，程序化提示，不参与叙事
      落点: 指令只推「世界.关卡进度」，绝不碰「她.目的进度」

  地图三功能:
    时间消耗: 每个地点有距离成本，移动扣「时间.时段进度」
    位置关系: 距离 0 同一次出行内 / 1 同区域 / 2 跨区域 / 3 远距离
    遇到人物: (日期, 时段, 地点) → 在场名单，见 人物出现索引 与 第NN天

  距离定义:
    0: 同一次出行内（同一栋建筑的不同房间），不额外消耗
    1: 同区域内移动
    2: 跨区域移动
    3: 远距离（跨町 / 温泉乡）
`;
汇.push(['八十八町', 写('世界观/底座_nanpa2/八十八町.yaml', 八十八町)]);

// 关系封闭（矩阵结论的**表现层**；矩阵本身在 T2 契约，不进 prompt）
const 关系封闭 = `# 关系封闭

关系封闭:
  这是什么: |
    两条互斥的线同时推到一定程度，其中一条会**永久关闭**。
    关掉之后不再有回头路。这是「只能选一个」这条规则真正咬人的地方。

  哪些线互相冲突（15 位女角，共 49 对）:
    最排他的: 筱原泉（与 12 位冲突，全场最高）
    其次: 鸣泽美佐子 / 舞岛可怜 / 野野村美里 / 永岛久美子（各 9 位）
    最不排他的: 安田爱美（0 位）与水野友美（1 位，只和泉冲突）
    ★ 完整的 15×15 逐格矩阵在状态表里，由代码持有。这里只写**封闭之后怎么演**。

  封闭之后:
    - 那条线的人不再出现在她的选项池里
    - 她不会解释为什么，也不会有过渡
    - 已经拿到的关系值留着，但事件不再推进
    - <user> 能感觉到「这条路走不通了」，但说不清是哪一步走错的

  不要做的:
    - 不要在正文里说「这条线锁了」「因为互斥」
    - 不要让她为此道歉或者解释
    - 不要把它写成惩罚，写成**时间不够**的样子
`;
汇.push(['关系封闭', 写('世界观/底座_nanpa2/关系封闭.yaml', 关系封闭)]);

// ── 3 主角 ──
const 主角 = fs.readFileSync(path.join(源, '主角设定.txt'), 'utf8');
汇.push(['主角', 写('角色/主角/基础信息.yaml', 清(主角))]);

// ── 4 男配 ──
const 男配 = 切节(fs.readFileSync(path.join(源, '男配设定.md'), 'utf8'), /^## \d+ · (.+?)\s*$/);
for (const [名, body] of 男配) 汇.push(['NPC/' + 名, 写(`NPC/${名}.yaml`, 清(`# ${名}\n\n${body}\n`))]);

// ── 5 MVU ──
fs.copyFileSync(path.join(源, 'initvar.yaml'), path.join(D, '世界书/变量/initvar.yaml'));
汇.push(['变量 initvar', fs.statSync(path.join(D, '世界书/变量/initvar.yaml')).size]);
// 变量列表 + 更新规则：从 状态表.yaml 机械派生（增长/衰减/阈值 是权威源）
{
  const lists = [], rules = [];
  let 组 = '', 名 = '';
  for (const l of 状态表.split(/\r?\n/)) {
    const g = l.match(/^([\u4e00-\u9fa5]+):\s*$/); if (g) { 组 = g[1]; continue; }
    const n = l.match(/^\s{2}- 名:\s*(.+)$/); if (n) { 名 = n[1].trim(); continue; }
    const v = l.match(/^\s{4}(范围|初值|增长|衰减|周期|阈值|可见|意义|不可逆|类型):\s*(.*)$/);
    if (!v || !名) continue;
    const k = v[1], val = v[2].trim();
    if (k === '意义' || k === '范围' || k === '可见') lists.push(`  ${组}.${名}.${k}: ${val}`);
    if (k === '增长' || k === '衰减' || k === '阈值' || k === '周期') rules.push(`${组}.${名}.${k}: ${val}`);
  }
  const 变量列表 = `# 变量列表\n\n顶层结构:\n${[...new Set(lists.map(l => l.split('.')[0].replace('  ', '')))].map(g => '  ' + g).join('\n')}\n\n变量:\n${lists.join('\n')}\n`;
  const 更新规则 = `# 变量更新规则\n\n规则:\n${rules.join('\n')}\n\n硬约束:\n  单轮变化幅度: 每个数值单轮参考上限 ≤ 5 点（跨时段累积不限）\n  不可逆项: 状态表里标了「不可逆: true」的只增不减\n  清空项: 判定结果、拒绝标记在结算完后清空\n`;
  汇.push(['变量列表', 写('变量/变量列表.yaml', 变量列表)]);
  汇.push(['变量更新规则', 写('变量/变量更新规则.yaml', 更新规则)]);
}
// 输出格式：机制级，直接搬引擎（不含底座内容）
{
  const p = path.join(EU, '世界书/变量/变量输出格式.txt');
  if (fs.existsSync(p)) {
    const t = fs.readFileSync(p, 'utf8');
    const 专 = ['密室', '合欢', '都子', '装置', '乐园', '学园'];
    const hit = 专.filter(w => t.includes(w));
    if (!hit.length) { fs.writeFileSync(path.join(D, 规范化('世界书/变量/变量输出格式.txt')), t); 汇.push(['变量输出格式', t.length]); }
    else 汇.push(['变量输出格式', '⚠ 夹带 ' + hit.join(',') + '，需剥离']);
  }
}

// ── 6 终局 ──
const 终局 = `# 终局

终局:
  触发时点: 第 17 天（01-07）深夜
  判定顺序:
    1. 先看死结局条件（死结局优先于告白）
    2. 都不满足，再看告白：谁的关系阶段与好感最高，就走谁的那条
    3. 都没有达标，落到时间终焉

  五种收束:
    死结局: 由死结局标识决定，触发后不再有告白
    告白成功: 走关系最高的那一位，结局写她自己的生活怎么变
    时间终焉: 十七天过完，什么都没有发生。这是正当结局，不是失败
    她退场: 她的目的进度满了，她关掉游戏，世界停住
    继续: 留一个口子，让下一次开局接得上

  写法:
    - 终局写在正文里，不加标题、不做总结
    - 不预告、不解释这是哪一类结局
    - 她的部分照常写，她不会因为结局改变行为方式
`;
汇.push(['终局', 写('事件/终局.yaml', 终局)]);

console.log('✅ 剩余条目生成完毕');
汇.forEach(([k, n]) => console.log('   ' + k.padEnd(24) + n + ' 字符'));
