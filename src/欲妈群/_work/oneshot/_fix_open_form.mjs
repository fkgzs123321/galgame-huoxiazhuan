// 开局表单：默认不预选难度（消除"没点就变困难"）＋ 先切 swipe 再写难度（防被 initvar 覆盖）
import fs from 'fs';
const F = '正则/开局选择界面.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;
const 换 = (a, b, tag) => {
  const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
  const c = t.split(A).length - 1;
  if (!c) { console.log('  ⚠ 未命中 ' + tag); return; }
  t = t.split(A).join(B); n += c; console.log('✓ ' + tag);
};

// ① 默认不预选难度
换(`  var 难度 = '困难';       // 推荐默认
  var 起点 = '0';          // 停在当前这条`,
`  var 难度 = '';           // ★ 不预选：必须自己点一次，避免"没点就是困难"
  var 起点 = '0';          // 停在当前这条（合理默认）`,
'默认不预选难度');

// ② 未选难度时按钮禁用 + 提示
换(`    var ok = document.getElementById('ymq-ok');
    if (已定) { ok.disabled = true; ok.textContent = '已经定下来了'; }
    else { ok.disabled = false; ok.textContent = '定下来，开始：' + 难度 + ' · 从「' + 起点 + '」这一刻'; }`,
`    var ok = document.getElementById('ymq-ok');
    if (已定) { ok.disabled = true; ok.textContent = '已经定下来了'; }
    else if (!难度) { ok.disabled = true; ok.textContent = '先选一个难度'; }
    else { ok.disabled = false; ok.textContent = '定下来，开始：' + 难度 + ' · 从「' + 起点 + '」这一刻'; }`,
'未选难度禁用按钮');

// ③ 确认流程：先切 swipe，等 MVU 重建，再写难度
换(`    /* ① 写难度（此后锁定，[控制中心] 规定任何切换指令必须拒绝） */
    set('元数据.难度', 难度);

    /* ② 切到选定的那一刻开场（不是现编 —— 每条开场白带自己的 initvar）
          swipe_id 就是开场白序号：0~4 */
    var swipe_id = parseInt(起点, 10) || 0;
    try {
      if (typeof setChatMessages === 'function') {
        await setChatMessages([{ message_id: 0, swipe_id: swipe_id }]);
        已定 = true;
        d.textContent = '已定：' + 难度 + '。切到那一刻了 —— 这条消息往上滑一层就是开局。';
      } else throw new Error('没有 setChatMessages');
    } catch (e) {`,
`    /* ★ 顺序很要紧：必须【先切 swipe、再写难度】。
       因为每条开场白带自己的 initvar，切 swipe 会让 MVU 用新开场白的初值【重建】整份变量 ——
       先写难度的话会被 initvar 冲掉（initvar 里是"普通"），表现就是"选了难度没生效"。 */
    var swipe_id = parseInt(起点, 10) || 0;
    try {
      if (typeof setChatMessages === 'function') {
        await setChatMessages([{ message_id: 0, swipe_id: swipe_id }]);
        await new Promise(function (r) { setTimeout(r, 600); });   /* 等 MVU 重建完 */
        set('元数据.难度', 难度);                                   /* 现在写，才留得住 */
        已定 = true;
        d.textContent = '已定：' + 难度 + '。切到那一刻了 —— 这条消息往上滑一层就是开局。';
      } else throw new Error('没有 setChatMessages');
    } catch (e) {
      set('元数据.难度', 难度);`,
'先切 swipe 再写难度');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');
