// fix_regex.mjs - 修复所有正则JSON文件
import fs from 'fs';
import path from 'path';

const REGEX_DIR = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/正则';

// ===== 1. 状态栏占位展开.json =====
function fixStatusBarPlaceholder() {
  const htmlPath = path.join(REGEX_DIR, '状态栏.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  // 去除可能的 markdown 围栏（防御性）
  html = html.replace(/^\s*```(?:html|css)?\s*\n/i, '').replace(/\n?\s*```\s*$/i, '').trim();

  const obj = {
    id: 'a1b2c3d4-0008-4000-8000-000000000008',
    scriptName: '状态栏占位展开 - StatusPlaceHolderImpl 替换为状态栏HTML',
    findRegex: '/<StatusPlaceHolderImpl\\s*\\/>/gi',
    replaceString: html,
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
    substituteRegex: 1,
    minDepth: 0,
    maxDepth: null
  };

  const jsonPath = path.join(REGEX_DIR, '状态栏占位展开.json');
  fs.writeFileSync(jsonPath, JSON.stringify(obj, null, 2), 'utf-8');
  console.log('[1] 状态栏占位展开.json 已重新生成');
  console.log('    HTML大小:', html.length, '字符');
  console.log('    findRegex:', obj.findRegex);
  console.log('    runOnEdit:', obj.runOnEdit, '| minDepth:', obj.minDepth, '| substituteRegex:', obj.substituteRegex);
  console.log('    markdown围栏:', html.startsWith('```') ? '有(错误!)' : '无(正确)');
}

// ===== 2. 开局页占位展开.json =====
function fixOpeningPagePlaceholder() {
  const jsonPath = path.join(REGEX_DIR, '开局页占位展开.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const obj = JSON.parse(raw);
  // 修复 findRegex 加 /.../gi 包裹
  obj.findRegex = '/<OpeningPage>([\\s\\S]*?)<\\/OpeningPage>/gi';
  // 去掉 replaceString 末尾的 $1（避免暴露原始内容）
  obj.replaceString = obj.replaceString.replace(/\$1\s*$/, '');
  // 修复 runOnEdit 和 minDepth
  obj.runOnEdit = false;
  obj.minDepth = null; // 开局页用 null（与星月一致）
  obj.substituteRegex = 1;
  fs.writeFileSync(jsonPath, JSON.stringify(obj, null, 2), 'utf-8');
  console.log('[2] 开局页占位展开.json 已修复');
  console.log('    findRegex:', obj.findRegex);
  console.log('    runOnEdit:', obj.runOnEdit, '| minDepth:', obj.minDepth);
}

// ===== 3. omni-*.json =====
function fixOmniFiles() {
  const omniFiles = [
    { file: 'omni-analysis占位展开.json', tag: 'OmniAnalysis', dataAttr: 'analysis' },
    { file: 'omni-done占位展开.json', tag: 'OmniDone', dataAttr: 'done' },
    { file: 'omni-progress占位展开.json', tag: 'OmniProgress', dataAttr: 'progress' },
  ];
  for (const { file, tag, dataAttr } of omniFiles) {
    const jsonPath = path.join(REGEX_DIR, file);
    if (!fs.existsSync(jsonPath)) continue;
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const obj = JSON.parse(raw);
    // 修复 findRegex
    obj.findRegex = `/<${tag}>([\\s\\S]*?)<\\/${tag}>/gi`;
    // 修复 replaceString（加 data-fjb-omni-raw 子 div 和白空间样式）
    obj.replaceString = `<div class="fjb-omni-mount" data-fjb-omni="${dataAttr}"><div class="fjb-omni-raw" data-fjb-omni-raw style="white-space:pre-wrap;word-break:break-word">$1</div></div>`;
    // 修复 runOnEdit 和 minDepth
    obj.runOnEdit = false;
    obj.minDepth = 0;
    obj.substituteRegex = 1;
    fs.writeFileSync(jsonPath, JSON.stringify(obj, null, 2), 'utf-8');
    console.log(`[3] ${file} 已修复`);
    console.log(`    findRegex: ${obj.findRegex}`);
    console.log(`    runOnEdit: ${obj.runOnEdit} | minDepth: ${obj.minDepth}`);
  }
}

// ===== 4. 变量更新美化.txt =====
function fixVarUpdateBeautify() {
  const filePath = path.join(REGEX_DIR, '变量更新美化.txt');
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const obj = JSON.parse(raw);
  // 修复 findRegex
  obj.findRegex = '/<UpdateVariable(?:variable)?>([\\s\\S]*?)<\\/UpdateVariable(?:variable)?>/gi';
  // 修复 runOnEdit
  obj.runOnEdit = false;
  obj.minDepth = 0;
  obj.substituteRegex = 1;
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
  console.log('[4] 变量更新美化.txt 已修复');
  console.log('    findRegex:', obj.findRegex);
  console.log('    runOnEdit:', obj.runOnEdit, '| minDepth:', obj.minDepth);
}

// ===== 5. 正文美化.txt（正则文件）=====
function fixContentBeautify() {
  const filePath = path.join(REGEX_DIR, '正文美化.txt');
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const obj = JSON.parse(raw);
  // 统一占位符标签名为 StatusPlaceHolderImpl（与状态栏占位展开.json 一致）
  obj.findRegex = '/<StatusPlaceHolderImpl\\s*\\/>/gi';
  obj.runOnEdit = false;
  obj.minDepth = 0;
  obj.substituteRegex = 1;
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
  console.log('[5] 正文美化.txt 已修复（占位符统一为 StatusPlaceHolderImpl）');
  console.log('    findRegex:', obj.findRegex);
}

// ===== 6. SPV 隐藏类 =====
function fixSPVHidden() {
  const files = ['SPV-UpdateTable用户隐藏.txt', 'SPV-数据块AI隐藏.txt'];
  for (const file of files) {
    const filePath = path.join(REGEX_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const obj = JSON.parse(raw);
    // 修复 findRegex 加 /.../gi 包裹
    if (obj.findRegex && !obj.findRegex.startsWith('/')) {
      obj.findRegex = '/' + obj.findRegex + '/gi';
    }
    obj.substituteRegex = 1;
    // SPV 隐藏类 runOnEdit 保持 true
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
    console.log(`[6] ${file} 已修复`);
    console.log(`    findRegex: ${obj.findRegex}`);
  }
}

// ===== 7. 玩家输入拦截器.txt（正则文件）=====
function fixPlayerInputInterceptor() {
  const filePath = path.join(REGEX_DIR, '玩家输入拦截器.txt');
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const obj = JSON.parse(raw);
  obj.substituteRegex = 1;
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
  console.log('[7] 玩家输入拦截器.txt 已修复');
}

// ===== 执行所有修复 =====
console.log('═══════════════════════════════════════');
console.log('  正则文件批量修复工具');
console.log('═══════════════════════════════════════\n');

fixStatusBarPlaceholder();
console.log('');
fixOpeningPagePlaceholder();
console.log('');
fixOmniFiles();
console.log('');
fixVarUpdateBeautify();
console.log('');
fixContentBeautify();
console.log('');
fixSPVHidden();
console.log('');
fixPlayerInputInterceptor();

console.log('\n═══════════════════════════════════════');
console.log('  ✅ 所有正则文件修复完成!');
console.log('═══════════════════════════════════════');
