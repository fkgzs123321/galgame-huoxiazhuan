/* ============================================================
   霍格沃茨 · 同层应用 战斗引擎（魔法决斗 · 本地结算）
   ============================================================ */
'use strict';

App.Battle = {
  picked: new Set(),
  libPicked: new Set(),
  log: [],
  target: '',
};

/* ========== 开始决斗 ========== */
App.Battle.start = async function (target) {
  const stat = await App.readStat(true);
  const ch = (stat.女巫角色 || {})[target];
  if (!ch) {
    App.UI.toast('目标不存在：' + target, 'danger');
    return false;
  }
  const mp = (stat.玩家 && stat.玩家.属性 && stat.玩家.属性.魔力值) || 76;
  const playerMax = Math.round(mp * 1.2 * App.realmMul(stat));
  const herMax = ch.防守值上限 || 44;
  App.Battle.target = target;
  App.Battle.log = [];
  App.Battle.logPush('⚔️ 决斗开始：你（防线 ' + playerMax + '）VS ' + target + '（防线 ' + herMax + '）', 'sys');
  await App.writeStat({
    课表: {
      当前目标: target,
      战斗状态: '进行中',
      战斗: {
        回合: 0,
        主角防守值: playerMax,
        主角防守值上限: playerMax,
        她防守值: herMax,
        她防守值上限: herMax,
        目标列表: [target],
        本场经验: {},
        主角BUFF: {},
        她BUFF: {},
      },
    },
  });
  App.UI.spellFlash('gold');
  App.UI.toast('决斗开始！缴械（魔杖脱手）即胜', 'gold');
  return true;
};

/* ========== 战斗日志 ========== */
App.Battle.logPush = function (text, who) {
  App.Battle.log.push({ text, who, t: Date.now() });
  if (App.Battle.log.length > 80) App.Battle.log.shift();
};

/* ========== 进攻结算 ========== */
App.Battle.attack = async function (pickedSpells, pickedLib) {
  const stat = await App.readStat(true);
  const cd = stat.课表 || {};
  const btl = cd.战斗 || {};
  const target = cd.当前目标;
  if (!target || btl.战斗状态 !== '进行中') {
    App.UI.toast('当前没有进行中的决斗', 'warn');
    return;
  }
  if ((!pickedSpells || !pickedSpells.length) && (!pickedLib || !pickedLib.length)) {
    App.UI.toast('至少选择 1 个咒语', 'warn');
    return;
  }
  const p = stat.玩家 || {};
  const ch = (stat.女巫角色 || {})[target] || {};
  const spells = p.咒语 || {};
  const lib = p.魔咒库 || {};
  const mul = App.realmMul(stat);

  /* —— 我方伤害 —— */
  let dmg = 0;
  const used = [];
  const expUpdates = {};
  for (const s of pickedSpells) {
    const sp = spells[s.名] || { 等级: 1 };
    let d = Math.round(sp.等级 * s.系数 * mul);
    // 摄神取念：她防线低时×2
    if (s.名 === '摄神取念' && btl.她防守值 < btl.她防守值上限 * 0.5) d *= 2;
    dmg += d;
    used.push(s.名 + 'Lv' + sp.等级 + '(' + d + ')');
    expUpdates[s.名] = { 等级: sp.等级, 经验: (sp.经验 || 0) + 15 };
  }
  // 粉身碎骨连击
  if (pickedSpells.some(s => s.名 === '粉身碎骨')) dmg = Math.round(dmg * 1.5);

  /* —— 扩展咒效果 —— */
  let counterMul = 1, dmgTakenMul = 1, selfHeal = 0;
  const libUsed = [];
  for (const l of pickedLib) {
    const lv = (lib[l.名] && lib[l.名].等级) || 1;
    libUsed.push(l.名 + 'Lv' + lv);
    if (l.类型 === '防御') counterMul *= 0.7;
    if (l.类型 === '控制') counterMul *= 0.8;
    if (l.类型 === '恢复') selfHeal = 8 + lv * 2;
    if (l.类型 === '闪避') dmgTakenMul = 0.7;
  }

  /* —— 魔药 —— */
  const pots = p.魔药 || {};
  let potUsed = '';
  if (pots.福灵剂 > 0) { dmg += 2; pots.福灵剂 -= 1; potUsed = '福灵剂+2'; }

  /* —— 她减伤 —— */
  let reduce = (ch.名器防御 || 0) + Math.floor(((ch.能力值 && ch.能力值.持久) || 5) / 2);
  const stack = ch.欲望积压 || 0;
  if (stack >= 60) reduce -= 2;
  if (stack >= 80) reduce -= 4;
  reduce = Math.max(0, reduce);
  const real = Math.max(0, dmg - reduce);
  const herHp = btl.她防守值;
  const herHpNew = Math.max(0, herHp - real);

  /* —— 她反击 —— */
  let counter = ((ch.能力值 && ch.能力值.反攻) || 5) * 1.5 + Math.floor((ch.名器防御 || 0) / 2);
  if (stack >= 80) counter = Math.round(counter * 1.25);
  counter = Math.round(counter * counterMul * dmgTakenMul);
  const playerHp = btl.主角防守值;
  const playerHpNew = Math.max(0, Math.min(btl.主角防守值上限 || 999, playerHp - counter + selfHeal));

  /* —— 她技能经验 —— */
  const herExpOld = (ch.技能 && ch.技能.经验) || 0;
  const herExpNew = herExpOld + 15;

  const round = (btl.回合 || 0) + 1;
  let result = '未分胜负';
  let sheScore = 0;
  const zj = p.战绩 || {};
  const tc = (stat.女巫角色 || {})[target] || {};

  if (herHpNew <= 0) {
    result = '你胜';
    sheScore = Math.max(1, 10 - round + 1);
    tc.缴械值 = Math.min(100, (tc.缴械值 || 0) + sheScore);
    tc.败场 = (tc.败场 || 0) + 1;
    tc.战斗次数 = (tc.战斗次数 || 0) + 1;
    zj.今日胜场 = (zj.今日胜场 || 0) + 1;
    zj.累计缴械 = (zj.累计缴械 || 0) + 1;
    p.胜点 = (p.胜点 || 0) + Math.max(10, 15 - round + 1); // 胜点：回合越少越多
    const rp = p.魔力阶位 || {};
    rp.层进度 = Math.min(100, (rp.层进度 || 0) + 8);
    zj.决斗荣誉 = (zj.决斗荣誉 || 0) + 10;
    const subj = App.pick(['魔咒学', '变形术', '黑魔法防御术']);
    if (p.学业 && p.学业.各科) p.学业.各科[subj] = Math.min(100, (p.学业.各科[subj] || 0) + 2);
    App.Battle.logPush('🎉 你胜！' + target + ' 的魔杖脱手——缴械！服气度+' + sheScore, 'you');
    App.UI.confetti(40);
  } else if (playerHpNew <= 0) {
    result = '你败';
    zj.今日败场 = (zj.今日败场 || 0) + 1;
    zj.累计被缴械 = (zj.累计被缴械 || 0) + Math.max(1, 5 - Math.floor(round / 2));
    if (tc.缴械值) tc.缴械值 = Math.max(0, tc.缴械值 - 5);
    tc.胜场 = (tc.胜场 || 0) + 1;
    tc.战斗次数 = (tc.战斗次数 || 0) + 1;
    App.Battle.logPush('💔 你败——你的魔杖脱手。败绩+（决斗有输有赢是常事）', 'her');
    App.UI.spellFlash('red');
  } else {
    tc.战斗次数 = (tc.战斗次数 || 0) + 1;
    App.Battle.logPush('回合 ' + round + '：你造成 ' + real + ' 实伤，她反击 ' + counter + '。她防线 ' + herHpNew + '，你防线 ' + playerHpNew, 'sys');
  }

  /* —— 写回 —— */
  const patchCh = {};
  patchCh[target] = { 缴械值: tc.缴械值, 胜场: tc.胜场, 败场: tc.败场, 战斗次数: tc.战斗次数 };
  if (ch.技能) {
    const lv = ch.技能.等级 || 1;
    patchCh[target].技能 = {
      名: ch.技能.名 || '',
      等级: lv + (herExpNew >= App.expNeed(lv) ? 1 : 0),
      经验: herExpNew >= App.expNeed(lv) ? herExpNew - App.expNeed(lv) : herExpNew,
      技能组: ch.技能.技能组 || {},
    };
  }
  const spellPatch = {};
  for (const k in expUpdates) {
    const lv = expUpdates[k].等级;
    spellPatch[k] = {
      等级: lv + (expUpdates[k].经验 >= App.expNeed(lv) ? 1 : 0),
      经验: expUpdates[k].经验 >= App.expNeed(lv) ? expUpdates[k].经验 - App.expNeed(lv) : expUpdates[k].经验,
    };
  }
  await App.writeStat({
    课表: {
      战斗状态: result === '未分胜负' ? '进行中' : '已结算',
      战斗: {
        回合: round,
        她防守值: herHpNew,
        主角防守值: playerHpNew,
        本场经验: expUpdates,
        她BUFF: btl.她BUFF || {},
        主角BUFF: btl.主角BUFF || {},
      },
    },
    玩家: { 咒语: spellPatch, 魔药: pots, 战绩: zj, 胜点: p.胜点 },
    女巫角色: patchCh,
  });

  /* —— 结算块（真实楼层发送） —— */
  const block = '【对抗结算】目标=' + target + '|回合=' + round + '|我方=' + used.join('+') +
    (libUsed.length ? '+' + libUsed.join('+') : '') +
    (potUsed ? '+' + potUsed : '') +
    '|她减伤' + Math.round(reduce) + '|实伤' + real +
    '|她防线' + herHp + '→' + herHpNew +
    '|她反击' + Math.round(counter) +
    '|你防线' + playerHp + '→' + playerHpNew +
    (selfHeal ? '|自愈+' + selfHeal : '') +
    '|' + (result === '你胜' ? '她缴械' : (result === '你败' ? '你被缴械' : '未分胜负')) +
    '|服气度' + (sheScore ? '+' + sheScore : (result === '你败' ? '-5' : '0'));
  await App.sendAction(block);
  App.addLog('battle', block);
  App.UI.floatNum('-' + real, 'dmg', window.innerWidth / 2 - 60, window.innerHeight / 2 - 40);
  if (counter > 0) App.UI.floatNum('-' + counter, 'dmg', window.innerWidth / 2 + 40, window.innerHeight / 2 - 20);
  if (selfHeal) App.UI.floatNum('+' + selfHeal, 'heal', window.innerWidth / 2, window.innerHeight / 2 - 80);
  return result;
};

/* ========== 弃权 ========== */
App.Battle.forfeit = async function () {
  const stat = await App.readStat(true);
  const cd = stat.课表 || {};
  const target = cd.当前目标 || '';
  await App.writeStat({ 课表: { 战斗状态: '已结算' } });
  if (target) App.Battle.logPush('🏳️ 你主动结束了与 ' + target + ' 的决斗', 'sys');
  App.UI.toast('决斗已结束（弃权）', 'warn');
};
