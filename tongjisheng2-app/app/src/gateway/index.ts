/**
 * gateway 服务网关层
 * 对齐 fanren-remake 的 12 gateway 模式:
 *  模型网关(runtime/model-gateway,保留)/ 导演服务 / 存档服务 / 通知服务
 *
 * 用法:
 *   import { directorService, archiveService, notificationService } from '@gateway/index';
 */
export * from './archiveService';
export * from './notificationService';
export * from './directorService';
export * from './modelLibrary';
