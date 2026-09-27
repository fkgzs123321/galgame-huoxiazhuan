import React, { useMemo, useState } from 'react';
import { COMMON_MODELS, MANUAL_MODEL_MARK, type ModelInfo } from '@gateway/modelLibrary';

/**
 * ModelSelect · 模型选择下拉(对齐凡人 EndpointLibrary 的模型选择器)
 *  - 内置参考模型表(默认)
 *  - 可切换手动输入
 */

export interface ModelSelectProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function ModelSelect({ value, onChange, disabled, style }: ModelSelectProps) {
  const [manualMode, setManualMode] = useState(false);

  const options = useMemo(() => {
    const opts = COMMON_MODELS.map((m: ModelInfo) => ({ value: m.id, label: m.id }));
    if (value && !opts.some((o) => o.value === value)) {
      opts.unshift({ value, label: `${value}(手动)` });
    }
    opts.push({ value: MANUAL_MODEL_MARK, label: '✏️ 手动输入模型名…' });
    return opts;
  }, [value]);

  if (manualMode) {
    return (
      <input
        className="th-input th-input--sm"
        placeholder="手动输入模型名"
        value={value}
        disabled={disabled}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => value && setManualMode(false)}
        style={style}
      />
    );
  }

  return (
    <select
      className="th-select"
      value={value}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value === MANUAL_MODEL_MARK) {
          setManualMode(true);
          return;
        }
        onChange(e.target.value);
      }}
      style={style}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
