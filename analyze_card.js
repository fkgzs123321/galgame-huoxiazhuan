// 分析原卡和新卡的正则脚本字段差异
const fs = require('fs');

const origPath = 'e:\\Games\\写卡\\tavern_helper_template\\yuema_original.json';
const newPath = 'e:\\Games\\写卡\\tavern_helper_template\\src\\欲妈群\\欲妈群.json';

const orig = JSON.parse(fs.readFileSync(origPath, 'utf8'));
const neu = JSON.parse(fs.readFileSync(newPath, 'utf8'));

console.log('=== 原卡顶层 keys ===');
console.log(Object.keys(orig).join(', '));
console.log('spec:', orig.spec, 'spec_version:', orig.spec_version);
console.log('data keys:', Object.keys(orig.data || {}).join(', '));
console.log('extensions keys (top-level):', Object.keys(orig.extensions || {}).join(', '));
console.log('extensions keys (data):', Object.keys((orig.data && orig.data.extensions) || {}).join(', '));

console.log('\n=== 新卡顶层 keys ===');
console.log(Object.keys(neu).join(', '));
console.log('spec:', neu.spec, 'spec_version:', neu.spec_version);
console.log('data keys:', Object.keys(neu.data || {}).join(', '));
console.log('extensions keys (top-level):', Object.keys(neu.extensions || {}).join(', '));
console.log('extensions keys (data):', Object.keys((neu.data && neu.data.extensions) || {}).join(', '));

// 收集原卡和新卡的所有正则脚本（顶层 + data 下）
function collectRegex(obj, label) {
  const list = [];
  if (obj && obj.extensions && obj.extensions.regex_scripts) {
    list.push(...obj.extensions.regex_scripts.map(r => ({...r, _location: label + '.extensions'})));
  }
  if (obj && obj.data && obj.data.extensions && obj.data.extensions.regex_scripts) {
    list.push(...obj.data.extensions.regex_scripts.map(r => ({...r, _location: label + '.data.extensions'})));
  }
  return list;
}

const origRegex = collectRegex(orig, 'orig');
const neuRegex = collectRegex(neu, 'new');

console.log('\n=== 原卡正则脚本数量 ===:', origRegex.length);
console.log('=== 新卡正则脚本数量 ===:', neuRegex.length);

console.log('\n=== 原卡所有正则脚本概览 ===');
origRegex.forEach((r, i) => {
  console.log(`  [${i}] (${r._location}) id=${r.id}, name=${r.scriptName}, disabled=${r.disabled}, markdownOnly=${r.markdownOnly}, promptOnly=${r.promptOnly}, placement=${JSON.stringify(r.placement)}, substituteRegex=${r.substituteRegex}, minDepth=${r.minDepth}, maxDepth=${r.maxDepth}, runOnEdit=${r.runOnEdit}`);
});

console.log('\n=== 新卡所有正则脚本概览 ===');
neuRegex.forEach((r, i) => {
  console.log(`  [${i}] (${r._location}) id=${r.id}, name=${r.scriptName}, disabled=${r.disabled}, markdownOnly=${r.markdownOnly}, promptOnly=${r.promptOnly}, placement=${JSON.stringify(r.placement)}, substituteRegex=${r.substituteRegex}, minDepth=${r.minDepth}, maxDepth=${r.maxDepth}, runOnEdit=${r.runOnEdit}`);
});

// 收集原卡和新卡的世界书条目
function collectWB(obj, label) {
  const list = [];
  if (obj && obj.character_book && obj.character_book.entries) {
    list.push(...obj.character_book.entries.map(e => ({...e, _location: label + '.character_book'})));
  }
  if (obj && obj.data && obj.data.character_book && obj.data.character_book.entries) {
    list.push(...obj.data.character_book.entries.map(e => ({...e, _location: label + '.data.character_book'})));
  }
  return list;
}

const origWB = collectWB(orig, 'orig');
const neuWB = collectWB(neu, 'new');

console.log('\n=== 原卡世界书条目数 ===:', origWB.length);
console.log('=== 新卡世界书条目数 ===:', neuWB.length);

// 找原卡有"选项栏"的条目
const origOpt = origWB.filter(e => (e.comment || e.name || '').includes('选项栏') || (e.comment || e.name || '').includes('选项') || (e.keys && e.keys.join(',').includes('选项')));
console.log('\n=== 原卡含"选项栏"条目 ===');
origOpt.forEach((e, i) => {
  console.log(`  [${i}] location=${e._location}, id=${e.id}, uid=${e.uid}, comment=${e.comment}, keys=${JSON.stringify(e.keys)}, enabled=${e.enabled}`);
});

const neuOpt = neuWB.filter(e => (e.comment || e.name || '').includes('选项栏') || (e.comment || e.name || '').includes('选项') || (e.keys && e.keys.join(',').includes('选项')));
console.log('\n=== 新卡含"选项栏"条目 ===');
neuOpt.forEach((e, i) => {
  console.log(`  [${i}] location=${e._location}, id=${e.id}, uid=${e.uid}, comment=${e.comment}, keys=${JSON.stringify(e.keys)}, enabled=${e.enabled}`);
});
