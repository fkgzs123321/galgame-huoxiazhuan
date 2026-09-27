// 按 skills「一项目一事实来源」合并 _ 段里的重复内容（那三份在 [mvu_plot] 常驻条目里已有全文）
import fs from 'fs';
const F = '世界书/变量/变量更新规则.yaml';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
const L = t.split(/\r?\n/);

// 找到某个 _ 段的起止行
function 段位置(名) {
  const i = L.findIndex(l => new RegExp('^  ' + 名 + ': \\|').test(l));
  if (i < 0) return null;
  let j = i + 1;
  while (j < L.length && (L[j].trim() === '' || /^ {4}/.test(L[j]))) j++;
  return { i, j };  // 内容行 = i+1 .. j-1
}

const 新段 = {
  _party_gate: [
    '    ★ 群周派对邀请门槛（细则见 [mvu_plot]阶段晋升系统）',
    '    两条同时满足才发邀请：① 她的 `阶段` === 5；② 暴露度达标 —— 郝佳期看 `玩家.察觉值.母亲欲望` ≥ 100，其他 11 位看 `群.成员详情.{UID}.暴露度` ≥ 100。',
    '    满足后由苏媚在 `元数据.日数 % 7 == 0` 当天发邀请（写进 `群` 事件）；发出不撤回；她去了之后 `统计.暴露次数` +1，暴露度保持 100 不再回落。',
    '    ★ 你只写上面这几个变量；派对本身的写法与尺度见该条目，不要在这里重复。',
  ],
  _backdoor: [
    '    ★ 弱点后门（三步走的判定与后果见 [mvu_plot]D20对抗判定系统 · 九）',
    '    发现：`后门已发现`=true，`后门进度` +5~+20 ｜ 点破（进度≥60）：只写台词，不改数字 ｜ 使用（进度≥80 且「后门反抗」判定成功）：`后门已利用`=true',
    '    使用成功后给她 `暴露恐惧` -5~-10、`痴迷` +2~+5。',
    '    ★ 反抗成功也不等于他赢，她仍然绝对主导 —— 这条不许因为任何数值而反转。',
  ],
  _ending_rules: [
    '    ★ 结局触发（完整条件与后果表见 [mvu_plot]阶段晋升系统 · 七）',
    '    一旦触发，你只写这三个变量：`阶段守卫.已锁定`=true、`阶段守卫.结局已触发`=true、`阶段守卫.结局类型`={好结局·挣脱|好结局·理性|坏结局·法律|坏结局·暴露|隐藏结局·共生}；此后禁止更新任何阶段变量。',
    '    ★ 高考日终局（`元数据.日数` ≥ `高考日`）当天必判，按 [mvu_plot]阶段晋升系统 · 七 的顺序取第一条满足的。',
    '    暴露风险换算：`玩家.察觉值.群存在` 每 +10 → `群.暴露风险` +5；暴露风险 ≥81 时，下一次现实接触必须写被目击的迹象。',
  ],
};

let 省 = 0;
for (const [名, 行] of Object.entries(新段)) {
  const p = 段位置(名);
  if (!p) { console.log('  ⚠ 没找到 ' + 名); continue; }
  const 旧 = L.slice(p.i + 1, p.j).join('\n').length;
  const 新 = 行.join('\n').length;
  L.splice(p.i + 1, p.j - p.i - 1, ...行);
  省 += 旧 - 新;
  console.log('✓ ' + 名.padEnd(14) + ' ' + 旧 + ' → ' + 新 + ' 字符（省 ' + (旧 - 新) + '）');
}

// _path_rules 的例子压行
{
  const p = 段位置('_path_rules');
  if (p) {
    const 旧行 = L.slice(p.i + 1, p.j);
    const 新行 = [
      '    路径规则（违反则更新失败）',
      '    1. 路径必须与 <status_current_variable> 里的 stat_data 结构完全一致',
      '    2. 不加 /stat_data 前缀：✅ /玩家/学业/成绩　❌ /stat_data/玩家/学业/成绩',
      '    3. 嵌套层级写全：✅ /郝佳期/心理/兴奋　❌ /郝佳期/兴奋',
      '    4. 不自创字段（行为日志、精神值 都不在 schema 里）',
      '    5. 改之前先看 <status_current_variable> 确认这个路径存在',
      '    6. 本卡没有数组。列表类变量一律是字符串（`、` 或 `；` 分隔），只能整串 replace，严禁 add / remove —— add 会被判 SCHEMA 违规、整批作废',
      '    7. `设置.*`（界面开关那一类）由前端维护，你不要写',
      '    8. ★ `群.成员详情` 的键一律用 uid，不许写中文名。写中文名会报「路径不存在」并被跳过：',
      '       su_mei=苏媚｜lin_wanqing=林婉清｜su_qing=苏晴｜han_xue=韩雪｜bai_lu=白露｜tao_tao=桃桃｜lian_nai=怜奈｜you_zi=柚子｜xiao_ye=小夜｜qin_yu=秦雨｜ling=铃',
      '       （郝佳期不在里面，她的数据在顶层：/郝佳期/阶段、/郝佳期/心理/兴奋）',
      '    9. `玩家.证据清单` 是唯一由你写的列表：调查成功时把新证据接在末尾，整串 replace，最多 5 条',
    ];
    const 旧 = 旧行.join('\n').length, 新 = 新行.join('\n').length;
    L.splice(p.i + 1, p.j - p.i - 1, ...新行);
    省 += 旧 - 新;
    console.log('✓ _path_rules     ' + 旧 + ' → ' + 新 + ' 字符（省 ' + (旧 - 新) + '）');
  }
}

fs.writeFileSync(F, L.join(eol), 'utf8');
console.log('\n合计省 ' + 省 + ' 字符');
console.log('新总长：' + fs.readFileSync(F, 'utf8').length + ' 字符');
