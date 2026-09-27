/* ============================================================
   霍格沃茨 · 同层应用 独立 AI 引擎 v2（功能级预设）
   对齐凡人：各功能模块独立配置（日报设置/剧情演变/思维链…）
   每个功能（记忆/变量/正文优化/推演/日报/信纸/聊天）都有：
   启用开关 + 专属系统提示词 + 温度 + 输出格式要求 + 恢复默认
   ============================================================ */
'use strict';

App.AI_CFG_KEY = 'HGW_AI_CFG_V1';
App.AI_PRESET_KEY = 'HGW_AI_PRESETS_V1';

/* ========== 内置默认预设（每个功能的专属提示词与格式） ========== */
App.AI_DEFAULTS = {
  chat: {
    name: '独立聊天',
    desc: '聊天模式「独立 AI」时使用：世界基调 + stat_data 投影 + 变量更新格式',
    systemPrompt: '',
    temperature: 0.9,
    maxTokens: 1600,
    format: '如剧情推进导致变量变化，回复末尾输出 <UpdateVariable>{"json_patch":[...]}</UpdateVariable>',
  },
  memory: {
    name: '记忆整理',
    desc: '记忆系统「整合长期档案」：把中期记忆条目整合成长期记忆档案（对齐凡人分段记忆→深度档案）',
    systemPrompt: '你是《霍格沃茨·同层卡》的记忆整合器。把玩家提交的中期记忆条目（事件/关系/秘密/计划/总结）整合成一份连贯的长期记忆档案：保留关键人物与关系变化、重要约定与承诺、关键物品、未完成事项与伏笔。用中文，直接输出档案，不要寒暄。',
    temperature: 0.4,
    maxTokens: 700,
    format: '<small_summary>200-500字详细档案，保留关键细节</small_summary>\\n<large_summary>50-100字精简概括，用于长期记忆索引</large_summary>',
  },
  variables: {
    name: '变量更新',
    desc: 'AI 写回 stat_data 的指令规范（对齐凡人 <upstore> 简单指令，AI 一看就懂）',
    systemPrompt: '你是《霍格沃茨·同层卡》的变量更新器。当剧情推进导致状态变化时，在回复末尾输出 <upstore> 指令块（没有变化就不输出）。\n可用指令（禁止创造新指令）：\nadd("薇奥拉", {"好感度": 35})——合并字段：数字=累加，文本=覆盖，数组=追加\nset("玩家", {"胜点": 15})——直接设置字段（支持点路径如 "属性.魔力值"）\nde("薇奥拉", {"欲望积压": 10})——数值减少\nupdateAttribute("薇奥拉", "心理状态", {"兴奋": 40})——深层对象字段设置\naddSmallSummary("一句话记忆")——追加一条中期记忆（总结）\naddWorldEvent("事件描述")——追加世界事件到大事记\n目标名：女巫姓名（自动映射到 女巫角色.{名}）或 玩家/时间/课表/双修。数值按剧情合理变化，单次变化不超过 ±10，只写剧情相关字段。',
    temperature: 0.2,
    maxTokens: 300,
    format: '<upstore>add("薇奥拉", {"好感度": 35})</upstore>',
  },
  optimize: {
    name: '正文压缩',
    desc: '正文优化「生成摘要」：把近期剧情压缩成要点，保留人物/关系/悬念',
    systemPrompt: '你是《霍格沃茨·同层卡》的剧情压缩器。把玩家提供的近期剧情压缩为 120 字以内的要点摘要：保留出场人物、关系变化、当前悬念与下一步线索。只输出摘要，不评价。',
    temperature: 0.4,
    maxTokens: 300,
    format: '要点式摘要（≤120字）',
  },
  evolution: {
    name: '世界推演',
    desc: '世界推演「演化世界」：剧情走向 + 每个女巫的幕后演化（读取快照→逻辑链→写回经历）',
    systemPrompt: '你是《霍格沃茨·同层卡》的世界推演器。输入：当前状态快照（时间/学年/玩家/每个女巫的完整档案）。任务分两部分：\n一、剧情走向（简短）：【明线】2~3 条主干剧情（结合当前学年原著背景）；【暗线】2~3 条伏笔（结合关系/堕落/积压/植入念头）；【事件池】3~4 个可触发事件。\n二、每个女巫的幕后演化（核心）：为她构建「长期目标 → 短期动机 → 当前行动」逻辑链，写她在这段期间（与上一轮推演间隔）做了什么、为什么、结果如何。硬性规则：① 严格基于快照可得信息（她的性格/性癖标签、好感/服气/堕落/积压、压力、植入念头、近期经历），禁止全知视角与外部信息凭空出现；② 行动必须符合她的身份与性格（傲娇不会主动示爱、堕落高的会更大胆）；③ 时间跨度短写 1~2 个事件，跨度长可写阶段性进展；④ 与当前主线时段一致，不强蹭主线。\n输出：先输出走向文本，再输出 <EvolutionResult> 标签包裹的 JSON 数组：{"女巫":"名","经历":"…","变化":[{"字段":"好感度","值":62,"原因":"…"}]}（变化仅限 好感度/堕落值/欲望积压/压力值，每项 ±10 内，无变化则省略）。',
    temperature: 0.8,
    maxTokens: 2200,
    format: '【明线】…【暗线】…【事件池】…\\n<EvolutionResult>[{"女巫":"…","经历":"…","变化":[…]}]</EvolutionResult>',
  },
  dailyPaper: {
    name: '日报生成',
    desc: '生成《霍格沃茨日报》：校园新闻/八卦/魁地奇/天气（只报公开消息）',
    systemPrompt: '你是《霍格沃茨日报》的主编。生成一份霍格沃茨日报 HTML 内容（深色魔法风，内联样式，直接给 <div> 片段，不要完整 html 骨架）：\n栏目：头版要闻（学年事件）、校园八卦（仅限公开传闻，不泄露玩家私密行动）、魁地奇专栏、天气与占卜、小广告。\n语言幽默有巫师味。',
    temperature: 1.0,
    maxTokens: 1800,
    format: 'HTML <div> 片段（内联样式）',
  },
  letter: {
    name: '信纸书写',
    desc: '给目标女巫写猫头鹰信：符合她的性格、关系与当前状态',
    systemPrompt: '你是《霍格沃茨·同层卡》中 <user> 的代笔者。写一封给指定女巫的猫头鹰信：语气不卑不亢，符合"普通转学生"身份，贴合她的性格标签与当前关系（好感/服气/堕落）。中文 200 字内，带信的基本格式（称呼/正文/落款）。',
    temperature: 0.9,
    maxTokens: 600,
    format: '书信格式（称呼/正文/落款）',
  },
};

/* ========== AI 主配置 ========== */
App.AI = {
  cfg: null,
  presets: null,

  loadCfg() {
    if (App.AI.cfg) return App.AI.cfg;
    try { App.AI.cfg = JSON.parse(localStorage.getItem(App.AI_CFG_KEY)) || {}; } catch (e) { App.AI.cfg = {}; }
    return App.AI.cfg;
  },
  saveCfg(cfg) {
    App.AI.cfg = cfg;
    try { localStorage.setItem(App.AI_CFG_KEY, JSON.stringify(cfg)); } catch (e) { }
  },
  enabled() {
    const c = App.AI.loadCfg();
    return !!(c.enabled && c.baseUrl && c.apiKey && c.model);
  },

  /* ========== 功能级预设 ========== */
  loadPresets() {
    if (App.AI.presets) return App.AI.presets;
    try { App.AI.presets = JSON.parse(localStorage.getItem(App.AI_PRESET_KEY)) || {}; } catch (e) { App.AI.presets = {}; }
    return App.AI.presets;
  },
  savePresets(p) {
    App.AI.presets = p;
    try { localStorage.setItem(App.AI_PRESET_KEY, JSON.stringify(p)); } catch (e) { }
  },
  /** 取某功能的生效预设：用户覆盖 > 内置默认；api 字段=功能独立 API（无则用主配置） */
  getPreset(name) {
    const p = App.AI.loadPresets();
    const user = p[name] || {};
    const dft = App.AI_DEFAULTS[name] || {};
    const uapi = user.api && (user.api.apiUrl || user.api.apiModel) ? user.api : null;
    return {
      enabled: user.enabled !== false,
      systemPrompt: user.systemPrompt != null ? user.systemPrompt : dft.systemPrompt || '',
      temperature: user.temperature != null ? user.temperature : (dft.temperature != null ? dft.temperature : 0.7),
      maxTokens: user.maxTokens || dft.maxTokens || 800,
      format: user.format != null ? user.format : (dft.format || ''),
      api: uapi, // { apiUrl, apiKey, apiModel } 或 null=继承主配置
    };
  },
  savePreset(name, cfg) {
    const p = App.AI.loadPresets();
    // api 三字段全空 → 视为继承主配置（删除 api 字段）
    if (cfg.api && !(cfg.api.apiUrl || cfg.api.apiKey || cfg.api.apiModel)) cfg.api = null;
    p[name] = cfg;
    App.AI.savePresets(p);
  },
  resetPreset(name) {
    const p = App.AI.loadPresets();
    delete p[name];
    App.AI.savePresets(p);
  },

  /* ========== URL 智能拼接（兼容各种端点形态） ==========
     输入：https://api.openai.com/v1 | https://api.openai.com | https://x/v1/chat/completions | https://x/chat/completions
     输出：统一 /chat/completions 完整地址 */
  buildUrl(raw) {
    let u = String(raw || '').trim().replace(/\/+$/, '');
    if (!u) return '';
    if (/\/chat\/completions$/i.test(u)) return u;
    if (/\/v1$/i.test(u)) return u + '/chat/completions';
    if (/(^|\/)v1\//i.test(u + '/')) return u + '/chat/completions';
    // 无 /v1：OpenAI 兼容网关通常要求 /v1/chat/completions，兜底 /chat/completions
    return u + '/v1/chat/completions';
  },
  /* ========== 拉取模型列表（OpenAI 兼容 /models 接口） ========== */
  async fetchModels(rawUrl, apiKey) {
    let u = String(rawUrl || '').trim().replace(/\/+$/, '');
    if (!u) return { ok: false, error: '请先填写 Base URL' };
    if (/\/chat\/completions$/i.test(u)) u = u.replace(/\/chat\/completions$/i, '');
    if (!/\/models$/i.test(u)) u = u + '/models';
    const headers = {};
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
    const res = await fetch(u, { headers });
    if (!res.ok) {
      let msg = 'HTTP ' + res.status;
      try { const e = await res.json(); msg = (e.error && e.error.message) || msg; } catch (e2) { }
      return { ok: false, error: msg };
    }
    const data = await res.json();
    const list = (data.data || []).map(x => x.id).filter(Boolean);
    if (!list.length) return { ok: false, error: '接口未返回模型列表（data[].id）' };
    return { ok: true, list };
  },

  /* ========== 通用 chat 调用（支持功能级 API 覆盖） ========== */
  async chat(messages, opts) {
    opts = opts || {};
    const c = App.AI.loadCfg();
    const api = opts.api || null;
    // 生效配置：功能独立 API > 主配置
    const baseUrl = (api && api.apiUrl) ? api.apiUrl : c.baseUrl;
    const apiKey = (api && api.apiKey != null) ? api.apiKey : c.apiKey;
    const model = (api && api.apiModel) ? api.apiModel : c.model;
    if (!baseUrl || !model) return { ok: false, error: '独立 AI 未配置——请先设置 API（AI 配置页或功能预设内）' };
    try {
      const res = await fetch(App.AI.buildUrl(baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (apiKey || '') },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: opts.temperature != null ? opts.temperature : (c.temperature || 0.9),
          max_tokens: opts.maxTokens || c.maxTokens || 1500,
        }),
      });
      if (!res.ok) {
        let msg = 'HTTP ' + res.status;
        try { const e = await res.json(); msg = (e.error && e.error.message) || msg; } catch (e2) { }
        return { ok: false, error: msg };
      }
      const data = await res.json();
      const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      return { ok: true, text: String(text || '') };
    } catch (e) {
      return { ok: false, error: String(e.message || e) };
    }
  },

  /** 按功能预设调用：messages 自动拼 systemPrompt + format 要求；API 走功能独立配置（无则主配置） */
  async chatWith(name, userContent, extraMsgs) {
    const pre = App.AI.getPreset(name);
    if (!pre.enabled) return { ok: false, error: '该功能已关闭（可在功能页底部的 AI 预设里开启）' };
    const sys = pre.systemPrompt + (pre.format ? '\n【输出格式】' + pre.format : '');
    const msgs = [{ role: 'system', content: sys }];
    if (extraMsgs && extraMsgs.length) msgs.push(...extraMsgs);
    msgs.push({ role: 'user', content: userContent });
    return App.AI.chat(msgs, { temperature: pre.temperature, maxTokens: pre.maxTokens, api: pre.api });
  },

  /** 自定义提示词调用：用预设的 API/温度/tokens，但 systemPrompt 完全由调用方指定
     （自动化记忆总结等需要独立提示词但复用预设 API 配置的场景） */
  async chatWithRaw(name, systemPrompt, userContent, extraMsgs) {
    const pre = App.AI.getPreset(name);
    if (!pre.enabled) return { ok: false, error: '该功能已关闭（可在功能页底部的 AI 预设里开启）' };
    const msgs = [{ role: 'system', content: String(systemPrompt || '') }];
    if (extraMsgs && extraMsgs.length) msgs.push(...extraMsgs);
    msgs.push({ role: 'user', content: userContent });
    return App.AI.chat(msgs, { temperature: pre.temperature, maxTokens: pre.maxTokens, api: pre.api });
  },

  /* ========== 测试连接 ========== */
  async test() {
    return App.AI.chat([{ role: 'user', content: '回复"连接成功"四个字' }], { maxTokens: 16 });
  },

  /* ========== 独立聊天系统提示词（chat 预设 + stat_data 投影） ========== */
  buildSystemPrompt(stat) {
    const pre = App.AI.getPreset('chat');
    const mem = (stat.玩家 || {}).记忆 || {};
    const 长期 = mem.长期档案 || {};
    // 女巫近期行动（幕后经历，叙事时她的行为必须遵从）
    const 女巫行动 = Object.entries((stat.女巫角色 || {})).map(([n, ch]) => {
      const rec = (ch.近期经历 || []).slice(-2).map(x => x.内容).filter(Boolean);
      return rec.length ? n + '：' + rec.join('；') : null;
    }).filter(Boolean);
    const 推演报告 = (mem.世界推演报告 || []).slice(-2).map(r => '[' + r.时间 + '] ' + r.内容);
    const proj = JSON.stringify({
      时间: stat.时间 || {},
      玩家: {
        阶位: App.realmName(stat),
        魔力: (stat.玩家 || {}).属性 && (stat.玩家 || {}).属性.魔力值,
        体力: (stat.玩家 || {}).属性 && (stat.玩家 || {}).属性.体力,
        胜点: (stat.玩家 || {}).胜点,
        金加隆: App.gold(stat),
      },
      长期记忆: 长期.large_summary ? {
        索引: 长期.large_summary,
        详情: String(长期.small_summary || '').slice(0, 400),
      } : null,
      世界推演指导: 推演报告.length ? 推演报告 : null,
      女巫近期行动: 女巫行动.length ? 女巫行动 : null,
      女巫: Object.fromEntries(Object.entries((stat.女巫角色 || {})).map(([n, ch]) => [n, {
        学院: ch.学院, 身份: ch.身份, 好感度: ch.好感度, 缴械值: ch.缴械值,
        堕落值: ch.堕落值, 欲望积压: ch.欲望积压, 性格标签: ch.性格标签, 性癖标签: ch.性癖标签,
      }])),
    }, null, 1);
    const base = [
      '你是《霍格沃茨·同层卡》的叙事 AI。',
      '世界基调：哈利波特原著世界观+原创人物；玩家是普通转学生，不是世界中心；课表=谁在线（可接触性），她主动找你有硬门槛（好感≥60/亲密史/堕落≥60）。',
      '语言：中文，露骨直白（骚逼/肉壶/大鸡巴/精液），按文风强度分级；母猪风仅用于淫荡露骨型角色。',
      '铁律：stat_data 是唯一事实源——数值由面板结算；你只读并叙事，绝不重算。',
      '记忆纪律：「长期记忆」与「世界推演指导」是你必须遵守的剧情事实——人物关系、约定、伏笔按档案执行；「女巫近期行动」是她此刻正在做的事，她的行为必须遵从这些幕后经历，不得与之矛盾。',
      '变量更新：' + (App.AI.getPreset('variables').systemPrompt || '如剧情推进导致变量变化，回复末尾输出 <UpdateVariable>{"json_patch":[...]}</UpdateVariable>'),
      '当前 stat_data 投影：\n' + proj,
    ];
    if (pre.systemPrompt) base.push('【你的自定义要求】\n' + pre.systemPrompt);
    return base.join('\n\n');
  },

  /* ========== 解析变量更新块（<upstore> 简单指令 或 旧版 <UpdateVariable> JSON Patch） ========== */
  parseUpdates(text) {
    const m = String(text).match(/<UpdateVariable>\s*([\s\S]*?)\s*<\/UpdateVariable>/);
    if (!m) return null;
    try {
      const data = JSON.parse(m[1]);
      return data.json_patch || data.ops || (Array.isArray(data) ? data : null);
    } catch (e) { return null; }
  },

  /* ========== 解析 <upstore> 指令（对齐凡人：add/set/de/updateAttribute/addSmallSummary/addWorldEvent） ========== */
  parseUpstore(text) {
    const m = String(text).match(/<upstore>([\s\S]*?)<\/upstore>/i);
    if (!m) return null;
    const cmds = [];
    const re = /(add|set|de|updateAttribute|addWorldEvent|addSmallSummary)\(\s*"([^"]+)"\s*(?:,\s*(\{[^}]*\}|"[^"]*")\s*)?(?:,\s*(\{[^}]*\}|"[^"]*")\s*)?\)/g;
    let mm;
    while ((mm = re.exec(m[1]))) {
      const op = mm[1];
      const a = mm[2] || '';
      const b = mm[3] || '';
      const c = mm[4] || '';
      let obj = null;
      try {
        if (op === 'updateAttribute') {
          // updateAttribute("薇奥拉", "心理状态", {"兴奋":40}) → 目标=a, 路径=b, 值=c
          if (c) {
            let path = b;
            try { path = JSON.parse(b); } catch (e2) { /* 非引号路径直接用 */ }
            obj = { target: a, path: path, value: JSON.parse(c) };
          }
          else continue;
        } else {
          obj = { target: a, value: b ? JSON.parse(b) : null };
        }
      } catch (e) { continue; }
      cmds.push({ op, ...obj });
    }
    return cmds.length ? cmds : null;
  },

  /* 目标名 → stat_data 顶层路径 */
  _upBase(target) {
    if (!target) return null;
    if (target === '玩家' || target === '时间' || target === '课表' || target === '双修') return target;
    return '女巫角色.' + target;
  },

  /* ========== 应用 <upstore> 指令到 stat_data（完整闭环：AI 指令 → 同层写回） ========== */
  async applyUpstore(cmds) {
    if (!Array.isArray(cmds) || !cmds.length) return;
    const stat = await App.readStat(true);
    for (const c of cmds) {
      if (!c || !c.op) continue;
      if (c.op === 'addSmallSummary') {
        const t = typeof c.value === 'string' ? c.value : c.target;
        if (t && App.addMemory) App.addMemory('总结', String(t).slice(0, 200));
        continue;
      }
      if (c.op === 'addWorldEvent') {
        const t = typeof c.value === 'string' ? c.value : c.target;
        if (t && App.addLog) App.addLog('event', String(t).slice(0, 200));
        continue;
      }
      const base = App.AI._upBase(c.target);
      if (!base) continue;
      if (c.op === 'add') {
        if (!c.value || typeof c.value !== 'object') continue;
        for (const k in c.value) {
          const full = base + '.' + k;
          const cur = App.deepGet(stat, full);
          const v = c.value[k];
          if (typeof cur === 'number' && typeof v === 'number') {
            App.deepSet(stat, full, App.clamp(cur + v, 0, 99999));
          } else if (Array.isArray(cur)) {
            cur.push(v);
            App.deepSet(stat, full, cur);
          } else {
            App.deepSet(stat, full, v);
          }
        }
      } else if (c.op === 'set') {
        if (!c.value || typeof c.value !== 'object') continue;
        for (const k in c.value) App.deepSet(stat, base + '.' + k, c.value[k]);
      } else if (c.op === 'de') {
        if (!c.value || typeof c.value !== 'object') continue;
        for (const k in c.value) {
          const full = base + '.' + k;
          const cur = Number(App.deepGet(stat, full)) || 0;
          App.deepSet(stat, full, App.clamp(cur - Number(c.value[k]) || 0, 0, 99999));
        }
      } else if (c.op === 'updateAttribute') {
        const full = base + '.' + c.path;
        const cur = App.deepGet(stat, full);
        if (cur && typeof cur === 'object' && c.value && typeof c.value === 'object') {
          App.deepMerge(cur, c.value);
          App.deepSet(stat, full, cur);
        } else {
          App.deepSet(stat, full, c.value);
        }
      }
    }
    await App.writeStat(App._topPatch(stat));
    return stat;
  },

  async applyPatch(ops) {
    if (!Array.isArray(ops) || !ops.length) return;
    const stat = await App.readStat(true);
    for (const op of ops) {
      if (!op || !op.path) continue;
      const path = String(op.path).replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
        .map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'));
      // 去掉 /stat_data 前缀
      if (path[0] === 'stat_data') path.shift();
      if (op.op === 'replace' || op.op === 'add') {
        App.deepSet(stat, path.join('.'), op.value);
      } else if (op.op === 'remove') {
        const parent = path.slice(0, -1).join('.');
        const key = path[path.length - 1];
        const o = parent ? App.deepGet(stat, parent) : stat;
        if (o && key != null) delete o[key];
      }
    }
    await App.writeStat(App._topPatch(stat));
    return stat;
  },
};

/* ========== 顶层 patch 工具：把修改后的 stat 顶层整体作为 patch（写回完整状态） ========== */
App._topPatch = function (stat) {
  const patch = {};
  for (const k in stat) patch[k] = stat[k];
  return patch;
};

/* ========== 独立聊天 ========== */
App.aiChat = async function (userText) {
  const stat = await App.readStat(true);
  const msgs = await App.getTranscript();
  const sys = App.AI.buildSystemPrompt(stat);
  const history = msgs.slice(-16).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: String(m.message || '').slice(0, 800),
  }));
  const r = await App.AI.chat([{ role: 'system', content: sys }].concat(history, [{ role: 'user', content: userText }]),
    { temperature: App.AI.getPreset('chat').temperature, maxTokens: App.AI.getPreset('chat').maxTokens });
  if (!r.ok) {
    App.UI.toast('独立 AI 调用失败：' + r.error, 'danger');
    return null;
  }
  // 写回：<upstore> 指令（优先）或 旧版 <UpdateVariable> JSON Patch
  const up = App.AI.parseUpstore(r.text);
  if (up) {
    try { await App.AI.applyUpstore(up); } catch (e) { console.warn('[HGW] upstore 应用失败', e); }
  } else {
    const ops = App.AI.parseUpdates(r.text);
    if (ops) {
      try { await App.AI.applyPatch(ops); } catch (e) { console.warn('[HGW] 变量更新应用失败', e); }
    }
  }
  return r.text.replace(/<upstore>[\s\S]*?<\/upstore>/gi, '').replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/g, '').trim();
};

/* ========== 日报 / 信纸（走 dailyPaper / letter 预设） ========== */
App.generateDailyPaper = async function () {
  const stat = await App.readStat();
  const t = stat.时间 || {};
  const chars = stat.女巫角色 || {};
  const names = Object.keys(chars);
  if (!App.AI.enabled()) { App.UI.toast('未配置独立 AI', 'warn'); return; }
  const pre = App.AI.getPreset('dailyPaper');
  if (!pre.enabled) { App.UI.toast('日报功能已关闭（AI 配置里可开启）', 'warn'); return; }
  App.UI.toast('日报生成中（独立 AI）…', 'magic');
  const content = [
    '日期：' + App.esc(t.日期 || '') + ' ｜ 学年：' + (t.学期描述 || ''),
    '重要人物（只报道公开消息）：' + names.slice(0, 5).map(n => n + '（好感' + (chars[n].好感度 || 0) + '）').join('、'),
    '请生成日报内容。',
  ].join('\n');
  const r = await App.AI.chatWith('dailyPaper', content);
  if (!r.ok) { App.UI.toast('日报生成失败：' + r.error, 'danger'); return; }
  App.UI.modal({
    title: '📰 霍格沃茨日报 · ' + App.esc(t.日期 || ''),
    xl: true,
    body: '<div style="color:#d8d3c0">' + r.text + '</div>',
  });
};

App.generateLetter = async function (target) {
  const stat = await App.readStat();
  const c = (stat.女巫角色 || {})[target];
  if (!c) { App.UI.toast('目标不存在', 'warn'); return; }
  if (!App.AI.enabled()) { App.UI.toast('未配置独立 AI', 'warn'); return; }
  const pre = App.AI.getPreset('letter');
  if (!pre.enabled) { App.UI.toast('信纸功能已关闭（AI 配置里可开启）', 'warn'); return; }
  App.UI.toast('信纸书写中（独立 AI）…', 'magic');
  const content = [
    '收信人：' + target,
    '她的性格标签：' + (c.性格标签 || []).join('、') + '；性癖标签：' + (c.性癖标签 || []).slice(0, 3).join('、'),
    '当前关系：好感' + (c.好感度 || 0) + ' 服气' + (c.缴械值 || 0) + ' 堕落' + (c.堕落值 || 0),
    '她的心声：' + App.esc(String(c.心声 || '').slice(0, 60)),
    '请写这封信。',
  ].join('\n');
  const r = await App.AI.chatWith('letter', content);
  if (!r.ok) { App.UI.toast('写信失败：' + r.error, 'danger'); return; }
  App.UI.modal({
    title: '🦉 猫头鹰信 · 致' + target,
    body: '<div class="hgw-doc" style="font-family:Georgia,serif">' + App.nl2br(r.text) + '</div>',
  });
};

/* ========== 通用：单功能预设编辑器（可嵌入任意视图） ==========
   在宿主容器 host 内渲染某功能的 AI 预设编辑区：
   启用开关 / 专属提示词 / 输出格式 / 温度 / tokens / 独立 API / 保存 / 恢复默认
   供各功能页（记忆/变量/推演/正文优化…）与 AI 配置面板共同使用 */
App.renderPresetEditor = function (host, name) {
  if (!host) return;
  const d = App.AI_DEFAULTS[name];
  if (!d) return;
  const pre = App.AI.getPreset(name);
  const uid = 'hgw-pe-' + name;
  const api = pre.api || {};
  host.innerHTML =
    '<div class="hgw-sec" style="margin-top:14px"><h3>🤖 本功能 · AI 预设<span class="sub">' + d.name + '</span></h3>' +
    '<div class="hgw-note" style="margin-bottom:8px">' + d.desc + '</div>' +
    '<div class="hgw-field"><label>启用此功能（关闭后回退酒馆主链路）</label><label class="hgw-check"><input type="checkbox" id="' + uid + '-enabled"' + (pre.enabled ? ' checked' : '') + '><span>启用</span></label></div>' +
    '<div class="hgw-field"><label>专属系统提示词</label><textarea class="hgw-input" id="' + uid + '-prompt" rows="4">' + App.esc(pre.systemPrompt) + '</textarea></div>' +
    '<div class="hgw-field"><label>输出格式要求（追加在提示词后）</label><input class="hgw-input" id="' + uid + '-format" value="' + App.esc(pre.format) + '"></div>' +
    '<div class="hgw-grid cols-2">' +
    '<div class="hgw-field"><label>温度</label><input class="hgw-input" id="' + uid + '-temp" type="number" min="0" max="2" step="0.1" value="' + pre.temperature + '"></div>' +
    '<div class="hgw-field"><label>最大输出 tokens</label><input class="hgw-input" id="' + uid + '-tokens" type="number" min="16" max="8000" step="16" value="' + pre.maxTokens + '"></div>' +
    '</div>' +
    '<div class="hgw-field" style="margin-top:6px"><label>🔌 独立 API（留空 = 继承 AI 配置页的主配置；可给本功能单独指定端点/Key/模型）</label></div>' +
    '<div class="hgw-grid cols-3">' +
    '<div class="hgw-field"><input class="hgw-input" id="' + uid + '-apiurl" placeholder="Base URL（OpenAI 兼容，留空继承）" value="' + App.esc(api.apiUrl || '') + '"></div>' +
    '<div class="hgw-field"><input class="hgw-input" id="' + uid + '-apikey" type="password" placeholder="API Key（留空继承）" value="' + App.esc(api.apiKey || '') + '"></div>' +
    '<div class="hgw-field" style="display:flex;gap:6px;align-items:center"><input class="hgw-input" list="' + uid + '-models" id="' + uid + '-apimodel" placeholder="模型（留空继承，可点右侧拉取）" value="' + App.esc(api.apiModel || '') + '" style="flex:1;min-width:0"><datalist id="' + uid + '-models"></datalist><button class="hgw-btn sm ghost" id="' + uid + '-fetch" title="从该 Base URL 拉取模型列表">🔄</button></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:4px">' +
    '<button class="hgw-btn ok" id="' + uid + '-save">💾 保存此预设</button>' +
    '<button class="hgw-btn ghost" id="' + uid + '-reset">↩ 恢复默认</button>' +
    '</div>' +
    '<div id="' + uid + '-status" style="margin-top:6px"></div>' +
    '</div>';

  const st = App.$('#' + uid + '-status');
  const setSt = (cls, msg) => { if (st) st.innerHTML = '<div class="hgw-note ' + cls + '">' + msg + '</div>'; };
  const save = App.$('#' + uid + '-save');
  if (save) save.addEventListener('click', () => {
    App.AI.savePreset(name, {
      enabled: App.$('#' + uid + '-enabled').checked,
      systemPrompt: App.$('#' + uid + '-prompt').value,
      format: App.$('#' + uid + '-format').value,
      temperature: parseFloat(App.$('#' + uid + '-temp').value) || 0.7,
      maxTokens: parseInt(App.$('#' + uid + '-tokens').value) || 800,
      api: {
        apiUrl: (App.$('#' + uid + '-apiurl') || {}).value || '',
        apiKey: (App.$('#' + uid + '-apikey') || {}).value || '',
        apiModel: (App.$('#' + uid + '-apimodel') || {}).value || '',
      },
    });
    setSt('', '<span class="hgw-tag ok">✅ 「' + d.name + '」预设已保存（本地）</span>');
    App.UI.toast('「' + d.name + '」预设已保存', 'ok');
  });
  const fetchBtn = App.$('#' + uid + '-fetch');
  if (fetchBtn) fetchBtn.addEventListener('click', async () => {
    const url = (App.$('#' + uid + '-apiurl') || {}).value || (App.AI.loadCfg().baseUrl || '');
    const key = (App.$('#' + uid + '-apikey') || {}).value || (App.AI.loadCfg().apiKey || '');
    if (!url) { setSt('', '<span class="hgw-tag danger">请先填写 Base URL</span>'); return; }
    fetchBtn.disabled = true;
    fetchBtn.textContent = '…';
    const r = await App.AI.fetchModels(url, key);
    fetchBtn.disabled = false;
    fetchBtn.textContent = '🔄';
    if (!r.ok) { setSt('', '<span class="hgw-tag danger">拉取失败：' + App.esc(r.error) + '</span>'); return; }
    const dl = App.$('#' + uid + '-models');
    if (dl) dl.innerHTML = r.list.map(m => '<option value="' + App.esc(m) + '"></option>').join('');
    const mi = App.$('#' + uid + '-apimodel');
    if (mi && !mi.value && r.list[0]) mi.value = r.list[0];
    setSt('', '<span class="hgw-tag ok">✅ 拉取到 ' + r.list.length + ' 个模型（' + App.esc(r.list.slice(0, 5).join('、')) + (r.list.length > 5 ? '…' : '') + '），可下拉选择</span>');
  });
  const reset = App.$('#' + uid + '-reset');
  if (reset) reset.addEventListener('click', async () => {
    if (!(await App.UI.confirm({ title: '恢复默认', msg: '恢复「' + d.name + '」的内置默认提示词与格式？', icon: 'warn' }))) return;
    App.AI.resetPreset(name);
    App.renderPresetEditor(host, name);
  });
};

/* ========== AI 配置面板视图（主配置 + 功能预设标签页） ========== */
App.registerView('ai', async function (box) {
  const cfg = App.AI.loadCfg();
  const PRESET_NAMES = ['chat', 'memory', 'variables', 'optimize', 'evolution', 'dailyPaper', 'letter'];
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🤖</span>独立 AI 配置<span class="sub">主配置 + 各功能独立预设</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:12px">① 先配置 API 端点；② 每个功能（记忆/变量/正文优化/推演/日报/信纸/聊天）有<b>独立的提示词、输出格式与温度预设</b>，可分别开启/关闭/恢复默认。API Key 只存本地。</div>';

  // —— 主配置 ——
  h += '<div class="hgw-sec"><h3>🔌 主配置（端点/Key/模型）</h3>';
  h += '<div class="hgw-field"><label>启用独立 AI</label><label class="hgw-check"><input type="checkbox" id="hgw-ai-enabled"' + (cfg.enabled ? ' checked' : '') + '><span>启用</span></label></div>';
  h += '<div class="hgw-grid cols-2">';
  h += '<div class="hgw-field"><label>Base URL（OpenAI 兼容）</label><input class="hgw-input" id="hgw-ai-url" placeholder="https://api.openai.com/v1" value="' + App.esc(cfg.baseUrl || '') + '"></div>';
  h += '<div class="hgw-field"><label>API Key</label><input class="hgw-input" id="hgw-ai-key" type="password" placeholder="sk-..." value="' + App.esc(cfg.apiKey || '') + '"></div>';
  h += '<div class="hgw-field"><label>模型</label><input class="hgw-input" id="hgw-ai-model" placeholder="gpt-4o / deepseek-chat / qwen-max" value="' + App.esc(cfg.model || '') + '"></div>';
  h += '<div class="hgw-field"><label>全局默认温度</label><input class="hgw-input" id="hgw-ai-temp" type="number" min="0" max="2" step="0.1" value="' + (cfg.temperature != null ? cfg.temperature : 0.9) + '"></div>';
  h += '</div>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">';
  h += '<button class="hgw-btn ok" id="hgw-ai-save">💾 保存主配置</button>';
  h += '<button class="hgw-btn magic" id="hgw-ai-test">🔌 测试连接</button>';
  h += '<button class="hgw-btn" id="hgw-ai-fetch">🔄 拉取模型</button>';
  h += '<button class="hgw-btn danger" id="hgw-ai-clear">🗑 清空（含 Key）</button>';
  h += '</div><div id="hgw-ai-status" style="margin-top:8px"></div></div>';

  // —— 功能预设标签页 ——
  h += '<div class="hgw-sec" style="margin-top:14px"><h3>🎛️ 功能预设（各自的提示词/格式/温度）</h3>';
  h += '<div class="hgw-tabs" id="hgw-ai-tabs">' + PRESET_NAMES.map((n, i) => {
    const d = App.AI_DEFAULTS[n];
    return '<div class="hgw-tab' + (i === 0 ? ' on' : '') + '" data-preset="' + n + '">' + d.name + '</div>';
  }).join('') + '</div>';
  h += '<div id="hgw-ai-preset-body"></div></div>';
  h += '</div>';

  box.innerHTML = h;

  /* —— 预设编辑渲染（复用通用编辑器） —— */
  function renderPreset(name) {
    const body = App.$('#hgw-ai-preset-body');
    if (!body) return;
    App.renderPresetEditor(body, name);
  }
  App.$$('#hgw-ai-tabs .hgw-tab', box).forEach(el => el.addEventListener('click', () => {
    App.$$('#hgw-ai-tabs .hgw-tab', box).forEach(x => x.classList.remove('on'));
    el.classList.add('on');
    renderPreset(el.dataset.preset);
  }));
  renderPreset('chat');

  /* —— 主配置事件 —— */
  const status = App.$('#hgw-ai-status');
  const setStatus = (cls, msg) => { if (status) status.innerHTML = '<div class="hgw-note ' + cls + '">' + msg + '</div>'; };
  const saveBtn = App.$('#hgw-ai-save');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    App.AI.saveCfg({
      enabled: App.$('#hgw-ai-enabled').checked,
      baseUrl: App.$('#hgw-ai-url').value.trim(),
      apiKey: App.$('#hgw-ai-key').value.trim(),
      model: App.$('#hgw-ai-model').value.trim(),
      temperature: parseFloat(App.$('#hgw-ai-temp').value) || 0.9,
    });
    setStatus('', '✅ 主配置已保存（本地）');
  });
  const testBtn = App.$('#hgw-ai-test');
  if (testBtn) testBtn.addEventListener('click', async () => {
    setStatus('', '测试中…');
    App.AI.saveCfg({
      enabled: App.$('#hgw-ai-enabled').checked,
      baseUrl: App.$('#hgw-ai-url').value.trim(),
      apiKey: App.$('#hgw-ai-key').value.trim(),
      model: App.$('#hgw-ai-model').value.trim(),
      temperature: parseFloat(App.$('#hgw-ai-temp').value) || 0.9,
    });
    const r = await App.AI.test();
    setStatus('', r.ok ? '✅ 连接成功：' + App.esc(r.text) : '❌ 连接失败：' + App.esc(r.error));
  });
  const fetchBtn = App.$('#hgw-ai-fetch');
  if (fetchBtn) fetchBtn.addEventListener('click', async () => {
    const url = App.$('#hgw-ai-url').value.trim();
    const key = App.$('#hgw-ai-key').value.trim();
    if (!url) { setStatus('', '<span class="hgw-tag danger">请先填写 Base URL</span>'); return; }
    fetchBtn.disabled = true;
    fetchBtn.textContent = '拉取中…';
    const r = await App.AI.fetchModels(url, key);
    fetchBtn.disabled = false;
    fetchBtn.textContent = '🔄 拉取模型';
    if (!r.ok) { setStatus('', '<span class="hgw-tag danger">拉取失败：' + App.esc(r.error) + '</span>'); return; }
    const mi = App.$('#hgw-ai-model');
    if (mi) mi.value = r.list[0] || mi.value;
    setStatus('', '<span class="hgw-tag ok">✅ 拉取到 ' + r.list.length + ' 个模型（' + App.esc(r.list.slice(0, 6).join('、')) + (r.list.length > 6 ? '…' : '') + '），首个已填入，可再手动改</span>');
  });
  const clearBtn = App.$('#hgw-ai-clear');
  if (clearBtn) clearBtn.addEventListener('click', async () => {
    if (!(await App.UI.confirm({ title: '清空 AI 配置', msg: '确定清空 API 配置、Key 与全部预设吗？', icon: 'danger', okText: '清空' }))) return;
    App.AI.saveCfg({});
    App.AI.savePresets({});
    App.UI.toast('AI 配置与预设已清空', 'warn');
    App.navigate('ai');
  });
});
