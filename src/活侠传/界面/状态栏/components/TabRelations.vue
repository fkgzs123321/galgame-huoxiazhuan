<template>
  <!-- ④ 人物：双向好感 + 认知边界 -->
  <div>
    <div v-if="!人物项.length" class="hx-empty">尚未结识任何人</div>

    <div v-for="[名, r] in 人物项" :key="名" class="hx-sec">
      <div class="hx-sec-t">
        {{ 名 }}
        <span class="note">{{ r.身份 }}</span>
      </div>

      <div class="hx-grid">
        <div class="hx-row">
          <span>他对你</span>
          <b>
            <span class="rel-dual">
              <span :class="r.好感 >= 0 ? 'rel-up' : 'rel-down'">{{ 好感名(r.好感) }}</span>
              <span class="rel-arrow">{{ r.好感 > 0 ? '+' : '' }}{{ r.好感 }}</span>
            </span>
          </b>
        </div>
        <div class="hx-row">
          <span>你对他</span>
          <b>
            <span class="rel-dual">
              <span :class="r.我的好感 >= 0 ? 'rel-up' : 'rel-down'">{{ 好感名(r.我的好感) }}</span>
              <span class="rel-arrow">{{ r.我的好感 > 0 ? '+' : '' }}{{ r.我的好感 }}</span>
            </span>
          </b>
        </div>
        <div class="hx-row">
          <span>往来</span>
          <b>
            <span v-if="r.欠人情 > 0" class="bamboo">他欠你 {{ r.欠人情 }}</span>
            <span v-else-if="r.欠人情 < 0" class="cinnabar">你欠他 {{ -r.欠人情 }}</span>
            <span v-else style="color: var(--p-ink-4)">两清</span>
          </b>
        </div>
        <div class="hx-row"><span>交情</span><b><span class="tier">{{ r.状态 }}</span></b></div>
      </div>

      <div v-if="r.认知" class="hx-text" style="margin-top: 5px">
        <span style="color: var(--p-ink-4); font-size: 11px">他知道：</span>{{ r.认知 }}
      </div>
    </div>

    <!-- ═══ ★ 江湖众生相 ═══
         数据来自 脚本/众生相.ts（提取自原作 people/mobs/*.md 的 60 组龙套）。
         主角是外姓弟子，日常打交道的本来就不是掌门与师兄，而是这些人。 -->
    <div v-if="此地众生.length" class="hx-sec">
      <div class="hx-sec-t">
        此地众生
        <span class="note">
          {{ 当前地点 }} · {{ 此地众生.length }} 组
        </span>
      </div>

      <div
        v-for="x in 此地众生"
        :key="x.名"
        class="hx-row zs-item"
        :class="{ on: 展开 === x.名 }"
        @click="展开 = 展开 === x.名 ? null : x.名"
      >
        <span>
          {{ x.名 }}
          <span class="tier zs-tag">{{ x.类 }}</span>
          <span v-if="x.人数 > 1" class="zs-num">{{ x.人数 }} 人</span>
        </span>
        <b style="color: var(--p-ink-4); font-size: 11px">
          {{ 展开 === x.名 ? '收起' : '看看' }}
        </b>
      </div>

      <div v-if="展开详情" class="hx-text zs-detail">
        <div class="zs-id">{{ 展开详情.身份 }}</div>
        <div v-for="(f, i) in 展开详情.片段" :key="i" class="zs-frag">
          <span class="zs-scene">{{ f.场景 }}</span>
          <span>{{ f.故事 }}</span>
        </div>
        <div v-if="展开详情.片段数 > 展开详情.片段.length" class="zs-more">
          另有 {{ 展开详情.片段数 - 展开详情.片段.length }} 段记载
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 好感名 } from '../分档';
import { 此地有谁, 众生表, 找相关 } from '../../../脚本/众生相';

const props = defineProps<{ d: any }>();

const 人物项 = computed(() => Object.entries(props.d.关系 ?? {}) as [string, any][]);

// ── ★ 众生相：按当前地点 + 已结识的人筛 ──
const 当前地点 = computed(() => String(props.d.世界?.当前地点 || '唐门'));

const 此地众生 = computed(() => {
  const 出 = new Map<string, (typeof 众生表)[number]>();
  // ① 当前地点相关
  for (const x of 找相关(当前地点.value)) 出.set(x.名, x);
  // ② 已在关系里的人，把跟他们相关的众生也带上
  for (const 名 of Object.keys(props.d.关系 ?? {})) {
    for (const x of 找相关(名)) 出.set(x.名, x);
  }
  // ③ 兜底：唐门相关（主角就在唐门）
  if (出.size < 3) {
    for (const x of 找相关('唐门')) 出.set(x.名, x);
  }
  // ④ 别把已建档的角色重复列出来
  const 已结识 = new Set(Object.keys(props.d.关系 ?? {}));
  return [...出.values()].filter(x => !已结识.has(x.名)).slice(0, 10);
});

const 展开 = ref<string | null>(null);
const 展开详情 = computed(() =>
  (展开.value ? 众生表.find(x => x.名 === 展开.value) : null) ?? null,
);
</script>

<style scoped>
.zs-item {
  cursor: pointer;
}
.zs-item:hover {
  background: #00000008;
}
.zs-item.on {
  background: #9c6b3f0a;
  border-left: 2px solid var(--p-ochre);
  padding-left: 6px;
  margin-left: -8px;
}
.zs-tag {
  margin-left: 5px;
  font-size: 10px;
  color: var(--p-ink-4);
}
.zs-num {
  margin-left: 4px;
  font-size: 10px;
  color: var(--p-ochre);
}
.zs-detail {
  margin-top: 6px;
  padding: 8px 10px;
  background: var(--p-paper-2);
  border-left: 2px solid var(--p-ochre);
  font-size: 11px;
  line-height: 1.6;
}
.zs-id {
  color: var(--p-ink-2);
  margin-bottom: 5px;
}
.zs-frag {
  margin-top: 4px;
  color: var(--p-ink-3);
}
.zs-scene {
  color: var(--p-ochre);
  margin-right: 5px;
}
.zs-more {
  margin-top: 5px;
  color: var(--p-ink-4);
  font-size: 10px;
}
</style>
