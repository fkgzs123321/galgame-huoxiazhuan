/* ============================================================
   霍格沃茨 · 同层应用 做爱视图（亲密面板）
   ============================================================ */
'use strict';

App.registerView('love', async function (box) {
  const stat = await App.readStat();
  const d = stat.双修 || {};
  const target = d.对象 || '';
  const ch = (stat.女巫角色 || {})[target] || {};
  const p = stat.玩家 || {};
  const pots = p.魔药 || {};
  const state = d.会话状态 || '未开始';

  let h = '';

  /* —— 目标选择 —— */
  if (!target) {
    const chars = stat.女巫角色 || {};
    const names = Object.keys(chars);
    h += '<div class="hgw-panel"><div class="panel-title"><span>💗</span>亲密<span class="sub">欲望与情感的自然延伸 · 不涨魔力不强化战斗</span></div>';
    h += '<div class="hgw-note" style="margin-bottom:12px">亲密只喂养关系本身。她答不答应，取决于好感度（≥30 或已缴械）与她的性格——被拒绝是常态，别强求。</div>';
    if (!names.length) {
      h += App.UI.empty('💗', '还没有亲密对象——先在剧情里建立关系。');
    } else {
      h += '<div class="hgw-list">';
      for (const n of names) {
        const c = chars[n] || {};
        const info = App.houseInfo(c.学院);
        const ok = (c.好感度 || 0) >= 30 || c.是否缴械;
        h += '<div class="hgw-row' + (ok ? '' : ' disabled') + '" data-pick="' + n + '">';
        h += '<span style="font-weight:600;color:#e8d48b">' + App.esc(n) + '</span>' + App.houseBadge(c.学院);
        h += '<span class="hgw-muted">好感 ' + (c.好感度 || 0) + (ok ? ' ｜ <span class="hgw-text-ok">可接近</span>' : ' ｜ <span class="hgw-text-faint">尚未敞开心扉</span>') + '</span>';
        if (ok) h += '<button class="hgw-btn sm love" style="margin-left:auto">开始亲密</button>';
        h += '</div>';
      }
      h += '</div>';
    }
    h += '</div>';
    box.innerHTML = h;
    App.$$('[data-pick]', box).forEach(el => el.addEventListener('click', async () => {
      const n = el.dataset.pick;
      const c = (stat.女巫角色 || {})[n] || {};
      if ((c.好感度 || 0) < 30 && !c.是否缴械) {
        App.UI.toast(n + ' 婉拒了你的靠近——好感度不够', 'warn');
        await App.sendAction('（我试探性地靠近' + n + '，被她婉拒了——也许该先赢得她的信任）');
        return;
      }
      await App.Love.start(n);
      App.navigate('love');
    }));
    return;
  }

  /* —— 会话面板 —— */
  h += '<div class="hgw-panel"><div class="panel-title"><span>💗</span>亲密会话<span class="sub">' + App.esc(target) + ' · ' + state + '</span></div>';
  h += '<div class="hgw-note" style="margin-bottom:10px">对象：<strong>' + App.esc(target) + '</strong> ｜ 好感 ' + (ch.好感度 || 0) + ' ｜ 堕落值 ' + (ch.堕落值 || 0) + ' ｜ 高潮次数 ' + (ch.高潮次数 || 0) + '</div>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
  h += '<button class="hgw-btn love" id="hgw-l-confirm" ' + (d.高潮待宣 ? '' : 'disabled') + '>💦 确认高潮' + (d.高潮待宣 ? '（待宣！）' : '') + '</button>';
  h += '<button class="hgw-btn" id="hgw-l-undo" ' + (d.可回溯 ? '' : 'disabled') + '>↩ 回溯上轮</button>';
  h += '<button class="hgw-btn danger" id="hgw-l-finish" ' + (state === '进行中' || state === '裁决中' ? '' : 'disabled') + '>✅ 结束结算</button>';
  h += '<button class="hgw-btn ghost" id="hgw-l-switch">🔄 换对象</button>';
  h += '</div></div>';

  // 契合度提示
  const hints = App.Love.fitHints.length ? App.Love.fitHints : App.Love.computeHints(stat);
  if (hints.length) {
    h += '<div class="hgw-fit-hint"><div class="fh-title">✨ 契合度提示（按她的身体档案）</div>' + hints.map(x => '· ' + x).join('<br>') + '</div>';
  }

  /* —— 五维 —— */
  h += '<div class="hgw-panel"><div class="panel-title"><span>📊</span>五维推进</div><div class="hgw-love-dims">';
  const dims = [
    ['修为进度', d.修为进度 || 0, 'gold', '本场亲密度'],
    ['情欲', d.情欲 || 0, 'pink', '欲望升温'],
    ['快感', d.快感 || 0, 'red', d.高潮待宣 ? '已满 · 待宣布！' : '满 100 触发高潮'],
    ['堕落', d.堕落 || 0, 'purple', '她的心理沉沦'],
    ['顺从', d.顺从 || 0, 'green', '配合度'],
  ];
  for (const [k, v, color, sub] of dims) {
    h += '<div class="hgw-card hgw-dim-card' + (k === '快感' && d.高潮待宣 ? ' orgasm-flag' : '') + '"><div class="dname">' + k + '</div><div class="dval">' + v + '</div><div class="hgw-bar ' + color + '"><i style="width:' + v + '%"></i></div><div class="hgw-note" style="font-size:9px">' + sub + '</div></div>';
  }
  h += '</div></div>';

  /* —— 动作编排 —— */
  h += '<div class="hgw-panel"><div class="panel-title"><span>🎬</span>动作编排<span class="sub">1~3 组 · 行为×部位×风格</span></div>';
  h += '<div class="hgw-grid cols-3">';
  h += '<div class="hgw-card"><div class="lb hgw-text-dim" style="font-size:11px">行为</div><select class="hgw-sel" id="hgw-l-act">' + App.ACTS.map(a => '<option>' + a + '</option>').join('') + '</select></div>';
  h += '<div class="hgw-card"><div class="lb hgw-text-dim" style="font-size:11px">部位</div><select class="hgw-sel" id="hgw-l-part">' + App.PARTS.map(a => '<option>' + a + '</option>').join('') + '</select></div>';
  h += '<div class="hgw-card"><div class="lb hgw-text-dim" style="font-size:11px">风格</div><select class="hgw-sel" id="hgw-l-style">' + App.STYLES.map(a => '<option>' + a + '</option>').join('') + '</select></div>';
  h += '</div>';
  h += '<div style="margin-top:10px"><button class="hgw-btn love sm" id="hgw-l-add">+ 加入编排</button></div>';
  h += '<div class="hgw-combo-list" id="hgw-l-combos">';
  if (!App.Love.actions.length) h += '<div class="hgw-note">未编排动作</div>';
  else App.Love.actions.forEach((a, i) => { h += '<div class="hgw-combo-item"><span class="ci-idx">' + (i + 1) + '</span><span>' + a.行为 + ' · ' + a.部位 + ' · ' + a.风格 + '</span><span class="ci-del" data-del="' + i + '">✕</span></div>'; });
  h += '</div></div>';

  /* —— 主导/体位/物品 —— */
  h += '<div class="hgw-panel"><div class="panel-title"><span>🎛️</span>主导 · 体位 · 物品</div><div class="hgw-grid cols-3">';
  h += '<div class="hgw-card"><div class="lb hgw-text-dim" style="font-size:11px">主导方</div><select class="hgw-sel" id="hgw-l-leader"><option>我来</option><option>对方来</option></select></div>';
  h += '<div class="hgw-card"><div class="lb hgw-text-dim" style="font-size:11px">体位</div><select class="hgw-sel" id="hgw-l-pos"><option>正常位</option><option>后入式</option><option>骑乘式</option><option>侧卧位</option><option>六九式</option><option>站立式</option></select></div>';
  h += '<div class="hgw-card"><div class="lb hgw-text-dim" style="font-size:11px">物品</div><select class="hgw-sel" id="hgw-l-item"><option>不使用物品</option>' + (pots.迷情剂 > 0 ? '<option>迷情剂（×' + pots.迷情剂 + '）</option>' : '') + (pots.润滑魔油 > 0 ? '<option>润滑魔油（×' + pots.润滑魔油 + '）</option>' : '') + '</select></div>';
  h += '</div>';
  h += '<div style="margin-top:12px"><button class="hgw-btn love lg" id="hgw-l-guide" ' + (state === '进行中' ? '' : 'disabled') + '>💗 引导（结算并发楼层）</button>';
  h += '<span class="hgw-note" style="margin-left:8px">命中敏感部位/缠绵风格 → 上佳品质（×1.5 收益）</span></div></div>';

  /* —— 历史轮 —— */
  const hist = d.历史轮 || [];
  if (hist.length) {
    h += '<div class="hgw-panel"><div class="panel-title"><span>📖</span>历史轮</div><div class="hgw-hist-list">';
    for (const x of hist) {
      h += '<div class="hgw-hist-item"><span class="hi-round">#' + x.轮次 + '</span><span>' + App.esc(x.动作) + '</span><span class="hgw-tag ' + (x.结果 === '上佳' ? 'gold' : '') + '">' + x.结果 + '</span></div>';
    }
    h += '</div></div>';
  }

  box.innerHTML = h;

  /* 事件绑定 */
  const renderCombos = () => {
    const el = App.$('#hgw-l-combos');
    if (!el) return;
    if (!App.Love.actions.length) { el.innerHTML = '<div class="hgw-note">未编排动作</div>'; return; }
    el.innerHTML = App.Love.actions.map((a, i) =>
      '<div class="hgw-combo-item"><span class="ci-idx">' + (i + 1) + '</span><span>' + a.行为 + ' · ' + a.部位 + ' · ' + a.风格 + '</span><span class="ci-del" data-del="' + i + '">✕</span></div>'
    ).join('');
    App.$$('.ci-del', el).forEach(x => x.addEventListener('click', () => {
      App.Love.actions.splice(parseInt(x.dataset.del), 1);
      renderCombos();
    }));
  };
  const addBtn = App.$('#hgw-l-add');
  if (addBtn) addBtn.addEventListener('click', () => {
    if (App.Love.actions.length >= 3) { App.UI.toast('最多 3 组动作', 'warn'); return; }
    const act = App.$('#hgw-l-act').value;
    const part = App.$('#hgw-l-part').value;
    const style = App.$('#hgw-l-style').value;
    if ((App.NO_ACT[act] || []).includes(part)) { App.UI.toast('该行为不适用于此部位', 'warn'); return; }
    App.Love.actions.push({ 行为: act, 部位: part, 风格: style });
    renderCombos();
  });
  const guide = App.$('#hgw-l-guide');
  if (guide) guide.addEventListener('click', async () => {
    if (!App.Love.actions.length) { App.UI.toast('先编排动作！', 'warn'); return; }
    guide.disabled = true;
    const q = await App.Love.guide(
      App.Love.actions.slice(),
      App.$('#hgw-l-leader').value,
      App.$('#hgw-l-pos').value,
      App.$('#hgw-l-item').value
    );
    guide.disabled = false;
    App.navigate('love');
  });
  const conf = App.$('#hgw-l-confirm');
  if (conf) conf.addEventListener('click', async () => { await App.Love.confirmOrgasm(); App.navigate('love'); });
  const undo = App.$('#hgw-l-undo');
  if (undo) undo.addEventListener('click', async () => { await App.Love.undo(); App.navigate('love'); });
  const fin = App.$('#hgw-l-finish');
  if (fin) fin.addEventListener('click', async () => {
    if (!(await App.UI.confirm({ title: '结束亲密', msg: '确定结束本次亲密并结算关系收益吗？', sub: '好感按修为进度折算，堕落值按本场堕落折算', icon: 'love', okText: '结算' }))) return;
    await App.Love.finish();
    App.navigate('love');
  });
  const sw = App.$('#hgw-l-switch');
  if (sw) sw.addEventListener('click', async () => {
    await App.writeStat({ 双修: { 会话状态: '未开始', 对象: '' } });
    App.navigate('love');
  });
});
