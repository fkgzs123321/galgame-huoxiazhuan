// 一次性脚本：把 欲妈群/正则/状态栏.html 改造成「值用宏 · JS 只管交互」
// 做法：① 原文件的 <style> / ICON / 常量表 / DEFAULT_STAT / 头部函数 / 行动段 全部【原样切片复用】
//       ② body 由 JS 渲染改成静态 HTML + {{format_message_variable::stat_data.…}}
//       ③ render() 变成 别名 → 同步()（只填宏算不出来的派生值 + 管显隐）
import fs from 'fs';

const P = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/正则/状态栏.html';
const SRC = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/_work/oneshot/_状态栏.html.bak'; // ★ 源始终取改前备份，保证可重复生成
const raw = fs.readFileSync(SRC, 'utf8');
if (!raw.includes('\r\n')) console.warn('⚠ 原文件不含 CRLF');
const EOL = '\r\n';

/* ── 从原文件原样切片 ── */
const 切 = (起, 止) => { const a = raw.indexOf(起), b = raw.indexOf(止); if (a < 0 || b < 0 || b <= a) throw new Error('切片失败: ' + 起); return raw.slice(a, b); };
const STYLE = 切('<style>', '</style>');
const ICON_SRC = raw.match(/var ICON=\{[\s\S]*?\n\};/)[0];
const ICON = new Function(ICON_SRC + '\nreturn ICON;')();
let 头 = 切('/* ====== lodash 兜底', '/* ====== 渲染 ====== */');
let 尾 = 切('/* ====== 行动：跑骰并写变量 ====== */', '\n})();');

/* ── ① 补回被 E3 重写弄丢的 DC表（历史原值：_work/oneshot/_opt_zhudui.mjs） ── */
头 = 头.replace(/(var 基础要求=[^\n]*\n)/, '$1var DC表={"微":12,"中":15,"强":18,"极":22};   /* DC 表：每条选项的等级 → DC（E3 重写时漏掉，这里补回） */' + EOL);
/* ── ② S 加 模板 字段（存原始 innerHTML，用于宏未被 ST 替换时回填） ── */
头 = 头.replace('结果:""};', '结果:"",模板:""};');

/* ── ③ 尾：修 doRoll 里 var S 遮蔽全局 S 的致命 bug ──
   doRoll 内部 `var S=Math.max(5,Math.min(95,...))` 把全局状态对象 S 遮蔽成了数字，
   于是 `S.结果=…` / `S.source=…` 在 "use strict" 下直接 TypeError →
   判定结果永远写不出来、点了没反应。把局部那个数字改名为 率，全局 S 恢复。 */
const 换率 = [
  ['var S=Math.max(5,Math.min(95,Math.round(50+D)));', 'var 率=Math.max(5,Math.min(95,Math.round(50+D)));'],
  ['var 成功=(V<S);', 'var 成功=(V<率);'],
  ['成功率:S, 掷值:V', '成功率:率, 掷值:V'],
  ['" ｜ 成功率 "+S+"% ｜ 掷出 "+V', '" ｜ 成功率 "+率+"% ｜ 掷出 "+V'],
  ['"　成功率"+S+"%　掷"', '"　成功率"+率+"%　掷"']
];
换率.forEach(([a, b]) => {
  if (!尾.includes(a)) throw new Error('doRoll 遮蔽修复：没找到 ' + a);
  尾 = 尾.split(a).join(b);
});
/* 同样是 E3 重写丢掉的两个量：等级（doRoll 已无此入参）与 backOk（后门反抗是否得手）。
   backOk 的语义由它自己的用法反推：isBack 且 后门进度≥80 且 判定成功。 */
const 补量 = [
  ['    var hBack=num(h.后门进度,0);', '    var hBack=num(h.后门进度,0);' + EOL + '    var 等级="";   /* 旧版 doRoll 收 等级 入参，E3 重写后没传 —— 这里兜底，避免 ReferenceError 打断判定 */'],
  ['    var 说明=(isBack&&backOk)', '    var backOk=isBack&&hBack>=80&&(综合==="大成功"||综合==="成功");' + EOL + '    var 说明=(isBack&&backOk)']
];
补量.forEach(([a, b]) => {
  if (!尾.includes(a)) throw new Error('doRoll 补量失败：没找到 ' + a);
  尾 = 尾.split(a).join(b);
});

/* ── ④ 尾：refresh / 可能重绘 改成走 补模板()+同步() ── */
if (!尾.includes('if(showBusy){ render(); }')) throw new Error('refresh 开头没找到');
尾 = 尾.replace('if(showBusy){ render(); }', '/* 宏渲染：静态骨架已在 HTML 里，不再需要 busy 占位重绘 */');
尾 = 尾.replace('  loadTheme(); render();', '  loadTheme(); 补模板(); 同步();');
if (!尾.includes('补模板(); 同步();')) throw new Error('refresh 结尾没替换掉');
const 旧重绘 = raw.slice(raw.indexOf('function 可能重绘(强制){'), raw.indexOf('/* ① 酒馆事件 */'));
const 新重绘 = [
  'function 可能重绘(强制){',
  '  /* ★ 先重读变量再比指纹：原来拿旧 S.stat 比，变量改了但指纹没变就不重绘 —— 这正是「面板不跟着更新」的一个原因 */',
  '  try{ var st=readStat(); if(st) S.stat=st; }catch(e){}',
  '  var f=指纹取();',
  '  if(强制 || f!==指纹){',
  '    指纹=f;',
  '    try{ loadTheme(); 补模板(); 同步(); }catch(e){ console.warn("[欲妈群] 重绘失败",e); }',
  '  }',
  '}',
  ''
].join(EOL);
if (!尾.includes(旧重绘)) throw new Error('可能重绘 没匹配上');
尾 = 尾.replace(旧重绘, 新重绘);

/* ══════════ 宏 ══════════ */
const M = p => '{{format_message_variable::stat_data.' + p + '}}';
const 刻 = a => (a || []).map(x => '<span class="mk" style="left:' + x + '%"></span>').join('');
const lab = (名, 路径, 色, 刻度) =>
  '<div class="lab"><span style="flex:0 0 52px">' + 名 + '</span>' +
  '<span class="bar"><i style="width:' + M(路径) + '%;background:' + 色 + '"></i>' + 刻(刻度) + '</span>' +
  '<b>' + M(路径) + '</b></div>';
const 条 = (iid, 路径, 色, 刻度) =>
  '<span class="bar"><i' + (iid ? ' id="' + iid + '"' : '') + ' style="width:' + M(路径) + '%;background:' + 色 + '"></i>' + 刻(刻度) + '</span>';
const 卡 = (ico, 标题, 标签) =>
  '<div class="card"><div class="card-hd">' + ICON[ico] + '<span>' + 标题 + '</span>' + (标签 || '') +
  '<button class="hd-btn" data-act="refresh">✦</button></div><div class="card-bd">';
const 签 = t => '<span class="tag">' + t + '</span>';

/* ══════════ 成员表 ══════════ */
const 成员 = [
  ['hao_jiaqi', null],
  ['su_mei', '群.成员详情.su_mei'], ['lin_wanqing', '群.成员详情.lin_wanqing'], ['su_qing', '群.成员详情.su_qing'],
  ['han_xue', '群.成员详情.han_xue'], ['bai_lu', '群.成员详情.bai_lu'], ['tao_tao', '群.成员详情.tao_tao'],
  ['lian_nai', '群.成员详情.lian_nai'], ['you_zi', '群.成员详情.you_zi'], ['xiao_ye', '群.成员详情.xiao_ye'],
  ['qin_yu', '群.成员详情.qin_yu'], ['ling', '群.成员详情.ling']
];
const 名路 = u => (u === 'hao_jiaqi' ? null : '群.成员详情.' + u + '.姓名');
const 阶路 = u => (u === 'hao_jiaqi' ? '郝佳期.阶段' : '群.成员详情.' + u + '.阶段');
const 级路 = u => (u === 'hao_jiaqi' ? '郝佳期.群等级' : '群.成员详情.' + u + '.等级');

/* ══════════ 成员格子 ══════════ */
let 格子 = '';
成员.forEach(([u]) => {
  格子 += '<div class="mem" id="d-mem-' + u + '" data-uid="' + u + '"><span class="dot" id="d-dot-' + u + '"></span>' +
    '<div class="nm">' + (u === 'hao_jiaqi' ? '郝佳期' : M('群.成员详情.' + u + '.姓名')) + '</div>' +
    '<div class="sub">阶段' + M(阶路(u)) + ' · Lv.' + M(级路(u)) + '</div></div>';
});

/* ══════════ 详情块 ══════════ */
function 详情(u) {
  if (u === 'hao_jiaqi') {
    return '<div class="detail" id="d-det-hao_jiaqi" data-detail="hao_jiaqi">' +
      '<h4>郝佳期 · 主线</h4>' +
      '<div class="row"><span class="k">绑定</span><span class="v">' + M('假阳具.绑定目标') + '</span></div>' +
      '<div class="row"><span class="k">暴露度</span>' + 条('', '玩家.察觉值.母亲欲望', 'var(--c-danger)', [100]) +
      '<span class="v">' + M('玩家.察觉值.母亲欲望') + '<span class="pill hot" id="d-party-hao_jiaqi" hidden>群P已达标</span></span></div>' +
      '<div class="row"><span class="k">群P门槛</span><span class="v" style="font-weight:400">阶段' + M('郝佳期.阶段') + '/5 · 暴露' + M('玩家.察觉值.母亲欲望') + '/100</span></div>' +
      '<div class="row"><span class="k">后门</span>' + 条('', '郝佳期.后门进度', 'var(--c-danger)', [60, 80]) +
      '<span class="v">' + M('郝佳期.后门进度') + '</span></div>' +
      '<div class="row"><span class="k">弱点</span><span class="v"><span class="pill">' + M('郝佳期.后门类型') + '</span>' +
      '<span class="pill" id="d-bds-hao_jiaqi">未发现</span>' +
      '<span class="pill danger" id="d-bdu-hao_jiaqi" hidden>已利用</span></span></div>' +
      '<div class="thought">' + M('郝佳期.后门描述') + '</div>' +
      '<div class="thought">' + M('郝佳期.心理.此刻想法') + '</div></div>';
  }
  const p = '群.成员详情.' + u;
  return '<div class="detail" id="d-det-' + u + '" data-detail="' + u + '" hidden>' +
    '<h4>' + M(p + '.姓名') + ' · ' + M(p + '.角色') + '</h4>' +
    '<div class="row"><span class="k">儿子</span><span class="v">' + M(p + '.儿子名') +
    '<span class="pill hot" id="d-son-' + u + '" hidden>在场</span></span></div>' +
    '<div class="row"><span class="k">阶段</span>' + 条('d-sbar-' + u, p + '.阶段', 'var(--c-primary-strong)') +
    '<span class="v">' + M(p + '.阶段') + ' / 5 · 第<span id="d-days-' + u + '">1</span>天</span></div>' +
    '<div class="g2">' +
    lab('兴奋', p + '.兴奋', 'var(--c-primary-strong)') + lab('润滑', p + '.润滑', 'var(--c-primary)') +
    lab('罪恶感', p + '.罪恶感', 'var(--c-love)') + lab('痴迷', p + '.痴迷', 'var(--c-primary-strong)') +
    lab('勇气', p + '.勇气', 'var(--c-warn)') + lab('暴露恐惧', p + '.暴露恐惧', 'var(--c-warn)') +
    '</div>' +
    '<div class="row"><span class="k">与儿子</span><span class="v">亲密' + M(p + '.关系.亲密度') + ' · 信任' + M(p + '.关系.信任度') + ' · 边界' + M(p + '.关系.边界') + '</span></div>' +
    '<div class="row"><span class="k">累计</span><span class="v" style="font-weight:400">假阳具' + M(p + '.统计.假阳具使用') + ' · 偷抚' + M(p + '.统计.偷抚次数') + ' · 诱导' + M(p + '.统计.诱导射精') + ' · 暴露' + M(p + '.统计.暴露次数') + '</span></div>' +
    '<div class="row"><span class="k">暴露度</span>' + 条('', p + '.暴露度', 'var(--c-danger)', [100]) +
    '<span class="v">' + M(p + '.暴露度') + '<span class="pill hot" id="d-party-' + u + '" hidden>群P已达标</span></span></div>' +
    '<div class="row"><span class="k">群P门槛</span><span class="v" style="font-weight:400">阶段' + M(p + '.阶段') + '/5 · 暴露' + M(p + '.暴露度') + '/100</span></div>' +
    '<div class="row" id="d-jz-' + u + '" hidden><span class="k">竞技纪录</span><span class="v">' + M(p + '.专属.竞技纪录') + '</span></div>' +
    '<div class="row"><span class="k">本档能到</span><span class="v" style="font-weight:400" id="d-line-' + u + '">—</span></div>' +
    lab('后门', p + '.后门进度', 'var(--c-danger)') +
    '<div class="row"><span class="k">后门</span><span class="v"><span class="pill">' + M(p + '.后门类型') + '</span>' +
    '<span class="pill" id="d-bds-' + u + '">未发现</span></span></div>' +
    '<div class="thought" id="d-str-' + u + '" hidden>策略：' + M(p + '.后门策略') + '</div>' +
    '<div class="thought" id="d-thk-' + u + '" hidden>' + M(p + '.此刻想法') + '</div></div>';
}
let 详情块 = 成员.map(([u]) => 详情(u)).join(EOL);

/* ══════════ 她摆的四格 ══════════ */
const 格名 = ['一', '二', '三', '四'];
let 四格 = '';
格名.forEach(k => {
  const p = '局面.当前选项.' + k;
  四格 += '<div class="opt" id="d-opt-' + k + '" data-opt="' + k + '" hidden>' +
    '<b>' + k + '</b>' + M(p + '.文本') +
    '<small>等级 ' + M(p + '.等级') + ' · 拦它用 <b>' + M(p + '.技能') + '</b>（DC<span id="d-dc-' + k + '">12</span>）· 考验 <b>' + M(p + '.主对') + '</b>' +
    '<span id="d-cost-' + k + '"> · 代价：' + M(p + '.代价') + '</span></small>' +
    '<div class="opt-btns"><button data-act="do" data-k="' + k + '">顺着</button>' +
    '<button data-act="no" data-k="' + k + '">拒</button></div></div>';
});

/* ══════════ 判定结果 ══════════ */
const 判定 = '<div class="verdict" id="d-verdict" hidden>' +
  '<span class="big"><span class="pill" id="d-vd-tier">' + M('玩家._本轮判定.综合') + '</span></span> <span style="color:var(--c-text-faint)">' + M('玩家._本轮判定.行为') + '</span>' +
  '<div class="rounds">' +
  '<div class="rd" id="d-vd-r0" hidden>侦察<b id="d-vd-r0v">—</b></div>' +
  '<div class="rd" id="d-vd-r1" hidden>行动<b id="d-vd-r1v">—</b></div>' +
  '<div class="rd" id="d-vd-r2" hidden>反应<b id="d-vd-r2v">—</b></div>' +
  '</div>' +
  '<div id="d-vd-alert" hidden style="margin-top:5px">警觉度 +<span id="d-vd-alertv">0</span></div>' +
  '<div id="d-vd-desc" style="margin-top:3px">' + M('玩家._本轮判定.说明') + '</div>' +
  '<div style="margin-top:5px;color:var(--c-text-faint);font-size:var(--fs-xs)">判定已写入变量，AI 不重算、不质疑</div></div>';

/* ══════════ BODY ══════════ */
const BODY = [
  '<div class="wrap" id="root">',

  /* ── 顶部 ── */
  卡('him', '欲妈群', 签('v3')) +
  '<div class="row"><span class="k">时间</span><span class="v">Day ' + M('元数据.日数') + ' · ' + M('元数据.时段') + ' <span id="d-hour">' + M('元数据.小时') + '</span>:00 · 回合' + M('元数据.回合') + '</span></div>' +
  '<div class="row"><span class="k">距高考</span>' + 条('d-exam-bar', '元数据.日数', 'var(--c-info)') + '<span class="v" id="d-remain">— 天</span></div>' +
  '<div class="row"><span class="k">难度</span><span class="v"><span class="pill" id="d-diff">普通</span></span></div>' +
  '<div class="row" id="d-ending" hidden><span class="k">结局</span><span class="v"><span class="pill danger" id="d-ending-t">—</span></span></div>' +
  '</div></div>',

  /* ── 他 ── */
  卡('him', '他', 签(M('玩家.学校'))) +
  lab('成绩', '玩家.学业.成绩', 'var(--c-info)', [60, 80]) +
  lab('欲望', '玩家.心理.欲望', 'var(--c-primary-strong)', [60, 80]) +
  lab('理智', '玩家.心理.理智', 'var(--c-safe)') +
  lab('警觉度', '玩家.警觉度', 'var(--c-warn)', [31, 61, 81]) +
  '<div class="g2" style="margin-top:6px">' +
  '<div class="row"><span class="k">体力</span><span class="v">' + M('玩家.身体.体力') + '</span></div>' +
  '<div class="row"><span class="k">性欲</span><span class="v">' + M('玩家.身体.性欲') + '</span></div>' +
  '<div class="row"><span class="k">今日</span><span class="v">射精' + M('玩家.今日.射精次数') + ' · 幻触' + M('玩家.今日.幻触次数') + '</span></div>' +
  '<div class="row"><span class="k">怀疑</span><span class="v">' + M('玩家.心理.怀疑') + '</span></div>' +
  '</div>' +
  '<div class="g3" style="margin-top:6px">' +
  lab('真相', '玩家.察觉值.假阳具真相', 'var(--c-love)', [60, 80]) +
  lab('群存在', '玩家.察觉值.群存在', 'var(--c-love)', [50, 60]) +
  lab('母亲欲望', '玩家.察觉值.母亲欲望', 'var(--c-love)', [50, 70]) +
  lab('幻触', '玩家.察觉值.幻触', 'var(--c-love)', [30, 50]) +
  '</div>' +
  '<div class="row" id="d-himv" hidden><span class="k">本轮判定</span><span class="v" style="font-weight:400">' +
  '<span class="pill" id="d-himv-act">' + M('玩家._本轮判定.行为') + '</span>' +
  '<span class="pill" id="d-himv-tier">' + M('玩家._本轮判定.综合') + '</span> ' +
  '<span id="d-himv-desc">' + M('玩家._本轮判定.说明') + '</span></span></div>' +
  '<div class="row" id="d-ev" hidden><span class="k">证据</span><span class="v" style="font-weight:400" id="d-ev-t"></span></div>' +
  '</div></div>',

  /* ── 郝佳期 ── */
  卡('mom', '郝佳期', 签('Lv.' + M('郝佳期.群等级') + ' · 阶段' + M('郝佳期.阶段'))) +
  '<div class="row"><span class="k">阶段</span>' + 条('', '郝佳期.阶段进度', 'var(--c-primary-strong)') +
  '<span class="v">' + M('郝佳期.阶段') + ' / 5 · 第<span id="d-mom-days">1</span>天</span></div>' +
  '<div class="g2">' +
  lab('兴奋', '郝佳期.心理.兴奋', 'var(--c-primary-strong)') + lab('润滑', '郝佳期.心理.润滑', 'var(--c-primary)') +
  lab('理智', '郝佳期.心理.理智', 'var(--c-info)') + lab('痴迷', '郝佳期.心理.痴迷', 'var(--c-primary-strong)') +
  lab('罪恶感', '郝佳期.心理.罪恶感', 'var(--c-love)') + lab('勇气', '郝佳期.心理.勇气', 'var(--c-warn)') +
  lab('暴露恐惧', '郝佳期.心理.暴露恐惧', 'var(--c-warn)') + lab('叛逆恐惧', '郝佳期.关系.叛逆恐惧', 'var(--c-primary)', [40, 70]) +
  '</div>' +
  '<div class="row"><span class="k">关系</span><span class="v">亲密' + M('郝佳期.关系.亲密度') + ' · 信任' + M('郝佳期.关系.信任度') + ' · 边界' + M('郝佳期.关系.边界') + '</span></div>' +
  '<div class="row"><span class="k">本档能到</span><span class="v" style="font-weight:400" id="d-mom-line">—</span></div>' +
  lab('后门', '郝佳期.后门进度', 'var(--c-danger)') +
  '<div class="row"><span class="k">后门</span><span class="v"><span class="pill">' + M('郝佳期.后门类型') + '</span>' +
  '<span class="pill" id="d-mom-bds">未发现</span><span class="pill danger" id="d-mom-bdu" hidden>已利用</span></span></div>' +
  '<div class="thought" id="d-mom-str" hidden>策略：' + M('郝佳期.后门策略') + '</div>' +
  '<div class="row"><span class="k">统计</span><span class="v" style="font-weight:400">偷抚' + M('郝佳期.统计.偷抚次数') + ' · 诱导' + M('郝佳期.统计.诱导射精') + ' · 假阳具' + M('郝佳期.统计.假阳具使用') + ' · 暴露' + M('郝佳期.统计.暴露次数') + '</span></div>' +
  '<div class="row"><span class="k">积分</span><span class="v">' + M('郝佳期.积分') + ' ｜ 今日排名 ' + M('郝佳期.竞赛.今日排名') + ' ｜ 得分 ' + M('郝佳期.竞赛.今日得分') + '</span></div>' +
  '<div class="thought" id="d-mom-thk" hidden>' + M('郝佳期.心理.此刻想法') + '</div>' +
  '</div></div>',

  /* ── 群 ── */
  卡('grp', '欲妈群', 签('活跃' + M('群.活跃度') + '% · 在线' + M('群.在线数') + '/' + M('群.成员数'))) +
  '<div class="row"><span class="k">今日主题</span><span class="v" style="font-weight:400">' + M('群.今日主题') + '</span></div>' +
  lab('暴露风险', '群.暴露风险', 'var(--c-danger)', [31, 61, 81]) +
  '<div class="row" id="d-ally" hidden><span class="k">联盟</span><span class="v" style="font-weight:400" id="d-ally-t"></span></div>' +
  '<div class="row" id="d-week" hidden><span class="k">上期结算</span><span class="v" id="d-week-t"></span></div>' +
  '<div class="row" id="d-secret" hidden><span class="k">秘密任务</span><span class="v" style="font-weight:400">' +
  '<span class="pill warn">进行中</span> ' + M('群.秘密任务.成员') + ' · ' + M('群.秘密任务.内容') + '（Day' + M('群.秘密任务.期限日') + '前）</span></div>' +
  '<div class="row"><span class="k">群周派对</span><span class="v" style="font-weight:400" id="d-party-t"></span></div>' +
  '<div class="members" style="margin-top:8px">' + 格子 + '</div>' +
  详情块 +
  '</div></div>',

  /* ── 假阳具 ── */
  卡('toy', '假阳具', '<span class="tag" id="d-toy-state">激活</span>') +
  '<div class="row"><span class="k">持有者</span><span class="v"><span class="pill hot" id="d-toy-holder">—</span>（Day' + M('假阳具.持有起始日') + '~' + M('假阳具.持有到期日') + '）</span></div>' +
  '<div class="row" id="d-toy-borrow" hidden><span class="k">借用中</span><span class="v"><span class="pill warn" id="d-toy-borrower">—</span> 剩 ' + M('假阳具.借用期限') + ' 周</span></div>' +
  '<div class="row"><span class="k">今日</span><span class="v">' + M('假阳具.今日使用') + ' 次 · 上次 ' + M('假阳具.上次使用时') + ' 时</span></div>' +
  '</div></div>',

  /* ── 行动判定 ── */
  卡('dice', '行动判定', 签('LCG 确定性骰')) +
  '<div class="opt-head" id="d-opt-head" hidden>她这一关摆出来的<span id="d-opt-pick"></span><br>每条都有自己的技能与 DC ——「顺着」＝照做并推进，「拒」＝用意志硬拦。点了就直接判、直接推进下一轮。</div>' +
  '<div class="opt-head" id="d-opt-none">这一关她还没摆选项 —— 等她先出手（她会写进 局面.当前选项 的四格）。</div>' +
  '<div class="opts" id="d-opts">' + 四格 + '</div>' +
  '<div class="acts" id="d-watch" hidden><button class="act" data-act="watch">我不动，就看着她</button></div>' +
  '<div class="res" id="ymq-res" hidden></div>' +
  '<div class="cx"><div class="cx-h">我自己要做别的（写一句你想做的，交给她判）</div>' +
  '<input class="cx-in" id="ymq-cx" placeholder="例：翻身把脸埋进枕头里，装作还在睡" value="">' +
  '<div class="cx-ready" id="d-cx-ready" hidden>她已经判过：「' + M('局面.自定义.文本') + '」→ 用 <b>' + M('局面.自定义.技能') + '</b>（DC<span id="d-cx-dc">15</span>）· 考验 <b>' + M('局面.自定义.主对') + '</b></div>' +
  '<div class="acts" id="d-cx-roll" hidden><button class="act" data-act="rollcx">掷骰，看看成不成</button>' +
  '<button class="act" data-act="cxcancel">算了，不做了</button></div>' +
  '<div class="acts" id="d-cx-ask"><button class="act" data-act="askcx">交给她判（她会定技能与难度）</button></div>' +
  '</div>' +
  '<div class="acts" style="margin-top:8px">' +
  '<button class="act" data-act="roll" data-skill="观察">观察<small>DC12 · 技能' + M('玩家.技能.观察') + '</small></button>' +
  '<button class="act" data-act="roll" data-skill="行动">行动<small>DC10 · 技能' + M('玩家.技能.行动') + '</small></button>' +
  '<button class="act" data-act="roll" data-skill="意志">意志<small>DC12 · 技能' + M('玩家.技能.意志') + '</small></button>' +
  '<button class="act refuse" id="d-btn-back" hidden data-act="roll" data-skill="后门反抗">后门反抗<small>DC15 · 进度<span id="d-back-p">0</span><span id="d-back-tip"></span></small></button>' +
  '</div>' +
  '<div style="margin-top:6px;color:var(--c-text-faint);font-size:var(--fs-xs)">她永远说了算。反抗只能换四种东西之一：今晚不做 ／ 她自己动手 ／ 把话说破逼她收手 ／ 换一次谈判。一次一种，一轮一次。</div>' +
  '<div class="thought" id="d-weak" hidden>她的弱点（' + M('郝佳期.后门类型') + '）：' + M('郝佳期.后门描述') + '</div>' +
  判定 +
  '</div></div>',

  /* ── 设置 ── */
  卡('cog', '设置', '') +
  '<div class="row"><span class="k">主题</span><span class="v" style="display:flex;gap:6px">' +
  '<button class="btn-min" id="d-th-夜间" data-act="theme" data-val="夜间">夜间</button>' +
  '<button class="btn-min" id="d-th-浅色" data-act="theme" data-val="浅色">浅色</button></span></div>' +
  '</div></div>',

  '</div>'
].join(EOL);

/* ══════════ 新增脚本段：补宏 / 派生 / 显隐 ══════════ */
const 中段 = [
  '/* ══════════════════════════════════════════════════════════════',
  '   ★ 值分两类：',
  '     ① 静态值 → 写在 HTML 里的宏 {{format_message_variable::stat_data.…}}，由 ST 渲染楼层时替换',
  '     ② 派生值（要做减法/除法/查表/映射/条件显隐）→ 宏表达不了，只能 JS 填',
  '   下面这一坨就是 ② 的全部；① 一个都不在这里出现。',
  '   ══════════════════════════════════════════════════════════════ */',
  'var RE_宏=/\\{\\{format_message_variable::([^}]+)\\}\\}/g;',
  'var RE_宏有=/\\{\\{format_message_variable::/;',
  'function id(n){ return document.getElementById(n); }',
  '/* UID → 姓名（宏只能取原值，UID 到姓名这一步只能 JS 翻）*/',
  'function nameOf(uid){',
  '  if(!uid) return "—";',
  '  if(uid==="hao_jiaqi") return "郝佳期";',
  '  var d=_.get(S.stat,"群.成员详情."+uid,null);',
  '  return (d&&d.姓名)?d.姓名:uid;',
  '}',
  'function 填(n,t){ var e=id(n); if(e) e.textContent=(t==null?"":String(t)); }',
  'function 宽(n,w){ var e=id(n); if(e){ var x=Math.max(0,Math.min(100,num(w,0))); e.style.width=(Math.round(x*100)/100)+"%"; } }',
  'function 隐(n,h){ var e=id(n); if(e) e.hidden=!!h; }',
  'function 牌(n,文,cls){ var e=id(n); if(!e) return; e.textContent=文==null?"":String(文); e.className="pill"+(cls?" "+cls:""); }',
  '',
  '/* ── 宏兜底：CDN 载入的 HTML 不经过 ST 宏替换（宏只在消息文本渲染时替换），',
  '      这时面板里会留下一串字面量 {{format_message_variable::…}}。',
  '      这里把它们按变量填掉：模板留一份，每次重绘先还原再填 → 值照样跟着变量走。 */',
  'function 宏值(路径){',
  '  路径=String(路径||"").replace(/^stat_data\\./,"");',
  '  var v=_.get(S.stat,路径,"");',
  '  return (v==null)?"":String(v);',
  '}',
  'function 补宏(root){',
  '  if(!root||!S.stat) return;',
  '  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false), ns=[];',
  '  while(w.nextNode()){ if(RE_宏有.test(w.currentNode.nodeValue)) ns.push(w.currentNode); }',
  '  ns.forEach(function(n){ n.nodeValue=n.nodeValue.replace(RE_宏,function(_m,p){ return 宏值(p); }); });',
  '  Array.prototype.forEach.call(root.querySelectorAll("*"),function(el){',
  '    ["style","class","value","placeholder","title"].forEach(function(a){',
  '      var v=el.getAttribute(a);',
  '      if(!v||v.indexOf("{{format_message_variable")<0) return;',
  '      el.setAttribute(a, v.replace(RE_宏,function(_m,p){ return 宏值(p); }));',
  '    });',
  '  });',
  '}',
  'function 补模板(){',
  '  var root=id("root"); if(!root) return;',
  '  if(!S.模板) S.模板=root.innerHTML;              /* 首次：留住原始模板 */',
  '  if(S.模板.indexOf("{{format_message_variable")<0) return;   /* ST 已替换过 → 别动，值随楼层 */',
  '  if(document.activeElement&&document.activeElement.id==="ymq-cx") return;  /* 正在打字就别重排 */',
  '  root.innerHTML=S.模板;',
  '  补宏(root);',
  '  var i=id("ymq-cx"); if(i) i.value=S.cx||"";',
  '}',
  '',
  '/* ── 派生值（宏算不出来的：减法 / 除法 / 查表 / 映射）── */',
  'function 派生(){',
  '  var st=S.stat||{}, m=st.元数据||{}, p=st.玩家||{}, h=st.郝佳期||{}, gr=st.群||{};',
  '  var day=num(m.日数,1), exam=num(m.高考日,100);',
  '  填("d-hour", String(num(m.小时,0)).padStart(2,"0"));',
  '  填("d-remain", Math.max(0,exam-day)+" 天");',
  '  宽("d-exam-bar", day/exam*100);',
  '  填("d-diff", 取难度());',
  '  填("d-mom-days", Math.max(1,day-num(h.阶段起始日,1)+1));',
  '  填("d-mom-line", STAGE_LINE[num(h.阶段,1)]||"—");',
  '  UID_ORDER.forEach(function(u){',
  '    if(u==="hao_jiaqi") return;',
  '    var d=g("群.成员详情."+u,null);',
  '    if(!d||!d.姓名) return;',
  '    var 阶=num(d.阶段,1);',
  '    宽("d-sbar-"+u, 阶*20);',
  '    填("d-days-"+u, Math.max(1,day-num(d.阶段起始日,1)+1));',
  '    填("d-line-"+u, STAGE_LINE[阶]||"—");',
  '  });',
  '}',
  '',
  '/* ── 条件显隐（宏表达不了的：空就藏 / 布尔 / 选中态）── */',
  'function 显隐(){',
  '  var st=S.stat||{}, p=st.玩家||{}, h=st.郝佳期||{}, gr=st.群||{}, t=st.假阳具||{}, 局=st.局面||{}, gd=st.阶段守卫||{};',
  '  var 日=num((st.元数据||{}).日数,1);',
  '  /* 顶栏 */',
  '  隐("d-ending", !gd.结局已触发);',
  '  填("d-ending-t", gd.结局类型||"已触发");',
  '  /* 他 */',
  '  var jp=p._本轮判定||{};',
  '  隐("d-himv", !(jp.行为||jp.说明));',
  '  var 综=String(jp.综合||"");',
  '  牌("d-himv-tier", 综||"—", (综.indexOf("大成功")>=0||综.indexOf("成功")>=0)?"hot":"warn");',
  '  var ev=String(p.证据清单||"").split("、").filter(Boolean);',
  '  隐("d-ev", !ev.length);',
  '  if(ev.length){',
  '    var e=id("d-ev-t"); if(e) e.innerHTML=ev.map(esc).join(" · ")+(ev.length>=3?\'<span class="pill danger">已达法律结局线</span>\':"（满3件触发法律结局）");',
  '  }',
  '  /* 郝佳期 */',
  '  牌("d-mom-bds", h.后门已发现?"已发现":"未发现", h.后门已发现?"warn":"");',
  '  隐("d-mom-bdu", !h.后门已利用);',
  '  隐("d-mom-str", !String(h.后门策略||"").trim());',
  '  隐("d-mom-thk", !String((h.心理||{}).此刻想法||"").trim());',
  '  /* 群 */',
  '  var lg=gr.联盟||{}, lk=Object.keys(lg);',
  '  隐("d-ally", !lk.length);',
  '  if(lk.length) 填("d-ally-t", lk.map(function(u){return nameOf(u)+":"+lg[u]}).join(" · "));',
  '  var wk=String(gr.周竞赛历史||"").split("；").filter(Boolean);',
  '  隐("d-week", !wk.length);',
  '  if(wk.length){ var lw=wk[wk.length-1].split("|"); 填("d-week-t", (lw[1]||"—")+"（周起始 Day"+num(lw[0],1)+"）"); }',
  '  隐("d-secret", !(gr.秘密任务||{}).进行中);',
  '  var pl=UID_ORDER.filter(function(u){return partyReady(u)}).map(nameOf);',
  '  填("d-party-t", pl.length?pl.join(" · ")+"（阶段5+暴露100，已受邀）":"暂无成员达标 · 门槛 阶段5 且 暴露100");',
  '  /* 成员格与详情 */',
  '  UID_ORDER.forEach(function(u){',
  '    var d=(u==="hao_jiaqi")?{在线:true}:(gr.成员详情||{})[u];',
  '    var mm=id("d-mem-"+u); if(mm) mm.className="mem"+(S.open===u?" on":"");',
  '    var dt=id("d-det-"+u); if(dt) dt.hidden=(S.open!==u);',
  '    var dot=id("d-dot-"+u); if(dot) dot.className="dot"+(d&&d.在线===false?" off":"");',
  '  });',
  '  UID_ORDER.forEach(function(u){',
  '    if(u==="hao_jiaqi"){',
  '      隐("d-party-hao_jiaqi", !partyReady("hao_jiaqi"));',
  '      牌("d-bds-hao_jiaqi", h.后门已发现?"已发现":"未发现", h.后门已发现?"warn":"");',
  '      隐("d-bdu-hao_jiaqi", !h.后门已利用);',
  '      return;',
  '    }',
  '    var d=(gr.成员详情||{})[u]; if(!d||!d.姓名) return;',
  '    隐("d-son-"+u, !d.儿子在场);',
  '    隐("d-party-"+u, !partyReady(u));',
  '    隐("d-jz-"+u, !((d.专属||{}).竞技纪录!=null));',
  '    牌("d-bds-"+u, d.后门已发现?"已发现":"未发现", d.后门已发现?"warn":"");',
  '    隐("d-str-"+u, !String(d.后门策略||"").trim());',
  '    隐("d-thk-"+u, !String(d.此刻想法||"").trim());',
  '  });',
  '  /* 假阳具 */',
  '  填("d-toy-state", (t.是否激活===false)?"休眠":"激活");',
  '  填("d-toy-holder", nameOf(t.当前持有者));',
  '  隐("d-toy-borrow", !String(t.借用者||"").trim());',
  '  填("d-toy-borrower", nameOf(t.借用者));',
  '  /* 她摆的四格 */',
  '  var 选项=局.当前选项||{}, 她选=String(局.她已选||""), 有几格=0;',
  '  ["一","二","三","四"].forEach(function(k){',
  '    var o=选项[k]||{}, 有=!!String(o.文本||"").trim();',
  '    if(有) 有几格++;',
  '    var el=id("d-opt-"+k); if(!el) return;',
  '    el.hidden=!有;',
  '    el.className="opt"+(她选&&她选===k?" picked":"");',
  '    填("d-dc-"+k, DC表[String(o.等级||"微")]||12);',
  '    隐("d-cost-"+k, !String(o.代价||"").trim());',
  '  });',
  '  隐("d-opt-head", !有几格);',
  '  隐("d-opt-none", !!有几格);',
  '  隐("d-watch", !有几格);',
  '  填("d-opt-pick", 她选?"　★ 她挑的是第 "+她选+" 条":"");',
  '  /* 自定义 */',
  '  var 自=局.自定义||{}, 有自=!!String(自.文本||"").trim()&&!!自.待掷;',
  '  隐("d-cx-ready", !有自);',
  '  隐("d-cx-roll", !有自);',
  '  隐("d-cx-ask", !!有自);',
  '  填("d-cx-dc", DC表[String(自.等级||"中")]||15);',
  '  /* 后门反抗按钮 */',
  '  var hb=num(h.后门进度,0);',
  '  隐("d-btn-back", !(h.后门已发现&&hb>=60));',
  '  填("d-back-p", Math.round(hb));',
  '  填("d-back-tip", hb>=80?" · 可动用":" · 待满80");',
  '  var bb=id("d-btn-back"); if(bb) bb.className="act"+(h.后门已利用?"":" refuse");',
  '  隐("d-weak", !h.后门已发现);',
  '  /* 判定结果 */',
  '  var last=p._本轮判定||{};',
  '  隐("d-verdict", !last.行为);',
  '  牌("d-vd-tier", last.综合||"—", ({"大失败":"danger","失败":"warn","部分成功":"","成功":"safe","大成功":"hot"})[last.综合]||"");',
  '  var rr=last.投掷||[];',
  '  [0,1,2].forEach(function(i){',
  '    隐("d-vd-r"+i, rr[i]==null);',
  '    if(rr[i]!=null) 填("d-vd-r"+i+"v", num(rr[i]));',
  '  });',
  '  隐("d-vd-alert", !num(last.警觉));',
  '  填("d-vd-alertv", num(last.警觉));',
  '  /* 本轮结果提示 */',
  '  填("ymq-res", S.结果||"");',
  '  隐("ymq-res", !String(S.结果||"").trim());',
  '  /* 主题按钮 */',
  '  var a1=id("d-th-夜间"), a2=id("d-th-浅色");',
  '  if(a1) a1.className="btn-min"+(S.theme==="夜间"?" on":"");',
  '  if(a2) a2.className="btn-min"+(S.theme==="浅色"?" on":"");',
  '}',
  '',
  '/* ── 同步：只做 派生 + 显隐，绝不重建 DOM（宏里的值要留住）── */',
  'function 同步(){',
  '  try{ 派生(); }catch(e){ console.warn("[欲妈群] 派生失败",e); }',
  '  try{ 显隐(); }catch(e){ console.warn("[欲妈群] 显隐失败",e); }',
  '}',
  '/* 旧代码里到处调 render() —— 保留同名，指向 同步()，这样下面那一大段交互代码一个字都不用改 */',
  'function render(){ 同步(); }',
  ''
].join(EOL);

/* ══════════ 组装 ══════════ */
const 新样式 = STYLE + EOL + '[hidden]{display:none!important}' + EOL + '</style>';
const out = [
  '```',
  '<!DOCTYPE html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=5.0,user-scalable=yes">',
  '<title>状态栏 · 欲妈群</title>',
  新样式,
  '</head>',
  '<body>',
  BODY,
  '<script>',
  '(function(){',
  '"use strict";',
  头.trimEnd(),
  中段,
  尾.trimEnd(),
  '})();',
  '</script>',
  '</body>',
  '</html>',
  '```',
  ''
].join(EOL);

fs.writeFileSync(P, out, 'utf8');
console.log('已写出 ' + P);
console.log('字节 ' + out.length + '　宏 ' + (out.match(/\{\{format_message_variable::/g) || []).length + ' 处');
