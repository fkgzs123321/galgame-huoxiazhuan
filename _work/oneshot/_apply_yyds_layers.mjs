import fs from 'fs';
import path from 'path';

const CARD = 'src/欲望都市';
const STATE = path.join(CARD, 'tavern-cards-state.json');
const JSONCARD = path.join(CARD, '欲望都市.json');

// ===== 名器映射表（从私密 yaml 提取的真实名器名）=====
const mingqiMap = {
  '丽莎·伊万诺娃': '雪窦', '何玉兰': '含苞', '何雨珊': '步步莲花', '刘晶晶': '蝉翼',
  '叶春梅': '春潮', '叶诗涵': '九曲回廊', '周桂香': '火口', '周语桐': '蝴蝶宫',
  '唐婉清': '古井', '娜塔莎·伊万诺娃': '雪润', '宋丽华': '蚌肉', '宋佳凝': '重峦叠嶂',
  '宋雅琴': '素绡', '张慧娟': '丹唇', '李红梅': '琥珀', '林汐瑶': '一线天',
  '林秀英': '熟桃', '沈若兰': '花径', '王朵朵': '倒悬葫芦', '王金凤': '绵长',
  '白秋月': '细纹', '白若薇': '幽谷', '石小婉': '柳叶', '石巧云': '绒软',
  '秦可心': '双宫', '秦淑珍': '幽径', '艾米丽·陈': '热泉', '苏婉如': '软玉',
  '苏晚晴': '玉壶春', '赵雪晴': '曲径', '金顺姬': '玉瓷', '陆芷晴': '玉涡',
  '陆青霞': '蜿蜒', '陈淑芬': '寒玉', '陈雪梨': '温汤', '韩美娜': '泉眼',
  '黎嘉欣': '三弦锁阴', '黎桂芳': '薄嫩',
};

// 世界观条目（改蓝灯）
const WORLDVIEW = ['世界设定', '飞机杯网络规则', '排班规则', '战斗系统', '技能树', '道具与恢复系统', '生理数值规范与限制', '学业规则'];
const PLAY_RULES = ['扮演准则'];

function getMingqi(charName) {
  return mingqiMap[charName] || null;
}

// ===== 1. 处理 state =====
const st = JSON.parse(fs.readFileSync(STATE, 'utf8'));
const em = st.entryManifest;
let stateChanges = [];

// 世界观 → 蓝灯
for (const [g, items] of Object.entries(em)) {
  if (!items || typeof items !== 'object') continue;
  for (const [name, it] of Object.entries(items)) {
    if (!it || typeof it !== 'object') continue;
    if (WORLDVIEW.includes(name) || PLAY_RULES.includes(name)) {
      it.enabled = true;
      it.strategy = { type: 'constant' };
      stateChanges.push(`[state] ${g}/${name} → 蓝灯`);
    }
  }
}

// 角色条目分类处理
for (const [g, items] of Object.entries(em)) {
  if (!items || typeof items !== 'object') continue;
  for (const [name, it] of Object.entries(items)) {
    if (!it || typeof it !== 'object') continue;
    const char = name.replace(/_(基础信息|私密档案|阶段行为)$/, '');
    const suffix = name.endsWith('_基础信息') ? 'basic' : name.endsWith('_私密档案') ? 'other' : name.endsWith('_阶段行为') ? 'stage' : null;
    if (suffix === 'basic') {
      // 基础信息 → 关灯（调度拉取）
      it.enabled = false;
      it.strategy = undefined;
      stateChanges.push(`[state] ${name} → 关灯(调度拉)`);
    } else if (suffix === 'other') {
      // 私密档案 → 绿灯 + 名器 keys
      const mq = getMingqi(char);
      if (!mq) { console.log('⚠ 无名器:', name); continue; }
      it.enabled = true;
      it.strategy = { type: 'selective', keys: [mq] };
      stateChanges.push(`[state] ${name} → 绿灯 keys=[${mq}]`);
    }
    // 阶段行为保持关灯
  }
}

// 新增名录总表（蓝灯速览）
if (!em['角色']['名录总表']) {
  em['角色']['名录总表'] = {
    path: '世界书/角色/名录总表.yaml',
    scope: 'catalog',
    part: 'basic',
    keywords: [],
    abstract: '38人角色速览（学生/老师/妈妈 索引）：名字/身份/家乡/一句话特征+母女关联；只识别用，详细档案按需加载',
    enabled: true,
    strategy: { type: 'constant' },
    position: { type: 'after_character_definition', order: 89 },
  };
  stateChanges.push('[state] 角色/名录总表 → 新增蓝灯速览');
}

fs.writeFileSync(STATE, JSON.stringify(st, null, 2), 'utf-8');
console.log('state 变更', stateChanges.length, '处');

// ===== 2. 处理 JSON =====
const card = JSON.parse(fs.readFileSync(JSONCARD, 'utf8'));
function find_wb(o) {
  if (o && typeof o === 'object') {
    if (Array.isArray(o.entries)) return o.entries;
    for (const v of Object.values(o)) { const r = find_wb(v); if (r) return r; }
  }
  return null;
}
const entries = find_wb(card);
const byId = {};
for (const e of entries) byId[e.id] = e;
let maxId = Math.max(...entries.map(e => e.id));
let jsonChanges = [];

for (const e of entries) {
  const c = e.comment;
  if (WORLDVIEW.includes(c) || PLAY_RULES.includes(c)) {
    e.constant = true;
    e.enabled = true;
    e.keys = [];
    e.selective = false;
    jsonChanges.push(`[json] ${c} → 蓝灯`);
  }
  const char = c.replace(/_(基础信息|私密档案|阶段行为)$/, '');
  if (c.endsWith('_基础信息')) {
    e.enabled = false;
    e.keys = [];
    e.constant = false;
    jsonChanges.push(`[json] ${c} → 关灯`);
  } else if (c.endsWith('_私密档案')) {
    const mq = getMingqi(char);
    if (mq) {
      e.enabled = true;
      e.keys = [mq];
      e.constant = false;
      jsonChanges.push(`[json] ${c} → 绿灯 keys=[${mq}]`);
    }
  }
}

// 新增名录总表条目
const sched = entries.find(e => e.comment === '[mvu_plot]阶段调度');
const schedExt = sched ? JSON.parse(JSON.stringify(sched.extensions)) : {};
schedExt.display_index = maxId + 1;
schedExt.position = 0;
const newEntry = {
  id: maxId + 1,
  keys: [],
  secondary_keys: [],
  comment: '名录总表',
  content: fs.readFileSync(path.join(CARD, '世界书/角色/名录总表.yaml'), 'utf8').trim() + '\n',
  constant: true,
  selective: false,
  insertion_order: 89,
  enabled: true,
  position: 'after_char',
  use_regex: true,
  extensions: schedExt,
};
entries.push(newEntry);
jsonChanges.push(`[json] 新增 名录总表 id=${newEntry.id} (蓝灯速览)`);

// 更新调度 content（拉 基础信息 + 阶段行为 + 俘虏结局）
const schedContent = `@@generate_before
@@private
# 阶段调度（当前目标的基础信息/阶段行为/俘虏结局按需拉取·蓝灯）
# 私密档案为绿灯（keys=名器名，NSFW/战斗场景提到名器即触发），此处不重复拉取
<%_ const tgt = getvar('stat_data.排班.当前战斗目标', { defaults: '' }); _%>
<%_ const jx = tgt ? Number(getvar('stat_data.女性角色.' + tgt + '.缴械值', { defaults: 0 })) || 0 : -1; _%>

<%_ if (tgt && getvar('stat_data.女性角色.' + tgt, { defaults: null })) { _%>
## 当前目标：<%- tgt %>（缴械值 <%- jx %>/100）
<%- await getwi(tgt + '_基础信息') %>
<%- await getwi(tgt + '_阶段行为') %>
<%_ if (jx >= 100) { _%>
<%- await getwi('俘虏结局') %>
<%_ } _%>
<%_ } else { _%>
## 当前目标：无（自由剧情时段）
- 可自由推进：结识新的女性、经营已有关系、处理日常事件、或选定当前目标（写入 排班.当前战斗目标 变量）
<%_ } _%>
`;
const schedEntry = entries.find(e => e.comment === '[mvu_plot]阶段调度');
if (schedEntry) {
  schedEntry.content = schedContent;
  jsonChanges.push('[json] 阶段调度 content 更新（拉基础+阶段+俘虏）');
}

// 同步 state 里的调度 yaml 文件
fs.writeFileSync(path.join(CARD, '世界书/阶段指导/阶段调度.yaml'), schedContent, 'utf-8');

fs.writeFileSync(JSONCARD, JSON.stringify(card, null, 2), 'utf-8');
console.log('JSON 变更', jsonChanges.length, '处');
console.log('总条目:', entries.length, '最大id:', maxId + 1);
