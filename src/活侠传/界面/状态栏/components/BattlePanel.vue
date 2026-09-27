<template>
  <div class="hx-mask" @click.self="$emit('close')">
    <div class="hx-modal">
      <div class="hx-modal-h">
        <span>切磋 · {{ d.战斗.对手 || '——' }}</span>
        <span class="hx-modal-x" @click="$emit('close')">×</span>
      </div>
      <div class="hx-modal-b">
        <!-- 双方血条 -->
        <div class="bt-hp">
          <span class="nm">你</span>
          <span class="bt-bar me"><i :style="{ width: 资源百分(d.战斗.我方血, d.战斗.我方血上限) + '%' }" /></span>
          <span class="hx-lab">{{ d.战斗.我方血 }}/{{ d.战斗.我方血上限 }}</span>
        </div>
        <div class="bt-hp">
          <span class="nm">{{ d.战斗.对手 || '对手' }}</span>
          <span class="bt-bar foe"><i :style="{ width: 资源百分(d.战斗.对方血, d.战斗.对方血上限) + '%' }" /></span>
          <span class="hx-lab">{{ d.战斗.对方血 }}/{{ d.战斗.对方血上限 }}</span>
        </div>

        <div class="hx-row" style="margin-top: 6px">
          <span>回合</span><b>{{ d.战斗.回合 }}</b>
        </div>
        <div class="hx-row">
          <span>气</span>
          <b>
            <span class="hx-dots">
              <i v-for="i in 10" :key="i" :class="i <= d.战斗.气 ? 'on' : 'off'" />
            </span>
          </b>
        </div>

        <!-- 增益减益 -->
        <div class="hx-sec" v-if="状态项.length" style="margin-top: 8px">
          <div class="hx-sec-t">身上</div>
          <div class="hx-grid">
            <div v-for="[k, v] in 状态项" :key="k" class="hx-row">
              <span>{{ k }}</span><b>{{ v }} 回合</b>
            </div>
          </div>
        </div>

        <!-- 七个行动（★ 从引擎取，界面不自己写表） -->
        <div class="hx-sec" style="margin-top: 8px">
          <div class="hx-sec-t">
            可出
            <span class="note">{{ d.战斗.状态 === '进行中' ? '点一招' : '已结束' }}</span>
          </div>
          <div class="bt-act">
            <span
              v-for="a in 行动"
              :key="a.名"
              class="bt-btn"
              :class="{ hot: a.可用 && 可点, dis: !a.可用 || !可点 }"
              :title="a.说明 || ''"
              @click="出一手(a.名)"
            >
              {{ a.名 }}<span v-if="a.耗气" class="tier" style="margin-left: 3px">气{{ a.耗气 }}</span>
            </span>
          </div>
          <!-- ★ 克制提示：让玩家看得见「该出什么」 -->
          <div v-if="上回合?.对方行动" class="keep-hint">
            对面刚才出的是「{{ 上回合.对方行动 }}」
            <template v-if="克谁(上回合.对方行动).length">
              —— 克它的是：{{ 克谁(上回合.对方行动).join('、') }}
            </template>
          </div>
        </div>

        <!-- 逐回合日志 -->
        <div class="hx-sec" v-if="d.战斗.日志" style="margin-top: 8px">
          <div class="hx-sec-t">交手</div>
          <div class="hx-text">{{ d.战斗.日志 }}</div>
        </div>

        <div class="hx-sec" v-if="d.战斗.摘要" style="margin-top: 8px">
          <div class="hx-sec-t">结算</div>
          <div class="hx-text" style="border-left-color: var(--p-cinnabar)">{{ d.战斗.摘要 }}</div>
        </div>

        <!-- ★ 起手：由 <user> 挑对手，引擎跑完整场 -->
        <div class="hx-sec" v-if="d.战斗.状态 !== '进行中'" style="margin-top: 8px">
          <div class="hx-sec-t">动手</div>
          <div class="bt-act">
            <span
              v-for="o in 可挑对手"
              :key="o.名"
              class="bt-btn"
              :class="{ dis: busy }"
              :title="`实力 ${o.强度}`"
              @click="打一场(o.名, o.强度)"
            >
              {{ o.名 }}
            </span>
          </div>
        </div>

        <div v-if="错误" class="hx-text" style="border-left-color: var(--p-cinnabar); margin-top: 6px">
          {{ 错误 }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 资源百分 } from '../分档';
import { 可选行动, 出一手 as 出一手引擎, 开打, 克谁 as 克谁引擎, type 回合报告, type 战斗结果 } from '../../../脚本/战斗结算';
import { 角色强度 } from '../../../脚本/契约';

const props = defineProps<{ d: any }>();
defineEmits<{ close: [] }>();

const d = computed(() => props.d);
const 状态项 = computed(() => Object.entries(props.d.战斗.我方状态 ?? {}) as [string, number][]);

// ★ 七行动从**引擎**取，不在界面里手写。
//   界面只是镜子 —— 改契约里的 行动 表，这里自动跟着变。
const 行动 = computed(() => {
  try {
    return 可选行动(props.d);
  } catch (e) {
    console.warn('[活侠传] 取可用行动失败', e);
    return [];
  }
});

/** 可挑的对手（从契约的 角色强度 表取，界面不写死） */
const 可挑对手 = computed(() =>
  Object.entries(角色强度 as Record<string, number>).map(([名, 强度]) => ({ 名, 强度 })),
);

const busy = ref(false);
const 错误 = ref('');
const 上回合 = ref<回合报告 | null>(null);

/** 战斗中才能点招 */
const 可点 = computed(() => props.d.战斗.状态 === '进行中' && !busy.value);

/** 克制查询 —— 走引擎 */
const 克谁 = (招: string) => 克谁引擎(招);

/**
 * 打一场 —— 一次性跑完整场（引擎的 fight 循环）。
 * 适合「不必逐招操作」的场合，比如剧情里的过场打斗。
 */
async function 打一场(对手: string, 强度: number) {
  if (busy.value) return;
  busy.value = true;
  错误.value = '';
  try {
    const { 新变, 结果 } = 开打(props.d, 对手, 强度);
    if (!结果.ok) {
      错误.value = 结果.原因 || '打不起来';
      return;
    }
    Object.assign(props.d, 新变);
    if (结果.叙事) {
      try {
        injectPrompts(
          [{ id: `hxz-fight-${Date.now()}`, position: 'in_chat', depth: 0, role: 'system', content: 结果.叙事 }],
          { once: true },
        );
      } catch (e) {
        console.warn('[活侠传] 注入失败', e);
      }
    }
    await triggerSlash('/trigger');
  } catch (e) {
    错误.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

/**
 * ★ 出一手 —— 单回合结算。
 *
 * 与「打一场」的区别：这个是玩家一次出一招，引擎判一次，适合真正在界面里打；
 * 「打一场」是一次跑完整场，适合后台结算。
 */
async function 出一手(招: string) {
  if (!可点.value) return;
  busy.value = true;
  错误.value = '';
  try {
    const { 新变, 报告 } = 出一手引擎(props.d, 招);
    if (!报告.ok) {
      错误.value = 报告.原因 || '出不了这一手';
      return;
    }
    Object.assign(props.d, 新变);
    上回合.value = 报告;

    if (报告.叙事) {
      try {
        injectPrompts(
          [{ id: `hxz-turn-${Date.now()}`, position: 'in_chat', depth: 0, role: 'system', content: 报告.叙事 }],
          { once: true },
        );
      } catch (e) {
        console.warn('[活侠传] 注入失败', e);
      }
    }

    // ★ 打完了才触发生成 —— 没打完就继续留在面板里出招
    if (报告.结束) {
      try {
        await triggerSlash('/trigger');
      } catch (e) {
        console.warn('[活侠传] 触发生成失败', e);
      }
    }
  } catch (e) {
    错误.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.bt-btn.dis {
  opacity: 0.4;
  pointer-events: none;
}
.keep-hint {
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--p-ink-3);
}
</style>
