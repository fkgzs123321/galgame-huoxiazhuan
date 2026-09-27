#!/usr/bin/env node
// build.mjs · 血月七夜 UI 构建：从内联正则文件剥离围栏 → dist/index.html
// 源 = src/狼人杀/正则/状态栏界面.html（首尾各一行 ``` 围栏，内部是完整面板）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.normalize(HERE + '/../../src/狼人杀/界面/状态栏.html');
const DIST = path.join(HERE, 'dist');

let html = fs.readFileSync(SRC, 'utf8');
// 面板源为纯 HTML（无围栏），此处保留兼容逻辑
const lines = html.split('\n');
if (lines[0].trim() === '```') lines.shift();
if (lines.length && lines[lines.length - 1].trim() === '```') lines.pop();
while (lines.length && lines[0].trim() === '') lines.shift();
while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
html = lines.join('\n') + '\n';

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);
console.log('build: dist/index.html ' + Buffer.byteLength(html) + ' 字节（已剥围栏）');
