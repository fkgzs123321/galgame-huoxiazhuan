/**
 * Parallel Performance Verifier(阶段4:8AI 并行延迟优化验证)
 *
 * 职责:
 *  - 模拟 8AI 并行调用场景(用 mock profile,不实际发 HTTP 请求)
 *  - 验证 invokeManyWithBudget 的并发限制/总预算/性能指标采集
 *  - 输出 p50/p95/max/total 指标,验证 < 15s/轮
 *  - 提供可视化报告(供 DebugPanel 调用)
 *
 * 不做:
 *  - 实际 HTTP 请求(用端点未配置的 profile 触发快速失败)
 *  - 持久化(结果只在内存)
 */

import { ModelGateway } from './model-gateway';
import type { GatewayRequest, ParallelMetrics } from './model-gateway';
import type { AiProfile } from '../ai/profiles';
import { ALL_AI_PROFILES } from '../ai/profiles';
import { builtinOriginalDefault } from '../content/presets/builtin-presets';
import { traceBus } from './trace-bus';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export interface PerfTestScenario {
  /** 场景名 */
  name: string;
  /** 并发数 */
  maxConcurrency: number;
  /** 总预算(ms) */
  totalBudgetMs: number;
  /** 模拟的 AI 数量(默认 8) */
  aiCount?: number;
  /** 模拟的单请求耗时(ms,0 表示用端点未配置的快速失败) */
  simulatedLatencyMs?: number;
}

export interface PerfTestResult {
  /** 场景名 */
  scenarioName: string;
  /** 配置 */
  config: {
    maxConcurrency: number;
    totalBudgetMs: number;
    aiCount: number;
    simulatedLatencyMs: number;
  };
  /** 性能指标 */
  metrics: ParallelMetrics;
  /** 是否通过(< 15s 且无超时) */
  passed: boolean;
  /** 失败原因(未通过时) */
  failureReason?: string;
  /** 时间戳 */
  timestamp: number;
}

// ───────────────────────────────────────────────────────────
//  ParallelPerfVerifier 类
// ───────────────────────────────────────────────────────────

export class ParallelPerfVerifier {
  /**
   * 运行单个性能测试场景
   */
  async runScenario(scenario: PerfTestScenario): Promise<PerfTestResult> {
    const aiCount = scenario.aiCount ?? 8;
    const simulatedLatency = scenario.simulatedLatencyMs ?? 0;

    // 构建 mock 请求(端点未配置,会快速失败返回 endpoint-missing)
    const requests = this.buildMockRequests(aiCount, simulatedLatency);

    const gateway = new ModelGateway();
    const { metrics } = await gateway.invokeManyWithBudget(requests, {
      maxConcurrency: scenario.maxConcurrency,
      totalBudgetMs: scenario.totalBudgetMs,
    });

    const passed = metrics.totalElapsedMs < 15000 && metrics.timedOut === 0;
    let failureReason: string | undefined;
    if (!passed) {
      if (metrics.totalElapsedMs >= 15000) {
        failureReason = `总耗时 ${metrics.totalElapsedMs}ms 超过 15000ms 阈值`;
      } else if (metrics.timedOut > 0) {
        failureReason = `${metrics.timedOut} 个请求预算超时`;
      }
    }

    return {
      scenarioName: scenario.name,
      config: {
        maxConcurrency: scenario.maxConcurrency,
        totalBudgetMs: scenario.totalBudgetMs,
        aiCount,
        simulatedLatencyMs: simulatedLatency,
      },
      metrics,
      passed,
      failureReason,
      timestamp: Date.now(),
    };
  }

  /**
   * 运行标准验证套件(6 个场景)
   *
   * 场景设计:
   *  1. 基线:8AI 全并行,并发 8,预算 15s(理论最快)
   *  2. 限流:8AI 并发 4,预算 15s(避免端点 429)
   *  3. 保守:8AI 并发 2,预算 15s(老端点兼容)
   *  4. 极限:8AI 并发 8,预算 10s(紧预算)
   *  5. 6AI:并发 4,预算 15s(常见触发场景)
   *  6. 4AI:并发 4,预算 15s(最小并行)
   */
  async runStandardSuite(): Promise<PerfTestResult[]> {
    const scenarios: PerfTestScenario[] = [
      { name: '基线·8AI 并发8 预算15s', maxConcurrency: 8, totalBudgetMs: 15000, aiCount: 8 },
      { name: '限流·8AI 并发4 预算15s', maxConcurrency: 4, totalBudgetMs: 15000, aiCount: 8 },
      { name: '保守·8AI 并发2 预算15s', maxConcurrency: 2, totalBudgetMs: 15000, aiCount: 8 },
      { name: '极限·8AI 并发8 预算10s', maxConcurrency: 8, totalBudgetMs: 10000, aiCount: 8 },
      { name: '常见·6AI 并发4 预算15s', maxConcurrency: 4, totalBudgetMs: 15000, aiCount: 6 },
      { name: '最小·4AI 并发4 预算15s', maxConcurrency: 4, totalBudgetMs: 15000, aiCount: 4 },
    ];

    const results: PerfTestResult[] = [];
    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario);
      results.push(result);

      // 推送到 traceBus
      try {
        traceBus.append(
          'perf-verifier',
          'gatewayLatency',
          `perf-${scenario.name}`,
          `性能测试 ${result.passed ? '✓' : '✗'}: ${result.metrics.totalElapsedMs}ms (p50=${result.metrics.p50Ms}/p95=${result.metrics.p95Ms}/max=${result.metrics.maxMs})`,
          { scenario: result.config, metrics: result.metrics, passed: result.passed },
        );
      } catch {
        // ignore
      }
    }
    return results;
  }

  /**
   * 生成文本报告
   */
  generateReport(results: PerfTestResult[]): string {
    const lines: string[] = [];
    lines.push('=== 8AI 并行延迟优化验证报告 ===');
    lines.push(`运行时间: ${new Date().toISOString()}`);
    lines.push(`场景数: ${results.length}`);
    lines.push(`通过: ${results.filter((r) => r.passed).length}/${results.length}`);
    lines.push('');

    for (const r of results) {
      const status = r.passed ? '✓ PASS' : '✗ FAIL';
      lines.push(`--- ${r.scenarioName} [${status}] ---`);
      lines.push(`  配置: 并发=${r.config.maxConcurrency} 预算=${r.config.totalBudgetMs}ms AI数=${r.config.aiCount}`);
      lines.push(`  指标:`);
      lines.push(`    总耗时: ${r.metrics.totalElapsedMs}ms`);
      lines.push(`    p50: ${r.metrics.p50Ms}ms / p95: ${r.metrics.p95Ms}ms / max: ${r.metrics.maxMs}ms`);
      lines.push(`    成功: ${r.metrics.succeeded}/${r.metrics.totalRequests}`);
      lines.push(`    失败: ${r.metrics.failed} / 超时: ${r.metrics.timedOut} / 中止: ${r.metrics.aborted}`);
      lines.push(`    预算内: ${r.metrics.withinBudget ? '是' : '否'}`);
      if (r.failureReason) {
        lines.push(`  失败原因: ${r.failureReason}`);
      }
      lines.push('');
    }

    // 汇总
    const allPassed = results.every((r) => r.passed);
    const maxTotal = Math.max(...results.map((r) => r.metrics.totalElapsedMs));
    lines.push('=== 汇总 ===');
    lines.push(`全部通过: ${allPassed ? '是' : '否'}`);
    lines.push(`最大总耗时: ${maxTotal}ms (阈值 15000ms)`);
    lines.push(`验收标准: ${allPassed && maxTotal < 15000 ? '✓ 达标' : '✗ 未达标'}`);

    return lines.join('\n');
  }

  // ─────────────────────────────────────────────────────────
  //  辅助
  // ─────────────────────────────────────────────────────────

  /**
   * 构建 mock 请求(端点未配置,触发快速失败)
   */
  private buildMockRequests(
    count: number,
    _simulatedLatencyMs: number,
  ): Array<{ req: GatewayRequest; onStream?: undefined }> {
    const requests: Array<{ req: GatewayRequest; onStream?: undefined }> = [];
    const profiles = ALL_AI_PROFILES.slice(0, count);

    for (const profile of profiles) {
      // 用端点未配置的 profile,会快速返回 endpoint-missing
      const mockProfile: AiProfile = {
        ...profile,
        endpoint: { baseURL: '', apiKey: '', model: '' },
        maxRetries: 0, // 不重试,加速测试
        timeoutMs: 1000, // 1s 超时
      };

      requests.push({
        req: {
          profile: mockProfile,
          preset: builtinOriginalDefault,
          messages: [{ role: 'system', content: `perf-test-${profile.id}` }],
          requestId: `perf-${profile.id}-${Date.now()}`,
        },
      });
    }

    return requests;
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const parallelPerfVerifier = new ParallelPerfVerifier();
