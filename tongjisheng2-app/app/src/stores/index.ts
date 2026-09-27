/**
 * stores 状态库层
 * 对齐 fanren-remake 的 16 stores 模式。
 *
 * 用法:
 *   // 组件内(响应式):
 *   const config = useConfigStore((s) => s.config);
 *   // 非组件(命令式):
 *   useConfigStore.getState().updateConfig(next);
 */
export * from './configStore';
export * from './uiStore';
export * from './chatStore';
export * from './npcStore';
export * from './saveStore';
export * from './modStore';
export * from './toastStore';
export * from './gameplayStore';
