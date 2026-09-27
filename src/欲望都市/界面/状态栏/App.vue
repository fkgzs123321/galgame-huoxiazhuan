<template>
  <div class="statusbar">
    <div class="bar-head">
      <span class="head-item">
        <span class="head-label">日期</span>
        <span class="head-value">{{ store.data.时间.日期 }} {{ store.data.时间.星期 }}</span>
      </span>
      <span class="head-item">
        <span class="head-label">时段</span>
        <span class="head-value gold">{{ store.data.时间.时段 }}</span>
      </span>
      <span class="head-item">
        <span class="head-label">学业</span>
        <span class="head-value accent">{{ store.data.玩家.学业总分 }}/750</span>
        <span class="head-label" style="color: var(--c-text-dim)">距清华 {{ 700 - store.data.玩家.学业总分 }}</span>
      </span>
      <span class="head-item">
        <span class="head-label">战绩</span>
        <span class="head-value" style="color: var(--c-success)">胜{{ store.data.玩家.今日胜场 }}</span>
        <span class="head-value" style="color: var(--c-danger)">败{{ store.data.玩家.今日败场 }}</span>
        <span class="head-label" style="color: var(--c-text-dim)">缴械{{ store.data.玩家.累计缴械 }}/被{{ store.data.玩家.累计被缴械 }}</span>
      </span>
      <span class="head-item">
        <span class="head-label">体力</span>
        <span class="mini-bar"><i :style="bar(store.data.玩家.体力, '#59c98d')"></i></span>
        <span class="head-label">性欲</span>
        <span class="mini-bar"><i :style="bar(store.data.玩家.性欲, '#e0525e')"></i></span>
        <span class="head-label">勃起</span>
        <span class="mini-bar"><i :style="bar(store.data.玩家.勃起度, '#d9a441')"></i></span>
      </span>
    </div>

    <div v-if="battleTarget" class="battle-wrap">
      <BattlePanel :name="battleTarget" />
    </div>

    <div class="tab-row">
      <div class="tab" :class="{ active: view === 'roster' }" @click="view = 'roster'">
        名录 <span v-if="captives > 0" style="color: var(--c-accent)">（俘虏{{ captives }}）</span>
      </div>
      <div class="tab" :class="{ active: view === 'schedule' }" @click="view = 'schedule'">今日排班</div>
      <div class="tab" :class="{ active: view === 'skills' }" @click="view = 'skills'">技能</div>
    </div>

    <div class="panel">
      <CharList v-if="view === 'roster'" @open="openDetail" />
      <Schedule v-else-if="view === 'schedule'" />
      <SkillView v-else />
      <CharDetail v-if="detail" :name="detail" @back="detail = ''" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from './store';
import BattlePanel from './components/BattlePanel.vue';
import CharList from './components/CharList.vue';
import CharDetail from './components/CharDetail.vue';
import Schedule from './components/Schedule.vue';
import SkillView from './components/SkillView.vue';

const store = useDataStore();
const view = ref<'roster' | 'schedule' | 'skills'>('roster');
const detail = ref('');

const battleTarget = computed(() => store.data.排班.当前战斗目标);
const captives = computed(() => Object.values(store.data.女性角色).filter(c => c.是否俘虏).length);

function bar(v: number, color: string) {
  return { width: `${Math.max(0, Math.min(100, v))}%`, background: color };
}

function openDetail(name: string) {
  detail.value = name;
}
</script>
