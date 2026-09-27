<template>
  <!-- ⑤ 事务 -->
  <div>
    <div class="hx-sec">
      <div class="hx-sec-t">主线</div>
      <div v-if="!d.任务.主线" class="hx-empty">暂无主线</div>
      <div v-else class="hx-text">{{ d.任务.主线 }}</div>
      <div v-if="d.任务.主线节点" class="hx-row" style="margin-top: 4px">
        <span>进度节点</span><b>{{ d.任务.主线节点 }}</b>
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">
        支线
        <span class="note">{{ 进行中.length }} 进行 / {{ 已完成.length }} 完成</span>
      </div>
      <div v-if="!支线项.length" class="hx-empty">手头没有挂心的事</div>
      <template v-else>
        <div v-for="[k, v] in 进行中" :key="k" class="hx-row">
          <span>
            <i class="qdot" style="background: var(--p-ochre)" />
            {{ v.名 || k }}
          </span>
          <b style="color: var(--p-ink-4); font-size: 11.5px">{{ v.节点 }}</b>
        </div>
        <div v-for="[k, v] in 已完成" :key="k" class="hx-row" style="opacity: 0.55">
          <span>
            <i class="qdot" style="background: var(--p-bamboo)" />
            {{ v.名 || k }}
          </span>
          <b style="color: var(--p-bamboo); font-size: 11.5px">已了</b>
        </div>
      </template>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">风云史</div>
      <div class="hx-row">
        <span>已历事件</span>
        <b>{{ 事件数 }}</b>
      </div>
      <div class="hx-text" style="margin-top: 4px">{{ d.任务.事件标记 || '（尚未记下什么）' }}</div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">身历</div>
      <div class="hx-grid">
        <div class="hx-row"><span>入唐门</span><b>{{ d.世界.已发生节点.split('、').filter(Boolean).length }} 段</b></div>
        <div class="hx-row"><span>时历</span><b>{{ d.世界.年 }}年{{ d.世界.月 }}月</b></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ d: any }>();
const d = computed(() => props.d);

const 支线项 = computed(() => Object.entries(props.d.任务.支线 ?? {}) as [string, any][]);
const 进行中 = computed(() => 支线项.value.filter(([, v]) => v.节点 !== 'clear'));
const 已完成 = computed(() => 支线项.value.filter(([, v]) => v.节点 === 'clear'));
const 事件数 = computed(() => (props.d.任务.事件标记 || '').split('、').filter(Boolean).length);
</script>
