/**
 * 预设导入器(步骤6)
 *
 * 职责:
 *  - 解析 ST 预设 JSON 字符串为 StPresetRaw
 *  - 自动识别版本(preset_version)和来源(chat_completion_source)
 *  - 文件名特殊字符兼容(全角—（）等)
 *  - 字段验证(必需字段缺失时降级,不崩溃)
 *  - 调用映射器转换为 PresetProfile
 *
 * 不做:
 *  - 实际文件 IO(由调用方提供 JSON 字符串和文件名)
 *  - 预设持久化(由 preset-store 负责)
 *
 * 参考:
 *  - stage-roadmap.md 步骤6 预设导入器要求
 *  - "三人逆行v11.0—PrismFox 正式版（数据库变量版）.json" 格式(1.3MB/264条目,含全角特殊字符文件名)
 */

import type { StPresetRaw, PresetImportResult } from './types';
import { mapPreset } from './mapper';

// ───────────────────────────────────────────────────────────
//  导入器
// ───────────────────────────────────────────────────────────

/**
 * 从 ST 预设 JSON 字符串导入
 *  - 解析 JSON(失败时返回 ok=false,不抛异常)
 *  - 验证必需字段(prompts 数组必须存在)
 *  - 调用映射器转换为 PresetProfile
 *
 * @param jsonText ST 预设 JSON 字符串
 * @param fileName 文件名(用于 preset_name 缺失时的回退,支持全角特殊字符)
 */
export function importPreset(jsonText: string, fileName?: string): PresetImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 解析 JSON
  let raw: StPresetRaw;
  try {
    const parsed = JSON.parse(jsonText);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        ok: false,
        errors: ['预设 JSON 顶层不是对象'],
        warnings,
      };
    }
    raw = parsed as StPresetRaw;
  } catch (e) {
    return {
      ok: false,
      errors: [`JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`],
      warnings,
    };
  }

  // 2. 验证必需字段
  if (!Array.isArray(raw.prompts)) {
    errors.push('缺少 prompts 数组(或不是数组),无法识别为 ST ChatCompletion 预设');
  } else if (raw.prompts.length === 0) {
    warnings.push('prompts 数组为空');
  }

  // 3. 识别版本和来源(用于兼容性判断)
  const version = typeof raw.preset_version === 'string' ? raw.preset_version : '';
  const sourceType =
    typeof raw.chat_completion_source === 'string' ? raw.chat_completion_source : 'openai';

  if (!version) {
    warnings.push('缺少 preset_version 字段,按最新版本处理');
  }

  // 4. 推导预设名(优先 preset_name,回退文件名去掉扩展名)
  let name = '';
  if (typeof raw.preset_name === 'string' && raw.preset_name.trim()) {
    name = raw.preset_name.trim();
  } else if (fileName) {
    // 去掉 .json 扩展名(兼容全角特殊字符文件名,如 "三人逆行v11.0—PrismFox 正式版（数据库变量版）.json")
    name = fileName.replace(/\.json$/i, '').trim();
  }
  if (!name) {
    name = `imported-${Date.now()}`;
    warnings.push(`预设名缺失,自动生成: ${name}`);
  }

  // 5. 检查 prompt_order 是否存在(缺失时降级为 prompts 数组顺序)
  if (!Array.isArray(raw.prompt_order) || raw.prompt_order.length === 0) {
    warnings.push('缺少 prompt_order 数组,按 prompts 数组原始顺序处理');
  }

  // 6. 如果有致命错误,返回失败
  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  // 7. 调用映射器转换为 PresetProfile
  try {
    const profile = mapPreset(raw, name, sourceType, version, fileName, warnings);
    return { ok: true, profile, errors, warnings };
  } catch (e) {
    errors.push(`映射器转换失败: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, errors, warnings };
  }
}

/**
 * 从 File 对象导入(浏览器场景)
 *  - 读取 File 文本内容
 *  - 调用 importPreset
 */
export async function importPresetFile(file: File): Promise<PresetImportResult> {
  try {
    const text = await file.text();
    return importPreset(text, file.name);
  } catch (e) {
    return {
      ok: false,
      errors: [`文件读取失败: ${e instanceof Error ? e.message : String(e)}`],
      warnings: [],
    };
  }
}

/**
 * 校验 ST 预设格式(不转换为 PresetProfile,只验证字段)
 *  - 用于导入前的快速检查
 */
export function validatePresetFormat(jsonText: string): {
  ok: boolean;
  errors: string[];
  promptCount: number;
  orderCount: number;
} {
  const errors: string[] = [];
  let promptCount = 0;
  let orderCount = 0;

  let raw: StPresetRaw;
  try {
    raw = JSON.parse(jsonText) as StPresetRaw;
  } catch (e) {
    return {
      ok: false,
      errors: [`JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`],
      promptCount: 0,
      orderCount: 0,
    };
  }

  if (!Array.isArray(raw.prompts)) {
    errors.push('prompts 不是数组');
  } else {
    promptCount = raw.prompts.length;
    // 抽样校验前 5 条
    for (let i = 0; i < Math.min(5, raw.prompts.length); i++) {
      const p = raw.prompts[i];
      if (!p || typeof p !== 'object') {
        errors.push(`prompts[${i}] 不是对象`);
        continue;
      }
      if (typeof p.identifier !== 'string') {
        errors.push(`prompts[${i}].identifier 缺失或不是字符串`);
      }
    }
  }

  if (Array.isArray(raw.prompt_order)) {
    orderCount = raw.prompt_order.reduce(
      (sum, g) => sum + (Array.isArray(g?.order) ? g.order.length : 0),
      0,
    );
  }

  return { ok: errors.length === 0, errors, promptCount, orderCount };
}
