/**
 * prompts 提示词层
 * 对齐 fanren-remake 的 prompts 层(9 模块):
 *  - promptTypes:预设/提示词类型契约(从 runtime/preset/types 再导出)
 *  - presetAssembler:预设组装(内置模板构建)
 *  - builtinPresets:内置预设数据(从 content/presets 迁移入口)
 *
 * 架构:runtime/prompt-assembly 负责运行时组装(占位符替换/EJS),
 *        本层负责"预设数据 + 类型契约 + 内置模板"。
 */
export * from './promptTypes';
export * from './presetAssembler';
