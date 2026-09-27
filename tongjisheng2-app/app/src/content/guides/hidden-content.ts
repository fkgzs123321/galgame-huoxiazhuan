/**
 * 同级生2 隐藏要素数据(基于全网攻略)
 *  - 猜谜王 8 题(答对获得奖励/插画)
 *  - 日记收集 5 本(剧情线索)
 *  - 变数屋好感度检测
 */

// ───────────────────────────────────────────────────────────
//  猜谜王(8 题)
// ───────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: number;
  question: string;
  answer: string;
  /** 出现时间(游戏内天) */
  day: number;
  /** 出现地点 */
  location: string;
  /** 提示 */
  hint: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: '十年前的照片中,小唯头发上有没有绑蝴蝶结?',
    answer: '没有绑蝴蝶结',
    day: 1,
    location: '猜谜王 1 号(体育仓库附近)',
    hint: '看十年前旧照片的细节',
  },
  {
    id: 2,
    question: '友美对失约的理由作了什么解释?',
    answer: '临时有事',
    day: 2,
    location: '3年C班教室(PM4:00-6:00)',
    hint: '回忆友美迟到时的说辞',
  },
  {
    id: 3,
    question: '片桐老师正在学的是哪一种武道?',
    answer: '合气道',
    day: 3,
    location: '学校美术室(PM4:00-6:00)',
    hint: '美术老师的业余爱好',
  },
  {
    id: 4,
    question: '在运动的时候,你曾用什么来代替接力棒?',
    answer: '电动按摩棒',
    day: 4,
    location: '2年B班教室(AM9:00-PM1:00)',
    hint: '运动会上的轶事',
  },
  {
    id: 5,
    question: '可怜的女经纪人叫什么名字?',
    answer: '小光',
    day: 5,
    location: '才艺中心(PM8:00-11:00)',
    hint: '偶像行程的幕后人物',
  },
  {
    id: 6,
    question: '泉美念的大学叫什么名字?',
    answer: '星城之丘女子短期大学',
    day: 6,
    location: '学校音乐教室(PM1:00-4:00)',
    hint: '筱原家千金的高等教育规划',
  },
  {
    id: 7,
    question: '美沙的生日是 1975 年的几月几号?',
    answer: '4月17日',
    day: 7,
    location: '如月町电视公司左上方大楼(PM3:00-5:00)',
    hint: '网球少女的生日',
  },
  {
    id: 8,
    question: '你和洋子一起玩的游戏是哪一款?',
    answer: 'RIDERⅢ WGP',
    day: 8,
    location: 'ATARU 正后方的大厦(PM12:00-3:00)',
    hint: '机车女孩的游戏偏好',
  },
];

// ───────────────────────────────────────────────────────────
//  日记收集(5 本)
// ───────────────────────────────────────────────────────────

export interface DiaryEntry {
  id: number;
  name: string;
  /** 获取方式 */
  howToGet: string;
  /** 建议获取天 */
  day?: number;
  /** 提示内容 */
  content: string;
}

export const DIARIES: DiaryEntry[] = [
  {
    id: 1,
    name: '序章日记(蓝色日记)',
    howToGet: '游戏一开始自动拥有',
    content: '序章剧情自动获得',
  },
  {
    id: 2,
    name: '第一本日记',
    howToGet: '游戏一开始便会拿到',
    content: '初始持有',
  },
  {
    id: 3,
    name: '第二本日记',
    howToGet: '帮「梦仙人」把书还给「占卜婆婆」,再回到梦仙人处获得',
    day: 1,
    content: '梦仙人任务链(22:40 公寓左边梦仙人 → 西御寺家右边占卜婆婆 → 回梦仙人)',
  },
  {
    id: 4,
    name: '第三本日记',
    howToGet: '12/22-23 前往如月车站,唯会自动交给你',
    day: 1,
    content: '如月车站唯赠送(AM9:00 后)',
  },
  {
    id: 5,
    name: '第四本日记',
    howToGet: '帮爱美救小孩后的谢礼,事件后前往 88 车站获得',
    day: 2,
    content: '爱美谢礼(12/23 救庆子事件后)',
  },
  {
    id: 6,
    name: '第五本日记',
    howToGet: '参加电视台录影的纪念品(参照舞岛可怜流程表)',
    day: 3,
    content: '可怜线电视台录影获得',
  },
];

// ───────────────────────────────────────────────────────────
//  变数屋(好感度检测)
// ───────────────────────────────────────────────────────────

export interface VariableHouseInfo {
  location: string;
  openTime: string;
  description: string;
  /** 好感度阈值含义 */
  favorMeanings: Array<{ value: number; meaning: string }>;
}

export const VARIABLE_HOUSE: VariableHouseInfo = {
  location: '自宅上方(88町)',
  openTime: '每日 23:00 后',
  description: '可查看各女角当前好感度数值,建议每天检查(部分扣分事件不会记载在流程表上)',
  favorMeanings: [
    { value: 14, meaning: '可告白成功(唯/友美/泉美会自行告白)' },
    { value: 15, meaning: '完全攻略(美佐子/樱子线要求)' },
    { value: 13, meaning: '临界值(洋子需控制在 14 以下避免强制告白)' },
  ],
};
