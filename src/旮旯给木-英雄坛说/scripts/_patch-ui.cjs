// 给面板加五个区：物品 / 任务 / 穿着 / 身体 / 关系
// 独立脚本（不用 node -e，避免多层引号转义）
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/状态栏界面.html';
let t = fs.readFileSync(p, 'utf8');
const 前 = t;

// ── ① CSS ──
const 旧CSS = '.foes{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}';
const 新CSS = 旧CSS + `
.chip{display:inline-block;padding:1px 7px;border-radius:6px;background:var(--bg2);border:1px solid var(--line);font-size:11.5px;color:var(--dim);margin:0 4px 4px 0}
.chip.on{border-color:var(--gold);color:var(--gold)}
.bar2{height:5px;border-radius:3px;background:var(--bg2);overflow:hidden;margin-top:3px}
.bar2 i{display:block;height:100%;background:linear-gradient(90deg,#8f3f5c,var(--rose))}
.hint2{font-size:11px;color:var(--faint);margin-top:4px}`;
t = t.replace(旧CSS, 新CSS);

// ── ② HTML 区块（插在战斗区之前）──
const 区块 = [
  '  <div class="row grid">',
  '    <div class="panel">',
  '      <div class="h">物品与装备</div>',
  '      <div class="col" id="yx-bag"></div>',
  '      <div class="sub" id="yx-wear"></div>',
  '    </div>',
  '    <div class="panel">',
  '      <div class="h">手上</div>',
  '      <div class="col" id="yx-tasks"></div>',
  '      <div class="sub" id="yx-cyc"></div>',
  '    </div>',
  '  </div>',
  '',
  '  <div class="row grid" id="yx-nsfw-row">',
  '    <div class="panel">',
  '      <div class="h">穿着</div>',
  '      <div id="yx-cloth"></div>',
  '      <div class="hint2" id="yx-expose"></div>',
  '    </div>',
  '    <div class="panel">',
  '      <div class="h">身体</div>',
  '      <div class="col" id="yx-body"></div>',
  '      <div class="sub" id="yx-arousal"></div>',
  '    </div>',
  '  </div>',
  '',
  '  <div class="row">',
  '    <div class="panel full">',
  '      <div class="h">身边的人</div>',
  '      <div id="yx-rel"></div>',
  '    </div>',
  '  </div>',
  '',
].join('\n');
t = t.replace('  <div class="row" id="yx-fight" style="display:none">', 区块 + '  <div class="row" id="yx-fight" style="display:none">');

// ── ③ 渲染逻辑（插在出招层渲染之前）──
const 渲染 = [
  '    // ── 物品与装备（E7）──',
  "    var 包 = sd.背包 || [];",
  "    $('yx-bag').innerHTML = 包.length",
  "      ? 包.slice(0, 12).map(function (x) {",
  "          var 名 = (typeof x === 'string') ? x : (x.名 || x.id || '?');",
  "          var 品 = (typeof x === 'object' && x.品质) ? x.品质 : '';",
  "          return '<span class=\"chip\">' + E(名) + (品 ? ' · ' + E(品) : '') + '</span>';",
  "        }).join('')",
  "      : '<div class=\"empty\">身上空着。去换、去买、或者打赢了捡。</div>';",
  '    var 穿 = NS.穿着 || {};',
  '    var 露 = 露不露(穿);',
  "    $('yx-wear').textContent = 露.件数 ? ('穿着 ' + 露.件数 + ' 件 · ' + 露.程度) : '';",
  '',
  '    // ── 任务（E9）──',
  '    var 任 = sd.任务 || {};',
  '    var 在做的 = [], 完了 = [];',
  '    for (var _k in 任) {',
  '      var _r = 任[_k];',
  '      if (!_r) continue;',
  "      if (_r.状态 === '完成') 完了.push(_r.名 || _k);",
  "      else if (_r.状态 !== '失败') 在做的.push(_r);",
  '    }',
  "    $('yx-tasks').innerHTML = 在做的.length",
  '      ? 在做的.slice(0, 5).map(function (x) {',
  '          var 需 = 数(x.需要), 进 = 数(x.进度);',
  '          var pct = 需 > 0 ? Math.round(进 / 需 * 100) : 0;',
  "          return '<div><div class=\"line\"><span>' + E(x.名 || '') + '</span><b>' + (需 > 0 ? (进 + '/' + 需) : '做') + '</b></div>'",
  "            + (需 > 0 ? '<div class=\"bar2\"><i style=\"width:' + pct + '%\"></i></div>' : '') + '</div>';",
  "        }).join('')",
  "      : '<div class=\"empty\">手上没有活。去镇上转一圈，有人会让你做点事。</div>';",
  "    $('yx-cyc').textContent = 完了.length ? ('已完成 ' + 完了.length + ' 件') : '';",
  '',
  '    // ── 穿着与身体（NSFW 块，★ 独立读）──',
  "    $('yx-cloth').innerHTML = 部位表().map(function (p2) {",
  '      var 有 = 穿[p2];',
  "      return '<span class=\"chip' + (有 ? ' on' : '') + '\">' + E(p2) + (有 ? '：' + E(有) : '') + '</span>';",
  "    }).join('');",
  "    $('yx-expose').textContent = 露.还剩.length ? ('还剩：' + 露.还剩.join(' / ')) : '';",
  '    var 体 = NS.身体 || {}, 及 = 体.即时 || {}, 基 = 体.基线 || {};',
  '    var 及行 = Object.keys(及).filter(function (k) { return 及[k]; }).map(function (k) { return 行(k, 及[k]); }).join(\'\');',
  '    var 基行 = Object.keys(基).filter(function (k) { return 基[k]; }).map(function (k) { return E(k) + \'：\' + E(String(基[k]).slice(0, 18)); }).join(\'　\');',
  "    $('yx-body').innerHTML = (及行 + (基行 ? '<div class=\"dimline\" style=\"margin-top:4px\">' + 基行 + '</div>' : '')) || '<div class=\"empty\">还没建档。</div>';",
  '    var 兴 = 数(NS.兴奋度);',
  '    var 档名 = 兴 >= 80 ? \'难忍\' : 兴 >= 60 ? \'明显\' : 兴 >= 40 ? \'起了\' : 兴 >= 20 ? \'微动\' : \'无\';',
  "    $('yx-arousal').textContent = '兴奋 ' + Math.round(兴) + '　' + 档名;",
  '',
  '    // ── 身边的人（E15）──',
  '    var 网 = sd.关系网 || {};',
  '    var 近 = 谁在旁边(网, C.当前女角);',
  "    $('yx-rel').innerHTML = 近.length",
  '      ? 近.map(function (x) {',
  "          return '<span class=\"chip\">' + E(x.对方) + '（' + E(x.类型) + (x.强度 ? ' ' + x.强度 : '') + '）</span>';",
  "        }).join('')",
  "      : '<div class=\"empty\">这一位身边还没有别人。</div>';",
  '',
  "    if (Object.keys(局.当前选项 || {}).length) {",
].join('\n');
t = t.replace('    if (Object.keys(局.当前选项 || {}).length) {', 渲染);

// ── ④ 三个小工具函数 ──
const 工具 = [
  '  // 部位表：从 NSFW 契约拿（这里写死默认，契约改了要同步）',
  "  function 部位表() { return ['外衫', '下裳', '里衣', '布袜', '鞋履', '佩饰']; }",
  '  // 露不露：★ 与 NSFW 引擎的判定口径一致（这里只做显示，不写回）',
  '  function 露不露(c) {',
  '    var 剩 = [];',
  '    for (var k in c) if (c[k]) 剩.push(k);',
  '    var 度 = \'整齐\';',
  '    if (!剩.length) 度 = \'全裸\';',
  '    else if (!c[\'里衣\'] && !c[\'外衫\'] && !c[\'下裳\']) 度 = \'只剩袜子鞋子\';',
  '    else if (!c[\'里衣\']) 度 = \'内衣已除\';',
  '    else if (!c[\'外衫\'] || !c[\'下裳\']) 度 = \'半褪\';',
  '    return { 还剩: 剩, 件数: 剩.length, 程度: 度 };',
  '  }',
  '  // 关系网：这个人身边有谁（★ 只读，不写回）',
  '  function 谁在旁边(网, 谁) {',
  '    if (!谁) return [];',
  '    var 出 = [];',
  '    for (var k in 网) {',
  '      var 条 = 网[k];',
  '      if (!条) continue;',
  '      var 另 = (条.甲 === 谁) ? 条.乙 : (条.乙 === 谁 ? 条.甲 : null);',
  '      if (!另) continue;',
  '      if (数(条.强度) > 0) 出.push({ 对方: 另, 类型: 条.类型 || \'\', 强度: 条.强度 });',
  '    }',
  '    return 出;',
  '  }',
  '',
  '  var 选中条 = \'\', 楼 = -1, 数据 = null;',
].join('\n');
t = t.replace("  var 选中条 = '', 楼 = -1, 数据 = null;", 工具);

fs.writeFileSync(p, t);
console.log('✅ 面板已加五个区: ' + (t !== 前 ? '是' : '否'));
console.log('   物品区: ' + (t.includes('yx-bag') ? '✅' : '❌'));
console.log('   任务区: ' + (t.includes('yx-tasks') ? '✅' : '❌'));
console.log('   穿着区: ' + (t.includes('yx-cloth') ? '✅' : '❌'));
console.log('   身体区: ' + (t.includes('yx-body') ? '✅' : '❌'));
console.log('   关系区: ' + (t.includes('yx-rel') ? '✅' : '❌'));
console.log('   工具函数: ' + (t.includes('function 谁在旁边') ? '✅' : '❌'));
