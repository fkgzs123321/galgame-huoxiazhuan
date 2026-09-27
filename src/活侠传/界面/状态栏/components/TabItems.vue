<template>
  <!-- ③ 行囊 —— ★ 穿脱与使用都走引擎，界面只负责显示与点击 -->
  <div>
    <div class="hx-sec">
      <div class="hx-sec-t">
        随身
        <span class="note">点一件换下</span>
      </div>
      <div class="equip-list">
        <div v-for="槽 in 槽位" :key="槽" class="equip-row">
          <span class="slot">{{ 槽 }}</span>
          <b
            v-if="d.装备[槽]"
            class="equipped"
            :style="{ color: 品质色[品质(d.装备[槽])] }"
            @click="脱下(槽)"
            :title="`加成 ${加成文字(d.装备[槽])}`"
          >
            {{ d.装备[槽] }}
            <span class="plus">{{ 加成文字(d.装备[槽]) }}</span>
          </b>
          <b v-else class="empty">空</b>
        </div>
      </div>
    </div>

    <!-- ★ 装备合计 —— 引擎算的，不是界面自己加的 -->
    <div class="hx-sec" v-if="合计文字">
      <div class="hx-sec-t">装配合计</div>
      <div class="hx-row"><span>人物总输入</span><b class="sum">{{ 合计文字 }}</b></div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">银钱</div>
      <div class="hx-row"><span>银两</span><b class="gold">{{ d.你.银两 }}</b></div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">
        行囊
        <span class="note">{{ 物品项.length }} 种</span>
      </div>
      <div v-if="!物品项.length" class="hx-empty">空无一物</div>
      <div v-else>
        <div v-for="[k, v] in 物品项" :key="k" class="hx-row item-row" @click="选中 = k">
          <span>
            <i class="qdot" :style="{ background: 品质色[v.品质] }" />
            <span :style="{ color: 品质色[v.品质] }">{{ k }}</span>
            <span v-if="可穿(k)" class="tag">可穿</span>
            <span v-else-if="可用(k)" class="tag use">可用</span>
          </span>
          <b>×{{ v.数量 }}</b>
        </div>

        <!-- 选中详情 + 动作 -->
        <div v-if="选中物" class="hx-text" style="margin-top: 7px">
          <b :style="{ color: 品质色[选中物[1].品质] }">{{ 选中物[0] }}</b>
          <span class="tier" style="margin-left: 5px">{{ 选中物[1].品质 }}</span>
          <span class="tier" style="margin-left: 4px">{{ 类别(选中物[0]) }}</span>
          <br />{{ 说明(选中物[0]) }}

          <div class="acts">
            <span v-if="槽位.includes(类别(选中物[0])) || 是暗器(选中物[0])" class="act" @click="穿(选中物[0])">
              装备
            </span>
            <span v-if="可用(选中物[0])" class="act" @click="吃(选中物[0])">使用</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="提示" class="hx-text" style="border-left-color: var(--p-cinnabar); margin-top: 7px">
      {{ 提示 }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { 品质色 } from '../分档';
import { 取定义, 算加成, 装备后输入, 穿上, 脱下 as 脱下物, 使用 } from '../../../脚本/物品';

const props = defineProps<{ d: any }>();
const d = computed(() => props.d);

const 槽位 = ['兵器', '防具', '暗器袋', '饰品'] as const;

const 物品项 = computed(() => Object.entries(props.d.物品 ?? {}) as [string, any][]);
const 选中 = ref<string | null>(null);
const 提示 = ref('');

/** 默认选中第一件品质最高的 */
const 选中物 = computed(() => {
  const list = 物品项.value;
  if (!list.length) return null;
  if (选中.value) {
    const hit = list.find(x => x[0] === 选中.value);
    if (hit) return hit;
  }
  const 序 = ['绝', '珍', '优', '良', '凡'];
  return [...list].sort((a, b) => 序.indexOf(a[1].品质) - 序.indexOf(b[1].品质))[0];
});

const 品质 = (名: string) => 取定义(名).品质 ?? '凡';
const 类别 = (名: string) => 取定义(名).类;
const 说明 = (名: string) => 取定义(名).说明 || props.d.物品?.[名]?.说明 || '（无说明）';
const 是暗器 = (名: string) => 取定义(名).类 === '暗器';
const 可穿 = (名: string) => {
  const 类 = 类别(名);
  return (槽位 as readonly string[]).includes(类) || 类 === '暗器';
};
const 可用 = (名: string) => !!取定义(名).效果;

/** 加成文字：+攻击2 之类 */
function 加成文字(名: string): string {
  const 加 = 算加成(名);
  const 段 = Object.entries(加).filter(([, v]) => Number(v) !== 0);
  if (!段.length) return '';
  return 段.map(([k, v]) => `${k}+${Math.round(Number(v))}`).join(' ');
}

/** 装配合计 —— 走引擎 */
const 合计文字 = computed(() => {
  try {
    const v = 装备后输入(props.d);
    return Object.entries(v)
      .filter(([, x]) => Number(x) !== 0)
      .map(([k, x]) => `${k} ${Math.round(Number(x))}`)
      .join('　');
  } catch {
    return '';
  }
});

function 穿(名: string) {
  提示.value = '';
  const 类 = 类别(名);
  // 暗器装进暗器袋，其余按类别找槽
  const 槽 = 类 === '暗器' ? '暗器袋' : 类;
  if (!(槽位 as readonly string[]).includes(槽)) {
    提示.value = `${名}没地方放`;
    return;
  }
  const r = 穿上(props.d, 槽, 名);
  if (!r?.可以) 提示.value = r?.原因 || '穿不上';
}

function 脱下(槽: string) {
  提示.value = '';
  脱下物(props.d, 槽);
}

function 吃(名: string) {
  提示.value = '';
  const r = 使用(props.d, 名, 1);
  if (!r?.可以) 提示.value = r?.原因 || '用不了';
}
</script>

<style scoped>
/* ★ 装备栏用「一行一槽」的网格，不用 hx-grid 的两列 ——
   加成文字长的时候两列会换行压到下一行（截图里 鹿皮囊 就压到了 饰品）。 */
.equip-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.equip-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-height: 20px;
}
.slot {
  flex: 0 0 52px;
  font-size: 11px;
  color: var(--p-ink-4);
  letter-spacing: 1px;
}
.equip-row b {
  flex: 1;
  font-weight: 500;
  font-size: 13px;
}
.empty {
  color: var(--p-ink-4);
}
.item-row {
  cursor: pointer;
}
.item-row:hover {
  background: #00000008;
}
.equipped {
  cursor: pointer;
}
.equipped:hover {
  text-decoration: line-through;
  opacity: 0.7;
}
.plus {
  font-size: 10px;
  color: var(--p-bamboo);
  margin-left: 5px;
  font-weight: 400;
  white-space: nowrap;
}
.sum {
  font-size: 11.5px;
  color: var(--p-ink-2);
}
.tag {
  font-size: 9px;
  color: var(--p-ink-4);
  border: 1px solid var(--p-line);
  border-radius: 2px;
  padding: 0 3px;
  margin-left: 5px;
  vertical-align: 1px;
}
.tag.use {
  color: var(--p-bamboo);
  border-color: var(--p-bamboo);
}
.acts {
  margin-top: 6px;
  display: flex;
  gap: 6px;
}
.act {
  padding: 2px 10px;
  border: 1px solid var(--p-cinnabar);
  color: var(--p-cinnabar);
  border-radius: var(--r);
  font-size: 12px;
  cursor: pointer;
}
.act:hover {
  background: #a8332a12;
}
</style>
