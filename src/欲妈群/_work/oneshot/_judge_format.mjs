// ① 面板推的消息改成 <判定> 块　② 美化正则改匹配 <判定>（placement [1,2] 才能美化 user 消息）　③ 世界书加格式节
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;

// ── ① 面板：推送摘要改成 <判定> 块
{
  const F = '正则/状态栏.html';
  const raw = fs.readFileSync(F, 'utf8'); const eol = eolOf(raw);
  const a = [
    '    var 摘要=(追发?追发+"\\n":"")',
    '      +"【判定】"+skill+"　难度"+难度名',
    '      +"　能力 P="+Math.round(P)+"　她的要求 R="+R+"　差值 D="+D',
    '      +"　成功率 "+S+"%　掷出 "+V+"　→ "+综合+_ev',
    '      +"\\n【结果】"+说明',
    '      +"\\n★ 按上面这个结果写这一轮：你不是裁判，不要自己另掷骰、不要改数值、不要重算。";',
  ].join(eol);
  const b = [
    '    /* ★ 判定块：用 <判定>…</判定> 包起来 —— 世界书规定 AI 认这个标记，正则把它美化成面板（placement [1,2] 连 user 消息一起美化） */',
    '    var 摘要="<判定>"',
    '      +"他做的："+(追发||skill)+"\\n"',
    '      +"技能："+skill+" ｜ 难度："+难度名+(等级?" ｜ 等级："+等级:"")+"\\n"',
    '      +"P="+Math.round(P)+" − R="+R+" = D"+D+" ｜ 成功率 "+S+"% ｜ 掷出 "+V+"\\n"',
    '      +"结果："+综合+(_ev?" ｜"+_ev.replace(/^｜/,""):"")+" ｜ "+说明',
    '      +"</判定>"',
    '      +"\\n（★ 引擎已算好，照这个结果写这一轮：不要自己另掷骰、不要改数值、不要重算。）";',
  ].join(eol);
  if (raw.indexOf(a) < 0) console.log('  ⚠ 面板推送摘要未命中');
  else { fs.writeFileSync(F, raw.replace(a, b), 'utf8'); n++; console.log('✓ 面板推送 → <判定> 块'); }
}

// ── ② 美化正则：匹配 <判定>
{
  const F = '正则/15-10D20判定美化.json';
  const j = JSON.parse(fs.readFileSync(F, 'utf8'));
  j.scriptName = '10判定结果美化';
  j.findRegex = '/<判定>([\\s\\S]*?)<\\/判定>/gi';
  j.placement = [1, 2];
  j.markdownOnly = true;
  j.promptOnly = false;
  j.runOnEdit = true;
  const 头 = '<summary style="padding:10px 14px;cursor:pointer;background:linear-gradient(90deg,#7c2d47,#a04555);color:#fff;font-weight:bold;font-size:13px;list-style:none;display:flex;align-items:center;gap:6px">🎲 判定结果 <span style="margin-left:auto;font-size:11px;opacity:0.8">引擎已算好 · 点击展开</span></summary>';
  j.replaceString =
    '<details class="judge-card" style="border:1px solid #8b3a52;border-radius:10px;margin:10px 0;background:linear-gradient(135deg,#2b1220,#1e0d17);overflow:hidden;box-shadow:0 2px 10px rgba(139,58,82,0.25)">'
    + 头
    + '<div style="padding:10px 14px;font-size:12px;color:#ffd9e6;line-height:1.75;white-space:pre-wrap;font-family:\'Cascadia Code\',Consolas,monospace">$1</div></details>';
  fs.writeFileSync(F, JSON.stringify(j, null, 2) + '\n', 'utf8');
  n++; console.log('✓ 美化正则：<判定> ＋ placement [1,2] ＋ 新样式');
}

// ── ③ 世界书：加「判定结果的格式」一节
{
  const F = '世界书/[mvu_plot]D20对抗判定系统.txt';
  const raw = fs.readFileSync(F, 'utf8'); const eol = eolOf(raw);
  const 锚 = '## 九、判定铁律';
  if (raw.indexOf(锚) < 0) console.log('  ⚠ 世界书锚点未命中');
  else {
    const 段 = [
      '## 九、判定结果的格式（面板推给你的 `<判定>` 块）',
      '',
      '前端跑完判定后，会在聊天里替你留一条这样的消息：',
      '',
      '```',
      '<判定>',
      '他做的：她伸手隔布握住',
      '技能：意志 ｜ 难度：困难 ｜ 等级：极',
      'P=79 − R=56 = D23 ｜ 成功率 73% ｜ 掷出 41',
      '结果：成功 ｜ 做成了，代价记在账上。',
      '</判定>',
      '```',
      '',
      '- **这就是引擎的结论**，`成功率 / 掷出 / 结果` 都已经算好了。**直接采信**：不要自己另掷骰、不要改数值、不要重算。',
      '- `P` = 他的能力值，`R` = 她的要求值，`D` = P − R。`D` 越大说明他越有余地。',
      '- `结果` 取五档之一：**大成功 / 成功 / 勉强成功 / 失败 / 大失败**（第四节的档位表）。',
      '- 这一块**不会显示给玩家看**（正则会把它折叠成一张好看的卡片），但**你一定能看到原文**。',
      '- 照它写这一轮，然后把 `局面.判定结果` 写成空表 `{}`。',
      '',
    ].join(eol);
    fs.writeFileSync(F, raw.replace(锚, 段 + 锚), 'utf8');
    n++; console.log('✓ 世界书：加「九、判定结果的格式」');
  }
}

console.log('\n共改 ' + n + ' 处');
