<template>
  <div class="hx-mask" @click.self="$emit('close')">
    <div class="hx-modal">
      <div class="hx-modal-h">
        <span>当前路数</span>
        <span class="hx-modal-x" @click="$emit('close')">×</span>
      </div>
      <div class="hx-modal-b">
        <div class="hx-sec">
          <div class="hx-sec-t">你身上的条件</div>
          <div v-if="!已解.length" class="hx-empty">还没有任何条件达成</div>
          <div v-else>
            <div v-for="c in 已解" :key="c" class="pre-line">
              <span class="pre-ok">✓</span>
              <span class="pre-k">{{ c }}</span>
            </div>
          </div>
        </div>

        <div class="hx-sec">
          <div class="hx-sec-t">本旬行动</div>
          <div class="pre-line">
            <span :class="d.世界.行动次数 > 0 ? 'pre-ok' : 'pre-no'">{{ d.世界.行动次数 > 0 ? '✓' : '✗' }}</span>
            <span class="pre-k">剩余行动</span>
            <span class="pre-v">{{ d.世界.行动次数 }} / {{ d.世界.行动上限 }}</span>
          </div>
          <div class="pre-line">
            <span class="pre-ok">✓</span>
            <span class="pre-k">时辰</span>
            <span class="pre-v">{{ d.世界.年 }}年{{ d.世界.月 }}月{{ d.世界.旬 }} · {{ d.世界.昼夜 }}</span>
          </div>
          <div class="pre-line">
            <span class="pre-ok">✓</span>
            <span class="pre-k">身处</span>
            <span class="pre-v">{{ d.世界.当前地点 }}</span>
          </div>
        </div>

        <div class="hx-sec" v-if="d.前置.可见条件">
          <div class="hx-sec-t">眼前这条</div>
          <div class="hx-text" style="border-left-color: var(--p-cinnabar); color: var(--p-cinnabar)">
            {{ d.前置.可见条件 }}
          </div>
        </div>

        <div class="hx-sec">
          <div class="hx-sec-t">已合上的门</div>
          <div class="pre-line">
            <span class="pre-no">—</span>
            <span class="pre-k">共 {{ 错过数 }} 扇</span>
            <span class="pre-v" style="color: var(--p-ink-4)">明细不列</span>
          </div>
          <div class="hx-text" style="margin-top: 5px; border-left-color: var(--p-ink-4); font-size: 11.5px">
            走过来的路，回头看才知道岔在哪。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ d: any }>();
defineEmits<{ close: [] }>();

const d = computed(() => props.d);
const 已解 = computed(() => (props.d.前置.已解锁 || '').split('、').filter(Boolean));
const 错过数 = computed(() => (props.d.前置.已错过 || '').split('、').filter(Boolean).length);
</script>
