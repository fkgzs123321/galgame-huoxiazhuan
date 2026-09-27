// 造一个带假数据的预览版，用于截图看真实渲染
const fs = require('fs');
const path = require('path');
const D = 'src/旮旯给木-英雄坛说';
let t = fs.readFileSync(path.join(D, '正则', '状态栏界面.html'), 'utf8');

// 假状态：让每个页面都有东西可看
const 假状态 = {
  世界: { 底座: 'yingxiong' },
  时间: { 岁数: 16, 月: 7, 她的期限: 11 },
  场景: { 当前地点: '武当山', 当前门派: '太极门', 当前女角: '桑轻虹' },
  天赋: { 先天: { 膂力: 22, 敏捷: 19, 根骨: 25, 悟性: 21 } },
  技能: {
    基本: { 基本内功: 124, 基本轻功: 68, 基本拳脚: 91, 基本剑术: 73, 基本招架: 55, 读书写字: 82 },
    门派: { 太极拳: 96, 太极神功: 88, 太极剑: 41 },
  },
  资源: { 潜能: 14820, 经验: 128400, 金钱: 3240, 食物: 78, 饮水: 64 },
  身体: { 生命当前: 812, 生命有效: 88, 内力强度: 420, 内力蓄存: 316 },
  她: { 反抗值: 62, 熟练度: '沉浸', 兴奋度: 0, 世界的裂缝: 3, 目的进度: 46, 她用过的手段: [{ 手段: '快进', 时间: '第 5 月' }, { 手段: '改数值', 时间: '第 6 月' }] },
  局面: {
    当前选项: {
      1: { 文本: '当着她的面把门反锁', 等级: '中', 感觉: '她会先愣一下' },
      2: { 文本: '把桌上的茶倒了重沏', 等级: '微', 感觉: '不给理由' },
      3: { 文本: '走到窗前站住', 等级: '微', 感觉: '她看不透你想干什么' },
      4: { 文本: '按住她的手腕', 等级: '强', 感觉: '这一步出去就收不回来了' },
    },
    她的倾向: '4',
    骰子种子: 20260916,
    战斗结果: { 结果: '我方·常规', 回合数: 6, 我方状态: '轻伤（剩 512/680）', 对方状态: '倒下（剩 0/400）', 存活: '我方 1/1　对方 0/1', 不可逆: ['我方受伤 12%'], 写法约束: ['快而不费力，过程短'] },
  },
  背包: [
    { 名: '钢刀', 品质: '普通' }, { 名: '檀香扇', 品质: '精良' },
    { 名: '金锁子甲', 品质: '珍奇' }, { 名: '海外仙丹' }, { 名: '女儿红' },
  ],
  任务: {
    除恶: { 名: '除恶', 进度: 9, 需要: 15, 状态: '进行' },
    门派功课: { 名: '门派功课', 进度: 14, 需要: 20, 状态: '进行' },
    她的托付: { 名: '她的托付', 进度: 0, 需要: 1, 状态: '进行' },
    搬石头: { 名: '搬石头', 进度: 8, 需要: 8, 状态: '完成' },
  },
  关系: { 桑轻虹: { 关系阶段: '亲密', 好感度: 74, 关系: '她的偏爱' } },
  关系网: {
    '桑轻虹|李青照': { 甲: '桑轻虹', 乙: '李青照', 类型: '同门', 强度: 78, 双向: true },
    '桑轻虹|阿庆嫂': { 甲: '桑轻虹', 乙: '阿庆嫂', 类型: '旧识', 强度: 42 },
    '桑轻虹|清虚道长': { 甲: '桑轻虹', 乙: '清虚道长', 类型: '师徒', 强度: 65, 双向: true },
  },
  NSFW: {
    兴奋度: 0,
    穿着: { 外衫: '素罗衫', 下裳: '青裙', 里衣: '白绢抹胸', 布袜: '', 鞋履: '绣鞋', 佩饰: '玉簪' },
    身体: {
      基线: { 身高体重: '163cm / 46kg，（偏瘦，骨架小）', 体态: '肩窄腰细，走路步子短', 常年特征: '左肩胛有一小块旧疤' },
      即时: { 胸前: '未变化', 下身: '未变化', 口: '未变化' },
    },
    周期: {},
  },
};

// 把假数据挂上（覆盖 logic 的拉取）
t = t.replace('<script>\nwindow.YX_DATA', '<script>\nwindow.__YX_MOCK__ = ' + JSON.stringify(假状态) + ';\nwindow.YX_DATA');

const 假取 = `
  /* ── 预览版：没酒馆时用假数据 ── */
  async function 拉() {
    try {
      if (window.__YX_MOCK__) { 状态 = window.__YX_MOCK__; 楼 = -1; 画(); return; }
      if (typeof TavernHelper === 'undefined' || !TavernHelper.getVariables) return;
      var v = await TavernHelper.getVariables({ type: 'message', message_id: 'latest' });
      楼 = (v && v.message_id != null) ? v.message_id : -1;
      状态 = (v && v.stat_data) || {};
      画();
    } catch (e) { }
  }`;
t = t.replace(/  async function 拉\(\) \{[\s\S]*?\n  \}/, 假取);
// ★ 支持 ?page=xxx（截图用）
t = t.replace("  画页签();", "  画页签(); try{var _p=new URLSearchParams(location.search).get(String.fromCharCode(112,97,103,101));if(_p){页=_p;画页签();画();}}catch(e){}");

// ★ 支持 ?scroll=元素选择器（截图树用）
t = t.replace(String.fromCharCode(10) + "  拉();", String.fromCharCode(10) + "  拉(); setTimeout(function(){ try{ var q=new URLSearchParams(location.search).get(String.fromCharCode(115,99,114,111,108,108)); if(q){ var el=document.querySelector(q); if(el) el.scrollIntoView(); } }catch(e){} }, 600);");

const 出 = path.join(D, 'scripts', '_preview.html');
fs.writeFileSync(出, t);
console.log('✅ 预览版已生成: ' + 出);
console.log('   ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
