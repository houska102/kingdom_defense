<script setup lang="ts">
import { ALL_TILE_DEFS as TILE_DEFS } from '@/game/data'
import { selectTileDef, state } from '@/game/store'
</script>

<template>
  <section class="panel">
    <h2>Buildings</h2>
    <p class="hint">Pick a building, then click an empty cell. Click a placed tile to remove it.</p>
    <div class="list">
      <button
        v-for="(count, defId) in state.palette"
        :key="defId"
        class="item"
        :class="{ selected: state.selectedTileDefId === defId }"
        :disabled="count === 0"
        @click="selectTileDef(defId as string)"
      >
        <span class="title">
          {{ TILE_DEFS[defId].name }} <span class="count">x{{ count }}</span>
        </span>
        <span class="stats">DEF {{ TILE_DEFS[defId].defense }} / HP {{ TILE_DEFS[defId].health }}</span>
        <span class="desc">{{ TILE_DEFS[defId].description }}</span>
      </button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.item.selected {
  border-color: $color-accent;
}
</style>
