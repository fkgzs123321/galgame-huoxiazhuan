// 把旧的「每项一对按钮」绑定（.rj/.ig/.fr）换成 euphoria 式：
//   点选项条 = 选中；点底部三个按钮（眼睁睁看着/拒绝/自己来）= 执行
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
let 行 = fs.readFileSync(p, 'utf8').split('\n');

/* 找三段绑定的边界：从 `    var rs=盒.querySelectorAll('.rj');` 到函数结束的 `  }` */
const 起 = 行.findIndex(l => l.includes("var rs=盒.querySelectorAll('.rj')"));
if (起 < 0) { console.log('❌ 找不到 .rj 绑定起点'); process.exit(1); }
let 终 = -1;
for (let i = 起; i < 行.length; i++) {
  if (行[i] === '  }') { 终 = i; break; }      // 函数结尾（两个空格的 }）
}
if (终 < 0) { console.log('❌ 找不到结束点'); process.exit(1); }
console.log('替换区间：第 ' + (起 + 1) + ' 行 → 第 ' + (终 + 1) + ' 行（共 ' + (终 - 起 + 1) + ' 行）');

const 新段 = `    /* ══ 选项 = 选中；底部按钮 = 执行（照 euphoria 的交互）══ */
    var 选中条 = '';
    var opts = 盒.querySelectorAll('.opt');
    for (var i = 0; i < opts.length; i++) {
      opts[i].onclick = function () {
        var k = this.getAttribute('data-k');
        if (!k || (this.className || '').indexOf('lv-锁') >= 0) return;
        选中条 = (选中条 === k) ? '' : k;
        for (var j = 0; j < opts.length; j++) opts[j].className = (opts[j].className || '').replace(' picked', '');
        var res = 盒.querySelector('.res');
        if (选中条) {
          this.className += ' picked';
          var sd0 = 取数据(楼), o0 = ((sd0 && sd0.局面 && sd0.局面.当前选项) || {})[选中条] || {};
          if (res) { res.className = 'res on'; res.textContent = '选中第 ' + 选中条 + ' 条：' + (o0.文本 || ''); }
        } else if (res) { res.className = 'res'; res.textContent = ''; }
      };
    }

    var forks = 盒.querySelectorAll('.fork-btn');
    for (var q = 0; q < forks.length; q++) {
      forks[q].onclick = async function () {
        var act = this.getAttribute('data-fork');
        var sd = 取数据(楼); if (!sd) return;
        var 反抗 = 数(sd.主角 && sd.主角.反抗值, 0);
        var 选 = (sd.局面 && sd.局面.当前选项) || {};
        var res = 盒.querySelector('.res');
        var 等级表 = { 微: [3, 5, 90], 中: [10, 15, 60], 强: [25, 35, 30], 极: [50, 55, 10] };

        if (act === 'watch') {
          await 写(function (pr, jj) { jj.玩家拒绝 = ''; jj.判定结果 = { 选项: '', 等级: '', 消耗: 0, 结果: '看着', 效果倍数: 1 }; },
            'on ig', '眼睁睁看着 —— 不拦，让她自己点。', '（我不拦。看她点哪条。）');
          return;
        }

        if (act === 'reject' && !选中条) { if (res) { res.className = 'res on no'; res.textContent = '先在上面选一条，再点拒绝。'; } return; }
        if (act === 'custom') {
          var 想做 = (window.prompt('你想做什么？（掏空反抗值，一局顶多一两次）') || '').trim();
          if (!想做) { if (res) { res.className = 'res on no'; res.textContent = '写一句你想做什么。'; } return; }
          var 耗2 = 50 + Math.floor(Math.random() * 21);
          await 写(function (pr, jj) {
            pr.反抗值 = Math.max(0, 反抗 - 耗2);
            jj.玩家拒绝 = '自定义';
            jj.判定结果 = { 选项: 想做, 等级: '自定义', 消耗: 耗2, 结果: '自定义', 效果倍数: 1 };
          }, 'on ig', '自己来：「' + 想做 + '」｜ 扣 ' + 耗2 + ' 反抗值。', '（我不按她摆的来。我要' + 想做 + '。）');
          return;
        }

        var o = 选[选中条] || {}, lv = 归(o.等级), 表 = 等级表[lv] || [0, 0, 0];
        var 耗 = 表[0] + Math.floor(Math.random() * (表[1] - 表[0] + 1));
        if (反抗 < 耗) { if (res) { res.className = 'res on no'; res.textContent = '反抗值不够（要 ' + 耗 + '，你只有 ' + 反抗 + '）。'; } return; }
        var 掷 = Math.floor(Math.random() * 100) + 1, 成 = 掷 <= 表[2];
        await 写(function (pr, jj) {
          pr.反抗值 = Math.max(0, 反抗 - 耗);
          jj.玩家拒绝 = String(选中条);
          jj.判定结果 = { 选项: String(o.文本 || ''), 等级: lv, 消耗: 耗, 成功率: 表[2], 掷值: 掷, 结果: 成 ? '成功' : '失败', 效果倍数: 成 ? 1 : 0.6 };
        }, 'on ' + (成 ? 'ok' : 'no'),
          '拒绝了「' + (o.文本 || '') + '」｜ 扣 ' + 耗 + ' · 掷 ' + 掷 + ' · 需 ' + 表[2] + ' → ' + (成 ? '顶住了' : '没顶住'),
          '（我拒绝第 ' + 选中条 + ' 条：「' + (o.文本 || '') + '」。花掉 ' + 耗 + ' 反抗值，' + (成 ? '顶住了' : '没顶住') + '。）');
      };
    }`;

行.splice(起, 终 - 起 + 1, ...新段.split('\n'));
fs.writeFileSync(p, 行.join('\n'));
const h = 行.join('\n');
const m = h.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('✅ 语法通过（' + h.length + ' 字符）'); }
catch (e) { console.log('❌ ' + e.message.slice(0, 90)); process.exit(1); }
console.log('  含 点选项选中: ' + h.includes('选中条 = (选中条 === k)'));
console.log('  含 data-fork 绑定: ' + h.includes("getAttribute('data-fork')"));
console.log('  旧 .rj 绑定已清: ' + !h.includes("querySelectorAll('.rj')"));
