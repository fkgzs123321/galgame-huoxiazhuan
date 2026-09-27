const fs = require('fs');
const ccPath = 'c:/tavern_helper_template/src/不要玩弄我的鸡吧-forge/脚本/控制中心.js';
const sbHtml = fs.readFileSync('c:/tavern_helper_template/src/不要玩弄我的鸡吧-forge/正则/状态栏.html', 'utf-8');
const opHtml = fs.readFileSync('c:/tavern_helper_template/src/不要玩弄我的鸡吧-forge/正则/开局页.html', 'utf-8');
const sbB64 = Buffer.from(sbHtml, 'utf-8').toString('base64');
const opB64 = Buffer.from(opHtml, 'utf-8').toString('base64');

let cc = fs.readFileSync(ccPath, 'utf-8');

const sbRegex = /const EMBEDDED_STATUS_BAR_B64 = '[A-Za-z0-9+/=]*';/;
const opRegex = /const EMBEDDED_OPENING_PAGE_B64 = '[A-Za-z0-9+/=]*';/;

if (!sbRegex.test(cc)) { console.log('ERROR: 未找到EMBEDDED_STATUS_BAR_B64'); process.exit(1); }
if (!opRegex.test(cc)) { console.log('ERROR: 未找到EMBEDDED_OPENING_PAGE_B64'); process.exit(1); }

cc = cc.replace(sbRegex, "const EMBEDDED_STATUS_BAR_B64 = '" + sbB64 + "';");
cc = cc.replace(opRegex, "const EMBEDDED_OPENING_PAGE_B64 = '" + opB64 + "';");

fs.writeFileSync(ccPath, cc, 'utf-8');
console.log('✓ 控制中心.js base64常量已更新');
console.log('  状态栏b64长度:', sbB64.length);
console.log('  开局页b64长度:', opB64.length);
