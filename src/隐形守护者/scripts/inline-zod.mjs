import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const schema = fs.readFileSync(path.join(projectDir, 'schema.ts'), 'utf8');
const zodPath = path.join(projectDir, '脚本', 'Zod.txt');
let zod = fs.readFileSync(zodPath, 'utf8');
const body = schema.replace(/^export type[\s\S]*/m, '').trim();
zod = zod.replace(/\/\/ SCHEMA_CONTENT[\s\S]*/, body);
fs.writeFileSync(zodPath, zod, 'utf8');
console.log('Inlined schema.ts into 脚本/Zod.txt');
