<template>
  <!-- 开局表单：玩家的游玩入口
       ★ 与状态栏的分工：
         状态栏（挂在 AI 每回合的 <StatusPlaceHolderImpl/>）= 只读，看数值
         本表单（挂在开场白的 <OpeningPlaceHolder/>）= 可交互，填人设、定开局 -->
  <div class="hx-open">
    <div class="hx-open-hd">
      <div class="hx-open-t">活侠传</div>
      <div class="hx-open-sub">南宋 · 蜀中绵阳 · 唐门</div>
    </div>

    <div class="hx-open-lead">
      你叫什么，从哪里来，都不是要紧的。<br />
      要紧的是——唐门的外姓弟子，如今只剩你一个了。
    </div>

    <!-- ① 身份 -->
    <div class="hx-f">
      <div class="hx-f-t">
        你是谁
        <span class="hx-f-note">身份决定初始能力，也决定别人怎么看你</span>
      </div>
      <div class="hx-opts">
        <div
          v-for="o in 身份选项"
          :key="o.值"
          class="hx-opt"
          :class="{ on: 身份 === o.值 }"
          @click="选身份(o.值)"
        >
          <div class="hx-opt-n">{{ o.名 }}</div>
          <div class="hx-opt-d">{{ o.说明 }}</div>
        </div>
      </div>
    </div>

    <!-- ② 姓名与出身（原创弟子才填） -->
    <div v-if="身份 === '原创弟子'" class="hx-f">
      <div class="hx-f-t">你叫什么</div>
      <div class="hx-inp-row">
        <label class="hx-lab">姓名</label>
        <input v-model="姓名" class="hx-inp" placeholder="姓甚名谁" maxlength="8" />
      </div>
      <div class="hx-inp-row">
        <label class="hx-lab">出身</label>
        <input v-model="出身" class="hx-inp" placeholder="何处人氏" maxlength="10" />
      </div>
    </div>

    <!-- ③ 配点（剩余点数为 0 才能开局） -->
    <div class="hx-f">
      <div class="hx-f-t">
        你的底子
        <span class="hx-f-note">
          还剩
          <b :class="{ warn: 剩余 < 0 }">{{ 剩余 }}</b>
          点
        </span>
      </div>
      <div class="hx-attrs">
        <div v-for="a in 配点项" :key="a.键" class="hx-attr">
          <div class="hx-attr-n">
            {{ a.名 }}
            <span class="hx-attr-v" :class="{ warn: 剩余 < 0 }">{{ 配点[a.键] }}</span>
          </div>
          <div class="hx-attr-b">
            <button class="hx-mini" :disabled="配点[a.键] <= a.最小" @click="调(a.键, -1)">−</button>
            <button class="hx-mini" :disabled="剩余 <= 0 || 配点[a.键] >= a.最大" @click="调(a.键, 1)">+</button>
          </div>
          <div class="hx-attr-d">{{ a.说明 }}</div>
        </div>
      </div>
    </div>

    <!-- ④ 开局提示 -->
    <div class="hx-f hx-tips">
      <div class="hx-f-t">开局须知</div>
      <ul>
        <li>骰子不是你的朋友。这世道处处与你作对。</li>
        <li>时间按旬走，<b>错过的事件不会回来</b>。</li>
        <li>外姓弟子不得修习内门武功——但不妨碍你拜师他人。</li>
        <li>有些门，推开了就关不上；有些人，错过了就是一辈子。</li>
      </ul>
    </div>

    <!-- ⑤ 提交 -->
    <div class="hx-open-ft">
      <button class="hx-go" :disabled="不能开" @click="开局">
        {{ 不能开 ? (剩余 < 0 ? '点数超了' : '还在想…') : '入唐门' }}
      </button>
      <div v-if="错误" class="hx-err">{{ 错误 }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createPinia } from 'pinia';
import { useDataStore } from '../状态栏/store';

/**
 * 开局表单。
 *
 * ★ 这是「能玩」的关键：状态栏只是看，这里是**点**。
 *   玩家在这里定人设 → 写进 MVU 变量 → 发一条用户消息 → 触发 AI 铺开开场。
 *
 * ★ 配点逻辑：给 N 点自由分配，花完才能开。
 *   数值直接写 你.* 下对应的字段，与 schema 对齐。
 */
const 身份选项 = [
  {
    值: '赵活',
    名: '赵活',
    说明: '原著主角，唐门外姓弟子。麻烦是身份低、相貌丑；好处是待得久、人面熟。',
  },
  {
    值: '原创弟子',
    名: '原创弟子',
    说明: '新入门的弟子。姓名、出身、配点全由你自己定。',
  },
];

const 身份 = ref('赵活');
const 姓名 = ref('');
const 出身 = ref('');
const 错误 = ref('');
const 提交中 = ref(false);

// ── 配点 ──
//   ★ 数值与 schema 的 你.* 一一对应，改这里要同步改 字段路径
const 总点 = 12;
const 配点项 = [
  { 键: '暗器', 名: '暗器', 最小: 0, 最大: 12, 说明: '唐门立身之本' },
  { 键: '拳掌', 名: '拳掌', 最小: 0, 最大: 12, 说明: '近身搏命' },
  { 键: '轻功', 名: '轻功', 最小: 0, 最大: 12, 说明: '逃命与暗器都靠它' },
  { 键: '学问', 名: '学问', 最小: 0, 最大: 12, 说明: '读书认字，三师兄的路数' },
  { 键: '嘴力', 名: '嘴力', 最小: 0, 最大: 12, 说明: '骂人也是一门功夫' },
  { 键: '锻造', 名: '锻造', 最小: 0, 最大: 12, 说明: '打铁，能做护心镜' },
];

const 配点 = reactive<Record<string, number>>(
  Object.fromEntries(配点项.map(a => [a.键, 0])),
);

const 剩余 = computed(
  () => 总点 - Object.values(配点).reduce((s, v) => s + v, 0),
);
const 不能开 = computed(() => 剩余.value !== 0 || 提交中.value);

function 调(键: string, 量: number) {
  const a = 配点项.find(x => x.键 === 键);
  if (!a) return;
  const 新 = 配点[键] + 量;
  if (新 < a.最小 || 新 > a.最大) return;
  if (量 > 0 && 剩余.value <= 0) return;
  配点[键] = 新;
}

function 选身份(v: string) {
  身份.value = v;
  if (v === '赵活') {
    姓名.value = '';
    出身.value = '';
  }
}

// ── 提交 ──
async function 开局() {
  if (不能开.value) return;
  提交中.value = true;
  错误.value = '';

  try {
    const pinia = createPinia();
    const store = useDataStore(pinia);

    // ① 写入 MVU 变量
    const 你 = (store.data as any).你;
    你.身份 = 身份.value === '赵活' ? '唐门外姓弟子' : '唐门弟子';
    你.出身 = 出身.value.trim() || '绵阳';
    // 配点：基础值 + 玩家分配
    for (const a of 配点项) {
      if (a.键 === '轻功' || a.键 === '学问' || a.键 === '嘴力') {
        你[a.键] = Number(你[a.键] || 0) + 配点[a.键];
      } else if (a.键 === '锻造') {
        你.锻造 = Number(你.锻造 || 0) + 配点[a.键];
      } else {
        你.八系[a.键] = Number(你.八系?.[a.键] || 0) + 配点[a.键];
      }
    }

    // ② 把选择作为用户消息发出
    const 报 = 身份.value === '赵活'
      ? '（我按原样来。赵活，唐门外姓弟子。）'
      : `（我叫${姓名.value.trim() || '无名'}，${出身.value.trim() || '绵阳'}人氏。请照这个开局。）`;

    await createChatMessages([{ role: 'user', name: '我', message: 报 }]);

    // ③ 让 AI 接着铺开场
    triggerSlash('/trigger');
  } catch (e) {
    错误.value = e instanceof Error ? e.message : String(e);
    console.error('[活侠传] 开局失败', e);
  } finally {
    提交中.value = false;
  }
}
</script>

<style scoped>
.hx-open {
  max-width: 640px;
  margin: 0 auto;
  padding: 18px 16px 24px;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  color: var(--p-ink, #2a2823);
  background: var(--p-paper, #f7f4ea);
}
.hx-open-hd {
  text-align: center;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--p-line, #2a282318);
}
.hx-open-t {
  font-size: 26px;
  letter-spacing: 8px;
  color: var(--p-ink, #2a2823);
}
.hx-open-sub {
  margin-top: 6px;
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--p-ink-4, #9a9384);
}
.hx-open-lead {
  margin: 16px 0 20px;
  padding: 12px 14px;
  font-size: 13.5px;
  line-height: 1.9;
  color: var(--p-ink-2, #4a463d);
  background: #9c6b3f0a;
  border-left: 3px solid var(--p-ochre, #9c6b3f);
}
.hx-f {
  margin-bottom: 18px;
}
.hx-f-t {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--p-ink, #2a2823);
  letter-spacing: 1px;
  margin-bottom: 9px;
}
.hx-f-note {
  font-size: 11px;
  font-weight: 400;
  color: var(--p-ink-4, #9a9384);
}
.hx-f-note b {
  color: var(--p-cinnabar, #a8332a);
}
.hx-opts {
  display: grid;
  gap: 8px;
}
.hx-opt {
  padding: 10px 12px;
  border: 1px solid var(--p-line, #2a282318);
  border-radius: 4px;
  cursor: pointer;
  background: var(--p-paper-2, #f2eee2);
  transition: all 0.15s;
}
.hx-opt:hover {
  border-color: var(--p-ochre, #9c6b3f);
}
.hx-opt.on {
  border-color: var(--p-cinnabar, #a8332a);
  background: #a8332a0d;
  box-shadow: inset 3px 0 0 var(--p-cinnabar, #a8332a);
}
.hx-opt-n {
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 3px;
}
.hx-opt.on .hx-opt-n {
  color: var(--p-cinnabar, #a8332a);
}
.hx-opt-d {
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--p-ink-3, #6e695c);
}
.hx-inp-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 7px;
}
.hx-lab {
  flex: 0 0 34px;
  font-size: 12px;
  color: var(--p-ink-3, #6e695c);
}
.hx-inp {
  flex: 1;
  padding: 6px 9px;
  font-size: 13px;
  font-family: inherit;
  color: var(--p-ink, #2a2823);
  background: #fff;
  border: 1px solid var(--p-line, #2a282318);
  border-radius: 3px;
  outline: none;
}
.hx-inp:focus {
  border-color: var(--p-ochre, #9c6b3f);
}
.hx-attrs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 7px;
}
.hx-attr {
  padding: 8px 10px;
  border: 1px solid var(--p-line, #2a282318);
  border-radius: 4px;
  background: var(--p-paper-2, #f2eee2);
}
.hx-attr-n {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12.5px;
  font-weight: 600;
}
.hx-attr-v {
  color: var(--p-cinnabar, #a8332a);
  font-size: 15px;
}
.hx-attr-v.warn {
  color: #c00;
}
.hx-attr-b {
  display: flex;
  gap: 5px;
  margin: 6px 0 5px;
}
.hx-mini {
  flex: 1;
  padding: 2px 0;
  font-size: 14px;
  line-height: 1.4;
  font-family: inherit;
  color: var(--p-ink-2, #4a463d);
  background: #fff;
  border: 1px solid var(--p-line, #2a282318);
  border-radius: 3px;
  cursor: pointer;
}
.hx-mini:hover:not(:disabled) {
  border-color: var(--p-ochre, #9c6b3f);
  color: var(--p-ochre, #9c6b3f);
}
.hx-mini:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.hx-attr-d {
  font-size: 10.5px;
  color: var(--p-ink-4, #9a9384);
}
.hx-tips ul {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.9;
  color: var(--p-ink-3, #6e695c);
}
.hx-tips b {
  color: var(--p-cinnabar, #a8332a);
}
.hx-open-ft {
  margin-top: 20px;
  text-align: center;
}
.hx-go {
  padding: 10px 46px;
  font-size: 15px;
  font-family: inherit;
  letter-spacing: 4px;
  color: #f7f4ea;
  background: var(--p-cinnabar, #a8332a);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.hx-go:hover:not(:disabled) {
  opacity: 0.86;
}
.hx-go:disabled {
  background: var(--p-ink-4, #9a9384);
  cursor: not-allowed;
  opacity: 0.6;
}
.hx-err {
  margin-top: 9px;
  font-size: 12px;
  color: #c00;
}
</style>
