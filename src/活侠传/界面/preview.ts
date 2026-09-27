/**
 * 浏览器直开预览：宿主（酒馆助手）全局 API 不存在时，
 * 注入演示数据与最小 shim，让构建产物能脱离 SillyTavern 直接渲染。
 *
 * ★ 为什么需要这个（两处坑）：
 *   ① webpack 把 `jquery` 等设为 external（`var $`），运行时靠酒馆网页提供，
 *      独立打开时 `$(() => ...)` 抛 ReferenceError，脚本死在第一行。
 *   ② 产物里存在 `us = Vue` 这类**对全局 Vue 的引用**（酒馆的 global map 里
 *      `vue: 'Vue'`，即 Vue 由酒馆网页注入）。独立打开时 `Vue` 未定义，
 *      同样在模块初始化阶段就崩。
 *
 * ★ 在酒馆内运行时本模块不干预任何宿主 API。
 */
import * as VueNS from 'vue';
import _ from 'lodash';
import { z } from 'zod';

/** 最小 jQuery 垫片：只覆盖本项目用到的两种用法 */
function 造jQuery() {
  const jq = (arg: unknown) => {
    // $(fn) —— 加载时执行
    if (typeof arg === 'function') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', arg as EventListener, { once: true });
      } else {
        (arg as () => void)();
      }
      return jq;
    }
    // $(sel) / $(window) —— 返回链式对象
    const 空 = {
      on: () => 空,
      off: () => 空,
      one: () => 空,
      length: 0,
      get: () => undefined,
      find: () => 空,
      append: () => 空,
      remove: () => 空,
      text: () => '',
      html: () => '',
      val: () => '',
      css: () => 空,
      attr: () => '',
      each: () => 空,
    };
    return 空;
  };
  return Object.assign(jq, { ajax: () => ({ done: () => ({ fail: () => undefined }) }), fn: {} });
}

const hasHost = typeof getVariables === 'function' && typeof waitGlobalInitialized === 'function';

if (!hasHost && typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>;
  console.info('[活侠传] 未检测到宿主，进入预览模式（演示数据）');

  /** 预览诊断：把运行时错误直接画到页面上，别让它静默变白屏 */
  const 报错 = (谁: string, e: unknown) => {
    const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
    console.error(`[活侠传][预览] ${谁}`, e);
    let box = document.getElementById('__preview_err');
    if (!box) {
      box = document.createElement('pre');
      box.id = '__preview_err';
      box.style.cssText =
        'position:fixed;left:0;top:0;right:0;max-height:60%;overflow:auto;z-index:99999;' +
        'margin:0;padding:10px;background:#fff3cd;color:#7a2b22;font:12px/1.5 monospace;' +
        'border-bottom:2px solid #a8332a;white-space:pre-wrap';
      document.body.appendChild(box);
    }
    box.textContent += `【${谁}】${msg}\n\n`;
  };

  win.addEventListener('error', ev => 报错('window.onerror', (ev as ErrorEvent).error ?? (ev as ErrorEvent).message));
  win.addEventListener('unhandledrejection', ev =>
    报错('unhandledrejection', (ev as PromiseRejectionEvent).reason),
  );

  /** 演示数据：覆盖每个页签，便于查版式 */
  const demo = {
    世界: {
      年: 1,
      月: 4,
      旬: '上旬',
      昼夜: '白天',
      天气: '阴',
      当前地点: '正心堂',
      当前节点: '第一年_四月上旬',
      已发生节点: '第一年_四月上旬',
      行动次数: 2,
      行动上限: 3,
      门人: 7,
      向心: 42,
      门派规模: 2,
      门派资产: 1200,
      名声: 15,
      贡献度: 80,
      门派好感: { 青城派: 10, 峨嵋派: -5, 丐帮: 20 },
    },
    你: {
      姓名: '赵活',
      身份: '唐门外姓弟子',
      出身: '绵阳',
      称号: '唐门杂鱼',
      心上人: '',
      银两: 37,
      体力: { 当前: 42, 上限: 50 },
      内力: { 当前: 18, 上限: 20 },
      轻功: 22,
      魅力: 4,
      学问: 18,
      道德: 58,
      性情: 46,
      处世: 40,
      修养: 62,
      心相: 44,
      阴阳: 50,
      变心: 0,
      命运: 50,
      嘴力: 35,
      锻造: 12,
      炼丹: 8,
      武学点: 30,
      八系: { 刀剑: 0, 暗器: 26, 拳掌: 12, 腿法: 10, 奇门: 0, 软兵器: 0, 枪棍: 0, 内功: 6 },
      三教: { 儒学: 5, 道学: 0, 释学: 0 },
      形意拳: 0,
      抗毒: 15,
      抗麻: 5,
      毒药: 0,
      麻痹: 0,
      战斗: { 攻击: 14, 防御: 18, 绝招: 6, 爆发: 12, 暗器威力: 16, 暗器爆发: 14, 生命上限: 100 },
    },
    天赋: {
      自恋: { 等级: 1, 经验: 0 },
      唐门暗器: { 等级: 2, 经验: 40 },
      强化防御: { 等级: 1, 经验: 0 },
    },
    秘籍: {
      // ★ 名字要与 脚本/秘籍.ts（提取自原作 wiki 的 88 本）对齐，
      //   否则武学页的门槛判定、加成显示都出不来。
      唐门暗器总纲: { 已读: true, 熟练: 35, 师授: false },
      流星剑谱: { 已读: false, 熟练: 0, 师授: false },
      枯荣神功上卷: { 已读: false, 熟练: 0, 师授: true },
    },
    物品: {
      // ★ 物品名要与 脚本/物品.ts 的 物表 对齐，否则加成算不出来（都是 0）
      柴刀: { 数量: 1, 品质: '凡', 说明: '伙房劈柴用的。当兵器使，聊胜于无。' },
      粗布衣: { 数量: 1, 品质: '凡', 说明: '唐门杂役的常服。' },
      鹿皮囊: { 数量: 1, 品质: '优', 说明: '四师兄的私货，要价不低。' },
      金创药: { 数量: 3, 品质: '凡', 说明: '唐门外伤药。伤口上撒，疼得钻心，但管用。' },
      柳叶飞刀: { 数量: 12, 品质: '优', 说明: '唐门制式暗器。' },
      胡椒粉: { 数量: 1, 品质: '优', 说明: '二师兄的执着。非但自己喜欢，还会强迫大家一起吃。' },
    },
    装备: { 兵器: '柴刀', 防具: '粗布衣', 暗器袋: '鹿皮囊', 饰品: '' },
    关系: {
      唐布衣: {
        身份: '大师兄 · 飞侠',
        好感: 25,
        我的好感: 30,
        认知: '知道你是外姓师弟，常怂恿你偷懒',
        欠人情: 1,
        状态: '相熟',
      },
      唐铮: {
        身份: '二师兄 · 辣手相公',
        好感: 5,
        我的好感: 10,
        认知: '知道你在炼丹房打下手',
        欠人情: 0,
        状态: '相识',
      },
      唐升: { 身份: '三师兄', 好感: 15, 我的好感: 20, 认知: '教过你识字，说你起步太晚', 欠人情: -1, 状态: '相识' },
      唐惟元: {
        身份: '四师兄 · 无孔不入',
        好感: 30,
        我的好感: 25,
        认知: '知道你没钱，但从不笑话你没有将来',
        欠人情: 2,
        状态: '相熟',
      },
      唐中翎: {
        身份: '唐门掌门',
        好感: 10,
        我的好感: 40,
        认知: '你知道他救回师娘却赎不回她的泪',
        欠人情: 0,
        状态: '相识',
      },
      唐默铃: {
        身份: '小师妹',
        好感: 20,
        我的好感: 15,
        认知: '只当你是唐门里一个熟人',
        欠人情: 0,
        状态: '相识',
      },
    },
    前置: {
      已解锁: '与大师兄谈过话、进过炼丹房、领过一次月钱',
      已错过: '后山夜谈、四师兄的私货单',
      本旬已用: '伙房打杂',
      可见条件: '解锁条件：嘴力>32',
      计数: { TC0001: 12, TC0002: 0, TC0003: 4 },
    },
    任务: {
      主线: '在唐门活下去，别被赶下山',
      主线节点: 'M0002',
      支线: {
        S0014: { 名: '四师兄的私货', 节点: 'S0014_01' },
        S9904: { 名: '伙房打杂', 节点: 'clear' },
      },
      事件标记: '入门、初见掌门',
    },
    战斗: {
      // ★ 预览默认『已结束』—— 浮层会盖住其他页签，不利于逐页查看。
      //   要单验战斗面板（七行动能否出招）时，改成 '进行中'。
      状态: '已结束',
      对手: '唐布衣',
      回合: 4,
      我方血: 62,
      我方血上限: 100,
      对方血: 148,
      对方血上限: 170,
      气: 3,
      我方状态: { 中毒: 2 },
      对方状态: {},
      日志:
        '第1回合：对方 击中（18），你 落空、' +
        '第2回合：你 击中（12），对方 击中（21）、' +
        '第3回合：你 落空，对方 击中（15）、' +
        '第4回合：你 击中（9），对方 落空',
      摘要: '对方·苦战',
    },
  };

  // ── 全局库垫片 ──
  // ★ 产物里有 `us = Vue` 这种对**全局 Vue** 的引用（酒馆的 global map：
  //   `vue: 'Vue'`，即 Vue 由酒馆网页提供）。独立打开时若不给，
  //   会在模块初始化阶段抛 `ReferenceError: Vue is not defined`，面板全白。
  win.Vue = win.Vue ?? VueNS;
  win._ = win._ ?? _;
  win.z = win.z ?? z;
  win.$ = win.jQuery = 造jQuery();

  // ── 酒馆助手 API 垫片 ──
  win.getVariables = () => ({ stat_data: demo });
  win.getAllVariables = () => ({ stat_data: demo });
  win.replaceVariables = () => {};
  win.updateVariablesWith = () => undefined;
  win.getCurrentMessageId = () => 0;
  win.getChatMessage = () => null;
  win.waitGlobalInitialized = async () => {};
  win.eventOn = () => ({ stop: () => undefined });
  win.eventEmit = () => undefined;
  win.errorCatched = (fn: (...a: unknown[]) => unknown) => fn;
  win.toastr = win.toastr ?? { success: () => {}, error: () => {}, info: () => {}, warning: () => {} };

  // ★ 行动 / 战斗面板要用到的两个接口 —— 缺了会在点击那一刻抛 ReferenceError。
  //   预览里只记录，不做真实生成。
  win.injectPrompts = (prompts: unknown) => {
    console.info('[预览] 注入提示词（真实环境会发给 AI）:', prompts);
    return { uninject: () => undefined };
  };
  win.uninjectPrompts = () => undefined;
  win.triggerSlash = async (cmd: string) => {
    console.info('[预览] 触发 STScript:', cmd);
    return '';
  };

  console.info('[活侠传] 预览垫片已注入（Vue / _ / z / $ / TavernHelper API）');
}
