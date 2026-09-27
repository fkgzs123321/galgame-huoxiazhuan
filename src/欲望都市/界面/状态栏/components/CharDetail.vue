<template>
  <div class="detail" v-if="c">
    <div class="detail-head">
      <span class="detail-back" @click="$emit('back')">← 返回</span>
      <span class="detail-name">{{ name }}</span>
      <span class="detail-role">{{ c.身份 }}</span>
      <span class="detail-tag" v-if="c.是否俘虏">俘虏 · {{ c.俘虏日期 }}</span>
    </div>

    <div class="detail-grid">
      <div class="d-sec">
        <div class="d-sec-title">基本</div>
        <div class="d-line"><span>省份</span><b>{{ c.省份 }}</b></div>
        <div class="d-line"><span>方言</span><b>{{ c.方言 }}</b></div>
        <div class="d-line"><span>关系</span><b>{{ c.关系 }}</b></div>
      </div>
      <div class="d-sec">
        <div class="d-sec-title">战斗档案</div>
        <div class="d-line"><span>缴械值</span><b :style="{ color: c.缴械值 >= 100 ? 'var(--c-accent)' : 'var(--c-text)' }">{{ c.缴械值 }}/100</b></div>
        <div class="d-line"><span>战绩</span><b>{{ c.胜场 }}胜 {{ c.败场 }}败 · {{ c.战斗次数 }}战</b></div>
        <div class="d-line"><span>缴械次数</span><b>{{ c.缴械次数 }}</b></div>
        <div class="d-line"><span>名器</span><b style="color: var(--c-powder)">{{ c.名器 }}</b></div>
        <div class="d-line"><span>技能</span><b style="color: var(--c-gold)">{{ c.技能.名 }} Lv{{ c.技能.等级 }}（{{ c.技能.经验 }}/100）</b></div>
        <div class="d-line"><span>能力值</span><b>忍{{ c.能力值.忍耐 }} 持{{ c.能力值.持久 }} 攻{{ c.能力值.反攻 }}</b></div>
      </div>
      <div class="d-sec">
        <div class="d-sec-title">状态</div>
        <div class="d-line"><span>欲望积压</span><b :style="{ color: c.欲望积压 >= 80 ? 'var(--c-danger)' : c.欲望积压 >= 60 ? 'var(--c-warning)' : 'var(--c-text)' }">{{ c.欲望积压 }}</b></div>
        <div class="d-line"><span>今日已使用</span><b>{{ c.今日已使用 ? '是' : '否' }}</b></div>
        <div class="d-line"><span>精神状态</span><b>{{ c.心理状态.精神状态 }}</b></div>
        <div class="d-line"><span>心声</span><b style="color: var(--c-text-muted)">{{ c.心声 || '…' }}</b></div>
      </div>
    </div>

    <div class="d-sec">
      <div class="d-sec-title">特质 / 缺陷</div>
      <div class="d-text">{{ c.特质 || '—' }}</div>
      <div class="d-text" style="color: var(--c-warning)">{{ c.缺陷 || '—' }}</div>
    </div>

    <div class="d-sec">
      <div class="d-sec-title">心理状态</div>
      <div class="psy-row">
        <span class="psy">欲望 <i :style="psyBar(c.心理状态.欲望度, 'var(--c-accent)')"></i>{{ c.心理状态.欲望度 }}</span>
        <span class="psy">羞耻 <i :style="psyBar(c.心理状态.羞耻感, 'var(--c-info)')"></i>{{ c.心理状态.羞耻感 }}</span>
        <span class="psy">兴奋 <i :style="psyBar(c.心理状态.兴奋, 'var(--c-powder)')"></i>{{ c.心理状态.兴奋 }}</span>
        <span class="psy">期待 <i :style="psyBar(c.心理状态.期待, 'var(--c-gold)')"></i>{{ c.心理状态.期待 }}</span>
      </div>
    </div>

    <div class="d-sec">
      <div class="d-sec-title">身体状态 <span class="nsfw-tag">NSFW</span></div>
      <div class="body-grid">
        <div class="body-card">
          <div class="bc-name">胸部</div>
          <div class="bc-line">状态 {{ c.身体状态.胸部.状态 }} · 乳头 {{ c.身体状态.胸部.乳头 }}</div>
          <div class="bc-line">敏感度 <i :style="psyBar(c.身体状态.胸部.敏感度, 'var(--c-powder)')"></i>{{ c.身体状态.胸部.敏感度 }}</div>
        </div>
        <div class="body-card">
          <div class="bc-name">阴道</div>
          <div class="bc-line">状态 {{ c.身体状态.阴道.状态 }}</div>
          <div class="bc-line">湿润度 <i :style="psyBar(c.身体状态.阴道.湿润度, 'var(--c-info)')"></i>{{ c.身体状态.阴道.湿润度 }}</div>
          <div class="bc-line">敏感度 <i :style="psyBar(c.身体状态.阴道.敏感度, 'var(--c-powder)')"></i>{{ c.身体状态.阴道.敏感度 }}</div>
        </div>
        <div class="body-card"><div class="bc-name">肛门</div><div class="bc-line">状态 {{ c.身体状态.肛门.状态 }}</div></div>
        <div class="body-card"><div class="bc-name">嘴</div><div class="bc-line">状态 {{ c.身体状态.嘴.状态 }}</div></div>
        <div class="body-card">
          <div class="bc-name">肌肤</div>
          <div class="bc-line">状态 {{ c.身体状态.肌肤.状态 }} · 体温 {{ c.身体状态.肌肤.体温 }}</div>
        </div>
        <div class="body-card"><div class="bc-name">大腿</div><div class="bc-line">状态 {{ c.身体状态.大腿.状态 }}</div></div>
        <div class="body-card"><div class="bc-name">臀部</div><div class="bc-line">状态 {{ c.身体状态.臀部.状态 }}</div></div>
      </div>
    </div>

    <div class="d-sec" v-if="c.服装 && Object.keys(c.服装).length">
      <div class="d-sec-title">服装</div>
      <div class="d-text">{{ outfitText }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from '../store';

const props = defineProps<{ name: string }>();
const emit = defineEmits<{ back: [] }>();
const store = useDataStore();

const c = computed(() => store.data.女性角色[props.name] ?? null);
const outfitText = computed(() => Object.entries(c.value?.服装 ?? {}).map(([k, v]) => `${k}: ${v}`).join('，'));

function psyBar(v: number, color: string) {
  return { width: `${Math.max(0, Math.min(100, v))}%`, background: color };
}
</script>

<style lang="scss" scoped>
.detail {
  margin-top: 6px;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--c-border);
  margin-bottom: 10px;
}

.detail-back {
  cursor: pointer;
  color: var(--c-text-muted);
  font-size: 12px;
}

.detail-back:hover {
  color: var(--c-accent);
}

.detail-name {
  font-size: 16px;
  font-weight: 700;
}

.detail-role {
  font-size: 12px;
  color: var(--c-text-muted);
}

.detail-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--c-accent-soft);
  color: var(--c-accent);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.d-sec {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-raised);
  border: 1px solid var(--c-border);
  margin-bottom: 8px;
}

.d-sec-title {
  font-size: 11px;
  color: var(--c-text-dim);
  letter-spacing: 2px;
  margin-bottom: 6px;
}

.nsfw-tag {
  font-size: 9px;
  color: var(--c-accent);
  border: 1px solid var(--c-accent-soft);
  border-radius: 4px;
  padding: 0 4px;
  vertical-align: 1px;
}

.d-line {
  display: flex;
  gap: 8px;
  font-size: 12px;
  padding: 2px 0;
}

.d-line span {
  color: var(--c-text-dim);
  min-width: 56px;
  flex-shrink: 0;
}

.d-line b {
  font-weight: 500;
  color: var(--c-text);
  word-break: break-all;
}

.d-text {
  font-size: 12px;
  color: var(--c-text-muted);
  line-height: 1.6;
  margin-bottom: 4px;
}

.psy-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
}

.psy {
  font-size: 12px;
  color: var(--c-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.psy i {
  display: inline-block;
  width: 56px;
  height: 5px;
  border-radius: 3px;
  background: #ffffff12;
  overflow: hidden;
}

.body-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
}

.body-card {
  padding: 6px 8px;
  border-radius: 7px;
  background: #ffffff07;
  border: 1px solid var(--c-border);
}

.bc-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--c-powder);
  margin-bottom: 3px;
}

.bc-line {
  font-size: 11px;
  color: var(--c-text-muted);
  margin: 2px 0;
}

.bc-line i {
  display: inline-block;
  width: 44px;
  height: 4px;
  border-radius: 2px;
  background: #ffffff12;
  overflow: hidden;
  vertical-align: middle;
  margin-right: 4px;
}
</style>
