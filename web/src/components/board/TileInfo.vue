<script setup lang="ts">
import { tileDefense } from '@/game/entities'
import type { Tile } from '@/game/types'

defineProps<{ tile: Tile }>()
</script>

<template>
  <div class="tile-info">
    <span class="stats">
      DEF {{ tileDefense(tile) }} / HP {{ tile.health }}/{{ tile.def.health }}
      <template v-if="tile.health === 0"> (destroyed)</template>
    </span>
    <span class="desc">{{ tile.def.description }}</span>
    <span v-if="tile.prebuilt" class="hint">Prebuilt: cannot be moved or replaced.</span>
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.tile-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: $spacing * 1.5;

  .stats,
  .hint {
    font-size: 13px;
    color: $color-muted;
  }

  .desc {
    font-size: 13px;
  }
}
</style>
