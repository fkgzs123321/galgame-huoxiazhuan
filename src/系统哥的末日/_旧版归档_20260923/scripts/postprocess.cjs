/**
 * 后处理脚本 - 系统哥的末日
 * 1. 注入regex_scripts到card.json
 * 2. 注入tavern_helper到card.json
 * 3. 清除PNG旧tEXt chunk并重新打包
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const cardJsonPath = path.join(projectRoot, 'exports', '系统哥的末日.card.json');
const pngPath = path.join(projectRoot, '..', '..', '..', 'src', '角色卡', '系统哥的末日', '系统哥的末日.png');
const htmlDir = path.join(projectRoot, 'source', 'html');
const helperDir = path.join(projectRoot, 'source', 'tavern-helper');

// ============================================================
// 1. 构建regex_scripts（参考三个女孩各有秘密格式）
// ============================================================
const { randomUUID } = require('crypto');

function buildRegexScripts() {
  const statusHtml = fs.readFileSync(path.join(htmlDir, '状态栏.html'), 'utf-8');
  const negotiationHtml = fs.readFileSync(path.join(htmlDir, '交涉面板.html'), 'utf-8');
  const regexDir = path.join(projectRoot, 'source', 'regex');
  const mvuDoneHtml = fs.readFileSync(path.join(regexDir, 'mvu-美化完成.html'), 'utf-8');
  const mvuUpdatingHtml = fs.readFileSync(path.join(regexDir, 'mvu-美化更新中.html'), 'utf-8');

  // 完整 HTML 文档必须用 ```html 围栏包裹，SillyTavern 才会渲染为 iframe 执行 <script>
  const wrappedStatusHtml = '```html\n' + statusHtml + '\n```\n';
  const wrappedNegotiationHtml = '```html\n' + negotiationHtml + '\n```\n';

  const scripts = [
    {
      id: randomUUID(),
      scriptName: '对AI隐藏状态栏',
      findRegex: '<StatusPlaceHolderImpl\\/>',
      replaceString: '',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '状态栏界面',
      findRegex: '<StatusPlaceHolderImpl\\/>',
      replaceString: wrappedStatusHtml,
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: 2
    },
    {
      id: randomUUID(),
      scriptName: '对AI隐藏交涉面板',
      findRegex: '<NegotiationPanel\\/>',
      replaceString: '',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '交涉面板界面',
      findRegex: '<NegotiationPanel\\/>',
      replaceString: wrappedNegotiationHtml,
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '思维链清理',
      findRegex: '<op_thinking>[\\s\\S]*?<\\/op_thinking>',
      replaceString: '',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '隐藏UpdateTable',
      findRegex: '<UpdateTable>[\\s\\S]*?<\\/UpdateTable>',
      replaceString: '',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '只发送最新变量更新',
      findRegex: '/<UpdateVariable>[\\s\\S]*?<\\/UpdateVariable>/gm',
      replaceString: '',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '[美化]变量完成',
      findRegex: '/<UpdateVariable(?:variable)?>\\s*(.*)\\s*<\\/UpdateVariable(?:variable)?>/gsi',
      replaceString: mvuDoneHtml,
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '[美化]变量更新中',
      findRegex: '/<UpdateVariable(?:variable)?>(?!.*<\\/UpdateVariable(?:variable)?>)\\s*(.*)\\s*$/gsi',
      replaceString: mvuUpdatingHtml,
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '隐藏AI交涉数据块',
      findRegex: '<negotiation_panel>[\\s\\S]*?<\\/negotiation_panel>',
      replaceString: '',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '美化小说评论系统',
      findRegex: '<reader_comments>([\\s\\S]*?)<\\/reader_comments>',
      replaceString: '<div style="margin:16px 0;padding:0;border:1px solid #2a2a3e;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.4);"><div style="padding:12px 16px;background:linear-gradient(90deg,#e94560 0%,#c23152 100%);color:#fff;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">📖</span> 读者评论区 <span style="font-size:11px;opacity:0.8;font-weight:400;margin-left:auto;">仅主角可见</span></div><div style="padding:12px 16px;color:#c8c8d0;font-size:13px;line-height:1.8;white-space:pre-wrap;">$1</div></div>',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '美化人设崩塌评价系统',
      findRegex: '<evaluation_change>([\\s\\S]*?)<\\/evaluation_change>',
      replaceString: '<div style="margin:16px 0;padding:0;border:1px solid #2a2a3e;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.4);"><div style="padding:12px 16px;background:linear-gradient(90deg,#f39c12 0%,#e67e22 100%);color:#fff;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">⚠️</span> 人设崩塌评价 <span style="font-size:11px;opacity:0.8;font-weight:400;margin-left:auto;">系统核心约束</span></div><div style="padding:12px 16px;color:#c8c8d0;font-size:13px;line-height:1.8;white-space:pre-wrap;">$1</div></div>',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    // ===== 防口胡/防超自然正则（移植自同级生2） =====
    {
      id: randomUUID(),
      scriptName: '对AI隐藏UpdateVariable',
      findRegex: '<UpdateVariable>[\\s\\S]*?<\\/UpdateVariable>',
      replaceString: '',
      trimStrings: [],
      placement: [1, 2],
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '对AI隐藏UpdateTable块',
      findRegex: '<UpdateTable>[\\s\\S]*?<\\/UpdateTable>',
      replaceString: '',
      trimStrings: [],
      placement: [1, 2],
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '防数值口胡·禁止AI输出数值',
      findRegex: '(评价值|良知值|反抗力|觉醒度|理智值|怀疑度|绑定深度|清醒频率|财富值|好感度|心动值|嫉妒值|信任度|affection|heartbeat|jealousy|trust)\\s*[=＝:]\\s*-?\\d+',
      replaceString: '[数值由数据库管理，禁止 AI 在叙事中输出]',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '超自然关键词检测·提示AI驳回为幻想',
      findRegex: '(读心|透视|瞬间移动|时间停止|意念控制|意念移物|魔法|咒语|法术|神灵|鬼魂|妖怪|灵异|附身|通灵|时间旅行|平行世界|预知未来|心灵感应|超能力|异能|超感知|超自然|系统哥|金手指|随身空间|老爷爷|修仙|穿越重生)',
      replaceString: '[检测到超自然关键词，AI 必须将此描述驳回为 user 的幻想，引导 user 回到现实叙事。本文题材为现代都市NTR，无超自然力量存在]',
      trimStrings: [],
      placement: [1],
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '单轮速胜检测·强制巧合化解',
      findRegex: '((?:证据确凿|当场抓获|人赃并获|铁证如山)[\\s\\S]{0,120}(?:报警|逮捕|立案|抓捕)[\\s\\S]{0,120}(?:成功|落网|归案|入狱|判刑|枪毙))',
      replaceString: '$1\\n[⚠️ 系统守卫拦截：以上情节构成 user 单轮速胜，违反「回合行动规则（地狱档）」第四节——单轮至多1次决定性进展且评价值≥10时80%被巧合化解。系统哥未真正落败，本轮必须以巧合重构（证据失效/证人翻供/程序瑕疵/盟友反水），详见「防绝望」第二节。]',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    },
    {
      id: randomUUID(),
      scriptName: '系统哥被击败检测·反派不死生效',
      findRegex: '((?:林天|系统哥)(?:被|遭到|陷入|遭)[^。\\n]{0,40}(?:逮捕|抓捕|击毙|击败|打败|入狱|枪毙|彻底落败))',
      replaceString: '$1\\n[⚠️ 系统守卫：反派不死定律生效（评价值≥10时），此情节必须以巧合化解（取保候审/替身/假死/系统救场），详见「系统行为准则（地狱档）」。林天的败退只能是多轮累积的结果，禁止单点击穿。]',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 1,
      minDepth: null,
      maxDepth: null
    }
  ];

  return scripts;
}

// ============================================================
// 2. 构建tavern_helper（MVU引擎 + MVU Schema + 骰子系统 + SPV数据库import链接 + raft_13模板注入器）
//    SP·数据库脚本：一行 import 链接（spv7.5），提供 <UpdateTable> 块 SQL 执行能力
//    SPV表格注入器（raft_13 方案）：从禁用世界书条目读取 chatSheets JSON 模板，调用
//      AutoCardUpdaterAPI.importTemplateFromData 自动创建预设，省去用户手动导入
// ============================================================
function buildTavernHelper() {
  // 读取MVU Schema注册脚本
  let mvuSource = '';
  try {
    mvuSource = fs.readFileSync(path.join(helperDir, 'mvu-schema.js'), 'utf-8');
    console.log('  读取MVU Schema脚本:', mvuSource.length, 'bytes');
  } catch (e) {
    console.warn('  [警告] 未找到MVU Schema脚本:', e.message);
  }

  // 读取 SPV 表格注入器脚本（raft_13 风格：从世界书条目读取模板并调用 importTemplateFromData）
  let spvInjectorSource = '';
  try {
    spvInjectorSource = fs.readFileSync(path.join(helperDir, 'spv-inject-tables.js'), 'utf-8');
    console.log('  读取SPV注入器脚本:', spvInjectorSource.length, 'bytes');
  } catch (e) {
    console.warn('  [警告] 未找到SPV注入器脚本:', e.message);
  }

  return {
    scripts: [
      {
        type: 'script',
        enabled: true,
        name: 'MVU',
        id: '2104f006-c66c-48f7-9c19-f2116575f643',
        content: "import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js';",
        info: 'MVU 核心引擎（MagVarUpdate），提供全局 Mvu 对象与变量更新能力，必须最先加载。按钮注册（输入框工具栏可见）：重新处理变量 / 重试额外模型解析 / 重新读取初始变量；隐藏按钮：快照楼层 / 重演楼层 / 清除旧楼层变量',
        button: {
          enabled: true,
          buttons: [
            { name: '重新处理变量', visible: true },
            { name: '重试额外模型解析', visible: true },
            { name: '重新读取初始变量', visible: true },
            { name: '快照楼层', visible: false },
            { name: '重演楼层', visible: false },
            { name: '清除旧楼层变量', visible: false }
          ]
        },
        data: {},
        export_with: {
          data: true,
          button: true
        }
      },
      {
        type: 'script',
        enabled: true,
        name: 'zod结构',
        id: randomUUID(),
        content: mvuSource,
        info: '注册系统哥的末日 MVU Schema（zod），定义所有变量路径和默认值，确保变量正确初始化和更新',
        button: {
          enabled: false,
          buttons: []
        },
        data: {},
        export_with: {
          data: true,
          button: true
        }
      },
      {
        type: 'script',
        enabled: true,
        name: '【骰子系统】-自动更新',
        id: '00b230f8-c5ff-446a-b78f-822bcd2e879f',
        content: "async function getLatestVersion() {\n  try {\n    const response = await fetch('https://api.github.com/repos/jerryzmtz/my-tavern-scripts/tags');\n    const tags = await response.json();\n    return tags[0]?.name || 'main';\n  } catch {\n    return 'main';\n  }\n}\n\nconst version = await getLatestVersion();\nimport(`https://testingcf.jsdelivr.net/gh/jerryzmtz/my-tavern-scripts@${version}/dist/骰子系统/stable.js`);",
        info: "感谢a佬开源\n以九颜二改为基础进行三改\n@kousakayou",
        button: {
          enabled: false,
          buttons: []
        },
        data: {},
        export_with: {
          data: true,
          button: true
        }
      },
      {
        type: 'script',
        enabled: true,
        name: 'SP·数据库',
        id: 'f5160a6d-ee87-4fa5-b7ed-0dfe74f1e5c1',
        content: "import 'https://gcore.jsdelivr.net/gh/AlbusKen/shujuku@spv7.5/index.js';",
        info: 'SPV数据库扩展脚本（spv7.5），提供<UpdateTable>块SQL执行能力。来源：https://github.com/AlbusKen/shujuku',
        button: {
          enabled: true,
          buttons: []
        },
        data: {},
        export_with: {
          data: true,
          button: true
        }
      },
      {
        type: 'script',
        enabled: true,
        name: 'SPV表格注入器',
        id: randomUUID(),
        content: spvInjectorSource,
        info: 'SPV 表格模板注入器（raft_13 方案）：从禁用世界书条目「表格模板JSON」读取 chatSheets JSON 模板，调用 AutoCardUpdaterAPI.importTemplateFromData 自动创建预设并切换。点击按钮即可一键注入，省去手动导入 chatSheets.json 的麻烦。',
        button: {
          enabled: true,
          buttons: [
            { name: '📦 创建系统哥的末日表格模板', visible: true }
          ]
        },
        data: {},
        export_with: {
          data: true,
          button: true
        }
      }
    ],
    variables: {}
  };
}

// ============================================================
// 3. 注入到card.json
// ============================================================
function injectExtensions() {
  console.log('[postprocess] 读取card.json...');
  const card = JSON.parse(fs.readFileSync(cardJsonPath, 'utf-8'));

  if (!card.data) card.data = {};
  if (!card.data.extensions) card.data.extensions = {};

  // 删除多余的TavernHelper_scripts空字段（SillyTavern自动生成，参考卡无此字段）
  if (card.data.extensions.TavernHelper_scripts !== undefined) {
    delete card.data.extensions.TavernHelper_scripts;
    console.log('[postprocess] 删除多余的TavernHelper_scripts字段');
  }

  console.log('[postprocess] 注入regex_scripts...');
  card.data.extensions.regex_scripts = buildRegexScripts();
  console.log('  regex_scripts count:', card.data.extensions.regex_scripts.length);

  console.log('[postprocess] 注入tavern_helper...');
  card.data.extensions.tavern_helper = buildTavernHelper();
  console.log('  tavern_helper scripts count:', card.data.extensions.tavern_helper.scripts.length);

  // 给 enabled=false 的禁用条目强制添加 disable: true 字段，确保 SillyTavern 正确识别为禁用状态（当前为正常档条目）
  const entries = card.data?.character_book?.entries || [];
  let hellFixed = 0;
  entries.forEach(e => {
    if (e.enabled === false && e.disable === undefined) {
      e.disable = true;
      hellFixed++;
      console.log('[postprocess] 给禁用条目添加 disable: true:', e.comment);
    }
  });
  console.log('  修复禁用条目数:', hellFixed);

  // 只保存到exports（中间产物），不再保存到src
  console.log('[postprocess] 保存card.json到exports...');
  const cardJson = JSON.stringify(card, null, 2);
  fs.writeFileSync(cardJsonPath, cardJson, 'utf-8');
  console.log('  exports size:', (cardJson.length / 1024).toFixed(1), 'KB');

  return card;
}

// ============================================================
// 4. PNG打包（直接更新现有PNG，清除旧tEXt chunk）
// ============================================================
function packagePng(card) {
  console.log('[postprocess] 读取现有PNG作为头像源...');
  const pngBuf = fs.readFileSync(pngPath);
  console.log('  现有PNG大小:', (pngBuf.length / 1024 / 1024).toFixed(2), 'MB');

  // 解析PNG chunk
  const chunks = [];
  let pos = 8; // 跳过PNG签名
  while (pos < pngBuf.length) {
    const length = pngBuf.readUInt32BE(pos);
    const type = pngBuf.toString('latin1', pos + 4, pos + 8);
    const data = pngBuf.subarray(pos + 8, pos + 8 + length);
    const crc = pngBuf.subarray(pos + 8 + length, pos + 12 + length);
    chunks.push({ type, length, data, crc });
    pos += 12 + length;
    if (type === 'IEND') break;
  }

  // 过滤掉所有tEXt和zTXt chunk（清除旧卡数据，保留纯头像图像数据）
  const filteredChunks = chunks.filter(c => {
    if (c.type === 'tEXt' || c.type === 'zTXt' || c.type === 'iTXt') {
      const kw = c.data.toString('latin1', 0, c.data.indexOf(0));
      console.log('  移除旧chunk:', c.type, 'keyword:', kw);
      return false;
    }
    return true;
  });

  // 构建新的tEXt chunk
  const cardJson = JSON.stringify(card);
  const cardBase64 = Buffer.from(cardJson, 'utf-8').toString('base64');

  function makeTextChunk(keyword, value) {
    const kwBuf = Buffer.from(keyword, 'latin1');
    const valBuf = Buffer.from(value, 'latin1');
    const data = Buffer.concat([kwBuf, Buffer.from([0]), valBuf]);
    const typeBuf = Buffer.from('tEXt', 'latin1');

    // CRC32计算
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c >>> 0;
    }
    function crc32(buf) {
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
      }
      return (crc ^ 0xFFFFFFFF) >>> 0;
    }
    const crcInput = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcInput), 0);

    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    return Buffer.concat([length, typeBuf, data, crc]);
  }

  const charaChunk = makeTextChunk('chara', cardBase64);
  const ccv3Chunk = makeTextChunk('chara_card_v3', cardBase64);
  console.log('  chara chunk size:', charaChunk.length);
  console.log('  chara_card_v3 chunk size:', ccv3Chunk.length);

  // 重建PNG：签名 + IHDR + 新tEXt chunks + 其余chunks
  const signature = pngBuf.subarray(0, 8);
  const parts = [signature];

  // IHDR必须是第一个chunk
  if (filteredChunks[0] && filteredChunks[0].type === 'IHDR') {
    const ihdr = filteredChunks[0];
    const ihdrBuf = Buffer.alloc(4 + 4 + ihdr.data.length + 4);
    ihdrBuf.writeUInt32BE(ihdr.length, 0);
    ihdrBuf.write('IHDR', 4, 'latin1');
    ihdr.data.copy(ihdrBuf, 8);
    ihdr.crc.copy(ihdrBuf, 8 + ihdr.data.length);
    parts.push(ihdrBuf);

    // 在IHDR后插入tEXt chunks
    parts.push(charaChunk);
    parts.push(ccv3Chunk);

    // 其余chunks
    for (let i = 1; i < filteredChunks.length; i++) {
      const c = filteredChunks[i];
      const cBuf = Buffer.alloc(4 + 4 + c.data.length + 4);
      cBuf.writeUInt32BE(c.length, 0);
      cBuf.write(c.type, 4, 'latin1');
      c.data.copy(cBuf, 8);
      c.crc.copy(cBuf, 8 + c.data.length);
      parts.push(cBuf);
    }
  } else {
    // 如果第一个不是IHDR，直接拼接
    parts.push(charaChunk);
    parts.push(ccv3Chunk);
    for (const c of filteredChunks) {
      const cBuf = Buffer.alloc(4 + 4 + c.data.length + 4);
      cBuf.writeUInt32BE(c.length, 0);
      cBuf.write(c.type, 4, 'latin1');
      c.data.copy(cBuf, 8);
      c.crc.copy(cBuf, 8 + c.data.length);
      parts.push(cBuf);
    }
  }

  const output = Buffer.concat(parts);
  fs.writeFileSync(pngPath, output);
  console.log('[postprocess] PNG更新完成:', (output.length / 1024 / 1024).toFixed(2), 'MB');

  // 验证
  const verifyBuf = fs.readFileSync(pngPath);
  let vpos = 8;
  let chunkCount = 0;
  while (vpos < verifyBuf.length) {
    const vlen = verifyBuf.readUInt32BE(vpos);
    const vtype = verifyBuf.toString('latin1', vpos + 4, vpos + 8);
    if (vtype === 'tEXt') {
      const vdata = verifyBuf.subarray(vpos + 8, vpos + 8 + vlen);
      const vnul = vdata.indexOf(0);
      const vkw = vdata.toString('latin1', 0, vnul);
      const vval = vdata.toString('latin1', vnul + 1);
      const vdecoded = Buffer.from(vval, 'base64').toString('utf-8');
      const vobj = JSON.parse(vdecoded);
      console.log('  验证 tEXt:', vkw, '→ name:', vobj.data?.name || vobj.name, 'entries:', vobj.data?.character_book?.entries?.length);
      // 验证 tavern_helper 是否注入
      const scripts = vobj.data?.extensions?.tavern_helper?.scripts || [];
      console.log('  tavern_helper scripts:', scripts.length);
      scripts.forEach((s, i) => console.log(`    [${i}]`, s.name, '- enabled:', s.enabled));
    }
    vpos += 12 + vlen;
    chunkCount++;
    if (vtype === 'IEND') break;
  }
  console.log('  总chunk数:', chunkCount);
}

// ============================================================
// 主流程
// ============================================================
console.log('=== 系统哥的末日 后处理脚本 ===\n');
const card = injectExtensions();
console.log('');
packagePng(card);
console.log('\n=== 后处理完成 ===');
