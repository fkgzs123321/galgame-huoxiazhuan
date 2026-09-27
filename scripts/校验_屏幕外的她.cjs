// 校验 8 套「屏幕外的她」（2 条/人：主体.yaml + 阶段.yaml）
// 1) 主体 YAML 可解析 + 结构完整  2) 零底座耦合  3) 注册项 ↔ 实际文件对齐
//    （阶段.yaml 的 EJS 裁剪正确性由 scripts/验证_阶段裁剪.cjs 负责）
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

const ROOT = 'src/旮旯给木-同级生2'
const DIR = path.join(ROOT, '世界书/角色/屏幕外的她')
const 人名 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '郁灼']
const 底座名 = ['加藤美纪','南川洋子','安田爱美','杉本樱子','水野友美','永岛久美子','永岛佐知子','片桐美铃','田中美沙','筱原泉美','舞岛可怜','都筑梢江','野野村美里','鸣泽唯','鸣泽美佐子']

const 主体键 = ['基本信息','外貌特征','背景设定','性格调色盘','游玩风格','关系设定','诉求','她要拿到什么','她离目标还有多远','现实干扰','退场']
const 发骚键 = ['落差','她说的话','她手上的动作','她自己的身体反应','她自己知道这是什么']
const 阶段键 = ['熟练度阶段', '怎么触发', '熟练度（0~100）']

let bad = 0
const 问题 = (f, msgs) => { console.log(`✗ ${f}`); msgs.forEach(m => console.log(`    - ${m}`)); bad++ }

for (const n of 人名) {
  const d = path.join(DIR, n)
  if (!fs.existsSync(d)) { 问题(n, ['目录不存在']); continue }
  const 实有 = fs.readdirSync(d).filter(f => f.endsWith('.yaml')).sort()
  const 应为 = ['主体.yaml', '阶段.yaml']
  const 缺 = 应为.filter(f => !实有.includes(f))
  const 多 = 实有.filter(f => !应为.includes(f))
  if (缺.length) 问题(`${n}/`, 缺.map(f => '缺 ' + f))
  if (多.length) 问题(`${n}/`, 多.map(f => '多出（旧结构残留）' + f))
  if (缺.length || 多.length) continue

  // ── 主体：YAML + 结构 ──
  const 主 = fs.readFileSync(path.join(d, '主体.yaml'), 'utf8')
  let doc
  try { doc = YAML.parse(主) } catch (e) { 问题(`${n}/主体.yaml`, ['YAML 解析失败: ' + e.message.split('\n')[0]]); doc = null }
  if (doc) {
    const a = doc['角色档案']
    if (!a) 问题(`${n}/主体.yaml`, ['缺 角色档案'])
    else {
      const e1 = 主体键.filter(k => !Object.keys(a).some(dk => dk.includes(k)))
      if (e1.length) 问题(`${n}/主体.yaml`, e1.map(k => '缺 ' + k))
      const wx = a['游玩风格'] || {}
      const 发 = Object.keys(wx).find(k => k.includes('她怎么发骚'))
      if (!发) 问题(`${n}/主体.yaml`, ['游玩风格 缺 ★ 她怎么发骚'])
      else {
        const e2 = 发骚键.filter(k => !Object.keys(wx[发]).some(dk => dk.includes(k)))
        if (e2.length) 问题(`${n}/主体.yaml`, e2.map(k => '她怎么发骚 缺 ' + k))
      }
    }
    if (/熟练度表现|目的进度表现/.test(主)) 问题(`${n}/主体.yaml`, ['残留旧的 熟练度表现/目的进度表现'])
  }

  // ── 阶段：EJS 段结构 ──
  const 阶 = fs.readFileSync(path.join(d, '阶段.yaml'), 'utf8')
  const e3 = 阶段键.filter(k => !阶.includes(k))
  if (e3.length) 问题(`${n}/阶段.yaml`, e3.map(k => '缺 ' + k))
  if (!阶.includes("getvar('stat_data.她.熟练度'")) 问题(`${n}/阶段.yaml`, ['没读 她.熟练度'])
  if (/getvar\('stat_data\.她\.目的进度'/.test(阶)) 问题(`${n}/阶段.yaml`, ['★ 阶段只能有熟练度一个变量，却读了 目的进度'])

  // ── 底座耦合（两份文件都要查）──
  for (const [f, 内容] of [['主体.yaml', 主], ['阶段.yaml', 阶]]) {
    for (const b of 底座名) if (内容.includes(b)) 问题(`${n}/${f}`, [`★耦合：出现底座女角名「${b}」`])
  }
}

// ── 注册项 ↔ 文件 对齐 ──
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'tavern-cards-state.json'), 'utf8'))
const 角色 = S.entryManifest['角色']
const 注册名 = Object.keys(角色).filter(k => /^她_/.test(k))
let 注册问题 = 0
for (const k of 注册名) {
  const f = 角色[k].contents && 角色[k].contents.find(c => c.file)
  if (!f) { console.log(`✗ 注册项 ${k} 没有 file`); 注册问题++; continue }
  if (!fs.existsSync(path.join(ROOT, f.file))) { console.log(`✗ 注册项 ${k} 指向的文件不存在: ${f.file}`); 注册问题++ }
}
console.log(`\n注册项 ${注册名.length} 条（应为 8×2=16），文件缺失 ${注册问题} 项`)
console.log(`共 ${人名.length} 套，问题 ${bad} 个`)
if (!bad && !注册问题) console.log('全部通过：主体结构完整 / 阶段 EJS 就位 / 零底座耦合 / 注册对齐')
