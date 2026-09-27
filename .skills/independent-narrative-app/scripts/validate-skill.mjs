#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const referencesDir = path.join(root, 'references');
const templatesDir = path.join(root, 'assets', 'templates');
const evalsDir = path.join(root, 'evals');
const knowledgePackValidator = path.join(root, 'scripts', 'validate-knowledge-pack.mjs');

const expectedReferences = [
  'workflow-entry-discovery-and-draft.md',
  'workflow-project-bootstrap-and-first-slice.md',
  'workflow-feasibility-and-design-gates.md',
  'workflow-stages-delivery-and-change-control.md',
  'rp-worldbuilding-and-knowledge-boundaries.md',
  'rp-player-role-and-agency.md',
  'rp-characters-and-relationships.md',
  'rp-opening-story-and-endings.md',
  'rp-style-and-expression.md',
  'rp-worldbook-authoring.md',
  'rp-prompt-policy-and-presets.md',
  'rp-gameplay-story-integration.md',
  'rp-content-modes-and-exclusions.md',
  'runtime-host-foundation-and-content-pack.md',
  'runtime-turn-kernel-and-state-transactions.md',
  'runtime-memory-context-and-history.md',
  'runtime-worldbook-selection-and-injection.md',
  'runtime-prompt-assembly-and-context-budget.md',
  'runtime-preset-model-profile-and-output-contracts.md',
  'runtime-st-macros-and-template-compatibility.md',
  'runtime-model-gateway-and-streaming.md',
  'runtime-ui-commands-and-projections.md',
  'runtime-save-migrations-and-recovery.md',
  'runtime-platform-and-assets.md',
  'runtime-security-privacy-and-trust.md',
  'ui-visual-style-and-color-guidance.md',
  'ui-settings-and-preferences.md',
  'ui-narrative-reading-and-message-rendering.md',
  'runtime-cot-planning-and-assembly.md',
  'runtime-token-cache-and-context-optimization.md',
  'bridge-st-card-to-app.md',
  'bridge-existing-app-audit-and-modernization.md',
  'quality-behavior-specs-and-regression.md',
  'quality-integration-diagnostics-and-traces.md',
  'quality-release-maintenance-and-pitfalls.md',
  'example-rp-design-walkthrough.md',
].sort();

const expectedTemplates = [
  'project-profile-and-draft.md',
  'host-capability-map.md',
  'complete-design.md',
  'stage-roadmap.md',
  'system-design-card.md',
  'behavior-case.md',
  'compatibility-report.md',
  'acceptance-report.md',
].sort();

const errors = [];
const warnings = [];
const placeholderPattern = new RegExp(`\\b(?:${['TO', 'DO'].join('')}|${['TB', 'D'].join('')})\\b`, 'i');
const mojibakePattern = new RegExp([0x951f, 0x65a4, 0x62f7, 0x9225, 0x93cd, 0x95c4, 0x9352]
  .map((codePoint) => String.fromCodePoint(codePoint))
  .join('|'));

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

function allFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? allFiles(full) : [full];
  });
}

function readJson(file, label) {
  try {
    return JSON.parse(readUtf8(file));
  } catch (error) {
    errors.push(`${label} 不是有效 JSON: ${error.message}`);
    return null;
  }
}

function checkRouteCases() {
  const casesPath = path.join(evalsDir, 'route-cases.json');
  if (!fs.existsSync(casesPath)) {
    errors.push('缺少 evals/route-cases.json');
    return;
  }
  const manifest = readJson(casesPath, 'evals/route-cases.json');
  if (!manifest) return;
  if (manifest.schemaVersion !== 1) errors.push('evals/route-cases.json schemaVersion 必须为 1');
  if (manifest.skill !== 'independent-narrative-app') errors.push('evals/route-cases.json skill 不匹配');
  if (!Array.isArray(manifest.cases) || manifest.cases.length < 10) {
    errors.push('evals/route-cases.json 至少需要 10 条路由案例');
    return;
  }

  const ids = new Set();
  let positive = 0;
  let negative = 0;
  for (const testCase of manifest.cases) {
    if (!testCase || typeof testCase !== 'object') {
      errors.push('路由案例必须是对象');
      continue;
    }
    for (const field of ['id', 'prompt', 'expectedRoute']) {
      if (typeof testCase[field] !== 'string' || !testCase[field].trim()) {
        errors.push(`路由案例缺少有效字段: ${field}`);
      }
    }
    if (typeof testCase.id === 'string') {
      if (ids.has(testCase.id)) errors.push(`路由案例 ID 重复: ${testCase.id}`);
      ids.add(testCase.id);
    }
    if (typeof testCase.shouldTrigger !== 'boolean') errors.push(`路由案例 shouldTrigger 必须为布尔值: ${testCase.id ?? '<unknown>'}`);
    if (!Array.isArray(testCase.expectedBehaviors) || testCase.expectedBehaviors.length === 0) {
      errors.push(`路由案例缺少 expectedBehaviors: ${testCase.id ?? '<unknown>'}`);
    }
    if (!Array.isArray(testCase.forbiddenBehaviors) || testCase.forbiddenBehaviors.length === 0) {
      errors.push(`路由案例缺少 forbiddenBehaviors: ${testCase.id ?? '<unknown>'}`);
    }
    if (testCase.shouldTrigger) {
      positive += 1;
      if (testCase.expectedRoute === 'none') errors.push(`正样本不得使用 none 路由: ${testCase.id}`);
      const routeFile = path.join(referencesDir, `${testCase.expectedRoute}.md`);
      if (!fs.existsSync(routeFile)) errors.push(`正样本预期路由不存在: ${testCase.id} -> ${testCase.expectedRoute}`);
    } else {
      negative += 1;
      if (testCase.expectedRoute !== 'none') errors.push(`负样本必须使用 none 路由: ${testCase.id}`);
    }
  }
  if (positive < 5) errors.push(`正样本至少需要 5 条，当前 ${positive}`);
  if (negative < 3) errors.push(`负样本至少需要 3 条，当前 ${negative}`);
}

function compareInventory(label, actual, expected) {
  const missing = expected.filter((name) => !actual.includes(name));
  const extra = actual.filter((name) => !expected.includes(name));
  if (missing.length) errors.push(`${label} 缺少: ${missing.join(', ')}`);
  if (extra.length) errors.push(`${label} 多出: ${extra.join(', ')}`);
}

function readUtf8(file) {
  const bytes = fs.readFileSync(file);
  const text = bytes.toString('utf8');
  if (text.includes('\uFFFD')) errors.push(`UTF-8 解码出现替换字符: ${path.relative(root, file)}`);
  return text;
}

function checkFrontmatter(skillText) {
  const match = skillText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    errors.push('SKILL.md 缺少有效 YAML frontmatter');
    return;
  }
  const keys = match[1]
    .split(/\r?\n/)
    .filter((line) => /^[A-Za-z0-9_-]+\s*:/.test(line))
    .map((line) => line.slice(0, line.indexOf(':')).trim())
    .sort();
  if (keys.join(',') !== 'description,name') {
    errors.push(`SKILL.md frontmatter 只能含 name/description，当前: ${keys.join(', ')}`);
  }
  if (!/^name:\s*independent-narrative-app\s*$/m.test(match[1])) {
    errors.push('SKILL.md name 与目录名不一致');
  }
}

function checkLocalLinks(file, text) {
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1].trim().replace(/^<|>$/g, '').split('#', 1)[0];
    if (!target || /^(?:https?:|mailto:|data:)/i.test(target)) continue;
    const decoded = decodeURIComponent(target);
    const resolved = path.resolve(path.dirname(file), decoded);
    if (!fs.existsSync(resolved)) {
      errors.push(`失效本地链接: ${path.relative(root, file)} -> ${target}`);
    }
  }
}

function requireTokens(file, label, tokens) {
  if (!fs.existsSync(file)) return;
  const text = readUtf8(file);
  for (const token of tokens) {
    if (!text.includes(token)) errors.push(`${label} 缺少可靠性护栏: ${token}`);
  }
}

function checkDuplicateParagraphs(files) {
  const owners = new Map();
  for (const file of files) {
    const text = readUtf8(file);
    const paragraphs = text.split(/\r?\n\s*\r?\n/)
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .filter((value) => value.length >= 220 && !value.startsWith('|'));
    for (const paragraph of paragraphs) {
      const key = paragraph.toLowerCase();
      const previous = owners.get(key);
      if (previous && previous !== file) {
        errors.push(`分册存在重复长段落: ${path.basename(previous)} / ${path.basename(file)}`);
      } else {
        owners.set(key, file);
      }
    }
  }
}

for (const requiredDir of [referencesDir, templatesDir, evalsDir, path.join(root, 'agents'), path.join(root, 'scripts')]) {
  if (!fs.existsSync(requiredDir)) errors.push(`缺少目录: ${path.relative(root, requiredDir)}`);
}

const referenceFiles = fs.existsSync(referencesDir) ? listFiles(referencesDir) : [];
const templateFiles = fs.existsSync(templatesDir) ? listFiles(templatesDir) : [];
compareInventory('references', referenceFiles, expectedReferences);
compareInventory('assets/templates', templateFiles, expectedTemplates);
if (referenceFiles.length !== 36) errors.push(`references 应为 36 本，当前 ${referenceFiles.length}`);
if (templateFiles.length !== 8) errors.push(`模板应为 8 个，当前 ${templateFiles.length}`);
if (!fs.existsSync(knowledgePackValidator)) errors.push('缺少 scripts/validate-knowledge-pack.mjs');

const skillPath = path.join(root, 'SKILL.md');
const skillText = fs.existsSync(skillPath) ? readUtf8(skillPath) : '';
checkFrontmatter(skillText);
if (!/\*\*Version:\*\*\s*0\.3\.1\b/.test(skillText)) {
  errors.push('SKILL.md Version 必须为 0.3.1');
}

for (const name of expectedReferences) {
  if (!skillText.includes(`references/${name}`)) errors.push(`SKILL.md 未路由 reference: ${name}`);
}
for (const name of expectedTemplates) {
  if (!skillText.includes(name)) errors.push(`SKILL.md 未路由模板: ${name}`);
}

checkRouteCases();

requireTokens(
  path.join(referencesDir, 'runtime-turn-kernel-and-state-transactions.md'),
  'Turn-State Contract',
  [
    '查询已提交 Command Receipt 与 in-flight 记录',
    '只有未见过的 commandId 才校验 expectedRevision',
    '不能用当前 `lastTrace` 或最新 Projection 冒充原结果',
  ],
);
requireTokens(
  path.join(referencesDir, 'runtime-save-migrations-and-recovery.md'),
  'Save-Recovery Contract',
  [
    '`durable ACK` 是证据结论，不是固定方法名',
    '原子替换 + 读回',
    '`atomic-readback-ack`',
    '不得静默回退',
    '不能自动创建空档覆盖',
  ],
);
requireTokens(
  path.join(referencesDir, 'quality-integration-diagnostics-and-traces.md'),
  'Integration Evidence',
  [
    '## 导航',
    '### 4. 建立强制覆盖矩阵',
    '正常回合',
    '重复 commandId',
    'CAS 结果未知',
    'durable 后取消',
    '损坏与恢复',
    '`通过 / 失败 / 仅 Mock / 未验证 / 不适用`',
  ],
);
requireTokens(
  path.join(referencesDir, 'workflow-project-bootstrap-and-first-slice.md'),
  'Implementation Bootstrap',
  [
    '## 导航',
    '建立完整强制覆盖矩阵',
    '强制覆盖矩阵场景、合法状态和证据列完整',
    'Save ACK 使用与实际耐久证据匹配的名称',
  ],
);
requireTokens(
  path.join(templatesDir, 'acceptance-report.md'),
  'Acceptance Template',
  [
    '## 第一切片强制覆盖矩阵',
    '实际耐久证据等级',
    '实际环境/模型',
    '影响/延期条件',
    '再验证入口',
    '重复 commandId：已提交/in-flight/不同 payload',
    'CAS 结果未知与启动对账',
    '损坏检测与恢复',
  ],
);

const requiredHeadings = ['## 作用', '## 读取条件', '## 前置输入', '## 唯一产物', '## 不负责'];
for (const name of referenceFiles) {
  const file = path.join(referencesDir, name);
  const text = readUtf8(file);
  for (const heading of requiredHeadings) {
    if (!text.includes(heading)) errors.push(`${name} 缺少统一契约字段: ${heading}`);
  }
}

const openaiPath = path.join(root, 'agents', 'openai.yaml');
const openaiText = fs.existsSync(openaiPath) ? readUtf8(openaiPath) : '';
if (!openaiText.includes('$independent-narrative-app')) {
  errors.push('agents/openai.yaml 的 default_prompt 未包含 $independent-narrative-app');
}

const forbiddenTopLevel = ['README.md', 'CHANGELOG.md', 'INSTALLATION_GUIDE.md', 'QUICK_REFERENCE.md'];
for (const name of forbiddenTopLevel) {
  if (fs.existsSync(path.join(root, name))) errors.push(`不应包含额外文档: ${name}`);
}

const files = allFiles(root);
for (const file of files) {
  const stat = fs.statSync(file);
  const relative = path.relative(root, file);
  if (stat.size === 0) errors.push(`空文件: ${relative}`);
  const text = readUtf8(file);
  if (placeholderPattern.test(text)) errors.push(`存在未完成占位: ${relative}`);
  if (mojibakePattern.test(text)) warnings.push(`可能存在乱码，请人工复核: ${relative}`);
  if (file.endsWith('.md')) checkLocalLinks(file, text);
}

checkDuplicateParagraphs(referenceFiles.map((name) => path.join(referencesDir, name)));

if (warnings.length) {
  console.warn('Warnings:');
  for (const warning of [...new Set(warnings)]) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error(`Skill validation failed (${errors.length}):`);
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Skill validation passed.');
console.log(`- root: ${root}`);
console.log(`- references: ${referenceFiles.length}`);
console.log(`- templates: ${templateFiles.length}`);
console.log(`- files: ${files.length}`);
