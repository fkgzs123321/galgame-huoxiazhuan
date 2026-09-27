import fs from 'fs';

const fullJsPath = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/脚本/控制中心.full.js';
const statusHtmlPath = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/正则/状态栏.html';

// Read current 控制中心.full.js
const jsContent = fs.readFileSync(fullJsPath, 'utf-8');
const lines = jsContent.split('\n');

// Read status bar HTML (new version)
const htmlContent = fs.readFileSync(statusHtmlPath, 'utf-8');

// Base64 encode
const b64 = Buffer.from(htmlContent, 'utf-8').toString('base64');

// Replace line 10 (index 9)
const oldLine = lines[9];
const prefix = '  const EMBEDDED_STATUS_BAR_B64 = \'';
const suffix = '\';';
const newLine = prefix + b64 + suffix;

console.log('Old line length:', oldLine.length);
console.log('New line length:', newLine.length);
console.log('Old prefix:', oldLine.substring(0, 50));
console.log('New prefix:', newLine.substring(0, 50));
console.log('HTML bytes:', htmlContent.length);
console.log('B64 bytes:', b64.length);

// Verify old line matches expected pattern
if (!oldLine.startsWith(prefix) || !oldLine.endsWith(suffix)) {
  console.error('ERROR: line 10 does not match expected pattern');
  console.error('Line 10 starts with:', JSON.stringify(oldLine.substring(0, 60)));
  console.error('Line 10 ends with:', JSON.stringify(oldLine.substring(oldLine.length - 30)));
  process.exit(1);
}

// Replace
lines[9] = newLine;

// Write back
fs.writeFileSync(fullJsPath, lines.join('\n'), 'utf-8');
console.log('Updated 控制中心.full.js successfully');

// Verify
const verify = fs.readFileSync(fullJsPath, 'utf-8').split('\n')[9];
const m = verify.match(/const EMBEDDED_STATUS_BAR_B64 = '([^']+)';/);
if (m) {
  const decoded = Buffer.from(m[1], 'base64').toString('utf-8');
  console.log('Verify decoded length:', decoded.length);
  console.log('  typeClsMap:', decoded.includes('typeClsMap') ? 'FOUND' : 'NOT FOUND');
  console.log('  strengthClsMap:', decoded.includes('strengthClsMap') ? 'FOUND' : 'NOT FOUND');
  console.log('  心理:', decoded.includes('心理:') ? 'FOUND' : 'NOT FOUND');
  console.log('  shenUid:', decoded.includes('shenUid') ? 'FOUND' : 'NOT FOUND');
  console.log('  last_scan_day:', decoded.includes('last_scan_day') ? 'FOUND' : 'NOT FOUND');
  console.log('  discovery_progress object:', decoded.includes('stage4_successes') ? 'FOUND' : 'NOT FOUND');
  console.log('  female_user_014 removed:', decoded.includes('female_user_014') ? 'STILL PRESENT' : 'REMOVED');
}
