#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const coreRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreReferencesDir = path.join(coreRoot, 'references');
const inputArg = process.argv[2];
const printHashOnly = process.argv.includes('--print-content-hash');
const maxFileBytes = 25 * 1024 * 1024;
const maxTotalBytes = 200 * 1024 * 1024;
const allowedCategories = new Set([
  'rp-content',
  'st-compatibility',
  'runtime-engineering',
  'platform-ui',
  'testing-diagnostics',
  'examples-case-studies',
]);
const allowedEntryTypes = new Set([
  'guide',
  'example',
  'case-study',
  'compatibility',
  'implementation-recipe',
  'diagnostic',
]);
const allowedStatuses = new Set(['draft', 'experimental', 'stable']);
const unfinishedPattern = new RegExp('\\b(?:' + ['TO', 'DO'].join('') + '|' + ['TB', 'D'].join('') + ')\\b', 'i');
const errors = [];

function addError(message) {
  errors.push(message);
}

function usage() {
  console.error('Usage: node scripts/validate-knowledge-pack.mjs <db-directory-or-zip> [--print-content-hash]');
  process.exit(2);
}

if (!inputArg) usage();

function isPathSafe(relativePath) {
  return Boolean(relativePath)
    && !relativePath.includes('\\')
    && !relativePath.startsWith('/')
    && !/^[A-Za-z]:/.test(relativePath)
    && !relativePath.split('/').includes('..')
    && path.posix.normalize(relativePath) === relativePath
    && relativePath !== '.';
}

function normalizePackPath(value, label) {
  if (typeof value !== 'string') {
    addError(label + ' 必须是字符串');
    return null;
  }
  const normalized = value.replace(/^\.\//, '').replace(/\/$/, '');
  if (!isPathSafe(normalized)) {
    addError(label + ' 不是包内安全相对路径: ' + value);
    return null;
  }
  return normalized;
}

function listDirectoryFiles(packRoot) {
  const files = new Map();
  let totalBytes = 0;

  function visit(current, relativeRoot) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      const relative = relativeRoot ? relativeRoot + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        visit(absolute, relative);
        continue;
      }
      if (!entry.isFile()) {
        addError('不支持的文件类型: ' + relative);
        continue;
      }
      const stat = fs.statSync(absolute);
      if (stat.size > maxFileBytes) addError('单文件超过 25MB: ' + relative);
      totalBytes += stat.size;
      files.set(relative.replace(/\\/g, '/'), fs.readFileSync(absolute));
    }
  }

  visit(packRoot, '');
  if (totalBytes > maxTotalBytes) addError('DB 总内容超过 200MB');
  return files;
}

function findEndOfCentralDirectory(buffer) {
  const minimum = Math.max(0, buffer.length - 22 - 0xffff);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function readZipFiles(zipPath) {
  const buffer = fs.readFileSync(zipPath);
  const endOffset = findEndOfCentralDirectory(buffer);
  if (endOffset < 0) {
    addError('ZIP 缺少 End of Central Directory');
    return { files: new Map(), topLevel: null };
  }
  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDisk = buffer.readUInt16LE(endOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
  const entriesTotal = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entriesTotal) addError('不支持分卷 ZIP');
  if (entriesTotal === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) addError('不支持 ZIP64');
  if (centralOffset + centralSize > buffer.length) {
    addError('ZIP central directory 超出文件范围');
    return { files: new Map(), topLevel: null };
  }

  const rawFiles = new Map();
  const topLevels = new Set();
  let cursor = centralOffset;
  for (let index = 0; index < entriesTotal; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      addError('ZIP central directory 条目无效: ' + index);
      break;
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const name = buffer.toString('utf8', nameStart, nameStart + nameLength);
    cursor = nameStart + nameLength + extraLength + commentLength;

    if (name.endsWith('/')) continue;
    if (!isPathSafe(name)) {
      addError('ZIP 条目路径不安全: ' + name);
      continue;
    }
    if (flags & 0x0001) addError('ZIP 条目被加密: ' + name);
    if (![0, 8].includes(method)) addError('ZIP 压缩方式不支持: ' + name);
    if ([compressedSize, uncompressedSize, localOffset].includes(0xffffffff)) addError('ZIP 条目使用不支持的 ZIP64: ' + name);
    const unixMode = (externalAttributes >>> 16) & 0xffff;
    if ((unixMode & 0xf000) === 0xa000) addError('ZIP 不允许符号链接: ' + name);
    topLevels.add(name.split('/')[0]);
    if (rawFiles.has(name)) addError('ZIP 条目重复: ' + name);

    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      addError('ZIP local header 无效: ' + name);
      continue;
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) {
      addError('ZIP 数据超出文件范围: ' + name);
      continue;
    }
    const compressed = buffer.subarray(dataStart, dataEnd);
    let content;
    try {
      content = method === 0 ? compressed : zlib.inflateRawSync(compressed);
    } catch (cause) {
      addError('ZIP 条目无法解压: ' + name + ' (' + cause.message + ')');
      continue;
    }
    if (content.length !== uncompressedSize) addError('ZIP 解压大小不匹配: ' + name);
    if (content.length > maxFileBytes) addError('ZIP 单文件超过 25MB: ' + name);
    rawFiles.set(name, content);
  }

  if (topLevels.size !== 1) addError('ZIP 必须只有一个顶层目录');
  const topLevel = [...topLevels][0] ?? null;
  const files = new Map();
  let totalBytes = 0;
  if (topLevel) {
    for (const [name, content] of rawFiles) {
      const prefix = topLevel + '/';
      if (!name.startsWith(prefix)) {
        addError('ZIP 文件不在统一顶层目录: ' + name);
        continue;
      }
      const relative = name.slice(prefix.length);
      if (!relative) continue;
      totalBytes += content.length;
      files.set(relative, content);
    }
  }
  if (totalBytes > maxTotalBytes) addError('DB 总内容超过 200MB');
  return { files, topLevel };
}

function parseJson(files, relativePath, label) {
  const content = files.get(relativePath);
  if (!content) {
    addError('缺少 ' + label + ': ' + relativePath);
    return null;
  }
  try {
    return JSON.parse(content.toString('utf8'));
  } catch (cause) {
    addError(label + ' 不是有效 JSON: ' + cause.message);
    return null;
  }
}

function calculateContentHash(files) {
  const hash = crypto.createHash('sha256');
  const names = [...files.keys()].filter((value) => value !== 'manifest.json').sort();
  for (const name of names) {
    hash.update(name, 'utf8');
    hash.update(Buffer.from([0]));
    hash.update(files.get(name));
    hash.update(Buffer.from([0]));
  }
  return 'sha256:' + hash.digest('hex');
}

function assertString(value, label) {
  if (typeof value !== 'string' || !value.trim()) addError(label + ' 必须是非空字符串');
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || !item.trim())) {
    addError(label + ' 必须是非空字符串数组');
  }
}

function validatePack(files, containerName) {
  const manifest = parseJson(files, 'manifest.json', 'manifest.json');
  if (!manifest) return;
  if (manifest.schemaVersion !== 1) addError('manifest.schemaVersion 必须为 1');
  assertString(manifest.packId, 'manifest.packId');
  assertString(manifest.displayName, 'manifest.displayName');
  assertString(manifest.version, 'manifest.version');
  if (!manifest.compatibleSkill || typeof manifest.compatibleSkill !== 'object') {
    addError('manifest.compatibleSkill 缺失');
  } else {
    assertString(manifest.compatibleSkill.minVersion, 'manifest.compatibleSkill.minVersion');
    if (manifest.compatibleSkill.maxVersion !== null) {
      assertString(manifest.compatibleSkill.maxVersion, 'manifest.compatibleSkill.maxVersion');
    }
  }
  const indexPath = normalizePackPath(manifest.index, 'manifest.index');
  const entriesRoot = normalizePackPath(manifest.entriesRoot, 'manifest.entriesRoot');
  if (indexPath !== 'index.json') addError('manifest.index 必须指向 index.json');
  if (entriesRoot !== 'entries') addError('manifest.entriesRoot 必须指向 entries/');
  if (!allowedStatuses.has(manifest.status)) addError('manifest.status 不支持: ' + manifest.status);
  if (typeof manifest.contentHash !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(manifest.contentHash)) {
    addError('manifest.contentHash 必须是 sha256:<64 位十六进制>');
  }
  if (containerName && manifest.packId !== containerName) {
    addError('manifest.packId 与顶层目录不一致: ' + manifest.packId + ' / ' + containerName);
  }

  const index = parseJson(files, 'index.json', 'index.json');
  if (!index) return;
  if (index.schemaVersion !== 1) addError('index.schemaVersion 必须为 1');
  if (index.packId !== manifest.packId) addError('index.packId 与 manifest.packId 不一致');
  if (!Array.isArray(index.entries) || index.entries.length === 0) {
    addError('index.entries 必须是非空数组');
    return;
  }

  const coreReferences = new Set(
    fs.readdirSync(coreReferencesDir)
      .filter((name) => name.endsWith('.md'))
      .map((name) => name.slice(0, -3)),
  );
  const indexedPaths = new Set();
  const indexedIds = new Set();
  for (const entry of index.entries) {
    if (!entry || typeof entry !== 'object') {
      addError('index.entries 中存在非对象条目');
      continue;
    }
    assertString(entry.id, 'entry.id');
    if (indexedIds.has(entry.id)) addError('entry.id 重复: ' + entry.id);
    indexedIds.add(entry.id);
    assertString(entry.title, 'entry ' + entry.id + ' title');
    assertString(entry.summary, 'entry ' + entry.id + ' summary');
    const entryPath = normalizePackPath(entry.path, 'entry ' + entry.id + ' path');
    if (entryPath && !entryPath.startsWith('entries/')) addError('entry ' + entry.id + ' 必须位于 entries/');
    if (entryPath && !entryPath.endsWith('.md')) addError('entry ' + entry.id + ' 必须是 Markdown 文件');
    if (entryPath && indexedPaths.has(entryPath)) addError('entry.path 重复: ' + entryPath);
    if (entryPath) indexedPaths.add(entryPath);
    assertStringArray(entry.tags, 'entry ' + entry.id + ' tags');
    assertStringArray(entry.useWhen, 'entry ' + entry.id + ' useWhen');
    assertStringArray(entry.notFor, 'entry ' + entry.id + ' notFor');
    if (!['low', 'normal', 'high'].includes(entry.priority)) addError('entry ' + entry.id + ' priority 无效');
    if (!Array.isArray(entry.related) || entry.related.some((item) => typeof item !== 'string')) {
      addError('entry ' + entry.id + ' related 必须是字符串数组');
    }
    if (entry.loadPolicy !== 'on-demand') addError('entry ' + entry.id + ' loadPolicy 必须为 on-demand');
    if (!allowedCategories.has(entry.category)) addError('entry ' + entry.id + ' category 无效: ' + entry.category);
    if (!allowedEntryTypes.has(entry.entryType)) addError('entry ' + entry.id + ' entryType 无效: ' + entry.entryType);
    assertString(entry.ownerRef, 'entry ' + entry.id + ' ownerRef');
    if (typeof entry.ownerRef === 'string' && !coreReferences.has(entry.ownerRef)) {
      addError('entry ' + entry.id + ' ownerRef 不存在: ' + entry.ownerRef);
    }
    if (entryPath && !files.has(entryPath)) addError('entry ' + entry.id + ' 文件不存在: ' + entryPath);
  }

  for (const [name, content] of files) {
    if (content.length === 0) addError('空文件: ' + name);
    const text = content.toString('utf8');
    if (text.includes('\uFFFD')) addError('UTF-8 解码出现替换字符: ' + name);
    if (unfinishedPattern.test(text)) addError('存在未完成占位: ' + name);
    if (name === 'manifest.json' || name === 'index.json') continue;
    if (!name.startsWith('entries/')) addError('DB 中存在未归类文件: ' + name);
    if (name.startsWith('entries/') && !name.endsWith('.md')) addError('DB entries 只允许 Markdown: ' + name);
    if (name.startsWith('entries/') && !indexedPaths.has(name)) addError('存在未被 index 收录的 entry: ' + name);
    if (/\.(?:js|mjs|cjs|ts|tsx|jsx|py|ps1|sh|bat|cmd|exe|dll|so|dylib|jar)$/i.test(name)) {
      addError('DB 禁止可执行或脚本文件: ' + name);
    }
  }

  const actualHash = calculateContentHash(files);
  if (manifest.contentHash !== actualHash) {
    addError('contentHash 不匹配: manifest=' + manifest.contentHash + ', actual=' + actualHash);
  }
}

const input = path.resolve(inputArg);
let files = new Map();
let containerName = null;
if (fs.existsSync(input) && fs.statSync(input).isDirectory()) {
  files = listDirectoryFiles(input);
  containerName = path.basename(input);
} else if (fs.existsSync(input) && fs.statSync(input).isFile()) {
  const zip = readZipFiles(input);
  files = zip.files;
  containerName = zip.topLevel;
} else {
  addError('找不到 DB 目录或 ZIP: ' + inputArg);
}

if (files.size > 0 && printHashOnly) {
  console.log(calculateContentHash(files));
  process.exit(0);
}
if (files.size > 0) validatePack(files, containerName);

if (errors.length) {
  console.error('Knowledge pack validation failed (' + errors.length + '):');
  for (const message of [...new Set(errors)]) console.error('- ' + message);
  process.exit(1);
}

const index = JSON.parse(files.get('index.json').toString('utf8'));
console.log('Knowledge pack validation passed.');
console.log('- entries: ' + index.entries.length);
console.log('- files: ' + files.size);
