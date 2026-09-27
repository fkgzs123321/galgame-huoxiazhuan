/**
 * E2E Verifier 面板(步骤9 UI)
 *
 * 职责:
 *  - 显示 6 个场景的元信息与运行状态
 *  - 提供"运行全部"与"单场景运行"按钮
 *  - 展示场景结果(ok/证据/断言详情/错误)
 *  - 展示 5 类 Trace(aiCall/getwiLoad/variableUpdate/worldbookHit/presetApply)
 *  - 展示汇总报告(通过/失败/总耗时)
 *
 * 不做:
 *  - 实际场景执行(通过回调通知父组件调用 e2eVerifier)
 */

import { useState, type CSSProperties } from 'react';
import {
  e2eVerifier,
  SCENARIO_META,
  type E2EReport,
  type ScenarioResult,
  type TraceEntry,
  type TraceCategory,
} from '@runtime/e2e-verifier';
import {
  behaviorCaseVerifier,
  type BehaviorReport,
  type BehaviorCaseResult,
  type BehaviorTraceEntry,
  type BehaviorTraceCategory,
} from '@runtime/behavior-cases';
import {
  failureDrillRunner,
  FAILURE_DRILL_META,
  type FailureDrillReport,
  type FailureDrillResult,
} from '@runtime/failure-recovery-drills';
import {
  realModelVerifier,
  REAL_MODEL_CASE_META,
  detectBrowserEnvironment,
  type RealModelReport,
  type RealModelCaseResult,
  type RealModelEndpointConfig,
} from '@runtime/real-model-verifier';
import { THEME_VARS } from './types';

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface E2EVerifierProps {
  /** 是否只读 */
  readOnly?: boolean;
}

// ───────────────────────────────────────────────────────────
//  Trace 类别元信息
// ───────────────────────────────────────────────────────────

const TRACE_CATEGORY_META: Record<TraceCategory, { label: string; color: string; icon: string }> = {
  aiCall: { label: 'AI 调用链', color: 'var(--c-primary)', icon: '🤖' },
  getwiLoad: { label: 'getwi 加载', color: 'var(--c-success)', icon: '📂' },
  variableUpdate: { label: '变量更新', color: 'var(--c-warning)', icon: '📊' },
  worldbookHit: { label: '世界书命中', color: 'var(--c-info, #3b82f6)', icon: '📖' },
  presetApply: { label: '预设应用', color: 'var(--c-danger)', icon: '⚙️' },
};

// ───────────────────────────────────────────────────────────
//  组件
// ───────────────────────────────────────────────────────────

export function E2EVerifier({ readOnly = false }: E2EVerifierProps) {
  const [tab, setTab] = useState<'e2e' | 'behavior' | 'drills' | 'real-model'>('e2e');
  const [report, setReport] = useState<E2EReport | null>(null);
  const [behaviorReport, setBehaviorReport] = useState<BehaviorReport | null>(null);
  const [drillReport, setDrillReport] = useState<FailureDrillReport | null>(null);
  const [realModelReport, setRealModelReport] = useState<RealModelReport | null>(null);
  // 真实模型端点配置(本地状态,不持久化,不导出)
  const [endpointCfg, setEndpointCfg] = useState<RealModelEndpointConfig>({
    baseURL: '',
    apiKey: '',
    model: '',
    testStream: true,
    testParallel8: false,
  });
  const [running, setRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [traceFilter, setTraceFilter] = useState<TraceCategory | 'all'>('all');
  const [behaviorTraceFilter, setBehaviorTraceFilter] = useState<BehaviorTraceCategory | 'all'>('all');
  const [message, setMessage] = useState<{ type: 'ok' | 'fail' | 'info'; text: string } | null>(null);
  const [browserEnv] = useState(() => detectBrowserEnvironment());

  // 运行全部
  const handleRunAll = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const r = await e2eVerifier.runAll();
      setReport(r);
      setMessage({
        type: r.ok ? 'ok' : 'fail',
        text: r.ok
          ? `全部通过:${r.passed}/${r.total} 场景,耗时 ${r.elapsedMs}ms`
          : `有失败:${r.passed}/${r.total} 通过,${r.failed} 失败`,
      });
    } catch (e) {
      setMessage({ type: 'fail', text: `运行异常: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRunning(false);
      setCurrentScenario(null);
    }
  };

  // 单场景运行
  const handleRunOne = async (id: string) => {
    setRunning(true);
    setCurrentScenario(id);
    setMessage(null);
    try {
      const r = await e2eVerifier.runOne(id);
      if (!r) {
        setMessage({ type: 'fail', text: `场景 ${id} 不存在` });
        return;
      }
      // 合并到现有 report
      setReport((prev) => {
        if (!prev) {
          return {
            ok: r.ok,
            passed: r.ok ? 1 : 0,
            failed: r.ok ? 0 : 1,
            total: 1,
            results: [r],
            allTraces: r.traces,
            elapsedMs: r.elapsedMs,
          };
        }
        const idx = prev.results.findIndex((x) => x.id === r.id);
        const newResults = idx >= 0
          ? prev.results.map((x) => (x.id === r.id ? r : x))
          : [...prev.results, r];
        const passed = newResults.filter((x) => x.ok).length;
        return {
          ok: passed === newResults.length,
          passed,
          failed: newResults.length - passed,
          total: newResults.length,
          results: newResults,
          allTraces: newResults.flatMap((x) => x.traces),
          elapsedMs: prev.elapsedMs + r.elapsedMs,
        };
      });
      setMessage({
        type: r.ok ? 'ok' : 'fail',
        text: `场景 ${r.name} ${r.ok ? '通过' : '失败'},耗时 ${r.elapsedMs}ms`,
      });
    } catch (e) {
      setMessage({ type: 'fail', text: `运行异常: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRunning(false);
      setCurrentScenario(null);
    }
  };

  // 行为案例:运行全部
  const handleBehaviorRunAll = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const r = await behaviorCaseVerifier.runAll();
      setBehaviorReport(r);
      setMessage({
        type: r.ok ? 'ok' : 'fail',
        text: r.ok
          ? `行为案例全部通过:${r.passed}/${r.total},耗时 ${r.elapsedMs}ms`
          : `有失败:${r.passed}/${r.total} 通过,${r.failed} 失败`,
      });
    } catch (e) {
      setMessage({ type: 'fail', text: `运行异常: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRunning(false);
      setCurrentScenario(null);
    }
  };

  // 行为案例:运行单个
  const handleBehaviorRunOne = async (id: string) => {
    setRunning(true);
    setCurrentScenario(id);
    setMessage(null);
    try {
      const r = await behaviorCaseVerifier.runOne(id);
      if (!r) {
        setMessage({ type: 'fail', text: `行为案例 ${id} 不存在` });
        return;
      }
      setBehaviorReport((prev) => {
        if (!prev) {
          return {
            ok: r.ok,
            passed: r.ok ? 1 : 0,
            failed: r.ok ? 0 : 1,
            total: 1,
            results: [r],
            allTraces: r.traces,
            elapsedMs: r.elapsedMs,
          };
        }
        const idx = prev.results.findIndex((x) => x.id === r.id);
        const newResults = idx >= 0
          ? prev.results.map((x) => (x.id === r.id ? r : x))
          : [...prev.results, r];
        const passed = newResults.filter((x) => x.ok).length;
        return {
          ok: passed === newResults.length,
          passed,
          failed: newResults.length - passed,
          total: newResults.length,
          results: newResults,
          allTraces: newResults.flatMap((x) => x.traces),
          elapsedMs: prev.elapsedMs + r.elapsedMs,
        };
      });
      setMessage({
        type: r.ok ? 'ok' : 'fail',
        text: `案例 ${r.name} ${r.ok ? '通过' : '失败'},耗时 ${r.elapsedMs}ms`,
      });
    } catch (e) {
      setMessage({ type: 'fail', text: `运行异常: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRunning(false);
      setCurrentScenario(null);
    }
  };

  // 过滤 trace
  const filteredTraces = report
    ? traceFilter === 'all'
      ? report.allTraces
      : report.allTraces.filter((t) => t.category === traceFilter)
    : [];

  // 行为案例 trace 过滤
  const filteredBehaviorTraces = behaviorReport
    ? behaviorTraceFilter === 'all'
      ? behaviorReport.allTraces
      : behaviorReport.allTraces.filter((t) => t.category === behaviorTraceFilter)
    : [];

  // 失败演练:运行全部
  const handleDrillRunAll = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const r = await failureDrillRunner.runAll();
      setDrillReport(r);
      setMessage({
        type: r.ok ? 'ok' : 'fail',
        text: r.ok
          ? `失败演练全部通过:${r.passed}/${r.total},耗时 ${r.elapsedMs}ms`
          : `有失败:${r.passed}/${r.total} 通过,${r.failed} 失败`,
      });
    } catch (e) {
      setMessage({ type: 'fail', text: `运行异常: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRunning(false);
      setCurrentScenario(null);
    }
  };

  // 失败演练:运行单个
  const handleDrillRunOne = async (id: string) => {
    setRunning(true);
    setCurrentScenario(id);
    setMessage(null);
    try {
      const r = await failureDrillRunner.runOne(id);
      if (!r) {
        setMessage({ type: 'fail', text: `失败演练 ${id} 不存在` });
        return;
      }
      setDrillReport((prev) => {
        if (!prev) {
          return {
            ok: r.ok,
            passed: r.ok ? 1 : 0,
            failed: r.ok ? 0 : 1,
            total: 1,
            results: [r],
            elapsedMs: r.elapsedMs,
          };
        }
        const idx = prev.results.findIndex((x) => x.id === r.id);
        const newResults = idx >= 0
          ? prev.results.map((x) => (x.id === r.id ? r : x))
          : [...prev.results, r];
        const passed = newResults.filter((x) => x.ok).length;
        return {
          ok: passed === newResults.length,
          passed,
          failed: newResults.length - passed,
          total: newResults.length,
          results: newResults,
          elapsedMs: prev.elapsedMs + r.elapsedMs,
        };
      });
      setMessage({
        type: r.ok ? 'ok' : 'fail',
        text: `演练 ${r.name} ${r.ok ? '通过' : '失败'},耗时 ${r.elapsedMs}ms`,
      });
    } catch (e) {
      setMessage({ type: 'fail', text: `运行异常: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRunning(false);
      setCurrentScenario(null);
    }
  };

  // 真实模型:运行全部
  const handleRealModelRunAll = async () => {
    if (!endpointCfg.baseURL || !endpointCfg.apiKey || !endpointCfg.model) {
      setMessage({ type: 'fail', text: '请先填写 baseURL / apiKey / model' });
      return;
    }
    setRunning(true);
    setMessage(null);
    try {
      const r = await realModelVerifier.runAll(endpointCfg);
      setRealModelReport(r);
      setMessage({
        type: r.ok ? 'ok' : 'fail',
        text: r.ok
          ? `真实模型边界全部通过:${r.passed}/${r.total},耗时 ${r.elapsedMs}ms [${r.environment.browserName}/${r.environment.browserVersion}]`
          : `有失败:${r.passed}/${r.total} 通过,${r.failed} 失败 [${r.environment.browserName}/${r.environment.browserVersion}]`,
      });
    } catch (e) {
      setMessage({ type: 'fail', text: `运行异常: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRunning(false);
      setCurrentScenario(null);
    }
  };

  // 真实模型:运行单个
  const handleRealModelRunOne = async (id: string) => {
    if (!endpointCfg.baseURL || !endpointCfg.apiKey || !endpointCfg.model) {
      setMessage({ type: 'fail', text: '请先填写 baseURL / apiKey / model' });
      return;
    }
    setRunning(true);
    setCurrentScenario(id);
    setMessage(null);
    try {
      const r = await realModelVerifier.runOne(id, endpointCfg);
      if (!r) {
        setMessage({ type: 'fail', text: `场景 ${id} 不存在` });
        return;
      }
      setRealModelReport((prev) => {
        if (!prev) {
          return {
            ok: r.ok,
            passed: r.ok ? 1 : 0,
            failed: r.ok ? 0 : 1,
            total: 1,
            results: [r],
            environment: browserEnv,
            endpointSummary: {
              baseURL: endpointCfg.baseURL,
              model: endpointCfg.model,
              apiKeyMasked: '****',
              testStream: endpointCfg.testStream !== false,
              testParallel8: endpointCfg.testParallel8 === true,
            },
            elapsedMs: r.elapsedMs,
          };
        }
        const idx = prev.results.findIndex((x) => x.id === r.id);
        const newResults = idx >= 0
          ? prev.results.map((x) => (x.id === r.id ? r : x))
          : [...prev.results, r];
        const passed = newResults.filter((x) => x.ok).length;
        return {
          ...prev,
          ok: passed === newResults.length,
          passed,
          failed: newResults.length - passed,
          total: newResults.length,
          results: newResults,
          elapsedMs: prev.elapsedMs + r.elapsedMs,
        };
      });
      setMessage({
        type: r.ok ? 'ok' : 'fail',
        text: `场景 ${r.name} ${r.ok ? '通过' : '失败'},耗时 ${r.elapsedMs}ms`,
      });
    } catch (e) {
      setMessage({ type: 'fail', text: `运行异常: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRunning(false);
      setCurrentScenario(null);
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0, color: THEME_VARS.text, fontSize: 18 }}>端到端验证</h2>
        <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
          E2E 6 场景 + 5 类 Trace · 行为案例 5 项(b1~b5)· 失败演练 7 项(d1~d7)· 真实模型边界 7 项(r1~r7)
        </span>
      </header>

      {/* 浏览器环境条(全 tab 可见) */}
      <div style={{ fontSize: 10, color: THEME_VARS.textMuted, padding: '4px 8px', background: THEME_VARS.overlay, borderRadius: 4, marginBottom: 4 }}>
        浏览器:<strong style={{ color: THEME_VARS.text }}>{browserEnv.browserName} {browserEnv.browserVersion}</strong>
        · 平台:{browserEnv.platform || '?'}
        · fetch={browserEnv.hasFetch ? '✓' : '✗'}
        · AbortController={browserEnv.hasAbortController ? '✓' : '✗'}
        · ReadableStream={browserEnv.hasReadableStream ? '✓' : '✗'}
        · IndexedDB={browserEnv.hasIndexedDB ? '✓' : '✗'}
        · ServiceWorker={browserEnv.hasServiceWorker ? '✓' : '✗'}
        · crypto.subtle={browserEnv.hasCryptoSubtle ? '✓' : '✗'}
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${THEME_VARS.border}`, paddingBottom: 0 }}>
        <button
          onClick={() => setTab('e2e')}
          style={tab === 'e2e' ? tabBtnActiveStyle : tabBtnStyle}
        >
          E2E 场景验证(6)
        </button>
        <button
          onClick={() => setTab('behavior')}
          style={tab === 'behavior' ? tabBtnActiveStyle : tabBtnStyle}
        >
          行为案例验证(5)
        </button>
        <button
          onClick={() => setTab('drills')}
          style={tab === 'drills' ? tabBtnActiveStyle : tabBtnStyle}
        >
          失败恢复演练(7)
        </button>
        <button
          onClick={() => setTab('real-model')}
          style={tab === 'real-model' ? tabBtnActiveStyle : tabBtnStyle}
          title="需要真实 OpenAI 兼容 API 端点"
        >
          真实模型边界(7)
        </button>
      </div>

      {tab === 'e2e' && (
        <>
          {/* 顶部操作 */}
          <section style={sectionStyle}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handleRunAll}
                disabled={running || readOnly}
                style={btnPrimaryStyle}
              >
                {running ? '运行中...' : '运行全部 6 场景'}
              </button>
              <span style={{ fontSize: 12, color: THEME_VARS.textMuted }}>
                {report
                  ? `已运行 ${report.total} 场景,${report.passed} 通过 / ${report.failed} 失败,总耗时 ${report.elapsedMs}ms`
                  : '尚未运行'}
              </span>
            </div>
          </section>

          {/* 场景表 */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>场景列表</h3>
        <div style={tableStyle}>
          {SCENARIO_META.map((meta) => {
            const result = report?.results.find((r) => r.id === meta.id);
            const isRunning = running && currentScenario === meta.id;
            return (
              <div
                key={meta.id}
                style={{
                  ...rowStyle,
                  borderColor: result
                    ? result.ok
                      ? THEME_VARS.success
                      : THEME_VARS.danger
                    : THEME_VARS.border,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <strong style={{ color: THEME_VARS.text, fontSize: 13 }}>
                      {meta.id} · {meta.name}
                    </strong>
                    {result && (
                      <span
                        style={{
                          ...badgeStyle(result.ok ? THEME_VARS.success : THEME_VARS.danger),
                          fontSize: 10,
                        }}
                      >
                        {result.ok ? '✓ 通过' : '✗ 失败'}
                      </span>
                    )}
                    {isRunning && (
                      <span style={{ ...badgeStyle(THEME_VARS.warning), fontSize: 10 }}>
                        运行中...
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginTop: 4 }}>
                    {meta.description}
                  </div>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                    Trace 类别: {meta.traceCategories.map((c) => TRACE_CATEGORY_META[c].label).join(' / ')}
                  </div>
                  {result && (
                    <div style={{ fontSize: 11, color: THEME_VARS.text, marginTop: 4 }}>
                      <strong>证据:</strong> {result.evidence}
                    </div>
                  )}
                  {result && result.errors.length > 0 && (
                    <div style={{ fontSize: 11, color: THEME_VARS.danger, marginTop: 2 }}>
                      <strong>错误:</strong> {result.errors.join('; ')}
                    </div>
                  )}
                  {result && (
                    <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                      断言: {result.assertions.filter((a) => a.ok).length}/{result.assertions.length} 通过 ·
                      耗时 {result.elapsedMs}ms · Trace {result.traces.length} 条
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                  <button
                    onClick={() => handleRunOne(meta.id)}
                    disabled={running || readOnly}
                    style={btnSmallStyle}
                    title="单独运行此场景"
                  >
                    运行
                  </button>
                  {result && (
                    <button
                      onClick={() => setExpandedScenario(expandedScenario === meta.id ? null : meta.id)}
                      style={btnSmallStyle}
                      title="展开断言详情"
                    >
                      {expandedScenario === meta.id ? '收起' : '详情'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 展开的场景断言详情 */}
      {expandedScenario && report && (
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            场景 {expandedScenario} 断言详情
          </h3>
          {(() => {
            const r = report.results.find((x) => x.id === expandedScenario);
            if (!r) return <div style={emptyStyle}>未找到场景结果</div>;
            return (
              <div style={tableStyle}>
                {r.assertions.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      ...rowStyle,
                      padding: '6px 8px',
                      borderColor: a.ok ? THEME_VARS.success : THEME_VARS.danger,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ color: a.ok ? THEME_VARS.success : THEME_VARS.danger, fontWeight: 600 }}>
                        {a.ok ? '✓' : '✗'}
                      </span>{' '}
                      <span style={{ color: THEME_VARS.text, fontSize: 12 }}>{a.name}</span>
                      <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginTop: 2 }}>
                        期望: {a.expected ?? '-'} · 实际: {a.actual ?? '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      {/* 汇总报告 */}
      {report && (
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>汇总报告</h3>
          <div style={{ ...reportStyle, borderColor: report.ok ? THEME_VARS.success : THEME_VARS.danger }}>
            <strong style={{ color: report.ok ? THEME_VARS.success : THEME_VARS.danger }}>
              {report.ok ? '✓ 全部通过' : '✗ 有失败'}
            </strong>
            <span style={{ marginLeft: 12, color: THEME_VARS.textMuted, fontSize: 12 }}>
              {report.passed}/{report.total} 场景通过 · 失败 {report.failed} · 总耗时 {report.elapsedMs}ms ·
              Trace 总数 {report.allTraces.length}
            </span>
          </div>
        </section>
      )}

      {/* Trace 详情 */}
      {report && report.allTraces.length > 0 && (
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Trace 详情({report.allTraces.length} 条)</h3>
          {/* Trace 过滤器 */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setTraceFilter('all')}
              style={traceFilter === 'all' ? traceFilterBtnActiveStyle : traceFilterBtnStyle}
            >
              全部({report.allTraces.length})
            </button>
            {(Object.keys(TRACE_CATEGORY_META) as TraceCategory[]).map((cat) => {
              const count = report.allTraces.filter((t) => t.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setTraceFilter(cat)}
                  style={traceFilter === cat ? traceFilterBtnActiveStyle : traceFilterBtnStyle}
                >
                  {TRACE_CATEGORY_META[cat].icon} {TRACE_CATEGORY_META[cat].label}({count})
                </button>
              );
            })}
          </div>
          {/* Trace 列表 */}
          <div style={{ ...tableStyle, maxHeight: 400, overflowY: 'auto' }}>
            {filteredTraces.length === 0 ? (
              <div style={emptyStyle}>该类别无 Trace</div>
            ) : (
              filteredTraces.map((t, i) => (
                <TraceEntryItem key={i} entry={t} index={i} />
              ))
            )}
          </div>
        </section>
      )}
        </>
      )}

      {/* 行为案例 Tab */}
      {tab === 'behavior' && (
        <>
          {/* 顶部操作 */}
          <section style={sectionStyle}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handleBehaviorRunAll}
                disabled={running || readOnly}
                style={btnPrimaryStyle}
              >
                {running ? '运行中...' : '运行全部 5 案例'}
              </button>
              <span style={{ fontSize: 12, color: THEME_VARS.textMuted }}>
                {behaviorReport
                  ? `已运行 ${behaviorReport.total} 案例,${behaviorReport.passed} 通过 / ${behaviorReport.failed} 失败,总耗时 ${behaviorReport.elapsedMs}ms`
                  : '尚未运行'}
              </span>
            </div>
          </section>

          {/* 案例列表 */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>行为案例列表</h3>
            <div style={tableStyle}>
              {BEHAVIOR_CASE_META.map((meta) => {
                const result = behaviorReport?.results.find((r) => r.id === meta.id);
                const isRunning = running && currentScenario === meta.id;
                return (
                  <div
                    key={meta.id}
                    style={{
                      ...rowStyle,
                      borderColor: result
                        ? result.ok
                          ? THEME_VARS.success
                          : THEME_VARS.danger
                        : THEME_VARS.border,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <strong style={{ color: THEME_VARS.text, fontSize: 13 }}>
                          {meta.id} · {meta.name}
                        </strong>
                        {result && (
                          <span
                            style={{
                              ...badgeStyle(result.ok ? THEME_VARS.success : THEME_VARS.danger),
                              fontSize: 10,
                            }}
                          >
                            {result.ok ? '✓ 通过' : '✗ 失败'}
                          </span>
                        )}
                        {isRunning && (
                          <span style={{ ...badgeStyle(THEME_VARS.warning), fontSize: 10 }}>
                            运行中...
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginTop: 4 }}>
                        {meta.description}
                      </div>
                      <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                        Trace 类别: {meta.traceCategories.map((c) => BEHAVIOR_TRACE_CATEGORY_META[c].label).join(' / ')}
                      </div>
                      {result && (
                        <div style={{ fontSize: 11, color: THEME_VARS.text, marginTop: 4 }}>
                          <strong>证据:</strong> {result.evidence}
                        </div>
                      )}
                      {result && result.errors.length > 0 && (
                        <div style={{ fontSize: 11, color: THEME_VARS.danger, marginTop: 2 }}>
                          <strong>错误:</strong> {result.errors.join('; ')}
                        </div>
                      )}
                      {result && (
                        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                          断言: {result.assertions.filter((a) => a.ok).length}/{result.assertions.length} 通过 ·
                          耗时 {result.elapsedMs}ms · Trace {result.traces.length} 条
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                      <button
                        onClick={() => handleBehaviorRunOne(meta.id)}
                        disabled={running || readOnly}
                        style={btnSmallStyle}
                        title="单独运行此案例"
                      >
                        运行
                      </button>
                      {result && (
                        <button
                          onClick={() => setExpandedScenario(expandedScenario === meta.id ? null : meta.id)}
                          style={btnSmallStyle}
                          title="展开断言详情"
                        >
                          {expandedScenario === meta.id ? '收起' : '详情'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 展开的案例断言详情 */}
          {expandedScenario && behaviorReport && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                案例 {expandedScenario} 断言详情
              </h3>
              {(() => {
                const r = behaviorReport.results.find((x) => x.id === expandedScenario);
                if (!r) return <div style={emptyStyle}>未找到案例结果</div>;
                return (
                  <div style={tableStyle}>
                    {r.assertions.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          ...rowStyle,
                          padding: '6px 8px',
                          borderColor: a.ok ? THEME_VARS.success : THEME_VARS.danger,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{ color: a.ok ? THEME_VARS.success : THEME_VARS.danger, fontWeight: 600 }}>
                            {a.ok ? '✓' : '✗'}
                          </span>{' '}
                          <span style={{ color: THEME_VARS.text, fontSize: 12 }}>{a.name}</span>
                          <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginTop: 2 }}>
                            期望: {a.expected ?? '-'} · 实际: {a.actual ?? '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          )}

          {/* 汇总报告 */}
          {behaviorReport && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>汇总报告</h3>
              <div style={{ ...reportStyle, borderColor: behaviorReport.ok ? THEME_VARS.success : THEME_VARS.danger }}>
                <strong style={{ color: behaviorReport.ok ? THEME_VARS.success : THEME_VARS.danger }}>
                  {behaviorReport.ok ? '✓ 全部通过' : '✗ 有失败'}
                </strong>
                <span style={{ marginLeft: 12, color: THEME_VARS.textMuted, fontSize: 12 }}>
                  {behaviorReport.passed}/{behaviorReport.total} 案例通过 · 失败 {behaviorReport.failed} · 总耗时 {behaviorReport.elapsedMs}ms ·
                  Trace 总数 {behaviorReport.allTraces.length}
                </span>
              </div>
            </section>
          )}

          {/* Trace 详情 */}
          {behaviorReport && behaviorReport.allTraces.length > 0 && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Trace 详情({behaviorReport.allTraces.length} 条)</h3>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setBehaviorTraceFilter('all')}
                  style={behaviorTraceFilter === 'all' ? traceFilterBtnActiveStyle : traceFilterBtnStyle}
                >
                  全部({behaviorReport.allTraces.length})
                </button>
                {(Object.keys(BEHAVIOR_TRACE_CATEGORY_META) as BehaviorTraceCategory[]).map((cat) => {
                  const count = behaviorReport.allTraces.filter((t) => t.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => setBehaviorTraceFilter(cat)}
                      style={behaviorTraceFilter === cat ? traceFilterBtnActiveStyle : traceFilterBtnStyle}
                    >
                      {BEHAVIOR_TRACE_CATEGORY_META[cat].icon} {BEHAVIOR_TRACE_CATEGORY_META[cat].label}({count})
                    </button>
                  );
                })}
              </div>
              <div style={{ ...tableStyle, maxHeight: 400, overflowY: 'auto' }}>
                {filteredBehaviorTraces.length === 0 ? (
                  <div style={emptyStyle}>该类别无 Trace</div>
                ) : (
                  filteredBehaviorTraces.map((t, i) => (
                    <BehaviorTraceEntryItem key={i} entry={t} index={i} />
                  ))
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* 失败演练 Tab */}
      {tab === 'drills' && (
        <>
          {/* 顶部操作 */}
          <section style={sectionStyle}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handleDrillRunAll}
                disabled={running || readOnly}
                style={btnPrimaryStyle}
              >
                {running ? '运行中...' : '运行全部 7 演练'}
              </button>
              <span style={{ fontSize: 12, color: THEME_VARS.textMuted }}>
                {drillReport
                  ? `已运行 ${drillReport.total} 演练,${drillReport.passed} 通过 / ${drillReport.failed} 失败,总耗时 ${drillReport.elapsedMs}ms`
                  : '尚未运行(顺序执行,避免 IDB 并发冲突)'}
              </span>
            </div>
          </section>

          {/* 演练列表 */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>失败演练列表</h3>
            <div style={tableStyle}>
              {FAILURE_DRILL_META.map((meta) => {
                const result = drillReport?.results.find((r) => r.id === meta.id);
                const isRunning = running && currentScenario === meta.id;
                return (
                  <div
                    key={meta.id}
                    style={{
                      ...rowStyle,
                      borderColor: result
                        ? result.ok
                          ? THEME_VARS.success
                          : THEME_VARS.danger
                        : THEME_VARS.border,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <strong style={{ color: THEME_VARS.text, fontSize: 13 }}>
                          {meta.id} · {meta.name}
                        </strong>
                        <span
                          style={{
                            ...badgeStyle(THEME_VARS.warning),
                            fontSize: 10,
                          }}
                        >
                          {meta.failureType}
                        </span>
                        {result && (
                          <span
                            style={{
                              ...badgeStyle(result.ok ? THEME_VARS.success : THEME_VARS.danger),
                              fontSize: 10,
                            }}
                          >
                            {result.ok ? '✓ 通过' : '✗ 失败'}
                          </span>
                        )}
                        {isRunning && (
                          <span style={{ ...badgeStyle(THEME_VARS.warning), fontSize: 10 }}>
                            运行中...
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginTop: 4 }}>
                        {meta.description}
                      </div>
                      {result && (
                        <div style={{ fontSize: 10, color: THEME_VARS.warning, marginTop: 2 }}>
                          <strong>失败注入:</strong> {result.failureInjection}
                        </div>
                      )}
                      {result && (
                        <div style={{ fontSize: 11, color: THEME_VARS.text, marginTop: 4 }}>
                          <strong>证据:</strong> {result.evidence}
                        </div>
                      )}
                      {result && result.errors.length > 0 && (
                        <div style={{ fontSize: 11, color: THEME_VARS.danger, marginTop: 2 }}>
                          <strong>错误:</strong> {result.errors.join('; ')}
                        </div>
                      )}
                      {result && (
                        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                          断言: {result.assertions.filter((a) => a.ok).length}/{result.assertions.length} 通过 ·
                          耗时 {result.elapsedMs}ms
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                      <button
                        onClick={() => handleDrillRunOne(meta.id)}
                        disabled={running || readOnly}
                        style={btnSmallStyle}
                        title="单独运行此演练"
                      >
                        运行
                      </button>
                      {result && (
                        <button
                          onClick={() => setExpandedScenario(expandedScenario === meta.id ? null : meta.id)}
                          style={btnSmallStyle}
                          title="展开断言详情"
                        >
                          {expandedScenario === meta.id ? '收起' : '详情'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 展开的演练断言详情 */}
          {expandedScenario && drillReport && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                演练 {expandedScenario} 断言详情
              </h3>
              {(() => {
                const r = drillReport.results.find((x) => x.id === expandedScenario);
                if (!r) return <div style={emptyStyle}>未找到演练结果</div>;
                return (
                  <div style={tableStyle}>
                    {r.assertions.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          ...rowStyle,
                          borderColor: a.ok ? THEME_VARS.success : THEME_VARS.danger,
                          padding: '6px 8px',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                          <span style={{ color: THEME_VARS.textMuted }}>#{i + 1}</span>
                          <span
                            style={{
                              ...badgeStyle(a.ok ? THEME_VARS.success : THEME_VARS.danger),
                              fontSize: 10,
                            }}
                          >
                            {a.ok ? '✓' : '✗'}
                          </span>
                          <strong style={{ color: THEME_VARS.text }}>{a.name}</strong>
                        </div>
                        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, paddingLeft: 18 }}>
                          期望: {a.expected ?? '(无)'}
                        </div>
                        <div style={{ fontSize: 10, color: a.ok ? THEME_VARS.success : THEME_VARS.danger, marginTop: 2, paddingLeft: 18 }}>
                          实际: {a.actual ?? '(无)'}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          )}
        </>
      )}

      {/* 真实模型边界 Tab */}
      {tab === 'real-model' && (
        <>
          {/* 端点配置入口 */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>端点配置(本地输入,不上传)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: THEME_VARS.text }}>
                <span>baseURL(OpenAI 兼容)</span>
                <input
                  type="text"
                  value={endpointCfg.baseURL}
                  onChange={(e) => setEndpointCfg({ ...endpointCfg, baseURL: e.target.value })}
                  placeholder="https://api.deepseek.com/v1"
                  style={inputStyle}
                  disabled={running || readOnly}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: THEME_VARS.text }}>
                <span>model</span>
                <input
                  type="text"
                  value={endpointCfg.model}
                  onChange={(e) => setEndpointCfg({ ...endpointCfg, model: e.target.value })}
                  placeholder="deepseek-chat / qwen-plus / moonshot-v1-8k"
                  style={inputStyle}
                  disabled={running || readOnly}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: THEME_VARS.text, gridColumn: '1 / -1' }}>
                <span>apiKey(本地输入,不上传)</span>
                <input
                  type="password"
                  value={endpointCfg.apiKey}
                  onChange={(e) => setEndpointCfg({ ...endpointCfg, apiKey: e.target.value })}
                  placeholder="sk-xxxxxxxxxxxx"
                  style={inputStyle}
                  disabled={running || readOnly}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: THEME_VARS.text }}>
                <input
                  type="checkbox"
                  checked={endpointCfg.testStream !== false}
                  onChange={(e) => setEndpointCfg({ ...endpointCfg, testStream: e.target.checked })}
                  disabled={running || readOnly}
                />
                <span>测试流式输出(r2)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: THEME_VARS.text }}>
                <input
                  type="checkbox"
                  checked={endpointCfg.testParallel8 === true}
                  onChange={(e) => setEndpointCfg({ ...endpointCfg, testParallel8: e.target.checked })}
                  disabled={running || readOnly}
                />
                <span>测试 8AI 并发(r5,可能触发速率限制)</span>
              </label>
            </div>
            <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 6 }}>
              注:Key 仅本地用于真实调用,不写入 IndexedDB,不导出,刷新后丢失。建议用低额度测试 Key。
            </div>
          </section>

          {/* 浏览器兼容性提示 */}
          {(!browserEnv.hasFetch || !browserEnv.hasAbortController || !browserEnv.hasReadableStream || !browserEnv.hasIndexedDB) && (
            <section style={{ ...sectionStyle, borderColor: THEME_VARS.danger }}>
              <h3 style={{ ...sectionTitleStyle, color: THEME_VARS.danger }}>浏览器兼容性警告</h3>
              <div style={{ fontSize: 11, color: THEME_VARS.danger }}>
                当前浏览器缺少关键 API,真实模型边界验证可能失败:
                <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                  {!browserEnv.hasFetch && <li>fetch API 不可用(必需)</li>}
                  {!browserEnv.hasAbortController && <li>AbortController 不可用(r6 超时降级依赖)</li>}
                  {!browserEnv.hasReadableStream && <li>ReadableStream 不可用(r2 流式 SSE 依赖)</li>}
                  {!browserEnv.hasIndexedDB && <li>IndexedDB 不可用(存档系统依赖)</li>}
                </ul>
                建议升级到 Chrome 100+ / Firefox 100+ / Edge 100+。
              </div>
            </section>
          )}

          {/* 顶部操作 */}
          <section style={sectionStyle}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handleRealModelRunAll}
                disabled={running || readOnly}
                style={btnPrimaryStyle}
              >
                {running ? '运行中...' : '运行全部 7 场景'}
              </button>
              <span style={{ fontSize: 12, color: THEME_VARS.textMuted }}>
                {realModelReport
                  ? `已运行 ${realModelReport.total} 场景,${realModelReport.passed} 通过 / ${realModelReport.failed} 失败,总耗时 ${realModelReport.elapsedMs}ms`
                  : `尚未运行(顺序执行,避免端点并发压力)`}
              </span>
            </div>
          </section>

          {/* 案例列表 */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>真实模型边界场景</h3>
            <div style={tableStyle}>
              {REAL_MODEL_CASE_META.map((meta) => {
                const result = realModelReport?.results.find((r) => r.id === meta.id);
                const isRunning = running && currentScenario === meta.id;
                return (
                  <div
                    key={meta.id}
                    style={{
                      ...rowStyle,
                      borderColor: result
                        ? result.ok
                          ? THEME_VARS.success
                          : THEME_VARS.danger
                        : THEME_VARS.border,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <strong style={{ color: THEME_VARS.text, fontSize: 13 }}>
                          {meta.id} · {meta.name}
                        </strong>
                        <span style={{ ...badgeStyle(THEME_VARS.warning), fontSize: 10 }}>
                          {meta.boundaryType}
                        </span>
                        {meta.requiresConfirmation && (
                          <span style={{ ...badgeStyle(THEME_VARS.danger), fontSize: 10 }} title="需勾选 testParallel8 才运行">
                            需确认
                          </span>
                        )}
                        {result && (
                          <span
                            style={{
                              ...badgeStyle(result.ok ? THEME_VARS.success : THEME_VARS.danger),
                              fontSize: 10,
                            }}
                          >
                            {result.ok ? '✓ 通过' : '✗ 失败'}
                          </span>
                        )}
                        {isRunning && (
                          <span style={{ ...badgeStyle(THEME_VARS.warning), fontSize: 10 }}>
                            运行中...
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginTop: 4 }}>
                        {meta.description}
                      </div>
                      {result && (
                        <div style={{ fontSize: 11, color: THEME_VARS.text, marginTop: 4 }}>
                          <strong>证据:</strong> {result.evidence}
                        </div>
                      )}
                      {result && result.errors.length > 0 && (
                        <div style={{ fontSize: 11, color: THEME_VARS.danger, marginTop: 2 }}>
                          <strong>错误:</strong> {result.errors.join('; ')}
                        </div>
                      )}
                      {result && (
                        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                          断言: {result.assertions.filter((a) => a.ok).length}/{result.assertions.length} 通过 ·
                          耗时 {result.elapsedMs}ms
                          {result.tokenUsage?.total_tokens ? ` · tokens=${result.tokenUsage.total_tokens}` : ''}
                          {result.streamChunkCount !== undefined ? ` · chunks=${result.streamChunkCount}` : ''}
                          {result.parallelMetrics ? ` · p50=${result.parallelMetrics.p50Ms}ms p95=${result.parallelMetrics.p95Ms}ms` : ''}
                          {result.finishReason ? ` · finish=${result.finishReason}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                      <button
                        onClick={() => handleRealModelRunOne(meta.id)}
                        disabled={running || readOnly}
                        style={btnSmallStyle}
                        title="单独运行此场景"
                      >
                        运行
                      </button>
                      {result && (
                        <button
                          onClick={() => setExpandedScenario(expandedScenario === meta.id ? null : meta.id)}
                          style={btnSmallStyle}
                          title="展开断言详情"
                        >
                          {expandedScenario === meta.id ? '收起' : '详情'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 展开的真实模型断言详情 */}
          {expandedScenario && realModelReport && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                场景 {expandedScenario} 断言详情
              </h3>
              {(() => {
                const r = realModelReport.results.find((x) => x.id === expandedScenario);
                if (!r) return <div style={emptyStyle}>未找到场景结果</div>;
                return (
                  <div style={tableStyle}>
                    {r.assertions.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          ...rowStyle,
                          borderColor: a.ok ? THEME_VARS.success : THEME_VARS.danger,
                          padding: '6px 8px',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                          <span style={{ color: THEME_VARS.textMuted }}>#{i + 1}</span>
                          <span
                            style={{
                              ...badgeStyle(a.ok ? THEME_VARS.success : THEME_VARS.danger),
                              fontSize: 10,
                            }}
                          >
                            {a.ok ? '✓' : '✗'}
                          </span>
                          <strong style={{ color: THEME_VARS.text }}>{a.name}</strong>
                        </div>
                        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, paddingLeft: 18 }}>
                          期望: {a.expected ?? '(无)'}
                        </div>
                        <div style={{ fontSize: 10, color: a.ok ? THEME_VARS.success : THEME_VARS.danger, marginTop: 2, paddingLeft: 18 }}>
                          实际: {a.actual ?? '(无)'}
                        </div>
                      </div>
                    ))}
                    {r.gatewayTrace && r.gatewayTrace.length > 0 && (
                      <div style={{ ...rowStyle, borderColor: THEME_VARS.border, padding: '6px 8px', flexDirection: 'column', alignItems: 'stretch' }}>
                        <strong style={{ color: THEME_VARS.text, fontSize: 11 }}>Gateway Trace({r.gatewayTrace.length} 条)</strong>
                        {r.gatewayTrace.slice(0, 10).map((t, i) => (
                          <div key={i} style={{ fontSize: 10, color: THEME_VARS.textMuted, paddingLeft: 12 }}>
                            [{i + 1}] {t.step}: {t.detail}
                          </div>
                        ))}
                        {r.gatewayTrace.length > 10 && (
                          <div style={{ fontSize: 10, color: THEME_VARS.textMuted, paddingLeft: 12 }}>
                            ...(共 {r.gatewayTrace.length} 条,只显示前 10 条)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          )}

          {/* 端点配置摘要(运行后显示) */}
          {realModelReport && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>端点配置摘要(脱敏)</h3>
              <div style={{ fontSize: 11, color: THEME_VARS.textMuted, lineHeight: 1.6 }}>
                <div>baseURL: <code style={{ color: THEME_VARS.text }}>{realModelReport.endpointSummary.baseURL}</code></div>
                <div>model: <code style={{ color: THEME_VARS.text }}>{realModelReport.endpointSummary.model}</code></div>
                <div>apiKey: <code style={{ color: THEME_VARS.text }}>{realModelReport.endpointSummary.apiKeyMasked}</code></div>
                <div>testStream: {String(realModelReport.endpointSummary.testStream)}</div>
                <div>testParallel8: {String(realModelReport.endpointSummary.testParallel8)}</div>
              </div>
            </section>
          )}
        </>
      )}

      {/* 消息 */}
      {message && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            background: THEME_VARS.overlay,
            border: `1px solid ${
              message.type === 'ok'
                ? THEME_VARS.success
                : message.type === 'fail'
                  ? THEME_VARS.danger
                  : THEME_VARS.border
            }`,
            borderRadius: 4,
            fontSize: 12,
            color: THEME_VARS.text,
          }}
        >
          {message.type === 'ok' ? '✓ ' : message.type === 'fail' ? '✗ ' : 'ℹ '}
          {message.text}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  子组件:Trace 条目
// ───────────────────────────────────────────────────────────

function TraceEntryItem({ entry, index }: { entry: TraceEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TRACE_CATEGORY_META[entry.category];
  return (
    <div
      style={{
        ...rowStyle,
        padding: '6px 8px',
        flexDirection: 'column',
        alignItems: 'stretch',
        borderColor: THEME_VARS.border,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
        <span style={{ color: THEME_VARS.textMuted }}>#{index + 1}</span>
        <span
          style={{
            ...badgeStyle(meta.color),
            fontSize: 10,
          }}
        >
          {meta.icon} {meta.label}
        </span>
        <span style={{ color: THEME_VARS.textMuted }}>
          {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
        </span>
        <strong style={{ color: THEME_VARS.text, fontSize: 11 }}>{entry.step}</strong>
        <span style={{ marginLeft: 'auto', color: THEME_VARS.textMuted, cursor: 'pointer', fontSize: 10 }}>
          {expanded ? '收起' : '展开'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: THEME_VARS.text, marginTop: 2 }}>{entry.detail}</div>
      {expanded && entry.data != null && (
        <pre
          style={{
            margin: '4px 0 0',
            padding: 6,
            background: THEME_VARS.bg,
            border: `1px solid ${THEME_VARS.border}`,
            borderRadius: 3,
            fontSize: 10,
            color: THEME_VARS.text,
            overflowX: 'auto',
            maxHeight: 200,
          }}
        >
          {JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  子组件:行为案例 Trace 条目
// ───────────────────────────────────────────────────────────

function BehaviorTraceEntryItem({ entry, index }: { entry: BehaviorTraceEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const meta = BEHAVIOR_TRACE_CATEGORY_META[entry.category];
  return (
    <div
      style={{
        ...rowStyle,
        padding: '6px 8px',
        flexDirection: 'column',
        alignItems: 'stretch',
        borderColor: THEME_VARS.border,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
        <span style={{ color: THEME_VARS.textMuted }}>#{index + 1}</span>
        <span style={{ ...badgeStyle(meta.color), fontSize: 10 }}>
          {meta.icon} {meta.label}
        </span>
        <span style={{ color: THEME_VARS.textMuted }}>
          {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
        </span>
        <strong style={{ color: THEME_VARS.text, fontSize: 11 }}>{entry.step}</strong>
        <span style={{ marginLeft: 'auto', color: THEME_VARS.textMuted, cursor: 'pointer', fontSize: 10 }}>
          {expanded ? '收起' : '展开'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: THEME_VARS.text, marginTop: 2 }}>{entry.detail}</div>
      {expanded && entry.data != null && (
        <pre
          style={{
            margin: '4px 0 0',
            padding: 6,
            background: THEME_VARS.bg,
            border: `1px solid ${THEME_VARS.border}`,
            borderRadius: 3,
            fontSize: 10,
            color: THEME_VARS.text,
            overflowX: 'auto',
            maxHeight: 200,
          }}
        >
          {JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  行为案例元信息
// ───────────────────────────────────────────────────────────

const BEHAVIOR_CASE_META: Array<{
  id: string;
  name: string;
  description: string;
  traceCategories: BehaviorTraceCategory[];
}> = [
  {
    id: 'b1',
    name: '寒假开局完整流程',
    description: 'P1 身份选择 → 12-22 早晨开场 → 状态栏 9 分类正确',
    traceCategories: ['opening', 'stateCommit'],
  },
  {
    id: 'b2',
    name: '女角互动 + LCG 骰子 + 关系推进',
    description: '玩家行动 → 骰子判定 → 好感/关系变化',
    traceCategories: ['heroineInteract', 'diceRoll', 'stateCommit'],
  },
  {
    id: 'b3',
    name: 'NPC 自然行动 + 关系网触发',
    description: '场外女角行动 + 嫉妒传播 → 注入主聊天 AI',
    traceCategories: ['npcAction', 'relationship', 'stateCommit'],
  },
  {
    id: 'b4',
    name: 'H 场景触发 + 结算 + CG 收录',
    description: '好感达阈值 + 私密场景 → 评估 → 结算 → CG',
    traceCategories: ['hScene', 'cgUnlock', 'stateCommit'],
  },
  {
    id: 'b5',
    name: '多结局分支 + 多周目继承',
    description: '结局触发 → 周目记录 → NG+ 继承点数',
    traceCategories: ['ending', 'ngPlus', 'achievement'],
  },
];

const BEHAVIOR_TRACE_CATEGORY_META: Record<BehaviorTraceCategory, { label: string; color: string; icon: string }> = {
  opening: { label: '开局流程', color: 'var(--c-primary)', icon: '🌅' },
  diceRoll: { label: 'LCG 骰子', color: 'var(--c-warning)', icon: '🎲' },
  heroineInteract: { label: '女角互动', color: 'var(--c-danger)', icon: '💬' },
  npcAction: { label: 'NPC 行动', color: 'var(--c-info, #3b82f6)', icon: '🚶' },
  relationship: { label: '关系网', color: 'var(--c-danger)', icon: '🔗' },
  hScene: { label: 'H 场景', color: 'var(--c-danger)', icon: '🔞' },
  cgUnlock: { label: 'CG 收录', color: 'var(--c-success)', icon: '🖼' },
  combat: { label: '战斗结算', color: 'var(--c-danger)', icon: '⚔️' },
  achievement: { label: '成就', color: 'var(--c-warning)', icon: '🏆' },
  ending: { label: '结局分支', color: 'var(--c-primary)', icon: '🎬' },
  ngPlus: { label: '多周目', color: 'var(--c-success)', icon: '🔁' },
  stateCommit: { label: '状态提交', color: 'var(--c-info, #3b82f6)', icon: '💾' },
};

// ───────────────────────────────────────────────────────────
//  样式
// ───────────────────────────────────────────────────────────

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  background: THEME_VARS.bg,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 8,
  color: THEME_VARS.text,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  borderBottom: `1px solid ${THEME_VARS.border}`,
  paddingBottom: 8,
};

const sectionStyle: CSSProperties = {
  padding: 10,
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 6,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: THEME_VARS.text,
  fontWeight: 600,
};

const tableStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginTop: 8,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: 8,
  background: THEME_VARS.bg,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 4,
  alignItems: 'center',
};

const emptyStyle: CSSProperties = {
  padding: 12,
  textAlign: 'center',
  color: THEME_VARS.textMuted,
  fontSize: 12,
};

const inputStyle: CSSProperties = {
  padding: '6px 8px',
  background: THEME_VARS.bg,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 4,
  color: THEME_VARS.text,
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
};

const btnStyle: CSSProperties = {
  padding: '6px 12px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 4,
  color: THEME_VARS.text,
  cursor: 'pointer',
  fontSize: 12,
};

const btnPrimaryStyle: CSSProperties = {
  ...btnStyle,
  background: THEME_VARS.primary,
  borderColor: THEME_VARS.primary,
  color: '#fff',
};

const btnSmallStyle: CSSProperties = {
  padding: '3px 8px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 3,
  color: THEME_VARS.text,
  cursor: 'pointer',
  fontSize: 11,
};

const reportStyle: CSSProperties = {
  padding: 10,
  background: THEME_VARS.bg,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 4,
  fontSize: 12,
  color: THEME_VARS.text,
};

const traceFilterBtnStyle: CSSProperties = {
  padding: '3px 10px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 12,
  color: THEME_VARS.text,
  cursor: 'pointer',
  fontSize: 11,
};

const traceFilterBtnActiveStyle: CSSProperties = {
  ...traceFilterBtnStyle,
  background: THEME_VARS.primary,
  borderColor: THEME_VARS.primary,
  color: '#fff',
};

const tabBtnStyle: CSSProperties = {
  padding: '6px 14px',
  background: THEME_VARS.overlay,
  border: '1px solid transparent',
  borderBottom: 'none',
  borderRadius: '4px 4px 0 0',
  color: THEME_VARS.textMuted,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
};

const tabBtnActiveStyle: CSSProperties = {
  ...tabBtnStyle,
  background: THEME_VARS.bg,
  borderColor: THEME_VARS.border,
  color: THEME_VARS.primary,
  fontWeight: 600,
};

function badgeStyle(color: string): CSSProperties {
  return {
    display: 'inline-block',
    padding: '1px 6px',
    background: color,
    color: '#fff',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 600,
  };
}
