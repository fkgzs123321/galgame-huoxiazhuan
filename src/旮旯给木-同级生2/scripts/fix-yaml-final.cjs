// ── ① 修完 49 个：诊断出的真根因是「缩进位置上的裸文本行」（★/→/⚠️ 开头、无冒号）
//    修法：前面加 `- ` 变成列表项（YAML 合法，**原文一字不改**）
//    另：.txt 文件不参与 YAML 校验（如 MVU 的 变量输出格式模板），跳过
// ── ② 拆掉一处「跨条目重复」（rules-check:162）：
//    `NSFW反差与剧情线` 里的「剧情线」节 与 `第NN天` 的「事件锚点」**是同一件事**
//    （第NN天的事件锚点就是从 剧情线.md 按日期 pivot 出来的）→ 删角色条目里那份，
//    剧情归位置：角色/other = 纯 NSFW 反差（关键词触发）；剧情 = 按天（EJS 门控）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');
const 记 = [];

// ── ① YAML 修完 ──
{
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);
  const 是YAML = p => /\.yaml$/.test(p);
  let 改 = 0;
  for (let 轮 = 0; 轮 < 12; 轮++) {
    let 本 = 0;
    for (const p of 全) {
      if (!是YAML(p)) continue;
      let err = null; try { YAML.parse(fs.readFileSync(p, 'utf8')); } catch (e) { err = e; }
      if (!err) continue;
      const ln = (err.linePos && err.linePos[0] && err.linePos[0].line) || 0;
      const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      let k = Math.max(0, ln - 1);
      // 往上找最近的「缩进位置上、无冒号、不以 - 开头」的裸文本行
      while (k >= 0) {
        const s = L[k];
        const ind = s.match(/^ */)[0].length;
        if (s.trim() && ind > 0 && !/^[\s-]*-/.test(s) && !/^[\s#]/.test(s) && !/:\s/.test(s) && !/:\s*$/.test(s)) break;
        k--;
      }
      if (k < 0) continue;
      const ind = L[k].match(/^ */)[0].length;
      L[k] = ' '.repeat(ind) + '- ' + L[k].trim();
      fs.writeFileSync(p, L.join('\n'));
      本++; 改++;
    }
    if (!本) break;
  }
  const bad = 全.filter(p => 是YAML(p) && (() => { try { YAML.parse(fs.readFileSync(p, 'utf8')); return false; } catch (e) { return true; } })());
  记.push('① YAML：修 ' + 改 + ' 处裸文本行（→ 列表项）｜可解析 ' + (全.filter(是YAML).length - bad.length) + '/' + 全.filter(是YAML).length + ' 个 yaml' + (bad.length ? ('（剩 ' + bad.length + '：' + bad.slice(0, 5).map(x => path.basename(x)).join(', ') + '）') : ' ✅'));
  记.push('   注：.txt ' + 全.filter(p => !是YAML(p)).length + ' 个不参与 YAML 校验（MVU 输出格式模板等，本就不是 YAML）');
}

// ── ② 拆掉跨条目重复：删角色条目里的「剧情线」节 ──
{
  let n = 0;
  const 目录 = path.join(WB, '角色/底座_nanpa2');
  for (const 名 of fs.readdirSync(目录)) {
    const p = path.join(目录, 名, 'NSFW反差与剧情线.yaml');
    if (!fs.existsSync(p)) continue;
    let t = fs.readFileSync(p, 'utf8');
    const i = t.indexOf('剧情线:');
    if (i < 0) continue;
    // 删掉「剧情线:」到下一个顶层键（或文件尾）之间的全部内容
    const 前 = t.slice(0, i).trimEnd();
    const 后 = t.slice(i);
    const m = 后.slice(1).match(/\n(?=[^\s])/);
    const 尾 = m ? 后.slice(m.index + 1 + (m[0].length - 1)) : '';
    fs.writeFileSync(p, 前 + '\n' + 尾.trimEnd() + '\n');
    n++;
  }
  记.push('② 删掉 ' + n + ' 位女角条目里的「剧情线」节（与 `第NN天` 的事件锚点跨条目重复）');
  记.push('   → 剧情归位置：角色/other = 纯 NSFW 反差（关键词触发）／剧情 = 按天（EJS 门控，已在 第NN天）');
}
console.log(记.join('\n'));
