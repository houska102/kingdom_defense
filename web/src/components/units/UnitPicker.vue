<script setup lang="ts">
import { garrisonPicks, garrisonPool, state, toggleUnit } from '@/game/store'
</script>

<template>
  <section class="panel">
    <h2>Garrison ({{ state.pickedUnitDefIds.length }}/{{ garrisonPicks() }})</h2>
    <div class="list">
      <button
        v-for="def in garrisonPool()"
        :key="def.id"
        class="item"
        :class="{ selected: state.pickedUnitDefIds.includes(def.id) }"
        :disabled="
          !state.pickedUnitDefIds.includes(def.id) &&
          state.pickedUnitDefIds.length >= garrisonPicks()
        "
        @click="toggleUnit(def.id)"
      >
        <span class="title">{{ def.name }}</span>
        <span class="stats">STR {{ def.strength }} / HP {{ def.health }} / END {{ def.endurance }}</span>
        <span class="desc">{{ def.description }}</span>
      </button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.item.selected {
  border-color: $color-accent;
}
</style>
