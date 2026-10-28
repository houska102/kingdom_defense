<script setup lang="ts">
import { computed } from 'vue'
import { state } from '@/game/store'
import type { Direction } from '@/game/types'

const ARROWS: Record<Direction, string> = { north: '▼', east: '◀', south: '▲', west: '▶' }
const LABELS: Record<Direction, string> = {
  north: 'North',
  east: 'East',
  south: 'South',
  west: 'West',
}

const vertical = computed(() => state.attackDirection === 'east' || state.attackDirection === 'west')
</script>

<template>
  <div class="banner" :class="{ vertical }">
    <span class="arrows">
      {{ ARROWS[state.attackDirection] }} {{ ARROWS[state.attackDirection] }}
      {{ ARROWS[state.attackDirection] }}
    </span>
    <span>Enemy approaches from the {{ LABELS[state.attackDirection] }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing;
  padding: $spacing;
  border-radius: $radius;
  background: rgba(224, 86, 63, 0.15);
  color: $color-attack;
  font-weight: 700;
  font-size: 14px;

  &.vertical {
    writing-mode: vertical-rl;
  }

  .arrows {
    letter-spacing: 4px;
  }
}
</style>
