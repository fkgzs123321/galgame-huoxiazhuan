<template>
  <div>
    <div v-if="sessions.length" class="sched">
      <div v-for="s in sessions" :key="s.时段" class="sched-row">
        <span class="sched-time">{{ s.时段 }}</span>
        <span class="sched-p" :class="{ done: s.是否参战 }">{{ s.参与者 }}</span>
        <span class="sched-result" :class="resultClass(s.结果)">{{ s.结果 }}</span>
      </div>
    </div>
    <div v-else class="sched-empty">今日排班尚未生成——开场后由【排班规则】生成下午场（妈妈+没课老师）与晚场（学生）</div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from '../store';

const store = useDataStore();

const sessions = computed(() => {
  const s = store.data.排班.今日场次 ?? {};
  return Object.entries(s).map(([时段, v]) => ({ 时段, ...v }));
});

function resultClass(r: string) {
  if (r === '胜') return 'win';
  if (r === '败') return 'lose';
  if (r === '拒战') return 'refuse';
  return '';
}
</script>

<style lang="scss" scoped>
.sched-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  border-radius: 7px;
  margin-bottom: 4px;
  background: var(--c-surface-raised);
  border: 1px solid var(--c-border);
}

.sched-time {
  min-width: 56px;
  font-weight: 700;
  color: var(--c-gold);
  font-size: 12px;
}

.sched-p {
  flex: 1;
  font-size: 12px;
  color: var(--c-text);
}

.sched-p.done {
  color: var(--c-text-dim);
}

.sched-result {
  font-size: 12px;
  color: var(--c-text-muted);
}

.sched-result.win {
  color: var(--c-success);
}

.sched-result.lose {
  color: var(--c-danger);
}

.sched-result.refuse {
  color: var(--c-warning);
}

.sched-empty {
  color: var(--c-text-dim);
  font-size: 12px;
  padding: 8px;
}
</style>
