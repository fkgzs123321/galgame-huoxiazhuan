/**
 * NPC 绿灯档案（运作规则 + MVU + 矩阵）· 唯一文案源
 * 性格七维见同包 Persona（灰灯）；本表勿重复心理描写。
 */
import { PERSONA_CATALOG } from './persona-catalog.mjs';

/** @typedef {{ keywords: string[], chapters: string[]|null, matrix: string, mvu: string, rules: string, abstract: string }} NpcSpec */

/** @type {Record<string, NpcSpec>} */
export const NPC_CATALOG = {
  方敏: {
    abstract: '第三号；序章信任门闩',
    keywords: ['方敏', '敏敏'],
    chapters: null,
    matrix: 'D1=4 D2=5 D3=6 D7=7（见《角色能力矩阵》）',
    mvu: '对user.方敏.情感值 / 对user.方敏.信任度',
    rules: `序章-2：**信任度<35（0~50）不得交底**；正确项「都已经过去了」=纪律优先。
第一章-7/8/9：过早交底或收钱不当 → 各类 BE（写死表）。
SQL character_attr 与 MVU 同步；分阶段见 EJS getwi「方敏-调色盘」。`,
  },
  方汉洲: {
    abstract: '恩师春风；苦肉计与假死',
    keywords: ['方汉洲', '春风', '老师', '方老师'],
    chapters: null,
    matrix: 'D1=7 D2=8 D8=6（见《角色能力矩阵》）',
    mvu: '无独立条；组织线经 肖途.组织信任度',
    rules: `序章当众指认肖途为汉奸 = **组织洗白苦肉计**；禁止写其真信肖途是汉奸（非 BE）。
序章-5 图书馆接头；第一章-10 假死枪指：**肖途不得事先知情**。
调色盘：EJS getwi「方汉洲-调色盘·序章」。`,
  },
  武藤志雄: {
    abstract: '领事公馆；怀疑度核心',
    keywords: ['武藤志雄', '武藤', '领事', '公馆'],
    chapters: null,
    matrix: 'D1=8 D2=9 D7=9 D8=9',
    mvu: '敌方.武藤志雄怀疑度 — 升高→审讯/处决类 BE',
    rules: `第一章：记者会/领事质问须 **灰色回答**；公开反日、一次洗白 → 怀疑飙升。
肖途 D1 有效值 **低于** 武藤；不可骗过所有试探。`,
  },
  武藤纯子: {
    abstract: '扶桑线；情感非战斗',
    keywords: ['武藤纯子', '纯子'],
    chapters: null,
    matrix: 'D4/D5=1；D8=7（借父资源）',
    mvu: '对user.武藤纯子.情感值 / 对user.武藤纯子.信任度',
    rules: `第一章-5~6 陪伴与问话；不知肖途身份。
禁止战斗高光；情感/信任驱动扶桑线。`,
  },
  冯一贤: {
    abstract: '公馆干事；心理恐怖',
    keywords: ['冯一贤', '一贤'],
    chapters: ['第一章', '第二章', '第三章', '第四章', '第五章', '第六章扶桑', '第六章至暗'],
    matrix: 'D7=10',
    mvu: '无专属；影响公馆资历/怀疑间接',
    rules: `拉拢肖途干脏活；禁止喜剧化。
肖途不可正面对抗赢（心理战）。`,
  },
  蒋旭之: {
    abstract: '通讯社社长；掩护雇主',
    keywords: ['蒋旭之', '通讯社', '社长'],
    chapters: ['第一章', '第二章', '第三章', '第四章'],
    matrix: '社交高、武力低（矩阵未单列）',
    mvu: '无',
    rules: `肖途公开老板；不宜全知地下网。
第一章起可出场。`,
  },
  董旺成: {
    abstract: '地下党第二号',
    keywords: ['董旺成', '第二号', '化肥厂', '大成化肥'],
    chapters: ['第二章', '第三章', '第四章', '第五章', '第六章至暗', '第七章大风', '第八章规则', '第九章', '第十章'],
    matrix: 'D2=9 D8=10',
    mvu: '无；组织任务经 组织.当前任务',
    rules: `肖途不可越级调资源；短会指示，不替肖途现场抉择。`,
  },
  赵忠义: {
    abstract: '汪伪基层；可叛节点',
    keywords: ['赵忠义', '忠义'],
    chapters: ['第二章', '第三章', '第四章'],
    matrix: 'D6 低于肖途',
    mvu: '无',
    rules: `第二章狩猎者线；懦弱贪生，按写死表判叛。`,
  },
  李峰: {
    abstract: '特务科长；庄晓曼名义上级',
    keywords: ['李峰', '特务科', '科长'],
    chapters: ['第二章', '第三章', '第四章', '第五章'],
    matrix: '组织资源中高',
    mvu: '无',
    rules: `胡一彪、顾君如上级；与庄晓曼公开身份一致。`,
  },
  庄晓曼: {
    abstract: '汪伪情报员/军统卧底',
    keywords: ['庄晓曼', '晓曼', '夜总会', '舞女', '大上海'],
    chapters: ['第二章', '第三章', '第四章', '第五章', '第六章扶桑', '第六章至暗', '第七章丛林', '第七章大风', '第八章美丽', '第八章规则', '第九章', '第十章', '终章'],
    matrix: 'D1=9 D6=8 D7=8',
    mvu: '对user.庄晓曼.情感值(-10~10) / 互信度(0~50) — 互信<33或情感<3不协同；第三章主路情感≥7+自保',
    rules: `肖途不可近身/枪战赢她；第三章门槛看情感/互信。
EJS getwi「庄晓曼-调色盘」。`,
  },
  高源: {
    abstract: '表面上线；军统银狐',
    keywords: ['高源', '上线', '银狐'],
    chapters: ['第二章', '第三章', '第四章', '第五章', '第六章至暗', '第七章大风', '第八章美丽', '第八章规则', '第九章', '第十章'],
    matrix: 'D2=8 D7=8',
    mvu: '无独立条（美丽世界线收束）',
    rules: `禁止早期剧透双面身份；肖途不可一眼识破。`,
  },
  孙正清: {
    abstract: '古城；背叛线',
    keywords: ['孙正清', '古城', '图书馆'],
    chapters: ['序章', '第三章', '第四章', '第六章至暗', '第七章大风', '第十章'],
    matrix: '情报组织中等偏上',
    mvu: '无',
    rules: `至暗线背叛相关；非背叛线保持可信长者。`,
  },
  胡一彪: {
    abstract: '汪伪行动队长',
    keywords: ['胡一彪', '一彪'],
    chapters: ['第三章', '第四章', '第五章', '第六章至暗', '第七章大风', '第八章规则', '第十章'],
    matrix: 'D4=7 D5=8（远高于肖途）',
    mvu: '无',
    rules: `第三章绑架方敏；肖途 **不可徒手击败**。`,
  },
  顾君如: {
    abstract: '汪伪情报员；道德困境',
    keywords: ['顾君如', '君如'],
    chapters: ['第三章', '第四章', '第五章'],
    matrix: '全维中等',
    mvu: '无',
    rules: `第三章营救/杀抉择；禁止猎奇；按写死表。`,
  },
  陆望舒: {
    abstract: '红色芳华；记者妻子',
    keywords: ['陆望舒', '望舒'],
    chapters: ['第四章', '第五章', '第六章扶桑', '第七章丛林', '第八章美丽', '第九章', '第十章', '终章'],
    matrix: 'D2=7 D7=7',
    mvu: '对user.陆望舒.情感值 / 对user.陆望舒.信任度',
    rules: `序章~第三章不宜深度出场除非剧情需要。`,
  },
  徐先生: {
    abstract: '兴荣帮帮主',
    keywords: ['徐先生', '兴荣帮', '帮主'],
    chapters: ['第四章', '第五章', '第六章至暗', '第七章大风', '第八章美丽', '第九章', '第十章'],
    matrix: 'D7=8 D8=8',
    mvu: '无',
    rules: `丧钟/美丽线接应；肖途不可无铺垫号令全帮。`,
  },
  楚娘: {
    abstract: '楚记棺材铺；联络点',
    keywords: ['楚娘', '楚记', '棺材铺'],
    chapters: ['第四章', '第五章', '第六章至暗', '第七章大风', '第八章美丽'],
    matrix: '社交情报中等',
    mvu: '无',
    rules: `兴荣帮系统；办丧藏人；禁止超自然。`,
  },
  丁力犀: {
    abstract: '兴荣帮打手',
    keywords: ['丁力犀', '力犀'],
    chapters: ['第四章', '第五章', '第七章大风', '第八章美丽'],
    matrix: 'D4/D5 高于肖途',
    mvu: '无',
    rules: `听徐先生调遣；肖途不可轻松击败。`,
  },
  黄老板: {
    abstract: '澳门地方势力',
    keywords: ['黄老板', '澳门', '龙老板'],
    chapters: ['第四章', '第五章', '第六章扶桑'],
    matrix: '地方资源型',
    mvu: '无',
    rules: `1939 后澳门商贸线；序章不出现。`,
  },
  浅野博文: {
    abstract: '特高课；第五章分叉',
    keywords: ['浅野', '浅野博文', '特高课'],
    chapters: ['第五章', '第六章扶桑', '第七章丛林', '第八章美丽', '第九章', '第十章'],
    matrix: 'D7=9 D4=7',
    mvu: '无',
    rules: `刺杀浅野→扶桑线锁；与武藤内斗；无铺垫不可刺杀成功。`,
  },
  郑西海: {
    abstract: '军统副局长；美丽线义父',
    keywords: ['郑西海', '郑局长', '军统'],
    chapters: ['第五章', '第六章至暗', '第七章大风', '第八章美丽', '第八章规则', '第九章', '第十章'],
    matrix: 'D8=9',
    mvu: '无',
    rules: `肖途不可对抗军统系统无后果；美丽世界「义父」。`,
  },
};

/** 与 Persona 章节对齐：catalog 未写 chapters 时沿用 Persona */
for (const [name, spec] of Object.entries(NPC_CATALOG)) {
  if (spec.chapters === undefined && PERSONA_CATALOG[name]) {
    spec.chapters = PERSONA_CATALOG[name].chapters ?? null;
  }
  if (!spec.keywords?.length && PERSONA_CATALOG[name]) {
    spec.keywords = PERSONA_CATALOG[name].keywords;
  }
}
