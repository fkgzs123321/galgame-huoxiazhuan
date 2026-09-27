import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const basePath = path.join(projectDir, '数据库', 'SQL_v4.3.base.json');
const outPath = path.join(projectDir, '数据库', '隐形守护者·骰子SQL_v4.3.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));

const sheetPlotState = {
  uid: 'sheet_plot_state',
  name: '剧情状态表',
  sourceData: {
    note: '记录《隐形守护者》主线进度（单行）。与 MVU stat_data.剧情 每轮同步。\n\n【列定义】\n列1=row_id（仅允许为1）\n列2=当前章节 chapter\n列3=当前节点 node_id（与《抉择校验表》一致，如序章-1）\n列4=序章完成 prologue_done（是/否）\n列5=已死亡 is_dead（是/否）\n列6=结局分支 ending_branch（空或标准结局名）\n列7=检查点 checkpoint\n\n【禁止】AI 不得擅自跳关；节点变更须对应用户选项与《抉择校验表》。',
    initNode:
      "游戏初始化时插入唯一一行。\nSQL示例: INSERT INTO plot_state (row_id, chapter, node_id, prologue_done, is_dead, ending_branch, checkpoint) VALUES (1, '序章', '序章-1', '否', '否', '', '序章-1');",
    deleteNode: '禁止。',
    updateNode:
      "每轮剧情推进或用户抉择后更新。BE 时 is_dead=是 并写 ending_branch。\nSQL示例: UPDATE plot_state SET node_id = '序章-2', checkpoint = '序章-2' WHERE row_id = 1;\nSQL示例(BE): UPDATE plot_state SET is_dead = '是', ending_branch = '新的征程', node_id = '序章-1' WHERE row_id = 1;",
    insertNode: '禁止。',
    ddl: "CREATE TABLE plot_state ( -- 剧情状态表\n  row_id INTEGER PRIMARY KEY CHECK(row_id = 1), -- 行号\n  chapter TEXT NOT NULL, -- 当前章节\n  node_id TEXT NOT NULL, -- 当前节点\n  prologue_done TEXT NOT NULL CHECK(prologue_done IN ('是', '否')), -- 序章完成\n  is_dead TEXT NOT NULL CHECK(is_dead IN ('是', '否')), -- 已死亡\n  ending_branch TEXT, -- 结局分支\n  checkpoint TEXT NOT NULL -- 检查点\n);",
  },
  content: [['row_id', '当前章节', '当前节点', '序章完成', '已死亡', '结局分支', '检查点']],
  updateConfig: { uiSentinel: -1, contextDepth: -1, updateFrequency: 1, batchSize: -1, skipFloors: -1, groupId: 2 },
  exportConfig: {
    enabled: false,
    splitByRow: false,
    entryName: '剧情状态表',
    entryType: 'constant',
    keywords: '',
    preventRecursion: true,
    injectionTemplate: '',
    extraIndexEnabled: false,
    entryPlacement: { position: 'at_depth_as_system', depth: 2, order: 10020 },
  },
  orderNo: 20,
};

const sheetCharacterAttr = {
  uid: 'sheet_character_attr',
  name: '角色属性表',
  sourceData: {
    note: '分阶段人设用表。每行一角色。情感值=态度（-10~+10）；信任度=交底门闩（0~50，方敏≥35可交底）。与 MVU 对user.* 每轮同步。\n\n【列定义】\n列1=row_id\n列2=角色名 char_name（唯一）\n列3=情感值 emotion（-10~10）\n列4=信任度 trust（0~50）\n列5=关系阶段 relation_phase（序章怀疑|序章至三章|第四章互信|美丽世界线|丧钟线）\n\n【条件模板】世界书用 cell:角色属性表/方敏/情感值 等，须 SP·数据库 勾选「启用条件模板」。',
    initNode:
      "游戏初始化时插入序章相关角色。\nSQL示例: INSERT INTO character_attr (row_id, char_name, emotion, trust, relation_phase) VALUES (1, '方敏', 0, 35, '序章怀疑'), (2, '庄晓曼', 0, 20, '序章至三章'), (3, '武藤纯子', 0, 15, '序章至三章'), (4, '陆望舒', 0, 40, '序章至三章');",
    deleteNode: '禁止删除已登场核心角色行。',
    updateNode:
      "情感/信任/阶段变化时更新对应行。须与 MVU JSONPatch 同轮一致。\nSQL示例: UPDATE character_attr SET emotion = emotion + 1, trust = trust + 2 WHERE char_name = '方敏';\nSQL示例: UPDATE character_attr SET relation_phase = '第四章互信' WHERE char_name = '方敏';",
    insertNode:
      "新重要感情线/NPC 登场且需分阶段人设时添加。\nSQL示例: INSERT INTO character_attr (row_id, char_name, emotion, trust, relation_phase) VALUES ((SELECT COALESCE(MAX(row_id), 0) + 1 FROM character_attr), '武藤志雄', 0, 10, '序章至三章');",
    ddl: "CREATE TABLE character_attr ( -- 角色属性表\n  row_id INTEGER PRIMARY KEY, -- 行号\n  char_name TEXT NOT NULL UNIQUE, -- 角色名\n  emotion INTEGER NOT NULL DEFAULT 0 CHECK(emotion BETWEEN -100 AND 100), -- 情感值\n  trust INTEGER NOT NULL DEFAULT 35 CHECK(trust BETWEEN 0 AND 100), -- 信任度\n  relation_phase TEXT NOT NULL CHECK(relation_phase IN ('序章怀疑', '序章至三章', '第四章互信', '美丽世界线', '丧钟线')) -- 关系阶段\n);",
  },
  content: [['row_id', '角色名', '情感值', '信任度', '关系阶段']],
  updateConfig: { uiSentinel: -1, contextDepth: -1, updateFrequency: 1, batchSize: -1, skipFloors: -1, groupId: 2 },
  exportConfig: {
    enabled: false,
    splitByRow: false,
    entryName: '角色属性表',
    entryType: 'constant',
    keywords: '',
    preventRecursion: true,
    injectionTemplate: '',
    extraIndexEnabled: false,
    entryPlacement: { position: 'at_depth_as_system', depth: 2, order: 10021 },
  },
  orderNo: 21,
};

const sheetXiaotu = {
  uid: 'sheet_xiaotu_cover',
  name: '肖途潜伏表',
  sourceData: {
    note: '肖途单行状态，与 MVU 肖途/敌方 同步。暴露风险为派生文案：低/中/高/极高。\n\n【列】row_id=1；伪装完整度；组织信任度；武藤怀疑度；暴露风险；允许行动级别(1-4)',
    initNode:
      "INSERT INTO xiaotu_cover (row_id, disguise, org_trust, wuteng_doubt, exposure_risk, action_level) VALUES (1, 72, 70, 3, '低', 1);",
    deleteNode: '禁止。',
    updateNode:
      "数值变化时更新。序章禁止提高武藤怀疑度。\nSQL示例: UPDATE xiaotu_cover SET disguise = 68, exposure_risk = '中' WHERE row_id = 1;",
    insertNode: '禁止。',
    ddl: "CREATE TABLE xiaotu_cover ( -- 肖途潜伏表\n  row_id INTEGER PRIMARY KEY CHECK(row_id = 1), -- 行号\n  disguise INTEGER NOT NULL CHECK(disguise BETWEEN 0 AND 100), -- 伪装完整度\n  org_trust INTEGER NOT NULL CHECK(org_trust BETWEEN 0 AND 100), -- 组织信任度\n  wuteng_doubt INTEGER NOT NULL CHECK(wuteng_doubt BETWEEN 0 AND 100), -- 武藤怀疑度\n  exposure_risk TEXT NOT NULL CHECK(exposure_risk IN ('低', '中', '高', '极高')), -- 暴露风险\n  action_level INTEGER NOT NULL CHECK(action_level BETWEEN 1 AND 4) -- 允许行动级别\n);",
  },
  content: [['row_id', '伪装完整度', '组织信任度', '武藤怀疑度', '暴露风险', '允许行动级别']],
  updateConfig: { uiSentinel: -1, contextDepth: -1, updateFrequency: 1, batchSize: -1, skipFloors: -1, groupId: 2 },
  exportConfig: {
    enabled: false,
    splitByRow: false,
    entryName: '肖途潜伏表',
    entryType: 'constant',
    keywords: '',
    preventRecursion: true,
    injectionTemplate: '',
    extraIndexEnabled: false,
    entryPlacement: { position: 'at_depth_as_system', depth: 2, order: 10022 },
  },
  orderNo: 22,
};

base.sheet_plot_state = sheetPlotState;
base.sheet_character_attr = sheetCharacterAttr;
base.sheet_xiaotu_cover = sheetXiaotu;

/** 隐形守护者：停用检定建议表作主线选项（见世界书《抉择唯一来源铁律》） */
if (base.sheet_check_suggestions?.sourceData) {
  base.sheet_check_suggestions.sourceData.note =
    '【已停用 · 隐形守护者】\n' +
    '本表不得作为主线选项菜单。玩家选项唯一来源：assistant 叙事末 <branches>（见《抉择唯一来源铁律》）+ 玩家发送 A./B./C. 原文；BE 后删楼重发选项原文。\n' +
    '每轮 <tableEdit> 与 init 均禁止写入 check_suggestions。\n' +
    '骰子仅当正文明确要求属性检定时使用 DSL；勿生成 1~5 编号平行建议，勿在 display_text 写结局名/BE/推荐。\n' +
    '表结构保留仅供插件兼容，行内容可为空或历史残留，模型须忽略。';
  base.sheet_check_suggestions.sourceData.initNode =
    '禁止。不得对 check_suggestions 执行 INSERT。开局亦勿写入。';
  base.sheet_check_suggestions.sourceData.updateNode =
    '禁止。每轮 <tableEdit> 不得包含 check_suggestions 的任何 SQL。';
  base.sheet_check_suggestions.sourceData.insertNode = '禁止。';
  base.sheet_check_suggestions.sourceData.deleteNode = '禁止。';
  if (base.sheet_check_suggestions.updateConfig) {
    base.sheet_check_suggestions.updateConfig.updateFrequency = -1;
  }
}

// 序章默认地点：方家
if (base.sheet_global_data?.sourceData?.initNode) {
  base.sheet_global_data.sourceData.initNode =
    "插入唯一的一行，1939年上海序章。\nSQL示例: INSERT INTO global_state (row_id, current_location, current_minor_region, current_major_region, prev_scene_time, elapsed_time, cur_time) VALUES (1, '方家客厅', '法租界', '上海', NULL, '0分', '1939-03-15 14:00');";
}

fs.writeFileSync(outPath, JSON.stringify(base, null, 2), 'utf8');
console.log('Wrote', outPath);
