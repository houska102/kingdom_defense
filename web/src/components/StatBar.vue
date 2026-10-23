<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  max: number
  kind: 'health' | 'endurance'
  /** Incoming damage, drawn as a yellow segment of the current value. */
  threat?: number
}>()

const current = computed(() => Math.max(0, props.value))
const threatened = computed(() => Math.min(current.value, Math.max(0, props.threat ?? 0)))
const remaining = computed(() => current.value - threatened.value)

function percent(amount: number): number {
  if (props.max <= 0) return 0
  return (amount / props.max) * 100
}

const title = computed(() => {
  const base = `${props.kind}: ${props.value}/${props.max}`
  const damage = Math.max(0, props.threat ?? 0)
  return damage > 0 ? `${base}, taking ${damage}` : base
})
</script>

<template>
  <div class="stat-bar" :class="props.kind" :title="title">
    <div class="fill" :style="{ width: `${percent(remaining)}%` }" />
    <div v-if="threatened > 0" class="threat" :style="{ width: `${percent(threatened)}%` }" />
    <span class="label">{{ props.value }}/{{ props.max }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.stat-bar {
  position: relative;
  display: flex;
  height: 14px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;

  .fill,
  .threat {
    flex: none;
    height: 100%;
    transition: width 0.25s;
  }

  &.health .fill {
    background: $color-health;
  }

  &.endurance .fill {
    background: $color-endurance;
  }

  .threat {
    background: $color-accent;
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
