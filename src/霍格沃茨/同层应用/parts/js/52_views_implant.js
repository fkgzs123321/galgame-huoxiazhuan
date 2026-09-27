/* ============================================================
   霍格沃茨 · 同层应用 念头植入视图（胜点改造系统）
   战斗胜点 → 性癖念头植入：契合度/成功率/潜伏期/三阶段/记录
   ============================================================ */
'use strict';

/* 契合度判定（与世界书《胜点与念头植入规则》一致） */
App.computeFit = function (stat, target, kink) {
  const ch = (stat.女巫角色 || {})[target];
  if (!ch) return 50;
  let fit = 50;
  const traits = ch.性格标签 || [];
  const kinks = ch.性癖标签 || [];
  const KINK_MATCH = {
    '大小姐型': ['反差', '口嫌体正直', '调教', '贞操锁', '展品', '主奴'],
    '傲娇型': ['反差', '口嫌体正直', '调教', '束缚', '蒙眼'],
    '学霸型': ['反差', '远程调教', '强制高潮', '文字角色扮演', '偷窥'],
    '元气型': ['魁地奇场PLAY', '露出', '颜射', '汗味', '运动'],
    '运动型': ['魁地奇场PLAY', '汗味', '运动', '露出', '比赛'],
    '倔强型': ['驯服', '强制高潮', '鞭打', '羞辱', '支配'],
    '好胜型': ['驯服', '比赛', '强制高潮', '捆绑', '支配'],
    '孤僻型': ['偷窥', '远程调教', '蒙眼', '文字角色扮演', '自慰观赏'],
    '神秘型': ['梦境', '催眠', '蒙眼', '占卜', '远程调教'],
    '温柔型': ['宠物', '喂食', '依赖', '母性', '捆绑'],
    '依存型': ['宠物', '依赖', '痴女', '自慰观赏', '共妻'],
    '天然呆型': ['蒙眼', '药物', '梦境', '痴女', '宠物'],
    '冰山型': ['反差', '调教', '主奴', '师生', '淫纹'],
    '女王型': ['女尊', '羞辱', '鞭打', '支配', '展品'],
    '冷静型': ['反差', '调教', '主奴', '契约', '拍摄'],
    '沉稳型': ['驯服', '鞭打', '强制高潮', '主奴', '束缚'],
    '顺从型': ['宠物', '母狗', '肉便器', '调教', '性奴'],
    '敏感型': ['蒙眼', '捆绑', '强制高潮', '药物', '催眠'],
    '活泼型': ['露出', '魁地奇场PLAY', '直播', '表演', '群交'],
    '叛逆型': ['驯服', '强制高潮', '鞭打', '女尊', '支配'],
    '病娇型': ['独占', '束缚', '拍摄', 'NTR', '嫉妒'],
    '母性型': ['乳汁', '姐系', '哺乳', '包容', '束缚'],
    '偶像型': ['直播', '展品', '拍摄', '露出', '表演'],
    '控制狂': ['支配', '调教', '女尊', '羞辱', '鞭打'],
    '毒舌型': ['羞辱', '反差', '口嫌体正直', '鞭打', '调教'],
    '腹黑型': ['远程调教', '拍摄', '洗脑', '契约', 'NTR'],
    '利己型': ['契约', '交易', '展品', '拍摄', '主奴'],
    '热情型': ['露出', '直播', '表演', '群交', '痴女'],
    '浪漫型': ['纯爱', '蒙眼', '角色扮演', '文字角色扮演', '梦境'],
    '现实型': ['契约', '交易', '主奴', '中出', '精液管理'],
  };
  for (const tr of traits) {
    const m = KINK_MATCH[tr] || [];
    if (m.includes(kink)) fit += 20;
  }
  // 现有标签协同
  for (const k of kinks) {
    if (k === kink) { fit -= 20; break; } // 重复植入
  }
  // 好感加成
  fit += Math.min(15, Math.floor((ch.好感度 || 0) / 5));
  // 冲突：与血统/身份冲突的减分（保守处理：仅明显的）
  if ((kink === '露出' || kink === '淫乱' || kink === '游街') && (ch.血统 === '纯血' && (ch.性格标签 || []).includes('大小姐型'))) fit -= 15;
  if (ch.信任裂痕 > 0) fit -= 10;
  return Math.max(5, Math.min(95, Math.round(fit)));
};

App.computeSuccess = function (stat, target, kink) {
  const ch = (stat.女巫角色 || {})[target] || {};
  const fit = App.computeFit(stat, target, kink);
  let rate = fit * 0.8 + (ch.欲望积压 || 0) / 5;
  if ((ch.堕落值 || 0) >= 60) rate += 10;
  if (ch.信任裂痕 > 0) rate -= 10;
  return Math.max(15, Math.min(95, Math.round(rate)));
};

App.kinkCost = function (kink) {
  const CAT = [
    [['乳', '足', '丝袜', '美腿', '腋', '颈', '臀', '腰', '痣', '眼镜', '汗', '锁骨', '背', '睡眠', '醉酒', '药物', '梦境', '更衣室', '浴室', '教室', '魁地奇', '自慰观赏', '偷窥', '被看', '拍摄', '直播', '展览', '点播', '远程'], 15],
    [['口', '喉', '颜', '舌', '吻', '尿', '失禁', '灌肠', '浣肠', '淫水', '乳汁', '月经', '潮吹', '中出', '内射', 'NTR', '绿帽', '共妻', '师生', '姐妹', '母女', '人妻', '熟女', '义妹', '青梅', '主奴', '契约'], 25],
    [['绑', '蒙眼', '口球', '鞭', '蜡', '项圈', '链', '拘束', '吊', '电', '冰', '钳', '物化', '家具', '露出', '公开', '学狗', '爬行', '跪舔', '羞辱', '淫语', '自慰', '裸体', '游街'], 35],
    [['调教', '驯', '洗脑', '催眠', '暗示', '寸止', '强制', '射精管理', '贞操', '发情', '雌堕', '淫纹', '敏感', '反差', '堕落', '母狗', '母猪', '肉便器', '性奴', '宠物', '奶牛', '马娘', '阿嘿', '女仆', '淫乱', '痴女', '展品'], 45],
  ];
  for (const [keys, cost] of CAT) {
    for (const k of keys) {
      if (kink.includes(k)) return cost;
    }
  }
  return 25;
};

App.latencyDays = function (fit) {
  return Math.max(2, Math.round(10 - fit / 12));
};

/* ========== 植入执行 ========== */
App.implant = async function (target, kink) {
  const stat = await App.readStat(true);
  const p = stat.玩家 || {};
  const ch = (stat.女巫角色 || {})[target];
  if (!ch) { App.UI.toast('目标不存在', 'danger'); return; }
  const cost = App.kinkCost(kink);
  const pts = p.胜点 || 0;
  if (pts < cost) {
    App.UI.toast('胜点不足：需 ' + cost + '（当前 ' + pts + '）——去赢几场决斗', 'warn');
    return;
  }
  // 已植入检查
  const implanted = ch.被植入念头 || [];
  if (implanted.some(x => x.性癖 === kink)) {
    App.UI.toast('她身上已有该念头的植入记录（重复植入 -20 契合）', 'warn');
  }
  const fit = App.computeFit(stat, target, kink);
  const rate = App.computeSuccess(stat, target, kink);
  const latency = App.latencyDays(fit);
  const success = Math.random() * 100 < rate;
  p.胜点 = pts - cost;
  const today = (stat.时间 || {}).日期 || '未知日期';
  const rec = {
    目标: target, 性癖: kink, 消耗: cost,
    契合度: fit, 成功率: rate,
    植入日期: today, 预计生效日: latency + '天后',
    阶段: success ? '潜伏' : '失败',
    评价: success ? '念头已写入她的意识深处，尚未浮现' : '植入失败——她的意志抵抗了念头（胜点已消耗）',
  };
  if (success) {
    if (!ch.被植入念头) ch.被植入念头 = [];
    ch.被植入念头.push(rec);
  }
  const pRec = p.植入记录 || [];
  pRec.unshift(rec);
  await App.writeStat({ 玩家: { 胜点: p.胜点, 植入记录: pRec }, 女巫角色: { [target]: { 被植入念头: ch.被植入念头 || [] } } });
  const block = '【植入结算】目标=' + target + '|念头=' + kink + '|消耗胜点' + cost + '|契合度' + fit + '|成功率' + rate + '%|潜伏' + latency + '天|结果=' + (success ? '植入成功（潜伏期开始，' + latency + '天后萌芽）' : '植入失败（胜点已消耗，她的意志抵抗了念头）');
  await App.sendAction(block);
  App.addLog('social', block);
  if (success) {
    App.UI.spellFlash('purple');
    App.UI.toast('✨ 植入成功！' + target + ' 的意识深处种下了「' + kink + '」念头（潜伏 ' + latency + ' 天）', 'magic');
  } else {
    App.UI.toast('💔 植入失败——她的意志抵抗了念头', 'danger');
  }
  App.refreshTopbar();
};

/* ========== 阶段推进（推进一天时调用） ========== */
App.advanceImplant = async function (stat) {
  // 返回是否有阶段跃迁（供 AI 叙事）
  const jumps = [];
  const chars = stat.女巫角色 || {};
  for (const n in chars) {
    const c = chars[n];
    const list = c.被植入念头 || [];
    for (const it of list) {
      if (it.阶段 === '潜伏') {
        // 简化：每天推进，达到预计生效日 → 萌芽
        const days = parseInt(String(it.预计生效日 || '3').replace('天后', '')) || 3;
        const left = (it._剩余天 || days) - 1;
        if (left <= 0) {
          it.阶段 = '萌芽';
          it.评价 = '念头开始浮现：她会在特定情境下莫名在意「' + it.性癖 + '」相关的事物';
          delete it._剩余天;
          jumps.push(n + '·' + it.性癖 + ' → 萌芽');
        } else {
          it._剩余天 = left;
        }
      } else if (it.阶段 === '萌芽') {
        // 萌芽 → 生效：需要堕落值≥30 或 亲密一次（由 AI 在结算后调用 activateImplant）
      }
    }
  }
  return jumps;
};

App.activateImplant = async function (target, kink) {
  const stat = await App.readStat(true);
  const c = (stat.女巫角色 || {})[target];
  if (!c) return;
  const list = c.被植入念头 || [];
  const it = list.find(x => x.性癖 === kink && x.阶段 === '萌芽');
  if (!it) return;
  it.阶段 = '生效';
  it.评价 = '念头完全成形——正式并入她的性癖标签，行为由对应条目驱动';
  // 并入性癖标签
  if (!c.性癖标签) c.性癖标签 = [];
  if (!c.性癖标签.includes(kink)) c.性癖标签.push(kink);
  await App.writeStat({ 女巫角色: { [target]: { 被植入念头: list, 性癖标签: c.性癖标签 } } });
  App.UI.confetti(30);
  App.UI.toast('💗 「' + kink + '」念头正式生效！' + target + ' 的行为将由此驱动', 'love');
};

/* ========== 植入视图 ========== */
App.registerView('implant', async function (box) {
  const stat = await App.readStat();
  const p = stat.玩家 || {};
  const chars = stat.女巫角色 || {};
  const names = Object.keys(chars);
  const kinkNames = Object.keys(App.KinkFull || {});
  const pts = p.胜点 || 0;

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🧠</span>念头植入室<span class="sub">胜点 ' + pts + ' · 改造她们意识的唯一合法途径</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:12px">决斗赢来的胜点，向指定女巫植入性癖念头。契合度决定成功率与潜伏期——了解她（性格/标签/好感）再动手，才是明智的巫师。植入是渐进改造：潜伏（无表现）→ 萌芽（隐晦迹象）→ 生效（并入标签驱动行为）。</div>';

  // 胜点速览
  h += '<div class="hgw-grid cols-4" style="margin-bottom:14px">';
  h += '<div class="hgw-stat-card"><div class="num">' + pts + '</div><div class="lbl">可用胜点</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (p.战绩 || {}).累计缴械 || 0 + '</div><div class="lbl">决斗胜场</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (p.植入记录 || []).length + '</div><div class="lbl">植入尝试</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (p.植入记录 || []).filter(r => r.阶段 === '生效').length + '</div><div class="lbl">已生效</div></div>';
  h += '</div>';

  if (!names.length) {
    h += App.UI.empty('🧠', '还没有可植入目标——先认识女巫们。');
    h += '</div>';
    box.innerHTML = h;
    return;
  }

  // 选择区
  h += '<div class="hgw-grid cols-2" style="margin-bottom:12px">';
  h += '<div class="hgw-card"><div class="lb hgw-text-dim" style="font-size:11px">目标女巫</div><select class="hgw-sel" id="hgw-imp-target">' + names.map(n => '<option>' + n + '</option>').join('') + '</select></div>';
  h += '<div class="hgw-card"><div class="lb hgw-text-dim" style="font-size:11px">性癖念头（' + kinkNames.length + ' 种）</div><select class="hgw-sel" id="hgw-imp-kink"><option value="">—— 选择要植入的念头 ——</option>' + kinkNames.map(k => '<option>' + k + '</option>').join('') + '</select></div>';
  h += '</div>';
  h += '<div id="hgw-imp-preview"></div>';
  h += '<div style="margin-top:12px"><button class="hgw-btn magic lg" id="hgw-imp-go" disabled>🧠 执行植入（消耗胜点）</button></div>';
  h += '</div>';

  // 进行中（潜伏/萌芽）
  const active = [];
  for (const n of names) {
    const c = chars[n] || {};
    (c.被植入念头 || []).forEach(it => {
      if (it.阶段 === '潜伏' || it.阶段 === '萌芽') active.push({ n, it });
    });
  }
  if (active.length) {
    h += '<div class="hgw-panel"><div class="panel-title"><span>⏳</span>进行中的改造<span class="sub">' + active.length + ' 个念头</span></div><div class="hgw-list">';
    for (const { n, it } of active) {
      const isLatent = it.阶段 === '潜伏';
      h += '<div class="hgw-row">';
      h += '<span class="hgw-badge ' + (isLatent ? 'ghost' : 'warn') + '">' + (isLatent ? '潜伏' : '萌芽') + '</span>';
      h += '<span style="font-weight:600">' + n + '</span><span class="hgw-tag love">' + it.性癖 + '</span>';
      h += '<span class="hgw-muted">契合 ' + it.契合度 + ' ｜ ' + it.评价 + '</span>';
      if (!isLatent) h += '<button class="hgw-btn sm ok" data-activate="' + n + '" data-kink="' + it.性癖 + '" style="margin-left:auto">💗 促成生效</button>';
      h += '</div>';
    }
    h += '</div></div>';
  }

  // 历史记录
  const recs = p.植入记录 || [];
  if (recs.length) {
    h += '<div class="hgw-panel"><div class="panel-title"><span>📜</span>植入史</div><div class="hgw-list">';
    for (const r of recs.slice(0, 20)) {
      const cls = r.阶段 === '生效' ? 'ok' : (r.阶段 === '潜伏' ? 'magic' : (r.阶段 === '萌芽' ? 'warn' : 'danger'));
      h += '<div class="hgw-row"><span class="hgw-badge ' + cls + '">' + r.阶段 + '</span><span>' + r.目标 + '</span><span class="hgw-tag love">' + r.性癖 + '</span><span class="hgw-muted">契合' + r.契合度 + ' 成功率' + r.成功率 + '% 消耗' + r.消耗 + '胜点</span></div>';
    }
    h += '</div></div>';
  }

  box.innerHTML = h;

  // 预览更新
  const updPreview = () => {
    const t = App.$('#hgw-imp-target');
    const k = App.$('#hgw-imp-kink');
    const go = App.$('#hgw-imp-go');
    if (!t || !k || !go) return;
    const target = t.value;
    const kink = k.value;
    const pv = App.$('#hgw-imp-preview');
    if (!kink) { pv.innerHTML = ''; go.disabled = true; return; }
    const fit = App.computeFit(stat, target, kink);
    const rate = App.computeSuccess(stat, target, kink);
    const cost = App.kinkCost(kink);
    const latency = App.latencyDays(fit);
    const ch = chars[target] || {};
    const conflict = (ch.被植入念头 || []).some(x => x.性癖 === kink) ? '<div class="hgw-note" style="color:#e8b64c">⚠️ 重复植入：契合 -20</div>' : '';
    pv.innerHTML =
      '<div class="hgw-card gold-border">' +
      '<div class="card-title"><span>🔮</span>判定预览：' + target + ' ← 「' + kink + '」' + conflict + '</div>' +
      '<div class="hgw-grid cols-2">' +
      '<div class="hgw-card" style="padding:8px"><div class="lb hgw-text-dim">契合度</div><div style="font-size:20px;font-weight:700;color:' + (fit >= 70 ? '#7fd0a8' : fit >= 40 ? '#e8b64c' : '#e24b4a') + '">' + fit + '</div>' + App.UI.bar(fit, fit >= 70 ? 'green' : fit >= 40 ? '' : 'red') + '</div>' +
      '<div class="hgw-card" style="padding:8px"><div class="lb hgw-text-dim">成功率</div><div style="font-size:20px;font-weight:700;color:' + (rate >= 70 ? '#7fd0a8' : rate >= 40 ? '#e8b64c' : '#e24b4a') + '">' + rate + '%</div>' + App.UI.bar(rate, rate >= 70 ? 'green' : rate >= 40 ? '' : 'red') + '</div>' +
      '<div class="hgw-card" style="padding:8px"><div class="lb hgw-text-dim">消耗</div><div style="font-size:20px;font-weight:700;color:#e8d48b">' + cost + ' 胜点</div><div class="hgw-note">' + (pts >= cost ? '余额充足' : '<span style="color:#e24b4a">余额不足！</span>') + '</div></div>' +
      '<div class="hgw-card" style="padding:8px"><div class="lb hgw-text-dim">潜伏期</div><div style="font-size:20px;font-weight:700;color:#c3b4e8">' + latency + ' 天</div><div class="hgw-note">契合越高生效越快</div></div>' +
      '</div></div>';
    go.disabled = pts < cost;
  };
  const tSel = App.$('#hgw-imp-target');
  const kSel = App.$('#hgw-imp-kink');
  if (tSel) tSel.addEventListener('change', updPreview);
  if (kSel) kSel.addEventListener('change', updPreview);
  const go = App.$('#hgw-imp-go');
  if (go) go.addEventListener('click', async () => {
    const target = tSel.value;
    const kink = kSel.value;
    if (!target || !kink) return;
    go.disabled = true;
    await App.implant(target, kink);
    go.disabled = false;
    App.navigate('implant');
  });
  App.$$('[data-activate]', box).forEach(el => el.addEventListener('click', async () => {
    await App.activateImplant(el.dataset.activate, el.dataset.kink);
    App.navigate('implant');
  }));
});
