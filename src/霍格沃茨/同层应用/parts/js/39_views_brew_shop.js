/* ============================================================
   霍格沃茨 · 同层应用 炼药引擎 + 商店
   ============================================================ */
'use strict';

/* ========== 炼药 ========== */
App.brew = async function (recipe) {
  const stat = await App.readStat(true);
  const p = stat.玩家 || {};
  const mats = p.材料 || {};
  const grade = (p.学业 && p.学业.各科 && p.学业.各科.魔药学) || 50;
  if (grade < recipe.门槛) {
    App.UI.toast('魔药学不足：需 ' + recipe.门槛 + '（当前 ' + grade + '）', 'warn');
    await App.sendAction('（我想炼制' + recipe.名 + '，但魔药学还不够——先去上课或找塞西莉亚教授请教）');
    return false;
  }
  for (const m in recipe.需求) {
    if (!mats[m] || (mats[m].数量 || 0) < recipe.需求[m]) {
      App.UI.toast('材料不足：' + m + '×' + recipe.需求[m], 'warn');
      return false;
    }
  }
  const skill = (p.炼药 && p.炼药.熟练度) || 0;
  let rankBonus = 0;
  for (const m in recipe.需求) rankBonus = Math.max(rankBonus, App.MAT_RANK[(mats[m] && mats[m].品级) || '普通']);
  const rate = Math.min(95, Math.round(grade / 2 + skill / 2 + rankBonus));
  for (const m in recipe.需求) mats[m].数量 -= recipe.需求[m];
  const ok = Math.random() * 100 < rate;
  const pots = p.魔药 || {};
  if (ok) {
    pots[recipe.名] = (pots[recipe.名] || 0) + 1;
    App.UI.confetti(20);
    App.UI.toast('✨ 成功炼制 ' + recipe.名 + '（成功率 ' + rate + '%）', 'gold');
    await App.sendAction('【炼药】成功炼制' + recipe.名 + '（魔药学' + grade + '·成功率' + rate + '%）——' + recipe.描述);
    App.addLog('brew', '炼制成功：' + recipe.名);
  } else {
    for (const m in recipe.需求) {
      const lose = Math.floor(recipe.需求[m] / 2);
      if (lose) mats[m].数量 = Math.max(0, mats[m].数量 - lose);
    }
    App.UI.toast('💥 炼制失败（成功率 ' + rate + '%），材料损失一半', 'danger');
    await App.sendAction('【炼药】炼制' + recipe.名 + '失败（成功率' + rate + '%），材料损失一半');
    App.addLog('brew', '炼制失败：' + recipe.名);
  }
  await App.writeStat({ 玩家: { 材料: mats, 魔药: pots, 炼药: { 熟练度: Math.min(100, skill + (ok ? 5 : 2)) } } });
  return ok;
};

/* ========== 购买材料 ========== */
App.buyMat = async function (name) {
  const stat = await App.readStat(true);
  const p = stat.玩家 || {};
  const item = App.SHOP.find(x => x.名 === name);
  if (!item) return;
  const w = p.财产 || {};
  const gold = App.gold(stat);
  if (gold < item.价) {
    App.UI.toast('金加隆不足——赢决斗赌注或卖魔药', 'warn');
    await App.sendAction('（我想买' + name + '，但金加隆不够——得先赚点钱）');
    return;
  }
  w.金加隆 = (w.金加隆 || 0) - item.价;
  const mats = p.材料 || {};
  if (!mats[name]) mats[name] = { 数量: 0, 品级: item.品级 };
  mats[name].数量 = (mats[name].数量 || 0) + 1;
  await App.writeStat({ 玩家: { 财产: w, 材料: mats } });
  App.UI.toast('购入 ' + name + '×1（' + item.价 + ' 加隆）', 'ok');
  await App.sendAction('（对角巷购入 ' + name + '×1，花费 ' + item.价 + ' 加隆）');
  App.addLog('brew', '购买：' + name + '×1');
};

/* ========== 卖出魔药 ========== */
App.sellPotion = async function (name) {
  const stat = await App.readStat(true);
  const p = stat.玩家 || {};
  const pots = p.魔药 || {};
  const rec = App.RECIPES.find(r => r.名 === name);
  if (!rec || !pots[name]) return;
  pots[name] -= 1;
  const w = p.财产 || {};
  const gain = Math.round(rec.售价 / 2);
  w.金加隆 = (w.金加隆 || 0) + gain;
  await App.writeStat({ 玩家: { 财产: w, 魔药: pots } });
  App.UI.toast('卖出 ' + name + '×1，得 ' + gain + ' 加隆', 'ok');
  await App.sendAction('（卖掉 ' + name + '×1，得 ' + gain + ' 加隆）');
  App.addLog('brew', '卖出：' + name + '（+' + gain + ' 加隆）');
};

/* ========== 炼药视图 ========== */
App.registerView('brew', async function (box) {
  const stat = await App.readStat();
  const p = stat.玩家 || {};
  const mats = p.材料 || {};
  const pots = p.魔药 || {};
  const grade = (p.学业 && p.学业.各科 && p.学业.各科.魔药学) || 50;
  const skill = (p.炼药 && p.炼药.熟练度) || 0;

  let h = '';
  h += '<div class="hgw-brew-stage"><div class="hgw-cauldron"><span class="bubble b1"></span><span class="bubble b2"></span><span class="bubble b3"></span><div class="pot"></div></div><div class="bs-txt" style="margin-left:20px">魔药工坊</div></div>';

  h += '<div class="hgw-panel"><div class="panel-title"><span>🧪</span>工坊状态<span class="sub">炼药占用 1 个时段（剧情体现）</span></div>';
  h += '<div class="hgw-grid cols-3">';
  h += '<div class="hgw-stat-card"><div class="num">' + grade + '</div><div class="lbl">魔药学</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + skill + '</div><div class="lbl">炼药熟练度</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + App.gold(stat) + '</div><div class="lbl">金加隆</div></div>';
  h += '</div></div>';

  // 配方
  h += '<div class="hgw-panel"><div class="panel-title"><span>📜</span>配方<span class="sub">成功率 = 魔药学/2 + 熟练度/2 + 材料品级加成</span></div><div class="hgw-list">';
  for (const r of App.RECIPES) {
    const locked = grade < r.门槛;
    const need = Object.keys(r.需求).map(m => m + '×' + r.需求[m]).join(' + ');
    const has = Object.keys(r.需求).every(m => mats[m] && (mats[m].数量 || 0) >= r.需求[m]);
    const skill = (p.炼药 && p.炼药.熟练度) || 0;
    let rankBonus = 0;
    for (const m in r.需求) rankBonus = Math.max(rankBonus, App.MAT_RANK[(mats[m] && mats[m].品级) || '普通']);
    const rate = Math.min(95, Math.round(grade / 2 + skill / 2 + rankBonus));
    h += '<div class="hgw-row hgw-recipe-row' + (locked ? ' disabled' : '') + '">';
    h += '<span class="rr-name">' + (App.POTION_ICONS[r.名] || '🧴') + ' ' + r.名 + '</span>';
    h += '<span class="rr-req">' + need + '</span>';
    h += '<span class="rr-desc">' + r.描述 + '</span>';
    if (locked) h += '<span class="hgw-badge warn">需魔药学' + r.门槛 + '</span>';
    else {
      h += '<span class="rr-rate">成功率 ' + rate + '%</span>';
      h += '<button class="hgw-btn sm ok" data-brew="' + r.名 + '" ' + (has ? '' : 'disabled') + '>炼制</button>';
      if (!has) h += '<span class="hgw-muted">材料不足</span>';
    }
    h += '</div>';
  }
  h += '</div></div>';

  // 背包材料
  h += '<div class="hgw-panel"><div class="panel-title"><span>🌿</span>材料背包</div><div class="hgw-shop-grid">';
  const mk = Object.keys(mats);
  if (!mk.length) h += '<div class="hgw-note">暂无材料——去对角巷购买。</div>';
  for (const k of mk) {
    const m = mats[k] || {};
    h += '<div class="hgw-card hgw-shop-cell"><div class="iname">🌿 ' + k + '</div><div class="inum">×' + (m.数量 || 0) + '</div><span class="irank rar-' + String(m.品级 || '普通').toLowerCase() + '">' + (m.品级 || '普通') + '</span></div>';
  }
  h += '</div></div>';

  // 成品
  h += '<div class="hgw-panel"><div class="panel-title"><span>🧴</span>成品（点击卖出半价）</div><div class="hgw-shop-grid">';
  const pk = Object.keys(pots).filter(k => pots[k] > 0);
  if (!pk.length) h += '<div class="hgw-note">暂无成品</div>';
  for (const k of pk) {
    const rec = App.RECIPES.find(r => r.名 === k);
    h += '<div class="hgw-card hgw-shop-cell"><div class="iname">' + (App.POTION_ICONS[k] || '🧴') + ' ' + k + '</div><div class="inum">×' + pots[k] + '</div><button class="hgw-btn sm" data-sell="' + k + '">卖出 ' + (rec ? Math.round(rec.售价 / 2) : 0) + 'G</button></div>';
  }
  h += '</div></div>';

  box.innerHTML = h;
  App.$$('[data-brew]', box).forEach(el => el.addEventListener('click', async () => {
    const r = App.RECIPES.find(x => x.名 === el.dataset.brew);
    if (r) { await App.brew(r); App.navigate('brew'); }
  }));
  App.$$('[data-sell]', box).forEach(el => el.addEventListener('click', async () => {
    await App.sellPotion(el.dataset.sell);
    App.navigate('brew');
  }));
});

/* ========== 对角巷视图 ========== */
App.registerView('shop', async function (box) {
  const stat = await App.readStat();
  const p = stat.玩家 || {};
  const mats = p.材料 || {};
  const w = p.财产 || {};

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🏪</span>对角巷<span class="sub">金加隆 ' + App.gold(stat) + ' · 1 加隆 = 17 西可 = 493 纳特</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:12px">魔法界的商业街。材料是炼药与突破的命脉——赢了决斗赌注，就来这里把战利品变成实力。</div>';
  h += '<div class="hgw-shop-grid">';
  for (const s of App.SHOP) {
    h += '<div class="hgw-card hgw-shop-cell">';
    h += '<div class="iname">🌿 ' + s.名 + '</div>';
    h += '<span class="irank rar-' + String(s.品级).toLowerCase() + '">' + s.品级 + '</span>';
    h += '<div class="sprice">' + s.价 + '<small> 加隆</small></div>';
    h += '<div class="hgw-note" style="font-size:9px">' + s.描述 + '</div>';
    h += '<button class="hgw-btn sm ok" data-buy="' + s.名 + '" style="margin-top:6px" ' + (App.gold(stat) < s.价 ? 'disabled' : '') + '>购买</button>';
    h += '</div>';
  }
  h += '</div>';
  h += '<div style="margin-top:12px" class="hgw-note">我的材料：' + Object.keys(mats).map(k => k + '×' + ((mats[k] || {}).数量 || 0)).join('、') || '（空）' + '</div>';
  h += '</div>';
  box.innerHTML = h;
  App.$$('[data-buy]', box).forEach(el => el.addEventListener('click', async () => {
    await App.buyMat(el.dataset.buy);
    App.navigate('shop');
  }));
});
