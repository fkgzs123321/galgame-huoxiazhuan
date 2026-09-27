// 新增通用设定：12 位妈妈对儿子全封锁（手机／痕迹／只有失手才会漏）
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;

// ① [mvu_plot]私密通用规范：新增 §二「防儿子铁律」，原 §二/三/四 顺延
{
  const F = '世界书/[mvu_plot]私密通用规范.txt';
  let t = fs.readFileSync(F, 'utf8');
  const eol = eolOf(t);
  const block = [
    '## 二、防儿子铁律（12 位共通，任何阶段都不许松）',
    '她们都是干这一行的老手。关于群里的事，她们对儿子是**全封锁**：看不见、听不见、追不到。',
    '',
    '**手机（最高级别）**',
    '- 锁屏密码／指纹／面容一个都不给他用；手机不离手，充电也不放在客厅明面',
    '- 贴防窥膜；通知设成「隐藏内容」或锁屏不显示；群设免打扰、不弹横幅',
    '- 群名对外是「妈妈养生交流群」这类无害名字，图标收在文件夹第二页，混在养生／团购群中间',
    '- 相册有独立保险箱或第二空间；拍完先裁掉脸再发，原图不留',
    '- 他在身边时屏幕永远朝自己那侧倾斜；身后有人就锁屏反扣；不当着他的面打字回群、不点开群、不把手机留在床头',
    '',
    '**实体痕迹**',
    '- 换下来的内裤自己单独洗、自己收；衣物、毛巾、纸巾不留在公共区',
    '- 那支东西收在带锁的抽屉／箱子／柜顶，用完擦净、原样归位',
    '- 群里的人和事一句都不带进日常；晚归、聚会、买新东西都有站得住的名义，说过一次就不再改口',
    '',
    '**★ 唯一会漏的地方（本卡的戏根）**',
    '她们防得再严，也只有**自己失手**这一条路：忘锁屏、通知弹了半句、口误、东西没来得及收、换衣服被撞见、气味与行踪对不上。',
    '**察觉、疑云、暴露风险只能从这里长出来**；不许写她主动松懈、故意漏给他看，也不许写他凭直觉突然就知道了。',
    '',
    '',
  ].join(eol);
  const anchor = '## 二、身体状态怎么写';
  if (!t.includes(anchor)) { console.log('⚠ 私密通用规范：找不到 §二 锚点'); }
  else {
    t = t.replace(anchor, block + anchor)
         .replace('## 三、通用禁忌', '## 四、通用禁忌')
         .replace('## 四、底线', '## 五、底线');
    fs.writeFileSync(F, t, 'utf8'); n++;
    console.log('✓ 私密通用规范：新增防儿子铁律，节号顺延（' + t.length + ' 字符）');
    console.log('  现有节：' + t.split(/\r?\n/).filter(l => /^## /.test(l)).join(' ｜ '));
  }
}

// ② [mvu_plot]群内疑云：加总纲，锁死察觉来源
{
  const F = '世界书/[mvu_plot]群内疑云.txt';
  let t = fs.readFileSync(F, 'utf8');
  const eol = eolOf(t);
  const anchor = '- 连锁反应：一位妈妈暴露 → 群友被牵连';
  const add = anchor + eol + '- ★ 总纲：日常她们滴水不漏（手机与痕迹的防法见 [mvu_plot]私密通用规范 · 防儿子铁律），**察觉值只能由她的失手推动**，不许凭空上升';
  if (!t.includes(anchor)) console.log('⚠ 群内疑云：找不到 §二 锚点');
  else { t = t.replace(anchor, add); fs.writeFileSync(F, t, 'utf8'); n++; console.log('✓ 群内疑云：加了「察觉只能由失手推动」总纲'); }
}

// ③ [mvu_plot]欲妈群规则：高风险场景补全（与铁律对齐）
{
  const F = '世界书/[mvu_plot]欲妈群规则.txt';
  let t = fs.readFileSync(F, 'utf8');
  const a = '{{user}}察觉妈妈异常的高风险场景（晚归/香水味/手机被锁）';
  const b = '{{user}}察觉妈妈异常的高风险场景（晚归、锁屏反扣、身上多出说不清的气味、手机通知只弹半句就被按掉）';
  if (!t.includes(a)) console.log('⚠ 欲妈群规则：锚点未命中');
  else { t = t.replace(a, b); fs.writeFileSync(F, t, 'utf8'); n++; console.log('✓ 欲妈群规则：高风险场景改写（去掉「香水味」，改为人体与行为痕迹）'); }
}

console.log('\n共 ' + n + ' 处');
