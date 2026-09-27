/**
 * settings 设置模块层
 * 对齐 fanren-remake 的 45 settings 模块模式:
 * 每个功能一个独立设置面板,由 SettingsPage 聚合。
 *
 * 用法:
 *   <SettingsPage config={config} onChange={onChange} onIdentityConfirm={...} selectedIdentity={...} />
 */
export * from './AiEndpointSettings';
export * from './PlayerSettings';
export * from './PresetSettings';
export * from './SaveConfigSettings';
export * from './SettingsPage';
