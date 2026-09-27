// ════════════════════════════════════════════════════════════
// inject-default-stat.mjs
// 从 initvar.yaml 生成 DEFAULT_STAT JS 代码，并注入到
// regex-[界面]状态栏.json 的 replaceString 中
// ════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const INITVAR_YAML = path.join(ROOT, '世界书', '变量', 'initvar.yaml');
const REGEX_JSON = path.join(ROOT, '正则', '界面', 'regex-[界面]状态栏.json');

// ── 1. 解析 initvar.yaml（简易解析：取 stat_data 顶层） ──
function parseInitvarYaml(text) {
  const lines = text.split(/\r?\n/);
  // 跳过注释行和空行，找到 stat_data: 顶层
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^stat_data:\s*$/.test(lines[i])) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx < 0) throw new Error('未找到 stat_data: 顶层');

  // 收集所有缩进 2 空格的命名空间块
  const namespaces = {};
  let curNs = null;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    // 命名空间开始：2 空格 + 名称 + 冒号 + 可选值
    // 兼容两种：① 多行命名空间 `时间:` ② 单行空对象 `女角: {}`
    // 严格 2 空格缩进：名称首字符必须非空白（避免匹配 4 空格字段）
    const nsMatch = /^  ([^:\s]+):\s*(.*)$/.exec(line);
    if (nsMatch) {
      const nsName = nsMatch[1].trim();
      const nsInlineVal = (nsMatch[2] || '').trim();
      if (nsInlineVal === '{}') {
        // 空对象命名空间（如 女角: {}）
        namespaces[nsName] = {};
        curNs = nsName;
        continue;
      }
      if (nsInlineVal === '') {
        // 多行命名空间
        namespaces[nsName] = {};
        curNs = nsName;
        continue;
      }
      // 单行命名空间（罕见，作为对象处理）
      namespaces[nsName] = {};
      curNs = nsName;
      continue;
    }
    // 命名空间内字段：4 空格 + 字段: 值
    if (curNs && namespaces[curNs] !== undefined) {
      const fieldMatch = /^    ([^:]+):\s*(.*)$/.exec(line);
      if (fieldMatch) {
        const key = fieldMatch[1].trim();
        const rawVal = fieldMatch[2].trim();
        // 跳过空行
        if (rawVal === '') continue;
        // 解析值
        namespaces[curNs][key] = parseYamlValue(rawVal);
      }
    }
  }
  return namespaces;
}

function parseYamlValue(raw) {
  let v = raw;
  // 字符串：单引号或双引号包裹
  if (v.startsWith("'") || v.startsWith('"')) {
    const quote = v[0];
    let end = -1;
    for (let i = 1; i < v.length; i++) {
      if (v[i] === quote) {
        // 单引号转义：'' 表示一个 '
        if (quote === "'" && v[i + 1] === "'") {
          i++;
          continue;
        }
        end = i;
        break;
      }
    }
    if (end > 0) {
      // 提取字符串内容，单引号转义 '' → '
      const strVal = v.slice(1, end).replace(/''/g, "'");
      return strVal;
    }
  }
  // 非字符串：去除尾部注释（空格 + #）
  const cmtMatch = v.match(/\s+#.*$/);
  if (cmtMatch) v = v.slice(0, cmtMatch.index).trim();
  // 布尔
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  // 数字
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  // 其他
  return v;
}

// ── 2. 生成 DEFAULT_STAT JS 代码 ──
function jsVal(v, indent) {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'object' && !Array.isArray(v)) {
    if (Object.keys(v).length === 0) return '{}';
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    const entries = Object.entries(v).map(([k, val]) => {
      const kStr = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
      return `${pad}${kStr}:${jsVal(val, indent + 1)}`;
    });
    return `{\n${entries.join(',\n')}\n${closePad}}`;
  }
  return '{}';
}

function genDefaultStat(namespaces) {
  const lines = [
    '/* ============================================================',
    ' * 首楼默认数据（首楼渲染时 schema 异步加载未就绪，stat_data 宏可能未替换，',
    ' * 用此常量打底，确保首楼立即显示完整数据，不依赖 MVU/schema/prefault）',
    ' * 数据与 开场白/0.txt 的 <initvar> YAML 完全一致',
    ' * ============================================================ */',
    'var DEFAULT_STAT={'
  ];
  const keys = Object.keys(namespaces);
  keys.forEach((ns, i) => {
    const val = namespaces[ns];
    const kStr = /^[A-Za-z_$][\w$]*$/.test(ns) ? ns : JSON.stringify(ns);
    const comma = i < keys.length - 1 ? ',' : '';
    lines.push(`  ${kStr}:${jsVal(val, 1)}${comma}`);
  });
  lines.push('};');
  return lines.join('\n');
}

// ── 3. deepMergeStat 函数 ──
const DEEP_MERGE_FN = `
/* 深合并：用 src 的值覆盖 dst（递归到对象层），返回新对象 */
function deepMergeStat(dst,src){
  if(!src||typeof src!=='object')return dst;
  var out={};
  try{out=JSON.parse(JSON.stringify(dst||{}))}catch(e){out={}}
  for(var k in src){
    if(!Object.prototype.hasOwnProperty.call(src,k))continue;
    var sv=src[k],dv=out[k];
    if(sv&&typeof sv==='object'&&!Array.isArray(sv)&&dv&&typeof dv==='object'&&!Array.isArray(dv)){
      out[k]=deepMergeStat(dv,sv);
    }else{
      out[k]=sv;
    }
  }
  return out;
}
`.trim();

// ── 4. 注入到 regex JSON ──
function injectIntoRegexJson(regexJsonPath, defaultStatCode, deepMergeFnCode) {
  const raw = fs.readFileSync(regexJsonPath, 'utf8');
  const obj = JSON.parse(raw);
  let rs = obj.replaceString;
  if (typeof rs !== 'string') throw new Error('replaceString 不是字符串');

  // 4.1 删除已存在的 DEFAULT_STAT 块（幂等）
  const dsStart = rs.indexOf('/* ============================================================\n * 首楼默认数据');
  if (dsStart >= 0) {
    const dsEnd = rs.indexOf('var DEFAULT_STAT={', dsStart);
    if (dsEnd >= 0) {
      // 找到 var DEFAULT_STAT={...}; 的结束
      const afterStart = dsEnd + 'var DEFAULT_STAT='.length;
      let depth = 0;
      let i = afterStart;
      for (; i < rs.length; i++) {
        if (rs[i] === '{') depth++;
        else if (rs[i] === '}') {
          depth--;
          if (depth === 0) {
            i++;
            if (rs[i] === ';') i++;
            break;
          }
        }
      }
      // 同时移除前导注释块
      const blockEnd = i;
      // 反向查找注释起点
      let commentStart = dsStart;
      // 删除 [commentStart, blockEnd)
      rs = rs.slice(0, commentStart) + rs.slice(blockEnd);
    }
  }

  // 4.2 删除已存在的 deepMergeStat 函数
  const dmStart = rs.indexOf('/* 深合并：用 src 的值覆盖 dst');
  if (dmStart >= 0) {
    const dmEnd = rs.indexOf('function deepMergeStat(', dmStart);
    if (dmEnd >= 0) {
      // 找到函数结束位置（return out;\n}）
      const fnBodyStart = rs.indexOf('{', dmEnd);
      let depth = 0;
      let i = fnBodyStart;
      for (; i < rs.length; i++) {
        if (rs[i] === '{') depth++;
        else if (rs[i] === '}') {
          depth--;
          if (depth === 0) { i++; break; }
        }
      }
      const blockEnd = i;
      let commentStart = dmStart;
      rs = rs.slice(0, commentStart) + rs.slice(blockEnd);
    }
  }

  // 4.3 修改 readStatData() 用 deepMergeStat 包装
  // 幂等检查：如果 readStatData 已包含 deepMergeStat，则跳过
  if (rs.indexOf('function readStatData()') >= 0 && rs.indexOf('deepMergeStat(DEFAULT_STAT,') >= 0) {
    console.log('[INFO] readStatData() 已包含 deepMergeStat，跳过');
  } else {
    const oldReadStatData = `function readStatData() {
      const mesId = resolveMessageId();
      // 1. 优先使用 bridge 缓存（由 dj2-mvu-stat-data 事件更新的最新值）
      if (cachedStatFromBridge && hasMeaningfulStatData(cachedStatFromBridge) &&
          mesId >= 0 && cachedBridgeMessageId >= 0 &&
          cachedBridgeMessageId === mesId) {
        return cachedStatFromBridge;
      }
      // 2. 尝试通过 MVU API 读取最新值（额外模型更新后的值）
      const Mvu = getMvu();
      const opt = getMessageOption();
      try {
        const stat = pickStatData(Mvu?.getMvuData?.(opt));
        if (stat) return stat;
      } catch {}
      try { const stat = pickStatData(getVariablesFn?.(opt)); if (stat) return stat; } catch {}
      try { const stat = pickStatData(getAllVariablesFn?.()); if (stat) return stat; } catch {}
      // 3. 回退到嵌入的 stat_data（正则替换时嵌入，可能是旧值）
      const embedded = parseEmbeddedStat();
      if (embedded) return embedded;
      return {};
    }`;

    const newReadStatData = `function readStatData() {
      const mesId = resolveMessageId();
      // 1. 优先使用 bridge 缓存（由 dj2-mvu-stat-data 事件更新的最新值）
      if (cachedStatFromBridge && hasMeaningfulStatData(cachedStatFromBridge) &&
          mesId >= 0 && cachedBridgeMessageId >= 0 &&
          cachedBridgeMessageId === mesId) {
        return deepMergeStat(DEFAULT_STAT, cachedStatFromBridge);
      }
      // 2. 尝试通过 MVU API 读取最新值（额外模型更新后的值）
      const Mvu = getMvu();
      const opt = getMessageOption();
      try {
        const stat = pickStatData(Mvu?.getMvuData?.(opt));
        if (stat) return deepMergeStat(DEFAULT_STAT, stat);
      } catch {}
      try { const stat = pickStatData(getVariablesFn?.(opt)); if (stat) return deepMergeStat(DEFAULT_STAT, stat); } catch {}
      try { const stat = pickStatData(getAllVariablesFn?.()); if (stat) return deepMergeStat(DEFAULT_STAT, stat); } catch {}
      // 3. 回退到嵌入的 stat_data（正则替换时嵌入，可能是旧值）
      const embedded = parseEmbeddedStat();
      if (embedded) return deepMergeStat(DEFAULT_STAT, embedded);
      // 4. 全部失败：返回 DEFAULT_STAT 兜底（确保首楼能渲染）
      return deepMergeStat(DEFAULT_STAT, {});
    }`;

    if (rs.indexOf(oldReadStatData) >= 0) {
      rs = rs.replace(oldReadStatData, newReadStatData);
      console.log('[INFO] readStatData() 精确匹配替换');
    } else {
      // 兜底：如果精确匹配失败，用正则匹配
      const re = /function readStatData\(\)\s*\{[\s\S]*?return\s+\{\};\s*\}/;
      if (re.test(rs)) {
        rs = rs.replace(re, newReadStatData);
        console.log('[INFO] readStatData() 通过正则匹配替换');
      } else {
        console.warn('[WARN] 未找到 readStatData()，请手动检查');
      }
    }
  }

  // 4.4 在 parseEmbeddedStat 函数之前注入 DEFAULT_STAT + deepMergeStat
  const parseEmbeddedMarker = 'function parseEmbeddedStat() {';
  const injectIdx = rs.indexOf(parseEmbeddedMarker);
  if (injectIdx < 0) throw new Error('未找到 parseEmbeddedStat 函数位置');

  const injection = defaultStatCode + '\n\n' + deepMergeFnCode + '\n\n';
  rs = rs.slice(0, injectIdx) + injection + rs.slice(injectIdx);

  obj.replaceString = rs;
  fs.writeFileSync(regexJsonPath, JSON.stringify(obj, null, 2), 'utf8');
  console.log('[OK] 注入完成：', regexJsonPath);
  console.log('[OK] DEFAULT_STAT 大小：', defaultStatCode.length, '字节');
}

// ── 5. 修复 init() 事件监听（对齐系统哥末日） ──
function fixInitEvents(regexJsonPath) {
  const raw = fs.readFileSync(regexJsonPath, 'utf8');
  const obj = JSON.parse(raw);
  let rs = obj.replaceString;

  // 幂等检查：如果 init() 已包含 GENERATION_ENDED，则跳过
  if (rs.indexOf("onEvent('GENERATION_ENDED'") >= 0 || rs.indexOf('onEvent(\'GENERATION_ENDED\'') >= 0) {
    console.log('[INFO] init() 已包含 GENERATION_ENDED 监听，跳过');
    return;
  }

  // 旧 init() 函数体（精确匹配）
  const oldInit = `async function init() {
      // 直接刷新：无锁、无延迟（对齐囚笼卡方案）
      const scheduleRefresh = async () => {
        await waitForReadableStat();
        await populatePanel();
        requestStatFromBridge();
      };

      window.addEventListener('message', (event) => {
        const data = event?.data;
        if (data?.type !== 'dj2-mvu-stat-data' || !data.stat_data) return;
        const mesId = resolveMessageId();
        if (mesId >= 0 && typeof data.messageId === 'number' && data.messageId >= 0 && data.messageId !== mesId) return;
        if (!hasMeaningfulStatData(data.stat_data)) return;
        cachedStatFromBridge = data.stat_data;
        cachedBridgeMessageId = typeof data.messageId === 'number' ? data.messageId : mesId;
        void populatePanel();
      });

      const wait = waitGlobalInitializedFn ?? (typeof waitGlobalInitialized !== 'undefined' ? waitGlobalInitialized : null);
      const onEvent = eventOnFn ?? (typeof eventOn !== 'undefined' ? eventOn : null);
      const Mvu = getMvu();
      const tavernEvents = pickHostValue('tavern_events') ?? (typeof tavern_events !== 'undefined' ? tavern_events : null);
      if (wait) {
        try { await wait('Mvu'); } catch {}
      }

      const embedded = parseEmbeddedStat();
      if (embedded) {
        cachedStatFromBridge = embedded;
        cachedBridgeMessageId = resolveMessageId();
      }

      // 首次渲染
      void scheduleRefresh();

      // 事件驱动刷新：MVU 变量更新完成 + 消息更新
      if (Mvu?.events?.VARIABLE_UPDATE_ENDED && onEvent) {
        onEvent(Mvu.events.VARIABLE_UPDATE_ENDED, () => { void scheduleRefresh(); });
      }
      if (onEvent && tavernEvents) {
        if (tavernEvents.MESSAGE_UPDATED) onEvent(tavernEvents.MESSAGE_UPDATED, () => { void scheduleRefresh(); });
        if (tavernEvents.MESSAGE_RECEIVED) onEvent(tavernEvents.MESSAGE_RECEIVED, () => { void scheduleRefresh(); });
      }

      // 兜底：多次延迟重试，确保额外模型完成后能刷新
      // 额外模型模式：主模型先输出 → 额外模型后处理 UpdateVariable
      // 1s/2s/4s 三次延迟兜底，覆盖额外模型处理时间窗口
      setTimeout(() => { void scheduleRefresh(); }, 1000);
      setTimeout(() => { void scheduleRefresh(); }, 2000);
      setTimeout(() => { void scheduleRefresh(); }, 4000);
    }`;

  // 新 init() — 对齐系统哥末日：增加 GENERATION_ENDED / MESSAGE_EDITED 监听 + 800ms 延迟 + window message 字符串兜底
  const newInit = `async function init() {
      // 800ms 延迟刷新：给 MVU 时间完成数据写入（对齐系统哥末日）
      const scheduleRefresh = async () => {
        await waitForReadableStat();
        await populatePanel();
        requestStatFromBridge();
      };
      const autoRefresh = () => { setTimeout(() => { void scheduleRefresh(); }, 800); };

      window.addEventListener('message', (event) => {
        const data = event?.data;
        // bridge 响应：宿主回传 stat_data
        if (data?.type === 'dj2-mvu-stat-data' && data.stat_data) {
          const mesId = resolveMessageId();
          if (mesId >= 0 && typeof data.messageId === 'number' && data.messageId >= 0 && data.messageId !== mesId) return;
          if (!hasMeaningfulStatData(data.stat_data)) return;
          cachedStatFromBridge = data.stat_data;
          cachedBridgeMessageId = typeof data.messageId === 'number' ? data.messageId : mesId;
          void populatePanel();
          return;
        }
        // 兜底：字符串匹配 generation_ended / message_edit
        const t = (data?.type) || (typeof data === 'string' ? data : '') || '';
        if (typeof t === 'string' && (t.indexOf('generation_ended') >= 0 || t.indexOf('message_edit') >= 0)) {
          autoRefresh();
        }
      });

      const wait = waitGlobalInitializedFn ?? (typeof waitGlobalInitialized !== 'undefined' ? waitGlobalInitialized : null);
      const onEvent = eventOnFn ?? (typeof eventOn !== 'undefined' ? eventOn : null);
      const Mvu = getMvu();
      const tavernEvents = pickHostValue('tavern_events') ?? (typeof tavern_events !== 'undefined' ? tavern_events : null);
      if (wait) {
        try { await wait('Mvu'); } catch {}
      }

      const embedded = parseEmbeddedStat();
      if (embedded) {
        cachedStatFromBridge = embedded;
        cachedBridgeMessageId = resolveMessageId();
      }

      // 首次渲染（同步立即渲染，不等延迟）
      void scheduleRefresh();

      // 关键事件监听：GENERATION_ENDED + MESSAGE_EDITED（对齐系统哥末日，同级生2 原缺失）
      if (onEvent) {
        try { onEvent('GENERATION_ENDED', autoRefresh); } catch {}
        try { onEvent('MESSAGE_EDITED', autoRefresh); } catch {}
      }

      // 事件驱动刷新：MVU 变量更新完成 + 消息更新
      if (Mvu?.events?.VARIABLE_UPDATE_ENDED && onEvent) {
        onEvent(Mvu.events.VARIABLE_UPDATE_ENDED, autoRefresh);
      }
      if (onEvent && tavernEvents) {
        if (tavernEvents.MESSAGE_UPDATED) onEvent(tavernEvents.MESSAGE_UPDATED, autoRefresh);
        if (tavernEvents.MESSAGE_RECEIVED) onEvent(tavernEvents.MESSAGE_RECEIVED, autoRefresh);
      }

      // 兜底：多次延迟重试，确保额外模型完成后能刷新
      // 额外模型模式：主模型先输出 → 额外模型后处理 UpdateVariable
      // 1s/2s/4s 三次延迟兜底，覆盖额外模型处理时间窗口
      setTimeout(() => { void scheduleRefresh(); }, 1000);
      setTimeout(() => { void scheduleRefresh(); }, 2000);
      setTimeout(() => { void scheduleRefresh(); }, 4000);
    }`;

  if (rs.indexOf(oldInit) >= 0) {
    rs = rs.replace(oldInit, newInit);
    console.log('[INFO] init() 精确匹配替换');
  } else {
    // 兜底：用正则匹配
    const re = /async function init\(\)\s*\{[\s\S]*?setTimeout\(\(\)\s*=>\s*\{\s*void scheduleRefresh\(\);\s*\},\s*4000\);\s*\}/;
    if (re.test(rs)) {
      rs = rs.replace(re, newInit.trim());
      console.log('[INFO] init() 通过正则匹配替换');
    } else {
      console.warn('[WARN] 未找到 init() 函数，跳过事件监听修复');
      return;
    }
  }

  obj.replaceString = rs;
  fs.writeFileSync(regexJsonPath, JSON.stringify(obj, null, 2), 'utf8');
  console.log('[OK] init() 事件监听修复完成');
}

// ── 主流程 ──
function main() {
  console.log('=== inject-default-stat.mjs ===');
  console.log('initvar.yaml:', INITVAR_YAML);
  console.log('regex json:', REGEX_JSON);

  const yamlText = fs.readFileSync(INITVAR_YAML, 'utf8');
  const ns = parseInitvarYaml(yamlText);
  console.log('[OK] 解析 initvar.yaml，命名空间：', Object.keys(ns));
  for (const k of Object.keys(ns)) {
    const fields = Object.keys(ns[k]);
    console.log(`  - ${k}: ${fields.length} 字段`);
  }

  const defaultStatCode = genDefaultStat(ns);
  // 调试输出
  fs.writeFileSync(path.join(__dirname, 'default-stat-preview.js'), defaultStatCode, 'utf8');
  console.log('[OK] DEFAULT_STAT 预览已写入 scripts/default-stat-preview.js');

  injectIntoRegexJson(REGEX_JSON, defaultStatCode, DEEP_MERGE_FN);

  // 修复 init() 事件监听
  fixInitEvents(REGEX_JSON);

  console.log('=== 完成 ===');
}

main();
