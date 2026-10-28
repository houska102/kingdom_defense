<script setup lang="ts">
import { computed } from 'vue'
import { attackOnTile, state, tileAt } from '@/game/store'
import AttackBanner from './AttackBanner.vue'
import GridCell from './GridCell.vue'

const props = defineProps<{
  /** Highlights cells that react to clicks in the current interaction. */
  highlight: 'empty' | 'filled' | 'attacked' | 'alive' | null
}>()

const emit = defineEmits<{ cellClick: [cell: number] }>()

const cells = computed(() => Array.from({ length: state.gridSize * state.gridSize }, (_, cell) => cell))

function isActive(cell: number): boolean {
  const tile = tileAt(cell)
  switch (props.highlight) {
    case 'empty':
      return !tile
    case 'filled':
      return !!tile && !tile.prebuilt
    case 'attacked':
      return !!tile && !!attackOnTile(tile.id)
    case 'alive':
      return !!tile && tile.health > 0
    default:
      return false
  }
}
</script>

<template>
  <div
    class="battlefield"
    :class="[`from-${state.attackDirection}`, { dense: state.gridSize >= 5 }]"
  >
    <AttackBanner class="banner" />
    <div class="city-grid" :style="{ gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))` }">
      <GridCell
        v-for="cell in cells"
        :key="cell"
        :cell="cell"
        :active="isActive(cell)"
        @click="emit('cellClick', cell)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

/* --board-width is set by the page layout and grows with the grid size. */
$grid-width: var(--board-width, 600px);
$side-banner-width: 48px;

.battlefield {
  display: grid;
  gap: $spacing;
  width: min(100%, $grid-width);

  &.from-north {
    grid-template-areas: 'banner' 'grid';
  }

  &.from-south {
    grid-template-areas: 'grid' 'banner';
  }

  &.from-west {
    grid-template-areas: 'banner grid';
    grid-template-columns: auto minmax(0, 1fr);
  }

  &.from-east {
    grid-template-areas: 'grid banner';
    grid-template-columns: minmax(0, 1fr) auto;
  }

  &.from-west,
  &.from-east {
    width: min(100%, calc(#{$grid-width} + #{$side-banner-width}));
  }
}

.banner {
  grid-area: banner;
}

.city-grid {
  grid-area: grid;
  display: grid;
  gap: $spacing;
}

.battlefield.dense .city-grid {
  gap: 6px;
}
</style>
