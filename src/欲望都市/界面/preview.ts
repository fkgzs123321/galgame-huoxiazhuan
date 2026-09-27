// 浏览器直开预览模式：当宿主（酒馆助手）全局 API 不存在时，
// 注入演示数据与最小 shim，让构建产物可脱离 SillyTavern 直接渲染。
// 在酒馆内运行时本模块不干预任何宿主 API。
import _ from 'lodash';
import { z } from 'zod';

const hasHost = typeof getVariables === 'function' && typeof waitGlobalInitialized === 'function';

if (!hasHost && typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>;

  const demoStatData = {
    stat_data: {
      时间: { 日期: '2026年9月1日', 星期: '星期一', 时段: '下午场' },
      玩家: {
        学业总分: 618,
        体力: 64,
        性欲: 72,
        勃起度: 88,
        今日胜场: 2,
        今日败场: 0,
        累计缴械: 5,
        累计被缴械: 1,
      },
      排班: {
        今日场次: {
          下午场: { 参与者: '何玉兰、沈若兰', 结果: '待定', 是否参战: false },
          晚场: { 参与者: '丽莎·伊万诺娃、林汐瑶', 结果: '待定', 是否参战: false },
          深夜: { 参与者: '（无俘虏）', 结果: '待定', 是否参战: false },
        },
        当前战斗目标: '丽莎·伊万诺娃',
        战斗状态: '进行中',
      },
      女性角色: {
        '丽莎·伊万诺娃': {
          身份: '高三精英班学生（俄籍交换生）',
          省份: '俄罗斯莫斯科',
          方言: '俄语+英语+中文',
          缴械值: 55,
          缴械次数: 3,
          战斗次数: 4,
          胜场: 1,
          败场: 2,
          名器: '雪窦',
          技能: { 名: '寒凝', 等级: 3, 经验: 12 },
          能力值: { 忍耐: 6, 持久: 7, 反攻: 5 },
          特质: '直球、好奇、金发',
          缺陷: '怕热、成语用错',
          欲望积压: 68,
          今日已使用: true,
          心理状态: { 欲望度: 72, 羞耻感: 55, 兴奋: 66, 期待: 40, 精神状态: '动摇' },
          心声: '这个，很棒……为什么，会这样？',
        },
        何玉兰: {
          身份: '陪读妈妈（雨珊母）',
          省份: '云南昆明',
          方言: '云南话',
          缴械值: 100,
          缴械次数: 12,
          是否俘虏: true,
          俘虏日期: '2026年8月30日',
          名器: '含苞',
          欲望积压: 100,
          心理状态: { 欲望度: 100, 羞耻感: 20, 兴奋: 80, 期待: 60, 精神状态: '依恋' },
          心声: '我是你的人了……',
        },
        林汐瑶: {
          身份: '高三精英班学生',
          省份: '重庆',
          方言: '川渝话',
          缴械值: 12,
          名器: '一线天',
          欲望积压: 18,
          心理状态: { 欲望度: 25, 羞耻感: 60, 兴奋: 15, 期待: 10, 精神状态: '正常' },
          心声: '……这家伙怎么老看我！',
        },
      },
    },
  };

  const mvuEvents = {
    VARIABLE_INITIALIZED: 'VARIABLE_INITIALIZED',
    VARIABLE_UPDATE_ENDED: 'VARIABLE_UPDATE_ENDED',
    COMMAND_PARSED: 'COMMAND_PARSED',
  };

  win._ = _;
  win.z = z;
  win.getVariables = () => demoStatData;
  win.getAllVariables = () => demoStatData;
  win.getCurrentMessageId = () => 'preview';
  win.getChatMessage = () => null;
  win.updateVariablesWith = () => undefined;
  win.eventOn = () => ({ stop: () => undefined });
  win.eventEmit = () => undefined;
  win.waitGlobalInitialized = async () => undefined;
  win.Mvu = { events: mvuEvents };
  win.TavernHelper = win.TavernHelper ?? {};
}
