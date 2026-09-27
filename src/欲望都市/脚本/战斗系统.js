// 欲望都市 · 战斗系统辅助脚本（TH API 版，修复 Mvu 不可用问题）
// 职责：每日排班生成、战斗状态清理、俘虏触发（配合 MVU 变量框架）
// 依赖：TH getVariables/replaceVariables（脚本 iframe 内可用，Mvu 全局不可靠）

$(async () => {
  // Mvu 全局在脚本 iframe 不可用（诊断确认），1s 超时兜底，绝不阻塞
  try { await Promise.race([waitGlobalInitialized('Mvu'), new Promise(function (r) { setTimeout(r, 1000); })]); } catch (e) { }

  let busy = false;
  const run = (fn) => {
    if (busy) return;
    busy = true;
    try { fn(); } catch (e) { console.error('[战斗系统]', e); }
    setTimeout(() => { busy = false; }, 150);
  };

  // 优先取 Mvu 全局（主页面/楼层 iframe 可访问，读 variables[swipe_id] 层）
  const pickMvu = () => {
    try {
      if (typeof Mvu !== 'undefined' && Mvu && typeof Mvu.getMvuData === 'function') return Mvu;
      for (const w of [window.parent, window.top]) {
        try { if (w && w.Mvu && typeof w.Mvu.getMvuData === 'function') return w.Mvu; } catch (e) {}
      }
    } catch (e) {}
    return null;
  };

  // 读 stat_data（兼容 {stat_data:{...}} 与直接内容两种结构）
  const readStat = () => {
    try {
      const Mvu2 = pickMvu();
      if (Mvu2) {
        const md = Mvu2.getMvuData({ type: 'message', message_id: 'latest' });
        const sd = md && md.stat_data;
        if (sd && typeof sd === 'object' && (sd.排班 !== undefined || sd.玩家 !== undefined)) return sd;
      }
    } catch (e) { console.error('[战斗系统] Mvu 读失败', e); }
    try {
      if (typeof getVariables !== 'function') return null;
      const vars = getVariables({ type: 'message', message_id: 'latest' });
      if (vars && typeof vars === 'object') {
        if (vars.stat_data && typeof vars.stat_data === 'object' && (vars.stat_data.排班 !== undefined || vars.stat_data.玩家 !== undefined)) {
          return vars.stat_data;
        }
        if (vars.排班 !== undefined || vars.玩家 !== undefined || vars.时间 !== undefined) {
          return vars;
        }
      }
    } catch (e) { console.error('[战斗系统] 读变量失败', e); }
    return null;
  };

  // 写回 stat_data：必须「读完整变量表 → 更新 stat_data → 写回完整表」。
  // 依据 TH 官方文档：replaceVariables 是【完全替换变量表】。只传 {stat_data} 会把楼层变量表里的
  // schema / initialized_lorebooks / display_data 全部抹掉 → MVU 找不到"有 stat_data 且有 schema"
  // 的完整楼层 → 每次 GENERATION_STARTED/MESSAGE_SENT 都判定需要初始化 → 反复初始化 + 等级重置。
  const writeStat = (stat) => {
    try {
      const Mvu2 = pickMvu();
      if (Mvu2 && typeof Mvu2.getMvuData === 'function' && typeof Mvu2.replaceMvuData === 'function') {
        const opt = { type: 'message', message_id: 'latest' };
        const full = Mvu2.getMvuData(opt);
        if (full && typeof full === 'object') {
          // 兼容裸 stat_data 结构（getMvuData 可能直接返回 stat_data 本身）
          if (full.stat_data === undefined && (full.排班 !== undefined || full.玩家 !== undefined || full.女性角色 !== undefined || full.时间 !== undefined)) {
            full = { stat_data: full };
          }
          full.stat_data = stat; // 保留 schema/initialized_lorebooks 等键
          Mvu2.replaceMvuData(full, opt);
          return;
        }
      }
    } catch (e) { console.error('[战斗系统] Mvu 写回失败', e); }
    try {
      // 兜底：TH getVariables → 改 stat_data → replaceVariables 完整表（官方推荐方式）
      if (typeof getVariables === 'function' && typeof replaceVariables === 'function') {
        let vars = getVariables({ type: 'message', message_id: 'latest' });
        if (vars && typeof vars === 'object') {
          if (vars.stat_data === undefined && (vars.排班 !== undefined || vars.玩家 !== undefined || vars.女性角色 !== undefined || vars.时间 !== undefined)) {
            vars = { stat_data: vars };
          }
          vars.stat_data = stat;
          replaceVariables(vars, { type: 'message', message_id: 'latest' });
          return;
        }
      }
      if (typeof replaceVariables === 'function') {
        replaceVariables({ stat_data: stat }, { type: 'message', message_id: 'latest' });
      }
    } catch (e) { console.error('[战斗系统] 写回失败', e); }
  };

  // 从 stat_data 角色表按身份分组
  const groupByRole = (stat) => {
    const roles = _.get(stat, '女性角色', {});
    const out = { 妈妈: [], 老师: [], 学生: [] };
    // 内置分类表兜底：身份字段可能被 AI 的 add 覆盖丢失
    const RMAP={丽莎·伊万诺娃:'学生',何玉兰:'妈妈',何雨珊:'学生',刘晶晶:'老师',叶春梅:'妈妈',叶诗涵:'学生',周桂香:'妈妈',周语桐:'学生',唐婉清:'老师',娜塔莎·伊万诺娃:'妈妈',宋丽华:'妈妈',宋佳凝:'学生',宋雅琴:'妈妈',张慧娟:'老师',李红梅:'老师',林汐瑶:'学生',林秀英:'妈妈',沈若兰:'老师',王朵朵:'学生',王金凤:'妈妈',白秋月:'妈妈',白若薇:'学生',石小婉:'学生',石巧云:'妈妈',秦可心:'学生',秦淑珍:'妈妈',艾米丽·陈:'老师',苏婉如:'妈妈',苏晚晴:'学生',赵雪晴:'老师',金顺姬:'妈妈',陆芷晴:'学生',陆青霞:'妈妈',陈淑芬:'妈妈',陈雪梨:'学生',韩美娜:'学生',黎嘉欣:'学生',黎桂芳:'妈妈'};
    for (const [name, c] of Object.entries(roles)) {
      const id = String(c.身份 || '');
      let cls = null;
      if (id.includes('妈妈') || id.includes('陪读')) cls='妈妈';
      else if (id.includes('老师') || id.includes('教师') || id.includes('校医') || id.includes('班主任')) cls='老师';
      else if (id.includes('学生')) cls='学生';
      if (!cls && RMAP[name]) cls = RMAP[name];
      if (!cls) cls = '学生';
      out[cls].push(name);
    }
    return out;
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // 生成今日场次（24 小时全覆盖 4 时段，与排班规则一致）：
  //   上午 = 陪读妈妈 + 没课老师（上课时间在校者不可用）
  //   下午场 = 放学后全体可用（妈妈 + 没课老师 + 放学学生）
  //   晚场 = 学生为主（晚自习结束）+ 在家妈妈
  //   深夜 = 全体 + 俘虏优先
  const ensureSchedule = (stat) => {
    const schedule = _.get(stat, '排班.今日场次');
    if (schedule && typeof schedule === 'object' && Object.keys(schedule).length > 0) return false;
    const g = groupByRole(stat);
    if (g.妈妈.length + g.学生.length === 0) return false;
    const morning = shuffle(g.妈妈.slice(0, Math.max(1, Math.min(3, g.妈妈.length)))); // 上午=妈妈（可混没课老师）
    const afternoon = shuffle([...g.妈妈, ...g.老师].slice(0, Math.max(1, g.妈妈.length + Math.min(2, g.老师.length))));
    const evening = shuffle([...g.学生, ...g.妈妈].slice(0, Math.max(1, g.学生.length + Math.min(2, g.妈妈.length))));
    const captives = Object.entries(_.get(stat, '女性角色', {})).filter(([, c]) => c.是否俘虏).map(([n]) => n);
    const night = shuffle([...captives, ...g.妈妈].slice(0, Math.max(1, captives.length + Math.min(1, g.妈妈.length))));
    _.set(stat, '排班.今日场次', {
      上午场: { 参与者: morning.join('、') || '（暂无）', 结果: '待定', 是否参战: false },
      下午场: { 参与者: afternoon.join('、') || '（暂无）', 结果: '待定', 是否参战: false },
      晚场: { 参与者: evening.join('、') || '（暂无）', 结果: '待定', 是否参战: false },
      深夜: { 参与者: night.join('、') || '（暂无）', 结果: '待定', 是否参战: false },
    });
    return true;
  };

  // 俘虏触发：缴械值 >= 100 且未标记俘虏 → 标记并写入俘虏日期
  const checkCaptives = (stat) => {
    const roles = _.get(stat, '女性角色', {});
    const today = _.get(stat, '时间.日期', '');
    let changed = false;
    for (const [name, c] of Object.entries(roles)) {
      if (Number(c.缴械值) >= 100 && !c.是否俘虏) {
        c.是否俘虏 = true;
        c.俘虏日期 = c.俘虏日期 || today || '今日';
        c.心理状态 = { ...(c.心理状态 || {}), 精神状态: '依恋', 欲望度: 100, 羞耻感: Math.max(0, Number(c.羞耻感) - 20) };
        changed = true;
        console.info(`[战斗系统] ${name} 已被俘虏`);
      }
    }
    return changed;
  };

  // 战斗结束清理：状态=已结算且无进行中目标时，清空当前战斗目标
  const clearBattleIfDone = (stat) => {
    const state = _.get(stat, '排班.战斗状态', '未开始');
    const target = _.get(stat, '排班.当前战斗目标', '');
    if (target && state !== '进行中') {
      _.set(stat, '排班.当前战斗目标', '');
      _.set(stat, '排班.战斗状态', '未开始');
    }
  };

  // 维护流程：读 → 排班/俘虏/清理 → 写回
  const maintain = () => {
    const stat = readStat();
    if (!stat) return;
    ensureSchedule(stat);
    checkCaptives(stat);
    clearBattleIfDone(stat);
    writeStat(stat);
  };

  // ★状态栏中继（skill 坑#27：常驻脚本捕获 → 全局变量中继 → 界面纯读渲染）
  // 状态栏是正则内联 HTML，消息环境拿不到 TH 的 getVariables/Mvu/eventOn → 只能读到渲染时固化的 stat-embed 宏快照。
  // 本脚本是 TH 脚本环境（eventOn/getMvuData 可靠）→ 事件后把最新 stat_data 写到主页面全局，
  // 状态栏在主页面直接读 window.__ydsLatestStat（跨 iframe 全局，不依赖 TH API 注入），数据必然最新。
  const relayLatestStat = () => {
    try {
      const stat2 = readStat();
      if (!stat2) return;
      const snap = { stat_data: stat2, ts: Date.now() };
      try { if (window.parent && window.parent !== window) window.parent.__ydsLatestStat = snap; } catch (e) {}
      try { if (window.top && window.top !== window && window.top !== window.parent) window.top.__ydsLatestStat = snap; } catch (e) {}
      try { window.__ydsLatestStat = snap; } catch (e) {}
    } catch (e) { console.error('[战斗系统] 中继失败', e); }
  };
  const run2 = (fn) => { run(fn); try { relayLatestStat(); } catch (e) {} };

  // 事件驱动：tavern_events 枚举优先（STDB C1）+ MVU 事件本地常量（Mvu 全局不可用，禁止裸手写字符串）
  var YDS_MVU_EV = { VARIABLE_INITIALIZED: 'mag_variable_initiailized', VARIABLE_UPDATE_ENDED: 'mag_variable_update_ended' };
  try {
    if (typeof eventOn === 'function') {
      var te = typeof tavern_events !== 'undefined' ? tavern_events : null;
      eventOn(YDS_MVU_EV.VARIABLE_INITIALIZED, () => run2(maintain));
      eventOn(YDS_MVU_EV.VARIABLE_UPDATE_ENDED, () => run2(maintain));
      eventOn(te ? te.GENERATION_ENDED : 'generation_ended', () => run2(maintain));
      eventOn(te ? te.MESSAGE_EDITED : 'message_edited', () => run2(maintain));
    }
  } catch (e) { console.error('[战斗系统] 事件注册失败', e); }

  // 首次运行（进入角色/聊天加载时）
  run2(maintain);
  console.info('[战斗系统] 已就绪（TH API 版）');
});
