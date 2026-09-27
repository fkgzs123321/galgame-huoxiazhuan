// 给状态栏注入 Tab 面板 + JS（避开 shell 转义地狱）
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', '正则/状态栏界面.html');
let h = fs.readFileSync(p, 'utf8');
h = h.replace('#1d2troub', '#1d2330').replace('#3a3career', '#3a3a2a');

if (h.includes('renderPanels')) { console.log('已注入过'); process.exit(0); }

const JS = `
  var TAB = ['概览', '日程', '账本'];
  function renderTabs() {
    var box = document.getElementById(NS + '-tabs'); if (!box) return;
    var cur = PREV.tab || '概览';
    box.innerHTML = TAB.map(function (t) {
      return '<button type="button" data-t="' + t + '" aria-selected="' + (t === cur) + '">' + t + '</button>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () { PREV.tab = b.getAttribute('data-t'); renderPanels(); renderTabs(); });
    });
    TAB.forEach(function (t) { var el = document.getElementById(NS + '-p-' + t); if (el) el.hidden = (t !== cur); });
  }
  function renderPanels() {
    var t = get('时间', {}) || {}, sc = get('场景', {}) || {}, p = get('主角', {}) || {};
    var she = get('她', {}) || {}, ec = get('经济', {}) || {}, pr = get('过程', {}) || {};
    var cash = Number(ec.现金) || 0, save = Number(ec.累计储蓄) || 0, dl = Number(ec.当日盈亏) || 0;
    var g = document.getElementById(NS + '-p-概览');
    if (g) {
      g.innerHTML = '<div class="kv">'
        + '<span class="k">日期</span><span>' + (t.当前日期 || '—') + ' · 第 ' + (Number(t.天数) || 1) + ' 天</span><span class="v">' + (t.天气 || '') + '</span>'
        + '<span class="k">时段</span><span>' + (t.时段 || '—') + ' · ' + (sc.场景模式 || '') + '</span><span class="v">' + (t.章节 || '') + '</span>'
        + '<span class="k">她的状态</span><span>' + (she.状态 || '在线') + ' · 熟练度 ' + (PROF[Number(she.熟练度) || 1] || '—') + '</span><span class="v">' + (she.人设 || '—') + '</span>'
        + '<span class="k">目的进度</span><span class="goalbar"><i style="width:' + Math.min(100, Number(she.目的进度) || 0) + '%"></i></span><span class="v">' + Math.round(Number(she.目的进度) || 0) + '%</span>'
        + '</div>';
    }
    var d = document.getElementById(NS + '-p-日程');
    if (d) {
      var day = Number(t.天数) || 1, cells = '';
      for (var i = 1; i <= 17; i++) cells += '<i class="' + (i === day ? 'now' : (i < day ? 'on' : '')) + '">' + i + '</i>';
      d.innerHTML = '<div class="day17">' + cells + '</div><div class="kv">'
        + '<span class="k">当前地点</span><span>' + (sc.当前地点 || '—') + '</span><span class="v">' + (sc.在场 || '') + '</span>'
        + '<span class="k">今日指令</span><span>' + (pr.今日指令 || '已发布') + '</span><span class="v">' + (pr.当前难度 || '') + '</span>'
        + '</div>';
    }
    var b = document.getElementById(NS + '-p-账本');
    if (b) {
      var neg = Number(pr.连续无收入天数) || 0;
      b.innerHTML = '<div class="kv">'
        + '<span class="k">现金</span><span class="v">¥' + cash.toLocaleString() + '</span><span></span>'
        + '<span class="k">累计储蓄</span><span class="v">' + save.toLocaleString() + ' / 50000</span><span class="v">' + (save >= 50000 ? '达到 True End 硬条件' : '') + '</span>'
        + '<span class="k">今日盈亏</span><span class="v">' + (dl >= 0 ? '+' : '') + dl + '</span><span class="v">' + (dl < 0 ? '赤字' : '') + '</span>'
        + '<span class="k">无收入天数</span><span class="v">' + neg + ' / 3</span><span class="v">' + (neg >= 2 ? '逼近破产' : '') + '</span>'
        + '</div>';
    }
  }
  function render() {`;

h = h.replace('  function render() {', JS);
h = h.replace('    renderGirls();', '    renderGirls();\n    renderPanels();\n    renderTabs();');
fs.writeFileSync(p, h);
console.log('✅ JS 已接入，状态栏 ' + h.length + ' 字符');
