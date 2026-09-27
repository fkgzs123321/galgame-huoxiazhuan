<template>
  <!-- 行动面板 —— 前端触发引擎结算的唯一入口 -->
  <div class="hx-sec">
    <div class="hx-sec-t">
      本旬可做的事
      <span class="note">
        <template v-if="事件数">含 {{ 事件数 }} 件遇上事 · </template>
        {{ d.世界.行动次数 }} / {{ d.世界.行动上限 }} 次行动
      </span>
    </div>

    <div v-if="!用完 && !可选.length" class="hx-empty">眼下无处可去</div>
    <div v-else-if="用完" class="hx-empty">这一旬的力气用完了，该歇了</div>

    <div v-else class="act-wrap" :class="{ busy }">
      <div v-for="(组, 地) in 分组" :key="地" class="act-group">
        <div class="act-place">{{ 地 }}</div>
        <div class="act-row">
          <span
            v-for="a in 组"
            :key="a.id"
            class="act-btn"
            :class="{
              dis: busy || a.耗行动 > d.世界.行动次数,
              evt: (a as any).来源 === '事件',
            }"
            :title="
              (a as any).来源 === '事件'
                ? `原作事件 · ${(a as any).类别 || ''}${a.耗行动 ? ' · 消耗 ' + a.耗行动 + ' 次行动' : ' · 不消耗行动'}`
                : `消耗 ${a.耗行动} 次行动`
            "
            @click="执行(a)"
          >
            {{ a.名 }}
            <span class="act-cost">{{ '●'.repeat(a.耗行动) }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 结算结果：给玩家看数值，给 AI 的叙事另行注入 -->
    <div v-if="上次" class="act-result">
      <div class="act-result-h">
        <b>{{ 上次.行动名 }}</b>
        <span v-if="上次.判定 !== '无需判定'" class="tier" :class="上次.判定 === '成功' ? 'ok' : 'no'">
          {{ 上次.判定 }}{{ 上次.档位 ? ' · ' + 上次.档位 : '' }}
        </span>
      </div>
      <div v-if="变化项.length" class="act-delta">
        <span v-for="[k, v] in 变化项" :key="k" :class="v > 0 ? 'up' : 'down'">
          {{ k }} {{ v > 0 ? '+' : '' }}{{ v }}
        </span>
      </div>
      <div v-if="上次.跨旬" class="act-note">这一旬过去了。</div>
      <div v-if="上次.阶段推进" class="act-note gold">门中气象有变。</div>
    </div>

    <div v-if="错误" class="act-err">{{ 错误 }}</div>
  </div>
</template>

<script setup lang="ts">
import { 当前可做, 结算行动, type 结算报告 } from '../../../脚本/结算';
import { useDataStore } from '../store';

const store = useDataStore();
const d = computed(() => store.data as any);

const props = defineProps<{ 地点?: string }>();

const busy = ref(false);
const 上次 = ref<结算报告 | null>(null);
const 错误 = ref('');

/** 用引擎算，前端不自己判断 */
const 可选 = computed(() => {
  try {
    return 当前可做(d.value);
  } catch (e) {
    console.warn('[活侠传] 取可选项失败', e);
    return [];
  }
});

const 用完 = computed(() => (d.value?.世界.行动次数 ?? 0) <= 0);

/** 按地点分组（单元没有地点，归「别处」） */
const 分组 = computed(() => {
  const out: Record<string, typeof 可选.value> = {};
  for (const a of 可选.value) {
    const 地 = (a as any).地点 || ((a as any).来源 === '事件' ? '遇上的事' : '别处');
    (out[地] ||= []).push(a);
  }
  return out;
});

/** ★ 原作事件单独统计 —— 它们是「到了这旬该发生的」，不是玩家挑的活 */
const 事件数 = computed(() => 可选.value.filter((a: any) => a.来源 === '事件').length);

const 变化项 = computed(() =>
  Object.entries(上次.value?.数值变化 ?? {}).filter(([, v]) => Number(v) !== 0),
);

/**
 * 执行一次行动。
 *
 * ★ 顺序很重要：
 *   ① 引擎结算（纯函数）
 *   ② 写回变量（store 的 watch 会自动同步到 MVU）
 *   ③ 注入叙事指令给 AI（含具体做什么、成败、是否跨旬）
 *   ④ 触发生成
 *
 * ★ AI 收到的只有叙事指令，**没有数值**。数值走变量通道。
 */
async function 执行(a: { id: string; 名: string; 耗行动: number }) {
  if (busy.value) return;
  busy.value = true;
  错误.value = '';
  上次.value = null;

  try {
    const 结果 = 结算行动(d.value, a.id);

    if (!结果.报告.ok) {
      // 前置不满足或行动点不够 —— 静默，不解释
      错误.value = 结果.报告.原因 || '做不了';
      return;
    }

    // ② 写回（store 的 watchIgnorable 负责同步到 MVU）
    store.data = 结果.新变 as any;

    // ③ 注入叙事指令
    if (结果.报告.叙事) {
      try {
        injectPrompts(
          [
            {
              id: `hxz-turn-${Date.now()}`,
              position: 'in_chat',
              depth: 0,
              role: 'system',
              content: 结果.报告.叙事,
            },
          ],
          { once: true },
        );
      } catch (e) {
        console.warn('[活侠传] 注入失败', e);
      }
    }

    上次.value = 结果.报告;

    // ④ 触发生成
    try {
      await triggerSlash('/trigger');
    } catch (e) {
      console.warn('[活侠传] 触发生成失败', e);
      错误.value = '请手动发送一条消息继续';
    }
  } catch (e) {
    错误.value = e instanceof Error ? e.message : String(e);
    console.error('[活侠传] 结算异常', e);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.act-wrap.busy {
  opacity: 0.55;
  pointer-events: none;
}
.act-group {
  margin-bottom: 7px;
}
.act-group:last-child {
  margin-bottom: 0;
}
.act-place {
  font-size: 11px;
  color: var(--p-ink-4);
  letter-spacing: 1px;
  margin-bottom: 3px;
}
.act-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.act-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border: 1px solid var(--p-line);
  border-radius: var(--r);
  background: var(--p-paper-2);
  color: var(--p-ink-2);
  font-size: 12.5px;
  cursor: pointer;
  user-select: none;
  transition: all 0.14s ease;
}
.act-btn:hover {
  border-color: var(--p-cinnabar);
  color: var(--p-cinnabar);
  background: #a8332a0e;
}
.act-btn.dis {
  opacity: 0.4;
  pointer-events: none;
}
/* ★ 原作事件用朱砂描边区分 —— 它们是「遇上的」，不是「挑的」 */
.act-btn.evt {
  border-color: var(--p-ochre);
  color: var(--p-ochre);
  background: #9c6b3f0d;
}
.act-btn.evt:hover {
  border-color: var(--p-cinnabar);
  color: var(--p-cinnabar);
}
.act-btn.evt .act-cost {
  color: var(--p-ochre);
}
.act-cost {
  font-size: 8px;
  color: var(--p-cinnabar);
  letter-spacing: 1px;
}
.act-result {
  margin-top: 9px;
  padding: 7px 10px;
  background: var(--p-paper-2);
  border-left: 2px solid var(--p-cinnabar);
  border-radius: 0 var(--r) var(--r) 0;
}
.act-result-h {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
}
.tier.ok {
  color: var(--p-bamboo);
  border-color: var(--p-bamboo);
}
.tier.no {
  color: var(--p-ochre);
  border-color: var(--p-ochre);
}
.act-delta {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11.5px;
  font-family: 'Noto Sans SC', sans-serif;
}
.act-delta .up {
  color: var(--p-bamboo);
}
.act-delta .down {
  color: var(--p-cinnabar);
}
.act-note {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--p-ink-3);
}
.act-note.gold {
  color: var(--p-gold);
}
.act-err {
  margin-top: 7px;
  font-size: 12px;
  color: var(--p-cinnabar);
}
</style>
