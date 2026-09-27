/**
 * 同级生2 攻略数据资产 · 角色攻略(基于全网攻略整理)
 *
 * 来源:3dmgame《同级生2攻略》、喵喵的家完整流程表、百度文库八位女主角全流程、2dfan remake 攻略
 * 说明:游戏内 17 天 = 12/22 ~ 1/7(dayCount 1-17);好感度 14/15 可告白;数据为独立端玩法参考
 */

/** 游戏内天映射:dayCount → 真实日期 */
export const DAY_TO_DATE: Record<number, string> = {
  1: '12/22', 2: '12/23', 3: '12/24', 4: '12/25', 5: '12/26', 6: '12/27',
  7: '12/28', 8: '12/29', 9: '12/30', 10: '12/31', 11: '1/1', 12: '1/2',
  13: '1/3', 14: '1/4', 15: '1/5', 16: '1/6', 17: '1/7',
};

export interface GuideEvent {
  /** 游戏内天(1-17) */
  day: number;
  /** 时段(如 'AM9:00'/'PM2:00-5:00') */
  time: string;
  /** 地点 */
  location: string;
  /** 事件 */
  event: string;
  /** 好感度变化(可选) */
  favor?: number;
}

export interface HeroineGuide {
  id: number;
  name: string;
  /** 可追求 */
  pursuable: boolean;
  /** 登场条件 */
  appearCondition: string;
  /** 攻略要点 */
  keyPoints: string[];
  /** 关键事件 */
  events: GuideEvent[];
  /** 告白条件 */
  confessionCondition: string;
  /** 冲突关系 */
  conflicts: string[];
}

export const HEROINE_GUIDES: HeroineGuide[] = [
  {
    id: 1, name: '鸣泽唯', pursuable: true,
    appearCondition: '开局可见(与主角同居的义妹)',
    keyPoints: [
      '12/24 PM8:00 客厅为睡着的唯披上外套(重要开端)',
      '12/29 与西御寺冲突后回客厅洗脸,浴室撞见唯',
      '1/1 AM8:00 答应和唯一起去神宫参拜(感情升温)',
      '偷听西御寺与芳树密谈且未触发梢江事件 → 1/3 后 PM5:05 接梢江电话,如月町车站饭店误会→自宅→88公园救唯(1/5 前必须摆平)',
    ],
    events: [
      { day: 1, time: 'AM10:15', location: '旅行代理店', event: '西御寺与唯同行("西御寺温柔多了")' },
      { day: 1, time: 'AM11:40', location: '保育园', event: '唯("又在找女孩子了?"日记本)' },
      { day: 1, time: 'PM4:00', location: '旅行代理店', event: '西御寺("你赶快滚出这个家")' },
      { day: 1, time: 'PM4:25', location: '自宅', event: '唯("刚才……")' },
      { day: 3, time: 'PM5:00', location: '西御寺的家', event: '按门铃' },
      { day: 3, time: 'PM8:00', location: '客厅', event: '帮睡着的唯披上外套(好感起点)' },
      { day: 4, time: 'AM8:00', location: '客厅', event: '唯谢谢主角帮她披衣服' },
      { day: 4, time: 'AM8:00', location: '自宅', event: '唯在舞会中途离去' },
      { day: 8, time: 'PM5:05', location: '自宅房间', event: '接梢江电话→如月町车站饭店误会事件(需未H过梢江)' },
      { day: 11, time: 'AM8:00', location: '客厅', event: '答应与唯去神宫参拜(重要)' },
      { day: 15, time: 'PM11:00', location: '88公园', event: '救出被变态袭击的唯(1/5 前必须)' },
    ],
    confessionCondition: '好感度≥14;会自行告白(不受洋子强制告白影响)',
    conflicts: ['与美佐子部分冲突(可同时告白不可同时H)', '与梢江部分冲突(可同时告白不可同时H)'],
  },
  {
    id: 2, name: '鸣泽美佐子', pursuable: true,
    appearCondition: '开局可见(鸣泽家养母,咖啡店《憩》店主)',
    keyPoints: [
      '每天 PM2:00 咖啡店目睹"青蛙叔叔"调戏美佐子(连续多日)',
      '12/27 PM2:00 咖啡店痛打青蛙叔叔(好感+13)',
      '12/28 PM2:00 选"因为你用身体保护我"(好感+14)',
      '1/1 深夜浴室美佐子帮主角洗背(自动事件)',
      '1/6 AM2:00 客厅选"我好喜欢美佐子"(好感+15)→ 1/7 告白',
    ],
    events: [
      { day: 2, time: 'PM2:00', location: '咖啡店', event: '目睹青蛙叔叔调戏美佐子', favor: 12 },
      { day: 3, time: 'PM2:00', location: '咖啡店', event: '再次目睹骚扰' },
      { day: 3, time: 'PM11:00', location: '客厅', event: '发现美佐子身上有酒味' },
      { day: 4, time: 'PM2:00', location: '咖啡店', event: '目睹骚扰' },
      { day: 5, time: 'AM0:00', location: '客厅', event: '看到美佐子醉酒' },
      { day: 5, time: 'PM2:00', location: '咖啡店', event: '目睹骚扰' },
      { day: 6, time: 'PM2:00', location: '咖啡店', event: '痛打青蛙叔叔', favor: 13 },
      { day: 7, time: 'AM1:00', location: '客厅', event: '美佐子再次醉酒' },
      { day: 7, time: 'PM2:00', location: '咖啡店', event: '选"因为你用身体保护我"', favor: 14 },
      { day: 11, time: '深夜', location: '浴室', event: '美佐子帮主角洗背(自动事件)' },
      { day: 14, time: 'AM7:00', location: '自宅', event: '美佐子吞吞吐吐好像有话要说' },
      { day: 16, time: 'AM2:00', location: '客厅', event: '选"我好喜欢美佐子"', favor: 15 },
    ],
    confessionCondition: '好感度≥15,1/7 告白',
    conflicts: ['与唯部分冲突(可同时告白不可同时H)', '与樱子/美沙/梢江部分冲突'],
  },
  {
    id: 3, name: '舞岛可怜', pursuable: true,
    appearCondition: '开局可见(人气偶像歌手,工作繁忙少到学校)',
    keyPoints: [
      '每天在可怜家/才艺中心/电视台多地见面(首次见面别选"想要签名")',
      '12/24 PM4:00 电视台录制;12/25 PM1:00 保健室事件(明星效应链)',
      '12/27 PM12:00 电视台公开录影;PM4:30 才艺中心可怜道歉',
      '12/31~1/3 夏威夷出差(期间不可遇)',
    ],
    events: [
      { day: 1, time: 'PM12:50', location: '可怜的家', event: '第一次见面(别选"想要签名")' },
      { day: 3, time: 'PM4:00', location: '电视台', event: '录制事件(明星效应链)' },
      { day: 4, time: 'PM1:00', location: '保健室', event: '保健室事件' },
      { day: 5, time: 'PM2:00', location: '教室', event: '为可怜披上衣服' },
      { day: 5, time: 'PM7:00', location: '客厅', event: '带可怜到自己房间' },
      { day: 6, time: 'AM10:00', location: '可怜的家', event: '可怜开始在意主角' },
      { day: 6, time: 'PM12:00', location: '电视台', event: '公开录影' },
      { day: 6, time: 'PM4:30', location: '才艺中心', event: '可怜向主角道歉' },
      { day: 6, time: 'PM10:00', location: '可怜的家', event: '道晚安' },
      { day: 7, time: 'AM8:00', location: '可怜的家', event: '可怜更在意主角' },
      { day: 7, time: 'AM10:00', location: '白蛇池公园', event: '可怜参加新年录影' },
      { day: 7, time: 'PM12:00', location: '电视台', event: '可怜想要一次真正的约会' },
      { day: 8, time: 'PM1:00', location: '88海岸', event: '可怜被骗(需帮助)' },
      { day: 10, time: '全天', location: '夏威夷', event: '出差开始(12/31~1/3 不可遇)' },
      { day: 13, time: '下午', location: '八十八町', event: '出差归来可遇' },
    ],
    confessionCondition: '好感度≥14;1/7 告白',
    conflicts: ['与美铃冲突(R版不可同时)', '与洋子部分冲突(可同时H不可同时告白)'],
  },
  {
    id: 4, name: '加藤美纪', pursuable: true,
    appearCondition: '开局可见(戴厚重眼镜少言的女孩子)',
    keyPoints: [
      '12/22 AM10:10 88学园遇到美纪;弓箭练习场看美纪对着花;3-B教室拿花瓶碎片',
      '12/25 AM7:00 88学园遇到美纪;便利店芳树知道秘密',
    ],
    events: [
      { day: 1, time: 'AM10:10', location: '88学园', event: '遇到美纪(讨厌不三不四的人)' },
      { day: 1, time: 'AM10:30', location: '弓箭练习场', event: '看到美纪对着花' },
      { day: 1, time: 'AM11:30', location: '3-B教室', event: '拿起花瓶碎片(CG)' },
      { day: 4, time: 'AM7:00', location: '88学园', event: '遇到美纪' },
      { day: 4, time: 'AM9:30', location: '便利商店', event: '芳树知道了什么秘密' },
    ],
    confessionCondition: '好感度≥14',
    conflicts: ['与洋子部分冲突', '与可怜部分冲突', '与美沙部分冲突'],
  },
  {
    id: 5, name: '筱原泉美', pursuable: true,
    appearCondition: '开局可见(射箭部社长,筱原重工千金)',
    keyPoints: [
      '温泉之旅预兆(1/9 前后),温泉乡相关剧情',
      '会自行告白(不受洋子强制告白影响)',
    ],
    events: [
      { day: 9, time: '白天', location: '温泉乡', event: '温泉之旅预兆,泉美线开启' },
    ],
    confessionCondition: '好感度≥14;会自行告白',
    conflicts: ['与美里、佐知子冲突'],
  },
  {
    id: 6, name: '南川洋子', pursuable: true,
    appearCondition: '开局可见(机车女孩)',
    keyPoints: [
      '12/22 PM1:05 强制参与其机车事件(必须准时)',
      '好感度需控制在临界值 14 以下避免强制告白',
      '告白对象包括洋子时,最终告白会被强迫接受她',
    ],
    events: [
      { day: 1, time: 'PM1:05', location: '88车站附近', event: '强制机车事件' },
      { day: 1, time: 'PM10:40', location: '体育馆后面', event: '遇到洋子' },
      { day: 1, time: 'PM1:35', location: '洋子的家', event: '拜访洋子家' },
      { day: 1, time: 'PM2:05', location: '88公园', event: '遇到洋子' },
    ],
    confessionCondition: '好感度≥14(会强制告白,干扰其他角色)',
    conflicts: ['与可怜/美纪/樱子/美沙/爱美/美铃/美佐子部分冲突(可同时H不可同时告白)'],
  },
  {
    id: 7, name: '都筑梢江', pursuable: true,
    appearCondition: '开局可见(图书室常客)',
    keyPoints: [
      '12/22 AM9:00 图书室邀请梢江;12/25 AM10:00 网球场打网球',
      '12/27 PM1:00 ATARU(爱和梦的旅行)→电影院→旅馆(神社高台)',
      '12/29 起梢江绕圈跑(可怜家←信良家←西御寺家循环)',
      'H 过后事件在几个地点间绕圈顺序发生',
    ],
    events: [
      { day: 1, time: 'AM9:00', location: '图书室', event: '邀请梢江(扶她起来)' },
      { day: 4, time: 'AM10:00', location: '网球场', event: '一起打网球' },
      { day: 4, time: 'AM10:00', location: '电动中心', event: '梢江伤口好多了' },
      { day: 6, time: 'PM1:00', location: 'ATARU', event: '爱和梦的旅行' },
      { day: 6, time: 'PM1:00', location: '电影院', event: '梢江("还不回去..我不饿..好")' },
      { day: 6, time: 'PM1:00', location: '旅馆', event: '神社的高台' },
      { day: 8, time: 'AM9:00', location: '公寓', event: '梢江跑掉了(开始绕圈)' },
      { day: 10, time: 'AM9:00', location: '可怜家/信良家/西御寺家', event: '绕圈循环找人' },
    ],
    confessionCondition: '好感度≥14;1/7 保健室告白',
    conflicts: ['与唯部分冲突(可同时告白不可同时H)', '与美沙、樱子部分冲突'],
  },
  {
    id: 8, name: '水野友美', pursuable: true,
    appearCondition: '开局可见(图书馆读书会)',
    keyPoints: [
      '12/23 AM8:15 图书馆读书会 + 12/24 PM5:15 车站等待事件(连锁反应)',
      '会自行告白(不受洋子强制告白影响)',
    ],
    events: [
      { day: 1, time: 'AM9:55', location: '友美的家', event: '拜访友美,邀请' },
      { day: 1, time: 'PM4:05', location: '市民医院', event: '遇到友美(探病)' },
      { day: 2, time: 'AM8:15', location: '图书馆', event: '读书会事件' },
      { day: 3, time: 'PM5:15', location: '88车站', event: '友美在车站等待' },
      { day: 4, time: 'AM8:00', location: '自宅', event: '友美在舞会中途离去' },
    ],
    confessionCondition: '好感度≥14;会自行告白',
    conflicts: ['与泉美部分冲突(可同时告白不可同时H)'],
  },
  {
    id: 9, name: '安田爱美', pursuable: true,
    appearCondition: '需触发:12/22 AM9:30 后在保育园看到天道偷窥爱美',
    keyPoints: [
      '12/23 PM11:00 保育园救下被卡车撞的小孩庆子(好感+8)→ 与爱美喝茶',
      '圣诞夜扮演圣诞老人给庆子送礼(ATARU 自动买天狗录影带 + 88学园演剧部仓库借服装)',
      '12/28 PM5:00 后爱美在自宅前等 → 88公园谈话(好感+10)',
      '12/29-30 白天必须去保育园与天道谈话(否则爱美成为天道女友)',
      '谈话次日 PM6:00 后爱美在自宅前等 → 一起去保育园',
    ],
    events: [
      { day: 1, time: 'AM11:00', location: '保育园', event: '看见天道偷窥爱美(登场条件)' },
      { day: 2, time: 'PM12:00', location: '保育园', event: '救起园儿庆子(好感+8)→ 咖啡店喝茶' },
      { day: 3, time: '夜晚', location: '保育园', event: '扮演圣诞老人送礼物(需录影带+服装)' },
      { day: 5, time: '白天', location: '保育园', event: '目睹天道告白;自家前骗过天道' },
      { day: 7, time: 'PM5:00后', location: '自宅前', event: '与爱美去88公园闲谈(好感+10)' },
      { day: 8, time: '白天', location: '保育园', event: '与天道谈话(必须,否则爱美被追走)' },
      { day: 9, time: 'PM6:00后', location: '自宅前', event: '与爱美去保育园(12/30 好感+12)' },
      { day: 10, time: 'PM6:00后', location: '自宅前', event: '爱美等待(12/31 好感+14)' },
    ],
    confessionCondition: '好感度≥14;1/7 告白',
    conflicts: ['与洋子部分冲突'],
  },
  {
    id: 10, name: '田中美沙', pursuable: true,
    appearCondition: '需触发:12/25 AM9:00 88车站撞到她(两次)',
    keyPoints: [
      '12/25 AM9:00 88车站撞到美沙(第一次);12/26 PM2:00 再撞(第二次,约网球赛)',
      '12/29 AM8:50 网球场比赛(输赢都定下 12/30 游乐园约会)',
      '12/30 AM9:00 游乐园约会后到 12/31 早被定死(无法做别的事)',
      '1/6 PM5:00 后回客厅收到美沙来信;1/7 AM9:00 美沙反告白',
    ],
    events: [
      { day: 4, time: 'AM9:00', location: '88车站', event: '撞到美沙(第一次)' },
      { day: 5, time: 'PM2:00', location: '88车站', event: '撞到美沙(第二次,约网球赛)' },
      { day: 8, time: 'AM8:50', location: '网球场', event: '比赛网球(定下 12/30 游乐园约会)' },
      { day: 9, time: 'AM9:00', location: '游乐园', event: '约会(之后到 12/31 早被定死)' },
      { day: 16, time: 'PM5:00后', location: '客厅', event: '收到美沙寄来的信' },
      { day: 17, time: 'AM9:00', location: '自家', event: '美沙反告白' },
    ],
    confessionCondition: '好感度≥14;1/7 美沙反告白',
    conflicts: ['与洋子、梢江、美纪部分冲突'],
  },
  {
    id: 11, name: '片桐美铃', pursuable: true,
    appearCondition: '开局可见(88学园美术老师,学合气道)',
    keyPoints: [
      '12/22 AM11:00 1F教职员室遇到美铃;PM6:20 ATARU;PM8:55 公寓',
    ],
    events: [
      { day: 1, time: 'AM11:00', location: '1F教职员室', event: '遇到美铃' },
      { day: 1, time: 'PM6:20', location: 'ATARU', event: '遇到美铃' },
      { day: 1, time: 'PM8:55', location: '公寓', event: '遇到美铃' },
      { day: 1, time: 'PM9:10', location: '旅行社', event: '遇到美铃' },
    ],
    confessionCondition: '好感度≥14',
    conflicts: ['与可怜冲突(R版不可同时)', '与洋子部分冲突'],
  },
  {
    id: 12, name: '野野村美里', pursuable: true,
    appearCondition: '开局可见',
    keyPoints: [],
    events: [],
    confessionCondition: '好感度≥14',
    conflicts: ['与泉美、佐知子冲突'],
  },
  {
    id: 13, name: '永岛久美子', pursuable: true,
    appearCondition: '需触发:1/1(day11)元日,主角在自宅收留久美子',
    keyPoints: [
      '1/1 元日自宅收留久美子(线开启)',
      '1/3 佐知子来接久美子(佐知子线开启)',
      '1/5 久美子线高潮,攻略完成(达亲密阶段)',
    ],
    events: [
      { day: 11, time: '元日', location: '自宅', event: '收留久美子(线开启)' },
      { day: 15, time: '白天', location: '自宅', event: '久美子线高潮,攻略完成' },
    ],
    confessionCondition: '好感度≥50 达亲密;1/7 告白',
    conflicts: ['与佐知子部分冲突(可同时告白不可同时H)', '与洋子部分冲突'],
  },
  {
    id: 14, name: '永岛佐知子', pursuable: true,
    appearCondition: '需触发:1/3(day13)来接久美子时登场',
    keyPoints: [
      '1/3 佐知子来接久美子,佐知子线开启',
    ],
    events: [
      { day: 13, time: '白天', location: '自宅', event: '佐知子来接久美子(线开启)' },
    ],
    confessionCondition: '好感度≥14',
    conflicts: ['与久美子部分冲突(可同时告白不可同时H)', '与泉美、美里冲突'],
  },
  {
    id: 15, name: '齐藤澪', pursuable: true,
    appearCondition: '开局可见(齐藤双胞胎之一)',
    keyPoints: ['与澪奈是双胞胎姐妹,行动高度同步'],
    events: [],
    confessionCondition: '好感度≥14',
    conflicts: [],
  },
  {
    id: 16, name: '齐藤澪奈', pursuable: true,
    appearCondition: '开局可见(齐藤双胞胎之一)',
    keyPoints: ['与澪是双胞胎姐妹,行动高度同步'],
    events: [],
    confessionCondition: '好感度≥14',
    conflicts: [],
  },
  {
    id: 17, name: '铃木美穗', pursuable: true,
    appearCondition: '开局可见',
    keyPoints: [],
    events: [],
    confessionCondition: '好感度≥14',
    conflicts: [],
  },
  {
    id: 18, name: '仁科', pursuable: true,
    appearCondition: '开局可见',
    keyPoints: [],
    events: [],
    confessionCondition: '好感度≥14',
    conflicts: [],
  },
  {
    id: 19, name: '正树夏子', pursuable: true,
    appearCondition: '开局可见',
    keyPoints: [],
    events: [],
    confessionCondition: '好感度≥14',
    conflicts: [],
  },
  {
    id: 20, name: '杉本樱子', pursuable: true,
    appearCondition: '需触发:12/22 起每天 PM2:00-5:00 市民医院爬树与樱子对话',
    keyPoints: [
      '每日(12/22-29)PM2:00-5:00 市民医院爬树对话(好感逐日递增至+14)',
      '12/30 PM9:50-10:21 医院约会必须参加并亲吻她(好感+15)',
      '1/1 PM2:00-5:00 医院,误以为樱子已死(消沉事件)',
      '1/3 PM2:00 88车站重逢澄清误会 → 88学园定 1/6 约会',
      '1/6 PM1:00 88车站→88海岸约会送她回家(最终事件);1/7 成为恋人',
    ],
    events: [
      { day: 1, time: 'PM2:00-5:00', location: '市民医院', event: '爬树与樱子对话(好感+1)' },
      { day: 2, time: 'PM2:00-5:00', location: '市民医院', event: '与樱子对话,选"喜欢长头发"' },
      { day: 3, time: 'PM2:00-5:00', location: '市民医院', event: '回答樱子"没有女朋友"' },
      { day: 4, time: 'PM2:00-5:00', location: '市民医院', event: '与樱子聊天' },
      { day: 5, time: 'PM2:00-5:00', location: '市民医院', event: '对樱子说"已经不生气了"' },
      { day: 6, time: 'PM2:00-5:00', location: '市民医院', event: '与樱子聊天' },
      { day: 7, time: 'PM2:00-5:00', location: '市民医院', event: '与樱子定下 30 日晚的约会' },
      { day: 8, time: 'PM2:00-5:00', location: '市民医院', event: '与樱子聊天' },
      { day: 9, time: 'PM2:00-5:00', location: '市民医院', event: '樱子不在病房(期待落空)' },
      { day: 9, time: 'PM9:50-10:21', location: '市民医院', event: '与樱子约会并亲吻(好感+15)' },
      { day: 10, time: 'PM2:00-5:00', location: '市民医院', event: '樱子不在病房' },
      { day: 11, time: 'PM2:00-5:00', location: '市民医院', event: '误以为樱子已死(消沉)' },
      { day: 13, time: 'PM2:00', location: '88车站', event: '重逢澄清误会,前往88学园定约' },
      { day: 16, time: 'PM1:00', location: '88车站→88海岸', event: '约会送她回家(最终事件)' },
    ],
    confessionCondition: '好感度≥15;1/7 PM2:00-5:00 自宅成为恋人',
    conflicts: ['与洋子、梢江、美沙、美佐子部分冲突'],
  },
];

// ───────────────────────────────────────────────────────────
//  冲突规则(攻略:可同时告白/可同时H)
// ───────────────────────────────────────────────────────────

export interface ConflictRule {
  pair: [string, string];
  canConfessTogether: boolean;
  canHtogether: boolean;
  note: string;
}

export const CONFLICT_RULES: ConflictRule[] = [
  { pair: ['久美子', '佐知子'], canConfessTogether: true, canHtogether: false, note: '母女,可同时告白不可同时H' },
  { pair: ['唯', '美佐子'], canConfessTogether: true, canHtogether: false, note: '义母与义妹,可同时告白不可同时H' },
  { pair: ['唯', '梢江'], canConfessTogether: true, canHtogether: false, note: '可同时告白不可同时H' },
  { pair: ['泉美', '友美'], canConfessTogether: true, canHtogether: false, note: '可同时告白不可同时H' },
  { pair: ['可怜', '美铃'], canConfessTogether: false, canHtogether: false, note: 'R版不可同时' },
  { pair: ['泉美', '美里'], canConfessTogether: false, canHtogether: false, note: '冲突' },
  { pair: ['泉美', '佐知子'], canConfessTogether: false, canHtogether: false, note: '冲突' },
  { pair: ['美里', '佐知子'], canConfessTogether: false, canHtogether: false, note: '冲突' },
  { pair: ['梢江', '美沙'], canConfessTogether: false, canHtogether: false, note: '冲突' },
  { pair: ['梢江', '樱子'], canConfessTogether: false, canHtogether: false, note: '冲突' },
  { pair: ['美佐子', '樱子'], canConfessTogether: false, canHtogether: false, note: '冲突' },
  { pair: ['美佐子', '美沙'], canConfessTogether: false, canHtogether: false, note: '冲突' },
  { pair: ['洋子', '可怜'], canConfessTogether: false, canHtogether: true, note: '可同时H不可同时告白' },
  { pair: ['洋子', '美纪'], canConfessTogether: false, canHtogether: true, note: '可同时H不可同时告白' },
  { pair: ['洋子', '樱子'], canConfessTogether: false, canHtogether: true, note: '可同时H不可同时告白' },
  { pair: ['洋子', '美沙'], canConfessTogether: false, canHtogether: true, note: '可同时H不可同时告白' },
  { pair: ['洋子', '爱美'], canConfessTogether: false, canHtogether: true, note: '可同时H不可同时告白' },
  { pair: ['洋子', '美铃'], canConfessTogether: false, canHtogether: true, note: '可同时H不可同时告白' },
  { pair: ['洋子', '美佐子'], canConfessTogether: false, canHtogether: true, note: '可同时H不可同时告白' },
];
