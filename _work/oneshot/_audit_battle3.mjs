import fs from 'fs';

const html = fs.readFileSync('src/欲望都市/正则/战斗面板界面.html', 'utf8');
const schema = fs.readFileSync('src/欲望都市/schema.ts', 'utf8');

// ===== 提取 schema 中所有中文/英文字段名 =====
// z.object({ 字段: ..., 字段: ... }) 和 prefault({ 字段: ... })
const schemaFields = new Set();
const reField = /(?:z\.object\(\{|\bprefault\(\{)([^}]*?)\}/g;
let m;
while ((m = reField.exec(schema)) !== null) {
  const block = m[1];
  // 中文键: xxx: 
  const reCn = /([\u4e00-\u9fffA-Za-z]+):\s*(?:z\.|prefault|\.)/g;
  let mm;
  while ((mm = reCn.exec(block)) !== null) {
    schemaFields.add(mm[1]);
  }
}
// 顶层对象字段(时间/玩家/排班/女性角色)
for (const f of ['时间', '玩家', '排班', '女性角色', '学业总分', '各科', '技能', '体力', '性欲', '勃起度', '今日胜场', '今日败场', '累计缴械', '累计被缴械', '道具栏', '恢复技能', '生理', '今日射精次数', '射精冷却剩余', '最后射精日期', '晨勃', '上次恢复体力日期', '上次推进日期', '今日场次', '当前战斗目标', '战斗状态', '战斗', '回合', '主角防守值', '主角防守值上限', '她防守值', '她防守值上限', '麻痒点', '主角麻痒点', '她减伤修正', '本场经验', '主角BUFF', '她BUFF', '身份', '省份', '方言', '关系', '缴械值', '缴械次数', '战斗次数', '胜场', '败场', '名器', '名器防御', '防守值上限', '能力值', '忍耐', '持久', '反攻', '特质', '缺陷', '欲望积压', '生理周期', '月经日', '周期天数', '月经状态', '经期开始日', '怀孕', '怀孕周数', '避孕', '备孕', '排卵日', '是否俘虏', '俘虏日期', '今日已使用', '服装', '身体状态', '胸部', '阴道', '肛门', '嘴', '肌肤', '大腿', '臀部', '状态', '乳头', '敏感度', '湿润度', '体温', '心理状态', '欲望度', '羞耻感', '兴奋', '期待', '精神状态', '心声', '名', '等级', '经验', '技能组', '主技能']) {
  schemaFields.add(f);
}

// ===== 面板引用的字段名(中文词) =====
// 面板里以 .字段 形式出现的中文词
const panelFields = new Set();
const reP = /\.([\u4e00-\u9fff]{2,6})/g;
while ((m = reP.exec(html)) !== null) {
  panelFields.add(m[1]);
}

// ===== 找出面板引用但 schema 没有的 =====
console.log('===== 面板引用但 schema 未定义的字段(潜在 bug) =====');
const schemaArr = [...schemaFields];
let issues = 0;
for (const f of [...panelFields].sort()) {
  if (!schemaFields.has(f) && f.length >= 2) {
    // 过滤常见 JS/HTML 词
    if (['length', 'style', 'class', 'innerHTML', 'textContent', 'display', 'value', 'width', 'height', 'color', 'background', 'position', 'bottom', 'top', 'left', 'right', 'margin', 'padding', 'border', 'font', 'content', 'target', 'disabled', 'checked', 'options', 'selected', 'type', 'name', 'key', 'text', 'html', 'css', 'data', 'id', 'title', 'href', 'src', 'alert', 'console', 'log', 'error', 'forEach', 'map', 'filter', 'find', 'push', 'splice', 'slice', 'join', 'split', 'indexOf', 'includes', 'replace', 'match', 'exec', 'test', 'round', 'floor', 'ceil', 'max', 'min', 'random', 'abs', 'parse', 'stringify', 'keys', 'values', 'entries', 'assign', 'merge', 'clone', 'deep', 'state', 'status', 'active', 'show', 'hide', 'open', 'close', 'start', 'stop', 'init', 'render', 'update', 'refresh', 'load', 'save', 'reset', 'clear', 'remove', 'add', 'set', 'get', 'has', 'is', 'on', 'off', 'click', 'hover', 'focus', 'blur', 'change', 'submit', 'cancel', 'confirm', 'prev', 'next', 'first', 'last', 'current', 'default', 'none', 'auto', 'block', 'inline', 'flex', 'grid', 'row', 'col', 'wrap', 'center', 'bold', 'italic', 'underline', 'small', 'large', 'full', 'half', 'left', 'right', 'top', 'bottom', 'middle', 'start', 'end', 'normal', 'error', 'success', 'warn', 'info', 'danger', 'accent', 'gold', 'dim', 'text', 'label', 'item', 'section', 'box', 'bar', 'btn', 'button', 'icon', 'img', 'span', 'div', 'table', 'cell', 'head', 'body', 'foot', 'main', 'sub', 'extra', 'other', 'any', 'all', 'none', 'both', 'each', 'every', 'some', 'more', 'less', 'most', 'least', 'total', 'sum', 'count', 'num', 'val', 'obj', 'esc', 'bar', 'pct', 'clamp', 'mini', 'psy', 'sec', 'd', 'c', 'p', 'pb', 'pc', 'st', 'tgt', 'm', 'r', 'i', 'v', 'k', 'x', 'y', 'z', 'e', 'o', 'n', 's', 't', 'u', 'w', 'fn', 'cb', 'evt', 'el', 'sel', 'opts', 'cfg', 'conf', 'param', 'args', 'ret', 'res', 'req', 'msg', 'mes', 'chat', 'mesid', 'frame', 'host', 'win', 'doc', 'root', 'sb', 'hd', 'hl', 'hv', 'hp', 'dline', 'mini-bar', 'hp-row', 'hp-track', 'hp-fill', 'hp-num', 'battle-state', 'battle-tip', 'voice-box', 'nsfw-tag', 'd-sec-title', 'loading-details', 'shimmer-effect']) {
      continue;
    }
    console.log('  ?', f);
    issues++;
  }
}
console.log('\n问题数:', issues);
console.log('\nschema 字段总数:', schemaArr.length);
