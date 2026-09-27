#!/usr/bin/env node
// build.mjs · 把 dist 的前端界面产物做成 CDN 用的单页
//
// ★ 与参照仓（xitongge / xueyue）一致的产物形态：
//   代码块包裹的 <body> 片段 —— 不是完整 HTML 文档。
//   酒馆把正则替换结果当 markdown 渲染，外面那层 ``` 是必需的。
//
// ★ 为什么不用完整文档：现有 5 个 galgame-* 仓库都是这个形态，
//   而 loader 是用 $("body").load(url) 注入的 —— 塞进去一个 <html> 反而会坏。
//
// ★★ 多界面（2026-09-27 改）：
//   原先只构建状态栏。现在有两个界面，各自是一个占位符的替换载荷：
//     状态栏   → 挂在 <StatusPlaceHolderImpl/>（AI 每回合输出）
//     开局表单 → 挂在 <OpeningPlaceHolder/>（开场白末尾，玩家的游玩入口）
//   两个走**同一份** CDN 产物，用 URL hash（#open）区分要挂哪个。
//   这样只需维护一条 CDN 链接和一份 commit，简化回填。
import fs from 'node:fs';
import path from 'node:path';

const WS = 'E:/Games/写卡/tavern_helper_template/';
const REPO_DIR = WS + '_ui_repo/huoxiazhuan/';
const DIST_DIR = REPO_DIR + 'dist/';
const cfg = JSON.parse(fs.readFileSync(REPO_DIR + 'repo.config.json', 'utf8'));

const 界面s = [
  {
    key: '状态栏',
    源: WS + 'dist/活侠传/界面/状态栏/index.html',
    标题: '游戏主界面（场景图 + 立绘 + 前往 + 本旬可做）+ 六页签 + 战斗浮层 + 前置检查浮层',
    自检: [
      // ★ 2026-09-28 改版：从表格形态改成**游戏场景形态**。
      //   自检项跟着换 —— 仍在检查「文案是否真的进了产物」，
      //   只是文案本身变成了新界面的。
      ['场景：前往按钮', o => o.includes('前往')],
      ['场景：本旬可做', o => o.includes('本旬可做')],
      ['素材：CDN 前缀已注入', o => o.includes('galgame-huoxiazhuan@')],
      ['素材：索引文件名', o => o.includes('pack_index.json')],
      ['素材：包格式（RIFF 校验）', o => o.includes('RIFF')],
      ['地图：地点表', o => o.includes('正心堂') && o.includes('锻冶场')],
      ['页签：人物', o => o.includes('人物')],
      ['页签：行囊（物表）', o => o.includes('鹿皮囊')],
      ['武学：秘籍门槛', o => o.includes('本可练')],
      ['门派阶段名', o => o.includes('云开见日')],
    ],
  },
  {
    key: '开局表单',
    源: WS + 'dist/活侠传/界面/开局表单/index.html',
    标题: '开局表单 —— 填人设、选身份、分配配点，提交后由 AI 铺开开场',
    自检: [
      ['标题', o => o.includes('活侠传')],
      ['身份选项', o => o.includes('唐门外姓弟子')],
      ['配点项', o => o.includes('锻造')],
      ['开局须知', o => o.includes('错过的事件不会回来')],
      ['提交按钮', o => o.includes('入唐门')],
    ],
  },
];

fs.mkdirSync(DIST_DIR, { recursive: true });

let 全部 = 0;
let bad = 0;

for (const 界面 of 界面s) {
  if (!fs.existsSync(界面.源)) {
    console.error('✗ 找不到构建产物: ' + 界面.源);
    console.error('  先跑: node --import tsx node_modules/webpack-cli/bin/cli.js --mode production');
    process.exit(2);
  }

  const raw = fs.readFileSync(界面.源, 'utf8');
  console.log('【' + 界面.key + '】');
  console.log('  源: ' + raw.length + ' 字符 / ' + (Buffer.byteLength(raw, 'utf8') / 1024).toFixed(0) + ' KB');

  // 抽出 <head> 与 <body> 的内容
  const mHead = /<head>([\s\S]*?)<\/head>/i.exec(raw);
  const mBody = /<body>([\s\S]*?)<\/body>/i.exec(raw);
  const head = mHead ? mHead[1] : '';
  const body = mBody ? mBody[1] : raw;

  // 组装成 CDN 单页：``` + <body> + 样式/脚本 + </body> + ```
  //   ★ 顺序讲究：webpack 产物把 <style> 放在 head 里，
  //     但用 $("body").load() 注入时 <head> 不生效 —— 所以样式必须搬进 body。
  const out = [
    '```',
    '<body>',
    '<!-- 活侠传 · ' + 界面.key + '（CDN 产物，由 _ui_repo/huoxiazhuan 构建，勿手改） -->',
    '<!-- ' + 界面.标题 + ' -->',
    head,
    body,
    '</body>',
    '```',
    '',
  ].join('\n');

  const 文件名 = 界面.key === '状态栏' ? 'index.html' : 'open.html';
  fs.writeFileSync(DIST_DIR + 文件名, out, 'utf8');
  全部++;
  console.log('  → dist/' + 文件名 + '  ' + (Buffer.byteLength(out, 'utf8') / 1024).toFixed(0) + ' KB');

  // 自检
  const 通用 = [
    ['DOCTYPE（不该有）', !/<!DOCTYPE/i.test(out)],
    ['样式已搬进 body', /<style/i.test(out)],
    ['挂载点 #app', out.includes('id="app"')],
    ['应用挂载代码', /createApp|\.mount\(/.test(out)],
    ['代码块围栏', out.trimStart().startsWith('```') && out.trimEnd().endsWith('```')],
  ];
  for (const [name, ok] of [...通用, ...界面.自检.map(([n, f]) => [n, f(out)])]) {
    if (!ok) bad++;
    console.log('    ' + (ok ? '✓' : '✗') + ' ' + name);
  }
  console.log('');
}

if (bad) {
  console.error('✗ 有 ' + bad + ' 项不合格');
  process.exit(1);
}
console.log('构建完成（' + 全部 + ' 个界面）。CDN URL:');
console.log('  ' + cfg.CDN + '/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '@<commit>/index.html');
console.log('  ' + cfg.CDN + '/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '@<commit>/open.html');
