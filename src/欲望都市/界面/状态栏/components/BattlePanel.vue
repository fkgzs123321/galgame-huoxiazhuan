<template>
  <div class="battle">
    <div class="battle-head">
      <span class="battle-name">{{ c.身份 }} · {{ name }}</span>
      <span class="battle-tag">{{ stageText }}</span>
      <span class="battle-tag" v-if="c.是否俘虏">俘虏</span>
    </div>
    <div class="hp-row">
      <span class="hp-label">缴械值</span>
      <div class="hp-track">
        <div class="hp-fill" :style="{ width: c.缴械值 + '%', background: hpColor }"></div>
      </div>
      <span class="hp-num">{{ c.缴械值 }}/100</span>
    </div>
    <div class="battle-grid">
      <span>名器 <b style="color: var(--c-powder)">{{ c.名器 }}</b></span>
      <span>技能 <b style="color: var(--c-gold)">{{ c.技能.名 }}</b> Lv{{ c.技能.等级 }}</span>
      <span>能力 忍{{ c.能力值.忍耐 }} 持{{ c.能力值.持久 }} 攻{{ c.能力值.反攻 }}</span>
      <span>欲望积压 <b :style="{ color: c.欲望积压 >= 60 ? 'var(--c-danger)' : 'var(--c-text)' }">{{ c.欲望积压 }}</b></span>
      <span>精神状态 <b style="color: var(--c-warning)">{{ c.心理状态.精神状态 }}</b></span>
      <span>心声 <i style="color: var(--c-text-muted)">{{ c.心声 || '…' }}</i></span>
    </div>
    <div class="battle-state" :class="store.data.排班.战斗状态">
      {{ stateText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from '../store';

const props = defineProps<{ name: string }>();
const store = useDataStore();

const c = computed(() => store.data.女性角色[props.name] ?? ({} as any));
const hpColor = computed(() => {
  const v = c.value.缴械值 ?? 0;
  return v >= 80 ? 'linear-gradient(90deg,#e0525e,#ff8a95)' : v >= 40 ? 'linear-gradient(90deg,#d9a441,#e8c77a)' : 'linear-gradient(90deg,#6aa8d8,#a8d4f0)';
});
const stageText = computed(() => {
  const v = c.value.缴械值 ?? 0;
  if (v >= 100) return '俘虏';
  if (v >= 80) return '阶段五 · 全然臣服前夜';
  if (v >= 60) return '阶段四 · 投降边缘';
  if (v >= 40) return '阶段三 · 沉沦与依赖';
  if (v >= 20) return '阶段二 · 动摇与试探';
  return '阶段一 · 初识与抗拒';
});
const stateText = computed(() => {
  switch (store.data.排班.战斗状态) {
    case '进行中': return '⚔ 战斗进行中：每回合后输出【战斗结算】块，按剩余防守值描写她的反应';
    case '已结算': return '✓ 本场已结算，等待下一场排班';
    default: return '○ 未开始：等待拉入';
  }
});
</script>

<style lang="scss" scoped>
.battle {
  margin: 10px 14px 0;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--c-accent-soft);
  background: linear-gradient(120deg, rgba(224, 82, 94, 0.08), rgba(224, 82, 94, 0.02) 55%);
}

.battle-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.battle-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--c-accent);
}

.battle-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--c-accent-soft);
  color: var(--c-accent);
}

.hp-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hp-label {
  font-size: 11px;
  color: var(--c-text-dim);
  width: 52px;
}

.hp-track {
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: #ffffff12;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
}

.hp-num {
  font-size: 12px;
  font-weight: 600;
  min-width: 52px;
  text-align: right;
}

.battle-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.battle-state {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 7px;
  font-size: 12px;
  background: #ffffff08;
  color: var(--c-text-muted);
}

.battle-state.进行中 {
  color: var(--c-accent);
  background: var(--c-accent-soft);
}
</style>
