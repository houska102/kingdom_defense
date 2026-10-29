<script setup lang="ts">
import type { Tile } from '@/game/types'

defineProps<{ tile: Tile }>()
</script>

<template>
  <span v-if="tile.hoard" class="hoard">{{ tile.hoard }}g</span>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.hoard {
  margin-left: 4px;
  color: $color-accent;
}
</style>
