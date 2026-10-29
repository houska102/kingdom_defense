<script setup lang="ts">
import type { Tile } from '@/game/types'

defineProps<{ tile: Tile }>()
</script>

<template>
  <span class="gold">Carries {{ tile.hoard ?? 0 }} gold, lost unless it escapes.</span>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.gold {
  color: $color-accent;
  font-weight: 600;
}
</style>
