import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const statePath = path.join(projectDir, 'tavern-cards-state.json');
const templatePath = path.join(projectDir, '数据库', '隐形守护者·骰子SQL_v4.3.json');

const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

state.extensions = state.extensions || {};
state.extensions.tavern_helper = state.extensions.tavern_helper || { scripts: {} };
const scripts = state.extensions.tavern_helper.scripts;

delete scripts['抉择面板桥接'];

if (scripts['序章写死强制']) {
  scripts['序章写死强制'].button = { enabled: true, buttons: [] };
  scripts['序章写死强制'].info = '12选写死；AI 漏写时自动补全 branches 供行动选项渲染';
}

scripts['SP·数据库'] = {
  type: 'script',
  script_file: '脚本/SP·数据库.txt',
  enabled: true,
  id: 'f5160a6d-ee87-4fa5-b7ed-0dfe74f1e5c1',
  info: 'shujuku@spv3.9.8.1；自动应用内嵌隐形守护者·骰子SQL_v4.3+条件模板',
  button: { enabled: true, buttons: [] },
  data: {
    bootstrapVersion: 1,
    templatePresetName: '隐形守护者·骰子SQL_v4.3',
    chatSheetsTemplate: template,
  },
};

const diceContent = fs.readFileSync(
  'C:/Users/Carrot/Downloads/酒馆助手脚本-【骰子系统】-自动更新.json',
  'utf8',
);
const diceJson = JSON.parse(diceContent);
scripts['【骰子系统】-自动更新'] = {
  type: 'script',
  script_file: '脚本/【骰子系统】-自动更新.txt',
  enabled: true,
  id: diceJson.id || '00b230f8-c5ff-446a-b78f-822bcd2e879f',
  info: diceJson.info || '骰子系统 CDN 自动更新',
  button: diceJson.button || { enabled: false, buttons: [] },
  data: diceJson.data || {},
};

if (!scripts.MVU) {
  scripts.MVU = {
    type: 'script',
    script_file: '脚本/MVU.txt',
    enabled: true,
    id: 'd0311ca6-5e9a-498e-a777-f74dc4dc6b12',
    info: '',
    button: {
      enabled: true,
      buttons: [
        { name: '重新处理变量', visible: true },
        { name: '重新读取初始变量', visible: true },
      ],
    },
    data: {},
  };
}
if (!scripts.Zod) {
  scripts.Zod = {
    type: 'script',
    script_file: '脚本/Zod.txt',
    enabled: true,
    id: '5b3b09af-35e3-4149-a0f7-2f08776ed6a1',
    info: '',
    button: { enabled: true, buttons: [] },
    data: {},
  };
}

const regexBase = {
  对AI隐藏状态栏: {
    id: 'a1b2c3d4-e5f6-4a6a-8ebb-bd8a3b7f671f',
    findRegex: '<StatusPlaceHolderImpl/>',
    replaceString: '',
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: false,
    promptOnly: true,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  },
  对AI隐藏行动选项: {
    id: 'f1a2b3c4-d5e6-4789-a012-3456789abcde',
    findRegex: '/<branches>[\\s\\S]*?<\\/branches>/gm',
    replaceString: '',
    trimStrings: [],
    placement: [1, 2],
    disabled: false,
    markdownOnly: false,
    promptOnly: true,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  },
  对AI隐藏BE结局: {
    id: 'e7f8a9b0-c1d2-4e3f-a4b5-678901234567',
    findRegex: '/<yxsh_be>[\\s\\S]*?<\\/yxsh_be>/gm',
    replaceString: '',
    trimStrings: [],
    placement: [1, 2],
    disabled: false,
    markdownOnly: false,
    promptOnly: true,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  },
  BE结局框: {
    id: 'f8a9b0c1-d2e3-4f4a-b5c6-789012345678',
    findRegex: '<yxsh_be>\\s*([\\s\\S]*?)\\s*</yxsh_be>',
    replace_file: '正则/BE结局框.html',
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  },
  行动选项: {
    id: 'a2b3c4d5-e6f7-4890-b123-456789abcdef',
    findRegex: '<branches>\\s*([\\s\\S]*?)\\s*</branches>',
    replace_file: '正则/行动选项.html',
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  },
  状态栏界面: {
    id: 'b2c3d4e5-f6a7-4057-8964-3192b7903acc',
    findRegex: '<StatusPlaceHolderImpl\\/>',
    replace_file: '正则/界面/状态栏.html',
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  },
  对AI隐藏变量更新: {
    id: 'c3d4e5f6-a7b8-4450-ac1f-0bfe1d6a4f64',
    findRegex: '/<(update(?:variable)?)>(?:(?!.*<\\/\\1>)(?:(?!<\\1>).)*$|(?:(?!<\\1>).)*<\\/\\1?>)/gsi',
    replaceString: '',
    trimStrings: [],
    placement: [1, 2],
    disabled: false,
    markdownOnly: false,
    promptOnly: true,
    runOnEdit: false,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  },
  变量更新中美化: {
    id: 'd4e5f6a7-b8c9-46bf-8a69-602d64bbde22',
    findRegex: '/<(update(?:variable)?)>(?!.*<\\/\\1>)\\s*((?:(?!<\\1>).)*)\\s*$/gsi',
    replace_file: '正则/变量更新中美化.html',
    trimStrings: [],
    placement: [1, 2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  },
  变量更新美化: {
    id: 'e5f6a7b8-c9d0-4929-871f-43d110e5ec76',
    findRegex: '/<(update(?:variable)?)>\\s*((?:(?!<\\1>).)*)\\s*<\\/\\1>/gsi',
    replace_file: '正则/变量更新美化.html',
    trimStrings: [],
    placement: [1, 2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  },
};

/** 从 正则/全局/*.json 载入数据库纪要三条（导入角色卡即带，顺序：1→2→远楼层） */
function loadGlobalDbRegex() {
  const files = [
    '新·星河璀璨数据库召回配套正则1.json',
    '星河璀璨数据库召回配套正则2.json',
    '[隐藏][不发送]远楼层消息.json',
  ];
  const out = {};
  for (const file of files) {
    const p = path.join(projectDir, '正则/全局', file);
    if (!fs.existsSync(p)) {
      console.warn(`skip missing global regex: ${file}`);
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const name = raw.scriptName || file.replace(/\.json$/, '');
    const { scriptName: _sn, ...script } = raw;
    out[name] = script;
  }
  return out;
}

const dbRegex = loadGlobalDbRegex();
// 数据库三条必须在列表最上方，且 配套正则1 在 配套正则2 之上
state.regex_scripts = { ...dbRegex, ...regexBase };

state.creator_notes =
  '必开：MVU+Zod+SP·数据库+序章写死强制；酒馆勾选「使用额外模型解析」。世界书：开「[mvu_update]变量输出格式（额外模型）」、关「[mvu_update]变量输出格式」。BE 楼 <yxsh_be>+branches；正则：数据库1→2→远楼层→BE→行动选项→状态栏。';

fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
console.log('Embedded SQL template + scripts + regex into tavern-cards-state.json');
