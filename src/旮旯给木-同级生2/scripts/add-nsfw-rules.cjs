// ① 变量更新规则：加「女角 NSFW 字段」的写法（让 AI 知道要写什么）
// ② 面板：女角行显示 NSFW 细节（开发度/身体记忆/胸/阴部/后穴）
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');

// ── ① 变量更新规则 ──
{
  const p = path.join(D, '世界书/变量/变量更新规则.yaml');
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes('女角的 NSFW 字段')) {
    const 段 = [
      '',
      '女角的 NSFW 字段（每层按实际发生的变化写，没变的不写）:',
      '  开发度: 0~100，身体被开发的总进度',
      '  身体记忆: 一句话，她记得被怎么碰过',
      '  胸: 开发度 0~100；现状 一句话',
      '  阴部: 开发度 0~100；现状 一句话；破瓜 是/否',
      '  后穴: 开发度 0~100；现状 一句话',
      '  已封死: 一句话，与她的某条路被封的原因（没封就留空）',
      '  关系阶段: 初识 / 熟悉 / 亲近 / 依附 / 恋人（跨过阈值才改）',
      '  状态: 一句话，她此刻的样子（累了、在躲你、刚哭过）',
      '',
    ].join('\n');
    t = t.replace(/\s*$/, '\n') + 段;
    fs.writeFileSync(p, t);
    console.log('① 变量更新规则：已加「女角的 NSFW 字段」写法');
  } else console.log('① 变量更新规则：已有该段');
  const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
  try { YAML.parse(fs.readFileSync(p, 'utf8')); console.log('   ✅ YAML 通过'); }
  catch (e) { console.log('   ⚠ ' + e.message.split('\n')[0].slice(0, 50)); }
}

// ── ② 面板：女角显示 NSFW 细节 ──
{
  const p = path.join('E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html');
  let h = fs.readFileSync(p, 'utf8');
  const 旧 = `        if(有(o.状态)) H+='<div class="g"><span class="nm"></span><span style="flex:1;font-size:10.5px;color:#6b7484">'+E(o.状态)+'</span></div>';`;
  const 新 = `        var 细=[];
        if(有(o.状态)) 细.push(E(o.状态));
        if(有(o.身体记忆)) 细.push('记得：'+E(o.身体记忆));
        var 器=[['胸',o.胸],['阴',o.阴部],['后',o.后穴]];
        for(var q=0;q<器.length;q++){var v=器[q][1]||{};
          if(数(v.开发度)||有(v.现状)) 细.push('【'+器[q][0]+'】'+数(v.开发度)+(v.破瓜?' 已破':'')+(有(v.现状)?'　'+E(v.现状):''));}
        if(有(o.已封死)) 细.push('已封死：'+E(o.已封死));
        if(细.length) H+='<div class="g"><span class="nm"></span><span style="flex:1;font-size:10.5px;color:#6b7484;line-height:1.6">'+细.join('　·　')+'</span></div>';`;
  if (h.includes(旧)) {
    h = h.replace(旧, 新);
    // 女角行加「开发度」条（若有）
    h = h.replace(
      `+'<span class="tk re"><i style="width:'+夹((af+100)/2,0,100)+'%"></i></span><span class="af">'+(af>0?'+':'')+af+'</span></div>';`,
      `+'<span class="tk re"><i style="width:'+夹((af+100)/2,0,100)+'%"></i></span><span class="af">'+(af>0?'+':'')+af+'</span>'
          +(数(o.开发度)?'<span class="af" style="color:#d8a0e0">开'+数(o.开发度)+'</span>':'')+'</div>';`);
    fs.writeFileSync(p, h);
    const m = h.match(/<script>([\s\S]*?)<\/script>/);
    try { new Function('return ' + m[1]); console.log('② 面板：已加 NSFW 细节 ｜ ✅ 语法通过'); }
    catch (e) { console.log('② ❌ ' + e.message.slice(0, 60)); }
  } else console.log('② 面板：锚点未命中');
}
