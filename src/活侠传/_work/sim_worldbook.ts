/**
 * 世界书触发模拟器 —— 用真实规则验证「角色能不能被加载」。
 *
 * ★ 为什么需要它：角色条目靠关键词触发，触发不灵**不会有任何报错**，
 *   只是人物静默不出场。所以必须离线把匹配逻辑跑一遍。
 *
 * 模拟酒馆的条目判定（简化但等价）：
 *   constant=true            → 永远加载
 *   constant=false & keys 非空 → selective：扫描最近 N 楼，命中任一 key 才加载
 *   二者都不满足               → 不加载
 *
 * 同时模拟 @@if matchChatMessages([...], { start: N }) 的语义：
 *   start = 0  → 只看当前（第 0 楼）
 *   start = -3 → 往回看 3 楼
 */

import fs from 'node:fs';

interface 条目 {
  comment: string;
  keys: string[];
  constant: boolean;
  selective?: boolean;
  content?: string;
  enabled?: boolean;
}

// ── 读打包产物里的世界书 ──
function 读条目(): 条目[] {
  const raw = fs.readFileSync('src/活侠传/活侠传.png');
  let pos = 8;
  let 内嵌: any = null;
  while (pos < raw.length - 8) {
    const len = raw.readUInt32BE(pos);
    const typ = raw.toString('latin1', pos + 4, pos + 8);
    if (typ === 'tEXt') {
      const data = raw.subarray(pos + 8, pos + 8 + len);
      const z = data.indexOf(0);
      if (data.toString('latin1', 0, z) === 'ccv3') {
        try {
          内嵌 = JSON.parse(Buffer.from(data.toString('latin1', z + 1), 'base64').toString('utf8'));
        } catch { /* */ }
      }
    }
    pos += 12 + len;
  }
  return (内嵌?.data ?? 内嵌).character_book.entries;
}

/**
 * 从条目的 @@if 里解出扫描范围（start）。
 *
 * ★ 正则修正记录：早先写成
 *     /matchChatMessages\([^)]*\)\s*,\s*\{\s*start:\s*(-?\d+)/
 *   它期待「数组后面紧跟右括号」，而真实文本是
 *     matchChatMessages(['唐布衣', '大师兄'], { start: -3 })
 *   —— 右括号在**整个表达式末尾**。于是匹配失败，
 *   又落到 `return 0` 的兜底分支，误报「12 条只扫当前楼」。
 *   修完后用真实产物复验。
 */
function 取扫描范围(条目: 条目): number | null {
  const c = 条目.content ?? '';
  const m = /matchChatMessages\(\s*\[[^\]]*\]\s*,\s*\{\s*start:\s*(-?\d+)/.exec(c);
  if (m) return Number(m[1]);
  // 有 matchChatMessages 但没写 start → 用函数默认（最后 2 楼）
  if (c.includes('matchChatMessages')) return -2;
  return null; // 完全没有 EJS 条件
}

/**
 * 判定一条是否加载。
 * @param 聊天 最近若干楼的消息（序号 0 = 最新）
 */
function 该加载(e: 条目, 聊天: string[]): boolean {
  if (e.enabled === false) return false;
  if (e.constant) return true;
  if (!e.keys?.length) return false;

  // 扫描范围：start 是负数（往回数）；没写就用函数默认（最后 2 楼）
  const start = 取扫描范围(e);
  const 深度 = start === null ? 2 : Math.max(1, Math.abs(start));
  const 看 = 聊天.slice(0, 深度).join('\n');

  return e.keys.some(k => 看.includes(k));
}

// ══════════════════════════════════════════════════════════════
const 条目 = 读条目();

console.log('══ ① @@if 的扫描范围 ══');
let 范围异常 = 0;
for (const e of 条目) {
  const s = 取扫描范围(e);
  if (s !== null) {
    const 结论 = s === 0 ? '★ 只扫当前楼（危险）' : `往回 ${Math.abs(s)} 楼`;
    console.log(`  ${e.comment.padEnd(24)} start=${String(s).padStart(3)}  ${结论}`);
    if (s === 0) 范围异常++;
  }
}
console.log(`  → 共 ${条目.filter(e => 取扫描范围(e) !== null).length} 条带 @@if，其中异常 ${范围异常} 条`);
console.log(范围异常 === 0 ? '  ✓ 扫描范围全部正常' : '  ✗ 有条款只扫当前楼，角色将永不出场');

console.log('\n══ ② 场景模拟：这些聊天记录下，谁会出场？══');
const 场景: Array<[string, string[]]> = [
  ['开局（只有主角）', ['赵活在正心堂醒来。', '师兄问：你名叫赵活，记得吗？']],
  ['提到大师兄', ['赵活站在练功场。', '大师兄蹲在台阶上，手里转着铜钱。']],
  ['提到「二师兄」（不用全名）', ['赵活去炼丹房。', '二师兄说：你手太笨。']],
  ['提到「小师妹」', ['后山靶场。', '小师妹站在那儿，铃铛没响。']],
  ['提到掌门', ['正心堂。', '掌门在堂上说话。']],
  ['只提到外人（不该触发）', ['赵活去了闹市。', '街上有个卖药的。']],
];

for (const [名, 聊天] of 场景) {
  const 加载 = 条目.filter(e => 该加载(e, 聊天)).map(e => e.comment);
  const 人物 = 加载.filter(c => !c.startsWith('变量') && !c.includes('InitVar') && !['加载纪律', '叙述准则', '基调', '唐门与江湖', '性情分档', '第一年', '唐门十二处', '唐门日常', '主角', '角色速览'].includes(c));
  console.log(`\n  【${名}】`);
  console.log(`    常驻: ${加载.length - 人物.length} 条`);
  console.log(`    人物出场: ${人物.length ? 人物.join('、') : '（无）'}`);
}

console.log('\n══ ③ 关键断言 ══');
const 全名 = 条目.filter(e => !e.constant && e.keys.includes('唐布衣'));
const 聊天1 = ['赵活站在练功场。', '大师兄蹲在台阶上，手里转着铜钱。'];
console.log('  用「大师兄」能否触发唐布衣的条目:',
  全名.some(e => 该加载(e, 聊天1)) ? '✓ 能' : '✗ 不能');

const 聊天2 = ['赵活站在练功场。', '街上没什么人。'];
console.log('  无关场景是否误触发唐布衣:',
  全名.some(e => 该加载(e, 聊天2)) ? '✗ 误触发' : '✓ 不触发');

const 聊天3 = ['第1楼', '第2楼', '第3楼', '第4楼', '大师兄出场了'];
console.log('  关键词在 5 楼之前（超出扫描范围）:',
  全名.some(e => 该加载(e, 聊天3)) ? '会加载' : '不加载（符合预期）');

console.log('\n══ ④ 每条的触发关键词总览 ══');
for (const e of 条目.filter(x => !x.constant)) {
  console.log(`  ${e.comment.padEnd(24)} ${e.keys.join(' / ')}`);
}
