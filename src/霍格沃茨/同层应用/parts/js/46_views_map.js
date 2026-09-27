/* ============================================================
   霍格沃茨 · 同层应用 城堡地图视图（SVG 平面图 + 地点导航）
   ============================================================ */
'use strict';

App.registerView('map', async function (box) {
  const PLACES = [
    { x: 180, y: 120, 名: '大礼堂', ico: '🏰', 描述: '四张长桌、悬浮烛火、开学宴与舞会的舞台。', 时段: '全天', act: '在这里观察今日的气氛，与长桌旁的女巫搭话' },
    { x: 320, y: 60, 名: '格兰芬多塔', ico: '🦁', 描述: '红色与金色的公共休息室，壁炉常年温暖。', 时段: '晚间', act: '回休息室——说不定有人在壁炉边等你' },
    { x: 420, y: 90, 名: '拉文克劳塔', ico: '🦅', 描述: '蓝色与青铜色的智慧之塔，门环会出谜题。', 时段: '晚间', act: '答对门环的谜题，进入拉文克劳休息室' },
    { x: 260, y: 200, 名: '图书馆', ico: '📚', 描述: '书架如迷宫，平斯夫人虎视眈眈——禁书区在后排。', 时段: '白天', act: '找个位置自习，或冒险摸进禁书区' },
    { x: 430, y: 200, 名: '魔药教室', ico: '🧪', 描述: '地下室的阴冷教室，坩埚咕嘟作响。', 时段: '上午', act: '上课，或课后找塞西莉亚教授请教' },
    { x: 340, y: 300, 名: '决斗俱乐部', ico: '⚔️', 描述: '伊莎贝拉教官的领地，切磋与荣耀。', 时段: '晚间', act: '发起挑战，或观战学习' },
    { x: 100, y: 300, 名: '温室', ico: '🌿', 描述: '草药与魔法植物，会咬人的曼德拉草。', 时段: '下午', act: '帮忙打理植物，收集材料' },
    { x: 520, y: 320, 名: '天文塔', ico: '🔭', 描述: '城堡最高处，星空近在咫尺。', 时段: '深夜', act: '观星——深夜的塔楼最适合独处或约会' },
    { x: 200, y: 420, 名: '猫头鹰棚屋', ico: '🦉', 描述: '上百只猫头鹰扑腾，信件在此中转。', 时段: '全天', act: '寄信或收信——猫头鹰是最可靠的信使' },
    { x: 420, y: 430, 名: '禁林边缘', ico: '🌲', 描述: '危险与神秘并存——独角兽、马人、八眼巨蛛。', 时段: '深夜', act: '探险（见禁林视图），或只在边缘散步' },
    { x: 620, y: 180, 名: '魁地奇场', ico: '🏟️', 描述: '露天球场，看台与欢呼，金色飞贼的传说。', 时段: '下午', act: '观赛、赌注，或偶遇训练的球员' },
    { x: 80, y: 180, 名: '霍格莫德', ico: '🏘️', 描述: '三把扫帚、蜂蜜公爵、尖叫棚屋（周末开放）。', 时段: '周末', act: '周末出行——黄油啤酒与糖果' },
    { x: 340, y: 150, 名: '有求必应屋', ico: '🚪', 描述: '八楼走廊的隐秘房间，需要什么就会出现什么。', 时段: '任意', act: '在八楼来回踱步三次，心里想着你需要的房间' },
    { x: 600, y: 60, 名: '黑湖', ico: '🌊', 描述: '湖面倒映城堡，湖底住着人鱼与巨乌贼。', 时段: '下午', act: '湖边读书，或看人鱼在远处游过' },
  ];
  const W = 720, H = 520;
  let h = '';
  h += '<div class="hgw-panel"><div class="panel-title"><span>🗺️</span>城堡地图<span class="sub">点击地点查看详情</span></div>';
  h += '<div style="position:relative">';
  h += '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;border-radius:12px;background:radial-gradient(ellipse at 50% 30%, rgba(201,162,39,0.06), transparent 70%), linear-gradient(180deg,#101a26,#0a111c);border:1px solid rgba(201,162,39,0.25)">';
  // 路径（城堡内部连廊）
  const paths = [
    [180, 120, 320, 60], [180, 120, 260, 200], [180, 120, 340, 150], [180, 120, 430, 200],
    [260, 200, 340, 150], [340, 150, 430, 200], [340, 150, 340, 300], [430, 200, 340, 300],
    [340, 300, 100, 300], [340, 300, 520, 320], [100, 300, 200, 420], [340, 300, 420, 430],
    [200, 420, 420, 430], [620, 180, 520, 320], [80, 180, 100, 300], [600, 60, 620, 180],
  ];
  for (const [x1, y1, x2, y2] of paths) {
    h += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="rgba(201,162,39,0.15)" stroke-width="1" stroke-dasharray="4 4"/>';
  }
  // 湖泊
  h += '<ellipse cx="640" cy="40" rx="80" ry="34" fill="rgba(79,195,247,0.06)" stroke="rgba(79,195,247,0.25)"/>';
  h += '<text x="640" y="44" text-anchor="middle" fill="rgba(79,195,247,0.5)" font-size="9">黑湖</text>';
  // 禁林树影
  for (let i = 0; i < 18; i++) {
    const tx = 280 + i * 18, ty = 500 - Math.abs(Math.sin(i)) * 24;
    h += '<path d="M' + tx + ',' + ty + ' L' + (tx - 6) + ',' + (ty + 22) + ' M' + tx + ',' + ty + ' L' + (tx + 6) + ',' + (ty + 22) + ' M' + tx + ',' + ty + ' L' + tx + ',' + (ty - 10) + '" stroke="rgba(39,174,96,0.2)" stroke-width="1.2" fill="none"/>';
  }
  h += '<text x="400" y="495" text-anchor="middle" fill="rgba(39,174,96,0.4)" font-size="10">禁林 FORBIDDEN FOREST</text>';
  // 地点
  for (const p of PLACES) {
    h += '<g class="hgw-map-node" data-place="' + p.名 + '" style="cursor:pointer">';
    h += '<circle cx="' + p.x + '" cy="' + p.y + '" r="17" fill="rgba(201,162,39,0.1)" stroke="#c9a227" stroke-width="1.2"/>';
    h += '<text x="' + p.x + '" y="' + (p.y + 5) + '" text-anchor="middle" font-size="15">' + p.ico + '</text>';
    h += '<text x="' + p.x + '" y="' + (p.y + 30) + '" text-anchor="middle" fill="#d8d3c0" font-size="10">' + p.名 + '</text>';
    h += '</g>';
  }
  h += '</svg>';
  // 地点详情浮层
  h += '<div id="hgw-map-detail" style="margin-top:12px"></div>';
  h += '</div></div>';
  box.innerHTML = h;

  App.$$('.hgw-map-node', box).forEach(g => g.addEventListener('click', () => {
    const p = PLACES.find(x => x.名 === g.dataset.place);
    if (!p) return;
    const d = App.$('#hgw-map-detail');
    if (!d) return;
    d.innerHTML = '<div class="hgw-card gold-border hgw-fade-in"><div class="card-title"><span>' + p.ico + '</span>' + p.名 + ' <span class="hgw-tag">' + p.时段 + '</span></div>' +
      '<div class="card-body">' + p.描述 + '</div>' +
      '<div class="card-foot"><span class="hgw-tag magic">建议行动：' + p.act + '</span>' +
      '<button class="hgw-btn sm ok hgw-map-go" data-act="' + p.act + '" style="margin-left:auto">🎬 前往</button></div></div>';
    const go = d.querySelector('.hgw-map-go');
    if (go) go.addEventListener('click', async () => {
      await App.sendAction('（我前往' + p.名 + '——' + p.act + '）');
      App.UI.toast('已发送行动：前往' + p.名, 'ok');
    });
  }));
});
