<template>
  <!-- ⑥ 见闻 —— 前置与错过的外显 -->
  <div>
    <div class="hx-sec">
      <div class="hx-sec-t">
        已解
        <span class="note">{{ 已解锁.length }} 条</span>
      </div>
      <div v-if="!已解锁.length" class="hx-empty">还没有攒下什么名堂</div>
      <div v-else class="hx-text">{{ d.前置.已解锁 }}</div>
    </div>

    <!-- ★ 可见条件：原作 663 次判定里只有 3 处写给玩家看，极稀有 -->
    <div class="hx-sec" v-if="d.前置.可见条件">
      <div class="hx-sec-t">
        挂在眼前的条件
        <span class="note">极罕见</span>
      </div>
      <div class="hx-text" style="border-left-color: var(--p-cinnabar); color: var(--p-cinnabar)">
        {{ d.前置.可见条件 }}
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">本旬已做的事</div>
      <div v-if="!旬内.length" class="hx-empty">这一旬还什么都没做</div>
      <div v-else class="hx-text">{{ d.前置.本旬已用 }}</div>
      <div class="hx-row" style="margin-top: 4px">
        <span>剩余行动</span>
        <b :class="d.世界.行动次数 > 0 ? 'bamboo' : 'cinnabar'">
          {{ d.世界.行动次数 }} / {{ d.世界.行动上限 }}
        </b>
      </div>
    </div>

    <!-- ★ 错过：只给数量，不给明细。保持原作的静默设计 -->
    <div class="hx-sec">
      <div class="hx-sec-t">错身而过</div>
      <div class="hx-row">
        <span>已合上的门</span>
        <b style="color: var(--p-ink-3)">{{ 错过数 }} 扇</b>
      </div>
      <div class="hx-text" style="margin-top: 5px; border-left-color: var(--p-ink-4)">
        有些事过后才明白。当时若换个去处、换句话，也许不是这条道。
        <br /><span style="color: var(--p-ink-4); font-size: 11.5px"
          >本卡不列出你错过了什么 —— 那要你自己回头想。</span
        >
      </div>
      <div style="margin-top: 7px">
        <span class="hx-tab" style="border: 1px solid var(--p-line); border-radius: var(--r)" @click="$emit('open-prereq')">
          查看当前路数
        </span>
      </div>
    </div>

    <div class="hx-sec" v-if="计数项.length">
      <div class="hx-sec-t">记数</div>
      <div class="hx-grid">
        <div v-for="[k, v] in 计数项" :key="k" class="hx-row">
          <span>{{ k }}</span><b>{{ v }}</b>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ d: any }>();
defineEmits<{ 'open-prereq': [] }>();

const d = computed(() => props.d);
const 已解锁 = computed(() => (props.d.前置.已解锁 || '').split('、').filter(Boolean));
const 旬内 = computed(() => (props.d.前置.本旬已用 || '').split('、').filter(Boolean));
/** 只数个数 —— 明细不展示 */
const 错过数 = computed(() => (props.d.前置.已错过 || '').split('、').filter(Boolean).length);
const 计数项 = computed(() => Object.entries(props.d.前置.计数 ?? {}) as [string, number][]);
</script>
