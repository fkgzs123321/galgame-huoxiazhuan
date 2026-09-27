/**
 * Runtime 模块入口
 *
 * 步骤2:IndexedDB + EJS引擎 + getwi加载器 + MVU运行时
 * 步骤3:世界书选择器 + getwi调度树
 * 步骤4:MVU事务(Zod schema + JSONPatch + 变量AI输出解析)
 * 步骤5:Turn Kernel(回合内核 + 四态事务)
 * 步骤6:Prompt组装 + Model Gateway + 预设兼容
 * 步骤8:Recovery(重开一致性 + 失败恢复)
 * 步骤9:E2E Verifier(6 场景 + Trace 采集)
 * 阶段3 步骤1:TriggerDispatcher(触发型 AI 调度器)
 * 阶段3 步骤3:CGGallery(CG 画廊 + 解锁条件评估)
 * 阶段3 步骤5:AchievementEngine(成就系统 + 多周目继承)
 * 阶段3 步骤6:ReplayEngine(历史回合回放 + 分支)
 * 阶段3 步骤7:ConflictEngine(剧情冲突场景 + 多路径解决) + Resistance(强迫抵抗)
 * 阶段3 步骤8:PhoneEngine + ComputerEngine + ShopEngine(90年代手机/电脑/商城)
 * 阶段3 步骤10:TriggeredAiInvoker(6个触发型 AI 实际调用)
 */
export * from './mvu-runtime';
export * from './getwi-loader';
export * from './ejs-engine';
export * from './worldbook-selector';
export * from './getwi-scheduler';
export * from './schema-loader';
export * from './mvu-transaction';
export * from './kernel';
export * from './lcg-engine';
export * from './preset';
export * from './prompt-assembly';
export * from './model-gateway';
export * from './recovery';
export * from './e2e-verifier';
export * from './trigger-dispatcher';
export * from './combat-engine';
export * from './cg-gallery';
export * from './achievement-engine';
export * from './replay-engine';
export * from './conflict-engine';
export * from './phone-engine';
export * from './computer-engine';
export * from './shop-engine';
export * from './rpg-engine';
export * from './triggered-ai-invoker';
