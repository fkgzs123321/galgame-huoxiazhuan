/**
 * 素材加载器：从 CDN 的 .pack 里按需取图。
 *
 * ══════════════════════════════════════════════════════════════
 * 为什么是这个形态
 * ══════════════════════════════════════════════════════════════
 *
 * 游戏里扒出 2047 张贴图、压缩后 148 MB。逐张推 CDN 要 4000+ 次 API 调用，
 * 于是打包成 156 个 .pack（每类一个），UI 按需取。
 *
 * .pack 格式（刻意做得极简，这里 20 行就能解）：
 *   [4 字节 小端] 条目数 N
 *   N × [4 字节 偏移][4 字节 长度]
 *   ... 全部 WebP 原始字节，按顺序拼接
 *
 * ══════════════════════════════════════════════════════════════
 * 三条设计约束
 * ══════════════════════════════════════════════════════════════
 *
 * ① **一次请求取一个包，包内全部贴图都缓存下来。**
 *    立绘包 1~2 MB，里面有十几张表情。取一次就够切好几轮对话，
 *    不能「一张表情一个请求」。
 *
 * ② **同一包并发只发一次请求。**
 *    对话里连续切表情、战斗里连播动作，都会在同一帧里要同一包的图。
 *    用 pending 表去重，否则一个包会被拉十几次。
 *
 * ③ **失败要能降级，不能白屏。**
 *    取不到图时返回 null，调用方显示占位（古风边框 + 角色名），
 *    界面照样能玩。素材是锦上添花，不是运行前提。
 */

/**
 * CDN 前缀。
 *
 * ★ 由 webpack 的 DefinePlugin 在构建时替换成字面量
 *   （见 webpack.config.ts 的 `__ASSET_BASE__`）。
 *   声明写在这里而不是全局 .d.ts —— 只有这个文件用它，
 *   没必要让整个项目都看见这个符号。
 */
declare const __ASSET_BASE__: string;

const 基础 = (() => {
  try {
    if (typeof __ASSET_BASE__ === 'string' && __ASSET_BASE__) return __ASSET_BASE__;
  } catch {
    /* 未注入时走兜底 */
  }
  // 兜底：直接跑 dist 产物（没走 webpack）时仍能取到图。
  // ★ pin 到 commit —— @main 会被 jsDelivr 缓存，推了新的仍发旧的。
  return 'https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-huoxiazhuan@63b9130/';
})();

/** 包名 → { 贴图名: [偏移, 长度] }。首次用到时才拉。 */
let 索引: Record<string, Record<string, [number, number]>> | null = null;
/** 语义索引：场景 / 地点 / 角色立绘 / 战斗立绘 */
let 语义: {
  场景: Record<string, { 包: string; 宽: number; 高: number }>;
  地点: Record<string, string[]>;
  角色立绘: Record<string, string>;
  战斗立绘: string[];
} | null = null;

/** 包名 → 已解码的 blob URL 表（贴图名 → url） */
const 包缓存 = new Map<string, Map<string, string>>();
/** 正在请求中的包，避免同一包并发多拉 */
const 进行中 = new Map<string, Promise<Map<string, string>>>();

/** 索引本身也走同一个去重 */
let 索引Promise: Promise<void> | null = null;

async function 备索引(): Promise<void> {
  if (索引 && 语义) return;
  if (索引Promise) return 索引Promise;
  索引Promise = (async () => {
    const [a, b] = await Promise.all([
      fetch(基础 + 'pack_index.json').then(r => (r.ok ? r.json() : null)),
      fetch(基础 + 'scenes.json').then(r => (r.ok ? r.json() : null)),
    ]);
    索引 = a ?? {};
    语义 = b ?? { 场景: {}, 角色立绘: {}, 战斗立绘: [] };
  })().catch(e => {
      console.warn('[活侠传] 素材索引取不到，界面将用占位图', e);
    索引 = {};
    语义 = { 场景: {}, 地点: {}, 角色立绘: {}, 战斗立绘: [] };
  }).finally(() => {
    索引Promise = null;
  });
  return 索引Promise;
}

/**
 * 取一个包并解出其中全部贴图。
 *
 * ★ 解包逻辑必须与 `_work/pack_assets.py` 严格对应。
 *   改那边要同步改这里，否则偏移全错、图全是花的。
 */
async function 取包(包名: string): Promise<Map<string, string>> {
  const 已有 = 包缓存.get(包名);
  if (已有) return 已有;
  const 在跑 = 进行中.get(包名);
  if (在跑) return 在跑;

  const p = (async () => {
    await 备索引();
    const m = new Map<string, string>();
    if (!索引) return m;

    // ★★ 分片包的处理（这里踩过两次坑，写清楚）：
    //
    //   打包时按 8 MB 上限切分，切了的包叫 `combat.1.pack` / `combat.2.pack`。
    //   索引的键**不带 `.pack`**，分片则保留 `.1` / `.2`。
    //
    //   所以取包顺序是：
    //     ① 先请求 `<包名>.pack`（未切分的情况，绝大多数）
    //     ② 再依次请求 `<包名>.1.pack`、`.2.pack`、`.3.pack`
    //        （切分的情况；索引里贴图名带 `.N` 后缀的会落到这里）
    //
    //   ★ 不要再往包名后面拼 `.pack` —— 索引里的包名已经不含后缀了。
    //     踩过：场景索引里存了 `background_03.pack`，这里又拼一次，
    //     请求变成 `.pack.pack` → 404，场景图一直出不来。
    let buf: ArrayBuffer | null = null;
    for (const c of [包名, `${包名}.1`, `${包名}.2`, `${包名}.3`]) {
      try {
        const r = await fetch(`${基础}${c}.pack`);
        if (r.ok) {
          buf = await r.arrayBuffer();
          break;
        }
      } catch {
        /* 网络错就试下一个 */
      }
    }
    if (!buf) {
      console.warn('[活侠传] 包取不到: ' + 包名);
      return m;
    }

    const dv = new DataView(buf);
    const N = dv.getUint32(0, true);
    const 头长 = 4 + N * 8;
    if (N > 20000 || 头长 > buf.byteLength) {
      console.warn('[活侠传] 包头异常: ' + 包名);
      return m;
    }

    // ★ 用**偏移**反查贴图名，不靠顺序。
    //   包的头部就是一张「偏移 → 长度」表，而索引知道「贴图名 → 偏移」，
    //   两边一接就能对上。比依赖写入顺序稳。
    const 偏到名 = new Map<number, string>();
    for (const 键 in 索引) {
      for (const 名 in 索引[键]) 偏到名.set(索引[键][名][0], 名);
    }

    for (let i = 0; i < N; i++) {
      const 偏 = dv.getUint32(4 + i * 8, true);
      const 长 = dv.getUint32(8 + i * 8, true);
      const 名 = 偏到名.get(偏);
      if (!名 || 偏 + 长 > buf.byteLength) continue;
      const blob = new Blob([buf.slice(偏, 偏 + 长)], { type: 'image/webp' });
      m.set(名, URL.createObjectURL(blob));
    }
    包缓存.set(包名, m);
    return m;
  })().finally(() => 进行中.delete(包名));

  进行中.set(包名, p);
  return p;
}

// ══════════════════════════════════════════════════════════════
// 对外接口
// ══════════════════════════════════════════════════════════════

/** 表情别名：把剧情里的情绪词对到实际的贴图名 */
const 表情别名: Record<string, string[]> = {
  normal: ['normal', 'normal_1', 'nomal'],
  laugh: ['laugh1', 'laugh', 'laugh2', 'close_eye_laugh'],
  angry: ['angry1', 'angry', 'angry2'],
  sad: ['sad1', 'sad', 'sad2', 'cry', 'cry1'],
  nervous: ['nervous1', 'nervous', 'nervous2'],
  shy: ['shy', 'shy1', 'shy2'],
  hurt: ['hurt', 'face_hurt'],
  gloomy: ['gloomy', 'gloomy2'],
};

/**
 * 取角色立绘。
 *
 * @param 角色 角色名（如「唐默铃」）
 * @param 情绪 情绪词（normal/laugh/angry/sad/nervous/shy/hurt/gloomy），取不到时退回 normal
 * @returns blob URL；素材缺失时返回 null（调用方显示占位）
 */
export async function 取立绘(角色: string, 情绪 = 'normal'): Promise<string | null> {
  await 备索引();
  const 包 = 语义?.角色立绘?.[角色];
  if (!包) return null;
  const m = await 取包(包);
  for (const 候 of 表情别名[情绪] ?? [情绪]) {
    const u = m.get(候);
    if (u) return u;
  }
  // 退回 normal，再退回任意一张
  return m.get('normal') ?? m.values().next().value ?? null;
}

/** 取场景背景（传 screen_ 开头的名字，或地点中文名） */
export async function 取场景(名: string): Promise<string | null> {
  await 备索引();
  const 场景 = 语义?.场景 ?? {};
  let 贴图 = 名;
  if (!场景[贴图]) {
    // 模糊匹配：地点名 → screen_xxx
    const 键 = Object.keys(场景).find(k => k.includes(名) || 名.includes(k.replace('screen_', '')));
    if (键) 贴图 = 键;
  }
  const e = 场景[贴图];
  if (!e) return null;
  const m = await 取包(e.包);
  return m.get(贴图) ?? null;
}

/**
 * 按**地点 + 时间**取场景图。
 *
 * ★ 这是界面的主入口。原作每个地点在不同时段有不同画面
 *   （screen_center_morning / _evening / _night），
 *   挑图规则：
 *     ① 先在候选里找**带时段后缀**的（_morning/_day/_dusk/_evening/_night）
 *     ② 没有就退回不带后缀的
 *
 * @param 地点 唐门 12 处之一（正心堂/练功场/…）
 * @param 时段 早上 / 白天 / 黄昏 / 夜 —— 由界面的「昼夜」推
 */
export async function 取地点场景(地点: string, 时段?: string): Promise<string | null> {
  await 备索引();
  const 候s = 语义?.地点?.[地点];
  if (!候s || !候s.length) {
    // 位置不在唐门（外出、江湖）—— 直接把地名当场景名试
    return 取场景(地点);
  }
  const 后缀: Record<string, string[]> = {
    早上: ['_morning', '_day'],
    白天: ['_day', ''],
    黄昏: ['_dusk', '_evening', '_day'],
    夜: ['_night'],
  };
  const 想 = 后缀[时段 ?? '白天'] ?? ['_day', ''];
  for (const s of 想) {
    for (const c of 候s) {
      if (s && c.endsWith(s)) return 取场景(c);
    }
  }
  // 无时段后缀的
  for (const c of 候s) {
    if (!/_(morning|day|dusk|evening|night)$/.test(c)) return 取场景(c);
  }
  return 取场景(候s[0]);
}

/** 取战斗动作图 */
export async function 取战斗图(包名: string, 动作: string): Promise<string | null> {
  const m = await 取包(包名);
  for (const 候 of [动作, `${动作}_1`, `${动作}1`, 'idle', 'normal']) {
    const u = m.get(候);
    if (u) return u;
  }
  return m.values().next().value ?? null;
}

/** 这个角色有没有立绘（界面据此决定要不要留位置） */
export async function 有立绘(角色: string): Promise<boolean> {
  await 备索引();
  return Boolean(语义?.角色立绘?.[角色]);
}

/** 列出所有可用场景名（调试与自动配图用） */
export async function 场景清单(): Promise<string[]> {
  await 备索引();
  return Object.keys(语义?.场景 ?? {});
}

/** 释放全部 blob URL（界面卸载时调，否则反复开关会漏内存） */
export function 释放缓存() {
  for (const m of 包缓存.values()) {
    for (const u of m.values()) URL.revokeObjectURL(u);
  }
  包缓存.clear();
}

/** 预取若干包（进战斗前把双方立绘先拉进来，避免开打才加载） */
export async function 预取(...包名s: string[]) {
  await Promise.all(包名s.map(取包));
}
