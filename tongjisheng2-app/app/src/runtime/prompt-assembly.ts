/**
 * Prompt Assembly(步骤6)
 *
 * 职责:
 *  - 按 AiProfile.promptStrategy 组装 OpenAI ChatCompletion messages[]
 *  - 占位符替换:
 *      {{D0_CONTROLLER_OUTPUT}} → EJS 渲染 D0 系统控制器的输出
 *      {{WORLDBOOK_BEFORE_OUTPUT}} → 世界书 before_char 条目拼接
 *      {{WORLDBOOK_AFTER_OUTPUT}} → 世界书 after_char 条目拼接
 *      {{CHAR_PROFILE_OUTPUT}} → 当前女角角色档案
 *      {{VARIABLE_OUTPUT_FORMAT}} → 变量输出格式.txt 内容
 *      {{STATUS_BAR_VARIABLES}} → 当前 stat_data 快照(用 {{format_message_variable::stat_data}} 格式)
 *      {{user}} / {{char}} → 玩家姓名 / 当前女角姓名
 *  - 世界书条目前缀路由:
 *      [mvu_plot] → 主聊天AI 专属
 *      [mvu_update] → 变量AI 专属
 *      无前缀 → 双发(两 AI 都收到)
 *  - 聊天历史注入(主聊天AI 含完整历史;变量AI 含最近 N 轮)
 *  - Memory 摘要注入(阶段2 实现,阶段1 留接口)
 *  - 输出 ChatCompletionRequest messages[] + trace
 *
 * 不做:
 *  - 实际模型调用(由 Model Gateway 负责)
 *  - stat_data 变更(只读快照)
 */

import type { AiProfile } from '../ai/profiles';
import type { PresetProfile, PresetPromptEntry } from './preset/types';
import type { MvuRuntime } from './mvu-runtime';
import { EjsEngine, estimateTokens } from './ejs-engine';
import { worldbookSelector, type SelectionResult } from './worldbook-selector';
import { contentLoader } from '../content/content-loader';
import { traceBus } from './trace-bus';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** ChatCompletion 消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /** 来源(用于 trace) */
  source?: string;
  /** identifier(预设槽位) */
  identifier?: string;
}

/** Prompt 组装上下文 */
export interface AssemblyContext {
  /** 玩家姓名(替换 {{user}}) */
  userName: string;
  /** 当前女角姓名(替换 {{char}}) */
  charName: string;
  /** 玩家动作文本(本轮 user 消息) */
  userAction: string;
  /** 聊天历史(最近 N 轮) */
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Memory 摘要(阶段2 实现,阶段1 为空) */
  memorySummary?: string;
  /** 世界书选择结果(可选,缺省时调用 worldbookSelector.select) */
  worldbookSelection?: SelectionResult;
  /** 是否跳过 EJS 渲染(调试用) */
  skipEjs?: boolean;
  /** 当前回合 ID(阶段4:用于 traceBus 关联,可选) */
  turnId?: string;
  /** 当前 AI Profile ID(阶段4:用于 traceBus 关联,可选) */
  profileId?: string;
}

/** Prompt 组装结果 */
export interface AssemblyResult {
  /** ChatCompletion messages[] */
  messages: ChatMessage[];
  /** 总 token 估算 */
  estimatedTokens: number;
  /** 组装 trace */
  trace: AssemblyTrace[];
  /** 占位符替换统计 */
  placeholderStats: Record<string, number>;
  /** 警告(不阻塞) */
  warnings: string[];
}

export interface AssemblyTrace {
  step: string;
  detail: string;
  tokens: number;
}

// ───────────────────────────────────────────────────────────
//  PromptAssembler 类
// ───────────────────────────────────────────────────────────

export class PromptAssembler {
  private ejsEngine: EjsEngine;
  private mvu: MvuRuntime;

  constructor(mvu: MvuRuntime) {
    this.mvu = mvu;
    this.ejsEngine = new EjsEngine(mvu);
  }

  /**
   * 组装 Prompt
   *
   * @param profile AI Profile(决定组装策略)
   * @param preset 预设(提供 prompts[] 顺序和 sampler)
   * @param ctx 组装上下文
   */
  async assemble(
    profile: AiProfile,
    preset: PresetProfile,
    ctx: AssemblyContext,
  ): Promise<AssemblyResult> {
    const trace: AssemblyTrace[] = [];
    const warnings: string[] = [];
    const placeholderStats: Record<string, number> = {};
    const messages: ChatMessage[] = [];

    // 1. 解析预设 prompts[](按顺序生成 messages)
    const enabledPrompts = preset.prompts.filter((p) => p.enabled);
    trace.push({
      step: 'preset-parse',
      detail: `预设 ${preset.name} 共 ${preset.prompts.length} 条,启用 ${enabledPrompts.length} 条`,
      tokens: 0,
    });

    // 2. 预渲染世界书/角色档案/D0/变量输出格式(供占位符替换)
    const renders = await this.preRenderAssets(profile, ctx, trace, warnings);

    // 3. 遍历预设 prompts[],替换占位符,生成 messages
    for (const p of enabledPrompts) {
      const content = this.replacePlaceholders(
        p.content,
        renders,
        ctx,
        placeholderStats,
        warnings,
      );

      // 跳过空内容(如 chatHistory marker,内容由历史注入步骤处理)
      if (p.isMarker && !content.trim()) {
        if (p.identifier === 'chatHistory' && profile.promptStrategy.includeChatHistory) {
          // 注入聊天历史
          this.injectChatHistory(messages, ctx, profile, trace);
        }
        continue;
      }

      if (!content.trim()) continue;

      messages.push({
        role: p.role,
        content,
        source: `preset:${p.identifier}`,
        identifier: p.identifier,
      });
    }

    // 4. 注入玩家动作(user 消息,主聊天AI 需要)
    if (profile.role === 'main-chat' && ctx.userAction) {
      messages.push({
        role: 'user',
        content: ctx.userAction,
        source: 'user-action',
      });
    }

    // 5. 注入 stat_data 快照(变量AI 需要,作为 system 消息)
    if (profile.promptStrategy.includeStatDataSnapshot) {
      const snapshot = this.mvu.snapshot();
      const snapshotText = this.formatStatDataSnapshot(snapshot);
      messages.push({
        role: 'system',
        content: `<status_current_variables>\n${snapshotText}\n</status_current_variables>`,
        source: 'stat-data-snapshot',
      });
      trace.push({
        step: 'stat-data-snapshot',
        detail: `stat_data 快照注入(变量AI 用),keys=${Object.keys(snapshot).length}`,
        tokens: estimateTokens(snapshotText),
      });
    }

    // 6. 计算 token 总数
    const totalTokens = messages.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0,
    );

    // 阶段4:推送到 traceBus(便于 Prompt 检查器展示)
    try {
      if (ctx.turnId) {
        const traceProfileId = ctx.profileId ?? profile.id;
        traceBus.append(
          ctx.turnId,
          'promptAsm',
          `assemble-${traceProfileId}`,
          `Prompt 组装完成:messages=${messages.length} tokens≈${totalTokens} 警告=${warnings.length}`,
          {
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            estimatedTokens: totalTokens,
            placeholderStats,
            warnings,
            assemblyTrace: trace,
          },
        );
      }
    } catch {
      // traceBus 失败不影响 Prompt 组装
    }

    return {
      messages,
      estimatedTokens: totalTokens,
      trace,
      placeholderStats,
      warnings,
    };
  }

  // ─────────────────────────────────────────────────────────
  //  预渲染资产(D0/世界书/角色档案/变量输出格式)
  // ─────────────────────────────────────────────────────────

  private async preRenderAssets(
    profile: AiProfile,
    ctx: AssemblyContext,
    trace: AssemblyTrace[],
    warnings: string[],
  ): Promise<RenderedAssets> {
    const renders: RenderedAssets = {};

    // D0 控制器渲染
    if (profile.promptStrategy.includeD0Controller) {
      const d0Entry = contentLoader.getByEntryKey('D0系统控制器');
      if (d0Entry) {
        const result = await this.ejsEngine.render(d0Entry.content, {
          filename: 'D0系统控制器.txt',
          catchErrors: true,
        });
        if (result.ok) {
          renders.d0Controller = result.output;
          trace.push({
            step: 'render-d0',
            detail: `D0 系统控制器渲染成功,${result.output.length} 字`,
            tokens: estimateTokens(result.output),
          });
        } else {
          warnings.push(`D0 系统控制器渲染失败: ${result.error}`);
          renders.d0Controller = `<!-- D0 渲染失败: ${result.error} -->`;
          trace.push({
            step: 'render-d0-fail',
            detail: `D0 渲染失败: ${result.error}`,
            tokens: 0,
          });
        }
      } else {
        warnings.push('D0系统控制器 条目未找到');
      }
    }

    // 世界书选择
    const selection =
      ctx.worldbookSelection ??
      worldbookSelector.select({
        chatHistory: ctx.chatHistory.map((m) => m.content),
      });

    // 世界书前置([mvu_plot]/[mvu_update]/无前缀 路由)
    if (profile.promptStrategy.includeWorldbookBefore) {
      renders.worldbookBefore = this.filterWorldbookByPrefix(
        selection.beforeChar,
        profile.promptStrategy.worldbookPrefixFilter,
      )
        .map((e) => e.content ?? '')
        .join('\n\n---\n\n');
      trace.push({
        step: 'worldbook-before',
        detail: `世界书前置 ${selection.beforeChar.length} 条,过滤后 ${renders.worldbookBefore ? renders.worldbookBefore.length : 0} 字`,
        tokens: estimateTokens(renders.worldbookBefore ?? ''),
      });
    }

    // 世界书后置
    if (profile.promptStrategy.includeWorldbookAfter) {
      renders.worldbookAfter = this.filterWorldbookByPrefix(
        selection.afterChar,
        profile.promptStrategy.worldbookPrefixFilter,
      )
        .map((e) => e.content ?? '')
        .join('\n\n---\n\n');
      trace.push({
        step: 'worldbook-after',
        detail: `世界书后置 ${selection.afterChar.length} 条,过滤后 ${renders.worldbookAfter ? renders.worldbookAfter.length : 0} 字`,
        tokens: estimateTokens(renders.worldbookAfter ?? ''),
      });
    }

    // 角色档案(当前女角)
    if (profile.promptStrategy.includeCharProfile) {
      const charName = ctx.charName;
      if (charName && charName !== '无') {
        const charEntry = contentLoader.getByEntryKey(`${charName}_基础信息`);
        if (charEntry) {
          renders.charProfile = charEntry.content;
          trace.push({
            step: 'char-profile',
            detail: `角色档案 ${charName} 加载,${charEntry.content.length} 字`,
            tokens: estimateTokens(charEntry.content),
          });
        } else {
          warnings.push(`角色档案未找到: ${charName}_基础信息`);
        }
      }
    }

    // 变量输出格式
    if (profile.promptStrategy.includeVariableOutputFormat) {
      const fmtEntry = contentLoader.getByEntryKey('变量输出格式_额外模型');
      if (fmtEntry) {
        renders.variableOutputFormat = fmtEntry.content;
        trace.push({
          step: 'var-output-format',
          detail: `变量输出格式加载,${fmtEntry.content.length} 字`,
          tokens: estimateTokens(fmtEntry.content),
        });
      } else {
        warnings.push('变量输出格式_额外模型 条目未找到');
      }
    }

    return renders;
  }

  // ─────────────────────────────────────────────────────────
  //  占位符替换
  // ─────────────────────────────────────────────────────────

  private replacePlaceholders(
    content: string,
    renders: RenderedAssets,
    ctx: AssemblyContext,
    stats: Record<string, number>,
    warnings: string[],
  ): string {
    let result = content;
    const replacements: Array<[string, string]> = [
      ['{{D0_CONTROLLER_OUTPUT}}', renders.d0Controller ?? ''],
      ['{{WORLDBOOK_BEFORE_OUTPUT}}', renders.worldbookBefore ?? ''],
      ['{{WORLDBOOK_AFTER_OUTPUT}}', renders.worldbookAfter ?? ''],
      ['{{CHAR_PROFILE_OUTPUT}}', renders.charProfile ?? ''],
      ['{{VARIABLE_OUTPUT_FORMAT}}', renders.variableOutputFormat ?? ''],
      ['{{user}}', ctx.userName],
      ['{{char}}', ctx.charName],
    ];

    for (const [placeholder, value] of replacements) {
      if (result.includes(placeholder)) {
        result = result.split(placeholder).join(value);
        stats[placeholder] = (stats[placeholder] ?? 0) + 1;
      }
    }

    // {{getvar::xxx}} 宏(从 MVU 读取变量)
    result = result.replace(/\{\{getvar::([^}]+)\}\}/g, (match, path) => {
      stats[match] = (stats[match] ?? 0) + 1;
      const val = this.mvu.getvar(`stat_data.${path}`);
      return val === undefined || val === null ? '' : String(val);
    });

    // {{format_message_variable::stat_data}} 宏(输出完整 stat_data,变量AI 用)
    if (result.includes('{{format_message_variable::stat_data}}')) {
      const snapshot = this.mvu.snapshot();
      const formatted = this.formatStatDataSnapshot(snapshot);
      result = result.split('{{format_message_variable::stat_data}}').join(formatted);
      stats['{{format_message_variable::stat_data}}'] =
        (stats['{{format_message_variable::stat_data}}'] ?? 0) + 1;
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:世界书前缀过滤
  // ─────────────────────────────────────────────────────────

  private filterWorldbookByPrefix<
    T extends { name: string; content?: string },
  >(entries: T[], filter: 'mvu_plot' | 'mvu_update' | 'both' | 'none'): T[] {
    if (filter === 'none') return entries;
    return entries.filter((e) => {
      const name = e.name;
      if (filter === 'mvu_plot') {
        // [mvu_plot] 前缀 + 无前缀
        return name.startsWith('[mvu_plot]') || !name.startsWith('[mvu_');
      }
      if (filter === 'mvu_update') {
        // [mvu_update] 前缀 + 无前缀
        return name.startsWith('[mvu_update]') || !name.startsWith('[mvu_');
      }
      // both:全部
      return true;
    });
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:聊天历史注入
  // ─────────────────────────────────────────────────────────

  private injectChatHistory(
    messages: ChatMessage[],
    ctx: AssemblyContext,
    profile: AiProfile,
    trace: AssemblyTrace[],
  ): void {
    // 变量AI 只需最近 3 轮(减少 token);主聊天AI 需完整历史(由上下文预算裁剪)
    const historyLimit = profile.role === 'var-update' ? 6 : 50;
    const history = ctx.chatHistory.slice(-historyLimit);
    for (const m of history) {
      messages.push({
        role: m.role,
        content: m.content,
        source: 'chat-history',
      });
    }
    trace.push({
      step: 'chat-history',
      detail: `注入聊天历史 ${history.length} 条(限制 ${historyLimit})`,
      tokens: history.reduce((sum, m) => sum + estimateTokens(m.content), 0),
    });
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:stat_data 快照格式化
  // ─────────────────────────────────────────────────────────

  private formatStatDataSnapshot(snapshot: Record<string, unknown>): string {
    // 用 --- 分隔符和 <status_current_variable> 标签包裹(对齐原卡宏格式)
    const lines: string[] = ['<status_current_variable>'];
    for (const [key, value] of Object.entries(snapshot)) {
      lines.push(`--- ${key} ---`);
      lines.push(this.formatValue(value, 0));
    }
    lines.push('</status_current_variable>');
    return lines.join('\n');
  }

  private formatValue(value: unknown, indent: number): string {
    const pad = '  '.repeat(indent);
    if (value === null || value === undefined) return `${pad}(空)`;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${pad}${value}`;
    }
    if (Array.isArray(value)) {
      return value.map((v, i) => `${pad}[${i}] ${this.formatValue(v, indent + 1)}`).join('\n');
    }
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${pad}${k}: ${this.formatValue(v, indent + 1)}`)
        .join('\n');
    }
    return `${pad}${String(value)}`;
  }
}

// ───────────────────────────────────────────────────────────
//  内部类型
// ───────────────────────────────────────────────────────────

interface RenderedAssets {
  d0Controller?: string;
  worldbookBefore?: string;
  worldbookAfter?: string;
  charProfile?: string;
  variableOutputFormat?: string;
}

// ───────────────────────────────────────────────────────────
//  单例(使用 kernel 的 mvu)
// ───────────────────────────────────────────────────────────

import { kernel } from './kernel';

export const promptAssembler = new PromptAssembler(kernel.getMvuRuntime());
