/* ============================================================
   霍格沃茨 · 同层应用 突破视图 + 大事记 + 存档 + 设置
   ============================================================ */
'use strict';

/* ========== 突破视图 ========== */
App.registerView('breakthrough', async function (box) {
  const stat = await App.readStat();
  const rp = (stat.玩家 && stat.玩家.魔力阶位) || {};
  const p = stat.玩家 || {};
  const mp = (p.属性 && p.属性.魔力值) || 0;
  const pots = p.魔药 || {};
  const gate = App.REALM_GATE[App.clamp((rp.大境界 || 1) - 1, 0, 8)][(rp.层 || 1) - 1];
  const cur = App.realmName(stat);
  const nextRealm = (rp.层 || 1) >= 3 ? (App.REALMS[Math.min(8, (rp.大境界 || 1))] || '顶峰') + '·1' : cur.split('·')[0] + '·' + ((rp.层 || 1) + 1);
  const conds = [
    ['层进度 100', (rp.层进度 || 0) >= 100, (rp.层进度 || 0) + '%'],
    ['魔力值 ≥ ' + gate, mp >= gate, mp + ''],
    ['突破魔药 ×1', (pots.突破魔药 || 0) >= 1, '×' + (pots.突破魔药 || 0)],
  ];
  const allOk = conds.every(c => c[1]);
  const inProgress = rp.心魔状态 === '心魔期' || rp.心魔状态 === '突破中';

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>💠</span>魔力突破<span class="sub">' + cur + ' → ' + nextRealm + '</span></div>';
  h += '<div class="hgw-grid cols-3" style="margin-bottom:14px">';
  h += '<div class="hgw-stat-card"><div class="num">' + (rp.大境界 || 1) + '</div><div class="lbl">大境界</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (rp.层 || 1) + '</div><div class="lbl">层</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (rp.层进度 || 0) + '%</div><div class="lbl">层进度</div></div>';
  h += '</div>';
  h += '<div class="hgw-list">';
  for (const [label, ok, val] of conds) {
    h += '<div class="hgw-row' + (ok ? ' sel' : '') + '"><span class="hgw-badge ' + (ok ? 'ok' : 'ghost') + '">' + (ok ? '✓' : '✗') + '</span><span>' + label + '</span><span class="hgw-muted" style="margin-left:auto">' + val + '</span></div>';
  }
  h += '</div>';
  h += '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">';
  if (inProgress) {
    h += '<button class="hgw-btn magic" id="hgw-brk-resolve">🎭 心魔演出中——成功后点此确认</button>';
    h += '<button class="hgw-btn danger" id="hgw-brk-fail">💔 突破失败</button>';
    h += '<span class="hgw-note">心魔剧情由 AI 在正文中演出（见阶位条目），面板只负责判定与写回。</span>';
  } else {
    h += '<button class="hgw-btn ok lg" id="hgw-brk-go" ' + (allOk ? '' : 'disabled') + '>💠 开始突破' + (allOk ? '' : '（条件未满足）') + '</button>';
    h += '<span class="hgw-note">' + (rp.心魔状态 || '') + ' ｜ 突破需要：层进度100 + 魔力达标 + 突破魔药×1。突破剧情由 AI 按阶位条目演出心魔。</span>';
  }
  h += '</div></div>';

  // 突破记录
  const recs = rp.突破记录 || [];
  if (recs.length) {
    h += '<div class="hgw-panel"><div class="panel-title"><span>📜</span>突破记录</div><div class="hgw-list">';
    for (const r of recs) {
      h += '<div class="hgw-row"><span class="hgw-badge gold">' + r.从 + '</span><span>→</span><span class="hgw-badge ok">' + r.到 + '</span><span class="hgw-muted" style="margin-left:auto">' + (r.日期 || '') + '</span></div>';
    }
    h += '</div></div>';
  }

  // 境界总览
  h += '<div class="hgw-panel"><div class="panel-title"><span>🏔️</span>九大境界</div><div class="hgw-timeline">';
  for (let i = 8; i >= 0; i--) {
    const done = (rp.大境界 || 1) - 1 > i;
    const now = (rp.大境界 || 1) - 1 === i;
    h += '<div class="hgw-tl-item ' + (done ? 'done' : (now ? 'now' : '')) + '">';
    h += '<div class="tl-title">' + App.REALMS[i] + (now ? ' <span class="hgw-badge warn">当前</span>' : (done ? ' <span class="hgw-badge ok">已突破</span>' : '')) + '</div>';
    h += '<div class="tl-sub">' + ['学徒期·烛火初燃', '正式学徒·液态核心', '正式巫师·经脉贯通', '熟练巫师·精准掌控', '精英巫师·纯净如水银', '大师·魔力结晶', '宗师·魔力化形', '传奇·领域规则', '神话·魔力本源'][i] + '</div>';
    h += '</div>';
  }
  h += '</div></div>';

  box.innerHTML = h;
  const go = App.$('#hgw-brk-go');
  if (go) go.addEventListener('click', doBreakthrough);
  const res = App.$('#hgw-brk-resolve');
  if (res) res.addEventListener('click', () => resolveBreakthrough(true));
  const fail = App.$('#hgw-brk-fail');
  if (fail) fail.addEventListener('click', () => resolveBreakthrough(false));
});

/* ========== 突破逻辑 ========== */
async function doBreakthrough() {
  const stat = await App.readStat(true);
  const rp = (stat.玩家 && stat.玩家.魔力阶位) || {};
  const p = stat.玩家 || {};
  const mp = (p.属性 && p.属性.魔力值) || 0;
  const pots = p.魔药 || {};
  const gate = App.REALM_GATE[App.clamp((rp.大境界 || 1) - 1, 0, 8)][(rp.层 || 1) - 1];
  if (rp.心魔状态 === '心魔期' || rp.心魔状态 === '突破中') { App.UI.toast('正在突破中——心魔剧情演出中', 'warn'); return; }
  if ((rp.层进度 || 0) < 100) { App.UI.toast('层进度未满', 'warn'); return; }
  if (mp < gate) { App.UI.toast('魔力不足：需 ' + gate, 'warn'); return; }
  if ((pots.突破魔药 || 0) < 1) { App.UI.toast('需要突破魔药×1', 'warn'); return; }
  pots.突破魔药 -= 1;
  await App.writeStat({ 玩家: { 魔药: pots, 魔力阶位: { 心魔状态: '心魔期', 突破进度: 100 } } });
  await App.sendAction('【突破结算】开始突破：' + App.realmName(stat) + ' → 下一层 ｜ 消耗突破魔药×1 ｜ 心魔状态=心魔期 ｜ 请按阶位条目演出突破仪式与心魔剧情，成功后确认突破');
  App.addLog('break', '开始突破：' + App.realmName(stat));
  App.UI.spellFlash('purple');
  App.UI.toast('💠 突破开始——心魔剧情由 AI 演出', 'magic');
  App.navigate('breakthrough');
}
App.doBreakthrough = doBreakthrough;

async function resolveBreakthrough(success) {
  const stat = await App.readStat(true);
  const rp = (stat.玩家 && stat.玩家.魔力阶位) || {};
  if (success) {
    let realm = rp.大境界 || 1;
    let layer = rp.层 || 1;
    const from = App.realmName(stat);
    layer += 1;
    if (layer > 3) { layer = 1; realm += 1; }
    const rec = rp.突破记录 || [];
    rec.push({ 日期: (stat.时间 || {}).日期 || '', 从: from, 到: App.REALMS[App.clamp(realm - 1, 0, 8)] + '·' + layer, 心魔: '已渡过' });
    await App.writeStat({
      玩家: { 魔力阶位: { 大境界: Math.min(9, realm), 层: layer, 层进度: 0, 突破进度: 0, 心魔状态: '无', 突破记录: rec } },
    });
    await App.sendAction('（突破成功：' + from + ' → ' + App.REALMS[App.clamp(realm - 1, 0, 8)] + '·' + layer + '）');
    App.addLog('break', '突破成功：' + from + ' → ' + App.REALMS[App.clamp(realm - 1, 0, 8)] + '·' + layer);
    App.UI.confetti(60);
    App.UI.toast('🎉 突破成功！' + App.REALMS[App.clamp(realm - 1, 0, 8)] + '·' + layer, 'gold');
  } else {
    await App.writeStat({ 玩家: { 魔力阶位: { 心魔状态: '无', 突破进度: Math.max(0, (rp.突破进度 || 0) - 40) } } });
    await App.sendAction('（突破失败——突破进度-40）');
    App.addLog('break', '突破失败：进度-40');
    App.UI.toast('💔 突破失败——突破进度-40', 'danger');
  }
  await App.refreshTopbar();
  App.navigate('breakthrough');
}
App.resolveBreakthrough = resolveBreakthrough;

/* ========== 大事记视图 ========== */
App.registerView('log', async function (box) {
  const local = App.loadLog();
  const typeMeta = {
    battle: ['⚔️ 决斗', 'type-battle'],
    love: ['💗 亲密', 'type-love'],
    brew: ['🧪 炼药', 'type-brew'],
    break: ['💠 突破', 'type-break'],
    social: ['📜 事件', 'type-social'],
  };
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>📖</span>大事记<span class="sub">本地行为记录 · ' + local.length + ' 条</span></div>';
  if (!local.length) {
    h += App.UI.empty('📖', '还没有记录——决斗、亲密、炼药、突破都会写进这里。');
  } else {
    h += '<div class="hgw-list">';
    for (const l of local.slice(0, 80)) {
      const meta = typeMeta[l.type] || ['📌', 'type-social'];
      h += '<div class="hgw-log-item ' + meta[1] + '"><span class="li-time">' + App.esc(l.time) + '</span><span class="li-type">' + meta[0] + '</span><span class="li-body">' + App.esc(l.text) + '</span></div>';
    }
    h += '</div>';
  }
  h += '</div>';
  box.innerHTML = h;
});

/* ========== 存档视图 ========== */
App.registerView('save', async function (box) {
  const stat = await App.readStat();
  const t = stat.时间 || {};
  let saves = [];
  try { saves = JSON.parse(localStorage.getItem(App.SAVE_KEY) || '[]'); } catch (e) { saves = []; }

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>💾</span>存档管理<span class="sub">游戏状态 = stat_data（MVU 唯一事实源）；此处为本地快照备份</span></div>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">';
  h += '<button class="hgw-btn ok" id="hgw-save-new">💾 存档当前状态</button>';
  h += '<button class="hgw-btn magic" id="hgw-save-export">📤 导出存档（JSON）</button>';
  h += '<button class="hgw-btn" id="hgw-save-import">📥 导入存档</button>';
  h += '</div>';
  h += '<div class="hgw-note" style="margin-bottom:10px">当前：' + App.esc(t.日期 + ' · ' + (t.学期描述 || '')) + ' ｜ 女巫 ' + Object.keys(stat.女巫角色 || {}).length + ' 人</div>';
  if (!saves.length) {
    h += App.UI.empty('💾', '暂无本地存档。');
  } else {
    h += '<div class="hgw-list">';
    saves.forEach((s, i) => {
      h += '<div class="hgw-save-card" data-save="' + i + '">';
      h += '<div class="sv-ava">🗂️</div>';
      h += '<div class="sv-meta"><div class="sv-name">' + App.esc(s.name || '存档 ' + (i + 1)) + '</div>';
      h += '<div class="sv-time">' + App.esc(s.savedAt || '') + '</div>';
      h += '<div class="sv-info">' + App.esc((s.stat && s.stat.时间 && s.stat.时间.日期) || '') + ' ｜ 女巫 ' + (s.stat && s.stat.女巫角色 ? Object.keys(s.stat.女巫角色).length : 0) + ' 人</div></div>';
      h += '<div style="display:flex;gap:6px;margin-left:auto">';
      h += '<button class="hgw-btn sm ok" data-load="' + i + '">载入</button>';
      h += '<button class="hgw-btn sm danger" data-del="' + i + '">删</button>';
      h += '</div></div>';
    });
    h += '</div>';
  }
  h += '</div>';
  box.innerHTML = h;

  const newBtn = App.$('#hgw-save-new');
  if (newBtn) newBtn.addEventListener('click', async () => {
    const name = await App.UI.prompt({ title: '存档命名', msg: '给这个存档起个名字', placeholder: '如：1991年秋·初入霍格沃茨', value: '存档 ' + (saves.length + 1) });
    if (name == null) return;
    const snap = JSON.parse(JSON.stringify(await App.readStat(true)));
    saves.unshift({ name: name || '存档 ' + (saves.length + 1), savedAt: App.now(), stat: snap });
    saves = saves.slice(0, 12);
    localStorage.setItem(App.SAVE_KEY, JSON.stringify(saves));
    App.UI.toast('已存档', 'ok');
    App.navigate('save');
  });
  App.$$('[data-load]', box).forEach(el => el.addEventListener('click', async () => {
    const s = saves[parseInt(el.dataset.load)];
    if (!s || !s.stat) return;
    if (!(await App.UI.confirm({ title: '载入存档', msg: '确定载入「' + s.name + '」吗？', sub: '当前状态将被存档覆盖（可先手动存一份）', icon: 'ok' }))) return;
    await App.writeStat(s.stat);
    App.UI.toast('已载入：' + s.name, 'gold');
    App.navigate('home');
  }));
  App.$$('[data-del]', box).forEach(el => el.addEventListener('click', async () => {
    if (!(await App.UI.confirm({ title: '删除存档', msg: '确定删除该存档？', icon: 'danger', okText: '删除' }))) return;
    saves.splice(parseInt(el.dataset.del), 1);
    localStorage.setItem(App.SAVE_KEY, JSON.stringify(saves));
    App.UI.toast('已删除', 'warn');
    App.navigate('save');
  }));
  const ex = App.$('#hgw-save-export');
  if (ex) ex.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(await_export(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hogwarts-save-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    App.UI.toast('存档已导出', 'ok');
  });
  const im = App.$('#hgw-save-import');
  if (im) im.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      try {
        const text = await input.files[0].text();
        const data = JSON.parse(text);
        await App.writeStat(data.stat || data);
        App.UI.toast('存档已导入', 'gold');
        App.navigate('home');
      } catch (e) {
        App.UI.toast('导入失败：' + e.message, 'danger');
      }
    };
    input.click();
  });
  async function await_export() {
    return { app: 'hogwarts-same-floor', version: 1, exportedAt: App.now(), stat: await App.readStat(true) };
  }
});

/* ========== 设置视图 ========== */
App.registerView('settings', async function (box) {
  const stat = await App.readStat();
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>⚙️</span>设置<span class="sub">界面 · 数据 · 玩法说明</span></div>';

  // 显示
  h += '<div class="hgw-settings-row"><span class="sr-icon">🖥️</span><div><div class="sr-title">显示原生楼层</div><div class="sr-desc">切换应用界面与酒馆原生消息显示（逃生开关）</div></div><div class="sr-action"><button class="hgw-btn ghost sm" id="hgw-set-toggle">切换</button></div></div>';
  h += '<div class="hgw-settings-row"><span class="sr-icon">🔔</span><div><div class="sr-title">通知音效</div><div class="sr-desc">结算/高潮/突破时的提示音</div></div><div class="sr-action"><label class="hgw-switch"><input type="checkbox" id="hgw-set-sound"' + (App.cfg.sound ? ' checked' : '') + '><span class="slider"></span></label></div></div>';
  h += '<div class="hgw-settings-row"><span class="sr-icon">🎆</span><div><div class="sr-title">特效</div><div class="sr-desc">飘字/金粉/闪光等动画效果</div></div><div class="sr-action"><label class="hgw-switch"><input type="checkbox" id="hgw-set-fx"' + (App.cfg.fx !== false ? ' checked' : '') + '><span class="slider"></span></label></div></div>';
  const ws = (stat.玩家 || {}).文风强度 || 2;
  h += '<div class="hgw-settings-row"><span class="sr-icon">🔥</span><div><div class="sr-title">文风强度</div><div class="sr-desc">亲密/改造描写的露骨度上限（1 含蓄 · 2 露骨 · 3 极端崩坏）</div></div><div class="sr-action"><select class="hgw-sel" id="hgw-set-style" style="width:90px"><option value="1"' + (ws === 1 ? ' selected' : '') + '>1 含蓄</option><option value="2"' + (ws === 2 ? ' selected' : '') + '>2 露骨</option><option value="3"' + (ws === 3 ? ' selected' : '') + '>3 极端</option></select></div></div>';
  h += '<div class="hgw-settings-row"><span class="sr-icon">🧠</span><div><div class="sr-title">记忆自动总结</div><div class="sr-desc">每有新楼层到达，自动用大总结提示词压缩入库（需已配置独立 AI）</div></div><div class="sr-action"><label class="hgw-switch"><input type="checkbox" id="hgw-set-memauto"' + (App.cfg.memoryAuto ? ' checked' : '') + '><span class="slider"></span></label></div></div>';

  // 数据维护
  h += '<div class="hgw-settings-row"><span class="sr-icon">🗓️</span><div><div class="sr-title">生成课表</div><div class="sr-desc">按欲望积压生成今日四时段场次</div></div><div class="sr-action"><button class="hgw-btn ok sm" id="hgw-set-gen">执行</button></div></div>';
  h += '<div class="hgw-settings-row"><span class="sr-icon">🌙</span><div><div class="sr-title">推进一天</div><div class="sr-desc">时间+状态衰减（积压↑/堕落回落/体力恢复）+新课表</div></div><div class="sr-action"><button class="hgw-btn magic sm" id="hgw-set-day">执行</button></div></div>';
  h += '<div class="hgw-settings-row"><span class="sr-icon">🔄</span><div><div class="sr-title">重读状态</div><div class="sr-desc">强制从 stat_data 重新读取并刷新界面</div></div><div class="sr-action"><button class="hgw-btn ghost sm" id="hgw-set-reload">执行</button></div></div>';
  h += '<div class="hgw-settings-row"><span class="sr-icon">🧙</span><div><div class="sr-title">重新引导</div><div class="sr-desc">重开「分院仪式·角色创建」向导（重设人设/属性/天赋/魔咒/道具/时间）</div></div><div class="sr-action"><button class="hgw-btn magic sm" id="hgw-set-guide">打开引导</button></div></div>';

  // 玩法说明
  h += '<div class="hgw-panel" style="padding:12px"><div class="card-title">📖 玩法说明</div><div class="hgw-note" style="line-height:2">' +
    '· <strong class="hgw-text-gold">战斗 = 魔法决斗</strong>：魔咒对轰，防线归零 = 缴械（魔杖脱手）= 胜。赢 → 咒语经验/层进度/决斗荣誉；输 → 败绩（决斗有输有赢是常事）。<br>' +
    '· <strong class="hgw-text-gold">做爱 = 亲密</strong>：五维推进 + 动作编排，只喂养关系（好感/堕落），不涨魔力、不强化战斗。<br>' +
    '· <strong class="hgw-text-gold">炼药 = 生产</strong>：配方+材料→魔药，成功=魔药学/2+熟练度/2+材料品级；商店=金加隆买材料/卖药。<br>' +
    '· <strong class="hgw-text-gold">突破 = 阶位</strong>：层进度100+魔力达标+突破魔药 → 心魔剧情由 AI 演出 → 面板确认写回。<br>' +
    '· <strong class="hgw-text-gold">标签调度</strong>：当前目标 → getwi 她的性格（13阶段×好感度）+ 性癖（5阶段×欲望度）条目。<br>' +
    '· <strong class="hgw-text-gold">世界不是围着你转</strong>：课表=谁在线（可接触性）；她主动找你有硬门槛（好感≥60/亲密史/堕落≥60）。<br>' +
    '· <strong class="hgw-text-gold">结算块</strong>：面板写数值 → 结算块经真实楼层发送 → AI 读数值写成场面。stat_data 是唯一事实源。</div></div>';

  h += '</div>';
  box.innerHTML = h;

  // —— 日报 / 信纸 · AI 预设（各自的独立提示词/格式/温度，就地在入口处配置） ——
  const paperPe = document.createElement('div');
  paperPe.id = 'hgw-paper-pe';
  box.appendChild(paperPe);
  if (App.AI && App.AI_DEFAULTS) App.renderPresetEditor(paperPe, 'dailyPaper');
  const letterPe = document.createElement('div');
  letterPe.id = 'hgw-letter-pe';
  box.appendChild(letterPe);
  if (App.AI && App.AI_DEFAULTS) App.renderPresetEditor(letterPe, 'letter');

  const tgl = App.$('#hgw-set-toggle');
  if (tgl) tgl.addEventListener('click', () => {
    App.rpc('toggle_native', {}, 2000);
    App.UI.toast('已请求切换原生楼层显示', 'magic');
  });
  const snd = App.$('#hgw-set-sound');
  if (snd) snd.addEventListener('change', () => { App.cfg.sound = snd.checked; App.saveCfg(); });
  const memAuto = App.$('#hgw-set-memauto');
  if (memAuto) memAuto.addEventListener('change', () => {
    App.cfg.memoryAuto = memAuto.checked;
    App.saveCfg();
    App.UI.toast(memAuto.checked ? '记忆自动总结已开启——新楼层自动入库' : '记忆自动总结已关闭', memAuto.checked ? 'ok' : 'warn');
  });
  const fx = App.$('#hgw-set-fx');
  if (fx) fx.addEventListener('change', () => { App.cfg.fx = fx.checked; App.saveCfg(); });
  const gen = App.$('#hgw-set-gen');
  if (gen) gen.addEventListener('click', generateSchedule);
  const day = App.$('#hgw-set-day');
  if (day) day.addEventListener('click', () => nextDay());
  const STYLE_TYPES = ['自动', '淫荡露骨', '高冷反差', '清纯羞涩', '成熟挑逗', '直白运动', '病娇独占'];
  const curType = (stat.玩家 || {}).文风气质 || '自动';
  h += '<div class="hgw-settings-row"><span class="sr-icon">🎭</span><div><div class="sr-title">文风气质</div><div class="sr-desc">她的骚法（自动=按性格标签匹配；母猪风只是淫荡露骨型的极端）</div></div><div class="sr-action"><select class="hgw-sel" id="hgw-set-type" style="width:120px">' + STYLE_TYPES.map(x => '<option value="' + x + '"' + (curType === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>';
  const styleSel = App.$('#hgw-set-style');
  if (styleSel) styleSel.addEventListener('change', async () => {
    const s = await App.readStat(true);
    s.玩家 = s.玩家 || {};
    s.玩家.文风强度 = parseInt(styleSel.value) || 2;
    await App.writeStat({ 玩家: { 文风强度: s.玩家.文风强度 } });
    App.UI.toast('文风强度已设为 ' + styleSel.value, 'gold');
  });
  // 聊天模式切换
  const aiMode = App.cfg.aiMode || 'st';
  const aiOk = App.AI && App.AI.enabled();
  h += '<div class="hgw-settings-row"><span class="sr-icon">🤖</span><div><div class="sr-title">聊天模式</div><div class="sr-desc">' + (aiOk ? '独立 AI 已配置：输入直接走你的 API' : '未配置独立 AI——先到「AI 配置」设置') + '</div></div><div class="sr-action"><select class="hgw-sel" id="hgw-set-aimode" style="width:110px"' + (aiOk ? '' : ' disabled') + '><option value="st"' + (aiMode === 'st' ? ' selected' : '') + '>酒馆主链路</option><option value="independent"' + (aiMode === 'independent' ? ' selected' : '') + '>独立 AI</option></select></div></div>';
  h += '<div class="hgw-settings-row"><span class="sr-icon">📡</span><div><div class="sr-title">AI 配置</div><div class="sr-desc">设置你的 API 端点/Key/模型/提示词/格式</div></div><div class="sr-action"><button class="hgw-btn magic sm" id="hgw-set-ai">打开配置</button></div></div>';
  h += '<div class="hgw-settings-row"><span class="sr-icon">📰</span><div><div class="sr-title">日报 / 信纸（独立 AI 生成）</div><div class="sr-desc">生成《霍格沃茨日报》或给目标写猫头鹰信</div></div><div class="sr-action" style="display:flex;gap:6px"><button class="hgw-btn sm" id="hgw-set-paper">📰 日报</button><button class="hgw-btn sm" id="hgw-set-letter">🦉 信纸</button></div></div>';
  const typeSel = App.$('#hgw-set-type');
  if (typeSel) typeSel.addEventListener('change', async () => {
    const s = await App.readStat(true);
    s.玩家 = s.玩家 || {};
    s.玩家.文风气质 = typeSel.value;
    await App.writeStat({ 玩家: { 文风气质: s.玩家.文风气质 } });
    App.UI.toast('文风气质已设为：' + typeSel.value, 'gold');
  });
  const aiModeSel = App.$('#hgw-set-aimode');
  if (aiModeSel) aiModeSel.addEventListener('change', () => {
    App.cfg.aiMode = aiModeSel.value;
    App.saveCfg();
    App.UI.toast('聊天模式已切换：' + (aiModeSel.value === 'independent' ? '独立 AI' : '酒馆主链路'), 'gold');
  });
  const aiCfgBtn = App.$('#hgw-set-ai');
  if (aiCfgBtn) aiCfgBtn.addEventListener('click', () => App.navigate('ai'));
  const paperBtn = App.$('#hgw-set-paper');
  if (paperBtn) paperBtn.addEventListener('click', () => App.generateDailyPaper());
  const letterBtn = App.$('#hgw-set-letter');
  if (letterBtn) letterBtn.addEventListener('click', async () => {
    const stat = await App.readStat();
    const names = Object.keys(stat.女巫角色 || {});
    if (!names.length) { App.UI.toast('还没有目标女巫', 'warn'); return; }
    if (!App.AI.enabled()) { App.UI.toast('未配置独立 AI', 'warn'); return; }
    const target = await App.UI.prompt({ title: '给谁写信', msg: '输入目标女巫名字', placeholder: names.join(' / '), value: (stat.课表 || {}).当前目标 || names[0] });
    if (target) App.generateLetter(target);
  });
  const rel = App.$('#hgw-set-reload');
  if (rel) rel.addEventListener('click', async () => {
    await App.readStat(true);
    App.refreshTopbar();
    App.UI.toast('状态已重读，界面已刷新', 'ok');
    App.navigate(App.currentView);
  });
  const guideBtn = App.$('#hgw-set-guide');
  if (guideBtn) guideBtn.addEventListener('click', () => App.navigate('create'));
});
