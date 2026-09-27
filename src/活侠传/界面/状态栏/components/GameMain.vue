<template>
  <!--
    游戏主界面 —— 把状态栏从「表格」改成「能点的场景」。

    ★ 布局照原作：左边一张场景图，右边是本旬能做的事。
      点地图上的建筑去别处，点事做事，点人说话。
  -->
  <div class="gm" v-if="d">
    <!-- ══════ 顶栏：时间 / 地点 / 资源 ══════ -->
    <div class="gm-top">
      <span class="gm-t">
        <b>{{ d.世界.年 }}</b>年<b>{{ d.世界.月 }}</b>月{{ 旬名 }}
        <span class="dim">{{ d.世界.昼夜 }} · {{ d.世界.天气 }}</span>
      </span>
      <span class="gm-spacer" />
      <span class="gm-res" title="行动点：本旬还能做几件事">
        <i v-for="i in d.世界.行动上限" :key="i" class="pip" :class="{ on: i <= d.世界.行动次数 }" />
      </span>
      <span class="gm-res">
        <span class="lab">体力</span>
        <span class="bar"><i :style="{ width: 资源百分(d.你.体力.当前, d.你.体力.上限) + '%' }" /></span>
        <span class="num">{{ d.你.体力.当前 }}</span>
      </span>
      <span class="gm-res">
        <span class="lab">内力</span>
        <span class="bar inner"><i :style="{ width: 资源百分(d.你.内力.当前, d.你.内力.上限) + '%' }" /></span>
        <span class="num">{{ d.你.内力.当前 }}</span>
      </span>
      <span class="gm-res">
        <span class="lab">银两</span><span class="num gold">{{ d.你.银两 }}</span>
      </span>
    </div>

    <!-- ══════ 主区：左场景 右行动 ══════ -->
    <div class="gm-main">
      <!-- 左：场景 -->
      <div class="gm-scene" :class="{ night: 夜间 }">
        <img v-if="场景图" :src="场景图" class="gm-bg" alt="" />
        <div v-else class="gm-bg ph">
          <span>{{ d.世界.当前地点 }}</span>
        </div>
        <div class="gm-scene-veil" />

        <!-- 场景里站着的立绘（点人可说话） -->
        <div class="gm-cast">
          <div
            v-for="p in 在场"
            :key="p.名"
            class="gm-actor"
            :title="p.名 + '（' + p.关系 + '）'"
            @click="找(p)"
          >
            <img v-if="p.图" :src="p.图" alt="" />
            <span v-else class="gm-actor-ph">{{ p.名 }}</span>
            <span class="gm-actor-nm">{{ p.名 }}</span>
          </div>
        </div>

        <div class="gm-place">
          <b>{{ d.世界.当前地点 }}</b>
          <span v-if="此地人数" class="dim">此地 {{ 此地人数 }} 人</span>
        </div>

        <!-- 换地方：点建筑 -->
        <div class="gm-goto">
          <span class="gm-goto-t">前往</span>
          <span
            v-for="地 in 去处"
            :key="地"
            class="gm-goto-b"
            :class="{ cur: 地 === d.世界.当前地点 }"
            @click="去(地)"
          >{{ 地 }}</span>
        </div>
      </div>

      <!-- 右：本旬的事 -->
      <div class="gm-side">
        <div class="gm-sec">
          <div class="gm-sec-t">
            本旬可做
            <span class="dim">{{ d.世界.行动次数 }} / {{ d.世界.行动上限 }}</span>
          </div>
          <div v-if="用完" class="gm-empty">力气用完了，该歇了</div>
          <div v-else class="gm-acts" :class="{ busy }">
            <span
              v-for="a in 可选"
              :key="a.id"
              class="gm-act"
              :class="{ dis: a.耗行动 > d.世界.行动次数, evt: a.来源 === '事件' }"
              @click="做(a)"
            >
              {{ a.名 }}
              <span class="cost">{{ '●'.repeat(a.耗行动) }}</span>
            </span>
          </div>
        </div>

        <!-- 结算结果 -->
        <div v-if="上次" class="gm-sec gm-out">
          <div class="gm-out-h">
            <b>{{ 上次.行动名 }}</b>
            <span v-if="上次.判定 && 上次.判定 !== '无需判定'" class="tier" :class="上次.判定 === '成功' ? 'ok' : 'no'">
              {{ 上次.判定 }}{{ 上次.档位 ? ' · ' + 上次.档位 : '' }}
            </span>
          </div>
          <div v-if="变化项.length" class="gm-delta">
            <span v-for="[k, v] in 变化项" :key="k" :class="v > 0 ? 'up' : 'down'">
              {{ k }} {{ v > 0 ? '+' : '' }}{{ v }}
            </span>
          </div>
          <div v-if="上次.跨旬" class="gm-note">这一旬过去了。</div>
        </div>

        <div v-if="错误" class="gm-err">{{ 错误 }}</div>
      </div>
    </div>

    <!-- ══════ 页签（原有面板）══════ -->
    <div class="gm-tabs">
      <span
        v-for="t in 页签"
        :key="t.k"
        class="gm-tab"
        :class="{ on: view === t.k }"
        @click="view = t.k"
      >{{ t.n }}<i v-if="t.badge" class="badge">{{ t.badge }}</i></span>
    </div>
    <div class="gm-body">
      <TabAttributes v-if="view === 'attr'" :d="d" />
      <TabMartial v-else-if="view === 'martial'" :d="d" />
      <TabItems v-else-if="view === 'items'" :d="d" />
      <TabRelations v-else-if="view === 'rel'" :d="d" />
      <TabQuests v-else-if="view === 'quest'" :d="d" />
      <TabChronicle v-else :d="d" @open-prereq="showPrereq = true" />
    </div>

    <BattlePanel v-if="战斗中" :d="d" @close="void 0" />
    <PrereqCheck v-if="showPrereq" :d="d" @close="showPrereq = false" />
  </div>
</template>

<script setup lang="ts">
import { 当前可做, 结算行动, type 结算报告 } from '../../../脚本/结算';
import { 唐门地点 } from '../../../schema';
import { 此地人名 } from '../../../脚本/众生相';
import { 初始化关系网, 初始化认知 } from '../../../脚本/关系';
import { 资源百分, 门派阶段名 } from '../分档';
import { 取地点场景, 取立绘 } from '../素材';
import { useDataStore } from '../store';
import TabAttributes from './TabAttributes.vue';
import TabMartial from './TabMartial.vue';
import TabItems from './TabItems.vue';
import TabRelations from './TabRelations.vue';
import TabQuests from './TabQuests.vue';
import TabChronicle from './TabChronicle.vue';
import BattlePanel from './BattlePanel.vue';
import PrereqCheck from './PrereqCheck.vue';

const store = useDataStore();
const d = computed(() => store.data as any);

const view = ref<'attr' | 'martial' | 'items' | 'rel' | 'quest' | 'chronicle'>('rel');
const showPrereq = ref(false);
const busy = ref(false);
const 上次 = ref<结算报告 | null>(null);
const 错误 = ref('');

const 旬名 = computed(() => ['', '上旬', '中旬', '下旬'][d.value?.世界.旬 ?? 1] ?? '');
const 夜间 = computed(() => d.value?.世界.昼夜 === '夜');
const 战斗中 = computed(() => d.value?.战斗.状态 === '进行中');

// ══════════════════════════════════════════════════════════════
// 场景与立绘
// ══════════════════════════════════════════════════════════════

/** 当前地点的场景图（按昼夜挑） */
const 场景图 = ref<string | null>(null);

async function 换场景() {
  const 地 = d.value?.世界.当前地点;
  if (!地) return;
  try {
    场景图.value = await 取地点场景(地, d.value?.世界.昼夜);
  } catch (e) {
    console.warn('[活侠传] 取场景失败', e);
  }
}

/** 在场的人（引擎给名单，界面只管取图） */
const 在场名单 = computed<string[]>(() => {
  const 地 = d.value?.世界.当前地点;
  if (!地) return [];
  try {
    // ★ 用 此地人名 而不是 此地有谁 ——
    //   后者按关键词搜，结果里混着事件名（「伙房偷吃」「破庙线」），
    //   拿这些去取立绘会渲染出空白框。此地人名 只回 有人名 为真的。
    return 此地人名(地).slice(0, 3);
  } catch {
    return [];
  }
});

interface 立绘项 { 名: string; 图: string | null; 关系: string }
const 在场 = ref<立绘项[]>([]);

async function 换立绘() {
  const 名单 = 在场名单.value;
  const 关系 = d.value?.关系 ?? {};
  const 出: 立绘项[] = [];
  for (const 名 of 名单) {
    // 名字可能带「（N 人）」，去掉
    const 净名 = 名.replace(/（.*?）/, '').trim();
    let 图: string | null = null;
    try {
      图 = await 取立绘(净名, 'normal');
    } catch {
      /* 没立绘就显示名牌 */
    }
    const r = 关系[净名];
    出.push({ 名: 净名, 图, 关系: r ? `好感 ${r.好感 ?? 0}` : '未识' });
  }
  在场.value = 出;
}

/** 换地方：只改地点变量，不消耗行动 —— 走动本身不要代价 */
function 去(地: string) {
  if (地 === d.value?.世界.当前地点) return;
  const v = d.value;
  if (!v) return;
  v.世界.当前地点 = 地;
  store.data = v;
  换场景();
  换立绘();
}

const 去处 = computed(() => [...唐门地点]);
const 此地人数 = computed(() => 在场.value.length);

async function 找(p: 立绘项) {
  if (busy.value) return;
  await 说(p.名);
}

/** 找人说话：走引擎的对话行动（如果有），否则注入一句叙事让 AI 接 */
async function 说(名: string) {
  const 候选 = 可选.value.find((a: any) => a.名.includes(名));
  if (候选) return 做(候选);
  // 没有对应行动：直接让 AI 演一段
  try {
    injectPrompts([
      {
        id: `hxz-talk-${Date.now()}`,
        position: 'in_chat',
        depth: 0,
        role: 'system',
        content: `<user> 在${d.value?.世界.当前地点}找${名}说话。请按${名}的性格与当前关系演下去。`,
      },
    ], { once: true });
    await triggerSlash('/trigger');
  } catch (e) {
    错误.value = '请手动发一条消息继续';
  }
}

// ══════════════════════════════════════════════════════════════
// 行动（沿用原结算链路）
// ══════════════════════════════════════════════════════════════

const 可选 = computed(() => {
  try {
    return 当前可做(d.value);
  } catch (e) {
    console.warn('[活侠传] 取可选项失败', e);
    return [];
  }
});

const 用完 = computed(() => (d.value?.世界.行动次数 ?? 0) <= 0);
const 变化项 = computed(() =>
  Object.entries(上次.value?.数值变化 ?? {}).filter(([, v]) => Number(v) !== 0));

async function 做(a: { id: string; 名: string; 耗行动: number }) {
  if (busy.value) return;
  busy.value = true;
  错误.value = '';
  上次.value = null;
  try {
    const 结果 = 结算行动(d.value, a.id);
    if (!结果.报告.ok) {
      错误.value = 结果.报告.原因 || '做不了';
      return;
    }
    store.data = 结果.新变 as any;
    if (结果.报告.叙事) {
      try {
        injectPrompts([{
          id: `hxz-turn-${Date.now()}`,
          position: 'in_chat',
          depth: 0,
          role: 'system',
          content: 结果.报告.叙事,
        }], { once: true });
      } catch (e) {
        console.warn('[活侠传] 注入失败', e);
      }
    }
    上次.value = 结果.报告;
    await triggerSlash('/trigger');
  } catch (e) {
    错误.value = e instanceof Error ? e.message : String(e);
    console.error('[活侠传] 结算异常', e);
  } finally {
    busy.value = false;
  }
}

const 页签 = computed(() => [
  { k: 'rel' as const, n: '人物' },
  { k: 'attr' as const, n: '属性' },
  { k: 'martial' as const, n: '武学' },
  { k: 'items' as const, n: '行囊' },
  { k: 'quest' as const, n: '事务', badge: Object.keys(d.value?.任务.支线 ?? {}).length || '' },
  { k: 'chronicle' as const, n: '见闻' },
]);

// ══════════════════════════════════════════════════════════════
// 自举
// ══════════════════════════════════════════════════════════════

onMounted(() => {
  let 试 = 0;
  const 定 = setInterval(() => {
    const v = d.value;
    if (v) {
      clearInterval(定);
      try {
        if (初始化关系网(v) > 0) 初始化认知(v);
      } catch (e) {
        console.warn('[活侠传] 自举失败', e);
      }
      换场景();
      换立绘();
    } else if (++试 > 40) {
      clearInterval(定);
    }
  }, 200);
});

// 地点或昼夜一变就换图
watch(() => [d.value?.世界.当前地点, d.value?.世界.昼夜], () => {
  换场景();
  换立绘();
});
</script>

<style scoped>
.gm {
  font-family: 'Noto Sans SC', 'Songti SC', serif;
  color: var(--p-ink);
}
.gm-top {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 5px 12px;
  background: linear-gradient(180deg, #2a241d, #1d1914);
  color: #e8ddc8;
  font-size: 12.5px;
  border-radius: var(--r) var(--r) 0 0;
}
.gm-top b {
  color: var(--p-gold);
  font-weight: 600;
}
.gm-top .dim {
  opacity: 0.65;
  margin-left: 4px;
}
.gm-spacer {
  flex: 1;
}
.gm-res {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.gm-res .lab {
  opacity: 0.7;
}
.gm-res .num {
  font-weight: 600;
  min-width: 22px;
  text-align: right;
}
.gm-res .num.gold {
  color: var(--p-gold);
}
.gm-res .bar {
  display: inline-block;
  width: 52px;
  height: 6px;
  background: #00000055;
  border-radius: 3px;
  overflow: hidden;
}
.gm-res .bar i {
  display: block;
  height: 100%;
  background: var(--p-bamboo);
  transition: width 0.25s;
}
.gm-res .bar.inner i {
  background: var(--p-stone);
}
.pip {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 3px;
  background: #ffffff22;
}
.pip.on {
  background: var(--p-cinnabar);
  box-shadow: 0 0 4px #a8332a88;
}

/* ── 主区 ── */
.gm-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 0;
}
.gm-scene {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #12100e;
}
.gm-scene.night .gm-bg {
  filter: brightness(0.62) saturate(0.85) hue-rotate(-8deg);
}
.gm-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.5s;
}
.gm-bg.ph {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff33;
  font-size: 26px;
  letter-spacing: 6px;
  background: repeating-linear-gradient(45deg, #1a1713, #1a1713 12px, #1f1b16 12px, #1f1b16 24px);
}
.gm-scene-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0000 55%, #00000099 100%);
  pointer-events: none;
}
.gm-cast {
  position: absolute;
  right: 12px;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  gap: 4px;
}
.gm-actor {
  position: relative;
  width: 92px;
  cursor: pointer;
  transition: transform 0.16s;
}
.gm-actor:hover {
  transform: translateY(-4px);
}
.gm-actor img {
  width: 100%;
  display: block;
  filter: drop-shadow(0 4px 10px #000a);
}
.gm-actor-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 110px;
  background: #ffffff14;
  border: 1px solid #ffffff2a;
  border-radius: var(--r);
  color: #e8ddc8;
  font-size: 12px;
}
.gm-actor-nm {
  display: block;
  text-align: center;
  font-size: 11px;
  color: #e8ddc8;
  text-shadow: 0 1px 3px #000;
  margin-top: -4px;
}
.gm-place {
  position: absolute;
  left: 12px;
  bottom: 46px;
  color: #f2e8d5;
  text-shadow: 0 2px 6px #000;
}
.gm-place b {
  font-size: 19px;
  letter-spacing: 2px;
}
.gm-place .dim {
  font-size: 11.5px;
  opacity: 0.75;
  margin-left: 7px;
}
.gm-goto {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #000000aa;
  backdrop-filter: blur(3px);
}
.gm-goto-t {
  font-size: 11px;
  color: #ffffff88;
  margin-right: 3px;
}
.gm-goto-b {
  padding: 2px 8px;
  border: 1px solid #ffffff33;
  border-radius: 11px;
  font-size: 11.5px;
  color: #e8ddc8;
  cursor: pointer;
  transition: all 0.14s;
}
.gm-goto-b:hover {
  border-color: var(--p-gold);
  color: var(--p-gold);
}
.gm-goto-b.cur {
  background: var(--p-cinnabar);
  border-color: var(--p-cinnabar);
  color: #fff;
}

/* ── 右侧 ── */
.gm-side {
  background: var(--p-paper);
  border-left: 1px solid var(--p-line);
  padding: 9px 11px;
  max-height: 420px;
  overflow-y: auto;
}
.gm-sec {
  margin-bottom: 11px;
}
.gm-sec:last-child {
  margin-bottom: 0;
}
.gm-sec-t {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  color: var(--p-ink-3);
  letter-spacing: 1px;
  padding-bottom: 4px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--p-line);
}
.gm-sec-t .dim {
  font-size: 11px;
  color: var(--p-ink-4);
}
.gm-acts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.gm-acts.busy {
  opacity: 0.5;
  pointer-events: none;
}
.gm-act {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border: 1px solid var(--p-line);
  border-radius: var(--r);
  background: var(--p-paper-2);
  color: var(--p-ink-2);
  font-size: 12.5px;
  cursor: pointer;
  user-select: none;
  transition: all 0.14s;
}
.gm-act:hover {
  border-color: var(--p-cinnabar);
  color: var(--p-cinnabar);
  background: #a8332a0e;
}
.gm-act.dis {
  opacity: 0.38;
  pointer-events: none;
}
.gm-act.evt {
  border-color: var(--p-ochre);
  color: var(--p-ochre);
}
.gm-act .cost {
  font-size: 8px;
  color: var(--p-cinnabar);
  letter-spacing: 1px;
}
.gm-empty {
  font-size: 12px;
  color: var(--p-ink-4);
  padding: 8px 0;
}
.gm-out {
  padding: 7px 9px;
  background: var(--p-paper-2);
  border-left: 2px solid var(--p-cinnabar);
  border-radius: 0 var(--r) var(--r) 0;
}
.gm-out-h {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
}
.gm-delta {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 3px 11px;
  font-size: 11.5px;
}
.gm-delta .up {
  color: var(--p-bamboo);
}
.gm-delta .down {
  color: var(--p-cinnabar);
}
.gm-note {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--p-ink-3);
}
.gm-err {
  font-size: 12px;
  color: var(--p-cinnabar);
}
.tier.ok {
  color: var(--p-bamboo);
  border-color: var(--p-bamboo);
}
.tier.no {
  color: var(--p-ochre);
  border-color: var(--p-ochre);
}

/* ── 页签 ── */
.gm-tabs {
  display: flex;
  gap: 1px;
  background: var(--p-line);
  border-top: 1px solid var(--p-line);
}
.gm-tab {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  font-size: 12.5px;
  background: var(--p-paper-2);
  color: var(--p-ink-3);
  cursor: pointer;
  position: relative;
  transition: all 0.14s;
}
.gm-tab:hover {
  color: var(--p-cinnabar);
}
.gm-tab.on {
  background: var(--p-paper);
  color: var(--p-cinnabar);
  font-weight: 600;
}
.gm-tab .badge {
  font-style: normal;
  font-size: 9px;
  margin-left: 3px;
  padding: 0 4px;
  border-radius: 7px;
  background: var(--p-cinnabar);
  color: #fff;
}
.gm-body {
  padding: 9px 11px;
  background: var(--p-paper);
  border-radius: 0 0 var(--r) var(--r);
  max-height: 460px;
  overflow-y: auto;
}
</style>
