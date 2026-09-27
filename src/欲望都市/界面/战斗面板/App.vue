<template>
  <div class="battleui">
    <div class="bu-head">
      <span class="bu-title">⚔ 战斗面板</span>
      <span class="bu-state" :class="stateClass">{{ stateText }}</span>
    </div>

    <BattlePanel v-if="target" :name="target" />

    <div v-else class="bu-empty">
      <p>当前没有战斗目标。</p>
      <p class="dim">战斗开始时（排班.当前战斗目标 写入后）本面板自动显示。</p>
    </div>

    <div v-if="scheduleInfo" class="bu-schedule">
      <span class="bu-s-label">今日场次</span>
      <span v-for="(v, k) in scheduleInfo" :key="k" class="bu-s-item">
        {{ k }}：{{ v.参与者 }}<template v-if="v.结果">（{{ v.结果 }}）</template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import BattlePanel from '../状态栏/components/BattlePanel.vue';
import { useDataStore } from '../状态栏/store';

const store = useDataStore();

const target = computed(() => store.data.排班.当前战斗目标);
const stateText = computed(() => {
  switch (store.data.排班.战斗状态) {
    case '进行中': return '⚔ 战斗进行中';
    case '已结算': return '✓ 已结算';
    default: return '○ 未开始';
  }
});
const stateClass = computed(() => String(store.data.排班.战斗状态 || '未开始'));
const scheduleInfo = computed(() => {
  const v = store.data.排班.今日场次;
  return v && typeof v === 'object' && Object.keys(v).length ? v : null;
});
</script>

<style lang="scss" scoped>
.battleui {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  font-family: var(--font-archive, inherit);
  color: var(--c-text, #e8e6e3);
}

.bu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(120deg, rgba(224, 82, 94, 0.18), rgba(224, 82, 94, 0.05));
  border-bottom: 1px solid var(--c-accent-soft, #553a3a);
}

.bu-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--c-accent, #e0525e);
}

.bu-state {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #ffffff10;
  color: var(--c-text-muted, #b8b4ae);
}

.bu-state.进行中 {
  color: var(--c-accent, #e0525e);
  background: var(--c-accent-soft, #553a3a);
}

.bu-state.已结算 {
  color: var(--c-success, #59c98d);
}

.bu-empty {
  padding: 28px 14px;
  text-align: center;
  color: var(--c-text-muted, #b8b4ae);
  font-size: 13px;
}

.bu-empty .dim {
  font-size: 11px;
  opacity: 0.65;
  margin-top: 6px;
}

.bu-schedule {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--c-text-muted, #b8b4ae);
}

.bu-s-label {
  font-weight: 700;
  color: var(--c-gold, #d9a441);
}

.bu-s-item {
  padding: 2px 8px;
  border-radius: 6px;
  background: #ffffff08;
}
</style>
