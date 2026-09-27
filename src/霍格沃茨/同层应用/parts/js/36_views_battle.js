/* ============================================================
   霍格沃茨 · 同层应用 战斗视图（决斗舞台）
   ============================================================ */
'use strict';

App.registerView('battle', async function (box) {
  const stat = await App.readStat();
  const cd = stat.课表 || {};
  const btl = cd.战斗 || {};
  const target = cd.当前目标 || '';
  const ch = (stat.女巫角色 || {})[target] || {};
  const p = stat.玩家 || {};
  const spells = p.咒语 || {};
  const lib = p.魔咒库 || {};

  let h = '';

  /* —— 目标选择（无目标时） —— */
  if (!target) {
    const chars = stat.女巫角色 || {};
    const names = Object.keys(chars);
    h += '<div class="hgw-panel"><div class="panel-title"><span>⚔️</span>魔法决斗<span class="sub">缴械即胜 · 决斗是巫师的传统</span></div>';
    h += '<div class="hgw-note" style="margin-bottom:12px">选择挑战对象——她可能接受，也可能拒绝（拒战是常态）。她接不接战、用什么打法，由她的性格标签决定。</div>';
    if (!names.length) {
      h += App.UI.empty('⚔️', '还没有可挑战的对象——先在剧情里认识人。');
    } else {
      h += '<div class="hgw-list">';
      for (const n of names) {
        const c = chars[n] || {};
        const info = App.houseInfo(c.学院);
        h += '<div class="hgw-row" data-pick="' + n + '">';
        h += '<span style="font-weight:600;color:#e8d48b">' + App.esc(n) + '</span>' + App.houseBadge(c.学院);
        h += '<span class="hgw-muted">服气' + (c.缴械值 || 0) + ' ｜ 防线' + (c.防守值上限 || 44) + ' ｜ 主技 ' + App.esc(((c.技能 || {}).名) || '?') + ' Lv' + ((c.技能 || {}).等级 || 1) + '</span>';
        h += '<button class="hgw-btn sm danger" style="margin-left:auto">挑战</button>';
        h += '</div>';
      }
      h += '</div>';
    }
    h += '</div>';
    box.innerHTML = h;
    App.$$('[data-pick]', box).forEach(el => el.addEventListener('click', async () => {
      const n = el.dataset.pick;
      await App.writeStat({ 课表: { 当前目标: n } });
      await App.Battle.start(n);
      App.navigate('battle');
    }));
    return;
  }

  /* —— 战斗舞台 —— */
  const playerMax = btl.主角防守值上限 || Math.round(((p.属性 || {}).魔力值 || 76) * 1.2 * App.realmMul(stat));
  const playerHp = btl.主角防守值 != null ? btl.主角防守值 : playerMax;
  const herMax = btl.她防守值上限 || ch.防守值上限 || 44;
  const herHp = btl.她防守值 != null ? btl.她防守值 : herMax;
  const state = cd.战斗状态 || '未开始';

  h += '<div id="hgw-battle-stage">';
  h += '<div class="duel-title">⚡ 魔 法 决 斗 ⚡</div>';
  h += '<div class="hgw-duel-hp">';
  h += '<div class="hgw-duel-side"><div class="side-name">🧙 你</div><div class="side-sub">' + App.realmName(stat) + ' · 系数×' + App.realmMul(stat) + '</div>';
  h += '<div class="hgw-hp-block"><span class="hp-num">' + playerHp + '</span><span class="hp-max"> / ' + playerMax + '</span></div>';
  h += '<div class="hgw-bar" style="width:100%"><i style="width:' + Math.round(playerHp / Math.max(1, playerMax) * 100) + '%;background:linear-gradient(90deg,#3f8f6a,#7fd0a8)"></i></div>';
  h += '</div>';
  h += '<div class="hgw-duel-vs">VS</div>';
  h += '<div class="hgw-duel-side"><div class="side-name">' + App.esc(target) + '</div><div class="side-sub">' + App.houseBadge(ch.学院) + ' 服气' + (ch.缴械值 || 0) + '</div>';
  h += '<div class="hgw-hp-block"><span class="hp-num" style="color:#e88b8b">' + herHp + '</span><span class="hp-max"> / ' + herMax + '</span></div>';
  h += '<div class="hgw-bar red" style="width:100%"><i style="width:' + Math.round(herHp / Math.max(1, herMax) * 100) + '%"></i></div>';
  h += '</div>';
  h += '</div>';

  // BUFF 区
  const herBuffs = btl.她BUFF || {}, myBuffs = btl.主角BUFF || {};
  const buffChips = [];
  for (const k in herBuffs) buffChips.push('<span class="hgw-buff-chip debuff">她·' + k + ' ' + (herBuffs[k].剩余回合 || 1) + '回合</span>');
  for (const k in myBuffs) buffChips.push('<span class="hgw-buff-chip">你·' + k + ' ' + (myBuffs[k].剩余回合 || 1) + '回合</span>');
  if (buffChips.length) h += '<div class="hgw-buff-strip">' + buffChips.join('') + '</div>';

  // 回合/状态
  h += '<div style="text-align:center;margin-top:12px">';
  h += '<span class="hgw-badge gold">回合 ' + (btl.回合 || 0) + '</span> ';
  h += '<span class="hgw-badge ' + (state === '进行中' ? 'ok' : (state === '已结算' ? 'warn' : 'ghost')) + '">' + state + '</span>';
  h += '</div>';
  h += '</div>';

  /* —— 她实力区 —— */
  const sk = ch.技能 || {};
  h += '<div class="hgw-panel"><div class="panel-title"><span>🛡️</span>她的实力<span class="sub">知己知彼</span></div><div class="hgw-skill-block">';
  h += '<div class="hgw-skill-chip"><div class="sc-name">主技 · ' + App.esc(sk.名 || '?') + '</div><div class="sc-lv">Lv' + (sk.等级 || 1) + '</div><div class="sc-type">忍耐 ' + ((ch.能力值 || {}).忍耐 || 0) + '</div></div>';
  if (sk.技能组) {
    for (const k in sk.技能组) {
      h += '<div class="hgw-skill-chip"><div class="sc-name">辅技 · ' + App.esc(k) + '</div><div class="sc-lv">Lv' + (sk.技能组[k].等级 || 1) + '</div></div>';
    }
  }
  h += '<div class="hgw-skill-chip"><div class="sc-name">恢复 · ' + App.esc((ch.恢复技能 && ch.恢复技能.名) || '无') + '</div></div>';
  h += '<div class="hgw-skill-chip"><div class="sc-name">名器 · ' + App.esc(String(ch.名器 || '未知').split('—')[0]) + '</div><div class="sc-lv">防御 ' + (ch.名器防御 || 0) + '</div><div class="sc-type">' + App.esc(String(ch.名器 || '').split('—')[1] || '') + '</div></div>';
  h += '<div class="hgw-skill-chip"><div class="sc-name">反攻 ' + ((ch.能力值 || {}).反攻 || 0) + ' ｜ 持久 ' + ((ch.能力值 || {}).持久 || 0) + '</div><div class="sc-type">欲望积压 ' + (ch.欲望积压 || 0) + '（≥60 减伤-2，≥80 再-2且反击+25%）</div></div>';
  h += '</div></div>';

  /* —— 咒语选择 —— */
  h += '<div class="hgw-panel"><div class="panel-title"><span>🪄</span>咒语（选 1~3）<span class="sub">已选：<span id="hgw-b-picked">无</span></span></div>';
  h += '<div class="hgw-spell-pick">';
  for (const s of App.SPELLS) {
    const sp = spells[s.名] || { 等级: 1 };
    const d = App.dmgOf(stat, s);
    h += '<div class="pick-cell hgw-spell-cell" data-sp="' + s.名 + '" title="' + App.esc(s.描述) + '"><div class="pc-name">' + s.名 + '</div><div class="pc-dmg">伤害 ' + d + ' · Lv' + sp.等级 + '</div><div class="pc-desc">' + s.描述 + '</div></div>';
  }
  h += '</div>';
  // 魔咒库
  const libNames = Object.keys(lib);
  if (libNames.length) {
    h += '<div class="panel-title" style="margin-top:14px;font-size:13px;color:#c3b4e8"><span>✨</span>魔咒库（效果咒）</div>';
    h += '<div class="hgw-spell-pick">';
    for (const l of App.LIBRARY) {
      const lv = (lib[l.名] && lib[l.名].等级) || 0;
      if (!lv) continue;
      h += '<div class="pick-cell hgw-lib-cell" data-lib="' + l.名 + '" title="' + App.esc(l.描述) + '"><div class="pc-name">' + l.名 + '</div><div class="pc-type">' + l.类型 + '</div><div class="pc-desc">' + l.描述 + '</div></div>';
    }
    h += '</div>';
  }
  h += '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">';
  h += '<button class="hgw-btn ok" id="hgw-b-attack" ' + (state !== '进行中' ? 'disabled' : '') + '>⚡ 进攻（结算并发楼层）</button>';
  if (state === '未开始' || state === '已结算') {
    h += '<button class="hgw-btn" id="hgw-b-start">⚔️ 开始决斗</button>';
  }
  if (state === '进行中') {
    h += '<button class="hgw-btn danger" id="hgw-b-forfeit">🏳️ 弃权结束</button>';
  }
  h += '<button class="hgw-btn ghost" id="hgw-b-switch">🔄 换目标</button>';
  h += '</div>';
  h += '</div>';

  /* —— 战斗日志 —— */
  h += '<div class="hgw-panel"><div class="panel-title"><span>📋</span>战斗日志</div><div class="hgw-battle-log" id="hgw-b-log">';
  if (!App.Battle.log.length) h += '<span class="lg-sys">—— 决斗尚未开始，选好咒语进攻吧 ——</span>';
  else {
    for (const l of App.Battle.log) {
      h += '<div><span class="lg-' + l.who + '">' + App.esc(l.text) + '</span></div>';
    }
  }
  h += '</div></div>';

  box.innerHTML = h;

  // 选中状态
  App.Battle.picked.clear();
  App.Battle.libPicked.clear();
  const renderPicked = () => {
    const names = [];
    App.SPELLS.forEach(s => { if (App.Battle.picked.has(s.名)) names.push(s.名); });
    App.LIBRARY.forEach(l => { if (App.Battle.libPicked.has(l.名)) names.push(l.名); });
    const el = App.$('#hgw-b-picked');
    if (el) el.textContent = names.join('、') || '无';
  };
  App.$$('.hgw-spell-cell[data-sp]', box).forEach(el => {
    el.addEventListener('click', () => {
      const n = el.dataset.sp;
      if (App.Battle.picked.has(n)) { App.Battle.picked.delete(n); el.classList.remove('picked'); }
      else {
        if (App.Battle.picked.size + App.Battle.libPicked.size >= 3) { App.UI.toast('最多选 3 个咒语', 'warn'); return; }
        App.Battle.picked.add(n); el.classList.add('picked');
      }
      renderPicked();
    });
  });
  App.$$('.hgw-lib-cell', box).forEach(el => {
    el.addEventListener('click', () => {
      const n = el.dataset.lib;
      if (App.Battle.libPicked.has(n)) { App.Battle.libPicked.delete(n); el.classList.remove('picked'); }
      else {
        if (App.Battle.picked.size + App.Battle.libPicked.size >= 3) { App.UI.toast('最多选 3 个咒语', 'warn'); return; }
        App.Battle.libPicked.add(n); el.classList.add('picked');
      }
      renderPicked();
    });
  });

  const attackBtn = App.$('#hgw-b-attack');
  if (attackBtn) attackBtn.addEventListener('click', async () => {
    const spellsSel = App.SPELLS.filter(s => App.Battle.picked.has(s.名));
    const libSel = App.LIBRARY.filter(l => App.Battle.libPicked.has(l.名));
    if (!spellsSel.length && !libSel.length) { App.UI.toast('先选咒语！', 'warn'); return; }
    attackBtn.disabled = true;
    await App.Battle.attack(spellsSel, libSel);
    attackBtn.disabled = false;
    App.navigate('battle');
  });
  const startBtn = App.$('#hgw-b-start');
  if (startBtn) startBtn.addEventListener('click', async () => {
    await App.Battle.start(target);
    App.navigate('battle');
  });
  const forf = App.$('#hgw-b-forfeit');
  if (forf) forf.addEventListener('click', async () => {
    await App.Battle.forfeit();
    App.navigate('battle');
  });
  const sw = App.$('#hgw-b-switch');
  if (sw) sw.addEventListener('click', async () => {
    await App.writeStat({ 课表: { 当前目标: '', 战斗状态: '未开始' } });
    App.navigate('battle');
  });
});
