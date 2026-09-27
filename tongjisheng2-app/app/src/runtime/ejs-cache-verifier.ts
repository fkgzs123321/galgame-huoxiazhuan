/**
 * EJS Cache Verifier(阶段4:EJS 预处理缓存验证)
 *
 * 职责:
 *  - 测量 EJS 编译缓存的命中率
 *  - 验证缓存对渲染性能的提升
 *  - 输出缓存统计报告
 *
 * 测试场景:
 *  1. 重复渲染同一模板(应命中缓存)
 *  2. 渲染不同模板(应未命中)
 *  3. 混合场景(80% 重复 + 20% 新模板,验证实际命中率)
 */

import { EjsEngine, getCacheStats, clearCache, type CacheStats } from './ejs-engine';
import type { MvuRuntime } from './mvu-runtime';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export interface EjsCacheTestResult {
  /** 场景名 */
  scenarioName: string;
  /** 操作描述 */
  operation: string;
  /** 总渲染次数 */
  totalRenders: number;
  /** 缓存命中次数 */
  cacheHits: number;
  /** 缓存未命中次数 */
  cacheMisses: number;
  /** 命中率(0-1) */
  hitRate: number;
  /** 总耗时(ms) */
  elapsedMs: number;
  /** 平均每次渲染耗时(ms) */
  avgRenderMs: number;
  /** 缓存大小 */
  cacheSize: number;
  /** 是否通过(命中率 > 阈值) */
  passed: boolean;
  /** 阈值 */
  threshold: number;
  /** 备注 */
  note?: string;
}

// ───────────────────────────────────────────────────────────
//  EjsCacheVerifier 类
// ───────────────────────────────────────────────────────────

export class EjsCacheVerifier {
  /**
   * 运行完整缓存验证套件
   */
  async runFullSuite(mvu: MvuRuntime): Promise<EjsCacheTestResult[]> {
    const results: EjsCacheTestResult[] = [];
    const engine = new EjsEngine(mvu);

    // 清空缓存,确保测试干净
    clearCache();

    // 场景1:重复渲染同一模板(应 100% 命中)
    results.push(await this.benchRepeatSameTemplate(engine));

    // 场景2:渲染不同模板(应 0% 命中)
    results.push(await this.benchDifferentTemplates(engine));

    // 场景3:混合场景(80% 重复 + 20% 新)
    results.push(await this.benchMixedScenario(engine));

    return results;
  }

  /**
   * 场景1:重复渲染同一模板 20 次
   * 预期:第 1 次未命中,后续 19 次命中,命中率 95%
   */
  private async benchRepeatSameTemplate(engine: EjsEngine): Promise<EjsCacheTestResult> {
    const template = 'Hello <%= user %>,今天是 <%= getvar("stat_data.时间.天数") || 1 %> 天';
    const repeatCount = 20;

    clearCache();
    const start = Date.now();
    for (let i = 0; i < repeatCount; i++) {
      await engine.render(template, {
        filename: 'repeat-test.ejs',
        extra: { user: `user_${i}` },
      });
    }
    const elapsed = Date.now() - start;

    const stats = getCacheStats();
    const passed = stats.hitRate >= 0.9; // 至少 90% 命中

    return {
      scenarioName: '重复渲染同一模板(20 次)',
      operation: `render(same template) × ${repeatCount}`,
      totalRenders: stats.totalRenders,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      hitRate: stats.hitRate,
      elapsedMs: elapsed,
      avgRenderMs: elapsed / repeatCount,
      cacheSize: stats.size,
      passed,
      threshold: 0.9,
      note: `预期命中率 ≥ 90%(第 1 次未命中,后续命中)`,
    };
  }

  /**
   * 场景2:渲染 10 个不同模板
   * 预期:全部未命中(0%),缓存大小 10
   */
  private async benchDifferentTemplates(engine: EjsEngine): Promise<EjsCacheTestResult> {
    const templates: Array<{ source: string; filename: string }> = [];
    for (let i = 0; i < 10; i++) {
      templates.push({
        source: `Template ${i}: <%= user %> <%= ${i} * 2 %>`,
        filename: `different-${i}.ejs`,
      });
    }

    clearCache();
    const start = Date.now();
    for (const { source, filename } of templates) {
      await engine.render(source, { filename, extra: { user: 'test' } });
    }
    const elapsed = Date.now() - start;

    const stats = getCacheStats();
    // 全部未命中是预期行为
    const passed = stats.hitRate === 0 && stats.size === 10;

    return {
      scenarioName: '渲染不同模板(10 个)',
      operation: `render(10 different templates)`,
      totalRenders: stats.totalRenders,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      hitRate: stats.hitRate,
      elapsedMs: elapsed,
      avgRenderMs: elapsed / 10,
      cacheSize: stats.size,
      passed,
      threshold: 0,
      note: `预期命中率 0%(全部新模板),缓存大小应为 10`,
    };
  }

  /**
   * 场景3:混合场景(80% 重复 + 20% 新模板)
   * 预期:命中率接近 80%
   */
  private async benchMixedScenario(engine: EjsEngine): Promise<EjsCacheTestResult> {
    // 准备 5 个模板,每个渲染 4 次,共 20 次渲染
    // 第 1 次未命中,后续 3 次命中 → 命中 15/20 = 75%
    const templates: Array<{ source: string; filename: string }> = [];
    for (let i = 0; i < 5; i++) {
      templates.push({
        source: `Mixed template ${i}: <%= user %> / <%= getvar("stat_data.test_${i}") || 'default' %>`,
        filename: `mixed-${i}.ejs`,
      });
    }

    clearCache();
    const start = Date.now();
    // 每个模板渲染 4 次
    for (let round = 0; round < 4; round++) {
      for (const { source, filename } of templates) {
        await engine.render(source, { filename, extra: { user: `round${round}` } });
      }
    }
    const elapsed = Date.now() - start;

    const stats = getCacheStats();
    // 5 个模板 × 4 轮 = 20 次渲染,5 次未命中(第 1 轮),15 次命中
    const expectedHitRate = 15 / 20; // 75%
    const passed = Math.abs(stats.hitRate - expectedHitRate) < 0.1; // 允许 10% 误差

    return {
      scenarioName: '混合场景(5 模板 × 4 轮)',
      operation: `render(5 templates × 4 rounds)`,
      totalRenders: stats.totalRenders,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      hitRate: stats.hitRate,
      elapsedMs: elapsed,
      avgRenderMs: elapsed / 20,
      cacheSize: stats.size,
      passed,
      threshold: expectedHitRate,
      note: `预期命中率 ~75%(5 模板各渲染 4 次,首轮未命中)`,
    };
  }

  /**
   * 获取当前缓存统计
   */
  getCurrentStats(): CacheStats {
    return getCacheStats();
  }

  /**
   * 生成文本报告
   */
  generateReport(results: EjsCacheTestResult[]): string {
    const lines: string[] = [];
    lines.push('=== EJS 编译缓存验证报告 ===');
    lines.push(`运行时间: ${new Date().toISOString()}`);
    lines.push(`场景数: ${results.length}`);
    lines.push(`通过: ${results.filter((r) => r.passed).length}/${results.length}`);
    lines.push('');

    for (const r of results) {
      const status = r.passed ? '✓ PASS' : '✗ FAIL';
      lines.push(`--- ${r.scenarioName} [${status}] ---`);
      lines.push(`  操作: ${r.operation}`);
      lines.push(`  渲染次数: ${r.totalRenders} / 命中: ${r.cacheHits} / 未命中: ${r.cacheMisses}`);
      lines.push(`  命中率: ${(r.hitRate * 100).toFixed(1)}% (阈值 ${(r.threshold * 100).toFixed(0)}%)`);
      lines.push(`  总耗时: ${r.elapsedMs}ms / 平均: ${r.avgRenderMs.toFixed(2)}ms/次`);
      lines.push(`  缓存大小: ${r.cacheSize}`);
      if (r.note) {
        lines.push(`  备注: ${r.note}`);
      }
      lines.push('');
    }

    const allPassed = results.every((r) => r.passed);
    const avgHitRate = results.length > 0
      ? results.reduce((sum, r) => sum + r.hitRate, 0) / results.length
      : 0;
    lines.push('=== 汇总 ===');
    lines.push(`全部通过: ${allPassed ? '是' : '否'}`);
    lines.push(`平均命中率: ${(avgHitRate * 100).toFixed(1)}%`);
    lines.push(`验收标准(重复场景命中率≥90%): ${allPassed ? '✓ 达标' : '✗ 未达标'}`);

    return lines.join('\n');
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const ejsCacheVerifier = new EjsCacheVerifier();
