<template>
  <div>
    <div class="skill-grid">
      <div v-for="s in skills" :key="s.key" class="skill-card">
        <div class="sk-top">
          <span class="sk-name">{{ s.key }}</span>
          <span class="sk-lv">Lv{{ s.v.等级 }}</span>
        </div>
        <div class="sk-exp">
          <div class="sk-track"><div class="sk-fill" :style="{ width: s.v.经验 + '%' }"></div></div>
          <span>{{ s.v.经验 }}/100</span>
        </div>
        <div class="sk-desc">{{ s.desc }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from '../store';

const store = useDataStore();

const desc: Record<string, string> = {
  螺旋: '效果 Lv×1.5；每回合叠加麻痒点，麻痒≥5 触发她失神 1 回合（防守值-5）',
  颗粒: '效果 Lv×1；刺激加深，她本回合减伤-1/回合',
  敏感度加倍: '她敏感度×(1+Lv×0.1)，Lv10=×2；配合麻痒类效果翻倍',
  硬度翻倍: '效果 Lv×1.2；她的"研磨/挤压"类减伤减半',
  热量翻倍: '效果 Lv×1.5；对寒系名器（雪窦/寒玉/雪润）效果×2，过热失神概率+10%',
  次数翻倍: '连击次数×(1+Lv×0.2)；连击触发"失神"判定',
  频率翻倍: '频率 Lv×10次/分；超过承受阈值时她每回合减伤-1',
};

const skills = computed(() =>
  Object.entries(store.data.玩家.技能).map(([key, v]) => ({ key, v, desc: desc[key] ?? '' })),
);
</script>

<style lang="scss" scoped>
.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.skill-card {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-raised);
  border: 1px solid var(--c-border);
}

.sk-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.sk-name {
  font-weight: 700;
  font-size: 13px;
  color: var(--c-gold);
}

.sk-lv {
  font-size: 11px;
  color: var(--c-text-muted);
}

.sk-exp {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0;
  font-size: 10.5px;
  color: var(--c-text-dim);
}

.sk-track {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: #ffffff12;
  overflow: hidden;
}

.sk-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--c-gold), #e8c77a);
}

.sk-desc {
  font-size: 11px;
  color: var(--c-text-muted);
  line-height: 1.55;
}
</style>
