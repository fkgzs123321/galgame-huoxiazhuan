/* ════════════════════════════════════════════════════════════
   英雄坛说面板 · 逻辑
   由 gen-panel.cjs 注入到 _面板骨架.html 的逻辑占位处
   数据从 window.YX_DATA（生成时内嵌）读
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var D = window.YX_DATA || {};
  var 数 = function (v, d) { var n = Number(v); return isNaN(n) ? (d || 0) : n; };
  var 夹 = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
  var 行 = function (a, b, cls) { return '<div class="yx-ln' + (cls ? ' ' + cls : '') + '"><span>' + E(a) + '</span><b>' + E(b) + '</b></div>'; };
  var 有 = function (o, k) { return o && Object.prototype.hasOwnProperty.call(o, k); };

  var 根 = document.getElementById('yx-root');
  var 体 = document.getElementById('yx-bd');
  var 遮 = document.getElementById('yx-msk');
  var 层 = document.getElementById('yx-md');
  var 层内 = document.getElementById('yx-md-c');

  /* ══ 折叠组件：主项 → 子项 → 子子项 ══ */
  /* ★ 折()：加「标题已是 HTML」参数（第 6 个）
     2026-09-17 修：活计页传带 <span> 的标题进来，内部又 E() 一次 → 显示成字面 HTML */
  function 折(标题, 内, 副, 图标名, 开, 标题是HTML) {
    return '<div class="yx-fl' + (开 ? " on" : "") + '">'
      + '<div class="hd"><span class="ar">' + ic("右", 12) + '</span>'
      + (图标名 ? '<span class="i2">' + ic(图标名, 14) + '</span>' : "")
      + '<span class="t1">' + (标题是HTML ? String(标题) : E(标题)) + '</span>'
      + (副 ? '<span class="t2">' + E(副) + '</span>' : "")
      + '</div><div class="bd">' + 内 + '</div></div>';
  }

  /* ════════════════════════════════════════════════════════════
     ★ 契约 vs 实例（2026-09-17 补）
     这张卡的资料分两层，面板**必须分清**：
       契约（事先设置）= 定义域：可能有什么。技能树 / 任务表 / 物品表 / 门派表
       变量（运行时）  = 实例  ：现在有什么。状态.技能.* / 任务.* / 背包
     ★ 拿契约表当清单直接渲染 = 把"可能有的"当"我有的" —— 开局就列出一堆没学的东西。
     判据：**面板上出现的每一条，都要能从变量里找到它凭什么在这儿。**
     ════════════════════════════════════════════════════════════ */

  /* 前置条件是否满足（任务表里每条都有「前置: [{字段, 至少}]」）*/
  function 前置满足(条) {
    var 前 = (条 || {}).前置 || [];
    for (var i = 0; i < 前.length; i++) {
      var f = 前[i], v = 0;
      if (f.字段 === '经验') v = 数(((状态.资源 || {}).经验));
      else if (f.字段 === '潜能') v = 数(((状态.资源 || {}).潜能));
      else if (f.字段 === '金钱') v = 数(((状态.资源 || {}).金钱));
      else if (f.字段 === '岁数' || f.字段 === '年龄') v = 数(((状态.时间 || {}).岁数));
      else if (f.字段 === '声望') v = 数(((状态.战斗临时 || {}).声望, 0));
      else if (f.字段 === '内力') v = 数(((状态.身体 || {}).内力强度));
      else {
        var 技 = ((状态.技能 || {}).门派 || {})[f.字段];
        if (技 === undefined) 技 = ((状态.技能 || {}).基本 || {})[f.字段];
        v = 技 === undefined ? 0 : 数(技);
      }
      if (v < 数(f.至少)) return false;
    }
    return true;
  }
  /* 差在哪（给"还接不了"那一组显示）*/
  function 差什么(条) {
    var 前 = (条 || {}).前置 || [];
    return 前.filter(function (f) {
      var v = 0;
      if (f.字段 === '经验') v = 数(((状态.资源 || {}).经验));
      else if (f.字段 === '潜能') v = 数(((状态.资源 || {}).潜能));
      else if (f.字段 === '金钱') v = 数(((状态.资源 || {}).金钱));
      else if (f.字段 === '岁数' || f.字段 === '年龄') v = 数(((状态.时间 || {}).岁数));
      else v = 数((((状态.技能 || {}).门派 || {})[f.字段]) !== undefined ? ((状态.技能 || {}).门派 || {})[f.字段] : (((状态.技能 || {}).基本 || {})[f.字段]));
      return v < 数(f.至少);
    }).map(function (f) { return E(f.字段) + ' ' + f.至少; }).join('　');
  }
  function 折行(a, b) {
    return '<div class="rowx"><span class="k2">' + E(a) + '</span><span class="v2">' + b + '</span></div>';
  }
  /* ══ 强化（与机制层同口径：拿材料叠层、层数封顶、每层递增）══ */
  function 强化参数() {
    var 说 = D.技能强化 || {};
    var 装 = D.强化 || {};
    return {
      装上限: 数(装.上限, 10), 装每层: 数(装.每层倍率, 0.1), 装材料: 装.每层材料 || { 铁: 2, 灵石: 1 },
      技上限: 数(说.上限, 10), 技每层: 数(说.每层效果, 0.05), 技材料: 说.每层材料 || { 灵石: 2, 铁: 1 },
    };
  }
  function 叠层加成(基础, 层, 每层倍率) { return Math.round(基础 * (1 + 每层倍率 * 层) * 100) / 100; }
  function 要的材料(每层材料, 层) {
    var 出 = {};
    Object.keys(每层材料).forEach(function (k) { 出[k] = 数(每层材料[k]) * (层 + 1); });
    return 出;
  }
  function 材料够吗(要) {
    var 有 = (状态.资源 || {});
    var 缺 = [];
    Object.keys(要).forEach(function (k) { if (数(有[k]) < 要[k]) 缺.push(k + " 差 " + (要[k] - 数(有[k]))); });
    return { 够: !缺.length, 缺: 缺 };
  }
  function 取层(类, 名) { return 数(((状态.强化 || {})[类] || {})[名], 0); }
  /* ══ 品级判定（规则来自契约：物品与品质表.yaml 的「品级判定」）══ */
  var 档s = (D.品质档 || []);
  function 档键(名) {
    for (var i = 0; i < 档s.length; i++) if (档s[i].名 === 名) return 档s[i].键;
    return "q1";
  }
  function 档色(键) {
    for (var i = 0; i < 档s.length; i++) if (档s[i].键 === 键) return 档s[i].色;
    return "#e8e8e8";
  }
  function 品名(键) {
    for (var i = 0; i < 档s.length; i++) if (档s[i].键 === 键) return 档s[i].名;
    return "良品";
  }
  /* 武功：按师承层级与门派地位 */
  function 武功品级(名) {
    var 派 = D.门派 || {}, 武 = D.门派武功 || {};
    // 基本武功一律良品
    if ((D.基本武功 || []).indexOf(名) >= 0) return "q1";
    for (var k in 武) {
      var 列 = 武[k] || [];
      var i = 列.indexOf(名);
      if (i < 0) continue;
      // 列内顺序：入门 → 主力 → 进阶 → 镇派
      if (i === 0) return "q2";           // 入门：上品
      if (i === 列.length - 1) return "q4"; // 镇派绝学：极品
      return i === 1 ? "q2" : "q3";        // 主力上品 / 进阶精品
    }
    return "q2";
  }
  /* 绝招：按条件严苛度（几个「≥N」）*/
  function 绝招品级(条件) {
    var s = String(条件 || "");
    var n = (s.match(/≥|>=|以上/g) || []).length;
    if (n >= 3) return "q4";
    if (n === 2) return "q3";
    return "q2";
  }
  /* 任务：按前置门槛与后果重量 */
  function 任务品级(k) {
    var d = (D.任务 || {})[k] || {};
    var 前 = (d.前置 || []).length;
    var 败 = d.失败后果 || {};
    var 说 = String(d.说明 || "") + String(d.失败后果 ? JSON.stringify(d.失败后果) : "");
    if (说.indexOf("会死") >= 0 || 说.indexOf("命") >= 0 && 说.indexOf("-1") >= 0) return "q4";
    if (说.indexOf("不可逆") >= 0 || 说.indexOf("关闭") >= 0) return "q3";
    if (前 > 0) return "q2";
    return "q1";
  }
  /* 物品：按价格折算 */
  function 物品品级(名) {
    var 表 = ((D.物品 || {}).示例) || [];
    for (var i = 0; i < 表.length; i++) {
      if (表[i].名 !== 名) continue;
      var 价 = 数(表[i].价格);
      if (价 <= 0) return 档键(表[i].品质 || "极品");
      if (价 < 100) return "q0";
      if (价 < 2000) return "q1";
      if (价 < 10000) return "q2";
      if (价 < 50000) return "q3";
      return "q4";
    }
    return "q1";
  }
  /* NPC：按战力档 */
  /* ★ NPC 品级：战力是【描述档】不是数字 —— 先查映射，再按身份推，最后兜底
     出处：参考项目「火影」的 RANK_ALIASES（一个档认多种写法） */
  function NPC品级(名) {
    var n = (D.NPC || {})[名] || {};
    var M = (D.战力映射 || {});
    var 战 = String(n.战力 == null ? "" : n.战力).trim();
    var 身 = String(n.身份 || "") + " " + String(n.功能 || "");
    // ① 先按战力描述档认
    var 表 = M.表 || [];
    for (var i = 0; i < 表.length; i++) {
      var 认 = 表[i].认 || [];
      for (var j = 0; j < 认.length; j++) {
        if (认[j] && 战 === String(认[j])) return 表[i].档;
      }
    }
    // ② 再按「包含」认（AI 写「掌门以上的水准」也要认出来）
    for (var i2 = 0; i2 < 表.length; i2++) {
      var 认2 = 表[i2].认 || [];
      for (var j2 = 0; j2 < 认2.length; j2++) {
        if (认2[j2] && 认2[j2].length >= 2 && 战 && 战.indexOf(String(认2[j2])) >= 0) return 表[i2].档;
      }
    }
    // ③ 没写战力 → 按身份推
    var 按身 = M.按身份 || [];
    for (var k = 0; k < 按身.length; k++) {
      var 认3 = 按身[k].认 || [];
      for (var m = 0; m < 认3.length; m++) {
        if (认3[m] && 身.indexOf(String(认3[m])) >= 0) return 按身[k].档;
      }
    }
    // ④ 兜底
    return (M.默认 || {}).档 || "q0";
  }
  /* NPC 强度分（英雄榜排序用） */
  function NPC强度(名) {
    var n = (D.NPC || {})[名] || {};
    var M = (D.战力映射 || {});
    var 战 = String(n.战力 == null ? "" : n.战力).trim();
    var 表 = (M.表 || []).concat(M.按身份 || []);
    for (var i = 0; i < 表.length; i++) {
      var 认 = 表[i].认 || [];
      for (var j = 0; j < 认.length; j++) {
        if (认[j] && 战 && (战 === String(认[j]) || 战.indexOf(String(认[j])) >= 0)) return 数(表[i].强度, 8);
      }
    }
    // 按身份
    var 身 = String(n.身份 || "") + " " + String(n.功能 || "");
    for (var k = 0; k < (M.按身份 || []).length; k++) {
      var 条 = M.按身份[k];
      for (var m = 0; m < (条.认 || []).length; m++) {
        if (条.认[m] && 身.indexOf(String(条.认[m])) >= 0) return 数(条.强度, 8);
      }
    }
    return 8;
  }
  /* 带品质色的名字 */
  function 染(名, 键) {
    return '<span style="color:' + 档色(键) + '">' + E(名) + "</span>";
  }
  /* ★ 据点（出处：主神空间的「乐园」）—— 只有回到驻地才能请教/强化/炼丹 */
  function 在据点() {
    var 地 = String((状态.场景 || {}).当前地点 || "");
    var 驻 = ((D.日常与资源 || {}).据点 || {});
    var 列 = (驻.英雄坛说的据点 || []).concat(["驻地", "客栈", "山门", "门派"]);
    // ★ 你所属门派所在的那座山，也算驻地（武当山=太极门、玉女峰=花间派…）
    var 我派 = String((状态.场景 || {}).当前门派 || "");
    if (我派) {
      var 门表 = D.门派 || {};
      var 我派条 = Array.isArray(门表) ? null : 门表[我派];
      var 门所 = (D.门派所在 || {})[我派];
      if (!门所 && D.地理) {
        for (var g in D.地理) {
          var 概 = String((D.地理[g] || {}).概览 || "");
          if (我派 && 概.indexOf(我派) >= 0) { 门所 = g; break; }
        }
      }
      if (门所) 列 = 列.concat([门所]);
    }
    for (var i = 0; i < 列.length; i++) if (地.indexOf(String(列[i]).slice(0, 2)) >= 0) return true;
    return !地;   // 没写地点时不禁（免得卡住）
  }
  function 据点名() { return (状态.场景 || {}).当前地点 || "驻地"; }
  /* ══ 强化辅助（四段式 —— 与机制层 物品引擎 同口径）══ */
  function 强参数() {
    var Z = D.强化 || {};
    return {
      上限: 数(Z.上限, 16), 倍: 数(Z.每层倍率, 0.1), 材料: Z.每层材料 || { 铁: 2, 灵石: 1 },
      表: Z.成功率表 || [], 护门: 数((Z.保护石 || {}).门槛, 7), 垫上: 数((Z.垫子 || {}).上限, 10),
    };
  }
  function 强档(层) {
    var 表 = 强参数().表, n = 数(层);
    for (var i = 0; i < 表.length; i++) if (n >= 数(表[i].从) && n < 数(表[i].到)) return 表[i];
    var 末 = 表.length ? 表[表.length - 1] : { 成功率: 0.1, 失败: "分解" };
    return { 成功率: Math.max(0.05, 数(末.成功率) - 0.02 * (n - 数(末.到))), 失败: 末.失败, 区: "分解区" };
  }
  function 区名(档) { return (档 && 档.区) ? 档.区 : (数(档.成功率) >= 1 ? "白送区" : "—"); }
  function 算成功率(档, 用符, 用石, 垫) {
    if (数(垫) >= 强参数().垫上) return 1;
    var r = 数(档.成功率, 0.1);
    if (用符) r = Math.min(1, r + 0.12);
    return r;
  }
  function 垫计数() { return 数(((状态.强化 || {}).垫子), 0); }
  function 护石能用(层) { return 数(层) >= 强参数().护门; }
  var 附符 = false, 护石 = false;

  /* ══ 记忆点限制（学过 ≠ 带上）· 出处：姬侠传 ══ */
  function 记上限() {
    var 学 = 数(((状态.技能 || {}).基本 || {})["读书写字"], 0);
    return Math.max(1, Math.floor(学 / 20));
  }
  function 记占(名) {
    var 技 = 状态.技能 || {};
    var 级 = 数((技.基本 || {})[名], 0) || 数((技.门派 || {})[名], 0);
    return Math.min(3, 1 + Math.floor(级 / 80));   // 1~3 点
  }
  function 已带() {
    return ((状态.技能装备 || {}).已带) || [];
  }
  function 记已用() {
    var 总 = 0, 列 = 已带();
    for (var i = 0; i < 列.length; i++) 总 += 记占(列[i]);
    return 总;
  }

  /* ══ 容错归一（AI 写得不规范也要认）· 出处：火影的 RANK_ALIASES / STAT_FIELDS ══ */
  function 归一(状态v) {
    if (!状态v || typeof 状态v !== "object") return 状态v;
    var 别名 = {
      兴奋: "兴奋度", 兴: "兴奋度", 好感: "好感度", 反抗: "反抗值",
      潜能值: "潜能", 钱: "金钱", 银两: "金钱", 内功: "内力强度",
      健康: "生命当前", 血: "生命当前", 血上限: "生命上限",
      悟性值: "悟性", 根骨值: "根骨", 膂力值: "膂力", 敏捷值: "敏捷",
    };
    (function 走(o) {
      if (!o || typeof o !== "object") return;
      Object.keys(o).forEach(function (k) {
        var 正 = 别名[k];
        if (正 && o[正] === undefined) { o[正] = o[k]; }
        if (o[k] && typeof o[k] === "object") 走(o[k]);
      });
    })(状态v);
    return 状态v;
  }

  /* ★ 按作息判「这时候他该不该在这儿」（出处：契约 NPC作息） */
  function 在班(名) {
    var z = D.NPC作息 || {}, 特 = (z.特殊 || []);
    for (var i = 0; i < 特.length; i++) if (特[i].名 === 名) return 2;   /* 2 = 特殊，单独处理 */
    var 身 = String(((D.NPC || {})[名] || {}).身份 || "");
    var 大 = z.大类 || [];
    for (var k = 0; k < 大.length; k++) {
      var 认 = 大[k].认 || [];
      for (var j = 0; j < 认.length; j++) if (认[j] && 身.indexOf(String(认[j])) >= 0) return 1;
    }
    return 1;   /* 认不出就默认在（免得筛没了） */
  }
  /* 这段时间大致是「白天」还是「夜里」—— 用回合数粗推 */
  function 天光() {
    var n = 数((状态.时间 || {}).回合, 0);
    var ph = n % 4;
    return (ph === 0 || ph === 1) ? "白天" : "夜里";
  }
  /* ════════════════════════════════════════════════════════════
     ▲ 需要 AI 的模块（二次请求）
     ★ 思路借鉴：独立端 `darkest-dungeon-app/src/gateway/aiGateway.ts`
       它的四件事，在酒馆里对应成：
         ① 统一入口      → 求AI()          （不允许各处散着调 generate）
         ② 错误归一      → 失败都有话说，不静默
         ③ 防重          → 正在生成时不许再发
         ④ 状态反馈      → 按钮变「正在生成…」，完了恢复
     ★ 为什么要二次请求：面板算得出「能不能」，算不出「是什么样」。
       搭话说什么、她此刻在想什么、这一步会变成什么样 —— 这些得让 AI 写。
     ════════════════════════════════════════════════════════════ */
  var AI忙 = false;

  function AI可用() { return typeof generate === 'function'; }

  /* 统一入口。所有需要 AI 的地方都走这儿 */
  async function 求AI(指令, 说明) {
    if (AI忙) { 提示AI('上一次还没出完，等它完'); return false; }
    if (!AI可用()) { 提示AI('这儿没有生成入口（不在酒馆里），这一段只能你自己写'); return false; }
    AI忙 = true;
    var 标 = document.getElementById('yx-aista');
    if (标) { 标.className = 'yx-aista on'; 标.textContent = '正在写…' + (说明 ? '（' + 说明 + '）' : ''); }
    try {
      await generate({ user_input: 指令, should_stream: true });
      if (标) { 标.className = 'yx-aista ok'; 标.textContent = '写好了，在上一条回复里'; }
      return true;
    } catch (e) {
      提示AI('没写出来：' + String((e && e.message) || e));
      if (标) { 标.className = 'yx-aista'; 标.textContent = ''; }
      return false;
    } finally {
      AI忙 = false;
    }
  }
  function 提示AI(话) {
    var 标 = document.getElementById('yx-aista');
    if (标) { 标.className = 'yx-aista wn'; 标.textContent = 话; }
  }

  /* ── ① 她的心思：按当前人设写一段她此刻在想什么 ── */
  function 求她的心思() {
    var 她 = String((状态.她 || {}).人设 || '');
    var 地 = String((状态.场景 || {}).当前地点 || '');
    var 月 = 数((状态.时间 || {}).月, 1), 岁 = 数((状态.时间 || {}).岁数, 14);
    var 选 = ((状态.局面 || {}).当前选项) || {};
    var 有 = Object.keys(选).map(function (k) {
      return k + '. ' + String((选[k] || {}).文本 || '');
    }).join(' / ');
    return 求AI(
      '【面板·她的心思】不要推进剧情，不要写正文，不要动任何变量。'
      + '只写一段屏幕外那个人的内心独白：〔〕里的那种语气。'
      + '她现在是「' + 她 + '」这套人设。'
      + '这一局走到：' + 岁 + ' 岁第 ' + 月 + ' 月，人在这儿：' + (地 || '未定') + '。'
      + (有 ? '她摆出来的选项是：' + 有 + '。' : '')
      + '她现在在想什么、她打算点哪一个、她心里有没有一点犹豫。'
      + '★ 只写她一个人，不要写 <user>，不要写游戏里发生的事。三百字以内。',
      '她的心思'
    );
  }

  /* ── ② 搭话：让 AI 写某个在场的人怎么反应 ── */
  function 求搭话(名) {
    var 地 = String((状态.场景 || {}).当前地点 || '');
    var o = (D.NPC || {})[名] || {};
    var 她 = String((状态.她 || {}).人设 || '');
    return 求AI(
      '【面板·搭话】<user> 主动去找「' + 名 + '」说话（' + (o.身份 || '') + '）。'
      + '现在人在：' + (地 || '未定') + '。'
      + '写这一段正文：他怎么被找到的、他当下的反应、两人的对话。'
      + '★ 按这个人自己的性子来（' + (o.性子 || '按档案') + '），别写成和气生财。'
      + '★ 屏幕外那个人现在是「' + 她 + '」这套人设 —— 〔〕里的反应照她那套来。'
      + '★ 这一段只写搭话，不要推进到别的事。',
      '找' + 名
    );
  }

  /* ── ③ 推演一步：不落子，先看这一步会变成什么样 ── */
  function 求推演() {
    var 选 = ((状态.局面 || {}).当前选项) || {};
    var 倾 = String((状态.局面 || {}).她的倾向 || '');
    var 有 = Object.keys(选).map(function (k) {
      return k + '（' + String((选[k] || {}).等级 || '') + '）. ' + String((选[k] || {}).文本 || '');
    }).join('；');
    var 她 = String((状态.她 || {}).人设 || '');
    if (!有) { 提示AI('这一层还没有选项，没法推演'); return false; }
    return 求AI(
      '【面板·推演】★ 这是推演，不是正文。不要推进任何东西，不要改变量，不要写对话。'
      + '现在摆在 <user> 面前的是：' + 有 + '。'
      + '屏幕外那个人是「' + 她 + '」这套人设，她倾向选：' + (倾 || '未定') + '。'
      + '用四到六条，分别写清楚：'
      + '① 如果她点了她倾向的那个，会走向哪（一句话，不展开）'
      + '② 每一个选项各自会碰到什么麻烦（各一句）'
      + '③ 这一层里最容易出事的是哪一处'
      + '★ 写成条目，不写成故事。',
      '推演这一步'
    );
  }

  /* ── ④ 回顾：把最近的经历压成"他记得的事" ── */
  function 求回顾() {
    return 求AI(
      '【面板·回顾】★ 只做归纳，不推进剧情，不写新事件，不改变量。'
      + '把到目前为止发生的事，压成一串「他记得的事」：'
      + '每条一行，短句，按时间先后，不超过十二条。'
      + '★ 只写已经发生过的，没发生过的一律不许写。'
      + '★ 不写别人的心理活动，只写他亲眼见的。',
      '回顾'
    );
  }

  /* ── ③ 她背着我做过什么（原「回顾」换成这个）──
     ★ 2026-09-17：原来那条只是把已发生的事摘要一遍，正文里本来就写了，价值低。
       换成「只列 <user> 没看见的那些」—— 她开挂改过的、趁画面切走时点的、绕开的那条路。
       这是既影响决策、又能查账的情报，而且**只有这个通道能拿到**。 */
  function 求漏看() {
    var 她 = String((状态.她 || {}).人设 || '');
    var 缝 = 数((状态.她 || {}).世界的裂缝);
    var 手段 = (状态.她 || {}).已用手段 || {};
    var 有手段 = Object.keys(手段).filter(function (k) { return 手段[k]; }).join('、');
    return 求AI(
      '【面板·她在背地里】★ 不推进剧情，不写正文，不动任何变量。只回答一件事：'
      + '<user> **没看见**的那些动作有哪些。'
      + '她这套人设是「' + 她 + '」。'
      + (缝 ? '她开挂留下的痕迹累计：' + 缝 + '。' : '')
      + (有手段 ? '她用过的那些手段：' + 有手段 + '。' : '')
      + '只列这些：她开挂改过的数值或关系、趁画面切走时替你点的、把某条路悄悄绕开的、'
      + '把某件事从你记忆里抹掉的。'
      + '★ 每条一行，短句，按时间先后，不超过八条。'
      + '★ 只列真的发生过的（从 她.已用手段、世界的裂缝、以及前面楼层里她做过的动作判断）；'
      + '没发生的一律不许编。一条都没有就写「暂时没有」。',
      '她的暗手'
    );
  }

  /* __AI_DELEG__ 需要 AI 的按钮统一走事件委托（不依赖各页自己绑定） */
  if (typeof document !== "undefined" && !window.__YX_AI_DELEG__) {
    window.__YX_AI_DELEG__ = 1;
    document.addEventListener("click", function (ev) {
      var 目 = ev.target;
      if (!目 || !目.closest) return;
      var b = 目.closest("[data-]".slice(0,6) + "搭话]");
      if (b) { 求搭话(b.getAttribute("data-搭话")); return; }
      var a = 目.closest("[data-ai]");
      if (a) {
        var k = a.getAttribute("data-ai");
        if (k === "心思") 求她的心思();
        else if (k === "漏看") 求漏看();
        else if (k === "回顾") 求回顾();
        else if (k === "推演") 求推演();
        return;
      }
    });
  }
  /* ★ 这一带谁在（2026-09-17 抽成共用函数，总览与打斗两页都调）
     三层：① 按当前地点 → ② 按 NPC作息判在不在 → ③ 分成「能打的」与「闲人」
     ★ 判据「契约 vs 实例」：地点名与作息是契约，当前地点是变量 */
  var 闲词 = ["小贩", "商贩", "杂货", "裁缝", "厨", "店小二", "孩子", "小书童", "小女孩",
              "游客", "挑夫", "进香", "卖花", "看门人", "喽啰", "教众", "门人", "卫兵", "团丁"];
  function 这一带谁在() {
    var 地点 = String(((状态.场景 || {}).当前地点) || "");
    var 在场 = Object.keys(D.NPC || {}).filter(function (n) {
      var w = String((D.NPC[n] || {}).所在 || "");
      if (!地点 || w.indexOf(地点.slice(0, 3)) < 0) return false;
      return 在班(n) !== 0;                      // 0 = 这时候不在（作息判的）
    });
    var 能打的 = 在场.filter(function (n) {
      var 身 = String((D.NPC[n] || {}).身份 || "");
      return !闲词.some(function (x) { return 身.indexOf(x) >= 0; });
    });
    return { 地点: 地点, 在场: 在场, 能打的: 能打的, 闲人: 在场.filter(function (n) { return 能打的.indexOf(n) < 0; }) };
  }


  function 谁在这(v) {
    if (Array.isArray(v)) return v.map(function (x) {
      return (typeof x === "string") ? { 名: x, 身份: "" } : { 名: String((x || {}).名 || ""), 身份: String((x || {}).身份 || "") };
    }).filter(function (x) { return x.名; });
    return String(v || "").split(" / ").map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (s) { return { 名: s, 身份: "" }; });
  }
  /* ════════════════════════════════════════════════════════════
     ▲ 开局选人（★ 2026-09-17 从开场白界面挪过来的）
     为什么挪：CDN 里的 <script> 在酒馆楼层里**不保证被执行**
       （jQuery .load() 对 HTML 片段走 innerHTML，而 innerHTML 不执行 script）。
     分工：界面只出 HTML（8 张卡静态写在 正则/开局选择界面.html），
           点击与确认由这里接（面板的 script 是确定能跑的）。
     通信：卡片 data-她="温砚"；确认按钮 id="gg4-ok"。
     ════════════════════════════════════════════════════════════ */
  var 她序 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '郁灼'];
  var 已选她 = '';

  function 选人点(名) {
    已选她 = 名;
    [].forEach.call(document.querySelectorAll('#gg4-list .c'), function (el) {
      if (el.getAttribute('data-她') === 名) el.classList.add('on'); else el.classList.remove('on');
    });
    var 提 = document.getElementById('gg4-pick');
    if (提) 提.textContent = '已选 ' + 名 + '，点确认就进她的那一局。';
    var 按钮 = document.getElementById('gg4-ok');
    if (按钮) 按钮.textContent = '确认「' + 名 + '」，开始';
  }

  async function 选人定() {
    if (!已选她) {
      var 提0 = document.getElementById('gg4-pick');
      if (提0) 提0.textContent = '先点一张卡。';
      return;
    }
    var 按钮 = document.getElementById('gg4-ok');
    if (按钮) { 按钮.textContent = '正在开局…'; }
    // ① 写变量 —— ★ 必须用面板自己的 写()（写 {type:'message'} 的 stat_data）
    //    2026-09-17 修：原来抄同级生选人界面的 updateVariablesWith({type:'chat'})，
    //    但**本卡的 MVU 变量在 message 层**（TavernHelper.getVariables({type:'message'})）
    //    → 写到 chat 去了 → 面板和条目都读不到 → 看上去「选了没生效」
    var 成 = await 写(function (sd) {
      sd.她 = sd.她 || {};
      sd.她.人设 = 已选她;
      sd.她.目的进度 = 0;
    });
    if (!成) { if (按钮) 按钮.textContent = '写不进去'; return; }
    // ② 切到她的那一段开场白（不 generate 现编；顺序必须与 first_messages 一致）
    var 序 = 她序.indexOf(已选她);
    var swipe = 2 + (序 < 0 ? 0 : 序);
    try {
      if (typeof setChatMessages === 'function') {
        await setChatMessages([{ message_id: 0, swipe_id: swipe }]);
        var 提 = document.getElementById('gg4-pick');
        if (提) 提.textContent = '已确认「' + 已选她 + '」。往上滑一层就是她的开局。';
      } else throw new Error('没有 setChatMessages');
    } catch (e) {
      var 提2 = document.getElementById('gg4-pick');
      if (提2) 提2.textContent = '变量写进了（她：' + 已选她 + '），但切层失败：' + (e && e.message) + '。手动切到那一段即可。';
    }
  }

  /* ★ 挂到 window：kai.html 里的卡片用 onclick="window.__选人__(...)" 调用
     2026-09-17 修：选人界面是**另一份 HTML**（CDN 的 kai.html），它自己的 <script> 不执行；
     而面板这份 script 是能跑的（页签能切证明了这点）。所以把函数挂出去，用 onclick 接 ——
     **onclick 是 HTML 属性，不受「script 不执行」影响**。 */
  if (typeof window !== "undefined") {
    window.__选人__ = 选人点;
    window.__选人定__ = 选人定;
    window.__选人已选__ = function () { return 已选她; };
  }
  /* 事件委托：卡片与确认按钮（放在最外层，任何页都能接） */
  if (typeof document !== 'undefined' && !window.__YX_KA__) {
    window.__YX_KA__ = 1;
    document.addEventListener('click', function (ev) {
      var 目 = ev.target;
      if (!目 || !目.closest) return;
      var 卡 = 目.closest('[data-她]');
      if (卡) { 选人点(卡.getAttribute('data-她')); return; }
      var 确 = 目.closest('#gg4-ok');
      if (确) { 选人定(); return; }
    });
  }

  /* ══ 图标库（内联 SVG，不依赖字体）══ */
  var I = {
    拳脚: '<path d="M7 12 V6 a2 2 0 1 1 4 0 v6 M11 12 V5 a2 2 0 1 1 4 0 v7 M15 12 V7 a2 2 0 1 1 4 0 v8 a6 6 0 0 1 -6 6 H10 a6 6 0 0 1 -6 -6 v-3 a2 2 0 0 1 4 0"/>',
    内功: '<circle cx="12" cy="12" r="3"/><path d="M12 3 v3 M12 18 v3 M3 12 h3 M18 12 h3 M5.5 5.5 l2 2 M16.5 16.5 l2 2 M5.5 18.5 l2 -2 M16.5 7.5 l2 -2"/>',
    轻功: '<path d="M4 18 h16"/><path d="M8 14 l3 -8 3 8"/><path d="M6 14 h12"/>',
    剑: '<path d="M18 3 l3 3 -9 9 -3 -3 Z"/><path d="M9 12 l-4 4 M4 20 l2 -2"/>',
    刀: '<path d="M20 3 c-6 1 -11 6 -12 12 l3 3 c6 -1 11 -6 12 -12 Z"/><path d="M5 15 l-2 5 5 -2"/>',
    杖: '<path d="M6 21 L18 5"/><circle cx="19" cy="4" r="2"/>',
    鞭: '<path d="M4 4 c4 6 12 2 14 8 c2 5 -6 8 -10 5"/><circle cx="4" cy="4" r="1.5"/>',
    招架: '<path d="M12 3 L20 6 v6 c0 5 -8 9 -8 9 s-8 -4 -8 -9 V6 Z"/>',
    书: '<path d="M4 5 a2 2 0 0 1 2 -2 h5 v18 H6 a2 2 0 0 1 -2 -2 Z"/><path d="M20 5 a2 2 0 0 0 -2 -2 h-5 v18 h5 a2 2 0 0 0 2 -2 Z"/>',
    法术: '<path d="M12 2 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"/><path d="M19 15 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1 Z"/>',
    物品: '<path d="M4 8 h16 l-1.5 12 a2 2 0 0 1 -2 1.8 h-9 a2 2 0 0 1 -2 -1.8 Z"/><path d="M9 8 V6 a3 3 0 0 1 6 0 v2"/>',
    任务: '<path d="M9 5 h9 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 V7"/><path d="M7 3 v4 h5"/><path d="M9 13 h6 M9 17 h4"/>',
    人: '<circle cx="12" cy="8" r="4"/><path d="M4 21 a8 8 0 0 1 16 0"/>',
    两人: '<circle cx="9" cy="8" r="3"/><path d="M3 20 a6 6 0 0 1 12 0"/><circle cx="17.5" cy="10" r="2.2"/><path d="M15 19 a5 5 0 0 1 6.5 -1.5"/>',
    地点: '<path d="M12 22 s7 -7 7 -12 a7 7 0 1 0 -14 0 c0 5 7 12 7 12 Z"/><circle cx="12" cy="10" r="2.5"/>',
    门派: '<path d="M4 21 V9 l8 -6 8 6 v12"/><path d="M9 21 v-6 h6 v6"/>',
    身体: '<circle cx="12" cy="7" r="3"/><path d="M12 10 v7 M8 13 h8 M10 21 l2 -4 2 4"/>',
    她: '<circle cx="12" cy="12" r="9"/><path d="M12 7 v5 l3 2"/>',
    星: '<path d="M12 3 l2.6 6.3 6.4 .5 -4.9 4.2 1.5 6.3 -5.6 -3.4 -5.6 3.4 1.5 -6.3 -4.9 -4.2 6.4 -.5 Z"/>',
    火: '<path d="M12 3 c3 4 5 6 5 9 a5 5 0 1 1 -10 0 c0 -3 2 -5 5 -9 Z"/><path d="M12 14 c1 2 2 2.5 2 4 a2 2 0 1 1 -4 0 c0 -1.5 1 -2 2 -4 Z"/>',
    毒: '<circle cx="12" cy="12" r="7"/><circle cx="9.5" cy="10" r="1.5" fill="currentColor"/><circle cx="14" cy="14" r="1.5" fill="currentColor"/>',
    心: '<path d="M12 20 s-8 -5 -8 -10 a4.5 4.5 0 0 1 8 -2.5 a4.5 4.5 0 0 1 8 2.5 c0 5 -8 10 -8 10 Z"/>',
    锁: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11 V7 a4 4 0 0 1 8 0 v4"/>',
    钟: '<circle cx="12" cy="13" r="8"/><path d="M12 9 v4 l3 2 M9 21 h6"/>',
    环: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    折: '<path d="M6 9 l6 6 6 -6"/>',
    右: '<path d="M9 6 l6 6 -6 6"/>',
    加: '<path d="M12 5 v14 M5 12 h14"/>',
    减: '<path d="M5 12 h14"/>',
    检: '<circle cx="11" cy="11" r="7"/><path d="M16 16 l5 5"/>',
    门: '<path d="M4 21 V4 a1 1 0 0 1 1 -1 h14 a1 1 0 0 1 1 1 v17"/><circle cx="15" cy="12" r="1" fill="currentColor"/>',
  };
  /* 取图标：名字命中就返回对应，否则给个通用圆点 */
  function ic(名, s) {
    var sz = s || 13;
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex:none;vertical-align:-2px">' + (I[名] || I.环) + "</svg>";
  }
  /* 按功夫名猜图标 */
  function 功夫图标(名) {
    var n = String(名 || "");
    if (n.indexOf("拳") >= 0 || n.indexOf("掌") >= 0 || n.indexOf("手") >= 0) return "拳脚";
    if (n.indexOf("内功") >= 0 || n.indexOf("神功") >= 0 || n.indexOf("一气") >= 0 || n.indexOf("聚顶") >= 0) return "内功";
    if (n.indexOf("轻功") >= 0 || n.indexOf("身法") >= 0 || n.indexOf("踏雪") >= 0) return "轻功";
    if (n.indexOf("剑") >= 0) return "剑";
    if (n.indexOf("刀") >= 0) return "刀";
    if (n.indexOf("杖") >= 0) return "杖";
    if (n.indexOf("鞭") >= 0) return "鞭";
    if (n.indexOf("招架") >= 0) return "招架";
    if (n.indexOf("读书") >= 0 || n.indexOf("写字") >= 0) return "书";
    if (n.indexOf("法术") >= 0 || n.indexOf("诀") >= 0) return "法术";
    return "环";
  }
  /* 按名字猜物品图标 */
  function 物品图标(名) {
    var n = String(名 || "");
    if (n.indexOf("剑") >= 0) return "剑";
    if (n.indexOf("刀") >= 0) return "刀";
    if (n.indexOf("杖") >= 0) return "杖";
    if (n.indexOf("鞭") >= 0) return "鞭";
    if (n.indexOf("甲") >= 0 || n.indexOf("衣") >= 0 || n.indexOf("衫") >= 0 || n.indexOf("裙") >= 0) return "招架";
    if (n.indexOf("丹") >= 0 || n.indexOf("药") >= 0) return "毒";
    if (n.indexOf("酒") >= 0) return "火";
    return "物品";
  }
  var 页 = 'overview', 状态 = {}, 楼 = -1, 选中 = '';
  var 主题表 = ['jianghu', 'ancient', 'plain'], 主题序 = 0;

  /* ── 页签 ── */
  var ICON = {
    overview: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    skills: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 2 v6 M12 16 v6 M2 12 h6 M16 12 h6"/><circle cx="12" cy="12" r="3"/></svg>',
    items: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 8 h16 l-1.5 12 a2 2 0 0 1 -2 1.8 h-9 a2 2 0 0 1 -2 -1.8 Z"/><path d="M9 8 V6 a3 3 0 0 1 6 0 v2"/></svg>',
    tasks: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 5 h9 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 V7"/><path d="M7 3 v4 h5"/><path d="M9 13 h6 M9 17 h4"/></svg>',
    people: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><path d="M3 20 a6 6 0 0 1 12 0"/><circle cx="17.5" cy="10" r="2.2"/><path d="M15 19 a5 5 0 0 1 6.5 -1.5"/></svg>',
    world: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12 h18 M12 3 a14 14 0 0 1 0 18 a14 14 0 0 1 0 -18"/></svg>',
    body: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 21 a9 9 0 1 0 0 -18 a9 9 0 0 0 0 18 Z"/><path d="M12 7 v5 l3 2"/></svg>',
  };
  var 页表 = [
    { id: "overview", 名: "总览" }, { id: "skills", 名: "技能" }, { id: "items", 名: "行囊" },
    { id: "tasks", 名: "活计" }, { id: "people", 名: "人物" }, { id: "world", 名: "世界" },
    { id: "map", 名: "舆图" },
    { id: "body", 名: "身体" },
    { id: "dan", 名: "丹房" },
    { id: "fight", 名: "打斗" },
    { id: "rank", 名: "英雄榜" },
  ];
  function 画页签() {
    document.getElementById('yx-tb').innerHTML = 页表.map(function (p) {
      return '<button class="' + (页 === p.id ? 'on' : '') + '" data-p="' + p.id + '">' + (ICON[p.id] || '') + '<span>' + p.名 + '</span></button>';
    }).join('');
    [].forEach.call(document.querySelectorAll('.yx-tb button'), function (b) {
      b.addEventListener('click', function () { 页 = b.getAttribute('data-p'); 画页签(); 画(); });
    });
  }

  /* ── 弹层 ── */
  function 开层(标题, 内容) {
    层内.innerHTML = '<h4>' + E(标题) + '</h4>' + 内容;
    层.classList.add('on'); 遮.classList.add('on');
  }
  function 关层() { 层.classList.remove('on'); 遮.classList.remove('on'); }
  document.getElementById('yx-md-x').addEventListener('click', 关层);
  document.getElementById('yx-help').addEventListener('click', function () { 页 = 'help'; 画页签(); 画(); });
  遮.addEventListener('click', 关层);

  /* ── 主题 ── */
  document.getElementById('yx-theme').addEventListener('click', function () {
    主题序 = (主题序 + 1) % 主题表.length;
    根.setAttribute('data-theme', 主题表[主题序]);
    try { localStorage.setItem('yx-theme', 主题表[主题序]); } catch (e) { }
  });
  try { var t0 = localStorage.getItem('yx-theme'); if (t0) { 根.setAttribute('data-theme', t0); 主题序 = 主题表.indexOf(t0) < 0 ? 0 : 主题表.indexOf(t0); } } catch (e) { }

  /* ════════════ 各页渲染 ════════════ */

  /* ── 顶部四数条 ── */
  function 画四数() {
    var T = 状态.时间 || {}, H = 状态.她 || {}, NS = 状态.NSFW || {};
    var B = 状态.身体 || {}, t = 算天赋(状态), d = 派生(t, 状态);
    var hpMax = d.气血上限, hp = 夹(数(B.生命当前), 0, hpMax);
    var 限 = (状态.时间 || {}).耐心 == null ? 24 : 数((状态.时间 || {}).耐心);
    var 兴 = 数(NS.兴奋度);
    var 反 = 夹(数(H.反抗值, 100), 0, 100);
    var 体力 = 数((状态.时间 || {}).体力, 100);
    var 行动点 = 数((状态.时间 || {}).行动点, 3);
    document.getElementById("yx-quad").innerHTML = [
      { k: "岁数", v: (数((状态.时间||{}).岁数, 14)), u: "岁 · 第 " + (数((状态.时间||{}).月, 1)) + " 月" },
      { k: "体力", v: Math.round(体力), u: 体力 < 30 ? "乏了" : "", c: 体力 < 30 ? "wn" : "" },
      { k: "行动点", v: 行动点, u: "/ 3", c: 行动点 > 0 ? "" : "wn" },
      { k: "耐心", v: 限, u: "月", c: 限 <= 6 ? "wn" : "" },
      { k: "反抗", v: Math.round(反), u: 反 < 20 ? "快到极限" : "", c: 反 < 20 ? "wn" : "" },
      { k: "对/她的了解", v: 数((状态.主角 || {}).对她的了解, 0), u: "级", c: "" },
    ].map(function (x) {
      return '<div class="yx-q ' + (x.c || "") + '"><div class="k">' + x.k + '</div>'
        + '<div class="v">' + E(x.v) + (x.u ? '<u>' + E(x.u) + "</u>" : "") + "</div></div>";
    }).join("");
    document.getElementById("yx-sub").textContent =
      (状态.场景 || {}).当前地点 ? ((状态.场景 || {}).当前地点) : "——";
  }

  /* ── 总览 ── */
  function 画总览() {
    var T = 状态.时间 || {}, C = 状态.场景 || {}, B = 状态.身体 || {}, R = 状态.资源 || {},
      H = 状态.她 || {}, NS = 状态.NSFW || {}, 局 = 状态.局面 || {};
    var t = 算天赋(状态), d = 派生(t, 状态);
    var hpMax = d.气血上限, hp = 夹(数(B.生命当前), 0, hpMax);
    var mpMax = Math.max(1, 数(B.内力强度)), mp = 夹(数(B.内力蓄存), 0, mpMax);
    var 反 = 夹(数(H.反抗值, 100), 0, 100);
    var 兴 = 数(NS.兴奋度);

    // ★ 四个进度环（武功总评 / 对她的了解 / 体力 / 行动点）
    var 武评 = 0, 技2 = 状态.技能 || {};
    Object.keys(技2.基本 || {}).forEach(function (k) { 武评 += 数(技2.基本[k]); });
    Object.keys(技2.门派 || {}).forEach(function (k) { 武评 += 数(技2.门派[k]); });
    var 了解 = 数((状态.主角 || {}).对她的了解, 0);
    /* ★ 2026-09-17 改（用户问「这个有什么用」）：
       原来两个按钮的文案是谜语（「把这一路压成他记得的事」猜不出是干嘛的），而且都不改状态。
       现在：
         留「她打算点哪条」 —— 这是玩家唯一能偷看屏幕外那个人的通道（她怎么想、会不会犹豫）
         把「回顾」换成「她背着我做过什么」 —— 只列她做过而 <user> 没看见的：
           开挂改过的、趁画面切走时点的、把路线绕开的。这是既影响决策、又能查账的情报。
       ★ 两个都不推进剧情、不动变量，只回答问题。 */
    /* ★ 2026-09-17 删掉「问她（各花一次生成，不动剧情）」整块。
       理由：同级生2 的面板里**没有这个东西**，是我自己臆想加的两个 AI 按钮。
       面板不该有"我发明的小功能"——用户没要求过，看不懂也没用。 */
    var AI条 = '';
    var 环 = AI条 + '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">当下</div><div class="yx-rings">'
      + 画环(Math.min(100, 武评 / 20), "var(--gold)", "武功总评", 武评)
      + 画环(了解 * 10, "var(--blu)", "对她的了解", 了解 + " / 10")
      + 画环(数((状态.时间 || {}).体力, 100), "var(--grn)", "体力", 数((状态.时间 || {}).体力, 100))
      + 画环(数((状态.时间 || {}).行动点, 3) / 3 * 100, "var(--rose)", "行动点", 数((状态.时间 || {}).行动点, 3) + " / 3")
      + "</div></div></div>";

    var H1 = '<div class="yx-r">'
      + '<div class="yx-c"><div class="yx-ttl">此时</div>'
      + 行('岁数', (数((状态.时间||{}).岁数, 14)) + ' 岁　第 ' + (数((状态.时间||{}).月, 1)) + ' 月')
      + 行('耐心', (数((状态.时间||{}).耐心, 24)) + ' 月', (数((状态.时间||{}).耐心, 24) <= 6 ? 'w' : ''))
      + 行('门派', C.当前门派 || '无') + 行('所在', C.当前地点 || '平安镇')
      + (C.当前女角 ? 行('正在她这条线上', C.当前女角, 'g') : '')
      + '</div>'
      + '<div class="yx-c"><div class="yx-ttl">三围之数</div>'
      + '<div class="yx-r" style="gap:8px">'
      + ['膂力', '敏捷', '根骨', '悟性'].map(function (k) { return '<span class="yx-ch">' + k + ' ' + t[k] + '</span>'; }).join('')
      + '</div>'
      + '<div class="yx-nt">派生：' + Object.keys(d).map(function (k) { return k + ' ' + d[k]; }).join('　') + '</div>'
      + '</div></div>';

    var H2 = '<div class="yx-r">'
      + '<div class="yx-c"><div class="yx-ttl">身体</div>'
      + '<div class="yx-bar"><i class="hp" style="width:' + (hp / hpMax * 100) + '%"></i></div>'
      + '<div class="yx-nt">生命 ' + Math.round(hp) + '/' + hpMax + '　有效 ' + (B.生命有效 == null ? 100 : B.生命有效) + '%</div>'
      + '<div class="yx-bar" style="margin-top:6px"><i class="mp" style="width:' + (mp / mpMax * 100) + '%"></i></div>'
      + '<div class="yx-nt">内力 ' + Math.round(mp) + '/' + mpMax + '</div>'
      + '<div class="yx-bar" style="margin-top:6px"><i class="rs" style="width:' + 反 + '%"></i></div>'
      + '<div class="yx-nt">反抗 ' + Math.round(反) + (反 < 20 ? '　★ 快到极限了' : '') + '</div>'
      + '</div>'
      + '<div class="yx-c"><div class="yx-ttl">她</div>'
    // （此处原是臆想的交互，已按「面板职责边界」移除）
      + 行('世界的裂缝', 数(H.世界的裂缝)) + 行('目的进度', 数(H.目的进度) + '%')
      + '<div class="yx-nt">' + (她的手段() || '') + '</div>'
      + '</div></div>';

    var H3 = '';
    var 任在做 = [], 任在 = 状态.任务 || {};
    for (var k in 任在) if (任在[k] && 任在[k].状态 === '进行') 任在做.push(任在[k]);
    if (任在做.length) {
      H3 += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">手上还有 ' + 任在做.length + ' 件</div>';
      H3 += 任在做.slice(0, 4).map(function (x) {
        var 需 = 数(x.需要), 进 = 数(x.进度);
        return '<div style="margin-bottom:6px"><div class="yx-ln"><span>' + E(x.名 || '') + '</span><b>'
          + (需 ? (进 + '/' + 需) : '在做') + '</b></div>'
          + (需 ? '<div class="yx-bar sm"><i class="tk" style="width:' + Math.round(进 / 需 * 100) + '%"></i></div>' : '')
          + '</div>';
      }).join('');
      H3 += '</div></div>';
    }

    var H4 = '';
    // ── 动手（★ <user> 侧动作，语义：他在动手）──
    var 一带 = 这一带谁在(), 地点 = 一带.地点, 能打的 = 一带.能打的, 闲人 = 一带.闲人;
    if (能打的.length) {
      H4 += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">可交战目标 <em>（' + 地点 + '，这时候在的）</em></div><div class="yx-foes">';
      能打的.forEach(function (n) {
        var 品 = NPC品级(n), 色 = 档色(品);
        var o = D.NPC[n] || {};
        H4 += '<button class="yx-btn" data-foe="' + E(n) + '" style="border-color:' + 色 + '66;color:' + 色
          + '" title="' + E(品名(品)) + (o.身份 ? '：' + E(o.身份) : '') + '">' + E(n) + '</button>';
      });
      H4 += '</div>';
      // ★ 闲人另列一排（他们打不了，但玩家该知道这一带有谁）
      if (闲人.length) {
        H4 += '<div class="yx-chips" style="margin-top:8px">' + 闲人.map(function (n) {
          return '<span class="yx-ch" title="' + E(String((D.NPC[n] || {}).身份 || '')) + '">' + E(n) + '</span>';
        }).join('') + '</div><div class="yx-nt">★ 这些人不是对手，是这一带的活人。</div>';
      }
      H4 += '<div class="yx-nt">战斗在前端逐回合真跑（掷值确定，同一局面重跑结果一致），结果写进「上一场」。</div></div></div>';
    } else if (地点) {
      H4 += '<div class="yx-r"><div class="yx-c"><div class="yx-ttl">可交战目标 <em>（' + 地点 + '）</em></div>'
        + '<div class="yx-e">这时候这一带没有能动手的。换个时辰，或者换个地方。</div></div></div>';
    }

    var 战 = 局.战斗结果;
    if (战 && 战.结果) {
      H4 += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">上一场</div>'
        + 行(战.结果, 战.回合数 + ' 回合')
        + (战.我方 ? 行('我方', 战.我方) : '') + (战.对方 ? 行('对方', 战.对方) : '')
        + (战.存活 ? 行('存活', 战.存活) : '')
        + ((战.不可逆 || []).length ? 行('不可逆', 战.不可逆.join('、'), 'w') : '')
        + '</div></div>';
    }
    H1 = 环 + H1;
    return H1 + H2 + H3 + H4;
  }

  /* ── 技能（含技能树）── */
  function 画技能() {
    var 技 = (状态.技能 || {}).基本 || {}, 门技 = (状态.技能 || {}).门派 || {};
    var t = 算天赋(状态);
    var 已学 = [];
    for (var k in 技) if (数(技[k]) > 0) 已学.push([k, 技[k], "基本"]);
    for (var j in 门技) if (数(门技[j]) > 0) 已学.push([j, 门技[j], "门派"]);

    var H = "";
    // ── 成本公式（可交互的计算器）──
    // ★ 树放最前（第一屏就能看到）
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">技能树（点节点看条件）</div>'
      + '<div class="yx-tree">' + 画技能树() + '</div>'
      + '<div class="yx-nt">基本武功 → 门派武功 → 绝招。★ 绝招不是独立等级，是几门同时到位才开。</div>'
      + '</div></div>';
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">请教成本（公式）</div>'
      + '<div class="yx-help" style="font-size:12px">'
      + '<code>成本 = 355.06 × (当前等级 + 1) ÷ max(1, 悟性)</code>'
      + '<ul><li>常数 <code>355.06</code> 是从原作反解出来的（一门学满 250 级的总消耗）</li>'
      + '<li>你的悟性 <b>' + t.悟性 + "</b>　潜能 <b>" + 数((状态.资源 || {}).潜能) + '</b></li>'
      + '<li>所以悟性越高，同一级花的潜能越少 —— 这就是为什么开局要先读书</li></ul></div>'
    // ★ 技能格子（游戏技能栏的做法：图标 + 环形等级 + 角标）
    if (!已学.length) H += '<div class="yx-e">尚无已学技能。需拜师或寻秘籍。</div>';
    else {
      var 绝全 = D.绝招 || [];
      H += '<div class="yx-skgrid">';
      H += 已学.map(function (x) {
        var 名 = x[0], 现 = 数(x[1]), 类 = x[2];
        var 悟 = Math.max(1, t.悟性);
        var 要 = Math.max(1, Math.round(355.06 * (现 + 1) / 悟));
        var pct = Math.min(100, Math.round(现 / 255 * 100));
        var 够 = 数((状态.资源 || {}).潜能) >= 要;
        var 环 = 2 * Math.PI * 15;
        var 弧 = 环 * pct / 100;
        var 品 = 武功品级(名), 色 = 档色(品);
        return '<div class="yx-sk" data-skk="' + E(名) + '" style="border-color:' + 色 + '66">'
          + '<div class="ring"><svg viewBox="0 0 36 36" width="36" height="36">'
          + '<circle cx="18" cy="18" r="15" fill="none" stroke="' + 色 + '22" stroke-width="2.5"/>'
          + '<circle cx="18" cy="18" r="15" fill="none" stroke="' + 色 + '" stroke-width="2.5" '
          +   'stroke-dasharray="' + 弧 + " " + 环 + '" stroke-linecap="round" transform="rotate(-90 18 18)" opacity=".85"/>'
          + '</svg><span class="ic" style="color:' + 色 + '">' + ic(功夫图标(名), 17) + '</span></div>'
          + '<div class="nm">' + 染(名, 品) + '</div>'
          + '<div class="lv">' + 现 + '</div>'
          + '<span class="yx-wm">' + 品名(品) + '</span>'
          + '<div class="bdg" style="color:' + 色 + ';border-color:' + 色 + '66">' + 品名(品) + (够 ? " · 可升" : "") + '</div>'
          + '</div>';
      }).join("");
      H += '</div>';
      H += '<div class="yx-nt">点格子看升级消耗与通向的绝招。环为当前等级（上限 255）。</div>';
    }
    H += '</div></div>';

    // ── 技能树（三层 SVG）──

    // ── 绝招表（条件 / 效果 / 冷却）──
    var 绝 = D.绝招 || [];
    if (绝.length) {
      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">绝招（' + 绝.length + '）</div>'
        + '<table class="yx-tbl wrap"><thead><tr><th>派</th><th>招</th><th>条件</th><th>效果</th><th>冷却</th></tr></thead><tbody>'
        + 绝.map(function (x) {
          var 品 = 绝招品级(x.条件), 色 = 档色(品);
          return '<tr><td>' + E(x.派) + '</td><td>' + '<span style="color:' + 色 + '">' + E(x.名) + '</span>' + '</td><td class="yx-num">' + '<span style="color:' + 色 + '88;font-size:11px">' + 品名(品) + '</span> ' + E(x.条件) + '</td>'
            + '<td>' + E(x.效果) + '</td><td class="yx-num">' + (x.冷却 == null ? "—" : x.冷却 + " 回合") + '</td></tr>';
        }).join("") + '</tbody></table></div></div>';
    }

    // ── 十门基本功 ──
    var 基 = D.基本武功 || [];
    if (基.length) {
      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">十门基本功（反哺的来源）</div><div class="yx-chips">'
        + 基.map(function (n) {
          var v = 数(技[n]);
          return '<span class="yx-ch' + (v > 0 ? " on" : " off") + '">' + E(n) + (v > 0 ? " " + v : "") + '</span>';
        }).join("") + '</div>'
        + '<div class="yx-nt">每满十级 → 一个天赋 +1。基本拳脚→膂力、基本轻功→敏捷、基本内功→根骨、读书写字→悟性</div></div></div>';
    }
    return H;
  }
  /* ════════════════════════════════════════════════════════════
     技能树（★ 真树：父 → 子，一个节点可以分叉出多个子节点）

     结构照 V3.738 的做法：index.nodes[id] = { 名, parentId, childIds }
     依赖关系从契约推：
       · 根   = 十门基本武功
       · 中   = 门派武功（挂在门派上）
       · 叶   = 绝招（★ 它条件里提到哪些功夫，就连到哪些节点 —— 这就是「分叉」）
     ════════════════════════════════════════════════════════════ */
  function 建树() {
    var 节点 = {}, 根s = [], 序 = 0;
    function 加(名, 父, 类, 品, 附) {
      var id = "n" + (序++);
      节点[id] = { id: id, 名: 名, 父: 父 || null, 子: [], 类: 类, 品: 品, 附: 附 || "" };
      if (父 && 节点[父]) 节点[父].子.push(id); else 根s.push(id);
      return id;
    }
    var 当前派 = (状态.场景 || {}).当前门派 || "";
    var 武 = D.门派武功 || {};
    var 已 = {};
    var 技0 = (状态.技能 || {}).基本 || {}, 门0 = (状态.技能 || {}).门派 || {};
    for (var q in 技0) 已[q] = 数(技0[q]);
    for (var q2 in 门0) 已[q2] = 数(门0[q2]);

    // ── ① 只画【学过的基本功】（没学的也占位，但只画前 10 个）──
    var 基id = {};
    (D.基本武功 || []).forEach(function (n) { 基id[n] = 加(n, null, "基本", "q1"); });

    // ── ② 当前门派的武功，挂在「基本内功」下（功夫都从内功起）──
    var 主根 = 基id["基本内功"] || 根s[0];
    if (当前派 && 武[当前派]) {
      var 列 = 武[当前派] || [];
      列.forEach(function (名, i) {
        var 品 = i === 列.length - 1 ? "q4" : (i <= 1 ? "q2" : "q3");
        基id[名] = 加(名, 主根, "门派武功", 品, 已[名] ? "已学 " + 已[名] : "");
      });
    }

    // ── ③ 绝招：★ 2026-09-17 改（原来一律挂 null → 全排在根那一列 → 线从一点扇出）──
    //   两条规矩：
    //     ① 依赖匹配得到就挂依赖下；匹配不到一律挂【主根】（基本内功），绝不挂 null
    //     ② 条件没满足的照画，但标成「还没开」—— 让玩家看得见路，又不会被当成已拥有
    var 名到id = {};
    Object.keys(节点).forEach(function (id) { 名到id[节点[id].名] = id; });
    var 上个条件 = "";
    (D.绝招 || []).forEach(function (j) {
      if (当前派 && j.派 !== 当前派) return;                   // ★ 只画当前门派的绝招
      var 条 = String(j.条件 || "");
      // ★ 契约里写着「同上」—— 展开成上一个绝招的条件（同派内继承）
      if (条.indexOf("同上") >= 0 && 上个条件) 条 = 条.split("同上").join(上个条件);
      else if (条.indexOf("同上") < 0) 上个条件 = 条;
      // ★ 依赖：把条件里提到的武功名找出来（≥2 字，短名优先排除）
      var 依赖 = Object.keys(名到id).filter(function (n) { return n.length >= 2 && 条.indexOf(n) >= 0; });
      依赖.sort(function (x, y) { return y.length - x.length; });   // 最长 = 最具体
      var pid = (依赖.length && 名到id[依赖[0]]) ? 名到id[依赖[0]] : 主根;   // ★ 兜底挂主根
      var 品 = (条.match(/≥|>=/g) || []).length >= 2 ? "q4" : "q3";
      // ★ 这个绝招的每一门依赖是不是都到位了
      var 开了 = 依赖.every(function (n) { return 数(已[n]) > 0; });
      var id = 加(j.名, pid, "绝招", 品,
        (开了 ? "" : "还没开　") + "冷却 " + (j.冷却 == null ? "—" : j.冷却)
        + (依赖.length ? "　看 " + 依赖[0] : ""));
      节点[id].开了 = 开了;
    });
    return { 节点: 节点, 根: 根s };
  }
  /* ── 布局：按深度分列，列内纵向排（★ 绝不重叠）── */
  function 布局(树) {
    var 节点 = 树.节点;
    var X0 = 26, 列宽 = 196, 行高 = 32;
    // 递归算深度
    var 深 = {};
    function 算深(id, d, 防) {
      if (防 > 20) return;                       // 防意外递归
      if (深[id] === undefined || d > 深[id]) 深[id] = d;
      (节点[id].子 || []).forEach(function (c) { if (节点[c]) 算深(c, d + 1, (防 || 0) + 1); });
    }
    (树.根 || []).forEach(function (r) { 算深(r, 0, 0); });
    Object.keys(节点).forEach(function (id) { if (深[id] === undefined) 深[id] = 0; });
    // 按深度归列
    var 列 = {};
    Object.keys(节点).forEach(function (id) {
      var d = 深[id];
      (列[d] = 列[d] || []).push(id);
    });
    // ★ 列内排序：先按「父在上一列的位置」排，再按名字 —— 这样连线不会交叉太多
    var 位 = {}, 最深 = 0, 最多 = 0;
    Object.keys(列).map(Number).sort(function (x, y) { return x - y; }).forEach(function (d) {
      var 本列 = 列[d];
      本列.sort(function (x, y) {
        var px = 节点[x].父 ? (位[节点[x].父] || {}).序 : -1;
        var py = 节点[y].父 ? (位[节点[y].父] || {}).序 : -1;
        if (px !== py) return (px || 0) - (py || 0);
        return String(节点[x].名).localeCompare(String(节点[y].名));
      });
      本列.forEach(function (id, i) {
        位[id] = { x: X0 + d * 列宽, y: 30 + i * 行高, 序: i, 深: d };
      });
      最多 = Math.max(最多, 本列.length);
      最深 = Math.max(最深, d);
    });
    return { 位: 位, 宽: X0 * 2 + (最深 + 1) * 列宽, 高: Math.max(100, 最多 * 行高 + 52), 深: 深 };
  }
  /* ── 画树（SVG：先连线，再节点）── */
  function 画技能树() {
    var 树 = 建树();
    var L = 布局(树);
    if (!Object.keys(树.节点).length) return '<div class="yx-e">契约层还没填技能树。</div>';
    var 技 = (状态.技能 || {}).基本 || {}, 门技 = (状态.技能 || {}).门派 || {};
    var 已 = {};
    for (var k in 技) 已[k] = 数(技[k]);
    for (var j in 门技) 已[j] = 数(门技[j]);
    var s = '<svg viewBox="0 0 ' + L.宽 + " " + L.高 + '" width="100%" height="' + L.高 + '" preserveAspectRatio="xMinYMid meet" style="display:block">';
    // ① 先画边（父子折线）
    Object.keys(树.节点).forEach(function (id) {
      var n = 树.节点[id];
      var p = L.位[id];
      if (!p) return;
      (n.子 || []).forEach(function (c) {
        var q = L.位[c];
        if (!q) return;
        // ★ 折线：横出去 → 竖下来 → 横进去（树的标准画法）
        var x1 = p.x + 116, y1 = p.y, x2 = q.x, y2 = q.y, mx = (x1 + x2) / 2;
        s += '<path d="M' + x1 + " " + y1 + " C" + mx + " " + y1 + "," + mx + " " + y2 + "," + x2 + " " + y2 + '" fill="none" stroke="' + 档色(n.品) + '" stroke-width="1.5" opacity=".7"/>';
      });
    });
    // ② 再画节点
    Object.keys(树.节点).forEach(function (id) {
      var n = 树.节点[id];
      var p = L.位[id];
      if (!p) return;
      var 色 = 档色(n.品);
      var v = 数(已[n.名]);
      var 有 = v > 0;
      // ★ 绝招多一档「还没开」：条件里的武功还没学过 → 画暗，且不标已学
      var 还没开 = (n.类 === '绝招' && n.开了 === false);
      var 活 = 有 || (n.类 === '绝招' && !还没开);
      var 宽 = 170, 高 = 24;
      s += '<g class="yx-tn" data-tn="' + E(n.名) + '" style="cursor:pointer">';
      s += '<rect x="' + p.x + '" y="' + (p.y - 11) + '" width="' + 宽 + '" height="' + 高 + '" rx="5" '
        + 'fill="' + (有 ? 色 + "26" : "var(--b0)") + '" stroke="' + 色 + '" stroke-width="' + (有 ? 1.2 : (活 ? 0.9 : 0.5)) + '" '
        + (还没开 ? 'stroke-dasharray="3 3" ' : '') + 'opacity="' + (有 ? 1 : (活 ? 0.78 : 0.42)) + '"/>';
      s += '<text x="' + (p.x + 9) + '" y="' + (p.y + 4) + '" fill="' + 色 + '" font-size="10.5" '
        + 'font-weight="' + (有 ? 500 : 400) + '" opacity="' + (有 ? 1 : (活 ? 0.85 : 0.5)) + '">' + E(n.名) + "</text>";
      if (有) s += '<text x="' + (p.x + 宽 - 8) + '" y="' + (p.y + 4) + '" text-anchor="end" fill="' + 色 + '" font-size="10">' + v + "</text>";
      else if (还没开) s += '<text x="' + (p.x + 宽 - 8) + '" y="' + (p.y + 4) + '" text-anchor="end" fill="' + 色 + '" font-size="9" opacity=".55">未开</text>';
      /* 品级不在树里挤一行了（挪到 title） */
      s += "</g>";
    });
    s += "</svg>";
    return s;
  }
  /* ── 行囊 ── */
  function 画行囊() {
    var 包 = 状态.背包 || [];
    var 穿 = ((状态.NSFW || {}).穿着) || {};
    var 物表 = ((D.物品 || {}).示例) || [];
    var 部位s = (D.NSFW.穿着 || {}).部位 || [];
    var H = "";

    // ── 左：人形装备槽 ──
    H += '<div class="yx-r"><div class="yx-c" style="max-width:290px">'
      + '<div class="yx-ttl">穿着（点槽位换或脱）</div>'
      + '<div class="yx-dollwrap">'
      + '<div class="yx-doll">'
      + '<svg viewBox="0 0 110 210" width="98" height="186">'
      // 头
      + '<ellipse cx="55" cy="24" rx="14" ry="17" fill="var(--b3)" stroke="var(--ln3)" stroke-width="0.8"/>'
      // 颈
      + '<path d="M50 40 v7 M60 40 v7" stroke="var(--ln3)" stroke-width="0.8"/>'
      // 躯干（肩宽腰窄）
      + '<path d="M34 51 Q55 46 76 51 L72 96 Q55 101 38 96 Z" fill="var(--b3)" stroke="var(--ln3)" stroke-width="0.8"/>'
      // 手臂
      + '<path d="M35 53 L22 96 L25 116" stroke="var(--ln3)" stroke-width="0.8" fill="none" stroke-linecap="round"/>'
      + '<path d="M75 53 L88 96 L85 116" stroke="var(--ln3)" stroke-width="0.8" fill="none" stroke-linecap="round"/>'
      // 腰带
      + '<path d="M39 95 h32" stroke="var(--gold)" stroke-width="1.4" opacity=".55"/>'
      // 腿
      + '<path d="M44 100 L41 148 L43 176" stroke="var(--ln3)" stroke-width="0.8" fill="none" stroke-linecap="round"/>'
      + '<path d="M66 100 L69 148 L67 176" stroke="var(--ln3)" stroke-width="0.8" fill="none" stroke-linecap="round"/>'
      // 脚
      + '<path d="M40 177 h8 M62 177 h8" stroke="var(--ln3)" stroke-width="1"/>'
      // 已穿的位置点亮
      + (穿["外衫"] || 穿["上装"] ? '<path d="M34 51 Q55 46 76 51 L72 96 Q55 101 38 96 Z" fill="none" stroke="var(--gold)" stroke-width="1.2" opacity=".7"/>' : "")
      + (穿["下裳"] || 穿["下装"] ? '<path d="M40 98 L41 148 M70 98 L69 148" stroke="var(--gold)" stroke-width="1.2" opacity=".7"/>' : "")
      + (穿["鞋履"] || 穿["鞋子"] ? '<path d="M40 177 h8 M62 177 h8" stroke="var(--gold)" stroke-width="2"/>' : "")
      + '</svg></div>'

      + '<div class="yx-slots">'
      + 部位s.map(function (pn, i) {
          var 有2 = 穿[pn];
          var 位图标 = (pn === "里衣" ? "招架" : pn === "佩饰" || pn === "饰品" ? "星" :
            (pn === "鞋履" || pn === "鞋子" || pn === "布袜" || pn === "袜子") ? "轻功" :
            (pn === "外衫" || pn === "上装") ? "招架" : "环");
          return '<div class="yx-slot' + (有2 ? " on" : "") + '" data-p="' + E(pn) + '">'
            + '<span class="i2">' + ic(位图标, 13) + '</span>'
            + '<span class="lbl">' + E(pn) + '</span>'
            + '<span class="val">' + (有2 ? E(有2) : "空") + '</span>'
            + '</div>';
        }).join("")
      + '</div></div>'
      + '<div class="yx-nt">' + 露不露(穿).程度
      + (露不露(穿).还剩.length ? "　还剩 " + 露不露(穿).还剩.join(" / ") : "") + '</div>'
      + '</div>';

    // ── 右：物品格 ──
    H += '<div class="yx-c"><div class="yx-ttl">行囊 <em>（' + 包.length + ' / ' + (D.背包容量 || "∞") + '）</em></div>';
    if (!包.length) H += '<div class="yx-e">身上空着。去换、去买、或者打赢了捡。</div>';
    else {
      H += '<div class="yx-grid">';
      H += 包.map(function (x, i) {
        var 名 = (typeof x === "string") ? x : (x.名 || x.id || "?");
        var 品 = (typeof x === "object" && x.品质) ? x.品质 : "普通";
        var 级 = { 粗劣: "q0", 普通: "q1", 精良: "q2", 珍奇: "q3", 神兵: "q4" }[品] || "q1";
        return '<div class="yx-cell ' + 级 + '" data-i="' + i + '" data-n="' + E(名) + '" title="' + E(名) + ' · ' + E(品) + '">'
          + '<span class="ic">' + ic(物品图标(名), 20) + '</span>'
          + '<span class="nm">' + E(名) + '</span>'
          + '<span class="yx-wm">' + E(品) + '</span>'
          + '<span class="bdg">' + E(品.slice(0, 2)) + '</span>'
          + '</div>';
      }).join("");
      H += '</div>';
    }
    H += '<div class="yx-nt">格子边框颜色对应品质。</div></div></div>';

    // ── 品质表（收进折叠）──
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">品质档位（越往下越难得）</div>'
      + '<div class="yx-legend">' + 档s.map(function (q) {
          return '<span class="lg"><i style="background:' + q.色 + '"></i>' + E(q.名) + '</span>';
        }).join("") + "</div>"
      + 折("品级判定（六类东西怎么定档）", 品级判定表(), "6 类")
      + 折("兵器与加成（原作掉落表）", 兵器表(), 物表.length + " 件")
      + '</div></div>';
    return H;
  }

  function 品级判定表() {
    var 判 = D.品级判定 || {};
    var H = "";
    Object.keys(判).forEach(function (k) {
      var d = 判[k] || {};
      H += '<div class="yx-k2">' + E(k) + "</div>";
      H += '<div class="rowx"><span class="k2">规则</span><span class="v2">' + E(d.规则 || "") + "</span></div>";
      if (d.分界) {
        H += Object.keys(d.分界).map(function (q) {
          return '<div class="rowx"><span class="k2" style="color:' + 档色(档键(q)) + '">' + E(q) + '</span><span class="v2">' + E(String(d.分界[q])) + "</span></div>";
        }).join("");
      }
    });
    H += '<div class="yx-nt">' + E(D.品质图例说明 || "") + "</div>";
    return H;
  }
  function 品质档表() {
    var 档 = D.品质档 || [];
    return '<div class="yx-tblwrap"><table class="yx-tbl"><thead><tr><th>档</th><th>倍率</th><th>掉落权重</th><th>说明</th></tr></thead><tbody>'
      + 档.map(function (q) {
        return '<tr><td><span class="yx-pd" style="background:' + q.色 + '"></span><span style="color:' + q.色 + '">' + E(q.名) + '</span></td><td>×' + q.倍率 + '</td><td>' + q.权重 + '</td><td>' + E(q.含义 || q.说明 || "") + '</td></tr>';
      }).join("") + '</tbody></table></div>'
      + '<div class="yx-nt">加成的算法：<b>加成 = 价格 ÷ 100</b>，再按用途分配到字段上（兵器给攻击，衣裳给防御与上限）</div>';
  }
  function 兵器表() {
    var 表 = ((D.物品 || {}).示例) || [];
    if (!表.length) return '<div class="yx-e">契约层还没列兵器。</div>';
    return '<div class="yx-tblwrap"><table class="yx-tbl wrap"><thead><tr><th>名</th><th>价格</th><th>加成</th><th>品质</th></tr></thead><tbody>'
      + 表.map(function (o) {
        return '<tr><td>' + ic(物品图标(o.名), 12) + " " + E(o.名) + '</td><td>' + (o.价格 ? o.价格 + " 文" : "不卖") + '</td>'
          + '<td>' + Object.keys(o.加成 || {}).map(function (k) { return k + " " + o.加成[k]; }).join("　") + '</td>'
          + '<td>' + E(o.品质 || "") + '</td></tr>';
      }).join("") + '</tbody></table></div>';
  }
  /* ── 活计（任务）── */
  function 画活计() {
    var 任 = 状态.任务 || {};
    var 在做 = [], 完了 = [], 断了 = [];
    for (var k in 任) {
      var x = 任[k];
      if (!x) continue;
      if (x.状态 === "完成") 完了.push([k, x]);
      else if (x.状态 === "失败") 断了.push([k, x]);
      else 在做.push([k, x]);
    }
    var 全 = D.任务 || {};
    var H = "";

    // ── 在做（折叠项）──
    H += '<div class="yx-r"><div class="yx-c"><div class="yx-ttl">在做 <em>' + 在做.length + " / " + (D.任务位上限 || 3) + '</em></div>';
    if (!在做.length) H += '<div class="yx-e">手上没有活。</div>';
    else H += 在做.map(function (x) {
      var d = 全[x[0]] || {}, r = x[1];
      var 需 = 数(r.需要), 进 = 数(r.进度);
      var pct = 需 > 0 ? Math.round(进 / 需 * 100) : 0;
      var 内 = "";
      // 子项：委托人 / 类型 / 期限
      内 += 折行("委托人", E(d.接的谁 || "—"));
      内 += 折行("类型", E(d.类型 || "计数"));
      if (d.期限) 内 += 折行("期限", d.期限 + " 轮");
      内 += 折行("进度", (需 > 0 ? (进 + " / " + 需) : "进行中"));
      // 子子项：任务奖励 / 失败惩罚
      if (d.完成后果) {
        内 += '<div class="yx-k2">任务奖励</div>' + Object.keys(d.完成后果).map(function (q) {
          return '<div class="rowx"><span class="k2">' + E(q) + '</span><span class="v2 gr">+' + d.完成后果[q] + "</span></div>";
        }).join("");
      }
      if (d.失败后果 && Object.keys(d.失败后果).length) {
        内 += '<div class="yx-k2">失败惩罚</div>' + Object.keys(d.失败后果).map(function (q) {
          return '<div class="rowx"><span class="k2">' + E(q) + '</span><span class="v2 w">' + d.失败后果[q] + "</span></div>";
        }).join("");
      }
      if (d.说明) 内 += '<div class="yx-nt">' + E(d.说明) + "</div>";
    // （此处原是臆想的交互，已按「面板职责边界」移除）
      var 品 = 任务品级(x[0]), 色 = 档色(品);
      var 图 = d.类型 === "判定" ? "检" : d.类型 === "收集" ? "物品" : "任务";
      return '<div class="yx-fl" style="border-left:2px solid ' + 色 + '66">'
        + '<div class="hd"><span class="ar">' + ic("右", 12) + '</span>'
        + '<span class="i2" style="color:' + 色 + '">' + ic(图, 14) + '</span>'
        + '<span class="t1">' + 染(r.名 || d.名 || x[0], 品) + '</span>'
        + '<span class="t2">' + (需 > 0 ? (进 + "/" + 需) : "做") + '</span></div>'
        + (需 > 0 ? '<div class="yx-bar tk" style="margin:0 12px 6px"><i class="tk" style="width:' + pct + '%"></i></div>' : "")
        + '<div class="bd">' + 内 + "</div></div>";
    }).join("");
    H += "</div>";

    // ── 了结 ──
    H += '<div class="yx-c"><div class="yx-ttl">了结</div>';
    H += '<div class="yx-grid2"><div class="yx-stat"><div class="lbl">完成</div><div class="val gr">' + 完了.length + "</div></div>"
      + '<div class="yx-stat"><div class="lbl">失败</div><div class="val' + (断了.length ? " w" : "") + '">' + 断了.length + "</div></div></div>";
    if (完了.length) H += '<div class="yx-nt">做过：' + 完了.map(function (x) { return E(x[1].名 || x[0]); }).join("　") + "</div>";
    if (断了.length) H += '<div class="yx-nt w">断过：' + 断了.map(function (x) { return E(x[1].名 || x[0]); }).join("　") + "</div>";
    H += '<div class="yx-nt">任务失败会结算惩罚（见「说明」页）。</div></div></div>';

    // ── 能接的活（★ 2026-09-17 改：按前置条件分两组，不再把契约表全列一遍）──
    //   判据：面板上出现的每一条，都要能说清它凭什么在这儿。
    //   「还接不了的」也列，但折叠起来、并写清差什么 —— 玩家看得到路，但不会被淹没。
    var 能接 = [], 接不了 = [];
    Object.keys(全).forEach(function (k) {
      var d = 全[k] || {};
      // ★ 已经在做/做完的，不进「能接」这组（那在上面两组里）
      if (任[k] && 任[k].状态 !== '失败') return;
      (前置满足(d) ? 能接 : 接不了).push(k);
    });
    // ★ 一条活一项（信息量本来就大，两列会挤）
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">现在能接的活 <em>' + 能接.length + '</em>'
      + (接不了.length ? '<span class="g">还有 ' + 接不了.length + ' 条没到时候</span>' : '') + '</div>';
    if (!能接.length) H += '<div class="yx-e">这会儿没有能接的活。往下走几步，或者去别的门派看看。</div>';
    else H += 能接.map(function (k) { return 一张活(k, 全[k], false); }).join('');
    H += '</div></div>';
    if (接不了.length) {
      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">还没到时候 <em>' + 接不了.length + '</em></div>'
        + '<div class="yx-nt">★ 这些是世上有的活，但你现在的条件不够。条件够了它会自己挪到上面去。</div>'
        + 接不了.map(function (k) { return 一张活(k, 全[k], true); }).join('')
        + '</div></div>';
    }
    return H;
  }
  /* 画一条活（条 = 契约里的定义；缺 = true 时说明还差什么）*/
  function 一张活(k, d, 缺) {
    d = d || {};
    var 图 = d.类型 === "判定" ? "检" : d.类型 === "收集" ? "物品" : "任务";
    var 品 = 任务品级(k), 色 = 档色(品);
    var 内 = 折行("品级", '<span style="color:' + 色 + '">' + 品名(品) + "</span>")
      + 折行("委托人", E(d.接的谁 || "—")) + 折行("类型", E(d.类型 || ""));
    if (缺) 内 += 折行("还差", '<span class="w">' + 差什么(d) + "</span>");
    else if (d.前置) 内 += 折行("前置条件", d.前置.map(function (q) { return E(q.字段) + " " + q.至少; }).join("　"));
    if (d.需要) 内 += 折行("所需进度", d.需要);
    if (d.可重复) 内 += 折行("可重复", d.可重复 ? "能" : "一次");
    if (d.完成后果) 内 += '<div class="yx-k2">任务奖励</div>' + Object.keys(d.完成后果).map(function (q) {
      return '<div class="rowx"><span class="k2">' + E(q) + '</span><span class="v2 gr">+' + d.完成后果[q] + "</span></div>"; }).join("");
    if (d.失败后果 && Object.keys(d.失败后果).length) 内 += '<div class="yx-k2">失败惩罚</div>' + Object.keys(d.失败后果).map(function (q) {
      return '<div class="rowx"><span class="k2">' + E(q) + '</span><span class="v2 w">' + d.失败后果[q] + "</span></div>"; }).join("");
    if (d.说明) 内 += '<div class="yx-nt">' + E(d.说明) + "</div>";
    // ★ 第 6 个参数 = 标题已是 HTML（否则内部会再转义一次，显示成字面 <span>）
    return 折('<span style="color:' + 色 + '">' + E(d.名 || k) + "</span>",
      内, (d.接的谁 || "") + "　" + 品名(品), 图, false, true);
  }
  /* ── 人物（关系 + 女角 + NPC）── */
  function 画人物() {
    var 网 = 状态.关系网 || {}, 关 = 状态.关系 || {};
    var C = 状态.场景 || {};
    var H = '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">身边的人（人物之间的关系）</div>';
    var keys = Object.keys(网);
    H += keys.length ? '<table class="yx-tbl"><thead><tr><th>甲</th><th>乙</th><th>类型</th><th>强度</th><th>方向</th></tr></thead><tbody>'
      + keys.map(function (k) {
        var x = 网[k];
        return '<tr><td>' + E(x.甲) + '</td><td>' + E(x.乙) + '</td><td>' + E(x.类型) + '</td><td style="min-width:130px">' + 温度带(x.强度).replace('yx-tmp', 'yx-tmp mini') + '</td>'
          + '<td>' + (x.双向 ? '彼此' : '单方面') + '</td></tr>';
      }).join('') + '</tbody></table>'
      : '<div class="yx-e">还没有记下谁和谁有关系。★ 这里记的是**人物之间**，不是他们与你。</div>';
    H += '<div class="yx-nt">与主角的关系在下面那张表 —— 它多了好感与阶段两个维度</div></div></div>';

    var 关表 = Object.keys(关);
    if (关表.length) {
      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">与你（好感与阶段）</div><table class="yx-tbl">'
        + '<thead><tr><th>谁</th><th>阶段</th><th>好感</th><th>关系</th></tr></thead><tbody>'
        + 关表.map(function (k) {
          var x = 关[k] || {};
          return '<tr><td>' + E(k) + '</td><td>' + E(x.关系阶段 || '陌生') + '</td>'
            + '<td>' + 数(x.好感度) + '</td><td>' + E(x.关系 || '') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }

    var 女 = Object.keys(D.女角 || {});
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">这块大陆上的 ' + 女.length + ' 位</div><div class="yx-chips">'
      + 女.map(function (n) {
        var w = D.女角[n] || {};
        return '<span class="yx-ch' + (C.当前女角 === n ? ' on' : '') + '" title="' + E(w.身份 || '') + '">' + E(n) + '</span>';
      }).join('') + '</div><div class="yx-nt">点名字看她的档案</div></div></div>';

    var npc = Object.keys(D.NPC || {});
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">找谁说话 <em>（要他/她写一段）</em></div><div class="yx-chips">' + npc.slice(0, 24).map(function (n) { var o = (D.NPC || {})[n] || {}; return '<span class="yx-ch clk" data-搭话="' + E(n) + '" title="' + E(o.身份 || '') + '">' + E(n) + '</span>'; }).join('') + '</div><div class="yx-aista" id="yx-aista"></div></div></div>';
H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">别的 ' + npc.length + ' 个人（NPC）</div><table class="yx-tbl">'
      + '<thead><tr><th>名</th><th>身份</th><th>在哪</th></tr></thead><tbody>'
      + npc.map(function (n) {
        var x = D.NPC[n] || {};
        return '<tr><td>' + E(n) + '</td><td>' + E(x.身份 || '') + '</td><td>' + E(String(x.所在 || '').slice(0, 26)) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    H += 画八套();
    var 套 = D.八套 || [];
    if (套.length) {
      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">操控者共 ' + 套.length + ' 种人</div><div class="yx-chips">'
        + 套.map(function (n) { return '<span class="yx-ch">' + E(n) + '</span>'; }).join('')
        + '</div><div class="yx-nt">她们只是在玩，可每一件都变成他的一天</div></div></div>';
    }
    return H;
  }

  /* ── 世界（地理 + 门派 + 时间）── */
  function 画世界() {
    var C = 状态.场景 || {};
    var H = '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">地理（' + Object.keys(D.地理).length + ' 处）</div><table class="yx-tbl">'
      + '<thead><tr><th>地方</th><th>范围</th><th>谁在那儿</th></tr></thead><tbody>'
      + Object.keys(D.地理).map(function (k) {
        var g = D.地理[k] || {};
        var 范 = Array.isArray(g.范围) ? g.范围.join(' / ') : (g.范围 || '');
        // ★ 兼容两种格式：契约里现在是 [{名,身份,在哪}]，早先是 "甲 / 乙" 字符串
        var 谁 = 谁在这(g.谁在这儿).map(function(x){ return x.名 + (x.身份 ? "（" + x.身份 + "）" : ""); }).join("　");
        return '<tr><td>' + E(k) + '</td><td>' + E(String(范).slice(0, 40)) + '</td><td>' + E(String(谁).slice(0, 34)) + '</td></tr>';
      }).join('') + '</tbody></table><div class="yx-nt">★ 地理条目里已经写了「谁在这儿」，所以不再单开一张人物出现索引</div></div></div>';

    var 派 = D.门派 || {};
    var 派名 = Object.keys(派);
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">六派师承（' + 派名.length + '）</div><table class="yx-tbl">'
      + '<thead><tr><th>门派</th><th>在哪儿</th><th>第一级</th><th>掌门门槛</th></tr></thead><tbody>'
      + 派名.map(function (k) {
        var m = 派[k] || {};
        var 师 = m.师承 || {};
        var 第一 = null, 掌 = null;
        for (var lv in 师) {
          if (!第一) 第一 = 师[lv];
          掌 = 师[lv];
        }
        return '<tr><td>' + E(k) + '</td><td>' + E(m.所在 || '') + '</td><td>' + E((第一 || {}).师父 || (第一 || {}).名 || '') + '</td>'
          + '<td>' + E((掌 || {}).门槛 || '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    H += 画解锁();
    H += 画状态一览();
    H += 画门派详();
    if (D.NSFW && D.NSFW.档位 && D.NSFW.档位.length) {
      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">反应档位（她的兴奋度 → 各部位）</div><table class="yx-tbl">'
        + '<thead><tr><th>门槛</th><th>档</th><th>表现</th></tr></thead><tbody>'
        + D.NSFW.档位.map(function (q) {
          var p = q.部位表现 || {};
          return '<tr><td>' + q.门槛 + '</td><td>' + E(q.名) + '</td><td>'
            + Object.keys(p).map(function (k) { return k + '：' + p[k]; }).join('　') + '</td></tr>';
        }).join('') + '</tbody></table>'
        + '<div class="yx-nt">★ 单轮最多涨 ' + ((D.NSFW.推进 || {}).单轮上限 || 25) + '，每轮落 ' + ((D.NSFW.推进 || {}).每轮衰减 || 5)
        + ' —— 不许一上来就满格</div></div></div>';
    }
    return H;
  }

  /* ── 身体（NSFW 块）── */
  function 画身体() {
    var NS = 状态.NSFW || {}, 穿 = NS.穿着 || {}, 体 = NS.身体 || {};
    var 及 = 体.即时 || {}, 基 = 体.基线 || {};
    var 兴 = 数(NS.兴奋度);
    var 周 = 状态.NSFW && 状态.NSFW.周期 ? 状态.NSFW.周期 : {};
    var 周期在跑 = (状态.NSFW || {}).周期 || {};

    var H = '<div class="yx-r">'
      + '<div class="yx-c"><div class="yx-ttl">穿着</div><div class="yx-chips">'
      + (D.NSFW.穿着.部位 || []).map(function (p) {
        var 有2 = 穿[p];
        return '<span class="yx-ch yx-cloth' + (有2 ? ' on' : '') + '" data-p="' + E(p) + '" style="cursor:pointer">' + E(p) + (有2 ? '：' + E(有2) : '　') + '</span>';
      }).join('') + '</div><div class="yx-nt">' + 露不露(穿).程度
      + (露不露(穿).还剩.length ? '　还剩 ' + 露不露(穿).还剩.join('/') : '') + '</div></div>'
      + '<div class="yx-c"><div class="yx-ttl">兴奋</div>'
      + '<div class="yx-bar"><i class="ar" style="width:' + 兴 + '%"></i></div>'
      + '<div class="yx-ln" style="margin-top:6px"><span>' + Math.round(兴) + '　' + 兴名(兴) + '</span>'
    // （此处原是臆想的交互，已按「面板职责边界」移除）
      + '<div class="yx-nt">' + ((D.NSFW.推进 || {}).说明 || '').split('\n')[1] || '' + '</div>'
      + '</div></div>';

    H += '<div class="yx-r">'
      + '<div class="yx-c"><div class="yx-ttl">此刻（场景级临时）</div>'
      + (Object.keys(及).filter(function (k) { return 及[k]; }).length
        ? Object.keys(及).filter(function (k) { return 及[k]; }).map(function (k) { return 行(k, 及[k]); }).join('')
        : '<div class="yx-e">未变化</div>')
      + '<div class="yx-nt">换场景时清空</div></div>'
      + '<div class="yx-c"><div class="yx-ttl">长期（数轮后仍稳定）</div>'
      + (Object.keys(基).filter(function (k) { return 基[k]; }).length
        ? Object.keys(基).filter(function (k) { return 基[k]; }).map(function (k) { return 行(k, String(基[k]).slice(0, 24)); }).join('')
        : '<div class="yx-e">还没建档</div>')
      + '<div class="yx-nt">基线与即时分开记录</div></div></div>';

    var 周表 = Object.keys(D.NSFW.周期 || {});
    if (周表.length) {
      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">正在走的周期</div>';
      var 跑 = Object.keys(周期在跑).length;
      H += 跑 ? Object.keys(周期在跑).map(function (k) {
        var x = 周期在跑[k], d = D.NSFW.周期[k] || {};
        var 总 = 数(d.总轮), 过 = 数(x.已经过);
        return '<div style="margin-bottom:7px"><div class="yx-ln"><span>' + E(x.名 || d.名 || k) + (x.进度 > 1 ? ' ×' + x.进度 : '')
          + '</span><b>' + (总 ? (过 + ' / ' + 总 + '（还剩 ' + Math.max(0, 总 - 过) + '）') : 过) + '</b></div>'
          + (总 ? '<div class="yx-bar sm"><i class="ar" style="width:' + Math.round(过 / 总 * 100) + '%"></i></div>' : '')
          + (x.当前阶段 ? '<div class="yx-nt">现在是「' + E(x.当前阶段) + '」</div>' : '') + '</div>';
      }).join('') : '<div class="yx-e">没有在走的。</div>';
      H += '<div class="yx-nt">周期也用于养伤、闭关等。</div></div></div>';

      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">这个世上有的周期（契约层）</div><table class="yx-tbl">'
        + '<thead><tr><th>名</th><th>几轮</th><th>能不能断</th><th>阶段</th><th>断了怎么着</th></tr></thead><tbody>'
        + 周表.map(function (k) {
          var d = D.NSFW.周期[k] || {};
          return '<tr><td>' + E(d.名 || k) + '</td><td>' + (d.总轮 || '') + '</td><td>' + (d.可中断 === false ? '不能' : '能') + '</td>'
            + '<td>' + ((d.阶段 || []).map(function (s) { return s.名; }).join(' → ')) + '</td>'
            + '<td>' + (d.中断后果 ? Object.keys(d.中断后果).map(function (q) { return q + ' ' + d.中断后果[q]; }).join('　') : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    return H;
  }

  /* 技能格子的详情弹层 */
  function 开技能(名) {
    var 技 = (状态.技能 || {}).基本 || {}, 门技 = (状态.技能 || {}).门派 || {};
    var 现 = 有(技, 名) ? 数(技[名]) : 数(门技[名]);
    var t = 算天赋(状态), 悟 = Math.max(1, t.悟性);
    var 要 = Math.max(1, Math.round(355.06 * (现 + 1) / 悟));
    var 类 = 有(技, 名) ? "基本" : "门派";
    var nf = 10 - (现 % 10 || 0);
    var 对应 = { "基本拳脚": "膂力", "基本轻功": "敏捷", "基本内功": "根骨", "读书写字": "悟性" }[名];
    var 内 = "";
    内 += 折行("当前等级", 现 + " / 255");
    内 += 折行("分类", 类);
    内 += 折行("升级消耗", 要 + " 潜能" + (数((状态.资源 || {}).潜能) >= 要 ? ' <span class="gr">（足）</span>' : ' <span class="w">（不足）</span>'));
    内 += 折行("天赋反哺", nf === 10 ? '<span class="gr">本级触发</span>' : ("距反哺 " + nf + " 级"));
    if (对应) 内 += 折行("对应天赋", 对应);
    var 关绝 = (D.绝招 || []).filter(function (j) { return String(j.条件 || "").indexOf(名) >= 0; });
    if (关绝.length) {
      内 += '<div class="yx-k2">通向的绝招</div>';
      内 += 关绝.map(function (j) {
        return '<div class="rowx"><span class="k2">' + ic("法术", 12) + " " + E(j.名) + '</span><span class="v2">' + E(j.条件) + '</span></div>'
          + (j.效果 ? '<div class="rowx"><span class="k2"></span><span class="v2" style="color:var(--t3);font-size:11.5px">' + E(j.效果) + "　冷却 " + (j.冷却 == null ? "—" : j.冷却) + "</span></div>" : "");
      }).join("");
    }
    var 层k = 取层("技能", 名), Pk = 强化参数();
    var 要k = 要的材料(Pk.技材料, 层k), 门k = 材料够吗(要k);
    内 += 折行("技能强化", 层k + " / " + Pk.技上限 + (层k > 0 ? '　<span class="gr">判定强度 +' + (Pk.技每层 * 层k * 100).toFixed(0) + "%</span>" : ""));
    内 += 折行("下一层要", Object.keys(要k).map(function (q) { return E(q) + " " + 要k[q]; }).join("　") + (门k.够 ? ' <span class="gr">（足）</span>' : ' <span class="w">（不足）</span>'));
    开层(名 + "　Lv" + 现, 内 + '<div class="yx-ops" style="margin-top:12px">'
      + '<button class="yx-btn pri" data-sk="' + E(名) + '">请教 1 级</button>'
      + '<button class="yx-btn" data-sk5="' + E(名) + '">连请教 5 级</button>'
      + '<button class="yx-btn" data-skenh="' + E(名) + '">强化 +1</button></div>');
    绑请教();
    // 弹层里的按钮要重新绑（因为开层会重建 innerHTML）
    绑请教();
  }
  function 绑请教() {
    [].forEach.call(层.querySelectorAll("[data-sk]"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 请教(b.getAttribute("data-sk")); });
    });
    [].forEach.call(层.querySelectorAll("[data-sk5]"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 请教(b.getAttribute("data-sk5"), 5); });
    });
  }
  /* 技能强化（★ 与装备强化同一个形状）*/
  function 强化技能(名) {
    var P = 强化参数(), 层 = 取层("技能", 名), 要 = 要的材料(P.技材料, 层);
    var 门 = 材料够吗(要);
    if (!门.够) { alert("材料不够：" + 门.缺.join("；")); return; }
    if (层 >= P.技上限) { alert("已经到上限 " + P.技上限 + " 层了"); return; }
    写(function (sd) {
      sd.资源 = sd.资源 || {}; sd.强化 = sd.强化 || { 装备: {}, 技能: {} };
      Object.keys(要).forEach(function (k) { sd.资源[k] = 数(sd.资源[k]) - 要[k]; });
      sd.强化.技能 = sd.强化.技能 || {};
      sd.强化.技能[名] = 层 + 1;
    });
  }

  /* ── 物品操作 ── */
  function 开物品(i, 名) {
    var 包 = 状态.背包 || [], x = 包[i];
    var 例表 = ((D.物品 || {}).示例) || [];
    var 参 = null;
    for (var q = 0; q < 例表.length; q++) if (例表[q].名 === 名) 参 = 例表[q];
    var rows = "";
    var 品 = 物品品级(名), 色 = 档色(品);
    rows += 折行("品级", '<span style="color:' + 色 + '">' + 品名(品) + "</span>");
    if (参) {
      rows += 折行("价格", 参.价格 ? 参.价格 + " 文" : "不卖");
      rows += 折行("槽位", 参.槽 || "—");
      rows += '<div class="yx-k2">加成（按价格推）</div>';
      rows += Object.keys(参.加成 || {}).map(function (k) { return 折行(k, "+" + 参.加成[k]); }).join("");
    }
    var P = 强参数(), 层 = 取层("装备", 名);
    var 档 = 强档(层), 率 = 算成功率(档, 附符, 护石, 垫计数());
    var 要 = 要的材料(P.材料, 层), 门 = 材料够吗(要);
    rows += '<div class="yx-k2">强化 · ' + 区名(档) + "</div>";
    rows += 折行("层数", 层 + " / " + P.上限 + (层 > 0 ? '　<span class="gr">加成 ×' + (1 + P.倍 * 层).toFixed(2) + "</span>" : ""));
    rows += 折行("成功率", '<b style="color:' + (率 >= 0.6 ? "var(--grn)" : 率 >= 0.3 ? "var(--gold)" : "var(--rose)") + '">' + Math.round(率 * 100) + "%</b>" + (附符 ? "（含符 +12%）" : ""));
    rows += 折行("失败会", '<span class="' + ((档.失败 === "分解" || 档.失败 === "归零") ? "w" : "") + '">' + E(档.失败 || "必成") + "</span>" + ((护石 && 护石能用(层)) ? '　<span class="gr">（护石保住）</span>' : ""));
    rows += 折行("垫子", 垫计数() + " / " + P.垫上 + (垫计数() >= P.垫上 ? ' <span class="gr">下一发必成</span>' : ""));
    rows += 折行("下一层要", Object.keys(要).map(function (k) { return E(k) + " " + 要[k]; }).join("　") + (门.够 ? ' <span class="gr">（足）</span>' : ' <span class="w">（不足）</span>'));
    rows += '<div class="yx-chips" style="margin-top:8px">'
      + '<span class="yx-ch clk' + (附符 ? " on" : "") + '" data-tg="符">强化符 +12%</span>'
      + '<span class="yx-ch clk' + (护石 ? " on" : "") + '" data-tg="石">保护石' + (护石能用(层) ? "" : "（+7 起）") + "</span></div>";
    var 槽 = 参 && 参.槽;
    var 禁 = !在据点();
    开层(名, rows + (禁 ? '<div class="yx-nt w">★ 须回驻地才能强化</div>' : "") + '<div class="yx-ops" style="margin-top:12px">'
      + (槽 ? '<button class="yx-btn pri" data-op="equip" data-i="' + i + '" data-slot="' + E(槽) + '">装备</button>' : "")
      + '<button class="yx-btn" data-op="enh" data-i="' + i + '"' + (禁 ? " disabled" : "") + '>强化 +1</button>'
      + '<button class="yx-btn" data-op="use" data-i="' + i + '">用掉</button>'
      + '<button class="yx-btn dn" data-op="drop" data-i="' + i + '">丢掉</button></div>');
    绑物品按钮();
    [].forEach.call(层.querySelectorAll("[data-tg]"), function (c) {
      c.addEventListener("click", function () {
        if (c.getAttribute("data-tg") === "符") 附符 = !附符; else 护石 = !护石;
        开物品(i, 名);
      });
    });
  }

  function 绑物品按钮() {
    [].forEach.call(层.querySelectorAll("[data-op]"), function (b) {
      b.addEventListener("click", function () {
        var op = b.getAttribute("data-op"), i = 数(b.getAttribute("data-i"));
        var 槽 = b.getAttribute("data-slot");
        var 包 = 状态.背包 || [], x = 包[i];
        var 名 = (typeof x === "string") ? x : (x.名 || "");
        关层();
        if (op === "enh") {
          if (!在据点()) { alert("须回驻地才能强化"); return; }
          var P = 强参数(), 层 = 取层("装备", 名);
          if (层 >= P.上限) { alert("已到上限 " + P.上限); return; }
          var 档 = 强档(层), 率 = 算成功率(档, 附符, 护石, 垫计数());
          var 要 = 要的材料(P.材料, 层), 门 = 材料够吗(要);
          if (!门.够) { alert("材料不够：" + 门.缺.join("；")); return; }
          var 用垫 = 垫计数() >= P.垫上;
          var 成 = Math.random() < 率;
          var 果 = (成 || (护石 && 护石能用(层))) ? "" : (档.失败 || "掉1级");
          写(function (sd) {
            sd.资源 = sd.资源 || {};
            sd.强化 = sd.强化 || { 装备: {}, 技能: {}, 垫子: 0 };
            Object.keys(要).forEach(function (k) { sd.资源[k] = 数(sd.资源[k]) - 要[k]; });
            sd.强化.装备 = sd.强化.装备 || {};
            if (成) {
              sd.强化.装备[名] = 层 + 1;
              if (用垫) sd.强化.垫子 = 0;
            } else if (果 === "归零") {
              sd.强化.装备[名] = 0;
            } else if (果 === "分解") {
              sd.强化.装备[名] = 0;
              sd.背包 = (sd.背包 || []).filter(function (y) { return (typeof y === "string" ? y : y.名) !== 名; });
              sd.强化.垫子 = Math.min(P.垫上, 垫计数() + 1);
            } else if (果 === "掉1级") {
              sd.强化.装备[名] = Math.max(0, 层 - 1);
            }
          });
          var 话 = 成 ? ("★ 强化成功，+ " + (层 + 1))
            : (果 ? ("失败 —— " + 果 + "（回到 +" + (果 === "掉1级" ? Math.max(0, 层 - 1) : 0) + "）")
                  : ("失败 —— 保护石保住了，停在 +" + 层));
          alert(话 + (用垫 ? "（垫子保底）" : ""));
        } else if (op === "equip") {
          写(function (sd) {
            sd.NSFW = sd.NSFW || {}; sd.NSFW.穿着 = sd.NSFW.穿着 || {};
            sd.NSFW.穿着[槽] = 名;   // ★ 换了就换，旧的自动被替下
          });
        } else if (op === "use") {
          写(function (sd) { sd.背包 = (sd.背包 || []).filter(function (_, k) { return k !== i; }); });
        } else {
          写(function (sd) { sd.背包 = (sd.背包 || []).filter(function (_, k) { return k !== i; }); });
        }
      });
    });
  }

  /* ── 穿着：点部位换或脱 ── */
  /* 穿着（★ <user> 能动：换或脱）*/
  function 开部位(p) {
    var 穿 = ((状态.NSFW || {}).穿着) || {};
    var 有2 = 穿[p];
    var 包 = (状态.背包 || []).filter(function (x) {
      var n = (typeof x === "string") ? x : (x.名 || "");
      var 例 = ((D.物品 || {}).示例 || []).filter(function (y) { return y.名 === n; })[0];
      return 例 && (例.槽 || "").indexOf(p.slice(0, 1)) >= 0;
    });
    开层(p, (有2 ? 行("现在", 有2) : '<div class="yx-e">这一处空着。</div>')
      + '<div class="yx-ttl" style="margin-top:11px">能换上的</div>'
      + (包.length ? '<div class="yx-chips">' + 包.map(function (x) {
          var n = (typeof x === "string") ? x : (x.名 || "");
          return '<span class="yx-ch yx-wear" data-p="' + E(p) + '" data-n="' + E(n) + '" style="cursor:pointer">' + E(n) + '</span>';
        }).join("") + '</div>' : '<div class="yx-e">身上没有这一处的衣物。</div>')
      + (有2 ? '<div class="yx-ops" style="margin-top:12px"><button class="yx-btn dn" id="yx-takeoff">脱下</button></div>' : ""));
    var tk = document.getElementById("yx-takeoff");
    if (tk) tk.addEventListener("click", function () { 关层(); 写(function (sd) { sd.NSFW.穿着[p] = ""; }); });
    [].forEach.call(层.querySelectorAll(".yx-wear"), function (c) {
      c.addEventListener("click", function () {
        var n = c.getAttribute("data-n"); 关层();
        写(function (sd) { sd.NSFW = sd.NSFW || {}; sd.NSFW.穿着 = sd.NSFW.穿着 || {}; sd.NSFW.穿着[p] = n; });
      });
    });
  }

  /* ── 任务：推进 / 放弃 ── */
  function 开任务(k) {
    var x = (状态.任务 || {})[k] || {};
    var d = (D.任务 || {})[k] || {};
    开层(x.名 || d.名 || k,
      行("状态", x.状态 || "进行") + 行("进度", x.需字 = (数(x.进度) + (数(x.需要) ? " / " + 数(x.需要) : "")))
      + (d.接的谁 ? 行("委托人", d.接的谁) : "")
      + (d.说明 ? '<div class="yx-nt" style="margin-top:8px">' + E(d.说明) + "</div>" : "")
      + '<div class="yx-ttl" style="margin-top:12px">任务奖励</div>'
      + (d.完成后果 ? Object.keys(d.完成后果).map(function (q) { return 行(q, "+" + d.完成后果[q]); }).join("") : '<div class="yx-e">—</div>')
      + '<div class="yx-ttl" style="margin-top:10px">失败惩罚</div>'
      + (d.失败后果 && Object.keys(d.失败后果).length ? Object.keys(d.失败后果).map(function (q) { return 行(q, d.失败后果[q], "w"); }).join("") : '<div class="yx-e">—</div>')
      + '<div class="yx-fork" style="margin-top:12px">'
      + '<button class="yx-btn pri" id="yx-tadv">推进一层</button>'
      + '<button class="yx-btn dn" id="yx-tgive">放弃</button></div>'
      + '<div class="yx-nt">任务失败会结算惩罚（见「说明」页）。</div>');
    var a = document.getElementById("yx-tadv"), b2 = document.getElementById("yx-tgive");
    if (a) a.addEventListener("click", function () {
      关层();
      写(function (sd) {
        sd.任务 = sd.任务 || {}; var r = sd.任务[k] || {};
        r.进度 = 数(r.进度) + 1;
        if (数(r.需要) > 0 && r.进度 >= 数(r.需要)) r.状态 = "完成";
        sd.任务[k] = r;
      });
    });
    if (b2) b2.addEventListener("click", function () {
      关层();
      写(function (sd) { sd.任务 = sd.任务 || {}; if (sd.任务[k]) sd.任务[k].状态 = "失败"; });
    });
  }
  /* ── 状态一览（从契约状态表内嵌）── */
  function 画状态一览() {
    var 条 = D.状态 || [];
    if (!条.length) return '';
    var 组 = {};
    条.forEach(function (x) { var g = x.组 || '其他'; (组[g] = 组[g] || []).push(x); });
    var H = '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">状态一览（' + 条.length + ' 项）</div>';
    Object.keys(组).forEach(function (g) {
      H += '<div class="yx-nt" style="color:var(--gold);margin-top:9px">' + E(g) + '</div>';
      H += '<table class="yx-tbl wrap"><tbody>'
        + 组[g].map(function (x) {
          return '<tr><td style="width:110px">' + E(x.名) + '</td><td style="width:90px" class="yx-num">' + E(String(x.范围 || "").slice(0, 14)) + '</td>'
            + '<td>' + E(x.意义 || "") + '</td></tr>';
        }).join("") + '</tbody></table>';
    });
    H += '</div></div>';
    return H;
  }

  /* ── 解锁表（绝招的双条件）── */
  function 画解锁() {
    var 表 = D.解锁表 || [];
    if (!表.length) return '';
    var 值 = {}, 技 = (状态.技能 || {}).基本 || {};
    for (var k in 技) 值[k] = 数(技[k]);
    var H = '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">绝招的门槛（两门同时到位才开）</div>'
      + '<table class="yx-tbl"><thead><tr><th>招</th><th>要什么</th><th>还差</th></tr></thead><tbody>'
      + 表.map(function (x) {
        var 需 = x.需要 || [];
        var 缺 = 需.filter(function (q) { return 数(值[q.字段]) < 数(q.至少); })
          .map(function (q) { return q.字段 + " 差 " + (数(q.至少) - 数(值[q.字段])); });
        return '<tr><td>' + E(x.名) + '</td><td>'
          + 需.map(function (q) { return q.字段 + " " + q.至少; }).join("　") + '</td>'
          + '<td>' + (缺.length ? '<span class="w">' + E(缺.join("；")) + '</span>' : '<span class="gr">够了</span>') + '</td></tr>';
      }).join("") + '</tbody></table>'
      + '<div class="yx-nt">★ 绝招不是独立等级 —— 是两门武功同时到某个级数之后自动可用</div></div></div>';
    return H;
  }

  /* ── 八套「她」的对照 ── */
  function 画八套() {
    var 套 = D.八套 || [];
    if (!套.length) return '';
    var 详 = {
      温砚: ["反复试、查攻略、每步都算", "也认真看（怕漏掉救你的线索）", "不会"],
      丰娆: ["换一条线", "快进", "偶尔"],
      舒晏: ["故意让它更难", "反复看同一段", "不会"],
      唐响: ["撞上去", "乱点跳过", "会"],
      沈眠: ["阻止救援", "静静看", "不会"],
      莫漾: ["外挂跳过", "挂机（手离开鼠标）", "会，最懒的"],
      纪清: ["算、找漏洞、改", "也看", "会，为了补漏"],
      郁灼: ["只挑最刺激的", "跳过不能快进的", "—"],
    };
    var H = '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">操控者共 ' + 套.length + ' 种人</div>'
      + '<table class="yx-tbl wrap"><thead><tr><th>她</th><th>遇到障碍</th><th>遇到无聊</th><th>会不会开挂</th></tr></thead><tbody>'
      + 套.map(function (n) {
        var x = 详[n] || ["—", "—", "—"];
        return '<tr><td>' + E(n) + '</td><td>' + E(x[0]) + '</td><td>' + E(x[1]) + '</td><td>' + E(x[2]) + '</td></tr>';
      }).join("") + '</tbody></table>'
      + '<div class="yx-nt">★ 她做的每件事都不需要理由 —— 她只是在玩。而每一件都变成他的一天。</div></div></div>';
    return H;
  }

  /* ── 门派详情（师承链）── */
  function 画门派详() {
    var 派 = D.门派 || {};
    if (!Object.keys(派).length) return "";
    var H = "";
    Object.keys(派).forEach(function (k) {
      var m = 派[k] || {}, 师 = m.师承 || {};
      var 链 = Object.keys(师).map(function (阶) {
        var d = 师[阶] || {};
        return '<tr><td>' + E(阶) + '</td><td>' + E(d.师父 || "") + '</td><td>' + E(d.武功 || "") + '</td>'
          + '<td class="yx-num">' + E(String(d.门槛 || "无").slice(0, 44)) + '</td></tr>';
      }).join("");
      H += '<div class="yx-c yx-w"><div class="yx-ttl">' + E(k) + (m.所在 ? '（' + E(m.所在) + '）' : "") + '</div>'
        + '<table class="yx-tbl wrap"><thead><tr><th>阶</th><th>师父</th><th>教什么</th><th>门槛</th></tr></thead><tbody>'
        + 链 + '</tbody></table></div>';
    });
    return '<div class="yx-r">' + H + '</div>';
  }
  /* ════════════════════════════════════════════════════════════
     丹房（炼丹）★ 纯前端算，不花 AI 额度
     机制来自参考项目「姬侠传」：温度是资源+风险，完成度与品质此消彼长
     ════════════════════════════════════════════════════════════ */
  /* ★ 炼丹状态改为【持久化】（读 stat_data.炼丹）。会话内只留两个临时字段 */
  var 丹临 = { 事件s: [], 停: false, 护主: false, 投: {} };
  function 丹取() {
    var d = (状态.炼丹) || {};
    丹临.炉温 = 数(d.炉温); 丹临.品质 = 数(d.品质); 丹临.完成度 = 数(d.完成度);
    丹临.在炼什么 = String(d.在炼什么 || "");
    丹临.投药数 = 数(d.投入药材);
    // ★ 2026-09-17 修：这三个字段原来只在 起炉() 里设，丹取() 不恢复 →
    //   切页回来就变 undefined → 屏幕上出现「剩余操作 NaN / undefined」「当归（悟性）undefined」
    丹临.投 = 丹临.投 || {};
    丹临.次 = 数(d.次) || 0;
    丹临.上限 = 数(d.上限) || 15;
    return 丹临;
  }
  function 丹存(f) {
    写(function (sd) {
      sd.炼丹 = sd.炼丹 || {};
      sd.炼丹.炉温 = 数(丹临.炉温); sd.炼丹.品质 = 数(丹临.品质);
      sd.炼丹.完成度 = 数(丹临.完成度); sd.炼丹.在炼什么 = String(丹临.在炼什么 || "");
      sd.炼丹.投入药材 = 数(丹临.投药数);
      if (f) f(sd.炼丹);
    });
  }
  var 丹 = 丹临;   // 旧代码里到处写 丹.炉温，用同名对象接住

  function 开丹() {
    丹取();
    if (丹临.在炼什么 === "") 起炉();
    画();
  }
  function 起炉() {
    if (丹取().在炼什么) { alert("上一炉还没取丹"); return; }
    if (数(((状态.炼丹)||{}).本周炼过)) { alert("这一周已经炼过了"); return; }
    if (!在据点()) { alert("丹房只在门派驻地里能开"); return; }
    var 药 = (D.炼丹 || {}).药材 || [];
    var 投 = {};
    药.forEach(function (y) { 投[y.名] = 2; });   // 默认每味 2 个 = 8 个
    丹临.投 = 投; 丹临.炉温 = 20; 丹临.品质 = 0; 丹临.完成度 = 0; 丹临.次 = 0; 丹临.上限 = 15; 丹临.事件s = []; 丹临.停 = false; 丹临.护主 = false;
    丹临.在炼什么 = "（未取名）"; 丹临.投药数 = 投药数();
    丹存(function (d) { d.本周炼过 = true; });
  }
  function 投药数() { var n = 0; for (var k in 丹.投) n += 数(丹.投[k]); return n; }
  function 丹倍率() {
    var w = 丹.炉温;
    if (w <= 30) return 0.3 + (w / 30) * 0.2;
    if (w <= 70) return 0.5 + ((w - 30) / 40) * 0.5;
    return Math.min(1.8, 1.0 + ((w - 70) / 30) * 0.8);
  }
  function 丹态() {
    var w = 丹.炉温;
    if (w > 100) return { 名: "炸炉", 色: "#e05a4a" };
    if (w > 90) return { 名: "将炸", 色: "#e5769a" };
    if (w > 70) return { 名: "炽热", 色: "#e5a04a" };
    if (w >= 30) return { 名: "正常", 色: "#5fc98d" };
    return { 名: "冷寂", 色: "#5ca3d8" };
  }
  function 掷(a, b) { return a + Math.random() * (b - a); }
  function 炼丹一(op) {
    if (丹.停) return;
    丹取();
    var 倍 = 丹倍率(), 表 = {
      猛火: { 温: [25, 35], 品: [-5, -2], 完: [0, 0] },
      文火: { 温: [5, 10], 品: [3, 6], 完: [4, 8] },
      投药: { 温: [-15, -5], 品: [2, 4], 完: [8, 15] },
      冷凝: { 温: [-30, -20], 品: [8, 12], 完: [0, 2] },
      淬炼: { 温: [5, 10], 品: [5, 8], 完: [-10, -5] },
    }[op];
    if (!表) return;
    丹.炉温 = Math.max(0, 丹.炉温 + 掷(表.温[0], 表.温[1]));
    var p倍 = (op === "猛火" || op === "淬炼") ? 1 : 倍;
    丹.品质 = 夹(丹.品质 + 掷(表.品[0], 表.品[1]) * (表.品[1] > 0 ? p倍 : 1), 0, 100);
    丹.完成度 = 夹(丹.完成度 + 掷(表.完[0], 表.完[1]) * (表.完[1] > 0 ? 倍 : 1), 0, 100);
    丹.次++;
    // 随机事件（15%）
    if (Math.random() < 0.15) {
      var 事 = ((D.炼丹 || {}).随机事件 || []);
      if (事.length) {
        var e = 事[Math.floor(Math.random() * 事.length)];
        丹.事件s.push(e.标 + e.名);
        if (e.名 === "祥瑞") 丹.品质 = 夹(丹.品质 + 15, 0, 100);
        else if (e.名 === "寒潮") 丹.炉温 = Math.max(0, 丹.炉温 - 15);
        else if (e.名 === "护主") 丹.护主 = true;
        if (丹.事件s.length > 6) 丹.事件s.shift();
      }
    }
    // 炸炉判定
    if (丹.炉温 > 100 && !丹.护主) { 丹.停 = true; 丹.炸了 = true; }
    else if (丹.炉温 > 100 && 丹.护主) { 丹.炉温 = 95; 丹.护主 = false; }
    if (丹.次 >= 丹.上限 || 丹.完成度 >= 100) 丹.停 = true;
    画();
    丹存();   /* ★ 每次操作后落变量（持久化） */
  }
  function 取丹() {
    if (!丹) return;
    var 产 = ((D.炼丹 || {}).产出 || []);
    var q = 丹.品质, 得 = null;
    for (var i = 0; i < 产.length; i++) {
      var a = 产[i].品质;
      if (a === "100" && q >= 100) { 得 = 产[i]; break; }
      if (a === "90~99" && q >= 90 && q < 100) { 得 = 产[i]; break; }
      if (a === "75~89" && q >= 75 && q < 90) { 得 = 产[i]; break; }
      if (a === "50~74" && q >= 50 && q < 75) { 得 = 产[i]; break; }
      if (a === "< 50" && q < 50) { 得 = 产[i]; break; }
    }
    if (!得) 得 = { 丹: "（无产出）", 效果: "白费一批药材" };
    // 落账：扣药材、加丹药（接现有变量）
    写(function (sd) {
      sd.背包 = sd.背包 || [];
      sd.资源 = sd.资源 || {};
      if (得.丹 && 得.丹.indexOf("无产出") < 0) sd.背包.push({ 名: 得.丹, 品质: 得.档 || "上品" });
      Object.keys(丹.投).forEach(function (k) {
        var 持 = (sd.资源[k] == null) ? 数(丹.投[k]) * 10 : 0;   // 无库存则按够算
        if (持) return;
      });
    });
    alert("炼成：" + 得.丹 + "（品质 " + Math.round(丹.品质) + "）\n" + 得.效果);
    丹 = null;
    画();
  }

  function 画丹房() {
    if (!丹) 起炉();
    var 态 = 丹态(), 倍 = 丹倍率();
    var 药 = ((D.炼丹 || {}).药材) || [];
    var H = "";
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">丹房 <em>（每周一次 · 纯前端算，不耗额度）</em></div>';
    // 三个数
    H += '<div class="yx-danrow"><div class="yx-danpot">' + 画丹炉(丹.炉温, 态.色) + '</div><div class="yx-danums">';
    H += '<div class="yx-bw"><span class="lb">炉温</span><div class="yx-bar"><i style="width:' + Math.min(100, 丹.炉温) + '%;background:' + 态.色 + '"></i></div><span class="vl" style="color:' + 态.色 + '">' + Math.round(丹.炉温) + "　" + 态.名 + "</span></div>";
    H += '<div class="yx-bw"><span class="lb">品质</span><div class="yx-bar"><i class="ar" style="width:' + 丹.品质 + '%"></i></div><span class="vl">' + Math.round(丹.品质) + "</span></div>";
    H += '<div class="yx-bw"><span class="lb">完成</span><div class="yx-bar"><i class="tk" style="width:' + 丹.完成度 + '%"></i></div><span class="vl">' + Math.round(丹.完成度) + "/100</span></div>";
    H += '</div></div>';
    H += '<div class="yx-nt">炉温倍率 ×' + 倍.toFixed(2) + "　（0~30 低效 ｜ 31~70 稳定 ｜ 71~100 高效但危险）　★ 过 100 炸炉</div>";
    // 操作
    if (!丹.停) {
      H += '<div class="yx-foes" style="margin-top:11px">';
      ((D.炼丹 || {}).五种操作 || []).forEach(function (o) {
        H += '<button class="yx-btn" data-dan="' + E(o.名) + '" title="' + E(o.说明) + '">' + E(o.名) + "</button>";
      });
      H += "</div>";
      H += '<div class="yx-nt">剩余操作 ' + (数(丹.上限, 15) - 数(丹.次)) + " / " + 数(丹.上限, 15) + "　（淬炼降完成度但提品质，取舍）</div>";
    } else {
      H += '<div class="yx-ops" style="margin-top:12px"><button class="yx-btn pri" id="yx-qd">取丹</button>';
      H += '<button class="yx-btn" id="yx-cq">重起一炉</button></div>';
    }
    if (丹.事件s.length) H += '<div class="yx-nt">事件：' + 丹.事件s.join("　") + "</div>";
    // 投药
    H += '<div class="yx-k2">投药（共 ' + 投药数() + ' 个，6~10 个；投得多起手品质高）</div>';
    H += '<div class="yx-chips">' + 药.map(function (y) {
      return '<span class="yx-ch clk yx-yao" data-y="' + E(y.名) + '">' + E(y.名) + "（" + E(y.对应) + "）" + 数(丹.投[y.名]) + '</span>';
    }).join("") + "</div>";
    H += '<div class="yx-nt">起手品质 =（投药数 − 6）× 5　→　现在 ' + Math.max(0, (投药数() - 6) * 5) + "</div>";
    H += "</div></div>";
    return H;
  }
  function 绑丹房() {
    [].forEach.call(document.querySelectorAll("[data-dan]"), function (b) {
      b.addEventListener("click", function () { 炼丹一(b.getAttribute("data-dan")); });
    });
    [].forEach.call(document.querySelectorAll(".yx-yao"), function (c) {
      c.addEventListener("click", function () {
        var k = c.getAttribute("data-y");
        丹.投[k] = 数(丹.投[k]) + 1; if (投药数() > 10) 丹.投[k] = 数(丹.投[k]) - 1;
        if (数(丹.投[k]) > 4) 丹.投[k] = 4;
        画();
      });
    });
    var q = document.getElementById("yx-qd"); if (q) q.addEventListener("click", 取丹);
    var c2 = document.getElementById("yx-cq"); if (c2) c2.addEventListener("click", function () { 起炉(); 画(); });
  }

  /* ════════════════════════════════════════════════════════════
     打斗（七行动 + 克制链）★ 纯前端跑，不花 AI 额度
     机制来自参考项目「姬侠传」——选择决定结果，而不是数值决定
     ════════════════════════════════════════════════════════════ */
  var 战 = null;

  function 起战(敌名) {
    var t = 算天赋(状态), d = 派生(t, 状态);
    var B = 状态.身体 || {};
    var 我 = {
      名: "我",
      生命: 数(B.生命当前, 100) || 100,
      生命上限: Math.max(1, 数(d.气血上限, 100) || 100),
      气: 0, 挑衅: 0,
      攻击: Math.max(4, Math.round(数(d.攻击力, 20) || 20)),
      格挡: Math.max(0, Math.round(数(d.护甲, 0) || 0)),
    };
    // 敌人按 NPC 战力推档
    var 品 = NPC品级(敌名);
    var 档 = { q0: 8, q1: 14, q2: 22, q3: 34, q4: 50, q5: 70, q6: 90 }[品] || 14;
    var 敌 = {
      名: 敌名 || "来人",
      生命: 档 * 5, 生命上限: 档 * 5, 气: 0, 挑衅: 0,
      攻击: 档, 格挡: Math.round(档 / 4),
    };
    var 风 = ["风", "火", "林", "山"][Math.floor(Math.random() * 4)];
    var 场 = null;
    if (Math.random() < 0.65) {
      var 表 = ((D.战斗与行动 || {}).场地效果) || [];
      if (表.length) 场 = 表[Math.floor(Math.random() * 表.length)];
    }
    战 = { 我: 我, 敌: 敌, 风格: 风, 场地: 场, 回合: 0, 报: [], 完: false };
    画();
  }

  /* 面板侧的战斗引擎（与机制层同口径 —— 这边是 EJS 跑不了才在前端重写一份小的）*/
  function 战克(a, b) {
    if (a === "嘴炮") {
      if (b === "杀手") return { r: "无效", t: "叫阵打断了他的杀手" };
      if (b === "守势") return { r: "破防", t: "叫阵破了他的守势" };
      return { r: "正常", t: "" };
    }
    if (a === "杀手") {
      if (b === "快招" || b === "沉招") return { r: "无效", t: "杀手压住了他这一招" };
      if (b === "守势") return { r: "无视", t: "杀手破守" };
      return { r: "正常", t: "" };
    }
    if (a === "沉招" && b === "快招") return { r: "无效", t: "沉招压住了快招" };
    if (b === "守势") {
      var 减 = { 快招: 0.15, 沉招: 0.25, 杀手: 1 }[a];
      if (减 == null) return { r: "正常", t: "" };
      if (减 >= 1) return { r: "正常", t: "他在守，但杀手照样吃满" };
      return { r: "减伤", 系: 减, t: "被守住了大半" };
    }
    return { r: "正常", t: "" };
  }
  function 战倍(a) { return ({ 快招: 1, 沉招: 1.5, 杀手: 3 })[a] || 0; }
  function 战气(a) { return ({ 快招: 1, 沉招: 2, 杀手: 5 })[a] || 0; }
  function 出招(我行动) {
    if (!战 || 战.完) return;
    var 我 = 战.我, 敌 = 战.敌, 事 = [];
    // 场地
    var 场 = 战.场地 ? 战.场地.名 : "";
    var 我伤倍 = 1, 敌伤倍 = 1, 自伤 = 0, 禁嘴 = false;
    if (场 === "杀意") { 我伤倍 = 敌伤倍 = 1.5; 自伤 = 0.25; 事.push("杀意：伤害×1.5，攻者也受伤"); }
    if (场 === "气海") { 我.气++; 敌.气++; 事.push("气海：双方 +1 气"); }
    if (场 === "缠斗") { 禁嘴 = true; 事.push("缠斗：不能叫阵"); }
    if (场 === "瘴疠") { var d1 = Math.round(我.生命 * 0.1), d2 = Math.round(敌.生命 * 0.1); 我.生命 = Math.max(0, 我.生命 - d1); 敌.生命 = Math.max(0, 敌.生命 - d2); 事.push("瘴疠：双方各掉 " + d1 + " / " + d2); }
    if (场 === "回春") { 我.生命 = Math.min(我.生命上限, 我.生命 + Math.round(我.生命上限 * 0.1)); 事.push("回春：回血"); }

    var 我行 = 我行动;
    if (禁嘴 && 我行 === "叫阵") 我行 = "吐纳";
    if (我.挑衅 > 0 && 我行 === "守势") { 我行 = "吐纳"; 事.push("被叫阵，守不住"); }
    if (我.气 < 战气(我行)) { 事.push("气不够，改成吐纳"); 我行 = "吐纳"; }
    else 我.气 -= 战气(我行);
    // 敌人按风格选
    var 偏好 = { 风: ["快招", "叫阵"], 火: ["沉招"], 林: ["吐纳", "杀手"], 山: ["守势"] }[战.风格] || ["快招"];
    var 敌行 = 偏好[Math.floor(Math.random() * 偏好.length)];
    if (敌.气 < 战气(敌行)) 敌行 = 敌.气 >= 1 ? "快招" : "吐纳";
    else 敌.气 -= 战气(敌行);
    if (禁嘴 && 敌行 === "叫阵") 敌行 = "吐纳";
    if (敌.挑衅 > 0 && 敌行 === "守势") 敌行 = "吐纳";

    if (我行 === "吐纳") { 我.气++; 事.push("我方吐纳，气 +1"); }
    if (敌行 === "吐纳") { 敌.气++; 事.push("对方吐纳，气 +1"); }
    if (我行 === "叫阵" && 敌行 === "守势") { 敌.气 = Math.max(0, 敌.气 - 1); 敌.挑衅 = 2; 事.push("叫阵破了他的守势"); }
    if (敌行 === "叫阵" && 我行 === "守势") { 我.气 = Math.max(0, 我.气 - 1); 我.挑衅 = 2; 事.push("他叫阵破了我方的守势"); }

    // 我方出手
    var 我倍 = 战倍(我行);
    if (我倍 > 0) {
      var 被压 = 战克(敌行, 我行);
      if (被压.r === "无效") 事.push("我方这一招被压住：" + 被压.t);
      else {
        var 自 = 战克(我行, 敌行);
        var 系 = (自.r === "减伤") ? 自.系 : 1;
        var 伤 = Math.max(1, Math.round((我.攻击 * 我倍 * 我伤倍 - 敌.格挡) * 系));
        敌.生命 = Math.max(0, 敌.生命 - 伤);
        事.push("我方 " + 我行 + " 命中，对方 −" + 伤 + (自.r === "无视" ? "（破守）" : ""));
        if (自伤) { var s = Math.round(伤 * 自伤); 我.生命 = Math.max(0, 我.生命 - s); 事.push("杀意反噬，我方自损 " + s); }
      }
    }
    // 敌方出手
    var 敌倍 = 战倍(敌行);
    if (敌倍 > 0 && 敌.生命 > 0) {
      var 被压2 = 战克(我行, 敌行);
      if (被压2.r === "无效") 事.push("对方这一招被压住：" + 被压2.t);
      else {
        var 自2 = 战克(敌行, 我行);
        var 系2 = (自2.r === "减伤") ? 自2.系 : 1;
        var 伤2 = Math.max(1, Math.round((敌.攻击 * 敌倍 * 敌伤倍 - 我.格挡) * 系2));
        我.生命 = Math.max(0, 我.生命 - 伤2);
        事.push("对方 " + 敌行 + " 命中，我方 −" + 伤2);
        if (自伤) { var s2 = Math.round(伤2 * 自伤); 敌.生命 = Math.max(0, 敌.生命 - s2); 事.push("杀意反噬，对方自损 " + s2); }
      }
    }
    if (我.挑衅 > 0) 我.挑衅--;
    if (敌.挑衅 > 0) 敌.挑衅--;
    战.回合++;
    战.报.unshift("第 " + 战.回合 + " 回合：我方 " + 我行 + " ｜ 对方 " + 敌行 + "　" + 事.join("；"));
    if (战.报.length > 8) 战.报.pop();
    if (我.生命 <= 0 || 敌.生命 <= 0) 战.完 = true;
    // ★ 战斗结果落账（接现有变量）
    if (战.完) {
      写(function (sd) {
        sd.身体 = sd.身体 || {};
        sd.身体.生命当前 = 我.生命;
        // ★ 战斗结果自动落到关系（打过的会被记恨，不用 AI 手写）
        if (typeof 战斗落关系 === "function") {
          sd.关系 = sd.关系 || {};
          var 落 = 战斗落关系({ 结果: 敌.生命 <= 0 ? "我方胜" : "我方败" }, 战.敌.名, sd.关系);
          if (落) sd.关系网 = sd.关系网 || {};
        }
        sd.战斗临时 = { 结果: 敌.生命 <= 0 ? "我方胜" : "我方败", 回合数: 战.回合,
          我方状态: "剩 " + 我.生命 + "/" + 我.生命上限,
          对方状态: "剩 " + 敌.生命 + "/" + 敌.生命上限,
          存活: (敌.生命 <= 0 ? "我方 1/1　对方 0/1" : "我方 0/1　对方 1/1") };
      });
    }
    画();
  }
  function 取战物() {  /* 道具：简化为回一口血 */
    if (!战 || 战.完) return;
    战.我.生命 = Math.min(战.我.生命上限, 战.我.生命 + Math.round(战.我.生命上限 * 0.3));
    战.报.unshift("取物：服了一剂，回 " + Math.round(战.我.生命上限 * 0.3) + " 血");
    画();
  }

  function 画打斗() {
    var 行表 = ((D.战斗与行动 || {}).我方行动命名) || { 集气: "吐纳", 防御: "守势", 轻攻击: "快招", 重攻击: "沉招", 绝招: "杀手", 嘴炮: "叫阵", 道具: "取物" };
    var 序 = ["集气", "防御", "轻攻击", "重攻击", "绝招", "嘴炮", "道具"];
    var H = "";
    if (!战) {
      // 选对手
      var 地点 = (状态.场景 || {}).当前地点 || "";
      /* ★ 2026-09-17 改（用户问「可交战目标该跟地图位置关联变动吧」）——
         原来只按地点筛、又硬切 8 个：一屏列满，却分不清谁是闲人、谁今天不在。
         现在三层：
           ① 按当前地点（变量 场景.当前地点）
           ② 按 NPC作息判在不在（契约 底座_yingxiong/NPC作息.yaml）
           ③ 分成「能打的」与「闲人」—— 小贩/裁缝/孩子这些不该混在战斗按钮里
         ★ 判据还是「契约 vs 实例」：地点名与作息是契约，当前地点是变量 */
      var 一带 = 这一带谁在();
      var 地点 = 一带.地点, 在场 = 一带.在场, 能打的 = 一带.能打的, 闲人 = 一带.闲人;
      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">打斗 <em>（七行动 · 克制链 · 纯前端跑）</em></div>';
      H += '<div class="yx-nt">选一个人动手。战斗逐回合真跑，同一局面结果一致；打完后结果会写进「上一场」，也会落到正文里。</div>';
      if (!在场.length) H += '<div class="yx-e">这一带没有可交战的人。</div>';
      else H += '<div class="yx-foes" style="margin-top:10px">' + 在场.map(function (n) {
        var 品 = NPC品级(n), 色 = 档色(品);
        return '<button class="yx-btn" data-开打="' + E(n) + '" style="border-color:' + 色 + '66;color:' + 色 + '">' + E(n) + "　" + 品名(品) + "</button>";
      }).join("") + "</div>";
      H += "</div></div>";
      return H;
    }
    var 我 = 战.我, 敌 = 战.敌;
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">打斗 <em>第 ' + 战.回合 + " 回合</em></div>";
    H += '<div class="yx-bw"><span class="lb">我方</span><div class="yx-bar"><i class="hp" style="width:' + (我.生命 / 我.生命上限 * 100) + '%"></i></div><span class="vl">' + 我.生命 + "/" + 我.生命上限 + "　气 " + 我.气 + '</span></div>';
    H += '<div class="yx-bw"><span class="lb">' + E(敌.名) + '</span><div class="yx-bar"><i style="width:' + (敌.生命 / 敌.生命上限 * 100) + '%;background:#e05a4a"></i></div><span class="vl">' + 敌.生命 + "/" + 敌.生命上限 + "　气 " + 敌.气 + '</span></div>';
    var 风色 = { 风: "#5ca3d8", 火: "#e05a4a", 林: "#4f8f6b", 山: "#c69c6d" }[战.风格];
    H += '<div class="yx-nt">对方风格 <b style="color:' + 风色 + '">' + E(战.风格) + '</b>（读对手：风快攻、火爆发、林蓄力、山守）' + (战.场地 ? '　场地 <b>' + E(战.场地.标 + 战.场地.名) + "</b>" : "") + "</div>";
    if (战.场地) H += '<div class="yx-nt">' + E(战.场地.效果) + "</div>";
    if (!战.完) {
      H += '<div class="yx-foes" style="margin-top:11px">' + 序.map(function (k) {
        var 耗 = 战气(k);
        var 能 = (我.气 >= 耗);
        return '<button class="yx-btn" data-出招="' + k + '"' + (能 ? "" : " disabled") + ' title="耗气 ' + 耗 + '">' + E(行表[k] || k) + (耗 ? " (" + 耗 + ")" : "") + "</button>";
      }).join("") + "</div>";
      H += '<div class="yx-nt">杀手 5 气无视防御；守势挡快招只吃 15%；叫阵破守势、制杀手</div>';
    } else {
      H += '<div class="yx-foes" style="margin-top:11px"><span class="yx-ch ' + (敌.生命 <= 0 ? "on" : "rd") + '">' + (敌.生命 <= 0 ? "我方胜" : "我方败") + '</span></div>';
      H += '<div class="yx-ops" style="margin-top:10px"><button class="yx-btn pri" id="yx-zs">再打一场</button><button class="yx-btn" id="yx-bz">收手</button></div>';
    }
    if (战.报.length) H += '<div class="yx-k2">战报</div>' + 战.报.map(function (x) { return '<div class="yx-nt">' + E(x) + "</div>"; }).join("");
    H += "</div></div>";
    return H;
  }
  function 绑打斗() {
    [].forEach.call(document.querySelectorAll("[data-开打]"), function (b) {
      b.addEventListener("click", function () { 起战(b.getAttribute("data-开打")); });
    });
    [].forEach.call(document.querySelectorAll("[data-出招]"), function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-出招");
        if (k === "道具") 取战物(); else 出招(k);
      });
    });
    var a = document.getElementById("yx-zs"); if (a) a.addEventListener("click", function () { 战 = null; 画(); });
    var b2 = document.getElementById("yx-bz"); if (b2) b2.addEventListener("click", function () { 战 = null; 画(); });
  }

  /* ════════════════════════════════════════════════════════════
     英雄榜（打榜）★ 借自参考项目「主神空间」的竞技场
     为什么加：练了武功要有个去处 —— 榜单给了「明确目标 + 可量化进度」
     ════════════════════════════════════════════════════════════ */
  var 榜 = null;
  function 造榜() {
    var 分档 = ((D.英雄榜 || {}).榜单 || {}).分档 || [];
    var 我名 = (状态.主角 || {}).名 || "我";
    var 武 = 数(((状态.技能 || {}).基本 || {})["基本拳脚"], 0) + 数(((状态.技能 || {}).门派 || {})["太极拳"], 0);
    var 层 = 分档.length ? 分档[0] : { 名: "本门榜" };
    if (武 >= 1000 && 分档[2]) 层 = 分档[2];
    else if (武 >= 300 && 分档[1]) 层 = 分档[1];
    // 生成 30 人（缓存：同一天不变）
    var 名池 = Object.keys(D.NPC || {});
    var 列 = [];
    for (var i = 0; i < 30; i++) {
      var n = 名池[(i * 7) % Math.max(1, 名池.length)] || ("江湖人" + (i + 1));
      var 品 = NPC品级(n);
      var 强 = ({ q0: 8, q1: 14, q2: 22, q3: 34, q4: 50, q5: 70, q6: 90 })[品] || 14;
      列.push({ 名: n, 品: 品, 强: typeof NPC强度 === "function" ? NPC强度(n) : 强, 名次: i + 1 });
    }
    榜 = { 层: 层.名 || "本门榜", 列: 列, 我: 31, 最佳: 31, 连胜: 0 };
    画();
  }
  function 挑战(名次) {
    var o = (榜 && 榜.列 || []).filter(function (x) { return x.名次 === 名次; })[0];
    if (!o) return;
    var 力 = 数((状态.时间 || {}).体力, 100);
    if (力 < 20) { alert("体力不够（要 20）"); return; }
    if (!在据点()) { alert("须回驻地才能打榜"); return; }
    写(function (sd) { sd.时间 = sd.时间 || {}; sd.时间.体力 = Math.max(0, 力 - 20); });
    // 打赢判定：用打斗的自动战（前端跑）
    var t = 算天赋(状态), d = 派生(t, 状态), B = 状态.身体 || {};
    var A = 战 ? null : null;
    var 我 = { 生命: Math.max(1, 数(B.生命当前, 100)), 生命上限: Math.max(1, 数(d.气血上限, 100)), 气: 0, 挑衅: 0, 攻击: Math.max(4, Math.round(数(d.攻击力, 20))), 格挡: Math.max(0, Math.round(数(d.护甲, 0))) };
    var 敌 = { 生命: o.强 * 5, 生命上限: o.强 * 5, 气: 0, 挑衅: 0, 攻击: o.强, 格挡: Math.round(o.强 / 4) };
    // 跑一场（最多 30 回合，简化：双方互殴）
    var 轮 = 0;
    while (轮 < 30 && 我.生命 > 0 && 敌.生命 > 0) {
      轮++;
      var 伤 = Math.max(1, Math.round(我.攻击 * (轮 % 3 === 0 ? 1.5 : 1) - 敌.格挡));
      敌.生命 = Math.max(0, 敌.生命 - 伤);
      if (敌.生命 <= 0) break;
      var 伤2 = Math.max(1, Math.round(敌.攻击 * (轮 % 4 === 0 ? 1.5 : 1) - 我.格挡));
      我.生命 = Math.max(0, 我.生命 - 伤2);
    }
    var 胜 = 敌.生命 <= 0 && 我.生命 > 0;
    if (胜) {
      榜.最佳 = Math.min(榜.最佳, o.名次);
      榜.我 = o.名次;
      榜.连胜++;
      alert("★ 胜了 —— 名次取代为 #" + o.名次 + (榜.连胜 > 1 ? "　连胜 " + 榜.连胜 : ""));
    } else {
      榜.连胜 = 0;
      alert("败了 —— 名次不变，随时可以再来");
    }
    写(function (sd) { sd.身体 = sd.身体 || {}; sd.身体.生命当前 = 我.生命; });
    画();
  }
  function 画英雄榜() {
    if (!榜) { 造榜(); }
    var H = "";
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">英雄榜 <em>' + E(榜.层) + '</em></div>';
    H += '<div class="yx-nt">打赢谁就顶替谁的名次 —— 一路往上打就能爬榜。前 100 有名有姓，第一名有唯一称号。</div>';
    H += '<div class="yx-chips" style="margin:9px 0">'
      + '<span class="yx-ch on">我的名次 #' + 榜.我 + '</span>'
      + '<span class="yx-ch">最佳 #' + 榜.最佳 + '</span>'
      + '<span class="yx-ch' + (榜.连胜 ? " gr" : "") + '">连胜 ' + 榜.连胜 + '</span>'
      + '<span class="yx-ch">' + (在据点() ? "在驻地" : "不在驻地") + '</span></div>';
    if (!在据点()) H += '<div class="yx-nt w">★ 须回驻地才能挑战</div>';
    H += '</div></div>';
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">榜单</div><div class="yx-list">';
    H += 榜.列.slice(0, 20).map(function (o) {
      var 色 = 档色(o.品);
      return '<div class="yx-it"><span class="x" style="min-width:34px">#' + o.名次 + '</span>'
        + '<span class="n" style="color:' + 色 + '">' + E(o.名) + '</span>'
        + '<span class="x">' + 品名(o.品) + '　强度 ' + o.强 + '</span>'
        + (在据点() ? '<button class="yx-btn sm" data-挑="' + o.名次 + '">挑战</button>' : "")
        + '</div>';
    }).join("");
    H += "</div></div></div>";
    return H;
  }
  function 绑英雄榜() {
    [].forEach.call(document.querySelectorAll("[data-挑]"), function (b) {
      b.addEventListener("click", function () { 挑战(数(b.getAttribute("data-挑"))); });
    });
  }

  /* ════════════════════════════════════════════════════════════
     开局（★ 解决「第 8 套郁灼没法选」）
     只在开局时出现：选她（人设）+ 选门派 + 起名
     ════════════════════════════════════════════════════════════ */
  function 画开局() {
    var 套 = D.八套 || [];
    var 门 = D.门派 || {};
    var 门名 = Array.isArray(门) ? 门.map(function (p) { return p.名 || p; }) : Object.keys(门);
    var 现人设 = String((状态.她 || {}).人设 || '');
    var 现门 = String((状态.场景 || {}).当前门派 || '');
    var 名 = String((状态.主角 || {}).名 || '');
    var H = "";
    H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">开局 <em>（她要玩谁的那一局）</em></div>';
    H += '<div class="yx-nt">★ 这是「她」在玩的那一局 —— 定下之后，她的每一步选择都按这套人设长出来。</div>';

    // ① 选她
    H += '<div class="yx-k2">' + (现人设 ? '当前：' + E(现人设) : '选一个「她」') + '</div>';
    H += '<div class="yx-skgrid">' + 套.map(function (n) {
      var 是 = (n === 现人设);
      var 色 = 是 ? "var(--gold)" : "var(--t3)";
      return '<div class="yx-sk' + (是 ? " sel" : "") + '" data-她="' + E(n) + '" style="border-color:' + 色 + '66">'
        + '<div class="ring"><span class="ic" style="color:' + 色 + '">' + ic("角色", 17) + '</span></div>'
        + '<div class="nm" style="color:' + 色 + '">' + E(String(n).replace(/^她_/, "")) + '</div>'
        + '<div class="bdg" style="color:' + 色 + ';border-color:' + 色 + '66">' + (是 ? "已选" : "选她") + '</div></div>';
    }).join("") + "</div>";
    H += '<div class="yx-nt">每套人设的「手段」都不同：遇障碍怎么办、遇无聊怎么办（见「她用过的手段」）。</div>';

    // ② 选门派
    H += '<div class="yx-k2">' + (现门 ? '当前门派：' + E(现门) : '入门派') + '</div>';
    H += '<div class="yx-chips">' + 门名.map(function (名p) {
      var 是 = (名p === 现门);
      return '<span class="yx-ch clk' + (是 ? " on" : "") + '" data-门="' + E(名p) + '">' + E(名p) + "</span>";
    }).join("") + "</div>";
    H += '<div class="yx-nt">门派决定能学哪些武功（门派武功表）。</div>';

    // ③ 起名
    H += '<div class="yx-k2">起个名字</div>';
    H += '<div class="yx-ops"><button class="yx-btn" id="yx-ming">' + (名 ? "改名（现在叫 " + E(名) + "）" : "取个名") + '</button></div>';

    // ④ 开局确认
    var 齐 = 现人设 && 现门;
    H += '<div class="yx-ops" style="margin-top:14px"><button class="yx-btn pri" id="yx-开"' + (齐 ? "" : " disabled") + ">"
      + (齐 ? "★ 开局" : "还差：" + (!现人设 ? "选她 " : "") + (!现门 ? "门派" : "")) + "</button></div>";
    H += "</div></div>";

    // 已定下的信息
    if (齐) {
      H += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">这一局</div>';
      H += 折行("她", E(现人设));
      H += 折行("门派", E(现门));
      H += 折行("你", 名 || "（未取名）");
      H += 折行("时间", (数((状态.时间 || {}).岁数, 14)) + " 岁 · 第 " + (数((状态.时间 || {}).月, 1)) + " 月");
      H += 折行("耐心", 数(状态.时间 ? 状态.时间.耐心 : 24, 24) + " 月");
      H += "</div>";
      var 套详 = D.套详 || {};
      var 说 = 套详[现人设];
      if (说) H += '<div class="yx-c yx-w"><div class="yx-ttl">她的手段</div><div class="yx-nt">' + E(String(说).slice(0, 300)) + "</div></div>";
      H += "</div>";
    }
    return H;
  }
  function 绑开局() {
    [].forEach.call(document.querySelectorAll("[data-她]"), function (c) {
      c.addEventListener("click", function () {
        var n = c.getAttribute("data-她");
        写(function (sd) { sd.她 = sd.她 || {}; sd.她.人设 = n; });
        setTimeout(画, 200);
      });
    });
    [].forEach.call(document.querySelectorAll("[data-门]"), function (c) {
      c.addEventListener("click", function () {
        var n = c.getAttribute("data-门");
        写(function (sd) { sd.场景 = sd.场景 || {}; sd.场景.当前门派 = n; });
        setTimeout(画, 200);
      });
    });
    var m = document.getElementById("yx-ming");
    if (m) m.addEventListener("click", function () {
      var v = prompt("他叫什么？", String((状态.主角 || {}).名 || ""));
      if (v) 写(function (sd) { sd.主角 = sd.主角 || {}; sd.主角.名 = String(v).slice(0, 8); });
      setTimeout(画, 200);
    });
    var k = document.getElementById("yx-开");
    if (k) k.addEventListener("click", function () {
      alert("开局已定 —— 剩下的交给她。");
      页 = 'overview'; 画();
    });
  }

  /* ════════════════════════════════════════════════════════════
     舆图（世界地图）★ 参考项目「姬侠传」有一个独立的世界地图页
     做法：按「平安镇在大陆中心」摆位，其他地点按方位铺开
     ════════════════════════════════════════════════════════════ */
  var 舆图位 = {
    平安镇: [340, 250],
    武当山: [220, 190],
    玉女峰: [470, 320],
    大雪山: [300, 90],
    灵心观: [140, 280],
    五指山: [430, 430],
    冰火岛: [560, 120],
    黑森林: [200, 400],
    商家堡: [520, 230],
  };
  var 舆图连 = [
    ['平安镇', '武当山'], ['平安镇', '玉女峰'], ['平安镇', '灵心观'],
    ['平安镇', '五指山'], ['平安镇', '商家堡'], ['武当山', '大雪山'],
    ['大雪山', '冰火岛'], ['灵心观', '黑森林'], ['玉女峰', '五指山'],
  ];
  var 选中地 = null;

  function 画舆图() {
    var 地 = D.地理 || {};
    var 名s = Object.keys(地).filter(function (k) { return !!舆图位[k]; });
    var 当前 = String((状态.场景 || {}).当前地点 || "");
    var W = 680, H = 520;
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" class="yx-map">';
    // 底纹：山河
    s += '<defs>'
      + '<radialGradient id="yxmg" cx="50%" cy="45%">'
      + '<stop offset="0%" stop-color="#1b2334"/><stop offset="100%" stop-color="#0d1119"/></radialGradient>'
      + '</defs>';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#yxmg)" rx="10"/>';
    // 山脊（几笔装饰）
            s += '<path d="M60 420 Q140 350 200 400 T340 380 T470 430 T610 400" fill="none" stroke="#243149" stroke-width="1.4" opacity=".5"/>';
    s += '<path d="M80 140 Q180 90 300 120 T520 100 T640 160" fill="none" stroke="#243149" stroke-width="1.2" opacity=".4"/>';
    // 连线
    舆图连.forEach(function (p) {
      var a = 舆图位[p[0]], b = 舆图位[p[1]];
      if (!a || !b) return;
      s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"'
        + ' stroke="#3a476606" stroke-width="0"/>';
      s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"'
        + ' stroke="#3a4766" stroke-width="1" opacity=".45" stroke-dasharray="3 4"/>';
    });
    // 地点
    名s.forEach(function (n) {
      var p = 舆图位[n];
      var 是 = (n === 当前);
      var 色 = 是 ? "#e5b44a" : "#6d7893";
      // 危险度：黑森林 / 五指山 / 冰火岛偏危险
      var 险 = (["黑森林", "五指山", "冰火岛"].indexOf(n) >= 0);
      var 点色 = 险 ? "#e05a4a" : 色;
      s += '<g class="yx-mp" data-place="' + E(n) + '" style="cursor:pointer">';
      if (是) s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="21" fill="none" stroke="#e5b44a" stroke-width="1" opacity=".5" class="yx-breathe"/>';
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="' + 点色 + '22" stroke="' + 点色 + '" stroke-width="1.6"/>';
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="' + 点色 + '"/>';
      s += '<text x="' + p[0] + '" y="' + (p[1] - 16) + '" text-anchor="middle" fill="' + 点色 + '" font-size="12" font-weight="' + (是 ? 600 : 400) + '">' + E(n) + "</text>";
      // 门下弟子数
      var 谁 = 谁在这((地[n] || {}).谁在这儿).length;
      if (谁) s += '<text x="' + p[0] + '" y="' + (p[1] + 22) + '" text-anchor="middle" fill="' + 色 + '" font-size="9" opacity=".65">' + 谁 + " 人</text>";
      s += "</g>";
    });
    s += "</svg>";

    var H2 = "";
    H2 += '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">舆图 <em>（点一处看详情）</em></div>';
    H2 += '<div class="yx-nt">金圈是你现在所在。红点是偏僻凶险的地方（黑森林 / 五指山 / 冰火岛）。</div>';
    H2 += '<div class="yx-tu">' + s + "</div></div>";
    // 详情
    if (选中地 && 地[选中地]) {
      var d = 地[选中地];
      H2 += '<div class="yx-c yx-w"><div class="yx-ttl">' + E(选中地) + (选中地 === 当前 ? ' <em>（就在这儿）</em>' : "") + "</div>";
      H2 += 折行("范围", E(d.范围 || "—"));
      H2 += '<div class="yx-k2">概览</div><div class="yx-nt">' + E(d.概览 || "") + "</div>";
      H2 += 折行("可做的事", E(d.可做的事 || "—"));
      var 谁2 = String(d.谁在这儿 || "").split(" / ").filter(Boolean);
      if (谁2.length) {
        H2 += '<div class="yx-k2">谁在这儿（' + 谁2.length + " 人）</div>";
        H2 += '<div class="yx-chips">' + 谁2.map(function (n) {
          var 品 = NPC品级(n), 色 = 档色(品);
          return '<span class="yx-ch" style="border-color:' + 色 + '66;color:' + 色 + '">' + E(n) + "　" + 品名(品) + "</span>";
        }).join("") + "</div>";
      }
      if (d.注) H2 += '<div class="yx-nt">★ ' + E(d.注) + "</div>";
      H2 += "</div>";
    }
    H2 += "</div>";
    return H2;
  }
  function 绑舆图() {
    [].forEach.call(document.querySelectorAll(".yx-mp"), function (g) {
      g.addEventListener("click", function () {
        选中地 = g.getAttribute("data-place");
        画();
      });
    });
  }

  /* ════════════════════════════════════════════════════════════
     雷达图（四天赋）★ 参考项目里有「情感温度七级色阶」的做法
     把文字数字变成一眼能看出形状的图
     ════════════════════════════════════════════════════════════ */
  function 画雷达(值表, 边, 色) {
    var 键s = Object.keys(值表);
    var n = 键s.length;
    if (!n) return "";
    var R = 78, cx = 100, cy = 92, 最 = 100;
    var s = '<svg viewBox="0 0 200 190" width="200" height="190" class="yx-radar">';
    // 三圈底
    [0.35, 0.65, 1].forEach(function (k) {
      var pts = 键s.map(function (_, i) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / n;
        return (cx + Math.cos(a) * R * k).toFixed(1) + "," + (cy + Math.sin(a) * R * k).toFixed(1);
      }).join(" ");
      s += '<polygon points="' + pts + '" fill="none" stroke="' + 边 + '" stroke-width="1" opacity=".28"/>';
    });
    // 辐条
    键s.forEach(function (_, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(a) * R).toFixed(1) + '" y2="' + (cy + Math.sin(a) * R).toFixed(1) + '" stroke="' + 边 + '" stroke-width="1" opacity=".22"/>';
    });
    // 数据面
    var 点数 = 键s.map(function (k, i) {
      var v = Math.max(0, Math.min(1, 数(值表[k]) / 最));
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return (cx + Math.cos(a) * R * v).toFixed(1) + "," + (cy + Math.sin(a) * R * v).toFixed(1);
    }).join(" ");
    s += '<polygon points="' + 点数 + '" fill="' + 色 + '33" stroke="' + 色 + '" stroke-width="1.6"/>';
    // 顶点
    键s.forEach(function (k, i) {
      var v = Math.max(0, Math.min(1, 数(值表[k]) / 最));
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      s += '<circle cx="' + (cx + Math.cos(a) * R * v).toFixed(1) + '" cy="' + (cy + Math.sin(a) * R * v).toFixed(1) + '" r="2.6" fill="' + 色 + '"/>';
      var lx = cx + Math.cos(a) * (R + 20), ly = cy + Math.sin(a) * (R + 15) + 4;
      s += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" fill="' + 边 + '" font-size="10">' + E(k) + "</text>";
      s += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 11).toFixed(1) + '" text-anchor="middle" fill="' + 色 + '" font-size="9" opacity=".85">' + 数(值表[k]) + "</text>";
    });
    s += "</svg>";
    return s;
  }

  /* ══ 情感温度带（七级）★ 出处：参考项目的情感温度色阶 ══ */
  var 温度阶 = [
    { 名: "仇视", 色: "#8a8f98", 门: -100 },
    { 名: "敌意", 色: "#5b8dc9", 门: -60 },
    { 名: "冷淡", 色: "#7fa8c9", 门: -20 },
    { 名: "中立", 色: "#a39f98", 门: 0 },
    { 名: "友好", 色: "#e0a06e", 门: 20 },
    { 名: "亲近", 色: "#eb613f", 门: 50 },
    { 名: "挚交", 色: "#e8c87a", 门: 80 },
  ];
  function 温度(好感) {
    var v = 数(好感);
    var 得 = 温度阶[0];
    for (var i = 0; i < 温度阶.length; i++) if (v >= 温度阶[i].门) 得 = 温度阶[i];
    return 得;
  }
  function 温度带(好感) {
    var v = Math.max(-100, Math.min(100, 数(好感)));
    var 得 = 温度(好感);
    var 位 = (v + 100) / 200 * 100;
    return '<div class="yx-tmp"><div class="track">'
      + 温度阶.map(function (t, i) {
        var a = i === 0 ? 0 : (温度阶[i - 1].门 + 100) / 2, b = (t.门 + 100) / 2;
        return '<i style="left:' + Math.max(0, a) + '%;width:' + Math.max(0, b - a) + '%;background:' + t.色 + '"></i>';
      }).join("")
      + '</div><span class="mk" style="left:' + 位 + '%;background:' + 得.色 + '"></span>'
      + '<span class="lb" style="color:' + 得.色 + '">' + 得.名 + "（" + Math.round(v) + "）</span></div>";
  }

  /* ══ 进度环 ══ */
  function 画环(百分, 色, 标签, 值文) {
    var p = Math.max(0, Math.min(100, 数(百分)));
    var R = 26, C = 2 * Math.PI * R;
    return '<div class="yx-ring"><svg viewBox="0 0 64 64" width="64" height="64">'
      + '<circle cx="32" cy="32" r="' + R + '" fill="none" stroke="' + 色 + '22" stroke-width="5"/>'
      + '<circle cx="32" cy="32" r="' + R + '" fill="none" stroke="' + 色 + '" stroke-width="5"'
      + ' stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - p / 100)).toFixed(1) + '"'
      + ' stroke-linecap="round" transform="rotate(-90 32 32)"/>'
      + '<text x="32" y="36" text-anchor="middle" fill="' + 色 + '" font-size="13" font-weight="600">' + Math.round(p) + "</text>"
      + '</svg><span class="lb">' + E(标签) + '</span><span class="vl">' + E(值文 || "") + "</span></div>";
  }

  /* ════════════════════════════════════════════════════════════
     丹炉（炼丹的视觉）★ 纯 SVG，火焰跟炉温走，画危险线
     ════════════════════════════════════════════════════════════ */
  function 画丹炉(炉温, 态色) {
    var w = Math.max(0, Math.min(1, 数(炉温) / 100));
    var H = 168, W = 190, cx = W / 2;
    // 火焰强度跟炉温走
    var 焰 = 0.25 + w * 0.75;
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" class="yx-furnace">';
    // 炉座
    s += '<ellipse cx="' + cx + '" cy="148" rx="52" ry="9" fill="#0a0d14" stroke="#2a3346"/>';
    // 炉身（三层，越上越窄）
    s += '<path d="M' + (cx - 46) + " 148 L" + (cx - 34) + " 78 L" + (cx + 34) + " 78 L" + (cx + 46) + ' 148 Z" fill="#151b26" stroke="#2f3a4f" stroke-width="1.2"/>';
    s += '<path d="M' + (cx - 34) + " 78 L" + (cx - 28) + " 50 L" + (cx + 28) + " 50 L" + (cx + 34) + ' 78 Z" fill="#1a2130" stroke="#2f3a4f"/>';
    // 炉纹
    s += '<path d="M' + (cx - 40) + " 112 L" + (cx + 40) + ' 112" stroke="#2a3346" stroke-width="1"/>';
    // ★ 炉膛的光（亮度跟炉温走）
    s += '<ellipse cx="' + cx + '" cy="104" rx="' + (20 + w * 8) + '" ry="' + (8 + w * 4) + '" fill="' + 态色 + '" opacity="' + (0.18 + w * 0.5) + '"/>';
    // 火焰
    for (var i = 0; i < 3; i++) {
      var dx = (i - 1) * 13, h = (26 + i * 6) * 焰;
      s += '<path d="M' + (cx + dx) + " 100 Q" + (cx + dx - 6) + " " + (100 - h * 0.6) + " " + (cx + dx) + " " + (100 - h)
        + " Q" + (cx + dx + 6) + " " + (100 - h * 0.6) + " " + (cx + dx) + ' 100 Z"'
        + ' fill="' + 态色 + '" opacity="' + (0.35 + w * 0.45) + '"/>';
    }
    // 炉口
    s += '<ellipse cx="' + cx + '" cy="50" rx="30" ry="7" fill="#0d1119" stroke="#2f3a4f"/>';
    // ★ 危险线（100）
    var 线y = 148 - Math.min(148 - 12, w * (148 - 12));
    s += '<line x1="' + (W - 34) + '" y1="' + 线y + '" x2="' + (W - 10) + '" y2="' + 线y + '" stroke="' + 态色 + '" stroke-width="2"/>';
    s += '<text x="' + (W - 8) + '" y="' + (线y + 4) + '" text-anchor="end" fill="' + 态色 + '" font-size="9" opacity=".8">' + Math.round(数(炉温)) + '</text>';
    // 刻度
    for (var k = 0; k <= 4; k++) {
      var yy = 148 - k * 34;
      s += '<line x1="' + (W - 30) + '" y1="' + yy + '" x2="' + (W - 22) + '" y2="' + yy + '" stroke="#33405a" stroke-width="1"/>';
      s += '<text x="' + (W - 18) + '" y="' + (yy + 3) + '" fill="#49536b" font-size="8">' + (k * 25) + "</text>";
    }
    s += "</svg>";
    return s;
  }

  /* ════════════════════════════════════════════════════════════
     穿着卡：每个部位带品质色 + 加成（原来只有一行字，下面大片空）
     ════════════════════════════════════════════════════════════ */
  function 画穿着() {
    var 穿 = ((状态.NSFW || {}).穿着) || {};
    var 槽s = ((D.物品 || {}).装备槽) || ["外衫", "下裳", "里衣", "布袜", "鞋履", "佩饰"];
    var 件 = ((D.物品 || {}).示例) || [];
    var H = '<div class="yx-slotgrid">';
    槽s.forEach(function (槽) {
      var 名 = String(穿[槽] || "");
      var 参 = null;
      for (var i = 0; i < 件.length; i++) if (件[i].名 === 名) 参 = 件[i];
      var 品 = 名 ? 物品品级(名) : "q0", 色 = 名 ? 档色(品) : "var(--ln2)";
      H += '<div class="yx-slot2" style="border-color:' + (名 ? 色 + "66" : "var(--ln)") + '">'
        + '<span class="sn">' + E(槽) + "</span>"
        + '<span class="sv" style="color:' + (名 ? 色 : "var(--t4)") + '">' + (名 ? E(名) : "空着") + "</span>"
        + (参 && 参.加成 ? '<span class="sb">' + Object.keys(参.加成).map(function (k) { return k + "+" + 参.加成[k]; }).join(" ") + "</span>" : "")
        + (名 ? '<span class="sq" style="color:' + 色 + '">' + 品名(品) + "</span>" : "")
        + "</div>";
    });
    H += "</div>";
    // 缺口提示
    var 空 = 槽s.filter(function (s) { return !穿[s]; });
    H += '<div class="yx-nt">' + (空.length ? "★ 还空着：" + 空.join(" / ") + "（找裁缝店或打铁铺）" : "六件齐全") + "</div>";
    return H;
  }

  /* ── 说明 ── */
  function 画说明() {
    return '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-help">'
      + '<h5>这块面板是什么</h5>'
      + '<ul><li>它显示的是 <code>stat_data</code> 里的状态 —— 与 AI 看到的是同一份。</li>'
      + '<li>所有判定都在**前端**算好再写回变量，AI 只读结论，不自己重算。</li>'
      + '<li>同一楼层重渲染会得到同一个结果（用的是 LCG 伪随机，不是 <code>Math.random</code>）。</li></ul>'

      + '<h5>本轮选项那几条</h5>'
      + '<ul><li><b>选项不是给你选的</b> —— 是本轮选项三到四个完成方式，<b>她</b>从中挑一个。</li>'
      + '<li>你只有两个动作：<b>眼睁睁看着</b>（不干预，反抗值照涨）或 <b>拒绝</b>（拦住她正要点的那个）。</li>'
      + '<li><b>自定义</b> = 不按她摆的来，照自己的想法做一次。掏空反抗值，一局顶多一两次。</li>'
      + '<li>拒绝是花反抗值跟她顶：等级越高越贵越难成。<b>失败了也照扣</b>。</li></ul>'

      + '<h5>技能与成长</h5>'
      + '<ul><li>点技能后面的 <code>＋</code> 请教一级，花潜能。悟性越高越省。</li>'
      + '<li><b>反哺</b>：基本武功每满十级，对应的天赋（膂力/敏捷/根骨/悟性）+1。</li>'
      + '<li><b>绝招</b>不是独立等级 —— 是两门武功同时到某个级数之后自动可用。</li></ul>'

      + '<h5>动手</h5>'
      + '<ul><li>按当前地点列出能动手的人，点名字就打。</li>'
      + '<li>一回合内所有人按出手值排队；打谁由策略决定（默认先打最弱的）。</li>'
      + '<li>倒下的退出轮转，不再被继续打。</li></ul>'

      + '<h5>身体那一页</h5>'
      + '<ul><li><b>此刻</b>是场景级临时（充血、红印、湿润）—— 换场景会清掉。</li>'
      + '<li><b>长期</b>是数轮后仍稳定的（体态、常年特征）—— 换场景留着。</li>'
      + '<li>这两层写混是最常见的错，所以分开显示。</li>'
      + '<li>兴奋度单轮最多涨 <code>' + ((D.NSFW.推进 || {}).单轮上限 || 25) + '</code>，会自己往下落。</li></ul>'

      + '<h5>三条容易误解的事</h5>'
      + '<ul><li><b>她不知道你存在</b>。你写的字只落到他的内层；他要是真做出不一样的事，她只当是游戏出 BUG。</li>'
      + '<li><b>任务的失败也是结算</b> —— 好感掉、线关掉，不是「什么都没发生」。</li>'
      + '<li><b>关系分两张表</b>：人物之间的关系只有类型与强度；与你的关系多了好感与阶段。</li></ul>'

      + '<div class="yx-nt" style="margin-top:14px">数据由生成器从契约层内嵌（' + Math.round(JSON.stringify(D).length / 1024) + ' KB）。改契约要重跑 <code>gen-panel.cjs</code>。</div>'
      + '</div></div></div>';
  }

  /* ════════════ 工具 ════════════ */
  function 兴名(兴) { return 兴 >= 80 ? '难忍' : 兴 >= 60 ? '明显' : 兴 >= 40 ? '起了' : 兴 >= 20 ? '微动' : '无'; }
  function 露不露(c) {
    c = c || {}; var 剩 = [];
    for (var k in c) if (c[k]) 剩.push(k);
    var 度 = '整齐';
    if (!剩.length) 度 = '全裸';
    else if (!c['里衣'] && !c['外衫'] && !c['下裳']) 度 = '只剩袜子鞋子';
    else if (!c['里衣']) 度 = '内衣已除';
    else if (!c['外衫'] || !c['下裳']) 度 = '半褪';
    return { 还剩: 剩, 件数: 剩.length, 程度: 度 };
  }
  function 她的手段() {
    var H = 状态.她 || {};
    var 录 = H.手段记录 || [];
    if (!录.length) return '';
    var 最 = 录[录.length - 1];
    return '最近一次：' + (typeof 最 === 'string' ? 最 : (最.手段 || ''));
  }
  /* 天赋与派生：与机制层的口径一致（面板里只算显示，不写回） */
  var 反哺映射 = { 基本拳脚: '膂力', 基本轻功: '敏捷', 基本内功: '根骨', 读书写字: '悟性' };
  function 算天赋(sd) {
    var 基 = ((sd.天赋 || {}).先天) || {};
    var out = { 膂力: 数(基.膂力, 20), 敏捷: 数(基.敏捷, 20), 根骨: 数(基.根骨, 20), 悟性: 数(基.悟性, 20) };
    var 技 = ((sd.技能 || {}).基本) || {};
    for (var s in 反哺映射) out[反哺映射[s]] += Math.floor(数(技[s]) / 10);
    return out;
  }
  function 派生(t, sd) {
    var 技 = ((sd.技能 || {}).基本) || {};
    return {
      攻击: Math.round(t.膂力 * 2 + 数(技.基本拳脚) * 0.8),
      命中: Math.round(t.敏捷 * 2 + 数(技.基本轻功) * 0.5),
      闪避: Math.round(t.敏捷 * 1.5 + 数(技.基本轻功) * 0.4),
      防御: Math.round(t.根骨 * 1.5 + 数(技.基本招架) * 0.6),
      气血上限: Math.round(t.根骨 * 12 + 数(技.基本内功) * 1.2 + 100),
    };
  }

  /* ════════════ 交互（写回变量）════════ */
  async function 写(改) {
    try {
      var v = await TavernHelper.getVariables({ type: 'message', message_id: 楼 < 0 ? 'latest' : 楼 });
      var sd = (v && v.stat_data) || {};
      改(sd);
      await TavernHelper.replaceVariables({ type: 'message', message_id: 楼 < 0 ? 'latest' : 楼 }, v);
      状态 = sd;
      画();
      return true;
    } catch (e) { alert('写不进去：' + (e && e.message ? e.message : e)); return false; }
  }

  function 请教(名, 次) {
    var 次s = Math.max(1, 数(次, 1));
    var t = 算天赋(状态);
    var 技 = (状态.技能 || {}).基本 || {}, 门 = (状态.技能 || {}).门派 || {};
    var 现 = 有(技, 名) ? 数(技[名]) : 数(门[名]);
    var 总 = 0, 现2 = 现;
    for (var i2 = 0; i2 < 次s; i2++) { 总 += Math.max(1, Math.round(355.06 * (现2 + 1) / Math.max(1, t.悟性))); 现2++; }
    var 要 = 总;
    var 潜 = 数((状态.资源 || {}).潜能);
    if (潜 < 要) { alert('潜能不够：升到 ' + (现 + 1) + ' 级要 ' + 要 + '，手上 ' + 潜 + '（悟性 ' + t.悟性 + '）'); return; }
    写(function (sd) {
      sd.资源 = sd.资源 || {}; sd.资源.潜能 = 数(sd.资源.潜能) - 要;
      sd.技能 = sd.技能 || {};
      if (有((sd.技能 || {}).基本, 名)) sd.技能.基本[名] = 现 + 次s;
      else { sd.技能.门派 = sd.技能.门派 || {}; sd.技能.门派[名] = 现 + 次s; }
    });
  }

  function 动手(对手) {
    var t = 算天赋(状态), d = 派生(t, 状态);
    var 战力 = 数((D.NPC[对手] || {}).战力) || 100;
    var 档位 = [[10, 5, 110, 6, 1], [100, 30, 200, 17, 6], [300, 60, 400, 41, 18], [500, 80, 600, 65, 30],
    [1000, 110, 1100, 125, 60], [1500, 130, 1600, 185, 90], [10000, 200, 10100, 1205, 600],
    [30000, 240, 30100, 3605, 1800], [50000, 255, 50100, 6005, 3000]];
    var 档 = 档位[0];
    for (var i = 0; i < 档位.length; i++) if (战力 >= 档位[i][0]) 档 = 档位[i];
    写(function (sd) {
      sd.局面 = sd.局面 || {};
      var 我方 = { 名: '我', 生命: Math.max(1, 数((sd.身体 || {}).生命当前, 100)), 上限: d.气血上限, 攻击: d.攻击, 防御: d.防御,
        总评: Math.round((t.膂力 + t.敏捷 + t.根骨 + t.悟性) / 4), 出手值: t.敏捷, 有效值: 数((sd.身体 || {}).生命有效, 100) };
      var 敌 = { 名: 对手, 生命: 档[2], 上限: 档[2], 攻击: 档[3], 防御: 档[4], 总评: 档[1], 出手值: 档[1], 有效值: 100 };
      var s = 数(sd.局面.骰子种子, 20260916);
      var rng = function () { s = (1664525 * s + 1013904223) % 4294967296; return s / 4294967296; };
      var 命中率 = function (diff) { return Math.max(1, Math.min(95, 45 + diff * 2.2)); };
      // 逐回合真跑（与机制层的口径一致）
      var 回 = 0, 上限 = 50;
      while (我方.生命 > 0 && 敌.生命 > 0 && 回 < 上限) {
        回++;
        var 序 = (我方.出手值 >= 敌.出手值) ? [[我方, 敌, '我方'], [敌, 我方, '对方']] : [[敌, 我方, '对方'], [我方, 敌, '我方']];
        for (var q = 0; q < 序.length; q++) {
          var a = 序[q][0], b = 序[q][1];
          if (a.生命 <= 0 || b.生命 <= 0) continue;
          var 率 = 命中率((数(a.总评) - 数(b.总评)));
          if (rng() * 100 < 率) {
            var 伤 = Math.max(1, Math.round(数(a.攻击) - 数(b.防御)));
            b.生命 = Math.max(0, b.生命 - 伤);
            if (b === 我方) 我方.有效值 = Math.max(0, 我方.有效值 - Math.round(伤 / Math.max(1, 我方.上限) * 100));
          }
        }
      }
      var 胜 = 我方.生命 <= 0 && 敌.生命 <= 0 ? '同归' : 敌.生命 <= 0 ? '我方' : 我方.生命 <= 0 ? '对方' : '未决';
      var 果 = 胜;
      if (胜 === '我方' || 胜 === '对方') 果 = 胜 + (回 <= 3 ? '·碾压' : 回 <= 8 ? '·常规' : '·苦战');
      else if (胜 === '未决') 果 = '僵持（打满上限，双方都没倒）';
      var 档f = function (剩, 上) { var p = 上 <= 0 ? 0 : 剩 / 上 * 100; return p <= 0 ? '倒下' : p < 20 ? '濒死' : p < 50 ? '重伤' : p < 80 ? '轻伤' : '安然'; };
      sd.局面.骰子种子 = s;
      sd.局面.战斗结果 = {
        结果: 果, 回合数: 回,
        我方状态: 档f(我方.生命, 我方.上限) + '（剩 ' + Math.round(我方.生命) + '/' + 我方.上限 + '）',
        对方状态: 档f(敌.生命, 敌.上限) + '（剩 ' + Math.round(敌.生命) + '/' + 敌.上限 + '）',
        不可逆: (100 - 我方.有效值) > 0 ? ['我方受伤 ' + Math.round(100 - 我方.有效值) + '%'] : [],
        写法约束: [果.indexOf('碾压') >= 0 ? '快而不费力，过程短' : (果.indexOf('苦战') >= 0 ? '必须写出耗与险' : '')].filter(Boolean),
      };
      sd.身体 = sd.身体 || {};
      sd.身体.生命当前 = Math.max(0, 我方.生命);
      sd.身体.生命有效 = Math.max(0, 我方.有效值);
    });
  }

  function 发指令(动作, 文本) {
    var 局 = 状态.局面 || {}, NS = 状态.NSFW || {}, H = 状态.她 || {};
    var 现 = 夹(数(H.反抗值, 100), 0, 100);
    var 等级表 = { 微: [3, 5, 90], 中: [10, 15, 60], 强: [25, 35, 30], 极: [50, 70, 10] };
    写(function (sd) {
      sd.局面 = sd.局面 || {}; sd.她 = sd.她 || {};
      var s = 数(sd.局面.骰子种子, 20260916);
      var r1 = (1664525 * s + 1013904223) % 4294967296;
      var r2 = (1664525 * r1 + 1013904223) % 4294967296;
      var 反抗 = 夹(数(sd.她.反抗值, 100), 0, 100);
      if (动作 === 'watch') {
        sd.局面.玩家拒绝 = '';
        sd.局面.判定结果 = { 选项: '', 等级: '看着', 消耗: 0, 结果: '看着', 效果倍数: 1, 档位: '看着' };
        sd.局面.当前选项 = {}; sd.局面.她的倾向 = '';
      } else if (动作 === 'custom') {
        var 耗 = 50 + Math.floor(r1 / 4294967296 * 21);
        if (反抗 < 50) { alert('反抗值不够（要 50，手上 ' + Math.round(反抗) + '）'); return; }
        sd.她.反抗值 = Math.max(0, 反抗 - 耗);
        sd.局面.玩家拒绝 = '自定义';
        sd.局面.判定结果 = { 选项: 文本, 等级: '自定义', 消耗: 耗, 结果: '自定义', 效果倍数: 1, 档位: '自定义' };
        sd.局面.当前选项 = {}; sd.局面.她的倾向 = '';
      } else {
        if (!选中) { alert('先点一条你要拒的'); return; }
        var o = (sd.局面.当前选项 || {})[选中] || {};
        var L = 等级表[o.等级] || 等级表['中'];
        var 耗2 = L[0] + Math.floor(r1 / 4294967296 * (L[1] - L[0] + 1));
        if (反抗 < 耗2) { alert('反抗值不够（这条要 ' + 耗2 + '，手上 ' + Math.round(反抗) + '）'); return; }
        var 兴 = 数((sd.NSFW || {}).兴奋度);
        var 惩 = { 新手: 0, 上手: .1, 沉浸: .2, 狂热: .3, 收官: .4 }[sd.她.熟练度] || 0;
        var S = 夹(L[2] * (1 + 兴 / 100 * .5) * (1 - 惩), 1, 95);
        var 掷 = r2 / 4294967296 * 100, 成 = 掷 < S;
        sd.她.反抗值 = Math.max(0, 反抗 - 耗2);
        sd.局面.玩家拒绝 = String(选中);
        sd.局面.判定结果 = { 选项: o.文本 || '', 等级: o.等级 || '中', 消耗: 耗2, 成功率: Math.round(S), 掷值: Math.round(掷 * 100) / 100,
          结果: 成 ? '顶住了' : '没顶住', 档位: 成 ? '成功' : '失败', 效果倍数: 成 ? 1 : 1 };
        sd.局面.当前选项 = {}; sd.局面.她的倾向 = '';
      }
      sd.局面.骰子种子 = r2;
    });
  }

  /* ── 出招层（在总览页顶部）── */
  function 画出招() {
    var 局 = 状态.局面 || {};
    var 反 = 数((状态.她 || {}).反抗值);
    var 选 = 局.当前选项 || {};
    var 键s = Object.keys(选).sort(function (a, b) { return Number(a) - Number(b); });
    if (!键s.length) return '';
    var 倾 = String(局.她的倾向 || '');
    var H = '<div class="yx-r"><div class="yx-c yx-w">'
      + '<div class="yx-ttl">本轮选项 <span class="g">' + (倾 ? ('她的选择：第 ' + E(倾) + ' 条') : '还没点') + '</span></div>'
      + '<div class="yx-opts">';
    键s.forEach(function (k) {
      var o = 选[k] || {};
      H += '<div class="yx-op L' + E(o.等级 || '中') + (选中 === k ? ' sel' : '') + '" data-k="' + E(k) + '">'
        + '<div class="r1"><span class="no">' + E(k) + '</span><span class="tx">' + E(o.文本 || '') + '</span>'
        + '<span class="lv">' + E(o.等级 || '') + '</span></div>'
        + (o.感觉 ? '<div class="feel">' + E(o.感觉) + '</div>' : '') + '</div>';
    });
    /* ★ 2026-09-17 照同级生2 改：底部只剩三个，与我自创的「完成，进下一楼」「先推演」无关。
       同级生的原样（dist/nanpa2-ui/index.html）：
         data-fork="watch">眼睁睁看着
         data-fork="reject" (+反抗不够时 disabled title="反抗值不够")>拒绝
         data-fork="custom">自己来
       ★ 三个都走同一条推进链路（写变量 → 送进输入框 → /send → /trigger）。 */
    H += '</div><div class="yx-fork">'
      + '<button class="yx-btn ig" data-f="watch">眼睁睁看着</button>'
      + '<button class="yx-btn dn" data-f="reject"' + (反 < 5 ? ' disabled title="反抗值不够"' : '') + '>拒绝</button>'
      + '<button class="yx-btn pu" data-f="custom">自己来</button></div>'
      + '<div class="yx-aista" id="yx-aista"></div>'
      + '<div class="yx-cx" id="yx-cx"><div class="yx-nt">不按她摆的来，写一件你想做的事。</div>'
      + '<textarea id="yx-cxt" placeholder="例：把她按在墙上，等她先开口"></textarea>'
      + '<div class="yx-ln" style="margin-top:6px"><span class="yx-nt">消耗 50~70 反抗值</span>'
      + '<span><button class="yx-btn" id="yx-cxc" style="flex:0">算了</button> '
      + '<button class="yx-btn pu" id="yx-cxo" style="flex:0">就这么做</button></span></div></div>'
      + '<div class="yx-nt">看着＝不干预，反抗值照涨；拒绝＝花反抗值拦住她正要点的那个（失败了也照扣）；自定义＝照自己的想法做一次。</div>'
      + '</div></div>';
    return H;
  }
  /* ★ 2026-09-17 加：把一段文字送进酒馆输入框，再发送，再触发下一楼。
     照同级生2 的做法（三条 slash 命令）：
       /setinput <文本>  → 内容进输入框（玩家看得见、也能改）
       /send             → 发送
       /trigger          → 触发生成下一楼
     为什么要分三步：只填输入框不发送 = 玩家还得自己按一下；
                    直接 generate 会绕开输入框，玩家看不到自己"选了什么"。 */
  async function 送进输入框(文本) {
    var 标 = document.getElementById('yx-aista');
    function 说(话, 类) { if (标) { 标.className = 'yx-aista ' + (类 || 'wn'); 标.textContent = 话; } }
    // 发完把选项都禁掉，防重复点（照同级生）
    function 停手() {
      [].forEach.call(document.querySelectorAll('.yx-op'), function (x) {
        x.style.pointerEvents = 'none'; x.style.opacity = '.5';
      });
      [].forEach.call(document.querySelectorAll('.yx-btn[data-f]'), function (x) { x.disabled = true; });
    }
    var 只在面板 = typeof triggerSlash !== 'function';
    if (只在面板) {
      var ta0 = document.querySelector('#send_textarea');
      if (ta0) { ta0.value = 文本; ta0.dispatchEvent(new Event('input', { bubbles: true })); }
      说('已填进输入框（本地预览，没有发送通道）：' + 文本, 'ok');
      return;
    }
    try {
      // ① 内容进输入框（玩家看得见，也能改）
      说('① 正在写进输入框…');
      await triggerSlash('/setinput ' + JSON.stringify(文本));
      // ② 停一下，让他看清
      await new Promise(function (r) { setTimeout(r, 260); });
      // ③ ★ 带内容发送（★ 不带参数会发空值 —— 同级生踩过这个坑）
      说('② 正在发送…');
      await triggerSlash('/send ' + JSON.stringify(文本));
      // ④ 触发生成下一楼
      说('③ 正在等她接这一层…', 'on');
      await triggerSlash('/trigger');
      说('✅ 已送出去，下一楼是她的回应。', 'ok');
      停手();
    } catch (e) {
      说('送出去失败了：' + (e && e.message ? e.message : e) + '　（内容可能已经填在输入框里，可以手动按发送）');
    }
  }

  /* ★ 送进输入框的是【玩家自己会说的话】，不是系统指令。
     为什么（2026-09-17 照同级生2 改）：
       同级生送的是「（我不拦。看她点哪条。）」这种一句白话。
       我原来写的是 200 字系统指令（"请按这一条演绎，四段结构：…输出 <UpdateVariable>…"）——
       ★ 那些要求本来就写在世界书里（交互循环 / 变量输出格式），**不必也不该塞进输入框**：
         输入框里的东西是"玩家说的话"，让 AI 从世界书里知道该怎么写。
     顺带：输入框里越短，玩家越愿意在发送前改两个字 —— 那也是玩法的一部分。 */
  function 组装这一层(选) {
    if (!选) return '（这一层我不拦，看她自己挑哪条。）';
    var o = ((状态.局面 || {}).当前选项 || {})[选] || {};
    var 文本 = String(o.文本 || '');
    return 文本 ? ('（我选第 ' + 选 + ' 条：' + 文本 + '。）') : ('（我选第 ' + 选 + ' 条。）');
  }

  function 绑出招() {
    [].forEach.call(document.querySelectorAll('.yx-op'), function (el) {
      el.addEventListener('click', function () {
        选中 = el.getAttribute('data-k');
        [].forEach.call(document.querySelectorAll('.yx-op'), function (x) { x.classList.remove('sel'); });
        el.classList.add('sel');
      });
    });
    var cx = document.getElementById('yx-cx');
    /* ★ 2026-09-17 照同级生2 改：三个 fork 全部走同一条推进链路
         「眼睁睁看着 / 拒绝 / 自己来」都不会直接 generate ——
         而是先把一句玩家视角的话写进输入框、发送、再触发生成。
       同级生的原样（dist/nanpa2-ui/index.html）：
         watch  → 写 局面.玩家拒绝='' + 判定结果，报给 AI 的话是「（我不拦。看她点哪条。）」
         reject → 扣反抗值，报给 AI 的话是「（我拦住她点的第 N 条。）」
         custom → 扣反抗值，报给 AI 的话是「（我不按她摆的来。我要<他写的那句>。）」
       ★ 原来我把 custom 接给了 发指令()（那是另一套东西，不往输入框送），
         所以玩家输完自定义没反应 —— 这就是那个 bug 的根。 */
    [].forEach.call(document.querySelectorAll('.yx-btn[data-f]'), function (b) {
      if (b.dataset && b.dataset.绑了) return;      // ★ 防重复绑定（面板每次重绘都会重新调 绑出招）
      if (b.dataset) b.dataset.绑了 = '1';
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-f');
        if (f === 'reject' && b.disabled) return;
        if (f === 'custom') { if (cx) cx.classList.toggle('on'); return; }   // 先展开输入框
        到她那一层(f, '');
      });
    });
    var cxo = document.getElementById('yx-cxo'), cxc = document.getElementById('yx-cxc');
    if (cxo) cxo.addEventListener('click', function () {
      var v = (document.getElementById('yx-cxt').value || '').trim();
      if (!v) return;
      if (cx) cx.classList.remove('on');
      document.getElementById('yx-cxt').value = '';
      到她那一层('custom', v);
    });
    if (cxc) cxc.addEventListener('click', function () { cx.classList.remove('on'); });
  }

  /* ★ 走完一个 fork：算变量 → 送进输入框 → 发送 → 触发生成下一楼
     对应同级生的 写(变化, 结果类, 文案, 报给AI)。 */
  async function 到她那一层(f, 自定义文本) {
    var 局 = 状态.局面 || {};
    var 倾 = String(局.她的倾向 || '');
    var o = (局.当前选项 || {})[选中] || {};
    var 等级 = String(o.等级 || '中');
    var 表 = { 微: [3, 5], 中: [10, 15], 强: [25, 35], 极: [50, 55] };
    var 耗 = 表[等级] || 表.中;
    var 反抗 = 数((状态.她 || {}).反抗值);

    if (f === 'watch') {
      await 写(function (sd) {
        sd.局面 = sd.局面 || {};
        sd.局面.玩家拒绝 = '';
        sd.局面.判定结果 = { 选项: 选中 || '', 等级: 等级, 消耗: 0, 结果: '看着', 效果倍数: 1 };
      });
      return 送进输入框('（我不拦。看她点哪条。）');
    }

    if (f === 'reject') {
      if (反抗 < 5) { 提示AI('反抗值不够，拦不住。'); return; }
      var 真耗 = 反抗 - (耗[0] + Math.floor(Math.random() * (耗[1] - 耗[0] + 1)));
      await 写(function (sd) {
        sd.她 = sd.她 || {};
        sd.她.反抗值 = Math.max(0, 真耗);
        sd.局面 = sd.局面 || {};
        sd.局面.玩家拒绝 = 选中 || '';
        sd.局面.判定结果 = { 选项: 选中 || '', 等级: 等级, 消耗: 反抗 - Math.max(0, 真耗), 结果: '拒绝', 效果倍数: 1 };
      });
      return 送进输入框('（我拦住她点的第 ' + (选中 || '?') + ' 条。）');
    }

    // custom：自己来
    if (反抗 < 5) { 提示AI('反抗值不够，做不了。'); return; }
    var 耗2 = 50 + Math.floor(Math.random() * 21);
    await 写(function (sd) {
      sd.她 = sd.她 || {};
      sd.她.反抗值 = Math.max(0, 反抗 - 耗2);
      sd.局面 = sd.局面 || {};
      sd.局面.玩家拒绝 = '自定义';
      sd.局面.判定结果 = { 选项: 自定义文本, 等级: '自定义', 消耗: 耗2, 结果: '自定义', 效果倍数: 1 };
    });
    return 送进输入框('（我不按她摆的来。我要' + 自定义文本 + '。）');
  }

  /* ════════════ 主渲染 ════════════ */
  function 画() {
   try { 画内(); } catch (__e) {
    体.innerHTML = '<div class="yx-r"><div class="yx-c yx-w"><div class="yx-ttl">这一页渲染出错</div>'
      + '<div class="yx-nt w">' + E(String(__e && __e.message || __e)) + "</div>"
      + '<div class="yx-nt">' + E(String(__e && __e.stack || "").split("\n").slice(0,4).join("　")) + "</div></div></div>";
    if (window.console) console.error(__e);
   }
  }
  function 画内() {
    画四数();
    var H = 画出招();
    if (页 === 'overview') H += 画总览();
    else if (页 === 'skills') H += 画技能();
    else if (页 === 'items') H += 画行囊();
    else if (页 === 'tasks') H += 画活计();
    else if (页 === 'people') H += 画人物();
    else if (页 === 'world') H += 画世界();
    else if (页 === 'map') { 体.innerHTML = 画舆图(); 绑舆图(); return; }
    else if (页 === 'body') H += 画身体();
    else if (页 === 'dan') { 体.innerHTML = 画丹房(); 绑丹房(); return; }
    else if (页 === 'fight') { 体.innerHTML = 画打斗(); 绑打斗(); return; }
    else if (页 === 'rank') { 体.innerHTML = 画英雄榜(); 绑英雄榜(); return; }
    else if (页 === 'help') H = 画说明();
    体.innerHTML = H;
    绑出招();
    // 请教按钮
    [].forEach.call(document.querySelectorAll('.yx-plus'), function (b) {
      b.addEventListener('click', function () { 请教(b.getAttribute('data-sk')); });
    });
    [].forEach.call(document.querySelectorAll('.yx-plus[data-sk5]'), function (b) {
      b.addEventListener('click', function () { 请教(b.getAttribute('data-sk5'), 5); });
    });
    // 动手按钮
    [].forEach.call(document.querySelectorAll('.yx-foe'), function (b) {
      b.addEventListener('click', function () { 动手(b.getAttribute('data-n')); });
    });

    // ── <user> 侧的动作绑定（装备/穿着/任务/请教/强化/动手）──
    [].forEach.call(document.querySelectorAll(".yx-cell"), function (c) {
      c.addEventListener("click", function () { 开物品(数(c.getAttribute("data-i")), c.getAttribute("data-n")); });
    });
    [].forEach.call(document.querySelectorAll(".yx-slot"), function (c) {
      c.addEventListener("click", function () { 开部位(c.getAttribute("data-p")); });
    });
    [].forEach.call(document.querySelectorAll("[data-sk]"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 请教(b.getAttribute("data-sk")); });
    });
    [].forEach.call(document.querySelectorAll("[data-sk5]"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 请教(b.getAttribute("data-sk5"), 5); });
    });
    [].forEach.call(document.querySelectorAll("[data-skenh]"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); 关层(); 强化技能(b.getAttribute("data-skenh")); });
    });
    [].forEach.call(document.querySelectorAll("[data-tadv]"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation(); var k = b.getAttribute("data-tadv");
        写(function (sd) { sd.任务 = sd.任务 || {}; var r = sd.任务[k] || {}; r.进度 = 数(r.进度) + 1;
          if (数(r.需要) > 0 && r.进度 >= 数(r.需要)) r.状态 = "完成"; sd.任务[k] = r; });
      });
    });
    [].forEach.call(document.querySelectorAll("[data-tgive]"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation(); var k = b.getAttribute("data-tgive");
        写(function (sd) { sd.任务 = sd.任务 || {}; if (sd.任务[k]) sd.任务[k].状态 = "失败"; });
      });
    });
    [].forEach.call(document.querySelectorAll("[data-foe]"), function (b) {
      b.addEventListener("click", function () { 动手(b.getAttribute("data-foe")); });
    });

    // ── 折叠展开 ──
    [].forEach.call(document.querySelectorAll(".yx-fl > .hd"), function (h) {
      h.addEventListener("click", function () { h.parentNode.classList.toggle("on"); });
    });

    // ── 技能树节点 ──
    [].forEach.call(document.querySelectorAll(".yx-tn"), function (c) {
      c.addEventListener("click", function () { 开技能(c.getAttribute("data-tn")); });
    });

    // ── 技能格 ──
    [].forEach.call(document.querySelectorAll(".yx-sk"), function (c) {
      c.addEventListener("click", function () { 开技能(c.getAttribute("data-skk")); });
    });

    // ── 物品格 / 装备槽 ──
    // （此处原有的按钮绑定已按职责边界移除）

    // 物品 / 部位 / 任务 / 兴奋度 / 周期
    [].forEach.call(document.querySelectorAll(".yx-use"), function (c) {
      c.addEventListener("click", function () { 开物品(数(c.getAttribute("data-i")), c.getAttribute("data-n")); });
    });
    [].forEach.call(document.querySelectorAll(".yx-cloth"), function (c) {
      c.addEventListener("click", function () { 开部位(c.getAttribute("data-p")); });
    });
    [].forEach.call(document.querySelectorAll(".yx-task"), function (c) {
      c.addEventListener("click", function () { 开任务(c.getAttribute("data-t")); });
    });
    // （此处原有的按钮绑定已按职责边界移除）

    // 人物页：点名字看档案
    [].forEach.call(document.querySelectorAll('.yx-ch[title]'), function (c) {
      c.addEventListener('click', function () {
        var n = c.textContent.trim();
        var w = D.女角[n] || {};
        var 关 = (状态.关系 || {})[n] || {};
        var rows = Object.keys(w).map(function (k) {
          var v = w[k];
          if (typeof v === 'object') v = JSON.stringify(v).slice(0, 200);
          return 行(k, String(v).slice(0, 120));
        }).join('');
        开层(n, rows + '<div class="yx-ttl" style="margin-top:12px">与你的关系</div>'
          + 行('阶段', 关.关系阶段 || '陌生') + 行('好感', 数(关.好感度)));
      });
    });
  }

  async function 拉() {
    try {
      if (typeof TavernHelper === 'undefined' || !TavernHelper.getVariables) return;
      var v = await TavernHelper.getVariables({ type: 'message', message_id: 'latest' });
      楼 = (v && v.message_id != null) ? v.message_id : -1;
      状态 = 归一((v && v.stat_data) || {});
      画();
    } catch (e) { }
  }

  画页签();
  拉();
  try {
    if (typeof eventOn === 'function') {
      eventOn('message_updated', 拉);
      eventOn('message_rendered', 拉);
    }
  } catch (e) { }
})();
