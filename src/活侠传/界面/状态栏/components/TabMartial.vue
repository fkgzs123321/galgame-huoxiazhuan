<template>
  <!-- ② 武学 -->
  <div>
    <div class="hx-sec">
      <div class="hx-sec-t">八系 <span class="note">各系影响不同的战斗派生</span></div>
      <div class="bagua">
        <div v-for="(v, k) in d.你.八系" :key="k" class="bg-cell">
          <div class="bg-name">{{ k }}</div>
          <div class="bg-val">{{ v }}</div>
          <div class="bg-bar"><i :style="{ width: v + '%' }" /></div>
        </div>
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">
        战斗派生
        <span class="note">引擎算 · 含装备</span>
      </div>
      <div class="hx-grid">
        <div v-for="(v, k) in 派生" :key="k" class="hx-row">
          <span>{{ k }}</span>
          <b>
            {{ v }}
            <span v-if="裸装[k] !== undefined && v !== 裸装[k]" class="up">
              ({{ 裸装[k] }}<span class="arrow">→</span>{{ v }})
            </span>
          </b>
        </div>
      </div>
      <div v-if="!装备数" class="hx-text" style="margin-top: 6px">
        身上没穿东西。装备会直接改这里的数 —— 去「行囊」页穿。
      </div>
    </div>

    <!-- ★ 成长：加点由引擎算曲线，不是线性的 -->
    <div class="hx-sec">
      <div class="hx-sec-t">
        修为
        <span class="note">武学点 {{ d.你.武学点 }}</span>
      </div>
      <div class="hx-row">
        <span>下一级要</span>
        <b>{{ 下一级代价 }} 点</b>
      </div>
      <div class="hx-row">
        <span>当前点数能升到</span>
        <b :class="{ gold: 可升 }">{{ 能升到 }} 级</b>
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">天赋 <span class="note">{{ 天赋项.length }} 项</span></div>
      <div v-if="!天赋项.length" class="hx-empty">尚未觉醒任何天赋</div>
      <div v-else class="hx-grid">
        <div v-for="[k, v] in 天赋项" :key="k" class="hx-row">
          <span>{{ k }}</span>
          <b>Lv{{ v.等级 }}<span v-if="v.经验" class="tier" style="margin-left: 4px">{{ v.经验 }}</span></b>
        </div>
      </div>
    </div>

    <div class="hx-sec">
      <div class="hx-sec-t">
        秘籍
        <span class="note">
          {{ 秘籍项.length }} 本
          <template v-if="可练数"> · {{ 可练数 }} 本可练</template>
        </span>
      </div>
      <div v-if="!秘籍项.length" class="hx-empty">尚无秘籍</div>
      <div v-else>
        <div
          v-for="[k, v] in 秘籍项"
          :key="k"
          class="hx-row mrow-item"
          :class="{ on: 当前秘籍名 === k }"
          @click="选中秘籍 = 选中秘籍 === k ? null : k"
        >
          <span>
            {{ k }}
            <span class="tier" :style="v.师授 ? 'color:var(--p-bamboo);border-color:var(--p-bamboo)' : 'color:var(--p-ink-4)'">
              {{ v.师授 ? '师授' : '自学' }}
            </span>
          </span>
          <b>
            <span v-if="!v.已读" class="tier">未读</span>
            <span v-else>{{ v.熟练 }}</span>
          </b>
        </div>

        <!-- ★ 选中展开：门槛 / 加成 / 招式（全部来自 秘籍.ts，原作数据）-->
        <div v-if="选中详情" class="hx-text" style="margin-top: 7px">
          <b>{{ 选中详情.名 }}</b>
          <span class="tier" style="margin-left: 5px">{{ 选中详情.类 }}</span>
          <span class="tier" style="margin-left: 4px">武学点 {{ 选中详情.武学点 }}</span>

          <div v-if="Object.keys(选中详情.加成).length" class="mrow">
            <span class="mlab">练成</span>
            <span v-for="(v2, k2) in 选中详情.加成" :key="k2" class="mchip" :class="Number(v2) >= 0 ? 'up' : 'down'">
              {{ k2 }} {{ Number(v2) >= 0 ? '+' : '' }}{{ v2 }}
            </span>
          </div>

          <div v-if="选中详情.技能.length" class="mrow">
            <span class="mlab">招式</span>
            <span v-for="s in 选中详情.技能" :key="s" class="mchip skill">{{ s }}</span>
          </div>

          <div v-if="选中详情.天赋.length" class="mrow">
            <span class="mlab">天赋</span>
            <span v-for="t in 选中详情.天赋" :key="t.名" class="mchip">{{ t.名 }}<template v-if="t.等级 > 1">{{ t.等级 }}</template></span>
          </div>

          <div v-if="选中详情.门槛.length" class="mrow">
            <span class="mlab">门槛</span>
            <span v-if="可练结果.能" class="mchip up">够了</span>
            <span v-else v-for="g in 可练结果.缺" :key="g" class="mchip down">{{ g }}</span>
          </div>

          <div v-if="选中详情.获得.length" class="msrc">
            得法：{{ 选中详情.获得[0] }}
          </div>
        </div>

        <div class="hx-text" style="margin-top: 6px">
          唐门规矩：秘籍若无师长传授心诀、运劲手法，仅靠自学极难寸进。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 装备后输入, 升级代价, 能升到几级 } from '../../../脚本/物品';
import { 秘籍表, 取秘籍, 能练吗 } from '../../../脚本/秘籍';

const props = defineProps<{ d: any }>();
const d = computed(() => props.d);

const 天赋项 = computed(() => Object.entries(props.d.天赋 ?? {}) as [string, any][]);
const 秘籍项 = computed(() => Object.entries(props.d.秘籍 ?? {}) as [string, any][]);

// ── ★ 秘籍详情（数据来自 脚本/秘籍.ts，提取自原作 wiki）──
//   默认展开第一本 —— 否则详情要点一下才看得见，等于没做。
const 选中秘籍 = ref<string | null>(null);
const 选中详情 = computed(() => {
  const 名 = 选中秘籍.value ?? 秘籍项.value[0]?.[0];
  return 名 ? 取秘籍(名) : null;
});
/** 当前展开的是哪本（也用于高亮） */
const 当前秘籍名 = computed(() => 选中详情.value?.名 ?? '');

/** 当前属性快照，用来判门槛 */
const 值表 = computed<Record<string, number>>(() => ({
  刀剑: Number(props.d.你?.八系?.刀剑) || 0,
  暗器: Number(props.d.你?.八系?.暗器) || 0,
  拳掌: Number(props.d.你?.八系?.拳掌) || 0,
  腿法: Number(props.d.你?.八系?.腿法) || 0,
  奇门: Number(props.d.你?.八系?.奇门) || 0,
  软兵器: Number(props.d.你?.八系?.软兵器) || 0,
  枪棍: Number(props.d.你?.八系?.枪棍) || 0,
  内功: Number(props.d.你?.八系?.内功) || 0,
  轻功: Number(props.d.你?.轻功) || 0,
  学问: Number(props.d.你?.学问) || 0,
  嘴力: Number(props.d.你?.嘴力) || 0,
  道德: Number(props.d.你?.道德) || 0,
  性情: Number(props.d.你?.性情) || 0,
  处世: Number(props.d.你?.处世) || 0,
  修养: Number(props.d.你?.修养) || 0,
  心相: Number(props.d.你?.心相) || 0,
  阴阳: Number(props.d.你?.阴阳) || 0,
  体力: Number(props.d.你?.体力?.当前) || 0,
  内力: Number(props.d.你?.内力?.当前) || 0,
}));

const 可练结果 = computed(() => {
  const 名 = 选中详情.value?.名;
  if (!名) return { 能: true, 缺: [] as string[] };
  try {
    return 能练吗(名, 值表.value);
  } catch (e) {
    console.warn('[活侠传] 判秘籍门槛失败', e);
    return { 能: true, 缺: [] as string[] };
  }
});

/** 手里这些秘籍里，有几本现在能练 */
const 可练数 = computed(() => {
  let n = 0;
  for (const [k] of 秘籍项.value) {
    try {
      if (能练吗(k, 值表.value).能) n++;
    } catch { /* 忽略 */ }
  }
  return n;
});

/** 表里一共有多少本（供参考） */
const 表共 = computed(() => 秘籍表.length);

/**
 * ★ 战斗派生 —— 走引擎，含装备加成。
 *   变量里的 `你.战斗.*` 是**裸装**基础值；装备的加成由引擎现算。
 *   界面把两者都显示出来，玩家才看得出装备有没有用。
 */
const 裸装 = computed<Record<string, number>>(() => ({
  攻击: Number(props.d.你?.战斗?.攻击) || 0,
  防御: Number(props.d.你?.战斗?.防御) || 0,
  暗器威力: Number(props.d.你?.战斗?.暗器威力) || 0,
  闪避: Number(props.d.你?.轻功) || 0,
}));

const 派生 = computed<Record<string, number>>(() => {
  try {
    const v = 装备后输入(props.d);
    return {
      攻击: Math.round(Number(v.攻击) || 0),
      防御: Math.round(Number(v.防御) || 0),
      暗器威力: Math.round(Number(v.暗器威力) || 0),
      闪避: Math.round(Number(v.闪避) || 0),
      心相: Math.round(Number(v.心相) || 0),
      抗毒: Math.round(Number(v.抗毒) || 0),
    };
  } catch (e) {
    console.warn('[活侠传] 派生失败', e);
    return 裸装.value;
  }
});

const 装备数 = computed(() => Object.values(props.d.装备 ?? {}).filter(Boolean).length);

// ── 成长 ──
// ★ 曲线由引擎算（levelCost），界面不自己写公式
const 当前等级 = computed(() => Number(props.d.你?.武学点等级) || 1);
const 下一级代价 = computed(() => {
  try {
    return Math.round(Number(升级代价(当前等级.value + 1)) || 0);
  } catch {
    return 0;
  }
});
const 能升到 = computed(() => {
  try {
    return 能升到几级(props.d, 当前等级.value).到;
  } catch {
    return 当前等级.value;
  }
});
const 可升 = computed(() => 能升到.value > 当前等级.value);
</script>

<style scoped>
.up {
  font-size: 10px;
  color: var(--p-bamboo);
  margin-left: 4px;
  font-weight: 400;
}
.arrow {
  margin: 0 2px;
  opacity: 0.6;
}
.gold {
  color: var(--p-gold);
}
/* ── 秘籍详情 ── */
.mrow-item {
  cursor: pointer;
}
.mrow-item:hover {
  background: #00000008;
}
.mrow-item.on {
  background: #a8332a0a;
  border-left: 2px solid var(--p-cinnabar);
  padding-left: 6px;
  margin-left: -8px;
}
.mrow {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  margin-top: 5px;
}
.mlab {
  flex: 0 0 30px;
  font-size: 10px;
  color: var(--p-ink-4);
  letter-spacing: 1px;
}
.mchip {
  font-size: 11px;
  padding: 1px 6px;
  border: 1px solid var(--p-line);
  border-radius: 2px;
  color: var(--p-ink-2);
  background: var(--p-paper-2);
}
.mchip.up {
  color: var(--p-bamboo);
  border-color: var(--p-bamboo);
}
.mchip.down {
  color: var(--p-cinnabar);
  border-color: var(--p-cinnabar);
}
.mchip.skill {
  color: var(--p-ochre);
  border-color: var(--p-ochre);
}
.msrc {
  margin-top: 6px;
  font-size: 11px;
  color: var(--p-ink-3);
  line-height: 1.5;
}
</style>
