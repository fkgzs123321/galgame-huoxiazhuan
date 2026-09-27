const fs = require('fs');
const obj = JSON.parse(fs.readFileSync('src/星月私立高等学院 MVU_3.9.6/星月解包.json', 'utf8'));

console.log('spec:', obj.spec);
console.log('spec_version:', obj.spec_version);
console.log('data keys:', Object.keys(obj.data || {}).join(','));

const data = obj.data || {};
// v2格式的extensions在data下
const ext = data.extensions || {};
console.log('extensions keys:', Object.keys(ext).join(','));

// tavern_helper
const th = ext.tavern_helper || {};
console.log('tavern_helper keys:', Object.keys(th).join(','));
if (th.scripts) console.log('scripts count:', th.scripts.length);
if (th.html) console.log('html keys:', Object.keys(th.html).join(','));

// depth_prompt / system_prompt
console.log('data.character_book entries:', (data.character_book?.entries?.length) || 0);

// 正则脚本 (extensions.script或depth_prompt)
if (ext.script) console.log('ext.script entries:', ext.script.length);

// 创建解包目录
const outDir = 'src/星月私立高等学院 MVU_3.9.6/解包';
try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}

// 1. 提取角色卡基本字段
const cardFields = {
    name: data.name,
    description: data.description,
    personality: data.personality,
    scenario: data.scenario,
    first_mes: data.first_mes,
    mes_example: data.mes_example,
    creator_notes: data.creator_notes,
    system_prompt: data.system_prompt,
    post_history_instructions: data.post_history_instructions,
    tags: data.tags,
    spec: obj.spec,
    spec_version: obj.spec_version,
};
fs.writeFileSync(outDir + '/角色卡基本字段.json', JSON.stringify(cardFields, null, 2), 'utf8');
console.log('saved 角色卡基本字段.json');

// 2. 提取世界书
const wb = data.character_book || {};
if (wb.entries) {
    fs.writeFileSync(outDir + '/世界书.json', JSON.stringify(wb, null, 2), 'utf8');
    console.log('saved 世界书.json, entries:', wb.entries.length);
    // 也单独输出每个条目
    try { fs.mkdirSync(outDir + '/世界书条目', { recursive: true }); } catch (e) {}
    wb.entries.forEach((e, i) => {
        const name = (e.comment || e.name || ('entry_' + i)).replace(/[\\/:*?"<>|]/g, '_');
        fs.writeFileSync(outDir + '/世界书条目/' + name + '.txt', e.content || '', 'utf8');
    });
    console.log('saved', wb.entries.length, 'worldbook entries');
}

// 3. 提取正则
if (ext.script) {
    fs.writeFileSync(outDir + '/正则脚本.json', JSON.stringify(ext.script, null, 2), 'utf8');
    console.log('saved 正则脚本.json, count:', ext.script.length);
}

// 4. 提取tavern_helper脚本
if (th.scripts) {
    fs.writeFileSync(outDir + '/酒馆助手脚本.json', JSON.stringify(th.scripts, null, 2), 'utf8');
    console.log('saved 酒馆助手脚本.json, count:', th.scripts.length);
    try { fs.mkdirSync(outDir + '/助手脚本', { recursive: true }); } catch (e) {}
    th.scripts.forEach((s, i) => {
        const name = (s.name || s.id || ('script_' + i)).replace(/[\\/:*?"<>|]/g, '_');
        fs.writeFileSync(outDir + '/助手脚本/' + name + '.js', s.code || s.content || '', 'utf8');
    });
}

// 5. 提取HTML文件
if (th.html) {
    try { fs.mkdirSync(outDir + '/html', { recursive: true }); } catch (e) {}
    Object.keys(th.html).forEach(k => {
        fs.writeFileSync(outDir + '/html/' + k + '.html', th.html[k], 'utf8');
    });
    console.log('saved', Object.keys(th.html).length, 'html files');
}

console.log('done');
