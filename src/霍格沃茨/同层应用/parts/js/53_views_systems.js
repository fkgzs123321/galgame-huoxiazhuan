/* ============================================================
   霍格沃茨 · 同层应用 系统四件套（记忆/变量/世界推演/正文优化）
   对齐凡人修仙传：记忆模块/全局变量/剧情演变/正文优化
   ============================================================ */
'use strict';

/* ============================================================
   记忆系统（Memory）三档架构：对齐凡人修仙传 分段记忆
   短期 = 楼层事件流（自动实时，不落库）
   中期 = 分段总结库（每段剧情压缩成一条，落 HGW_MEMORY_V1）
   长期 = 深度记忆档案（整合中期总结 → small_summary + large_summary，
         写入 stat_data.玩家.记忆.长期档案，随存档走，注入 AI 提示词）
   全部走同层（本地库 + stat_data），不依赖世界书调度
   ============================================================ */
App.MEMORY_KEY = 'HGW_MEMORY_V1';
App.MEM_AUTO_KEY = 'HGW_MEM_AUTO_V1';
App.MEM_PROMPTS_KEY = 'HGW_MEM_PROMPTS_V1';

App.loadMemories = function () {
  try { return JSON.parse(localStorage.getItem(App.MEMORY_KEY) || '[]'); } catch (e) { return []; }
};
App.saveMemories = function (list) {
  try { localStorage.setItem(App.MEMORY_KEY, JSON.stringify(list.slice(0, 80))); } catch (e) { }
};
App.addMemory = function (type, text, meta) {
  const list = App.loadMemories();
  list.unshift(Object.assign({ id: App.uid(), type: type || '事件', text: String(text), time: App.now(), ts: Date.now() }, meta || {}));
  App.saveMemories(list);
};

/* ========== 自动化：小总结/大总结提示词（对齐凡人 small/large-summary-prompt） ========== */
App.getMemPrompts = function () {
  const dft = {
    small: '你是记忆小总结器。把下面楼层内容压缩成 50~100 字小总结：保留关键人物、事件、情绪与对话要点。直接输出总结，不要标题。',
    large: '你是记忆大总结器。把下面楼层内容压缩成 150~250 字大总结：保留人物关系变化、重要事件、未完成事项、伏笔与关键细节。直接输出总结，不要标题。',
  };
  try { return Object.assign({}, dft, JSON.parse(localStorage.getItem(App.MEM_PROMPTS_KEY) || '{}')); } catch (e) { return dft; }
};
App.saveMemPrompts = function (p) {
  try { localStorage.setItem(App.MEM_PROMPTS_KEY, JSON.stringify(p)); } catch (e) { }
};
App.getMemAutoProgress = function () {
  try { return JSON.parse(localStorage.getItem(App.MEM_AUTO_KEY) || '{"lastFloor":0,"lastMid":0,"lastLong":0,"ts":""}'); } catch (e) { return { lastFloor: 0, lastMid: 0, lastLong: 0, ts: '' }; }
};
App.saveMemAutoProgress = function (p) {
  try { localStorage.setItem(App.MEM_AUTO_KEY, JSON.stringify(p)); } catch (e) { }
};

/* ========== 自动化：楼层阈值驱动（对齐凡人 segmentedSummaryThreshold / autoDeepSummaryEnabled）
   每 midEvery 层 → 中期总结（新楼层压缩入库）
   每 longEvery 层 → 长期档案（中期总结 → small/large_summary 深度凝练） */
App.MEM_CFG_KEY = 'HGW_MEM_CFG_V1';
App.getMemAutoCfg = function () {
  const dft = { midEvery: 10, longEvery: 50, autoMid: true, autoLong: true };
  try { return Object.assign({}, dft, JSON.parse(localStorage.getItem(App.MEM_CFG_KEY) || '{}')); } catch (e) { return dft; }
};
App.saveMemAutoCfg = function (cfg) {
  try { localStorage.setItem(App.MEM_CFG_KEY, JSON.stringify(cfg)); } catch (e) { }
};

/* 自动记忆主入口：楼层数到达阈值 → 中期/长期自动开展（对齐凡人自动总结+自动深度凝练） */
App.summarizeNewFloors = async function (force) {
  if (!App.cfg || !App.cfg.memoryAuto) { if (!force) return { ok: false, error: '自动总结未开启（记忆页可开）' }; }
  if (!App.AI || !App.AI.enabled()) return { ok: false, error: '未配置独立 AI' };
  const pre = App.AI.getPreset('optimize');
  if (!pre.enabled) return { ok: false, error: '正文压缩预设已关闭（记忆页底部可开启）' };
  let msgs = [];
  try { msgs = await App.getTranscript(); } catch (e) { }
  const total = msgs.length;
  const cfg = App.getMemAutoCfg();
  const prog = App.getMemAutoProgress();
  const done = { mid: false, long: false };

  // —— 中期：距上次中期总结 ≥ midEvery 层 ——
  const midDue = force || (cfg.autoMid && total - prog.lastMid >= cfg.midEvery);
  if (midDue && total > prog.lastMid) {
    const fresh = msgs.slice(prog.lastMid).map(m => (m.role === 'user' ? '我' : (m.name || '她')) + '：' + String(m.message || '').replace(/【[^】]*结算】/g, '').slice(0, 100));
    if (fresh.length) {
      const prompts = App.getMemPrompts();
      const payload = prompts.large + '\n\n【新楼层（' + (prog.lastMid + 1) + '~' + total + ' 层）】\n' + fresh.join('\n');
      const r = await App.AI.chatWithRaw('optimize', prompts.large, payload);
      if (r.ok && r.text.trim()) {
        App.addMemory('总结', r.text.trim().slice(0, 300), { floorStart: prog.lastMid + 1, floorEnd: total });
        done.mid = true;
      }
    }
    prog.lastMid = total;
  }
  // —— 长期：距上次长期档案 ≥ longEvery 层 → 自动深度凝练（对齐 autoDeepSummaryEnabled） ——
  const longDue = force || (cfg.autoLong && total - prog.lastLong >= cfg.longEvery);
  if (longDue) {
    const mems = App.loadMemories();
    if (mems.length >= 3) {
      const r2 = await App.consolidateLongTermMemory(null, true);
      if (r2) done.long = true;
    }
    prog.lastLong = total;
  }
  prog.lastFloor = total;
  prog.ts = App.now();
  App.saveMemAutoProgress(prog);
  if (!force && (done.mid || done.long)) App.UI.toast(done.long ? '🧠 已自动开展长期记忆（深度档案已更新）' : '🧠 已自动开展中期记忆（' + total + ' 层）', 'magic');
  return { ok: true, done: done.mid || done.long, total, last: prog.lastFloor, mid: done.mid, long: done.long, msg: '未到阈值' };
};

/* 入口：启动后/楼层刷新时调用（自动模式静默） */
App.checkAutoMemory = App.debounce ? App.debounce(function () { App.summarizeNewFloors(false).catch(() => { }); }, 2500) : function () { App.summarizeNewFloors(false).catch(() => { }); };

/* 中期→长期：把中期总结库整合成深度记忆档案（对齐凡人 small/large_summary；silent=自动触发静默） */
App.consolidateLongTermMemory = async function (stat, silent) {
  const mems = App.loadMemories();
  const toast = (cls, msg) => { if (!silent) App.UI.toast(msg, cls); };
  if (!mems.length) { toast('warn', '中期记忆库为空——先添加记忆或生成中期总结'); return false; }
  if (!App.AI.enabled()) { toast('warn', '未配置独立 AI——请先在功能预设或 AI 配置页设置 API'); return false; }
  const pre = App.AI.getPreset('memory');
  if (!pre.enabled) { toast('warn', '记忆预设已关闭（可在本页底部开启）'); return false; }
  if (!silent) App.UI.toast('整合长期记忆档案中（独立 AI）…', 'magic');
  const lines = mems.slice(0, 30).map(m => '[' + (m.time || '') + '][' + m.type + '] ' + m.text);
  const r = await App.AI.chatWith('memory', '以下是我方全部中期记忆条目，请整合为长期记忆档案（详细档案 + 精简索引）：\n' + lines.join('\n'));
  if (!r.ok) { toast('danger', '整合失败：' + r.error); return false; }
  const small = (r.text.match(/<small_summary>([\s\S]*?)<\/small_summary>/i) || [])[1];
  const large = (r.text.match(/<large_summary>([\s\S]*?)<\/large_summary>/i) || [])[1];
  if (!small && !large) { App.UI.toast('AI 未按格式输出档案，已把全文存为档案', 'warn'); }
  const st = stat || await App.readStat(true);
  st.玩家 = st.玩家 || {};
  st.玩家.记忆 = st.玩家.记忆 || { 长期档案: {}, 世界推演报告: [] };
  st.玩家.记忆.长期档案 = {
    small_summary: (small || r.text).trim().slice(0, 600),
    large_summary: (large || (small || r.text).slice(0, 100)).trim(),
    更新时间: App.now(),
  };
  await App.writeStat({ 玩家: { 记忆: st.玩家.记忆 } });
  App.UI.toast('长期记忆档案已写入 stat_data', 'ok');
  return true;
};

App.registerView('memory', async function (box) {
  const memories = App.loadMemories();
  const stat = await App.readStat();
  const chars = stat.女巫角色 || {};
  const mem = (stat.玩家 || {}).记忆 || {};
  const 长期 = mem.长期档案 || {};

  // —— 短期：楼层事件流（自动实时） ——
  let shortList = [];
  try {
    const msgs = await App.getTranscript();
    shortList = msgs.slice(-10).map(m => ({ role: m.role === 'user' ? '你' : (m.name || '她'), text: String(m.message || '').replace(/【[^】]*结算】/g, '').slice(0, 60) }));
  } catch (e) { }

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🧠</span>记忆系统<span class="sub">短期 · 中期 · 长期 三档记忆</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:12px">对齐凡人分段记忆：<b>短期</b>=最近楼层（自动实时）→ <b>中期</b>=分段总结库（自动/手动压缩楼层入库，记录覆盖楼层）→ <b>长期</b>=深度档案（small_summary+large_summary，注入 AI 提示词持续生效）。全部走同层，不依赖世界书。</div>';

  // —— 类型占比统计条（一目了然） ——
  const typeCnt = { 事件: 0, 关系: 0, 秘密: 0, 计划: 0, 总结: 0 };
  for (const m of memories) typeCnt[m.type] = (typeCnt[m.type] || 0) + 1;
  const totalCnt = memories.length || 1;
  const typeColor = { 事件: 'gold', 关系: 'love', 秘密: 'danger', 计划: 'magic', 总结: 'ok' };
  const typeNames = ['事件', '关系', '秘密', '计划', '总结'];
  h += '<div class="hgw-card" style="margin-bottom:12px"><div class="card-title"><span>📊</span>记忆构成<span class="hgw-tag ghost" style="margin-left:8px">共 ' + memories.length + ' 条</span></div><div class="card-body">';
  h += '<div style="display:flex;height:14px;border-radius:7px;overflow:hidden;margin-bottom:8px">';
  for (const tn of typeNames) {
    const n = typeCnt[tn] || 0;
    if (!n) continue;
    const pct = Math.round(n / totalCnt * 100);
    h += '<div style="width:' + pct + '%;background:var(--hgw-' + typeColor[tn] + ',' + typeColor[tn] + ')"></div>';
  }
  h += '</div>';
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px">';
  for (const tn of typeNames) {
    const n = typeCnt[tn] || 0;
    if (!n) continue;
    h += '<span class="hgw-tag ' + typeColor[tn] + '">' + tn + ' ×' + n + '（' + Math.round(n / totalCnt * 100) + '%）</span>';
  }
  h += '</div></div></div>';

  // 短期卡
  h += '<div class="hgw-card" style="margin-bottom:12px"><div class="card-title"><span>⚡</span>短期记忆<span class="hgw-tag ghost" style="margin-left:8px">自动 · 最近 10 层</span></div>';
  h += '<div class="card-body" style="font-size:11px;line-height:1.8;max-height:160px;overflow-y:auto">' +
    (shortList.length ? shortList.map(m => '<div style="margin-bottom:3px"><span class="hgw-tag">' + m.role + '</span> ' + App.esc(m.text) + '</div>').join('') : '<span class="hgw-text-faint">暂无楼层记录</span>') +
    '</div></div>';

  // 中期卡
  h += '<div class="hgw-card" style="margin-bottom:12px"><div class="card-title"><span>📝</span>中期记忆<span class="hgw-tag gold" style="margin-left:8px">分段总结库 · ' + memories.length + ' 条</span></div>';
  h += '<div class="card-body">';
  const autoProg = App.getMemAutoProgress();
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">';
  h += '<button class="hgw-btn ok" id="hgw-mem-add">➕ 手记一条</button>';
  h += '<button class="hgw-btn magic" id="hgw-mem-summary">📝 总结最近剧情入库</button>';
  h += '<button class="hgw-btn" id="hgw-mem-auto-now">⚡ 立即总结新楼层</button>';
  h += '<button class="hgw-btn danger" id="hgw-mem-clear">🗑 清空中期库</button>';
  h += '</div>';
  h += '<div class="hgw-note" style="font-size:10px;margin-bottom:8px">自动总结已' + (App.cfg && App.cfg.memoryAuto ? '<b>开启</b>' : '关闭') + '（下方可设）｜ 已自动总结至第 ' + autoProg.lastFloor + ' 层' + (autoProg.ts ? '（' + autoProg.ts + '）' : '') + '</div>';
  if (!memories.length) {
    h += App.UI.empty('📭', '中期记忆库为空——重大事件、她的秘密、你的承诺，都值得记下来；或开启自动总结，每段新剧情自动入库。');
  } else {
    h += '<div class="hgw-list" style="max-height:240px;overflow-y:auto">';
    for (const m of memories) {
      const typeCls = { '事件': 'gold', '关系': 'love', '秘密': 'danger', '计划': 'magic', '总结': 'ok' }[m.type] || 'ghost';
      const floorTxt = (m.floorStart && m.floorEnd) ? ' · 覆盖 ' + m.floorStart + '~' + m.floorEnd + ' 层' : '';
      h += '<div class="hgw-row" data-mem="' + m.id + '">';
      h += '<span class="hgw-badge ' + typeCls + '">' + (m.type || '事件') + '</span>';
      h += '<span class="hgw-muted" style="font-size:10px;white-space:nowrap">' + App.esc(m.time) + floorTxt + '</span>';
      h += '<span style="flex:1;min-width:0">' + App.esc(m.text) + '</span>';
      h += '<span class="hgw-btn sm danger" data-memdel="' + m.id + '" style="flex-shrink:0">删</span>';
      h += '</div>';
    }
    h += '</div>';
  }
  h += '</div></div>';

  // —— 自动化设置卡（对齐凡人 segmentedChatLayers/segmentedSummaryThreshold/autoDeepSummaryEnabled） ——
  const memPrompts = App.getMemPrompts();
  const memCfg = App.getMemAutoCfg();
  const floorNow = autoProg.lastFloor || 0;
  const nextMid = memCfg.midEvery - (floorNow % memCfg.midEvery) || memCfg.midEvery;
  const nextLong = Math.max(0, memCfg.longEvery - (floorNow % memCfg.longEvery));
  h += '<div class="hgw-card" style="margin-bottom:12px"><div class="card-title"><span>⚙️</span>自动记忆<span class="hgw-tag magic" style="margin-left:8px">楼层阈值驱动 · 全程自动</span></div><div class="card-body">';
  h += '<div class="hgw-field"><label>启用自动记忆（到达阈值自动开展中期/长期，无需手动）</label><label class="hgw-check"><input type="checkbox" id="hgw-mem-auto"' + (App.cfg && App.cfg.memoryAuto ? ' checked' : '') + '><span>开启</span></label></div>';
  h += '<div class="hgw-grid cols-2">';
  h += '<div class="hgw-field"><label>中期记忆：每 <input class="hgw-input" id="hgw-mem-every-mid" type="number" min="1" max="200" value="' + memCfg.midEvery + '" style="width:70px;display:inline-block"> 层开展</label><div style="font-size:10px;color:#9aa7b8">新楼层自动压缩入库（还差 ' + nextMid + ' 层）</div></div>';
  h += '<div class="hgw-field"><label>长期记忆：每 <input class="hgw-input" id="hgw-mem-every-long" type="number" min="10" max="500" value="' + memCfg.longEvery + '" style="width:70px;display:inline-block"> 层开展</label><div style="font-size:10px;color:#9aa7b8">中期库自动凝练为深度档案（还差 ' + nextLong + ' 层）</div></div>';
  h += '</div>';
  // 进度条：当前楼层 / 下一阈值
  const midPct = Math.min(100, Math.round((floorNow % memCfg.midEvery) / memCfg.midEvery * 100));
  const longPct = Math.min(100, Math.round((floorNow % memCfg.longEvery) / memCfg.longEvery * 100));
  h += '<div style="margin:6px 0 2px;font-size:10px;color:#9aa7b8">中期进度（第 ' + floorNow + ' 层）：</div>';
  h += '<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,.06);margin-bottom:4px"><div style="width:' + midPct + '%;background:var(--hgw-gold)"></div></div>';
  h += '<div style="margin:4px 0 2px;font-size:10px;color:#9aa7b8">长期进度（距上次档案 ' + (floorNow % memCfg.longEvery) + '/' + memCfg.longEvery + ' 层）：</div>';
  h += '<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,.06);margin-bottom:6px"><div style="width:' + longPct + '%;background:var(--hgw-magic)"></div></div>';
  h += '<div class="hgw-field"><label>小总结提示词（手记/快速总结用）</label><textarea class="hgw-input" id="hgw-mem-p-small" rows="2">' + App.esc(memPrompts.small) + '</textarea></div>';
  h += '<div class="hgw-field"><label>大总结提示词（中期入库用）</label><textarea class="hgw-input" id="hgw-mem-p-large" rows="2">' + App.esc(memPrompts.large) + '</textarea></div>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="hgw-btn ok" id="hgw-mem-p-save">💾 保存设置</button><button class="hgw-btn ghost" id="hgw-mem-auto-reset">↩ 重置进度</button></div>';
  h += '</div></div>';

  // 长期卡
  h += '<div class="hgw-card gold-border"><div class="card-title"><span>🏛️</span>长期记忆<span class="hgw-tag magic" style="margin-left:8px">深度档案 · 注入 AI 提示词</span></div>';
  h += '<div class="card-body">';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">';
  h += '<button class="hgw-btn ok lg" id="hgw-mem-deep">🧬 整合长期档案（中期库 → small/large_summary）</button>';
  h += '<button class="hgw-btn ghost" id="hgw-mem-deep-clear">🗑 清空档案</button>';
  h += '</div>';
  if (长期.large_summary) {
    h += '<div class="hgw-note" style="margin-bottom:6px"><strong class="hgw-text-gold">索引：</strong>' + App.esc(长期.large_summary) + '</div>';
    h += '<div class="hgw-note" style="font-size:11px"><strong class="hgw-text-gold">详情：</strong>' + App.esc(String(长期.small_summary || '').slice(0, 300)) + (String(长期.small_summary || '').length > 300 ? '…' : '') + '</div>';
    h += '<div class="hgw-muted" style="font-size:10px;margin-top:4px">更新于 ' + App.esc(长期.更新时间 || '') + '</div>';
  } else {
    h += App.UI.empty('🏛️', '还没有长期档案——先攒一些中期记忆，再一键整合。');
  }
  h += '</div></div>';
  h += '</div>';
  box.innerHTML = h;

  // —— 本功能 · AI 预设（记忆整理的独立提示词/格式/温度/API） ——
  const memPe = document.createElement('div');
  memPe.id = 'hgw-mem-pe';
  box.appendChild(memPe);
  if (App.AI && App.AI_DEFAULTS) App.renderPresetEditor(memPe, 'memory');

  const addBtn = App.$('#hgw-mem-add');
  if (addBtn) addBtn.addEventListener('click', async () => {
    const text = await App.UI.prompt({ title: '手记一条', msg: '记下什么？（重要事件/她的细节/你的目标）', placeholder: '例如：赫敏喜欢在图书馆靠窗的位置，讨厌被打断', value: '' });
    if (text == null || !text.trim()) return;
    App.addMemory('事件', text.trim());
    App.UI.toast('已记入中期记忆库', 'ok');
    App.navigate('memory');
  });
  const sumBtn = App.$('#hgw-mem-summary');
  if (sumBtn) sumBtn.addEventListener('click', async () => {
    // 中期总结：用「大总结提示词」压缩最近楼层 + 关系快照 → 存库（对齐凡人分段总结）
    let lines = [];
    let floorBase = 0;
    try {
      const msgs = await App.getTranscript();
      floorBase = Math.max(0, msgs.length - 10);
      lines = msgs.slice(-10).map(m => (m.role === 'user' ? '我' : (m.name || '她')) + '：' + String(m.message || '').replace(/【[^】]*结算】/g, '').slice(0, 100));
    } catch (e) { }
    for (const n in chars) {
      const c = chars[n] || {};
      lines.push('【' + n + '】' + (c.学院 || '') + ' ｜ 好感' + (c.好感度 || 0) + ' 服气' + (c.缴械值 || 0) + ' 堕落' + (c.堕落值 || 0));
    }
    const prompts = App.getMemPrompts();
    const payload = prompts.large + '\n\n【近期剧情（最近 ' + lines.length + ' 条）】\n' + (lines.join('\n') || '（暂无楼层）');
    if (App.AI && App.AI.enabled()) {
      const r = await App.AI.chatWithRaw('optimize', prompts.large, payload);
      if (r.ok && r.text.trim()) {
        App.addMemory('总结', r.text.trim().slice(0, 300), { floorStart: floorBase + 1, floorEnd: floorBase + 10 });
        App.UI.toast('中期总结已入库', 'ok');
      } else { App.addMemory('总结', '（自动压缩失败：' + (r.error || '空结果') + '）'); App.UI.toast('压缩失败，已记录占位', 'warn'); }
    } else {
      App.addMemory('总结', '（未配置独立 AI，已保存原文要点）' + lines.slice(0, 3).join('；').slice(0, 150));
      App.UI.toast('未配置独立 AI——已保存楼层要点为中期总结', 'warn');
    }
    App.navigate('memory');
  });
  const autoNow = App.$('#hgw-mem-auto-now');
  if (autoNow) autoNow.addEventListener('click', async () => {
    autoNow.disabled = true;
    autoNow.textContent = '总结中…';
    const r = await App.summarizeNewFloors(true);
    autoNow.disabled = false;
    autoNow.textContent = '⚡ 立即总结新楼层';
    if (r.ok && r.done) App.UI.toast(r.added ? '新楼层已总结入库' : '总结完成（AI 未返回内容）', r.added ? 'ok' : 'warn');
    else App.UI.toast(r.error || r.msg || '完成', r.ok ? 'ok' : 'warn');
    App.navigate('memory');
  });
  const pSave = App.$('#hgw-mem-p-save');
  if (pSave) pSave.addEventListener('click', () => {
    const auto = App.$('#hgw-mem-auto');
    App.cfg.memoryAuto = !!(auto && auto.checked);
    App.saveCfg();
    const cfg = App.getMemAutoCfg();
    cfg.midEvery = parseInt((App.$('#hgw-mem-every-mid') || {}).value) || 10;
    cfg.longEvery = parseInt((App.$('#hgw-mem-every-long') || {}).value) || 50;
    App.saveMemAutoCfg(cfg);
    App.saveMemPrompts({
      small: (App.$('#hgw-mem-p-small') || {}).value || '',
      large: (App.$('#hgw-mem-p-large') || {}).value || '',
    });
    App.UI.toast('自动记忆设置已保存（中期每 ' + cfg.midEvery + ' 层 · 长期每 ' + cfg.longEvery + ' 层）', 'ok');
  });
  const autoReset = App.$('#hgw-mem-auto-reset');
  if (autoReset) autoReset.addEventListener('click', async () => {
    if (!(await App.UI.confirm({ title: '重置记忆进度', msg: '重置自动记忆进度（下次启动重新从当前楼层计阈值）？', icon: 'warn' }))) return;
    App.saveMemAutoProgress({ lastFloor: 0, lastMid: 0, lastLong: 0, ts: '' });
    App.UI.toast('记忆进度已重置', 'ok');
    App.navigate('memory');
  });
  const clearBtn = App.$('#hgw-mem-clear');
  if (clearBtn) clearBtn.addEventListener('click', async () => {
    if (!(await App.UI.confirm({ title: '清空中期库', msg: '确定清空全部中期记忆条目吗？（长期档案不受影响）', icon: 'danger', okText: '清空' }))) return;
    App.saveMemories([]);
    App.UI.toast('中期记忆已清空', 'warn');
    App.navigate('memory');
  });
  App.$$('[data-memdel]', box).forEach(el => el.addEventListener('click', () => {
    const list = App.loadMemories().filter(x => x.id !== el.dataset.memdel);
    App.saveMemories(list);
    App.navigate('memory');
  }));
  const deepBtn = App.$('#hgw-mem-deep');
  if (deepBtn) deepBtn.addEventListener('click', async () => {
    deepBtn.disabled = true;
    const ok = await App.consolidateLongTermMemory(stat);
    deepBtn.disabled = false;
    if (ok) App.navigate('memory');
  });
  const deepClear = App.$('#hgw-mem-deep-clear');
  if (deepClear) deepClear.addEventListener('click', async () => {
    if (!(await App.UI.confirm({ title: '清空长期档案', msg: '确定清空长期记忆档案吗？此操作不可撤销。', icon: 'danger', okText: '清空' }))) return;
    const st = await App.readStat(true);
    st.玩家 = st.玩家 || {};
    st.玩家.记忆 = st.玩家.记忆 || {};
    st.玩家.记忆.长期档案 = { small_summary: '', large_summary: '', 更新时间: '' };
    await App.writeStat({ 玩家: { 记忆: st.玩家.记忆 } });
    App.UI.toast('长期档案已清空', 'warn');
    App.navigate('memory');
  });
});

/* ============================================================
   变量系统（Variables）
   stat_data 结构化监控：模块分区树 + 最近变化 diff + AI 写回格式 + 搜索/编辑/导入导出
   ============================================================ */
App.VAR_SNAP_KEY = 'HGW_VAR_SNAP_V1';

/* 递归 diff：返回 [{path, from, to}]，最多 40 条 */
App.diffStat = function (oldObj, curObj, prefix) {
  const out = [];
  const keys = new Set([...(oldObj ? Object.keys(oldObj) : []), ...(curObj ? Object.keys(curObj) : [])]);
  for (const k of keys) {
    if (out.length >= 40) break;
    const path = prefix ? prefix + '.' + k : k;
    const o = oldObj ? oldObj[k] : undefined;
    const c = curObj ? curObj[k] : undefined;
    if (o === undefined) { out.push({ path, from: '∅', to: JSON.stringify(c).slice(0, 60) }); continue; }
    if (c === undefined) { out.push({ path, from: JSON.stringify(o).slice(0, 60), to: '∅' }); continue; }
    const oIsObj = o && typeof o === 'object' && !Array.isArray(o);
    const cIsObj = c && typeof c === 'object' && !Array.isArray(c);
    if (oIsObj && cIsObj) out.push(...App.diffStat(o, c, path));
    else if (JSON.stringify(o) !== JSON.stringify(c)) out.push({ path, from: JSON.stringify(o).slice(0, 60), to: JSON.stringify(c).slice(0, 60) });
  }
  return out.slice(0, 40);
};

App.registerView('variables', async function (box) {
  const stat = await App.readStat();
  const pre = App.AI && App.AI.getPreset ? App.AI.getPreset('variables') : null;
  // 最近变化 diff（对齐凡人 diffTrackingFields：保存快照对比）
  let snap = null;
  try { snap = JSON.parse(localStorage.getItem(App.VAR_SNAP_KEY) || 'null'); } catch (e) { snap = null; }
  const changes = snap ? App.diffStat(snap, stat) : null;

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🔢</span>变量系统<span class="sub">stat_data 唯一事实源 · 结构化监控</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:10px">所有游戏状态都在 stat_data 树下。<b>面板写数值，AI 只读并叙事</b>；AI 通过 <UpdateVariable> 指令更新，格式见下方「AI 写回格式」。</div>';

  // —— AI 写回格式卡（对齐凡人 <upstore> 变量思考） ——
  h += '<div class="hgw-card" style="margin-bottom:12px"><div class="card-title"><span>📡</span>AI 写回格式<span class="hgw-tag ghost" style="margin-left:8px">variables 预设 · 指令模板</span></div>';
  h += '<div class="card-body" style="font-size:11px;font-family:monospace;white-space:pre-wrap;color:#7fd0a8;background:rgba(0,0,0,.25);border-radius:6px;padding:8px">' +
    App.esc((pre && pre.format) || '<UpdateVariable>{"json_patch":[...]}</UpdateVariable>') + '</div>' +
    '<div class="card-foot" style="font-size:10px">AI 在回复末尾输出该块 → 同层解析 JSON Patch（RFC6902）→ 应用到 stat_data。白名单字段见世界书《变量更新规则》。</div></div>';

  // —— 最近变化 diff ——
  h += '<div class="hgw-card" style="margin-bottom:12px"><div class="card-title"><span>🔍</span>最近变化' + (changes ? '<span class="hgw-tag danger" style="margin-left:8px">' + changes.length + ' 处</span>' : '<span class="hgw-tag ghost" style="margin-left:8px">无快照</span>') + '</span></div>';
  h += '<div class="card-body">';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">';
  h += '<button class="hgw-btn ok" id="hgw-var-snap">📸 保存当前快照（作为对比基线）</button>';
  if (changes !== null) h += '<button class="hgw-btn ghost" id="hgw-var-snap-clear">🗑 清除快照</button>';
  h += '</div>';
  if (snap === null) {
    h += '<div class="hgw-note" style="font-size:11px">还没有对比基线——点「保存当前快照」后，下次进入本页会列出与基线的全部差异（对齐凡人 diff 跟踪）。</div>';
  } else if (!changes || !changes.length) {
    h += '<div class="hgw-note" style="font-size:11px">✅ 与上次快照一致，无变化。</div>';
  } else {
    h += '<div style="max-height:180px;overflow-y:auto;font-size:11px">';
    for (const c of changes) {
      const color = c.from === '∅' ? '#7fd0a8' : (c.to === '∅' ? '#e07b7b' : '#e8d48b');
      h += '<div style="margin-bottom:4px;border-bottom:1px dashed rgba(200,180,120,.12);padding-bottom:3px"><span style="color:#c9a227">' + App.esc(c.path) + '</span>：<span style="color:#9aa7b8;text-decoration:line-through">' + App.esc(c.from) + '</span> → <span style="color:' + color + '">' + App.esc(c.to) + '</span></div>';
    }
    h += '</div>';
  }
  h += '</div></div>';

  // —— 模块分区树 ——
  h += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">';
  h += '<input class="hgw-input" id="hgw-var-search" placeholder="🔍 搜索变量路径…（如 女巫角色.薇奥拉.好感度）" style="flex:1;min-width:200px">';
  h += '<button class="hgw-btn ok" id="hgw-var-export">📤 导出 JSON</button>';
  h += '<button class="hgw-btn magic" id="hgw-var-import">📥 导入 JSON</button>';
  h += '</div>';
  h += '<div id="hgw-var-tree" class="hgw-doc" style="max-height:55vh;overflow-y:auto;font-size:11px"></div>';
  h += '</div>';
  box.innerHTML = h;

  // 树形渲染（按顶层模块分区）
  const MODULE_ICON = { 时间: '🕐', 玩家: '🧙', 课表: '🗓️', 双修: '♥', 女巫角色: '👥' };
  function renderTree(obj, path, depth) {
    let out = '';
    const pad = '&nbsp;'.repeat(depth * 2);
    for (const k in obj) {
      const v = obj[k];
      const full = path ? path + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out += '<div style="color:#e8d48b">' + pad + '▸ <b>' + k + '</b></div>' + renderTree(v, full, depth + 1);
      } else if (Array.isArray(v)) {
        out += '<div style="color:#7fd0a8">' + pad + '▸ <b>' + k + '</b> <span class="hgw-text-faint">[' + v.length + ']</span></div>';
        if (v.length <= 5) {
          for (let i = 0; i < v.length; i++) {
            out += '<div style="color:#9aa7b8">' + pad + '&nbsp;&nbsp;[' + i + '] ' + App.esc(typeof v[i] === 'object' ? JSON.stringify(v[i]).slice(0, 80) : String(v[i])) + '</div>';
          }
        }
      } else {
        const vs = String(v);
        out += '<div style="color:#d8d3c0" data-varpath="' + full + '" class="hgw-var-line">' + pad + '· <span style="color:#c9a227">' + k + '</span>: <span style="color:#7fd0a8">' + App.esc(vs.length > 60 ? vs.slice(0, 60) + '…' : vs) + '</span></div>';
      }
    }
    return out;
  }
  const tree = App.$('#hgw-var-tree');
  const MODS = ['时间', '玩家', '课表', '双修', '女巫角色'];
  let fullHtml = MODS.map(m => {
    const statObj = stat[m] || {};
    const cnt = Object.keys(statObj).length;
    return '<div style="color:#e8d48b;margin:8px 0 4px;font-size:12px">' + (MODULE_ICON[m] || '📦') + ' <b>' + m + '</b> <span class="hgw-tag ghost">' + cnt + ' 字段</span></div>' + renderTree(statObj, 'stat_data.' + m, 1);
  }).join('');
  tree.innerHTML = fullHtml;
  function bindLines() {
    App.$$('.hgw-var-line', tree).forEach(el => el.addEventListener('click', async () => {
      const path = el.dataset.varpath;
      const cur = App.deepGet(stat, path.replace(/^stat_data\./, ''), '');
      const val = await App.UI.prompt({ title: '编辑变量', msg: '路径：' + path, placeholder: '新值', value: String(cur) });
      if (val == null) return;
      try {
        const patch = {};
        App.deepSet(patch, path.replace(/^stat_data\./, ''), isNaN(val) ? val : Number(val));
        await App.writeStat(patch);
        App.UI.toast('已更新 ' + path, 'ok');
        App.navigate('variables');
      } catch (e) {
        App.UI.toast('写入失败：' + e.message, 'danger');
      }
    }));
  }
  bindLines();
  // 搜索过滤
  const search = App.$('#hgw-var-search');
  if (search) search.addEventListener('input', App.debounce(() => {
    const kw = search.value.trim();
    if (!kw) { tree.innerHTML = fullHtml; bindLines(); return; }
    const lines = fullHtml.split('<div ').filter(l => l.includes(kw));
    tree.innerHTML = lines.length ? lines.map(l => '<div ' + l).join('') : App.UI.empty('🔍', '无匹配');
    bindLines();
  }, 250));
  // 快照按钮
  const snapBtn = App.$('#hgw-var-snap');
  if (snapBtn) snapBtn.addEventListener('click', async () => {
    try { localStorage.setItem(App.VAR_SNAP_KEY, JSON.stringify(await App.readStat(true))); } catch (e) { }
    App.UI.toast('快照已保存——下次进入本页显示与它的差异', 'ok');
    App.navigate('variables');
  });
  const snapClear = App.$('#hgw-var-snap-clear');
  if (snapClear) snapClear.addEventListener('click', () => {
    try { localStorage.removeItem(App.VAR_SNAP_KEY); } catch (e) { }
    App.UI.toast('快照已清除', 'warn');
    App.navigate('variables');
  });
  const exBtn = App.$('#hgw-var-export');
  if (exBtn) exBtn.addEventListener('click', async () => {
    const blob = new Blob([JSON.stringify(await App.readStat(true), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hogwarts-stat_data.json';
    a.click();
    URL.revokeObjectURL(a.href);
    App.UI.toast('stat_data 已导出', 'ok');
  });
  const imBtn = App.$('#hgw-var-import');
  if (imBtn) imBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      try {
        const text = await input.files[0].text();
        const data = JSON.parse(text);
        await App.writeStat(data.stat_data || data);
        App.UI.toast('stat_data 已导入', 'gold');
        App.navigate('variables');
      } catch (e) {
        App.UI.toast('导入失败：' + e.message, 'danger');
      }
    };
    input.click();
  });
  // —— 本功能 · AI 预设（变量更新格式的独立配置/API） ——
  const varPe = document.createElement('div');
  varPe.id = 'hgw-var-pe';
  box.appendChild(varPe);
  if (App.AI && App.AI_DEFAULTS) App.renderPresetEditor(varPe, 'variables');
});


/* ============================================================
   世界推演（Evolution）· 对齐凡人修仙传世界演化
   读取：stat_data 女巫快照（关系/标签/心声/近期经历/植入念头）+ 玩家状态 + 学年背景
   规则：每个女巫按性格标签生成「行为基调规则」（她遵从什么逻辑行动）
   提示词：evolution 预设（走向 + 每女巫幕后演化，输出 <EvolutionResult> JSON）
   写回：经历 → 女巫.近期经历（环形5）+ 履历（追加）；变化 → 白名单字段微调
   影响：报告写入 stat_data.玩家.记忆.世界推演报告 → 注入 AI 提示词（投影）
   ============================================================ */

/* 30 性格 → 行为基调规则（世界推演时她按此逻辑行动） */
App.EVO_CFG_KEY = 'HGW_EVO_CFG_V1';
App.getEvoCfg = function () {
  const dft = { auto: false, everyRounds: 5 };
  try { return Object.assign({}, dft, JSON.parse(localStorage.getItem(App.EVO_CFG_KEY) || '{}')); } catch (e) { return dft; }
};
App.saveEvoCfg = function (cfg) {
  try { localStorage.setItem(App.EVO_CFG_KEY, JSON.stringify(cfg)); } catch (e) { }
};
/* 自动演化入口：轮次数（楼层数）到达阈值 → 全员演化（对齐凡人 triggerType:'rounds' + plotEvolutionFrequency） */
App.checkAutoEvolution = async function (force) {
  const cfg = App.getEvoCfg();
  if (!cfg.auto && !force) return { ok: false, error: '自动推演未开启（推演页可设）' };
  if (!App.AI || !App.AI.enabled()) return { ok: false, error: '未配置独立 AI' };
  let msgs = [];
  try { msgs = await App.getTranscript(); } catch (e) { }
  const rounds = msgs.length;
  const prog = App.getMemAutoProgress();
  const lastEvo = prog.lastEvo || 0;
  if (!force && rounds - lastEvo < cfg.everyRounds) return { ok: true, done: false, rounds, msg: '未到演化轮次' };
  const r = await App.evolveWorld(true);
  if (r) {
    prog.lastEvo = rounds;
    App.saveMemAutoProgress(prog);
    if (!force) App.UI.toast('🌐 已自动演化世界（' + r.evo.length + ' 名女巫幕后更新）', 'magic');
  }
  return { ok: !!r, done: !!r, rounds };
};

App.EVO_RULES = {
  傲娇: '嘴上否认、行动别扭：不会主动示好，需要偶发场合或台阶才推进关系',
  大小姐: '端架子讲排场：习惯被讨好，缺一个自然的台阶，暗中注意你的态度',
  学霸: '理性规划时间表：被难题与知识吸引，日程之外的偶遇需要理由',
  元气: '精力充沛自来熟：热闹场合与偶遇的常客，行动积极但不越界',
  运动: '好胜直来直去：训练场是主场，输赢都要当面说清',
  倔强: '认死理不服软：冲突后需要台阶，或硬碰硬分出对错',
  好胜: '凡事想赢：输给你之后会惦记着再约一场，赢面心态驱动行动',
  孤僻: '回避人群独处角落：接近需要慢与理由，警惕心重',
  神秘: '行踪不定话留半截：线索零碎，行动难以预测但有内在逻辑',
  温柔: '照顾人被动回应：先观察对方需要，行动温和且慢',
  依存: '黏人缺乏安全感：关系升温快，但也容易患得患失',
  天然呆: '迟钝慢半拍：误会产生，行动常常后知后觉',
  冰山: '冷淡克制：需要长期破冰，偶发的破绽是突破口',
  女王: '掌控欲强：喜欢支配与服从游戏，被挑战会激起兴趣',
  冷静: '理性评估得失：行动有预谋，不会冲动行事',
  沉稳: '稳扎稳打不冒险：行动保守但可靠',
  顺从: '服从性强：被要求时配合度高，但内心记账',
  敏感: '情绪波动大：易受伤也易感动，小事的积累决定态度',
  活泼: '话多爱笑八卦中心：消息灵通，主动搭话频率高',
  叛逆: '唱反调不服管：吃软不吃硬，越压越反',
  病娇: '占有欲极端：嫉妒驱动行动，容易做出出格的事',
  母性: '照顾成瘾：喜欢被依赖，会主动关心你的起居',
  偶像: '注意形象：人前人后两副面孔，私下行动谨慎',
  控制狂: '安排一切不能失控：计划被打乱会焦躁，行动都在布局内',
  毒舌: '嘴上不饶人行动诚实：骂归骂，事照做',
  腹黑: '表面温和暗地算计：行动都有目的，擅长借刀',
  利己: '利益优先：交情建立在价值上，行动跟着利益走',
  热情: '情感外放：好感表达直接，行动主动热烈',
  浪漫: '仪式感驱动：细节控，行动围绕纪念与氛围',
  现实: '务实计较得失：行动前算清账，投入要有回报',
};

/* 构建每女巫的行为规则段（她遵从什么提示词） */
function buildEvoRuleLines(chars) {
  const lines = [];
  for (const n in chars) {
    const c = chars[n] || {};
    const tags = c.性格标签 || [];
    const rules = tags.map(t => App.EVO_RULES[t.replace(/型$/, '')] || null).filter(Boolean);
    lines.push('【' + n + '】行为基调：' + (rules.length ? rules.join('；') : '按她的身份与处境合理行动'));
  }
  return lines;
}

/* 构建女巫快照（读哪些：关系四轴/标签/心声/植入/近期经历） */
function buildEvoSnapshots(chars) {
  const out = [];
  for (const n in chars) {
    const c = chars[n] || {};
    const imp = (c.被植入念头 || []).filter(x => x && x.阶段 && x.阶段 !== '生效').map(x => x.性癖 + '(' + x.阶段 + ')');
    const rec = (c.近期经历 || []).slice(-2).map(x => x.内容).filter(Boolean);
    out.push({
      女巫: n,
      '学院/身份': (c.学院 || '') + '/' + (c.身份 || ''),
      '性格标签': (c.性格标签 || []).join('、'),
      '性癖标签': (c.性癖标签 || []).slice(0, 4).join('、'),
      '好感': c.好感度 || 0, '服气': c.缴械值 || 0, '堕落': c.堕落值 || 0, '积压': c.欲望积压 || 0,
      '压力': c.压力值 || 0, '信任裂痕': c.信任裂痕 || 0,
      '植入念头': imp.length ? imp.join('、') : '',
      '近期经历': rec.length ? rec.join('；') : '',
      '心声': String(c.心声 || '').slice(0, 60),
    });
  }
  return out;
}

/* 演化世界：调用 evolution 预设 → 解析 <EvolutionResult> → 写回 stat_data（silent=自动触发静默） */
App.evolveWorld = async function (silent) {
  const stat = await App.readStat(true);
  const chars = stat.女巫角色 || {};
  if (!Object.keys(chars).length) { if (!silent) App.UI.toast('还没有女巫角色', 'warn'); return null; }
  if (!App.AI.enabled()) { if (!silent) App.UI.toast('未配置独立 AI——请先在功能预设或 AI 配置页设置 API', 'warn'); return null; }
  const pre = App.AI.getPreset('evolution');
  if (!pre.enabled) { if (!silent) App.UI.toast('世界推演预设已关闭（可在本页底部开启）', 'warn'); return null; }
  if (!silent) App.UI.toast('世界演化中（独立 AI）：全员快照 → 逻辑链推演 → 写回经历…', 'magic');

  const t = stat.时间 || {};
  const arc = App.STORY_ARC[t.学年 || 1] || { 名: '霍格沃茨', 描述: '' };
  const snaps = buildEvoSnapshots(chars);
  const rules = buildEvoRuleLines(chars);
  const payload = [
    '【时间】' + (t.日期 || '') + ' ｜ ' + (t.学期描述 || '') + ' ｜ 篇目：' + arc.名,
    '【上次推演距现在】' + ((stat.玩家 || {}).记忆 || {}).世界推演报告 && ((stat.玩家 || {}).记忆 || {}).世界推演报告.length ? '已有历次报告见下' : '首次推演',
    '【玩家】阶位' + App.realmName(stat) + ' 好感关系：' + Object.keys(chars).join('、'),
    '',
    '【每个女巫的档案快照（你的信息来源，禁止全知视角）】',
    ...snaps.map(s => JSON.stringify(s, null, 1)),
    '',
    '【每个女巫的行为规则（她遵从的逻辑）】',
    ...rules,
  ].join('\n');
  const r = await App.AI.chatWith('evolution', payload);
  if (!r.ok) { App.UI.toast('推演失败：' + r.error, 'danger'); return null; }

  // 解析 <EvolutionResult> JSON
  const m = r.text.match(/<EvolutionResult>([\s\S]*?)<\/EvolutionResult>/i);
  let evo = [];
  if (m) { try { const d = JSON.parse(m[1].trim()); evo = Array.isArray(d) ? d : []; } catch (e) { evo = []; } }
  const WHITE = { 好感度: 1, 堕落值: 1, 欲望积压: 1, 压力值: 1 };
  const applied = [];
  for (const item of evo) {
    const name = item && item.女巫;
    const ch = chars[name];
    if (!name || !ch) continue;
    // 写回经历：近期经历（环形5）+ 履历（追加）
    const timeTag = (t.日期 || '') + '·' + (t.时段 || '');
    if (item.经历) {
      const rec = ch.近期经历 || [];
      rec.unshift({ 时间: timeTag, 内容: String(item.经历).slice(0, 300) });
      ch.近期经历 = rec.slice(0, 5);
      const bio = ch.履历 || [];
      bio.push({ 时间: timeTag, 内容: String(item.经历).slice(0, 300) });
      ch.履历 = bio.slice(-50);
    }
    // 写回变化（白名单 + ±10 内）
    if (Array.isArray(item.变化)) {
      for (const chg of item.变化) {
        const f = chg && chg.字段, v = Number(chg && chg.值);
        if (!f || !(f in WHITE) || isNaN(v)) continue;
        const old = Number(ch[f]) || 0;
        const d = Math.round(v - old);
        if (Math.abs(d) > 10) continue; // 超限拒绝
        ch[f] = App.clamp(old + d, 0, 100);
        applied.push(name + '.' + f + ' ' + (d > 0 ? '+' : '') + d + '（' + old + '→' + ch[f] + '）');
      }
    }
  }
  await App.writeStat({ 女巫角色: chars });

  // 报告入库：玩家.记忆.世界推演报告（环形 3）
  const 走向 = r.text.replace(/<EvolutionResult>[\s\S]*?<\/EvolutionResult>/gi, '').trim().slice(0, 900);
  const actLines = evo.map(x => x.女巫 + '：' + String(x.经历 || '').slice(0, 80)).join('\n');
  const st2 = await App.readStat(true);
  st2.玩家 = st2.玩家 || {};
  st2.玩家.记忆 = st2.玩家.记忆 || { 长期档案: {}, 世界推演报告: [] };
  const reports = st2.玩家.记忆.世界推演报告 || [];
  reports.unshift({ 时间: (t.日期 || '') + '·' + (t.学期描述 || ''), 内容: (走向.slice(0, 300) + '\n女巫行动：\n' + actLines).slice(0, 700) });
  st2.玩家.记忆.世界推演报告 = reports.slice(0, 3);
  await App.writeStat({ 玩家: { 记忆: st2.玩家.记忆 } });

  return { text: r.text, evo, applied, 走向, actLines };
};

App.registerView('evolution', async function (box) {
  const stat = await App.readStat();
  const msgs = await App.getTranscript();
  const t = stat.时间 || {};
  const year = t.学年 || 1;
  const arc = App.STORY_ARC[year] || { 名: '霍格沃茨', 描述: '' };
  const chars = stat.女巫角色 || {};
  const snaps = buildEvoSnapshots(chars);

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🌐</span>世界推演<span class="sub">女巫幕后演化 · 剧情走向</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:12px">对齐凡人世界演化：<b>读取</b>每个女巫的档案快照（关系四轴/性格性癖标签/心声/植入念头/近期经历）→ 按她的<b>行为规则</b>构建「长期目标→短期动机→当前行动」逻辑链，推演她这段时间在做什么 → <b>写回</b>她的近期经历/履历与状态变化 → 报告<b>注入 AI 提示词</b>，她之后的行动遵从这些幕后经历。全部走同层 stat_data，不依赖世界书。</div>';

  // 状态卡
  h += '<div class="hgw-grid cols-3" style="margin-bottom:12px">';
  h += '<div class="hgw-stat-card"><div class="num">' + App.esc(arc.名) + '</div><div class="lbl">当前篇目</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + msgs.length + '</div><div class="lbl">聊天楼层</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + Object.keys(chars).length + '</div><div class="lbl">演化女巫（全员）</div></div>';
  h += '</div>';

  // —— 自动推演设置（对齐凡人 triggerType:'rounds' + plotEvolutionFrequency） ——
  const evoCfg = App.getEvoCfg();
  const roundsNow = msgs.length;
  const nextEvo = Math.max(0, evoCfg.everyRounds - ((roundsNow - (App.getMemAutoProgress().lastEvo || 0)) % evoCfg.everyRounds));
  h += '<div class="hgw-card" style="margin-bottom:12px"><div class="card-title"><span>⚙️</span>自动推演<span class="hgw-tag magic" style="margin-left:8px">按轮次自动演化全员</span></div><div class="card-body">';
  h += '<div class="hgw-field"><label>自动演化：每 <input class="hgw-input" id="hgw-evo-every" type="number" min="1" max="50" value="' + evoCfg.everyRounds + '" style="width:70px;display:inline-block"> 轮（楼层）自动演化一次全员</label></div>';
  h += '<div class="hgw-field"><label>启用自动推演（到达轮次自动调用，无需手动）</label><label class="hgw-check"><input type="checkbox" id="hgw-evo-auto"' + (evoCfg.auto ? ' checked' : '') + '><span>开启</span></label></div>';
  h += '<div style="display:flex;gap:8px"><button class="hgw-btn ok" id="hgw-evo-cfg-save">💾 保存设置</button><span class="hgw-tag ghost" style="align-self:center">距下次自动演化约 ' + nextEvo + ' 轮</span></div>';
  h += '</div></div>';

  // 女巫快照（读哪些）
  h += '<div class="hgw-card" style="margin-bottom:12px"><div class="card-title"><span>👥</span>女巫快照<span class="hgw-tag ghost" style="margin-left:8px">演化读取的 stat_data 数据</span></div>';
  h += '<div class="card-body" style="max-height:240px;overflow-y:auto;font-size:11px;line-height:1.9">';
  if (!snaps.length) h += '<span class="hgw-text-faint">暂无女巫</span>';
  for (const s of snaps) {
    h += '<div style="border-bottom:1px dashed rgba(200,180,120,.15);padding:6px 0">' +
      '<strong class="hgw-text-gold">' + App.esc(s.女巫) + '</strong> ' + App.esc(s['学院/身份']) +
      ' ｜ 好' + s.好感 + ' 服' + s.服气 + ' 堕' + s.堕落 + ' 压' + s.积压 +
      '<div style="color:#9aa7b8">性格：' + App.esc(s['性格标签']) + ' ｜ 性癖：' + App.esc(s['性癖标签']) + '</div>' +
      (s['植入念头'] ? '<div style="color:#d48a9a">念头发酵：' + App.esc(s['植入念头']) + '</div>' : '') +
      (s['近期经历'] ? '<div style="color:#7fd0a8">最近：' + App.esc(s['近期经历']) + '</div>' : '') +
      '</div>';
  }
  h += '</div></div>';

  // 演化行为规则（她遵从什么）
  h += '<div class="hgw-card" style="margin-bottom:12px"><div class="card-title"><span>📜</span>行为规则<span class="hgw-tag ghost" style="margin-left:8px">她按此逻辑行动</span></div>';
  h += '<div class="card-body" style="font-size:11px;max-height:150px;overflow-y:auto">' +
    buildEvoRuleLines(chars).map(x => '<div style="margin-bottom:3px">· ' + App.esc(x) + '</div>').join('') +
    '</div></div>';

  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">';
  h += '<button class="hgw-btn magic lg" id="hgw-evo-run">🌐 演化世界（独立 AI：快照→逻辑链→写回）</button>';
  h += '<button class="hgw-btn" id="hgw-evo-refresh">🔄 刷新</button>';
  h += '</div>';
  h += '<div id="hgw-evo-report"></div>';
  h += '</div>';
  box.innerHTML = h;

  // —— 本功能 · AI 预设（世界推演的独立提示词/格式/温度/API） ——
  const evoPe = document.createElement('div');
  evoPe.id = 'hgw-evo-pe';
  box.appendChild(evoPe);
  if (App.AI && App.AI_DEFAULTS) App.renderPresetEditor(evoPe, 'evolution');

  const runBtn = App.$('#hgw-evo-run');
  if (runBtn) runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    runBtn.textContent = '演化中…';
    const res = await App.evolveWorld();
    const box2 = App.$('#hgw-evo-report');
    if (box2 && res) {
      const 走向 = res.走向 ? res.走向.split('\n').filter(Boolean).slice(0, 12).map(x => '· ' + App.esc(x)).join('<br>') : '';
      let evoHtml = '';
      for (const item of res.evo) {
        if (!item || !item.女巫) continue;
        evoHtml += '<div style="border-bottom:1px dashed rgba(200,180,120,.15);padding:8px 0"><strong class="hgw-text-gold">' + App.esc(item.女巫) + '</strong>：' + App.esc(String(item.经历 || '').slice(0, 220)) + '</div>';
      }
      const appliedHtml = res.applied.length
        ? '<div class="card-foot"><span class="hgw-tag ok">已写回：' + App.esc(res.applied.join('；')) + '</span><span class="hgw-tag gold">经历已入近期/履历</span></div>'
        : '<div class="card-foot"><span class="hgw-tag gold">经历已写回近期/履历（无白名单数值变化）</span></div>';
      box2.innerHTML = '<div class="hgw-card gold-border hgw-fade-in"><div class="card-title"><span>🌐</span>演化报告（已注入 AI 提示词）</div>' +
        '<div class="card-body hgw-note" style="white-space:pre-wrap;font-size:11px">' + (走向 || '（无走向文本）') + '</div>' +
        '<div class="card-body"><div class="card-title" style="font-size:12px;margin-bottom:6px"><span>👥</span>女巫幕后行动（写回近期经历/履历）</div>' + (evoHtml || '<span class="hgw-text-faint">未解析到演化结果</span>') + '</div>' +
        appliedHtml + '</div>';
    } else if (box2) {
      box2.innerHTML = App.UI.empty('⚠️', '演化未完成（见提示）');
    }
    runBtn.disabled = false;
    runBtn.textContent = '🌐 演化世界（独立 AI：快照→逻辑链→写回）';
  });
  const refBtn = App.$('#hgw-evo-refresh');
  if (refBtn) refBtn.addEventListener('click', () => App.navigate('evolution'));
  const evoCfgSave = App.$('#hgw-evo-cfg-save');
  if (evoCfgSave) evoCfgSave.addEventListener('click', () => {
    const cfg = App.getEvoCfg();
    cfg.everyRounds = parseInt((App.$('#hgw-evo-every') || {}).value) || 5;
    cfg.auto = !!App.$('#hgw-evo-auto').checked;
    App.saveEvoCfg(cfg);
    App.UI.toast('自动推演已' + (cfg.auto ? '开启（每 ' + cfg.everyRounds + ' 轮）' : '关闭'), cfg.auto ? 'ok' : 'warn');
  });
});

/* ============================================================
   正文优化（Optimize）
   对最近的剧情生成摘要/要点，作为上下文压缩与记忆提交
   对齐系统模拟器 正文优化：优化发送前的正文
   ============================================================ */
App.registerView('optimize', async function (box) {
  const msgs = await App.getTranscript();
  const stat = await App.readStat();
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>✂️</span>正文优化<span class="sub">摘要压缩 · 记忆归档 · 发送优化</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:12px">聊天过长会稀释注意力。把最近的剧情压缩成摘要提交给 AI，让它"记住重点、轻装前行"——摘要会进入记忆库并作为行动发送。</div>';

  const recent = msgs.slice(-10);
  h += '<div class="hgw-grid cols-2" style="margin-bottom:12px">';
  h += '<div class="hgw-card"><div class="card-title"><span>📜</span>最近剧情</div><div class="card-body" style="font-size:11px;line-height:1.8;max-height:200px;overflow-y:auto">' +
    (recent.length ? recent.map(m => '<div style="margin-bottom:4px"><span class="hgw-tag">' + (m.role === 'user' ? '你' : (m.name || '她')) + '</span>' + App.esc(String(m.message || '').slice(0, 80)) + '</div>').join('') : '<span class="hgw-text-faint">暂无聊天记录</span>') +
    '</div></div>';
  h += '<div class="hgw-card"><div class="card-title"><span>🧠</span>可归档的记忆</div><div class="card-body" style="font-size:11px;line-height:1.8;max-height:200px;overflow-y:auto">' +
    '<div>' + App.UI.bar(msgs.length, 'gold', '总楼层', true) + '</div>' +
    '<div>' + App.UI.bar(recent.length, 'green', '本次压缩范围', true) + '</div>' +
    '<div style="margin-top:8px"><strong class="hgw-text-gold">压缩策略：</strong>近 10 层 → 摘要；更早的由 AI 通过变量更新规则归档。</div></div></div>';
  h += '</div>';

  h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
  h += '<button class="hgw-btn ok" id="hgw-opt-summary" ' + (recent.length ? '' : 'disabled') + '>📝 生成摘要并提交</button>';
  h += '<button class="hgw-btn magic" id="hgw-opt-ask">🧠 让 AI 总结当前局势</button>';
  h += '</div>';
  h += '</div>';
  box.innerHTML = h;

  // —— 本功能 · AI 预设（正文压缩的独立提示词/格式/温度） ——
  const optPe = document.createElement('div');
  optPe.id = 'hgw-opt-pe';
  box.appendChild(optPe);
  if (App.AI && App.AI_DEFAULTS) App.renderPresetEditor(optPe, 'optimize');

  const sumBtn = App.$('#hgw-opt-summary');
  if (sumBtn) sumBtn.addEventListener('click', async () => {
    const lines = recent.map(m => (m.role === 'user' ? '我' : (m.name || '她')) + '：' + String(m.message || '').replace(/【[^】]*结算】/g, '').slice(0, 120));
    const summary = '【正文优化·剧情摘要】请把以下近期剧情要点纳入长期记忆（压缩后继续推进，勿复述全文）：\n' + lines.join('\n');
    if (App.AI && App.AI.enabled()) {
      const r = await App.AI.chatWith('optimize', summary);
      if (r.ok) {
        App.addMemory('总结', '剧情压缩：' + r.text.slice(0, 150));
        App.UI.toast('独立 AI 已压缩剧情', 'ok');
      } else await App.sendAction(summary);
    } else {
      await App.sendAction(summary);
    }
    App.addMemory('总结', '剧情摘要已提交（' + new Date().toLocaleTimeString('zh-CN') + '，覆盖 ' + recent.length + ' 层）');
    App.UI.toast('摘要已提交，AI 将压缩记忆继续推进', 'ok');
  });
  const askBtn = App.$('#hgw-opt-ask');
  if (askBtn) askBtn.addEventListener('click', async () => {
    await App.sendAction('（请简要总结当前局势：我在哪里、正在做什么、与哪些人的关系如何、接下来该往哪个方向走）');
    App.UI.toast('已请 AI 总结当前局势', 'magic');
  });
});
