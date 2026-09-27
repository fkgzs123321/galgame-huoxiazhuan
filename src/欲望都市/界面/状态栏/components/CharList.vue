<template>
  <div class="roster">
    <div class="roster-head">
      <span>38 名女性 · 点击查看档案</span>
      <span class="roster-count">{{ chars.length }} 人在册</span>
    </div>
    <div class="roster-grid">
      <div
        v-for="[name, c] in chars"
        :key="name"
        class="roster-card"
        :class="{ captured: c.是否俘虏, fighting: name === battleTarget }"
        @click="$emit('open', name)"
      >
        <div class="rc-top">
          <span class="rc-name">{{ name }}</span>
          <span class="rc-role">{{ shortRole(c.身份) }}</span>
        </div>
        <div class="rc-tags">
          <span class="rc-tag" v-if="c.是否俘虏" style="color: var(--c-accent)">俘</span>
          <span class="rc-tag" v-if="c.欲望积压 >= 60" style="color: var(--c-danger)">积压{{ c.欲望积压 }}</span>
          <span class="rc-tag" v-if="name === battleTarget" style="color: var(--c-gold)">战斗中</span>
        </div>
        <div class="rc-hp">
          <div class="rc-track"><div class="rc-fill" :style="{ width: c.缴械值 + '%', background: c.缴械值 >= 100 ? 'var(--c-accent)' : c.缴械值 >= 60 ? 'var(--c-gold)' : 'var(--c-info)' }"></div></div>
          <span class="rc-num">{{ c.缴械值 }}</span>
        </div>
        <div class="rc-sub">
          {{ c.省份 }} · {{ c.方言.slice(0, 10) }}{{ c.方言.length > 10 ? '…' : '' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from '../store';

const emit = defineEmits<{ open: [name: string] }>();
const store = useDataStore();

const chars = computed(() => Object.entries(store.data.女性角色));
const battleTarget = computed(() => store.data.排班.当前战斗目标);

function shortRole(identity: string) {
  return (identity || '').replace(/人大附中高三精英班|陪读妈妈|（.+?）/g, '').replace(/学生/g, '学生').slice(0, 8);
}
</script>

<style lang="scss" scoped>
.roster-head {
  display: flex;
  justify-content: space-between;
  color: var(--c-text-dim);
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.roster-count {
  color: var(--c-accent);
}

.roster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 8px;
}

.roster-card {
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--c-surface-raised);
  border: 1px solid var(--c-border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.roster-card:hover {
  border-color: var(--c-accent-soft);
  transform: translateY(-1px);
}

.roster-card.captured {
  border-color: var(--c-accent-soft);
  background: linear-gradient(150deg, rgba(224, 82, 94, 0.1), var(--c-surface-raised) 60%);
}

.roster-card.fighting {
  border-color: var(--c-gold);
  box-shadow: 0 0 0 1px var(--c-gold-soft);
}

.rc-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}

.rc-name {
  font-weight: 700;
  font-size: 12.5px;
  color: var(--c-text);
}

.rc-role {
  font-size: 10px;
  color: var(--c-text-dim);
  white-space: nowrap;
}

.rc-tags {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  min-height: 14px;
}

.rc-tag {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 4px;
  background: #ffffff0d;
  color: var(--c-text-muted);
}

.rc-hp {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.rc-track {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: #ffffff12;
  overflow: hidden;
}

.rc-fill {
  height: 100%;
  border-radius: 3px;
}

.rc-num {
  font-size: 10.5px;
  color: var(--c-text-muted);
  min-width: 20px;
  text-align: right;
}

.rc-sub {
  margin-top: 5px;
  font-size: 10.5px;
  color: var(--c-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
