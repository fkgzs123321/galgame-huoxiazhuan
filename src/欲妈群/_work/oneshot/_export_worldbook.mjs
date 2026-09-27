// 从卡里导出酒馆格式的世界书 json（以后改世界书直接导入这个覆盖，不用重导卡）
import fs from 'fs';
const PNG = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/欲妈群.png';
const OUT = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/欲妈群-世界书.json';

const buf = fs.readFileSync(PNG);
let p = 8, found = null;
while (p < buf.length - 8) {
  const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8);
  if (type === 'tEXt') {
    const d = buf.slice(p + 8, p + 8 + len); const z = d.indexOf(0);
    if (d.toString('ascii', 0, z) === 'chara') { found = d.slice(z + 1).toString('ascii'); break; }
  }
  p += 12 + len; if (type === 'IEND') break;
}
const c = JSON.parse(Buffer.from(found, 'base64').toString('utf8'));
const cb = c.data.character_book;

const entries = {};
cb.entries.forEach((e, i) => {
  const ext = e.extensions || {};
  entries[String(e.id != null ? e.id : i)] = {
    uid: e.id != null ? e.id : i,
    key: e.keys || [],
    keysecondary: e.secondary_keys || [],
    comment: e.comment || '',
    content: e.content || '',
    constant: !!e.constant,
    selective: !!e.selective,
    order: e.insertion_order != null ? e.insertion_order : 100,
    position: (String(e.position) === 'at_depth') ? 4 : 0,
    disable: !(e.enabled !== false),
    addMemo: true,
    excludeRecursion: ext.exclude_recursion !== false,
    preventRecursion: !!ext.prevent_recursion,
    delayUntilRecursion: !!ext.delay_until_recursion,
    probability: (ext.probability != null) ? ext.probability : 100,
    useProbability: ext.useProbability !== false,
    depth: (ext.depth != null) ? ext.depth : 4,
    group: ext.group || '',
    groupOverride: !!ext.group_override,
    groupWeight: (ext.group_weight != null) ? ext.group_weight : 100,
    scanDepth: (ext.scan_depth != null) ? ext.scan_depth : null,
    caseSensitive: (ext.case_sensitive != null) ? ext.case_sensitive : null,
    matchWholeWords: (ext.match_whole_words != null) ? ext.match_whole_words : null,
    useGroupScoring: (ext.use_group_scoring != null) ? ext.use_group_scoring : null,
    automationId: ext.automation_id || '',
    role: (typeof ext.role === 'number') ? ext.role : null,
    vectorized: !!ext.vectorized,
    sticky: (ext.sticky != null) ? ext.sticky : 0,
    cooldown: (ext.cooldown != null) ? ext.cooldown : 0,
    delay: (ext.delay != null) ? ext.delay : 0,
    displayIndex: (ext.display_index != null) ? ext.display_index : i,
  };
});

const out = { name: cb.name || '欲妈群', entries };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

// 自检
const n = Object.keys(entries).length;
const 常驻 = Object.values(entries).filter(e => e.constant).length;
const 关 = Object.values(entries).filter(e => e.disable).length;
const 带EJS = Object.values(entries).filter(e => /<%/.test(e.content)).length;
let 坏 = 0;
for (const e of Object.values(entries)) {
  for (const m of String(e.content).matchAll(/<%[-_]?([\s\S]*?)[-_]?%>/g)) {
    const 净 = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    坏 += (净.match(/\b(const|let)\s+[A-Za-z_$]/g) || []).length;
  }
}
console.log('✓ 已导出 ' + OUT);
console.log('  条目 ' + n + '｜常驻 ' + 常驻 + '｜关闭 ' + 关 + '｜含 EJS ' + 带EJS);
console.log('  EJS 里 const/let 残留：' + 坏 + (坏 ? ' ❌' : ' ✅'));
console.log('  文件大小 ' + fs.statSync(OUT).size + ' 字节');
