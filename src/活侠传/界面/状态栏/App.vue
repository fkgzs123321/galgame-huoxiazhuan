<template>
  <!--
    活侠传 · 状态栏

    ★ 2026-09-28 改版：从「顶栏 + 页签」的表格形态，改成**游戏场景形态**。
      原因：玩家反馈「面板用不了、不像游戏」。原形态只能看数值，不能点。

      新形态照原作布局：
        ┌─ 顶栏：年月旬 / 昼夜天气 / 行动点 / 体力内力银两 ─┐
        ├─ 左：场景图（地点背景，按昼夜切换）          ─┤
        │     场景里站着在场角色的立绘，可点             │
        │     底部横排「前往」按钮（唐门 12 处）         │
        ├─ 右：本旬可做的事 + 结算结果                  ─┤
        └─ 下：页签（人物/属性/武学/行囊/事务/见闻）    ─┘
  -->
  <GameMain v-if="d" />
  <div v-else class="hx-wait">正在读取江湖…</div>
</template>

<script setup lang="ts">
import GameMain from './components/GameMain.vue';
import { useDataStore } from './store';

const store = useDataStore();
const d = computed(() => store.data);
</script>

<style scoped>
.hx-wait {
  padding: 22px;
  text-align: center;
  font-size: 13px;
  color: var(--p-ink-4);
  letter-spacing: 2px;
}
</style>
