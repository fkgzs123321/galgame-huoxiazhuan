/**
 * 状态栏(步骤7)
 *
 * 职责:
 *  - 按 schema.ts 顶层分类展示 stat_data(9-10 个分类:时间/场景/主角/当前女角/技能/经济/性格/临时/隐藏/女角)
 *  - 统一 renderRecordItem:列表项 + 详情模态框
 *  - 字段对齐 schema.ts(从 schemaRegistry.allFields() 获取元信息)
 *  - 响应 mag_variable_update_ended 事件(本地映射为 VariableUpdateEvent)
 *  - 变更字段高亮(最近一次更新的字段闪烁标记)
 *
 * 不做:
 *  - 变量更新(由 Kernel.commit 完成,StatusBar 只读取)
 *  - 字段编辑(只读展示,编辑由 ConfigPage / 调试器负责)
 */

import { useEffect, useMemo, useState } from 'react';
import { schemaRegistry, type FieldInfo } from '@runtime/schema-loader';
import { StatusFieldDialog } from '@dialogs/index';
import {
  deriveStatusCategories,
  formatValue,
  THEME_VARS,
  type StatusCategory,
  type StatusFieldDetail,
  type StatusFieldItem,
  type VariableUpdateEvent,
} from './types';

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface StatusBarProps {
  /** 当前 stat_data 快照 */
  statData: Record<string, unknown>;
  /** 最近一次变量更新事件(用于高亮变更字段) */
  lastUpdate?: VariableUpdateEvent;
  /** 是否显示详情模态框 */
  showModal?: boolean;
}

// ───────────────────────────────────────────────────────────
//  StatusBar 组件
// ───────────────────────────────────────────────────────────

export function StatusBar({ statData, lastUpdate, showModal = true }: StatusBarProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<StatusFieldDetail | null>(null);

  // 最近变更字段路径集合(用于高亮)
  const recentChangedPaths = useMemo(() => {
    if (!lastUpdate) return new Set<string>();
    return new Set(lastUpdate.changes.map((c) => c.path));
  }, [lastUpdate]);

  // 从 schemaRegistry 推导分类 + 字段列表
  const categories = useMemo<StatusCategory[]>(() => {
    // schema 顶层字段(分类)
    const topLevelKeys = Object.keys(statData);
    const cats = deriveStatusCategories(topLevelKeys);
    // 为每个分类填充字段路径
    return cats.map((cat) => {
      const paths = schemaRegistry
        .allFields()
        .filter((f) => f.path.startsWith(`${cat.key}.`))
        .map((f) => f.path);
      return { ...cat, paths };
    });
  }, [statData]);

  // 选中分类的字段项
  const activeCategoryFields = useMemo<StatusFieldItem[]>(() => {
    if (!activeCategory) return [];
    return collectFieldItems(activeCategory, statData);
  }, [activeCategory, statData]);

  // 自动展开第一个非空分类
  useEffect(() => {
    if (activeCategory) return;
    const firstNonEmpty = categories.find((c) => c.paths.length > 0);
    if (firstNonEmpty) setActiveCategory(firstNonEmpty.key);
  }, [categories, activeCategory]);

  return (
    <div
      style={{
        background: THEME_VARS.overlay,
        border: `1px solid ${THEME_VARS.border}`,
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header style={{ borderBottom: `1px solid ${THEME_VARS.border}`, paddingBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: THEME_VARS.text }}>状态栏</h2>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: THEME_VARS.textMuted }}>
          {categories.length} 分类 · {categories.reduce((a, c) => a + c.paths.length, 0)} 字段 ·
          字段对齐 schema.ts · 统一 renderRecordItem
          {lastUpdate && (
            <span style={{ marginLeft: 8, color: THEME_VARS.success }}>
              · 最近更新:{lastUpdate.changes.length} 项 @ {new Date(lastUpdate.timestamp).toLocaleTimeString()}
            </span>
          )}
        </p>
      </header>

      {/* 分类 Tab */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat.key;
          const changedCount = cat.paths.filter((p) => recentChangedPaths.has(p)).length;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '5px 10px',
                background: isActive ? THEME_VARS.primary : THEME_VARS.bg,
                color: isActive ? '#fff' : THEME_VARS.text,
                border: `1px solid ${isActive ? THEME_VARS.primary : THEME_VARS.border}`,
                borderRadius: 12,
                fontSize: 11,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span style={{ opacity: 0.7 }}>({cat.paths.length})</span>
              {changedCount > 0 && (
                <span
                  style={{
                    background: THEME_VARS.warning,
                    color: '#fff',
                    padding: '0 4px',
                    borderRadius: 8,
                    fontSize: 10,
                  }}
                >
                  {changedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 字段列表(统一 renderRecordItem) */}
      <div
        className="statusbar-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 4,
          maxHeight: 360,
          overflowY: 'auto',
          padding: 4,
          background: THEME_VARS.bg,
          border: `1px solid ${THEME_VARS.border}`,
          borderRadius: 4,
        }}
      >
        {activeCategoryFields.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 20,
              textAlign: 'center',
              color: THEME_VARS.textMuted,
              fontSize: 12,
            }}
          >
            该分类暂无字段
          </div>
        )}
        {activeCategoryFields.map((item) =>
          renderRecordItem({
            item,
            categoryLabel: activeCategory ?? '',
            changed: recentChangedPaths.has(item.path),
            onClick: showModal ? () => setSelectedField({ ...item, category: activeCategory ?? '', categoryLabel: activeCategory ?? '' }) : undefined,
          }),
        )}
      </div>

      {/* 详情模态框 */}
      {showModal && selectedField && (
        <FieldDetailModal
          detail={selectedField}
          onClose={() => setSelectedField(null)}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  统一 renderRecordItem(列表项)
// ───────────────────────────────────────────────────────────

function renderRecordItem(args: {
  item: StatusFieldItem;
  categoryLabel: string;
  changed: boolean;
  onClick?: () => void;
}): React.ReactNode {
  const { item, changed, onClick } = args;
  const valueStr = formatValue(item.value);
  // 数值字段渲染进度条(0-100 范围)
  const isProgress =
    item.type === 'number' &&
    typeof item.min === 'number' &&
    typeof item.max === 'number' &&
    item.max - item.min <= 100 &&
    typeof item.value === 'number';
  const progressPct = isProgress
    ? ((item.value as number - (item.min ?? 0)) / ((item.max ?? 100) - (item.min ?? 0))) * 100
    : 0;

  return (
    <div
      key={item.path}
      onClick={onClick}
      style={{
        padding: '6px 8px',
        background: changed ? 'rgba(255, 193, 7, 0.1)' : THEME_VARS.overlay,
        border: `1px solid ${changed ? THEME_VARS.warning : THEME_VARS.border}`,
        borderRadius: 3,
        cursor: onClick ? 'pointer' : 'default',
        fontSize: 11,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        transition: 'background 0.2s',
      }}
      title={`路径:${item.path}\n类型:${item.type}${item.writable === false ? '\n(只读)' : ''}\n点击查看详情`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: THEME_VARS.textMuted }}>{item.name}</span>
        {changed && (
          <span
            style={{
              fontSize: 9,
              padding: '0 4px',
              background: THEME_VARS.warning,
              color: '#fff',
              borderRadius: 6,
            }}
          >
            变
          </span>
        )}
        {item.writable === false && (
          <span
            style={{
              fontSize: 9,
              padding: '0 4px',
              background: THEME_VARS.border,
              color: THEME_VARS.textMuted,
              borderRadius: 6,
            }}
          >
            只读
          </span>
        )}
      </div>
      <div style={{ color: THEME_VARS.text, fontWeight: 600 }}>
        {valueStr}
        {item.type === 'enum' && item.enumValues && (
          <span style={{ marginLeft: 4, fontSize: 10, color: THEME_VARS.textMuted }}>
            ({item.enumValues.length}项)
          </span>
        )}
      </div>
      {isProgress && (
        <div
          style={{
            marginTop: 2,
            height: 3,
            background: THEME_VARS.border,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: '100%',
              background:
                progressPct < 30
                  ? THEME_VARS.danger
                  : progressPct < 70
                    ? THEME_VARS.warning
                    : THEME_VARS.success,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  字段详情模态框
// ───────────────────────────────────────────────────────────

function FieldDetailModal({
  detail,
  onClose,
}: {
  detail: StatusFieldDetail;
  onClose: () => void;
}) {
  return (
    <StatusFieldDialog open detail={detail} onClose={onClose} />
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
        borderBottom: `1px dashed ${THEME_VARS.border}`,
        fontSize: 12,
      }}
    >
      <span style={{ color: THEME_VARS.textMuted }}>{label}</span>
      <span style={{ color: THEME_VARS.text, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  辅助:从 stat_data 收集分类下的字段项
// ───────────────────────────────────────────────────────────

function collectFieldItems(
  category: string,
  statData: Record<string, unknown>,
): StatusFieldItem[] {
  const items: StatusFieldItem[] = [];
  const categoryData = statData[category];
  if (!categoryData || typeof categoryData !== 'object') return items;

  // 遍历 schema 字段,过滤出当前分类的
  const allFields = schemaRegistry.allFields();
  const categoryFields = allFields.filter((f) => f.path.startsWith(`${category}.`));

  for (const field of categoryFields) {
    const relPath = field.path.slice(`${category}.`.length);
    const value = getPathValue(categoryData as object, relPath);
    items.push({
      path: field.path,
      name: relPath,
      value,
      type: field.type,
      enumValues: field.enumValues,
      min: field.min,
      max: field.max,
      round: field.round,
      prefault: field.prefault,
      writable: field.writable,
    });
  }

  return items;
}

/** 从对象按点路径取值 */
function getPathValue(obj: object, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
