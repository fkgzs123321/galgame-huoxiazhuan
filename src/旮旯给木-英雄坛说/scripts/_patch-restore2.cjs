// 重写 开物品（含强化）+ 动手区（含按钮）；加「面板配置」契约
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ── ① 重写 开物品 ──
const a = t.indexOf('  function 开物品(');
const b = t.indexOf('  function 绑物品按钮(');
if (a < 0) { console.error('找不到 开物品'); process.exit(1); }
const 新开物品 = [
  '  function 开物品(i, 名) {',
  '    var 包 = 状态.背包 || [], x = 包[i];',
  '    var 物 = (typeof x === "object") ? x : { 名: 名 };',
  '    var 例表 = ((D.物品 || {}).示例) || [];',
  '    var 参 = null;',
  '    for (var q = 0; q < 例表.length; q++) if (例表[q].名 === 名) 参 = 例表[q];',
  '    var rows = "";',
  '    // 等级 / 品级',
  '    var 品 = 物品品级(名), 色 = 档色(品);',
  '    rows += 折行("品级", \'<span style="color:\' + 色 + \'">\' + 品名(品) + "</span>");',
  '    if (参) {',
  '      rows += 折行("价格", 参.价格 ? 参.价格 + " 文" : "不卖");',
  '      rows += 折行("槽位", 参.槽 || "—");',
  '      rows += \'<div class="yx-k2">加成（按价格推）</div>\';',
  '      rows += Object.keys(参.加成 || {}).map(function (k) { return 折行(k, "+" + 参.加成[k]); }).join("");',
  '    }',
  '    // ★ 强化（与机制层同口径）',
  '    var P = 强化参数(), 层 = 取层("装备", 名);',
  '    var 要 = 要的材料(P.装材料, 层), 门 = 材料够吗(要);',
  '    rows += \'<div class="yx-k2">强化</div>\';',
  '    rows += 折行("层数", 层 + " / " + P.装上限 + (层 > 0 ? \'　<span class="gr">加成 ×\' + (1 + P.装每层 * 层).toFixed(2) + "</span>" : ""));',
  '    rows += 折行("下一层要", Object.keys(要).map(function (k) { return E(k) + " " + 要[k]; }).join("　")',
  '      + (门.够 ? \' <span class="gr">（足）</span>\' : \' <span class="w">（\' + E(门.缺.join("；")) + "）</span>"));',
  '    // ★ <user> 侧的动作（语义：她在操作）',
  '    var 槽 = 参 && 参.槽;',
  '    开层(名, rows + \'<div class="yx-ops" style="margin-top:12px">\'',
  '      + (槽 ? \'<button class="yx-btn pri" data-op="equip" data-i="\' + i + \'" data-slot="\' + E(槽) + \'">装备</button>\' : "")',
  '      + \'<button class="yx-btn" data-op="enh" data-i="\' + i + \'">强化 +1</button>\'',
  '      + \'<button class="yx-btn" data-op="use" data-i="\' + i + \'">用掉</button>\'',
  '      + \'<button class="yx-btn dn" data-op="drop" data-i="\' + i + \'">丢掉</button></div>\');',
  '    绑物品按钮();',
  '  }',
  '',
].join('\n');
t = t.slice(0, a) + 新开物品 + t.slice(b);

// ── ② 让 绑物品按钮 处理 enh ──
if (!t.includes('op === "enh"')) {
  t = t.replace('        if (op === "equip") {', [
    '        if (op === "enh") {',
    '          var P = 强化参数(), 层 = 取层("装备", 名), 要 = 要的材料(P.装材料, 层), 门 = 材料够吗(要);',
    '          if (层 >= P.装上限) { alert("已到上限 " + P.装上限 + " 层"); return; }',
    '          if (!门.够) { alert("材料不够：" + 门.缺.join("；")); return; }',
    '          写(function (sd) {',
    '            sd.资源 = sd.资源 || {}; sd.强化 = sd.强化 || { 装备: {}, 技能: {} };',
    '            Object.keys(要).forEach(function (k) { sd.资源[k] = 数(sd.资源[k]) - 要[k]; });',
    '            sd.强化.装备 = sd.强化.装备 || {}; sd.强化.装备[名] = 层 + 1;',
    '          });',
    '        } else if (op === "equip") {'
  ].join('\n'));
}

// ── ③ 动手区：写回按钮 ──
const 动手锚 = t.indexOf('可交战目标');
if (动手锚 >= 0) {
  const 段起 = t.lastIndexOf('\n', 动手锚), 段止 = t.indexOf('\n', t.indexOf('H +=', 动手锚));
  // 用行切割法：找到含「可交战目标」的整行到 forEach 结束
  const 行 = t.split(/\r?\n/);
  let i1 = -1, i2 = -1;
  for (let k = 0; k < 行.length; k++) {
    if (行[k].includes('可交战目标')) i1 = k;
    if (i1 >= 0 && 行[k].includes('H += \'</div>\';') && k > i1) { i2 = k; break; }
  }
  if (i1 >= 0 && i2 > i1) {
    行.splice(i1, i2 - i1 + 1,
      '      H += \'<div class="yx-ttl">可交战目标 <em>（打谁由你点）</em></div><div class="yx-foes">\';',
      '      在场.forEach(function (n) {',
      '        var 品 = NPC品级(n), 色 = 档色(品);',
      '        H += \'<button class="yx-btn" data-foe="\' + E(n) + \'" style="border-color:\' + 色 + \'66;color:\' + 色 + \'" title="\' + 品名(品) + \'">\' + E(n) + \'</button>\';',
      '      });',
      '      H += \'</div>\';'
    );
    t = 行.join('\n');
    console.log('✅ 动手区已重写');
  } else console.log('⚠️ 动手区行范围没找到 i1=' + i1 + ' i2=' + i2);
}

fs.writeFileSync(p, t);
console.log('✅ 开物品 已重写（含强化）');
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
