/* ============================================================
   霍格沃茨 · 同层应用 世界全书视图（规则原文可查）+ 帮助中心
   ============================================================ */
'use strict';

App.registerView('guide', async function (box) {
  const SECTIONS = [
    { key: 'snap', 名: '📖 七部曲快照', data: null },
    { key: 'world', 名: '🌍 世界观', data: App.WorldFull || {} },
    { key: 'year', 名: '📅 学年剧情', data: App.YearFull || {} },
    { key: 'rule', 名: '📜 扮演准则', data: App.RuleFull || {} },
    { key: 'stage', 名: '🏁 阶段指导', data: App.StageFull || {} },
    { key: 'var', 名: '🔢 变量规则', data: App.VarFull || {} },
    { key: 'roster', 名: '👥 名录', data: App.RosterFull || {} },
  ];
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>📖</span>世界全书<span class="sub">全部规则原文 · 与卡内世界书同步</span></div>';
  h += '<div style="margin-bottom:12px"><input class="hgw-input" id="hgw-guide-search" placeholder="🔍 搜索规则内容…（如：缴械、课表、双修、好感）"></div>';
  h += '<div class="hgw-tabs" id="hgw-guide-tabs">' + SECTIONS.map((s, i) => '<div class="hgw-tab' + (i === 0 ? ' on' : '') + '" data-sec="' + s.key + '">' + s.名 + '</div>').join('') + '</div>';
  h += '<div id="hgw-guide-body"></div></div>';
  box.innerHTML = h;

  let curSec = 'world';
  let kw = '';

  function render() {
    const body = App.$('#hgw-guide-body');
    if (!body) return;
    const sec = SECTIONS.find(x => x.key === curSec);
    if (!sec) return;
    if (sec.key === 'snap') {
      const years = Object.keys(App.STORY_SNAP || {}).map(Number).sort();
      let out = '<div class="hgw-note" style="margin-bottom:10px">原著七部曲完整事件线（1991-1998）——你亲历这一切。</div>';
      for (const y of years) {
        const s = App.STORY_SNAP[y];
        out += '<div class="hgw-card gold-border hgw-snap-card" style="margin-bottom:10px" data-year="' + y + '">';
        out += '<div class="card-title"><span>' + y + '年级</span>' + s.部 + ' <span class="hgw-tag magic">' + s.时间 + '</span></div>';
        out += '<div class="card-body" style="margin-bottom:6px">' + (s.关键词 || []).map(k => '<span class="hgw-tag gold">' + k + '</span>').join('') + '</div>';
        out += '<div class="fe-preview" style="font-size:11px;color:#9aa7b8;line-height:1.9;max-height:96px;overflow:hidden">' + App.esc((s.事件线 || []).slice(0, 5).join('\n')) + '…</div>';
        out += '<div class="card-foot"><span class="hgw-tag magic">' + (s.事件线 || []).length + ' 个关键节点</span><button class="hgw-btn sm ok" style="margin-left:auto">展开全文</button></div>';
        out += '</div>';
      }
      body.innerHTML = out;
      return;
    }
    const entries = Object.entries(sec.data);
    if (!entries.length) { body.innerHTML = App.UI.empty('📖', '暂无内容'); return; }
    let out = '';
    for (const [name, content] of entries) {
      let text = String(content);
      if (kw && !text.includes(kw)) continue;
      // 预览裁剪
      let preview = text.split('\n').filter(l => l.trim()).slice(0, 14).join('\n');
      if (text.split('\n').length > 14) preview += '\n…';
      out += '<div class="hgw-full-entry hgw-guide-entry" data-name="' + name + '"><div class="fe-name">' + App.esc(name) + '</div><div class="fe-preview" style="white-space:pre-wrap;font-family:Consolas,monospace;font-size:11px">' + App.esc(preview) + '</div><div class="hgw-tag magic">' + text.length + ' 字符</div></div>';
    }
    if (!out) out = App.UI.empty('🔍', '没有匹配「' + kw + '」的内容');
    body.innerHTML = out;
  }
  App.$$('#hgw-guide-tabs .hgw-tab', box).forEach(el => el.addEventListener('click', () => {
    App.$$('#hgw-guide-tabs .hgw-tab', box).forEach(x => x.classList.remove('on'));
    el.classList.add('on');
    curSec = el.dataset.sec;
    render();
  }));
  const search = App.$('#hgw-guide-search');
  if (search) search.addEventListener('input', App.debounce(() => {
    kw = search.value.trim();
    render();
  }, 250));
  box.addEventListener('click', (e) => {
    const snap = e.target.closest('.hgw-snap-card');
    if (snap) {
      const s = App.STORY_SNAP[snap.dataset.year];
      if (s) {
        let html = '<div class="hgw-note" style="margin-bottom:8px">' + (s.关键词 || []).map(k => '<span class="hgw-tag gold">' + k + '</span>').join('') + '</div>';
        html += '<div class="hgw-doc">' + (s.事件线 || []).map(x => '· ' + App.esc(x)).join('\n') + '</div>';
        html += '<div style="margin-top:10px"><strong class="hgw-text-gold">伏笔与暗线：</strong>' + (s.伏笔 || []).map(x => '<span class="hgw-tag love">' + x + '</span>').join('') + '</div>';
        App.UI.modal({ title: s.部 + '（' + s.时间 + '）', xl: true, body: html });
      }
      return;
    }
    const entry = e.target.closest('.hgw-guide-entry');
    if (!entry) return;
    const sec = SECTIONS.find(x => x.key === curSec);
    const full = (sec.data || {})[entry.dataset.name] || '';
    App.UI.modal({
      title: sec.名 + ' · ' + entry.dataset.name,
      xl: true,
      body: '<div class="hgw-note" style="white-space:pre-wrap;font-size:12px;line-height:1.9;font-family:Consolas,monospace;max-height:60vh;overflow-y:auto">' + App.esc(full) + '</div>',
    });
  });
  render();
});

/* ========== 帮助中心（玩法文档） ========== */
App.registerView('help', async function (box) {
  const DOC = [
    ['⚔️ 战斗系统（魔法决斗）', [
      '战斗 = 巫师决斗传统：魔咒对轰、防线互砍、把对方缴械（魔杖脱手）即胜。',
      '你的防线 = 魔力值 × 1.2 × 阶位系数；她的防线 = 身份上限（学生44/教授52/完全缴械58）+ 名器防御×2 + 主技能等级×4。',
      '赢 → 服气度+（按回合数）、咒语经验+15、层进度+8、决斗荣誉+10、随机科目+2。',
      '输 → 败绩+（决斗有输有赢是常事，无任何结局惩罚）。',
      '咒语等级上限受阶位锁定；扩展咒（魔咒库）提供防御/控制/恢复/闪避效果。',
      '她欲望积压 ≥60 时减伤-2，≥80 再-2 且反击+25%——积压是把双刃剑。',
    ]],
    ['💗 亲密系统（做爱）', [
      '亲密与战斗平行，互不服务：不涨魔力、不强化战斗，只喂养关系（好感/堕落）。',
      '门槛：好感度 ≥30 或已缴械——她答应与否由性格标签决定，被拒绝是常态。',
      '动作编排：行为×部位×风格（1~3 组），命中敏感部位或缠绵/轻柔风格 → 上佳品质（×1.5）。',
      '五维：修为（亲密度）/情欲/快感/堕落/顺从。快感满 100 → 高潮待宣 → 确认后修为+20/堕落+8/顺从+4。',
      '结束结算：修为/10 = 好感收益，堕落/8 = 堕落值收益，欲望积压-25。',
      '契合度提示按她身体状态（敏感度/名器特性）实时给出——知己知彼。',
    ]],
    ['🧪 炼药与商店', [
      '配方解锁按魔药学成绩；成功率 = 魔药学/2 + 熟练度/2 + 材料品级加成，上限 95%。',
      '失败 → 材料损失一半；成功 → 熟练度+5（失败+2）。炼药占用 1 个时段（剧情体现）。',
      '对角巷：金加隆买材料（白鲜根2G ~ 凤凰泪50G），成品半价卖出。',
      '经济闭环：决斗赌注/卖药 → 金加隆 → 买材料 → 炼药 → 战斗消耗/突破/亲密辅助。',
      '突破魔药（曼德拉草×2+龙血×1）是阶位突破的必需品。',
    ]],
    ['💠 魔力阶位与突破', [
      '九大境界 27 层：初醒→凝聚→贯通→掌控→精纯→结晶→化形→领域→本源，每层 3 小层。',
      '层进度：决斗胜+8、禁林奇遇+3；满 100 且魔力达标且持有突破魔药 → 可突破。',
      '突破开始后进入心魔期：心魔剧情由 AI 按阶位条目在正文演出（傲慢/欲望/执念/本我/天劫…）。',
      '演出结束后在突破面板确认成功/失败：成功升层（层进度清零），失败突破进度-40。',
      '每层有独立世界书条目：魔力区间/咒语上限/战力系数/突破条件/瓶颈/仪式/材料/失败后果。',
    ]],
    ['🗓️ 课表与时间', [
      '每天 4 时段：上午/下午/晚间/深夜。课表 = 谁在线（可接触性），不是谁找你。',
      '生成课表按欲望积压排序取前 3——她积压高只是"更易撩"，不代表对你有意。',
      '她主动找你的硬门槛：好感≥60 或已有亲密史或堕落值≥60——在这之前，只能你主动。',
      '推进一天：欲望积压↑（按压力值）、堕落值回落-2、体力恢复+40、冷却-1、今日已使用重置。',
    ]],
    ['🧠 标签调度', [
      '每个角色 = 性格标签（2~3）+ 性癖标签（4~5）+ 身份外壳（stat_data），行为 100% 由标签条目驱动。',
      '调度器按「课表.当前目标」getwi 加载：性格条目按好感度 13 阶段（可降），性癖条目按欲望度 5 阶段。',
      '好感度可降：冷落-5/天、背叛-15~30、踩性格雷区-5~10——关系是经营出来的。',
      '性癖条目：潜伏→萌芽→沉溺→失控→完全沉沦，每阶段心理/行为/互动/约束/逻辑。',
    ]],
    ['🏰 学年剧情（原著七部曲）', [
      '1991 年入学 → 1998 年毕业，逐年亲历：魔法石→密室→阿兹卡班→火焰杯→凤凰社→混血王子→死亡圣器。',
      '你是同届同学里的"路人"：哈利/罗恩/赫敏是背景同学，你的故事在他们身边展开。',
      '学年剧情条目按 时间.学年/学期 getwi 加载：1-4 年级为入学前四年（可玩前传），5-7 年级为当前主线。',
      '成年入学制（17 岁入学）：原著事件与人物关系照搬，全员成年。',
    ]],
    ['📐 变量与铁律', [
      'stat_data 是唯一事实源：面板写数值 → 结算块经真实楼层发送 → AI 读数值写成场面。',
      'AI 绝不自行编造或重算数值；面板负责一切确定性计算。',
      '世界不是围着你转：女巫有自己的人际圈、课业与欲望——你的攻略只是她们生活的一部分。',
      '游戏状态=stat_data（MVU）；UI 偏好=localStorage；本地存档=可导出的 JSON 快照。',
    ]],
  ];
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>📖</span>帮助中心<span class="sub">霍格沃茨游玩手册</span></div>';
  for (const [title, lines] of DOC) {
    h += '<div class="hgw-doc"><div class="doc-h">' + title + '</div>' + lines.map(l => '· ' + App.esc(l)).join('\n') + '</div>';
  }
  h += '</div>';
  box.innerHTML = h;
});
