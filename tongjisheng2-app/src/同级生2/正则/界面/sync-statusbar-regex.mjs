import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(dir, '状态栏.html');
const jsonPath = path.join(dir, 'regex-[界面]状态栏.json');

let raw = fs.readFileSync(htmlPath, 'utf8').trim();
if (raw.startsWith('```html')) {
  raw = raw.replace(/^```html\r?\n/, '').replace(/\r?\n```$/, '');
}

const obj = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
obj.replaceString = '```html\n' + raw + '\n```\n';
fs.writeFileSync(jsonPath, JSON.stringify(obj, null, 2) + '\n');

const check = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
if (!check.replaceString.startsWith('```html\n')) {
  throw new Error('replaceString prefix invalid: ' + JSON.stringify(check.replaceString.slice(0, 16)));
}
console.info('synced', jsonPath);
