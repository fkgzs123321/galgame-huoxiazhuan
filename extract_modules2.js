const fs = require('fs');
const obj = JSON.parse(fs.readFileSync('src/星月私立高等学院 MVU_3.9.6/星月解包.json', 'utf8'));
const data = obj.data || {};
const ext = data.extensions || {};
const outDir = 'src/星月私立高等学院 MVU_3.9.6/解包';

// 提取正则脚本
if (ext.regex_scripts) {
    fs.writeFileSync(outDir + '/正则脚本.json', JSON.stringify(ext.regex_scripts, null, 2), 'utf8');
    console.log('saved 正则脚本.json, count:', ext.regex_scripts.length);
    try { fs.mkdirSync(outDir + '/正则', { recursive: true }); } catch (e) {}
    ext.regex_scripts.forEach((r, i) => {
        const name = (r.scriptName || ('regex_' + i)).replace(/[\\/:*?"<>|]/g, '_');
        fs.writeFileSync(outDir + '/正则/' + name + '.json', JSON.stringify(r, null, 2), 'utf8');
        if (r.replaceString) {
            fs.writeFileSync(outDir + '/正则/' + name + '_replace.html', r.replaceString, 'utf8');
        }
    });
}

// 提取depth_prompt
if (ext.depth_prompt) {
    fs.writeFileSync(outDir + '/depth_prompt.json', JSON.stringify(ext.depth_prompt, null, 2), 'utf8');
    console.log('saved depth_prompt.json');
}

// 提取mvu变量组
if (ext.cfMvuVarGroups) {
    fs.writeFileSync(outDir + '/mvu变量组.json', JSON.stringify(ext.cfMvuVarGroups, null, 2), 'utf8');
    console.log('saved mvu变量组.json');
}

// 提取alternate_greetings
if (data.alternate_greetings) {
    fs.writeFileSync(outDir + '/alternate_greetings.json', JSON.stringify(data.alternate_greetings, null, 2), 'utf8');
    console.log('saved alternate_greetings.json, count:', data.alternate_greetings.length);
}

// 提取first_mes
if (data.first_mes) {
    fs.writeFileSync(outDir + '/first_mes.txt', data.first_mes, 'utf8');
    console.log('saved first_mes.txt, length:', data.first_mes.length);
}

// 提取system_prompt
if (data.system_prompt) {
    fs.writeFileSync(outDir + '/system_prompt.txt', data.system_prompt, 'utf8');
    console.log('saved system_prompt.txt');
}

// 列出助手脚本名称
const th = ext.tavern_helper || {};
if (th.scripts) {
    console.log('\n助手脚本列表:');
    th.scripts.forEach((s, i) => {
        console.log('  ' + i + ': ' + (s.name || s.id || 'unnamed') + ' (enabled=' + (s.enabled !== false) + ')');
    });
}

// 列出世界书条目名称
const wb = data.character_book || {};
if (wb.entries) {
    console.log('\n世界书条目列表:');
    wb.entries.forEach((e, i) => {
        console.log('  ' + i + ': ' + (e.comment || e.name || 'unnamed') + ' (keys:' + (e.key || []).join(',') + ' depth:' + (e.depth || '?') + ')');
    });
}

console.log('\ndone');
