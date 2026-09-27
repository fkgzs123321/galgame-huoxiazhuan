<template>
  <!-- ① 属性 -->
  <div>
    <div class="hx-sec">
      <div class="hx-sec-t">基础</div>
      <div class="hx-grid">
        <div class="hx-row"><span>体力</span><b>{{ d.你.体力.当前 }}/{{ d.你.体力.上限 }}</b></div>
        <div class="hx-row"><span>内力</span><b>{{ d.你.内力.当前 }}/{{ d.你.内力.上限 }}</b></div>
        <div class="hx-row"><span>轻功</span><b>{{ d.你.轻功 }}</b></div>
        <div class="hx-row"><span>魅力</span><b>{{ d.你.魅力 }}</b></div>
        <div class="hx-row"><span>学问</span><b>{{ d.你.学问 }}</b></div>
        <div class="hx-row"><span>嘴力</span><b :class="{ cinnabar: d.你.嘴力 >= 32 }">{{ d.你.嘴力 }}</b></div>
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">
        性情
        <span class="note">六个维度各有档位</span>
      </div>
      <div class="hx-grid">
        <div v-for="k in 性格项" :key="k" class="hx-row">
          <span>{{ k }}</span>
          <b>
            <span class="tier">{{ 性格名(k, d.你[k]) }}</span>
            <span style="margin-left: 4px">{{ d.你[k] }}</span>
          </b>
        </div>
        <div class="hx-row">
          <span>心相</span>
          <b><span class="tier">{{ 心相名(d.你.心相) }}</span><span style="margin-left: 4px">{{ d.你.心相 }}</span></b>
        </div>
        <div class="hx-row">
          <span>阴阳</span>
          <b><span class="tier">{{ 阴阳名(d.你.阴阳) }}</span><span style="margin-left: 4px">{{ d.你.阴阳 }}</span></b>
        </div>
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">技艺 <span class="note">各有对应场地</span></div>
      <div class="hx-grid">
        <div class="hx-row"><span>锻造</span><b>{{ d.你.锻造 }}<span class="tier" style="margin-left: 4px">锻冶场</span></b></div>
        <div class="hx-row"><span>炼丹</span><b>{{ d.你.炼丹 }}<span class="tier" style="margin-left: 4px">炼丹房</span></b></div>
        <div class="hx-row"><span>武学点</span><b>{{ d.你.武学点 }}</b></div>
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">三教 · 形意</div>
      <div class="hx-grid">
        <div class="hx-row"><span>儒学</span><b>{{ d.你.三教.儒学 }}</b></div>
        <div class="hx-row"><span>道学</span><b>{{ d.你.三教.道学 }}</b></div>
        <div class="hx-row"><span>释学</span><b>{{ d.你.三教.释学 }}</b></div>
        <div class="hx-row"><span>形意拳</span><b>{{ d.你.形意拳 }}</b></div>
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">抗性 · 累积</div>
      <div class="hx-grid">
        <div class="hx-row"><span>抗毒</span><b>{{ d.你.抗毒 }}</b></div>
        <div class="hx-row"><span>抗麻</span><b>{{ d.你.抗麻 }}</b></div>
        <div class="hx-row"><span>毒药值</span><b>{{ d.你.毒药 }}</b></div>
        <div class="hx-row"><span>麻痹值</span><b>{{ d.你.麻痹 }}</b></div>
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">门派 <span class="note">{{ 门派名.述 }}</span></div>
      <div class="hx-grid">
        <div class="hx-row"><span>门人</span><b>{{ d.世界.门人 }}</b></div>
        <div class="hx-row"><span>向心</span><b>{{ d.世界.向心 }}</b></div>
        <div class="hx-row"><span>名声</span><b>{{ d.世界.名声 }}</b></div>
        <div class="hx-row"><span>贡献度</span><b>{{ d.世界.贡献度 }}</b></div>
        <div class="hx-row"><span>资产</span><b>{{ d.世界.门派资产 }}</b></div>
      </div>
      <div class="stage-track" style="margin-top: 6px">
        <div
          v-for="s in 门派阶段"
          :key="s.阶段"
          class="stage-seg"
          :class="{ done: s.阶段 < d.世界.门派规模, cur: s.阶段 === d.世界.门派规模 }"
          :title="s.述"
        >
          {{ s.名 }}
        </div>
      </div>
    </div>

    <div class="hx-sec" v-if="门派好感项.length">
      <div class="hx-sec-t">江湖观感</div>
      <div class="hx-grid">
        <div v-for="[k, v] in 门派好感项" :key="k" class="hx-row">
          <span>{{ k }}</span>
          <b :class="v >= 0 ? 'bamboo' : 'cinnabar'">{{ v > 0 ? '+' : '' }}{{ v }}</b>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 性格档位, 心相档位, 阴阳档位, 门派阶段 } from '../../../schema';
import { 性格名, 心相名, 阴阳名, 门派阶段名 } from '../分档';

const props = defineProps<{ d: any }>();
const d = computed(() => props.d);

const 性格项 = ['道德', '性情', '处世', '修养'] as const;
const 门派名 = computed(() => 门派阶段名(d.value.世界.门派规模));
const 门派好感项 = computed(() => Object.entries(d.value.世界.门派好感 ?? {}) as [string, number][]);
</script>
