import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const schemaPath = path.join(projectDir, '世界书', '变量', 'schema.ts');
const zodPath = path.join(projectDir, '脚本', 'Zod.txt');

const schema = fs.readFileSync(schemaPath, 'utf8');
let zod = fs.readFileSync(zodPath, 'utf8');

// 移除 import 语句和 export type 语句，只保留 schema 定义
let body = schema
  .replace(/^import\s+.*$/gm, '')        // 移除 import 行
  .replace(/^export\s+type\s+[\s\S]*$/m, '') // 移除 export type 行
  .replace(/export\s+const\s+schema/g, 'const Schema') // export const schema → const Schema
  .trim();

// 只替换占位符行，保留占位符之后的 $(() => registerMvuSchema) 注册块
zod = zod.replace(/\/\/ SCHEMA_CONTENT/, body);
fs.writeFileSync(zodPath, zod, 'utf8');
console.log('Inlined schema.ts into 脚本/Zod.txt');
