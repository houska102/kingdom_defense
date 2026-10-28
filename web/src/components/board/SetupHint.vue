<script setup lang="ts">
import { computed } from 'vue'
import { ALL_TILE_DEFS, ALL_UNIT_DEFS } from '@/game/data'
import { currentCity, garrisonPicks, state } from '@/game/store'

const kingdomUnlocks = computed(() => [
  ...Object.entries(state.tileUnlocks).map(([id, n]) => `${ALL_TILE_DEFS[id].name} +${n}`),
  ...state.unitUnlocks.map((id) => ALL_UNIT_DEFS[id].name),
])

const hasPrebuilt = computed(() => state.tiles.some((t) => t.prebuilt))
</script>

<template>
  <p class="hint">
    Place the Keep and pick {{ garrisonPicks() }} garrison units to begin. Losing the Keep loses the city.
    The enemy attacks from the {{ state.attackDirection }}: tiles marked red on that side are the
    front line and get hit first, and the attacks push deeper as they fall.
    <template v-if="hasPrebuilt">
      Some buildings are already standing from earlier fighting and cannot be moved.
    </template>
    <template v-if="currentCity().attackBonus > 0">
      Enemies here are stronger: +{{ currentCity().attackBonus }} attack.
    </template>
  </p>
  <p v-if="kingdomUnlocks.length" class="hint">Kingdom unlocks: {{ kingdomUnlocks.join(', ') }}</p>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.hint {
  color: $color-muted;
  font-size: 14px;
}
</style>
