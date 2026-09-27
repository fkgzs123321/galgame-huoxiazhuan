/* ============================================================
   开局引导 · 角色创建向导（Create）
   7 步：人设/学院 → 属性 → 天赋 → 初始魔咒 → 道具 → 剧情时间 → API 设置
   完成后写入 stat_data + HGW_GUIDE_DONE 标记，进入主聊天
   ============================================================ */
'use strict';

App.GUIDE_KEY = 'HGW_GUIDE_DONE';

App.registerView('create', async function (box) {
  const stat = await App.readStat();
  const G = {
    step: 1,
    name: '我',
    学院: '格兰芬多',
    血统: '混血',
    属性: { 体力: 80, 魔力值: 76, 魔法感知: 60 },
    天赋: '魔力亲和',
    强化咒语: '',
    额外咒语: '',
    魔杖材质: '冬青木',
    杖芯: '凤凰尾羽',
    起始包: '标准新生包',
  };
  const STEPS = ['人设', '属性', '天赋', '魔咒', '道具', '时间', 'API'];
  const TALENTS = [
    { 名: '魔力亲和', 效果: '魔力值 +10（天生对魔力敏感，修炼事半功倍）', mod: { 魔力值: 10 } },
    { 名: '运动健将', 效果: '体力 +10（追飞贼、跑楼梯从不喘）', mod: { 体力: 10 } },
    { 名: '感知敏锐', 效果: '魔法感知 +10（能察觉细微的魔法波动与人心）', mod: { 魔法感知: 10 } },
    { 名: '炼药世家', 效果: '魔药学 +10（坩埚边长大的孩子）', mod: { 魔药学: 10 } },
    { 名: '魔法史爱好者', 效果: '魔法史 +10（对城堡秘密与古代魔法如数家珍）', mod: { 魔法史: 10 } },
    { 名: '魁地奇苗子', 效果: '体力 +5、天文学 +5（从小向往天空）', mod: { 体力: 5, 天文学: 5 } },
  ];
  const SPELLS = [
    { 名: '昏昏倒地', 描述: '直击：Lv×3 伤害，每回合麻痒点+2' },
    { 名: '火焰熊熊', 描述: '灼热：Lv×2 伤害，她本回合减伤-1' },
    { 名: '摄神取念', 描述: '精神渗透：Lv×1 伤害，敏感度提升' },
    { 名: '统统石化', 描述: '束缚：命中后她下回合无法行动' },
    { 名: '厉火咒', 描述: '凶险：Lv×3 伤害，但自身也有风险' },
    { 名: '粉身碎骨', 描述: '破甲：优先削减防守值上限' },
    { 名: '万弹齐发', 描述: '连击：多段低伤，越打越顺' },
  ];
  const EXTRA_SPELLS = ['荧光闪烁', '漂浮咒', '开锁咒', '幻身咒', '速速禁锢', '愈合如初'];
  const WAND_WOODS = ['冬青木', '紫杉木', '山毛榉', '葡萄藤'];
  const WAND_CORES = ['凤凰尾羽', '龙心弦', '独角兽毛'];
  const PACKS = {
    '标准新生包': { 金加隆: 20, 魔药: { 欢欣剂: 1, 润滑魔油: 2, 安神药剂: 1 }, 材料: { '曼德拉草根': 2, '月长石粉': 2 }, desc: '20 金加隆 + 3 瓶魔药 + 4 份基础材料（均衡）' },
    '富裕家庭包': { 金加隆: 50, 魔药: { 欢欣剂: 2, 润滑魔油: 3, 安神药剂: 2 }, 材料: { '曼德拉草根': 3, '月长石粉': 3, '独角兽角粉': 2 }, desc: '50 金加隆 + 7 瓶魔药 + 8 份材料（富家子弟）' },
    '勤工俭学包': { 金加隆: 5, 魔药: { 欢欣剂: 1, 润滑魔油: 1 }, 材料: { '曼德拉草根': 4, '月长石粉': 4, '龙血': 2, '蛇牙粉': 2 }, desc: '5 金加隆 + 2 瓶魔药 + 12 份材料（穷但能打）' },
  };

  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🧙</span>分院仪式 · 角色创建<span class="sub">1991 年 · 霍格沃茨新生入学</span></div>';
  // 步骤条
  h += '<div class="hgw-tabs" id="hgw-guide-steps" style="margin-bottom:14px">' + STEPS.map((s, i) =>
    '<div class="hgw-tab' + (i === 0 ? ' on' : '') + '" data-gstep="' + (i + 1) + '">' + (i + 1) + '. ' + s + '</div>').join('') + '</div>';
  h += '<div id="hgw-guide-body"></div>';
  h += '<div style="display:flex;gap:8px;margin-top:14px;align-items:center">';
  h += '<button class="hgw-btn" id="hgw-guide-prev" style="display:none">← 上一步</button>';
  h += '<button class="hgw-btn magic lg" id="hgw-guide-next">下一步 →</button>';
  h += '<button class="hgw-btn ghost" id="hgw-guide-skip" style="margin-left:auto">跳过引导（用默认设定直接开始）</button>';
  h += '</div>';
  h += '</div>';
  box.innerHTML = h;

  const body = App.$('#hgw-guide-body');
  const nextBtn = App.$('#hgw-guide-next');
  const prevBtn = App.$('#hgw-guide-prev');

  function render() {
    const s = G.step;
    // 步骤高亮
    App.$$('#hgw-guide-steps .hgw-tab', box).forEach((el, i) => el.classList.toggle('on', i + 1 === s));
    prevBtn.style.display = s > 1 ? '' : 'none';
    nextBtn.textContent = s === 7 ? '✅ 完成创建，开始剧情' : '下一步 →';
    let x = '';
    if (s === 1) {
      x += '<div class="hgw-note" style="margin-bottom:10px">先定下你的身份。1991 年 9 月 1 日，你将作为一年级新生踏入霍格沃茨（成年入学制，全员 17 岁起）。</div>';
      x += '<div class="hgw-field"><label>你的名字（玩家称呼）</label><input class="hgw-input" id="g-name" value="' + App.esc(G.name) + '" style="max-width:240px"></div>';
      x += '<div class="hgw-field"><label>学院（决定你的室友、公共休息室与社交圈）</label></div>';
      x += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' + ['格兰芬多', '斯莱特林', '拉文克劳', '赫奇帕奇'].map(c =>
        '<div class="hgw-card" data-gsel="学院" data-val="' + c + '" style="cursor:pointer;padding:10px 14px;' + (G.学院 === c ? 'border:1px solid var(--hgw-gold)' : '') + '">' + c + '</div>').join('') + '</div>';
      x += '<div class="hgw-field"><label>血统</label></div>';
      x += '<div style="display:flex;gap:8px;flex-wrap:wrap">' + ['纯血', '混血', '麻瓜出身'].map(c =>
        '<div class="hgw-card" data-gsel="血统" data-val="' + c + '" style="cursor:pointer;padding:8px 12px;' + (G.血统 === c ? 'border:1px solid var(--hgw-gold)' : '') + '">' + c + '</div>').join('') + '</div>';
    } else if (s === 2) {
      x += '<div class="hgw-note" style="margin-bottom:10px">分配初始属性（一年级新生的身体与天赋基础，参考值：体力 80 / 魔力值 76 / 魔法感知 60）。</div>';
      const attrs = [['体力', '体力值：决斗防守/体力消耗/日常行动'], ['魔力值', '魔力值：决斗防线 = 魔力值×1.2×阶位系数'], ['魔法感知', '魔法感知：对异性的敏锐度，影响先手与察觉']];
      for (const [k, d] of attrs) {
        x += '<div class="hgw-field"><label>' + k + '（' + d + '）</label><input class="hgw-input g-attr" data-attr="' + k + '" type="number" min="1" max="100" value="' + G.属性[k] + '" style="width:120px"></div>';
      }
    } else if (s === 3) {
      x += '<div class="hgw-note" style="margin-bottom:10px">选一项天赋——它会加成你的初始数值，并成为你的身份标签。</div>';
      for (const t of TALENTS) {
        x += '<div class="hgw-card" data-gsel="天赋" data-val="' + t.名 + '" style="cursor:pointer;padding:10px 14px;margin-bottom:8px;' + (G.天赋 === t.名 ? 'border:1px solid var(--hgw-gold)' : '') + '"><strong class="hgw-text-gold">' + t.名 + '</strong> — ' + t.效果 + '</div>';
      }
    } else if (s === 4) {
      x += '<div class="hgw-note" style="margin-bottom:10px">七个基础咒语已学会（Lv1）。<b>选一个强化到 Lv2</b>（你练得最熟的主战咒语），并可<b>挑一个额外咒语</b>进入你的魔咒库。</div>';
      x += '<div class="hgw-field"><label>强化咒语（主战）</label></div>';
      x += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' + SPELLS.map(sp =>
        '<div class="hgw-card" data-gsel="强化咒语" data-val="' + sp.名 + '" title="' + sp.描述 + '" style="cursor:pointer;padding:8px 12px;' + (G.强化咒语 === sp.名 ? 'border:1px solid var(--hgw-gold)' : '') + '">' + sp.名 + '</div>').join('') + '</div>';
      x += '<div class="hgw-field"><label>额外咒语（加入魔咒库）</label></div>';
      x += '<div style="display:flex;gap:8px;flex-wrap:wrap">' + EXTRA_SPELLS.map(sp =>
        '<div class="hgw-card" data-gsel="额外咒语" data-val="' + sp + '" style="cursor:pointer;padding:8px 12px;' + (G.额外咒语 === sp ? 'border:1px solid var(--hgw-gold)' : '') + '">' + sp + '</div>').join('') + '</div>';
    } else if (s === 5) {
      x += '<div class="hgw-note" style="margin-bottom:10px">去奥利凡德选一根魔杖，并挑选你的新生行囊。</div>';
      x += '<div class="hgw-field"><label>魔杖材质</label></div>';
      x += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' + WAND_WOODS.map(w =>
        '<div class="hgw-card" data-gsel="魔杖材质" data-val="' + w + '" style="cursor:pointer;padding:8px 12px;' + (G.魔杖材质 === w ? 'border:1px solid var(--hgw-gold)' : '') + '">' + w + '</div>').join('') + '</div>';
      x += '<div class="hgw-field"><label>杖芯</label></div>';
      x += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' + WAND_CORES.map(w =>
        '<div class="hgw-card" data-gsel="杖芯" data-val="' + w + '" style="cursor:pointer;padding:8px 12px;' + (G.杖芯 === w ? 'border:1px solid var(--hgw-gold)' : '') + '">' + w + '</div>').join('') + '</div>';
      x += '<div class="hgw-field"><label>新生行囊</label></div>';
      for (const [k, p] of Object.entries(PACKS)) {
        x += '<div class="hgw-card" data-gsel="起始包" data-val="' + k + '" style="cursor:pointer;padding:10px 14px;margin-bottom:8px;' + (G.起始包 === k ? 'border:1px solid var(--hgw-gold)' : '') + '"><strong class="hgw-text-gold">' + k + '</strong> — ' + p.desc + '</div>';
      }
    } else if (s === 6) {
      x += '<div class="hgw-note" style="margin-bottom:10px">确认你的故事起点。你将完整亲历原著七部曲：一年级（魔法石篇）→ 密室 → 阿兹卡班 → 火焰杯 → 凤凰社 → 混血王子 → 死亡圣器（霍格沃茨大战）。</div>';
      x += '<div class="hgw-card gold-border"><div class="card-body" style="line-height:2">' +
        '<strong class="hgw-text-gold">📅 开始时间：</strong>1991 年 9 月 1 日（星期一）<br>' +
        '<strong class="hgw-text-gold">🏫 入学：</strong>' + G.学院 + ' · 一年级 · 第一学期<br>' +
        '<strong class="hgw-text-gold">🧙 当前身份：</strong>' + G.name + ' · 霍格沃茨新生（' + G.血统 + '）<br>' +
        '<strong class="hgw-text-gold">✨ 天赋：</strong>' + G.天赋 + '</div></div>';
    } else if (s === 7) {
      const aiOk = App.AI && App.AI.enabled();
      x += '<div class="hgw-note" style="margin-bottom:10px">最后一步：配置独立 AI（可选）。配置后聊天可切换「独立 AI」模式——回复走你自己的 API，变量由 <upstore> 指令闭环写回。不配置也能用酒馆主链路玩。</div>';
      const cfg = App.AI ? App.AI.loadCfg() : {};
      x += '<div class="hgw-field"><label>Base URL（OpenAI 兼容，留空=只用酒馆主链路）</label><input class="hgw-input" id="g-api-url" placeholder="https://api.openai.com/v1" value="' + App.esc(cfg.baseUrl || '') + '"></div>';
      x += '<div class="hgw-field"><label>API Key</label><input class="hgw-input" id="g-api-key" type="password" placeholder="sk-..." value="' + App.esc(cfg.apiKey || '') + '"></div>';
      x += '<div class="hgw-field"><label>模型</label><input class="hgw-input" id="g-api-model" placeholder="gpt-4o / deepseek-chat / qwen-max" value="' + App.esc(cfg.model || '') + '"></div>';
      x += '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="hgw-btn" id="g-api-test">🔌 测试连接</button><span class="hgw-text-faint" style="align-self:center">' + (aiOk ? '当前已配置 ✓' : '未配置（可跳过）') + '</span></div>';
      x += '<div id="g-api-status" style="margin-top:8px"></div>';
    }
    body.innerHTML = x;
    // 选择卡片绑定
    App.$$('[data-gsel]', box).forEach(el => el.addEventListener('click', () => {
      const k = el.dataset.gsel, v = el.dataset.val;
      G[k] = v;
      App.$$('[data-gsel="' + k + '"]', box).forEach(x2 => x2.style.border = '');
      el.style.border = '1px solid var(--hgw-gold)';
    }));
    // 输入绑定
    const nameEl = App.$('#g-name');
    if (nameEl) nameEl.addEventListener('input', () => { G.name = nameEl.value.trim() || '我'; });
    App.$$('.g-attr', box).forEach(el => el.addEventListener('input', () => {
      G.属性[el.dataset.attr] = App.clamp(parseInt(el.value) || 1, 1, 100);
    }));
    const testBtn = App.$('#g-api-test');
    if (testBtn) testBtn.addEventListener('click', async () => {
      const st2 = App.$('#g-api-status');
      if (st2) st2.innerHTML = '<span class="hgw-tag magic">测试中…</span>';
      const r = await App.AI.test();
      if (st2) st2.innerHTML = r.ok ? '<span class="hgw-tag ok">✅ 连接成功：' + App.esc(r.text) + '</span>' : '<span class="hgw-tag danger">❌ ' + App.esc(r.error) + '</span>';
    });
  }

  /* 完成：写入 stat_data + 标记 */
  async function finish() {
    const talent = TALENTS.find(t => t.名 === G.天赋) || { mod: {} };
    const pack = PACKS[G.起始包] || PACKS['标准新生包'];
    const 咒语 = {};
    for (const sp of SPELLS) {
      咒语[sp.名] = { 等级: sp.名 === G.强化咒语 ? 2 : 1, 经验: 0 };
    }
    const 各科 = {
      魔咒学: 82 + (talent.mod.魔咒学 || 0),
      变形术: 75,
      黑魔法防御术: 88,
      魔药学: 70 + (talent.mod.魔药学 || 0),
      草药学: 65,
      天文学: 72 + (talent.mod.天文学 || 0),
      魔法史: 60 + (talent.mod.魔法史 || 0),
    };
    const patch = {
      时间: { 日期: '1991年9月1日', 星期: '星期一', 时段: '上午', 学年: 1, 学期: '第一学期', 学期描述: '一年级·第一学期' },
      玩家: {
        学业: { 年级: 1, 学院: G.学院, 血统: G.血统, 各科: 各科, 学业总分: Object.values(各科).reduce((a, b) => a + b, 0) },
        属性: {
          体力: App.clamp(G.属性.体力 + (talent.mod.体力 || 0), 1, 100),
          魔力值: App.clamp(G.属性.魔力值 + (talent.mod.魔力值 || 0), 1, 100),
          魔法感知: App.clamp(G.属性.魔法感知 + (talent.mod.魔法感知 || 0), 1, 100),
        },
        特质: G.天赋,
        咒语: 咒语,
        魔咒库: G.额外咒语 ? { [G.额外咒语]: { 等级: 1, 经验: 0 } } : {},
        装备: {
          魔杖: { 名: G.魔杖材质 + '魔杖', 材质: G.魔杖材质, 杖芯: G.杖芯, 品级: '普通' },
          巫师袍: { 名: '校服巫师袍', 品级: '普通' },
          饰品: {},
        },
        财产: { 金加隆: pack.金加隆, 西可: 0, 纳特: 0 },
        魔药: { 福灵剂: 0, 迷情剂: 0, 复方汤剂: 0, 欢欣剂: pack.魔药.欢欣剂 || 0, 润滑魔油: pack.魔药.润滑魔油 || 0, 安神药剂: pack.魔药.安神药剂 || 0, 突破魔药: 0 },
        材料: pack.材料 || {},
      },
    };
    try {
      await App.writeStat(patch);
      // API 配置（若填了）
      const url = (App.$('#g-api-url') || {}).value || '';
      const key = (App.$('#g-api-key') || {}).value || '';
      const model = (App.$('#g-api-model') || {}).value || '';
      if (url && model && App.AI) {
        App.AI.saveCfg({ enabled: true, baseUrl: url.trim(), apiKey: key.trim(), model: model.trim(), temperature: 0.9 });
      }
      try { localStorage.setItem(App.GUIDE_KEY, '1'); } catch (e) { }
      App.UI.toast('🎓 分院完成！' + G.name + ' · ' + G.学院 + ' · 天赋[' + G.天赋 + ']', 'magic', 4000);
      App.navigate('story');
    } catch (e) {
      App.UI.toast('写入失败：' + e.message, 'danger');
    }
  }

  nextBtn.addEventListener('click', () => {
    if (G.step < 7) { G.step++; render(); }
    else finish();
  });
  prevBtn.addEventListener('click', () => {
    if (G.step > 1) { G.step--; render(); }
  });
  const skip = App.$('#hgw-guide-skip');
  if (skip) skip.addEventListener('click', async () => {
    try { localStorage.setItem(App.GUIDE_KEY, '1'); } catch (e) { }
    App.UI.toast('已跳过引导（使用默认开局设定）', 'warn');
    App.navigate('story');
  });

  render();
});
