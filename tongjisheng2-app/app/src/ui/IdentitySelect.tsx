/**
 * 开局身份选择(步骤7)
 *
 * 职责:
 *  - 展示 P1-P6 6 个玩家身份选项(原作主角 / 川尻信良 / 长冈芳树 / 西御寺有友 / 天道新干线 / 自定义)
 *  - 每个身份显示 6 维属性初始值 + 现金 + 住所 + 简介
 *  - P6 自定义:6 维属性滑块(总和上限 360)+ 现金 + 住所输入
 *  - 选择后回调 onConfirm(identity, customAttributes?)
 *  - 不写 MVU 变量(由父组件 Kernel.startTurn({type:'opening'}) 完成)
 *
 * 不做:
 *  - 实际开局 AI 调用(由父组件在 onConfirm 后触发)
 *  - 已选身份的二次确认(由父组件路由判断)
 */

import { useMemo, useState } from 'react';
import {
  IDENTITY_OPTIONS,
  P6_ATTRIBUTE_SUM_MAX,
  THEME_VARS,
  type IdentityOption,
} from './types';

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface IdentitySelectProps {
  /** 已选择的身份(用于高亮 / 路由判断) */
  selected?: string;
  /** 确认选择回调 */
  onConfirm: (identity: IdentityOption) => void;
  /** 是否只读 */
  readOnly?: boolean;
}

// ───────────────────────────────────────────────────────────
//  IdentitySelect 组件
// ───────────────────────────────────────────────────────────

export function IdentitySelect({ selected, onConfirm, readOnly = false }: IdentitySelectProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // P6 自定义属性
  const [customAttrs, setCustomAttrs] = useState<IdentityOption['attributes']>({
    魅力: 50,
    学业: 50,
    体力: 50,
    社交: 50,
    敏感: 50,
    声誉: 50,
  });
  const [customCash, setCustomCash] = useState(5000);
  const [customResidence, setCustomResidence] = useState('自定住所');

  const customSum = useMemo(
    () => Object.values(customAttrs).reduce((a, b) => a + b, 0),
    [customAttrs],
  );
  const customOverLimit = customSum > P6_ATTRIBUTE_SUM_MAX;

  const handleConfirm = (opt: IdentityOption) => {
    if (readOnly) return;
    if (opt.id === 'P6') {
      onConfirm({
        ...opt,
        attributes: { ...customAttrs },
        cash: customCash,
        residence: customResidence,
      });
    } else {
      onConfirm(opt);
    }
  };

  return (
    <div
      style={{
        background: THEME_VARS.overlay,
        border: `1px solid ${THEME_VARS.border}`,
        borderRadius: 8,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <header style={{ borderBottom: `1px solid ${THEME_VARS.border}`, paddingBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: THEME_VARS.text }}>开局身份选择</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: THEME_VARS.textMuted }}>
          P1-P6 6 个身份 · P6 自定义 6 维属性(总和上限 {P6_ATTRIBUTE_SUM_MAX}) · 选择后触发开局 AI
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {IDENTITY_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;
          const isHovered = hoveredId === opt.id;
          const isP6 = opt.id === 'P6';
          const showP6Editor = isP6 && (isSelected || isHovered);
          return (
            <div
              key={opt.id}
              onMouseEnter={() => setHoveredId(opt.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: 12,
                background: isSelected ? THEME_VARS.bg : THEME_VARS.overlay,
                border: `1px solid ${isSelected ? THEME_VARS.primary : THEME_VARS.border}`,
                borderRadius: 6,
                cursor: readOnly ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'border-color 0.15s',
              }}
              onClick={() => !isP6 && handleConfirm(opt)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14, color: THEME_VARS.text }}>
                  {opt.id} · {opt.name}
                </strong>
                {isSelected && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: THEME_VARS.primary,
                      color: '#fff',
                    }}
                  >
                    已选
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: THEME_VARS.textMuted, minHeight: 32 }}>
                {opt.description}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 4,
                  fontSize: 11,
                }}
              >
                {(Object.entries(opt.attributes) as Array<[string, number]>).map(([k, v]) => (
                  <div key={k}>
                    <span style={{ color: THEME_VARS.textMuted }}>{k}</span>
                    <span style={{ float: 'right', color: THEME_VARS.text, fontWeight: 600 }}>
                      {isP6 ? customAttrs[k as keyof typeof customAttrs] : v}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: THEME_VARS.textMuted, borderTop: `1px solid ${THEME_VARS.border}`, paddingTop: 6 }}>
                现金 ¥{isP6 ? customCash : opt.cash} · 住所 {isP6 ? customResidence : opt.residence}
              </div>

              {/* P6 自定义编辑器 */}
              {showP6Editor && (
                <div
                  style={{
                    marginTop: 4,
                    padding: 8,
                    background: THEME_VARS.bg,
                    borderRadius: 4,
                    border: `1px solid ${THEME_VARS.border}`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: customOverLimit ? THEME_VARS.danger : THEME_VARS.success,
                      marginBottom: 6,
                    }}
                  >
                    总和 {customSum} / {P6_ATTRIBUTE_SUM_MAX}
                    {customOverLimit ? ' ⚠ 超出上限' : ' ✓'}
                  </div>
                  {(Object.keys(customAttrs) as Array<keyof typeof customAttrs>).map((k) => (
                    <div key={k} style={{ marginBottom: 4 }}>
                      <label style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
                        {k}: {customAttrs[k]}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={customAttrs[k]}
                        disabled={readOnly}
                        onChange={(e) =>
                          setCustomAttrs((prev) => ({ ...prev, [k]: Number(e.target.value) }))
                        }
                        style={{ width: '100%' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <input
                      type="number"
                      value={customCash}
                      disabled={readOnly}
                      onChange={(e) => setCustomCash(Number(e.target.value))}
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="现金"
                    />
                    <input
                      type="text"
                      value={customResidence}
                      disabled={readOnly}
                      onChange={(e) => setCustomResidence(e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="住所"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConfirm(opt)}
                    disabled={readOnly || customOverLimit}
                    style={{
                      marginTop: 6,
                      width: '100%',
                      padding: '6px 0',
                      background: customOverLimit ? THEME_VARS.border : THEME_VARS.primary,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      fontSize: 12,
                      cursor: readOnly || customOverLimit ? 'not-allowed' : 'pointer',
                    }}
                  >
                    确认 P6 自定义
                  </button>
                </div>
              )}

              {/* 非 P6 的确认按钮(hover 时显示) */}
              {!isP6 && isHovered && !isSelected && !readOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirm(opt);
                  }}
                  style={{
                    marginTop: 4,
                    padding: '6px 0',
                    background: THEME_VARS.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 3,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  选择 {opt.id}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  辅助
// ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '4px 6px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 3,
  color: THEME_VARS.text,
  fontSize: 11,
  boxSizing: 'border-box',
};
