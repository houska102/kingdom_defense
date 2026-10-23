<script setup lang="ts">
const props = defineProps<{
  value: number
  max: number
  kind: 'health' | 'endurance'
}>()
</script>

<template>
  <div class="stat-bar" :class="props.kind" :title="`${props.kind}: ${props.value}/${props.max}`">
    <div class="fill" :style="{ width: `${(Math.max(0, props.value) / props.max) * 100}%` }" />
    <span class="label">{{ props.value }}/{{ props.max }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.stat-bar {
  position: relative;
  height: 14px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;

  .fill {
    height: 100%;
    transition: width 0.25s;
  }

  &.health .fill {
    background: $color-health;
  }

  &.endurance .fill {
    background: $color-endurance;
  }

  .label {
    position: absolute;
    inset: 0;
    font-size: 10px;
    line-height: 14px;
    text-align: center;
  }
}
</style>
