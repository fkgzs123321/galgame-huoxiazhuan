// ════════════════════════════════════════════════════════════
// register-final.cjs · 补最后三件：时间线 / 事件 / 面板正则
//
// ★ 面板不用 CDN 外链 —— 外链会失效（同级生2 走的是 jsdelivr，那是已知隐患）。
//   这里把 html 直接内联进 replaceString，卡自带，不依赖任何外部仓库。
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const 门控 = "@@if getvar('stat_data.世界.底座', { defaults: '' }) === 'yingxiong'";

const patch = [];

// ── 容器：RFC 6902 的 add 不能在缺失的父路径下增子节点（踩过两次）──
patch.push({ op: 'add', path: '/regex_scripts', value: {} });

// ── 时间线 ×1 ──
patch.push({
  op: 'add', path: '/entryManifest/时间线/时间轴索引',
  value: {
    contents: [{ content: 门控 }, { file: '世界书/时间线/时间轴索引.yaml' }],
    part: 'history', scope: 'specific', keywords: [],
    abstract: '时间线/history：时间轴索引',
    enabled: true,
    strategy: { type: 'constant' },        // 它是时间的主轴，要常驻
    position: { type: 'before_character_definition', order: 400 },
  },
});

// ── 事件 ×1 ──
patch.push({
  op: 'add', path: '/entryManifest/事件/终局',
  value: {
    contents: [{ content: 门控 }, { file: '世界书/事件/终局.yaml' }],
    scope: 'specific', keywords: ['终局', '时空的尽头', '石板', '我是谁', '道德和尚', '东方求败'],
    abstract: '事件：终局',
    enabled: true,
    strategy: { type: 'selective', keys: ['终局', '时空的尽头', '石板', '我是谁', '道德和尚', '东方求败'] },
    position: { type: 'at_depth', role: 'system', depth: 0, order: 500 },
  },
});

// ── 面板正则（内联 html）──
const html = fs.readFileSync(path.join(D, '正则', '状态栏界面.html'), 'utf8');
const 面板 = '```\n' + html + '\n```\n';
patch.push({
  op: 'add', path: '/regex_scripts/状态栏界面',
  value: {
    id: '00000000-0000-4000-8000-0000000000a1',
    findRegex: '<StatusPlaceHolderImpl/>',
    trimStrings: [],
    placement: [2],
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 0,
    replaceString: 面板,
  },
});
// 对 AI 隐藏占位符（promptOnly：只影响发给 AI 的内容）
patch.push({
  op: 'add', path: '/regex_scripts/对AI隐藏占位符',
  value: {
    id: '00000000-0000-4000-8000-0000000000a2',
    findRegex: '<StatusPlaceHolderImpl/>',
    trimStrings: [],
    placement: [2],
    markdownOnly: false,
    promptOnly: true,
    runOnEdit: true,
    substituteRegex: 0,
    replaceString: '',
  },
});

// ── first_messages ──
patch.push({ op: 'add', path: '/first_messages', value: ['开场白/0.md'] });

fs.writeFileSync(path.join(D, 'scripts', 'patch-final.json'), JSON.stringify(patch, null, 1));
console.log(`patch: 时间线 1 / 事件 1 / 正则 2 / first_messages 1 = ${patch.length} 条`);
console.log(`  面板内联 ${html.length} 字符（不依赖 CDN）`);

const FORGE = path.join(ROOT, '_tc_repo', 'tavern-cards', 'scripts', 'tavern-cards-forge.mjs');
console.log(execFileSync('node', [FORGE, 'patch', '旮旯给木-英雄坛说', '--file', path.join(D, 'scripts', 'patch-final.json')], { encoding: 'utf8' }).trim());

console.log('\n=== 重新打包 ===');
console.log(execFileSync('node', [FORGE, 'pack', '旮旯给木-英雄坛说'], { encoding: 'utf8' }).trim());
