/**
 * schemas 数据契约层
 * 对齐 fanren-remake 的 4 schemas 模式:
 *  - appConfigSchemas:应用配置契约
 *  - saveSchemas:存档导出包契约
 *  - (content/mvu/schema.ts 保留为卡片 MVU 契约,供酒馆侧使用)
 */
export * from './appConfigSchemas';
export * from './saveSchemas';
