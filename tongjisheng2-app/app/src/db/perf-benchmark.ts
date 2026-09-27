/**
 * IndexedDB Performance Benchmark(阶段4:性能调优验证)
 *
 * 职责:
 *  - 测量批量写/索引查询/前缀查询/链式回溯等关键操作延迟
 *  - 验证查询 < 200ms 的验收标准
 *  - 输出可视化报告(供 DebugPanel 调用)
 *
 * 测试场景:
 *  1. 批量写 chatSheets:1000 行单事务 vs 逐行
 *  2. 批量写 KV:100 条单事务 vs 逐条
 *  3. 索引查询:listRevisions(scope) 1000 条
 *  4. 前缀查询:kvList(prefix) 100 条
 *  5. 链式回溯:traceRevisionChain 50 层
 */

import * as idb from './indexeddb';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export interface BenchResult {
  /** 场景名 */
  scenarioName: string;
  /** 操作描述 */
  operation: string;
  /** 耗时(ms) */
  elapsedMs: number;
  /** 记录数 */
  recordCount: number;
  /** 是否通过(查询 < 200ms,写入 < 1000ms) */
  passed: boolean;
  /** 阈值(ms) */
  thresholdMs: number;
  /** 备注 */
  note?: string;
}

// ───────────────────────────────────────────────────────────
//  IndexedDBPerfBenchmark 类
// ───────────────────────────────────────────────────────────

export class IndexedDBPerfBenchmark {
  /** 测试数据前缀(避免与生产数据冲突) */
  private readonly PREFIX = '__perf_test__';

  /**
   * 运行完整基准测试套件
   */
  async runFullSuite(): Promise<BenchResult[]> {
    const results: BenchResult[] = [];

    // 清理之前的测试数据
    await this.cleanup();

    // 场景1:批量写 chatSheets(1000 行单事务)
    results.push(await this.benchSheetBatchWrite(1000));

    // 场景2:逐行写 chatSheets(100 行,对比)
    results.push(await this.benchSheetRowByRowWrite(100));

    // 场景3:批量写 KV(100 条单事务)
    results.push(await this.benchKvBatchWrite(100));

    // 场景4:索引查询 sheetList
    results.push(await this.benchSheetListQuery());

    // 场景5:前缀查询 kvList
    results.push(await this.benchKvPrefixQuery());

    // 场景6:revision 链式回溯
    results.push(await this.benchRevisionChain(50));

    // 场景7:listRevisions(scope) 索引查询
    results.push(await this.benchListRevisionsByScope());

    // 清理测试数据
    await this.cleanup();

    return results;
  }

  /**
   * 场景1:批量写 chatSheets(单事务)
   */
  private async benchSheetBatchWrite(count: number): Promise<BenchResult> {
    const rows: idb.ChatSheetRow[] = [];
    for (let i = 0; i < count; i++) {
      rows.push({
        table_name: `${this.PREFIX}bench_table`,
        row_id: `row_${i}`,
        data: { index: i, content: `test content ${i}`, nested: { a: i, b: `str${i}` } },
        updatedAt: Date.now(),
      });
    }

    const start = Date.now();
    await idb.sheetBatchUpsert(rows);
    const elapsed = Date.now() - start;

    return {
      scenarioName: 'chatSheets 批量写(单事务)',
      operation: `sheetBatchUpsert ${count} 行`,
      elapsedMs: elapsed,
      recordCount: count,
      passed: elapsed < 1000,
      thresholdMs: 1000,
      note: `平均 ${(elapsed / count).toFixed(2)}ms/行`,
    };
  }

  /**
   * 场景2:逐行写 chatSheets(对比)
   */
  private async benchSheetRowByRowWrite(count: number): Promise<BenchResult> {
    const start = Date.now();
    for (let i = 0; i < count; i++) {
      await idb.sheetUpsert({
        table_name: `${this.PREFIX}bench_rowbyrow`,
        row_id: `row_${i}`,
        data: { index: i, content: `test ${i}` },
        updatedAt: Date.now(),
      });
    }
    const elapsed = Date.now() - start;

    return {
      scenarioName: 'chatSheets 逐行写(对比)',
      operation: `sheetUpsert × ${count} 次`,
      elapsedMs: elapsed,
      recordCount: count,
      passed: true, // 对比场景,总是 pass
      thresholdMs: 5000,
      note: `平均 ${(elapsed / count).toFixed(2)}ms/行(对比批量写的性能差异)`,
    };
  }

  /**
   * 场景3:批量写 KV(单事务)
   */
  private async benchKvBatchWrite(count: number): Promise<BenchResult> {
    const entries: Array<{ key: string; value: unknown }> = [];
    for (let i = 0; i < count; i++) {
      entries.push({
        key: `${this.PREFIX}kv_${i}`,
        value: { index: i, data: `value ${i}` },
      });
    }

    const start = Date.now();
    await idb.kvBatchSet(entries);
    const elapsed = Date.now() - start;

    return {
      scenarioName: 'KV 批量写(单事务)',
      operation: `kvBatchSet ${count} 条`,
      elapsedMs: elapsed,
      recordCount: count,
      passed: elapsed < 500,
      thresholdMs: 500,
      note: `平均 ${(elapsed / count).toFixed(2)}ms/条`,
    };
  }

  /**
   * 场景4:索引查询 sheetList
   */
  private async benchSheetListQuery(): Promise<BenchResult> {
    const start = Date.now();
    const rows = await idb.sheetList(`${this.PREFIX}bench_table`);
    const elapsed = Date.now() - start;

    return {
      scenarioName: 'sheetList 索引查询',
      operation: `sheetList(table=${this.PREFIX}bench_table)`,
      elapsedMs: elapsed,
      recordCount: rows.length,
      passed: elapsed < 200,
      thresholdMs: 200,
      note: `返回 ${rows.length} 行`,
    };
  }

  /**
   * 场景5:前缀查询 kvList
   */
  private async benchKvPrefixQuery(): Promise<BenchResult> {
    const start = Date.now();
    const values = await idb.kvList(`${this.PREFIX}kv_`);
    const elapsed = Date.now() - start;

    return {
      scenarioName: 'kvList 前缀查询(key range)',
      operation: `kvList(prefix=${this.PREFIX}kv_)`,
      elapsedMs: elapsed,
      recordCount: values.length,
      passed: elapsed < 200,
      thresholdMs: 200,
      note: `返回 ${values.length} 条`,
    };
  }

  /**
   * 场景6:revision 链式回溯
   */
  private async benchRevisionChain(depth: number): Promise<BenchResult> {
    // 先创建一条 depth 长度的链
    let parentHash: string | null = null;
    for (let i = 0; i < depth; i++) {
      const rev = await idb.createRevision({
        content: { depth: i, label: `bench_chain_${i}` },
        parentHash,
        scope: 'auto',
        label: `bench_chain_${i}`,
      });
      parentHash = rev.hash;
    }

    if (!parentHash) {
      return {
        scenarioName: 'revision 链式回溯',
        operation: 'traceRevisionChain',
        elapsedMs: 0,
        recordCount: 0,
        passed: false,
        thresholdMs: 200,
        note: '未创建到 revision',
      };
    }

    const start = Date.now();
    const chain = await idb.traceRevisionChain(parentHash);
    const elapsed = Date.now() - start;

    return {
      scenarioName: 'revision 链式回溯',
      operation: `traceRevisionChain(depth=${depth})`,
      elapsedMs: elapsed,
      recordCount: chain.length,
      passed: elapsed < 200,
      thresholdMs: 200,
      note: `回溯 ${chain.length} 层`,
    };
  }

  /**
   * 场景7:listRevisions(scope) 索引查询
   */
  private async benchListRevisionsByScope(): Promise<BenchResult> {
    const start = Date.now();
    const revisions = await idb.listRevisions('auto', 100);
    const elapsed = Date.now() - start;

    return {
      scenarioName: 'listRevisions 索引查询',
      operation: `listRevisions(scope=auto, limit=100)`,
      elapsedMs: elapsed,
      recordCount: revisions.length,
      passed: elapsed < 200,
      thresholdMs: 200,
      note: `返回 ${revisions.length} 条`,
    };
  }

  /**
   * 生成文本报告
   */
  generateReport(results: BenchResult[]): string {
    const lines: string[] = [];
    lines.push('=== IndexedDB 性能基准测试报告 ===');
    lines.push(`运行时间: ${new Date().toISOString()}`);
    lines.push(`场景数: ${results.length}`);
    lines.push(`通过: ${results.filter((r) => r.passed).length}/${results.length}`);
    lines.push('');

    for (const r of results) {
      const status = r.passed ? '✓ PASS' : '✗ FAIL';
      lines.push(`--- ${r.scenarioName} [${status}] ---`);
      lines.push(`  操作: ${r.operation}`);
      lines.push(`  耗时: ${r.elapsedMs}ms / 阈值 ${r.thresholdMs}ms`);
      lines.push(`  记录数: ${r.recordCount}`);
      if (r.note) {
        lines.push(`  备注: ${r.note}`);
      }
      lines.push('');
    }

    const allPassed = results.every((r) => r.passed);
    const queries = results.filter((r) => r.thresholdMs === 200);
    const maxQuery = queries.length > 0 ? Math.max(...queries.map((r) => r.elapsedMs)) : 0;
    lines.push('=== 汇总 ===');
    lines.push(`全部通过: ${allPassed ? '是' : '否'}`);
    lines.push(`查询最大耗时: ${maxQuery}ms (阈值 200ms)`);
    lines.push(`验收标准(查询<200ms): ${maxQuery < 200 ? '✓ 达标' : '✗ 未达标'}`);

    return lines.join('\n');
  }

  /**
   * 清理测试数据
   */
  private async cleanup(): Promise<void> {
    try {
      // 清理 chatSheets 测试表
      await idb.sheetClear(`${this.PREFIX}bench_table`);
      await idb.sheetClear(`${this.PREFIX}bench_rowbyrow`);

      // 清理 KV 测试键
      const keys = await idb.kvKeys(this.PREFIX);
      for (const key of keys) {
        await idb.kvDelete(key);
      }
    } catch (e) {
      console.warn('[perf-benchmark] cleanup 失败:', e);
    }
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const indexedDBPerfBenchmark = new IndexedDBPerfBenchmark();
