// 把 E3 判定引擎与「推进一轮」按钮写进面板脚本（一次性工具）
import fs from 'node:fs';
const P = 'E:/Games/写卡/tavern_helper_template/_ui_repo/xitongge/src/脚本.js';
let j = fs.readFileSync(P, 'utf8');
if (j.includes('function judgeE3')) { console.log('已存在，跳过'); process.exit(0); }

const 锚 = "  var 指纹 = '';\n";
if (!j.includes(锚)) throw new Error('找不到锚点 指纹');

const 块 = `
  /* ══════════════════════════════════════════════════════════════
     判定引擎（E3）· 与 卡内 机制/判定引擎.txt 同源
       D = P - R + E　S = clamp(50 + D, 5, 95)　V = LCG(seed) × 100　V < S 成功
       档位由 D 与成败【联合】决定（五档）
     ⚠ 改动这里必须同步改 机制/判定引擎.txt 与 世界书/阶段指导/交涉体系.txt
     ══════════════════════════════════════════════════════════════ */
  var _LCG_A = 1664525, _LCG_C = 1013904223, _LCG_M = 4294967296;
  function _lcgRoll(seed) { return ((_LCG_A * (seed >>> 0) + _LCG_C) % _LCG_M) / _LCG_M * 100; }
  function judgePowerE3(values, weights) {
    var sum = 0, tot = 0;
    for (var k in weights) {
      var w = Number(weights[k]) || 0;
      if (!w) continue;
      sum += (Number((values || {})[k]) || 0) * w;
      tot += w;
    }
    return tot <= 0 ? 0 : sum / tot;
  }
  function judgeRequireE3(base, mult, targetMod, stageMod) {
    var m = Number(mult); if (!isFinite(m) || m <= 0) m = 1;   /* 难度用乘法 */
    var r = (Number(base) || 50) * m + (Number(targetMod) || 0) + (Number(stageMod) || 0);
    return Math.max(0, Math.min(100, Math.round(r)));
  }
  function judgeTierE3(diff, ok) {
    if (ok) return diff >= 30 ? { label: '大成功', mult: 1.5 } : diff >= 10 ? { label: '成功', mult: 1.0 } : { label: '勉强成功', mult: 0.6 };
    return diff <= -30 ? { label: '大失败', mult: 2.0 } : { label: '失败', mult: 1.0 };
  }
  function judgeE3(o) {
    var P = judgePowerE3(o.values, o.weights);
    var R = judgeRequireE3(o.base, o.diffMult, o.targetMod, o.stageMod);
    var D = P - R + (Number(o.envMod) || 0);
    var S = Math.max(5, Math.min(95, 50 + D));
    var V = _lcgRoll(o.seed);
    var ok = V < S;
    var T = judgeTierE3(D, ok);
    return { P: Math.round(P * 100) / 100, R: R, D: Math.round(D * 100) / 100,
             S: Math.round(S * 100) / 100, V: Math.round(V * 100) / 100,
             success: ok, label: T.label, mult: T.mult };
  }

  /* 动作表 · 与 世界书/阶段指导/交涉体系.txt 的「动作表」逐行一致 */
  var 招式表 = [
    { n: '亮证据', w: { 情报: 2.0, 地位: 0.5 }, base: 55, 揭露: true },
    { n: '追漏洞', w: { 情报: 1.5, 口才: 1.0 }, base: 58, 揭露: true },
    { n: '谈条件', w: { 气势: 1.0, 地位: 1.0 }, base: 60 },
    { n: '抬身份', w: { 地位: 1.5 }, base: 55 },
    { n: '拉盟友', w: { 地位: 1.2, 气势: 0.8 }, base: 58 },
    { n: '示弱', w: { 口才: 1.5 }, base: 62 },
    { n: '硬顶', w: { 气势: 1.5 }, base: 66 },
    { n: '情绪化', w: { 气势: 1.0 }, base: 85 }
  ];

  /* 场景难度乘数：他的产业内是挑战，别处是普通 */
  function 难度乘数(place) {
    var p = String(place || '');
    return /会所|顶层公寓|别墅|写字楼|林天/.test(p) ? 1.2 : 1.0;
  }
  /* 证据修正：按类型累加后一律减半 */
  function 证据修正(txt) {
    var s = String(txt || ''), sum = 0;
    if (/物证/.test(s)) sum += 5;
    if (/人证/.test(s)) sum += 2;
    if (/视频/.test(s)) sum += 7;
    if (/自相矛盾/.test(s)) sum += 10;
    return Math.round(sum / 2);
  }

  function 填招式() {
    var sel = document.getElementById(NS + '-act');
    if (!sel || sel.options.length) return;
    sel.innerHTML = 招式表.map(function (a, i) {
      return '<option value="' + i + '">' + a.n + '（基准 ' + a.base + '）</option>';
    }).join('');
  }

  /* ── 推进一轮：引擎判定 → 写回变量 ── */
  function 推进一轮(v) {
    var J = v.交涉状态 || {}, P = v.玩家 || {}, R = v.反派状态 || {}, W = v.世界 || {};
    var sel = document.getElementById(NS + '-act');
    var idx = sel ? Number(sel.value) || 0 : 0;
    var A = 招式表[idx] || 招式表[0];
    var 对手 = String(J.对象 || '林天');
    var book = v.绑定花名册 || {};
    var 是被绑定者 = Object.prototype.hasOwnProperty.call(book, 对手);
    var 她 = book[对手] || {};

    var 章 = Math.round(n(W.章节, 1)), 回 = Math.round(n(W.回合, 1)), 交回 = Math.round(n(J.回合, 0));
    /* 种子按「章节·回合·交涉回合」派生 → 同一回合重算结果一致，不可反复点击刷结果 */
    var seed = 章 * 100000 + 回 * 1000 + 交回 * 7 + 1;

    var targetMod = Math.round(judgePowerE3(R.交涉 || {}, A.w) - 60) + 10;
    var stageMod = 是被绑定者 ? Math.round(n(她.绑定深度, 0) / 10) - 5 : 0;
    var diffMult = 难度乘数(W.地点);
    var envMod = 证据修正(P.证据链);

    var me = judgeE3({ values: P.交涉 || {}, weights: A.w, base: A.base, diffMult: diffMult,
                       targetMod: targetMod, stageMod: stageMod, envMod: envMod, seed: seed });
    var 清醒 = '';
    if (是被绑定者) {
      var cf = Math.round(n(她.清醒频率, 0)), cd = Math.round(n(她.绑定深度, 0));
      if (cd >= 90) 清醒 = '她深度已在九十以上，清醒尝试全部无效，不掷';
      else if (cd >= 80) 清醒 = '她深度在八十以上，清醒瞬间被百分百压掉（掷 ' + Math.round(_lcgRoll(seed + 9991)) + '，判定失败）';
      else {
        var cv = Math.round(_lcgRoll(seed + 9991));
        清醒 = cv <= cf ? '她出现清醒瞬间（掷 ' + cv + ' ≤ 清醒频率 ' + cf + '），她的绑定深度掉一到二'
                        : '她没有出现清醒瞬间（掷 ' + cv + ' > 清醒频率 ' + cf + '）';
      }
    }

    var 结算 = me.success
      ? '玩家共识分加 ' + Math.round(4 * me.mult) + '，用揭露类招式时正文承接本轮判定给出的破口'
      : '玩家共识分减 2，反抗力减 ' + Math.round(3 * me.mult) + '；对手共识分加 ' + Math.round(4 * me.mult) + '，评价值加 ' + Math.round(2 * me.mult);

    var 触发 = '第 ' + (交回 + 1) + ' 回合出招「' + A.n + '」｜P ' + me.P + ' 对 R ' + me.R +
      '（难度 ×' + diffMult + '，对手修正 +' + targetMod + '，阶段修正 ' + stageMod + '，环境修正 +' + envMod + '）' +
      '｜差值 ' + me.D + '，成功率 ' + me.S + '%，掷值 ' + me.V + '，档位 ' + me.label + '（效果 ×' + me.mult + '）' +
      '｜结论 ' + (me.success ? '他这一轮压住了' : '他这一轮没压住') + '，' + 结算 +
      (清醒 ? '｜' + 清醒 : '');

    set('交涉状态.能力值', me.P);
    set('交涉状态.要求值', me.R);
    set('交涉状态.成功率', me.S);
    set('交涉状态.掷值', me.V);
    set('交涉状态.上轮判定', me.label);
    set('交涉状态.效果倍数', me.mult);
    set('交涉状态.本轮判定', 触发);

    var rm = document.getElementById(NS + '-rm');
    if (rm) rm.textContent = '已写入判定：' + me.label + '（P ' + me.P + ' / R ' + me.R + ' / S ' + me.S + '% / V ' + me.V + '）。' + (清醒 || '');
    重绘(true);
  }

  function 绑按钮() {
    var b = document.getElementById(NS + '-roll');
    if (!b || b.getAttribute('data-xb-bound') === '1') return;
    b.setAttribute('data-xb-bound', '1');
    b.addEventListener('click', function () {
      allVars().then(function (v) {
        var J = v.交涉状态 || {};
        if (!J.进行中) {
          var rm0 = document.getElementById(NS + '-rm');
          if (rm0) rm0.textContent = '现在不在交涉里。先让场面进入交涉（双方都要从对方手里拿东西）。';
          return;
        }
        try { 推进一轮(v); } catch (e) {
          var rm1 = document.getElementById(NS + '-rm');
          if (rm1) rm1.textContent = '判定出错：' + e.message;
        }
      });
    });
  }

`;
j = j.replace(锚, 块 + 锚);
const 锚2 = "  try { if (typeof waitGlobalInitialized === 'function') await waitGlobalInitialized('Mvu'); } catch (e) {}";
j = j.replace(锚2, "  填招式();\n" + 锚2 + "\n  绑按钮();");
j = j.replace("      if (force || f !== 指纹) { 指纹 = f; try { render(v); } catch (e) {} }",
              "      if (force || f !== 指纹) { 指纹 = f; try { render(v); 填招式(); 绑按钮(); } catch (e) {} }");
fs.writeFileSync(P, j);
console.log('已插入 E3 引擎与出招按钮，脚本', j.length, '字符');
['function judgeE3', '招式表', '推进一轮', '绑按钮', '填招式', 'judgeTierE3'].forEach((k) => console.log((j.includes(k) ? '✅' : '❌') + '  ' + k));
