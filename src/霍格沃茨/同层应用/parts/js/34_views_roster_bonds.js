/* ============================================================
   霍格沃茨 · 同层应用 名录视图 + 角色详情 + 关系图谱
   ============================================================ */
'use strict';

/* ========== 名录视图 ========== */
App.registerView('roster', async function (box) {
  const stat = await App.readStat();
  const chars = stat.女巫角色 || {};
  const names = Object.keys(chars);
  const target = (stat.课表 || {}).当前目标 || '';

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>👥</span>女巫名录<span class="sub">' + names.length + ' 人 · 行为由标签库驱动</span></div>';
  if (!names.length) {
    h += App.UI.empty('🦉', '尚未认识任何人——在剧情中结识女巫，AI 会在 stat_data 建档 + 名录追加，行为自动由性格/性癖标签调度。');
  } else {
    h += '<div class="hgw-list">';
    for (const n of names) {
      const c = chars[n] || {};
      const info = App.houseInfo(c.学院);
      const isT = target === n;
      h += '<div class="hgw-card clickable hgw-char-card' + (isT ? ' selected' : '') + '" data-char="' + n + '">';
      h += '<div class="hgw-char-ava" style="background:linear-gradient(135deg,' + info.color + '88,#1a252f)">👩<span class="house-ring" style="border-color:' + info.color + '"></span></div>';
      h += '<div class="c-info">';
      h += '<div class="c-name">' + App.esc(n) + App.houseBadge(c.学院) + (isT ? '<span class="hgw-badge gold">目标</span>' : '') + '</div>';
      h += '<div class="c-meta">' + App.esc(c.身份 || '') + (c.年级 ? ' ｜ ' + App.esc(c.年级) : '') + '</div>';
      h += '<div class="c-tags">' + (c.性格标签 || []).map(x => '<span class="hgw-tag gold">' + x + '</span>').join('') + (c.性癖标签 || []).slice(0, 3).map(x => '<span class="hgw-tag love">' + x + '</span>').join('') + '</div>';
      h += '<div class="c-axes">';
      const axes = [['♥', '好感', c.好感度 || 0], ['⚔', '服气', c.缴械值 || 0], ['💜', '堕落', c.堕落值 || 0], ['🔥', '积压', c.欲望积压 || 0]];
      for (const [ic, ax, av] of axes) h += '<div class="hgw-axis-mini"><div class="ax">' + ic + ' ' + ax + '</div><div class="av">' + av + '</div></div>';
      h += '</div></div></div>';
    }
    h += '</div>';
  }
  h += '</div>';
  box.innerHTML = h;

  App.$$('.hgw-char-card', box).forEach(el => {
    el.addEventListener('click', () => openCharDetail(el.dataset.char));
  });
});

/* ========== 角色详情（抽屉） ========== */
async function openCharDetail(name) {
  const stat = await App.readStat();
  const c = (stat.女巫角色 || {})[name] || {};
  if (!c) {
    App.UI.toast('角色数据缺失：' + name, 'danger');
    return;
  }
  const info = App.houseInfo(c.学院);
  const sk = c.技能 || {};
  const skg = sk.技能组 || {};
  const bs = c.身体状态 || {};
  const ps = c.心理状态 || {};
  const cyc = c.生理周期 || {};

  let b = '';
  b += '<div class="hgw-char-detail-hero">';
  b += '<div class="big-ava" style="background:linear-gradient(135deg,' + info.color + 'aa,#1a252f)">👩</div>';
  b += '<div style="flex:1;min-width:0">';
  b += '<div class="d-name">' + App.esc(name) + '</div>';
  b += '<div class="d-meta">' + App.houseBadge(c.学院) + ' ｜ ' + App.esc(c.年级 || '') + ' ｜ ' + App.esc(c.血统 || '') + '</div>';
  b += '<div class="d-meta">' + App.esc(c.身份 || '') + '</div>';
  b += '<div class="d-secret">🔒 秘密：' + App.esc(c.秘密 || '（尚未揭晓）') + '</div>';
  b += '<div class="d-voice">💬 「' + App.esc(c.心声 || '') + '」</div>';
  b += '</div></div>';

  // 四轴
  b += '<div class="hgw-grid cols-2" style="margin-bottom:12px">';
  const axes = [
    ['♥ 好感度', c.好感度 || 0, 'pink', '社交距离：13 阶段调度轴'],
    ['⚔ 服气度', c.缴械值 || 0, 'red', '决斗层面对你的认可'],
    ['💜 堕落值', c.堕落值 || 0, 'purple', '心理沉沦线：≥60 她开始主动'],
    ['🔥 欲望积压', c.欲望积压 || 0, 'gold', '她的个人状态：不针对你'],
  ];
  for (const [lb, v, color, sub] of axes) {
    b += '<div class="hgw-card"><div class="card-title"><span>' + lb + '</span></div>' + App.UI.bar(v, color, sub) + '</div>';
  }
  b += '</div>';

  // 能力
  b += '<div class="hgw-panel" style="padding:12px"><div class="card-title"><span>🛡️</span>决斗实力</div><div class="hgw-skill-block">';
  b += '<div class="hgw-skill-chip"><div class="sc-name">主技 · ' + App.esc(sk.名 || '?') + '</div><div class="sc-lv">Lv' + (sk.等级 || 1) + '</div><div class="sc-type">' + App.esc((c.能力值 || {}).忍耐 || 0) + ' 忍耐</div></div>';
  if (skg) {
    for (const k in skg) {
      b += '<div class="hgw-skill-chip"><div class="sc-name">辅技 · ' + App.esc(k) + '</div><div class="sc-lv">Lv' + (skg[k].等级 || 1) + '</div></div>';
    }
  }
  b += '<div class="hgw-skill-chip"><div class="sc-name">恢复 · ' + App.esc((c.恢复技能 && c.恢复技能.名) || '无') + '</div></div>';
  b += '<div class="hgw-skill-chip"><div class="sc-name">名器 · ' + App.esc(String(c.名器 || '未知').split('—')[0]) + '</div><div class="sc-lv">防御 ' + (c.名器防御 || 0) + '</div><div class="sc-type">' + App.esc(String(c.名器 || '').split('—')[1] || '') + '</div></div>';
  b += '<div class="hgw-skill-chip"><div class="sc-name">防线</div><div class="sc-lv">' + (c.防守值上限 || 44) + '（身份上限）</div></div>';
  b += '</div></div>';

  // 标签
  b += '<div class="hgw-panel" style="padding:12px"><div class="card-title"><span>🏷️</span>标签组合（调度器按此 getwi）</div>';
  b += '<div style="margin-bottom:6px"><strong class="hgw-text-gold">性格：</strong>' + (c.性格标签 || []).map(x => '<span class="hgw-tag gold" style="font-size:12px">' + x + '</span>').join('') + '</div>';
  b += '<div><strong class="hgw-text-gold">性癖：</strong>' + (c.性癖标签 || []).map(x => '<span class="hgw-tag love" style="font-size:12px">' + x + '</span>').join('') + '</div>';
  if (c.核心性癖) b += '<div class="hgw-note" style="margin-top:8px">💗 ' + App.esc(c.核心性癖) + '</div>';
  b += '</div>';

  // 身体状态
  b += '<div class="hgw-panel" style="padding:12px"><div class="card-title"><span>🌸</span>身体状态</div><div class="hgw-grid cols-3">';
  const bsItems = [
    ['胸部', bs.胸部], ['花径', bs.阴道], ['肛门', bs.肛门], ['嘴', bs.嘴], ['肌肤', bs.肌肤], ['大腿', bs.大腿], ['臀部', bs.臀部],
  ];
  for (const [k, v] of bsItems) {
    if (!v) continue;
    b += '<div class="hgw-card" style="padding:8px"><div class="lb hgw-text-dim" style="font-size:11px">' + k + '</div><div class="hgw-text" style="font-size:12px">' + App.esc(v.状态 || '') + '</div>' + (v.敏感度 ? '<div class="hgw-tag love">敏感 ' + v.敏感度 + '</div>' : '') + (v.湿润度 ? '<div class="hgw-tag magic">湿润 ' + v.湿润度 + '</div>' : '') + '</div>';
  }
  b += '</div></div>';

  // 生理周期
  b += '<div class="hgw-panel" style="padding:12px"><div class="card-title"><span>📆</span>生理周期</div><div class="hgw-note">' +
    '月经状态：' + App.esc(cyc.月经状态 || '?') + ' ｜ 排卵日：第' + (cyc.排卵日 || 14) + '天 ｜ 周期：' + (cyc.周期天数 || 28) + '天 ｜ 避孕：' + (cyc.避孕 ? '是' : '否') +
    (cyc.怀孕 ? ' ｜ <span class="hgw-text-danger">🤰 怀孕 ' + (cyc.怀孕周数 || 0) + ' 周</span>' : '') + '</div></div>';

  // 心理
  if (ps && Object.keys(ps).length) {
    b += '<div class="hgw-panel" style="padding:12px"><div class="card-title"><span>🧠</span>心理状态</div><div class="hgw-note">' +
      '欲望度 ' + (ps.欲望度 || 0) + ' ｜ 羞耻感 ' + (ps.羞耻感 || 0) + ' ｜ 兴奋 ' + (ps.兴奋 || 0) + ' ｜ 期待 ' + (ps.期待 || 0) + ' ｜ ' + App.esc(ps.精神状态 || '正常') + '</div></div>';
  }

  // 行动
  b += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
  b += '<button class="hgw-btn" data-act="target">🎯 设为当前目标</button>';
  b += '<button class="hgw-btn danger" data-act="battle">⚔️ 发起决斗</button>';
  b += '<button class="hgw-btn love" data-act="love">💗 亲密</button>';
  b += '</div>';

  const dr = App.UI.drawer({ title: '女巫档案 · ' + name, body: b });
  dr.body.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const action = act.dataset.act;
    if (action === 'target') {
      await App.writeStat({ 课表: { 当前目标: name } });
      App.UI.toast('已设当前目标：' + name, 'gold');
    } else if (action === 'battle') {
      dr.close();
      await App.writeStat({ 课表: { 当前目标: name } });
      App.UI.toast('前往决斗场——选中 ' + name + ' 后点击「开始决斗」', 'gold');
      App.navigate('battle');
    } else if (action === 'love') {
      dr.close();
      await App.writeStat({ 课表: { 当前目标: name } });
      App.UI.toast('前往亲密面板——好感' + (c.好感度 || 0) + '（<30 会被婉拒）', 'love');
      App.navigate('love');
    }
  });
}
App.openCharDetail = openCharDetail;

/* ========== 关系图谱视图（SVG 星图） ========== */
App.registerView('bonds', async function (box) {
  const stat = await App.readStat();
  const chars = stat.女巫角色 || {};
  const names = Object.keys(chars);
  const W = 760, H = 420, cx = W / 2, cy = H / 2;

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🕸️</span>关系图谱<span class="sub">你与她们的距离 · 四轴汇聚</span></div>';
  if (!names.length) {
    h += App.UI.empty('🕸️', '暂无关系——在剧情中结识女巫后，这里会生成星图。');
    h += '</div>';
    box.innerHTML = h;
    return;
  }
  // 节点布局：环形
  const nodes = names.map((n, i) => {
    const ang = (Math.PI * 2 * i) / names.length - Math.PI / 2;
    return { n, x: cx + Math.cos(ang) * (W / 2 - 90), y: cy + Math.sin(ang) * (H / 2 - 70) };
  });
  let svg = '<svg id="hgw-bond-map" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
  // 连线（到你）
  for (const nd of nodes) {
    const c = chars[nd.n] || {};
    const fav = c.好感度 || 0;
    const op = 0.15 + (fav / 100) * 0.65;
    const col = fav >= 60 ? '#d4537e' : (fav >= 30 ? '#c9a227' : '#4a5260');
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + nd.x + '" y2="' + nd.y + '" stroke="' + col + '" stroke-width="' + (1 + fav / 25) + '" opacity="' + op + '"/>';
  }
  // 中心玩家
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="34" fill="#101a26" stroke="#c9a227" stroke-width="2"/>';
  svg += '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" fill="#e8d48b" font-size="14" font-weight="bold">你</text>';
  // 节点
  for (const nd of nodes) {
    const c = chars[nd.n] || {};
    const info = App.houseInfo(c.学院);
    const fav = c.好感度 || 0;
    const r = 22 + (fav / 100) * 8;
    svg += '<g data-char="' + nd.n + '" style="cursor:pointer">';
    svg += '<circle cx="' + nd.x + '" cy="' + nd.y + '" r="' + r + '" fill="' + info.color + '33" stroke="' + info.color + '" stroke-width="1.5"/>';
    svg += '<text x="' + nd.x + '" y="' + (nd.y - r - 6) + '" text-anchor="middle" fill="#d8d3c0" font-size="11">' + App.esc(nd.n) + '</text>';
    svg += '<text x="' + nd.x + '" y="' + (nd.y + 4) + '" text-anchor="middle" fill="#e8d48b" font-size="9">♥' + fav + '</text>';
    svg += '</g>';
  }
  svg += '</svg>';

  h += svg;
  h += '<div class="hgw-note" style="margin-top:10px">节点大小与颜色代表好感度；点击节点打开档案。服气（决斗）、堕落（心理）、积压（状态）见名录详情。</div>';
  h += '</div>';
  box.innerHTML = h;

  App.$$('g[data-char]', box).forEach(g => {
    g.addEventListener('click', () => openCharDetail(g.dataset.char));
  });
});
