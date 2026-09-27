/* ============================================================
   霍格沃茨 · 同层应用 状态视图
   ============================================================ */
'use strict';

App.registerView('status', async function (box) {
  const stat = await App.readStat();
  const p = stat.玩家 || {};
  const at = p.属性 || {};
  const st = p.状态 || {};
  const rp = p.魔力阶位 || {};
  const btl = (stat.课表 || {}).战斗 || {};
  const sc = (p.学业 && p.学业.各科) || {};
  const spells = p.咒语 || {};
  const lib = p.魔咒库 || {};
  const pots = p.魔药 || {};
  const mats = p.材料 || {};
  const eq = p.装备 || {};
  const gate = App.REALM_GATE[App.clamp((rp.大境界 || 1) - 1, 0, 8)][(rp.层 || 1) - 1];
  const mp = at.魔力值 || 0;
  const canBreak = (rp.层进度 || 0) >= 100 && mp >= gate && (pots.突破魔药 || 0) >= 1;

  let h = '';
  // —— 阶位总览 ——
  h += '<div id="hgw-status-top">';
  h += '<div class="hgw-card gold-border hgw-realm-card"><div class="realm-glow"></div><div class="realm-name">' + App.realmName(stat) + '</div><div class="realm-layer">' + (rp.大境界 || 1) + ' 大境界 · ' + (rp.层 || 1) + ' 层 · 魔力 ' + mp + '</div>';
  h += '<div class="hgw-bar gold" style="margin-top:10px"><i style="width:' + (rp.层进度 || 0) + '%"></i></div><div class="hgw-bar-label"><span>层进度</span><span class="num">' + (rp.层进度 || 0) + '%</span></div>';
  h += '<div class="break-hint ' + (canBreak ? 'ready' : '') + '">' + (canBreak ? '✨ 条件已满足，可突破！' : '突破条件：层进度100 + 魔力≥' + gate + ' + 突破魔药×1' + (rp.心魔状态 === '心魔期' ? ' ｜ 心魔演出中' : '')) + '</div>';
  h += '<div style="margin-top:8px"><button class="hgw-btn ok sm" id="hgw-status-break" ' + (canBreak ? '' : 'disabled') + '>💠 尝试突破</button></div></div>';
  h += '<div class="hgw-card"><div class="card-title"><span>🛡️</span>魔力护盾（决斗）</div><div class="hgw-card-body">';
  const hpMax = btl.主角防守值上限 || Math.round(mp * 1.2 * App.realmMul(stat));
  const hpNow = btl.主角防守值 != null ? btl.主角防守值 : hpMax;
  h += '<div class="hgw-bar-label"><span>当前 / 上限</span><span class="num">' + hpNow + ' / ' + hpMax + '</span></div><div class="hgw-bar"><i style="width:' + Math.round(hpNow / Math.max(1, hpMax) * 100) + '%"></i></div>';
  h += '<div class="hgw-note" style="margin-top:6px">防守值 = 魔力值×1.2×阶位系数（' + mp + '×1.2×' + App.realmMul(stat) + '）</div></div></div>';
  h += '<div class="hgw-card"><div class="card-title"><span>⚡</span>属性</div>';
  h += App.UI.bar(at.体力 || 0, 'green', '体力');
  h += App.UI.bar(at.魔力值 || 0, 'gold', '魔力值');
  h += App.UI.bar(at.魔法感知 || 0, 'purple', '魔法感知');
  h += '</div>';
  h += '<div class="hgw-card"><div class="card-title"><span>♥</span>状态</div>';
  h += App.UI.bar(st.情欲 || 0, 'pink', '情欲');
  h += App.UI.bar(st.快感 || 0, 'red', '快感');
  h += '</div>';
  h += '</div>';

  // —— 学业 ——
  h += '<div class="hgw-panel"><div class="panel-title"><span>📚</span>学业<span class="sub">总分 ' + (sc ? (p.学业.学业总分 || 0) : 0) + '</span></div><div class="hgw-grid cols-4">';
  for (const k of App.SUBJECTS) {
    h += '<div class="hgw-stat-card"><div class="num">' + (sc[k] || 0) + '</div><div class="lbl">' + k + '</div></div>';
  }
  h += '</div></div>';

  // —— 咒语 ——
  h += '<div class="hgw-panel"><div class="panel-title"><span>🪄</span>咒语与魔咒库<span class="sub">等级上限随阶位解锁</span></div><div class="hgw-spell-grid">';
  for (const s of App.SPELLS) {
    const sp = spells[s.名] || { 等级: 1, 经验: 0 };
    const pct = Math.min(100, (sp.经验 || 0) / App.expNeed(sp.等级 || 1) * 100);
    h += '<div class="hgw-spell-cell"><div class="sname">' + s.名 + '</div><div class="slv">Lv' + (sp.等级 || 1) + ' · 伤害 ' + App.dmgOf(stat, s) + '</div><div class="hgw-bar thin gold"><i style="width:' + pct + '%"></i></div><div class="hgw-note" style="font-size:9px">' + s.描述 + '</div></div>';
  }
  const libNames = Object.keys(lib);
  for (const n of libNames) {
    const lv = lib[n].等级 || 1;
    h += '<div class="hgw-spell-cell"><div class="sname">' + n + '</div><div class="slv">Lv' + lv + ' <span class="hgw-tag magic">扩展</span></div><div class="hgw-note" style="font-size:9px">' + (App.LIBRARY.find(x => x.名 === n) || { 描述: '效果咒' }).描述 + '</div></div>';
  }
  if (!libNames.length) h += '<div class="hgw-note" style="grid-column:1/-1">魔咒库为空——魔咒课上表现好、或阶位提升后会习得扩展咒。</div>';
  h += '</div></div>';

  // —— 装备 ——
  if (eq && Object.keys(eq).length) {
    h += '<div class="hgw-panel"><div class="panel-title"><span>🎒</span>装备</div><div class="hgw-grid cols-3">';
    for (const k in eq) {
      const e = eq[k] || {};
      if (e.名) h += '<div class="hgw-card"><div class="lb hgw-text-dim" style="font-size:11px">' + k + '</div><div class="hgw-text-bright" style="font-weight:600">' + e.名 + '</div><div class="hgw-tag ' + (e.品级 ? 'rar-' + e.品级.toLowerCase() : '') + '">' + (e.品级 || '普通') + '</div><div class="hgw-note">' + (e.效果 || '') + '</div></div>';
    }
    h += '</div></div>';
  }

  // —— 背包 ——
  h += '<div class="hgw-panel"><div class="panel-title"><span>🎒</span>背包<span class="sub">魔药 ' + Object.values(pots).reduce((a, b) => a + b, 0) + ' 件 · 材料 ' + Object.keys(mats).length + ' 种</span></div>';
  h += '<div class="hgw-inv-grid">';
  let hasInv = false;
  for (const k in pots) {
    if (pots[k] > 0) {
      hasInv = true;
      h += '<div class="hgw-inv-cell"><div class="iname">' + (App.POTION_ICONS[k] || '🧴') + ' ' + k + '</div><div class="inum">×' + pots[k] + '</div></div>';
    }
  }
  for (const k in mats) {
    const m = mats[k] || {};
    if (m.数量 > 0) {
      hasInv = true;
      h += '<div class="hgw-inv-cell"><div class="iname">🌿 ' + k + '</div><div class="inum">×' + m.数量 + '</div><span class="irank rar-' + String(m.品级 || '普通').toLowerCase() + '">' + (m.品级 || '普通') + '</span></div>';
    }
  }
  if (!hasInv) h += '<div class="hgw-note">背包空空——去对角巷采购，或赢一场决斗赌注。</div>';
  h += '</div></div>';

  // —— 战绩 ——
  const zj = p.战绩 || {};
  h += '<div class="hgw-panel"><div class="panel-title"><span>🏆</span>战绩</div><div class="hgw-grid cols-4">';
  h += '<div class="hgw-stat-card"><div class="num">' + (zj.今日胜场 || 0) + '</div><div class="lbl">今日胜场</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (zj.今日败场 || 0) + '</div><div class="lbl">今日败场</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (zj.累计缴械 || 0) + '</div><div class="lbl">累计缴械</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (zj.决斗荣誉 || 0) + '</div><div class="lbl">决斗荣誉</div></div>';
  h += '</div></div>';

  box.innerHTML = h;

  const brk = App.$('#hgw-status-break');
  if (brk) brk.addEventListener('click', () => App.navigate('breakthrough'));
});
