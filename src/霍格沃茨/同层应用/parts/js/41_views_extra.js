/* ============================================================
   霍格沃茨 · 同层应用 扩展视图（图鉴/魁地奇/占卜/禁林/成就/统计）
   ============================================================ */
'use strict';

/* ========== 图书馆图鉴 ========== */
App.registerView('library', async function (box) {
  const stat = await App.readStat();
  const tabs = [
    ['spells', '🪄 咒语', App.SPELL_BOOK],
    ['potions', '🧪 魔药', App.POTION_BOOK],
    ['mats', '🌿 材料', App.MAT_BOOK],
    ['namei', '🌸 名器', App.NAMEI_BOOK],
    ['traits', '🧠 性格', null],
    ['traits_full', '📖 性格全文', null],
    ['kinks', '💗 性癖', null],
    ['kinks_full', '🔥 性癖全文', null],
    ['places', '🏰 地点', App.PLACES],
    ['events', '🎲 事件池', App.EVENT_POOL],
  ];
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>📚</span>图书馆<span class="sub">霍格沃茨图鉴 · 知识即力量</span></div>';
  h += '<div class="hgw-tabs" id="hgw-lib-tabs">' + tabs.map((t, i) => '<div class="hgw-tab' + (i === 0 ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</div>').join('') + '</div>';
  h += '<div id="hgw-lib-body"></div></div>';
  box.innerHTML = h;

  function renderTab(tabId) {
    const body = App.$('#hgw-lib-body');
    if (!body) return;
    const t = tabs.find(x => x[0] === tabId);
    if (!t) return;
    let out = '';
    if (t[0] === 'spells') {
      out = '<div class="hgw-grid cols-3">' + App.SPELL_BOOK.map(s =>
        '<div class="hgw-card"><div class="card-title"><span>🪄</span>' + s.名 + '</div><div class="card-body">' + s.描述 + '</div><div class="hgw-tag magic">' + s.系别 + '</div><div class="hgw-tag gold">' + s.效果 + '</div><div class="hgw-note" style="margin-top:4px">来源：' + s.来源 + '</div></div>'
      ).join('') + '</div>';
    } else if (t[0] === 'potions') {
      out = '<div class="hgw-grid cols-3">' + App.POTION_BOOK.map(s =>
        '<div class="hgw-card"><div class="card-title"><span>' + (App.POTION_ICONS[s.名] || '🧪') + '</span>' + s.名 + '</div><div class="card-body">' + s.描述 + '</div><div class="hgw-tag rar-' + s.品级.toLowerCase() + '">' + s.品级 + '</div><div class="hgw-tag gold">' + s.效果 + '</div><div class="hgw-note" style="margin-top:4px">配方：' + s.配方 + '</div></div>'
      ).join('') + '</div>';
    } else if (t[0] === 'mats') {
      out = '<div class="hgw-grid cols-3">' + App.MAT_BOOK.map(s =>
        '<div class="hgw-card"><div class="card-title"><span>🌿</span>' + s.名 + '</div><div class="card-body">' + s.描述 + '</div><div class="hgw-tag rar-' + s.品级.toLowerCase() + '">' + s.品级 + '</div><div class="hgw-note" style="margin-top:4px">产地：' + s.产地 + '</div></div>'
      ).join('') + '</div>';
    } else if (t[0] === 'namei') {
      out = '<div class="hgw-grid cols-3">' + App.NAMEI_BOOK.map(s =>
        '<div class="hgw-card"><div class="card-title"><span>🌸</span>' + s.名 + '</div><div class="card-body">' + s.描述 + '</div><div class="hgw-tag love">' + s.特质 + '</div></div>'
      ).join('') + '</div>';
    } else if (t[0] === 'traits_full') {
      const names = Object.keys(App.TraitFull || {});
      out = '<div class="hgw-note" style="margin-bottom:10px">共 ' + names.length + ' 型性格条目全文（13 阶段调度：应激→恐慌→抵触→防备→观察→破冰→依赖→在意→坦白→笨拙付出→同居磨合→死心塌地→结婚向往→老夫老妻）。</div><div class="hgw-list">';
      for (const n of names) {
        const full = (App.TraitFull[n] || '');
        const firstLine = full.split('\n').filter(l => l.trim() && !l.startsWith('<') && !l.startsWith('<%') && !l.startsWith('@@') && !l.startsWith('if (')).slice(0, 6).map(l => l.replace(/^\s*-\s*/, '· ')).join('<br>');
        out += '<div class="hgw-card clickable hgw-lib-card hgw-trait-full" data-name="' + n + '" style="margin-bottom:8px"><div class="lc-name">🧠 ' + n.replace('_人设', '') + '</div><div class="lc-desc">' + firstLine + '</div><div class="hgw-tag gold">点击展开全文</div></div>';
      }
      out += '</div>';
    } else if (t[0] === 'kinks_full') {
      const names = Object.keys(App.KinkFull || {});
      out = '<div class="hgw-note" style="margin-bottom:10px">共 ' + names.length + ' 条性癖条目全文（5 阶段调度：潜伏→萌芽→沉溺→失控→完全沉沦）。</div><div class="hgw-list">';
      for (const n of names) {
        const full = (App.KinkFull[n] || '');
        const firstLine = full.split('\n').filter(l => l.trim() && !l.startsWith('<') && !l.startsWith('<%') && !l.startsWith('@@') && !l.startsWith('if (')).slice(0, 4).map(l => l.replace(/^\s*-\s*/, '· ')).join('<br>');
        out += '<div class="hgw-card clickable hgw-lib-card hgw-kink-full" data-name="' + n + '" style="margin-bottom:8px"><div class="lc-name">💗 ' + n + '</div><div class="lc-desc">' + firstLine + '</div><div class="hgw-tag love">点击展开全文</div></div>';
      }
      out += '</div>';
    } else if (t[0] === 'traits') {
      out = '<div class="hgw-grid cols-3">' + App.TRAIT_QUICK.map(n =>
        '<div class="hgw-card"><div class="card-title"><span>🧠</span>' + n + '</div><div class="card-body">' + (App.TRAIT_QUICK_DESC[n] || '') + '</div><div class="hgw-tag gold">' + n.replace('型', '') + '型人设条目</div></div>'
      ).join('') + '</div>';
    } else if (t[0] === 'kinks') {
      const keys = Object.keys(App.KINK_QUICK);
      out = '<div class="hgw-note" style="margin-bottom:10px">共 ' + keys.length + ' 条性癖标签，全部有独立世界书条目（5 阶段调度）。</div><div class="hgw-grid cols-3">' + keys.map(k =>
        '<div class="hgw-card"><div class="card-title"><span>💗</span>' + k + '</div><div class="card-body">' + App.KINK_QUICK[k] + '</div><div class="hgw-tag love">性癖条目</div></div>'
      ).join('') + '</div>';
    } else if (t[0] === 'places') {
      out = '<div class="hgw-grid cols-3">' + App.PLACES.map(s =>
        '<div class="hgw-card"><div class="card-title"><span>🏰</span>' + s.名 + '</div><div class="card-body">' + s.描述 + '</div><div class="hgw-tag">' + s.时段 + '</div></div>'
      ).join('') + '</div>';
    } else if (t[0] === 'events') {
      out = '<div class="hgw-note" style="margin-bottom:10px">共 ' + App.EVENT_POOL.length + ' 个校园事件——剧情中自然触发，一次 1~2 个。</div><div class="hgw-list">' + App.EVENT_POOL.map((e, i) =>
        '<div class="hgw-row"><span class="hgw-badge ghost">' + e.场景 + '</span><span class="hgw-tag">' + e.类型 + '</span><span>' + App.esc(e.名) + '——' + App.esc(e.描述) + '</span></div>'
      ).join('') + '</div>';
    }
    body.innerHTML = out;
  }
  App.$$('#hgw-lib-tabs .hgw-tab', box).forEach(el => el.addEventListener('click', () => {
    App.$$('#hgw-lib-tabs .hgw-tab', box).forEach(x => x.classList.remove('on'));
    el.classList.add('on');
    renderTab(el.dataset.tab);
  }));
  renderTab('spells');

  // 全文展开
  box.addEventListener('click', (e) => {
    const t = e.target.closest('.hgw-trait-full');
    if (t) {
      const full = App.TraitFull[t.dataset.name] || '';
      App.UI.modal({ title: '性格条目 · ' + t.dataset.name.replace('_人设', ''), xl: true, body: '<div class="hgw-note" style="white-space:pre-wrap;font-size:12px;line-height:1.9;font-family:Consolas,monospace">' + App.esc(full) + '</div>' });
      return;
    }
    const k = e.target.closest('.hgw-kink-full');
    if (k) {
      const full = App.KinkFull[k.dataset.name] || '';
      App.UI.modal({ title: '性癖条目 · ' + k.dataset.name, xl: true, body: '<div class="hgw-note" style="white-space:pre-wrap;font-size:12px;line-height:1.9;font-family:Consolas,monospace">' + App.esc(full) + '</div>' });
    }
  });
});

/* ========== 魁地奇模拟器 ========== */
App.registerView('quidditch', async function (box) {
  const stat = await App.readStat();
  const chars = stat.女巫角色 || {};
  const names = Object.keys(chars);
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🏟️</span>魁地奇<span class="sub">球场的欢呼 · 金色飞贼</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:12px">魁地奇是霍格沃茨的心脏。看一场比赛，或在球场与女巫们相遇——她的性格标签决定她是观众、球员还是对手。</div>';
  const players = names.filter(n => {
    const c = chars[n] || {};
    return (c.身份 || '').includes('魁地奇') || (c.身份 || '').includes('球');
  });
  h += '<div class="hgw-grid cols-3">';
  h += '<div class="hgw-stat-card"><div class="num">' + players.length + '</div><div class="lbl">已知球员</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">🏟️</div><div class="lbl">主场</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">150</div><div class="lbl">抓住飞贼得分</div></div>';
  h += '</div>';
  h += '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">';
  h += '<button class="hgw-btn ok" id="hgw-q-view">👀 观看一场比赛</button>';
  h += '<button class="hgw-btn magic" id="hgw-q-bet">🎲 赌一把（金加隆）</button>';
  h += '</div></div>';
  box.innerHTML = h;

  const viewBtn = App.$('#hgw-q-view');
  if (viewBtn) viewBtn.addEventListener('click', async () => {
    const teamA = App.pick(['格兰芬多', '斯莱特林', '拉文克劳', '赫奇帕奇']);
    let teamB = App.pick(['格兰芬多', '斯莱特林', '拉文克劳', '赫奇帕奇']);
    while (teamB === teamA) teamB = App.pick(['格兰芬多', '斯莱特林', '拉文克劳', '赫奇帕奇']);
    const aScore = App.rand(10, 200), bScore = App.rand(10, 200);
    const aWin = aScore > bScore;
    const winner = aWin ? teamA : teamB;
    const text = '（魁地奇：' + teamA + ' ' + aScore + ' : ' + bScore + ' ' + teamB + '——' + winner + ' 获胜！' + (players.length ? '你在看台上看到了' + players.join('、') : '全场沸腾') + '）';
    App.UI.confetti(30);
    App.UI.toast('🏟️ ' + winner + ' 获胜！', 'gold');
    await App.sendAction(text);
    App.addLog('social', text);
  });
  const betBtn = App.$('#hgw-q-bet');
  if (betBtn) betBtn.addEventListener('click', async () => {
    const teamA = App.pick(['格兰芬多', '斯莱特林', '拉文克劳', '赫奇帕奇']);
    let teamB = App.pick(['格兰芬多', '斯莱特林', '拉文克劳', '赫奇帕奇']);
    while (teamB === teamA) teamB = App.pick(['格兰芬多', '斯莱特林', '拉文克劳', '赫奇帕奇']);
    const bet = 10;
    const cur = App.gold(stat);
    if (cur < bet) { App.UI.toast('金加隆不足（需 ' + bet + '）', 'warn'); return; }
    const win = Math.random() > 0.5;
    const gain = win ? bet * 2 : 0;
    const s = await App.readStat(true);
    const w = s.玩家.财产 || {};
    w.金加隆 = (w.金加隆 || 0) - bet + gain;
    await App.writeStat({ 玩家: { 财产: w } });
    await App.sendAction('（魁地奇赌注：押 ' + (win ? teamA : teamB) + ' ' + bet + ' 加隆——' + (win ? '赢了！得 ' + gain + ' 加隆' : '输了，损失 ' + bet + ' 加隆') + '）');
    App.UI.toast(win ? '🎉 赌赢了！+' + gain + ' 加隆' : '💸 赌输了…-' + bet + ' 加隆', win ? 'gold' : 'danger');
    App.addLog('social', win ? '魁地奇赌赢 +' + gain : '魁地奇赌输 -' + bet);
    App.refreshTopbar();
  });
});

/* ========== 占卜（塔罗/星盘） ========== */
App.registerView('divination', async function (box) {
  const CARDS = [
    ['🃏 恋人', '结合与选择——一段关系正在成形', '正位：亲密关系升温'],
    ['🃏 愚者', '新的开始——不计后果的勇气', '正位：大胆行动会有惊喜'],
    ['🃏 魔术师', '能力与创造——你的手段正在起效', '正位：主动出击的好时机'],
    ['🃏 女祭司', '直觉与秘密——答案藏在沉默里', '正位：倾听她的潜台词'],
    ['🃏 皇帝', '权威与秩序——规矩既是保护也是枷锁', '逆位：挑战权威可能有收获'],
    ['🃏 战车', '意志与胜利——朝着目标碾压过去', '正位：决斗/竞争大吉'],
    ['🃏 力量', '温柔的控制——真正的强者不靠蛮力', '正位：耐心与柔情更有效'],
    ['🃏 隐者', '独处与探索——答案在寂静之中', '正位：今晚一个人待着？'],
    ['🃏 命运之轮', '转机——事情正在起变化', '正位：转折点到来了'],
    ['🃏 正义', '因果——付出终有回报', '正位：你的行为会有后果'],
    ['🃏 倒吊人', '换位思考——换个角度豁然开朗', '逆位：她或许在等你先低头'],
    ['🃏 死神', '终结与重生——旧章结束新章开始', '逆位：一段关系将迎来转变'],
    ['🃏 节制', '平衡——别走极端', '正位：张弛有度是良策'],
    ['🃏 恶魔', '执念与欲望——沉溺还是挣脱？', '正位：小心欲望的陷阱'],
    ['🃏 高塔', '崩塌与解放——旧秩序被打破', '逆位：剧变中有机遇'],
    ['🃏 星星', '希望——夜越黑，星越亮', '正位：一切都会好起来'],
    ['🃏 月亮', '不安与幻觉——看不清的才是真相', '逆位：别被表象迷惑'],
    ['🃏 太阳', '成功与喜悦——光明的结局', '正位：大吉大利'],
    ['🃏 审判', '觉醒——过往的答案浮出水面', '正位：旧事重提的时机'],
    ['🃏 世界', '圆满——一个循环的完成', '正位：毕业/突破/结局临近'],
  ];
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🔮</span>占卜室<span class="sub">命运的低语 · 仅供娱乐</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:12px">特里劳妮教授常年把占卜教室熏得烟雾缭绕。抽一张塔罗牌，让命运的暗示指引今天的行动。</div>';
  h += '<div style="text-align:center;padding:20px 0"><button class="hgw-btn magic lg" id="hgw-div-draw">🔮 抽取命运之牌</button></div>';
  h += '<div id="hgw-div-result"></div></div>';
  box.innerHTML = h;
  const draw = App.$('#hgw-div-draw');
  if (draw) draw.addEventListener('click', async () => {
    const card = App.pick(CARDS);
    const res = App.$('#hgw-div-result');
    if (!res) return;
    res.innerHTML = '<div class="hgw-card gold-border hgw-fade-in" style="text-align:center;padding:24px">' +
      '<div style="font-size:42px">' + card[0] + '</div>' +
      '<div class="hgw-font-serif" style="font-size:20px;color:#e8d48b;margin:10px 0">' + card[1] + '</div>' +
      '<div class="hgw-note">' + card[2] + '</div>' +
      '<div style="margin-top:12px"><span class="hgw-tag magic">占卜 · ' + App.now().split(' ')[0] + '</span></div></div>';
    await App.sendAction('（我在占卜教室抽了一张塔罗牌：' + card[0] + '——' + card[1] + '）');
    App.addLog('social', '占卜：' + card[0] + ' ' + card[1]);
    App.UI.spellFlash('purple');
  });
});

/* ========== 禁林探险 ========== */
App.registerView('forest', async function (box) {
  const ENC = [
    ['🦄', '独角兽', '银色光辉一闪而过——它看着你，似乎在评判你的灵魂。', '它靠近了你：你的内心是干净的（获得祝福，层进度+3）', '它消失了：你的灵魂有阴影（什么也没发生）'],
    ['🕷️', '八眼巨蛛', '窸窣声从黑暗里传来，巨蛛的眼睛像灯笼。', '你冷静退走，用荧光闪烁照路（安全离开）', '你拔腿就跑，差点被蛛丝缠住（体力-5）'],
    ['🐴', '马人', '马人从树后现身，弓箭搭着——他盯着你看了很久。', '他对你点了点头：夜骐在等你（获得线索）', '他转身离去：禁林今天不欢迎你'],
    ['🦅', '鹰头马身有翼兽', '高傲的生物昂着首，它等待你的行礼。', '你行礼了——它允许你靠近（羽毛材料+1）', '你盯着它看——它嫌弃地走开了'],
    ['🐍', '蛇', '禁林里的蛇昂起头，嘶嘶作响。', '你用蛇佬腔（如果你会）或者安静退开', '你被蛇盯得发毛，快步离开'],
    ['🌙', '月光泉', '一汪银色的泉水在月光下发光——传说饮一口能恢复魔力。', '你饮了一口泉水（魔力+5）', '水太冷，你只是洗了把脸'],
    ['🌫️', '迷雾', '浓雾突然涌来，方向感消失。', '你点亮魔杖，找到了回城堡的路', '你迷路了半小时才摸回城堡（时段被浪费）'],
    ['🦉', '猫头鹰', '一只野生猫头鹰落在你肩上，歪头看你。', '它愿意当你一晚的信使（传递一封信）', '它飞走了，留下一根羽毛'],
  ];
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🌲</span>禁林探险<span class="sub">危险与奇遇并存 · 深夜限定</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:12px">禁林边缘的月光下，危险与奇遇并存。费尔奇不会去的地方，藏着魔法世界最野的一面。</div>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
  h += '<button class="hgw-btn danger" id="hgw-forest-go">🌲 进入禁林</button>';
  h += '<button class="hgw-btn" id="hgw-forest-edge">🌿 只在边缘转转</button>';
  h += '</div>';
  h += '<div id="hgw-forest-log" class="hgw-battle-log" style="margin-top:12px"><span class="lg-sys">—— 禁林的寂静等待着脚步声 ——</span></div></div>';
  box.innerHTML = h;
  const logEl = () => App.$('#hgw-forest-log');
  const go = App.$('#hgw-forest-go');
  if (go) go.addEventListener('click', async () => {
    const e = App.pick(ENC);
    const good = Math.random() > 0.4;
    const txt = good ? e[3] : e[4];
    const s = await App.readStat(true);
    const p = s.玩家 || {};
    let extra = '';
    if (txt.includes('层进度')) { p.魔力阶位 = p.魔力阶位 || {}; p.魔力阶位.层进度 = Math.min(100, (p.魔力阶位.层进度 || 0) + 3); extra = '｜层进度+3'; }
    if (txt.includes('体力-5')) { p.属性 = p.属性 || {}; p.属性.体力 = Math.max(0, (p.属性.体力 || 0) - 5); }
    if (txt.includes('魔力+5')) { p.属性 = p.属性 || {}; p.属性.魔力值 = (p.属性.魔力值 || 0) + 5; extra = '｜魔力+5'; }
    if (txt.includes('羽毛材料')) { p.材料 = p.材料 || {}; p.材料.夜骐鬃毛 = p.材料.夜骐鬃毛 || { 数量: 0, 品级: '稀有' }; p.材料.夜骐鬃毛.数量 += 1; extra = '｜夜骐鬃毛+1'; }
    await App.writeStat({ 玩家: p });
    const msg = '（禁林遇见了' + e[1] + '——' + e[2] + ' ' + txt + extra + '）';
    if (logEl()) logEl().innerHTML = '<div><span class="lg-you">🦉 ' + App.esc(e[0] + ' ' + e[1] + '：' + e[2]) + '</span></div><div><span class="lg-sys">' + App.esc(txt + extra) + '</span></div>';
    await App.sendAction(msg);
    App.addLog('social', '禁林：' + e[1] + ' ' + txt);
    App.UI.spellFlash('green');
  });
  const edge = App.$('#hgw-forest-edge');
  if (edge) edge.addEventListener('click', async () => {
    const finds = ['一丛月光草（材料+1）', '一根猫头鹰羽毛', '一枚磨损的金加隆', '一朵发光的蘑菇', '一颗圆润的鹅卵石'];
    const f = App.pick(finds);
    const s = await App.readStat(true);
    if (f.includes('月光草')) {
      s.玩家.材料 = s.玩家.材料 || {};
      s.玩家.材料.月光草 = s.玩家.材料.月光草 || { 数量: 0, 品级: '精良' };
      s.玩家.材料.月光草.数量 += 1;
      await App.writeStat({ 玩家: s.玩家 });
    }
    const msg = '（我在禁林边缘转了一圈，捡到了' + f + '）';
    if (logEl()) logEl().innerHTML = '<div><span class="lg-you">🌿 边缘散步：' + App.esc(f) + '</span></div>';
    await App.sendAction(msg);
    App.addLog('social', '禁林边缘：' + f);
  });
});

/* ========== 成就视图 ========== */
App.registerView('achievements', async function (box) {
  const stat = await App.readStat();
  const p = stat.玩家 || {};
  const rp = p.魔力阶位 || {};
  const zj = p.战绩 || {};
  const chars = stat.女巫角色 || {};

  function check(a) {
    switch (a.id) {
      case 'first_duel': return (zj.累计缴械 || 0) + (zj.累计被缴械 || 0) > 0;
      case 'duel_win_1': return (zj.累计缴械 || 0) >= 1;
      case 'duel_win_10': return (zj.累计缴械 || 0) >= 10;
      case 'duel_win_50': return (zj.累计缴械 || 0) >= 50;
      case 'honor_100': return (zj.决斗荣誉 || 0) >= 100;
      case 'honor_500': return (zj.决斗荣誉 || 0) >= 500;
      case 'realm_2': return (rp.大境界 || 1) >= 2;
      case 'realm_3': return (rp.大境界 || 1) >= 3;
      case 'realm_5': return (rp.大境界 || 1) >= 5;
      case 'realm_9': return (rp.大境界 || 1) >= 9;
      case 'first_love': return Object.values(chars).some(c => (c.高潮次数 || 0) > 0);
      case 'love_10': return Object.values(chars).reduce((a, c) => a + (c.高潮次数 || 0), 0) >= 10;
      case 'fall_100': return Object.values(chars).some(c => (c.堕落值 || 0) >= 100);
      case 'fav_100': return Object.values(chars).some(c => (c.好感度 || 0) >= 100);
      case 'brew_1': return (p.炼药 && p.炼药.熟练度 > 0);
      case 'brew_10': return (p.炼药 && p.炼药.熟练度 >= 50);
      case 'brew_50': return (p.炼药 && p.炼药.熟练度 >= 100);
      case 'rich_100': return App.gold(stat) >= 100;
      case 'rich_500': return App.gold(stat) >= 500;
      case 'first_break': return (rp.突破记录 || []).length > 0;
      case 'meet_5': return Object.keys(chars).length >= 5;
      case 'meet_11': return Object.keys(chars).length >= 11;
      case 'owl_year': return (stat.时间 || {}).学年 >= 5;
      case 'newt_year': return (stat.时间 || {}).学年 >= 6;
      case 'war_year': return (stat.时间 || {}).学年 >= 7;
      case 'academic_450': return ((p.学业 || {}).学业总分 || 0) >= 450;
      case 'academic_600': return ((p.学业 || {}).学业总分 || 0) >= 600;
      case 'sub_100': return Object.values((p.学业 || {}).各科 || {}).some(v => v >= 100);
      default: return false;
    }
  }
  const done = App.ACHIEVEMENTS.filter(check).length;
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🏆</span>成就殿堂<span class="sub">' + done + ' / ' + App.ACHIEVEMENTS.length + ' 已达成</span></div>';
  h += '<div class="hgw-bar gold" style="margin-bottom:14px"><i style="width:' + Math.round(done / App.ACHIEVEMENTS.length * 100) + '%"></i></div>';
  h += '<div class="hgw-grid cols-3">';
  for (const a of App.ACHIEVEMENTS) {
    const ok = check(a);
    h += '<div class="hgw-card' + (ok ? ' gold-border' : '') + '" style="' + (ok ? '' : 'opacity:0.6') + '">';
    h += '<div class="card-title"><span>' + (ok ? '🏅' : '🔒') + '</span>' + a.名 + (ok ? ' <span class="hgw-badge ok">已达成</span>' : '') + '</div>';
    h += '<div class="card-body">' + a.描述 + '</div>';
    h += '<div class="card-foot"><span class="hgw-tag">' + a.条件 + '</span><span class="hgw-tag gold">奖励：' + a.奖 + '</span></div>';
    h += '</div>';
  }
  h += '</div></div>';
  box.innerHTML = h;
});

/* ========== 统计视图 ========== */
App.registerView('stats', async function (box) {
  const stat = await App.readStat();
  const p = stat.玩家 || {};
  const chars = stat.女巫角色 || {};
  const names = Object.keys(chars);
  const totalLove = Object.values(chars).reduce((a, c) => a + (c.高潮次数 || 0), 0);
  const totalFav = Object.values(chars).reduce((a, c) => a + (c.好感度 || 0), 0);
  const totalFall = Object.values(chars).reduce((a, c) => a + (c.堕落值 || 0), 0);
  const totalStack = Object.values(chars).reduce((a, c) => a + (c.欲望积压 || 0), 0);
  const logs = App.loadLog();
  const counts = { battle: 0, love: 0, brew: 0, break: 0, social: 0 };
  logs.forEach(l => { if (counts[l.type] != null) counts[l.type]++; });

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>📊</span>校园统计<span class="sub">你的霍格沃茨足迹</span></div>';
  h += '<div class="hgw-grid cols-4">';
  h += '<div class="hgw-stat-card"><div class="num">' + names.length + '</div><div class="lbl">认识的女巫</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + totalFav + '</div><div class="lbl">好感总和</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + totalLove + '</div><div class="lbl">亲密高潮总数</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + totalStack + '</div><div class="lbl">欲望积压总和</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (p.战绩 || {}).累计缴械 || 0 + '</div><div class="lbl">决斗胜场</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + (p.战绩 || {}).决斗荣誉 || 0 + '</div><div class="lbl">决斗荣誉</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + App.gold(stat) + '</div><div class="lbl">金加隆</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + ((p.魔力阶位 || {}).突破记录 || []).length + '</div><div class="lbl">突破次数</div></div>';
  h += '</div></div>';

  h += '<div class="hgw-panel"><div class="panel-title"><span>📈</span>行为统计<span class="sub">本地日志 ' + logs.length + ' 条</span></div><div class="hgw-grid cols-4">';
  h += '<div class="hgw-stat-card"><div class="num">' + counts.battle + '</div><div class="lbl">⚔️ 决斗</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + counts.love + '</div><div class="lbl">💗 亲密</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + counts.brew + '</div><div class="lbl">🧪 炼药</div></div>';
  h += '<div class="hgw-stat-card"><div class="num">' + counts.break + '</div><div class="lbl">💠 突破</div></div>';
  h += '</div></div>';

  // 女巫排名
  if (names.length) {
    h += '<div class="hgw-panel"><div class="panel-title"><span>🏅</span>女巫关系榜</div><div class="hgw-list">';
    const sorted = names.slice().sort((a, b) => (chars[b].好感度 || 0) - (chars[a].好感度 || 0));
    sorted.forEach((n, i) => {
      const c = chars[n] || {};
      h += '<div class="hgw-row"><span class="hgw-badge gold">#' + (i + 1) + '</span><span style="font-weight:600">' + App.esc(n) + '</span><span class="hgw-muted">好感 ' + (c.好感度 || 0) + ' ｜ 服气 ' + (c.缴械值 || 0) + ' ｜ 堕落 ' + (c.堕落值 || 0) + ' ｜ 高潮 ' + (c.高潮次数 || 0) + '</span></div>';
    });
    h += '</div></div>';
  }
  box.innerHTML = h;
});
