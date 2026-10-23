<script setup lang="ts">
import { GARRISON_PICKS, UNIT_DEFS } from '@/game/data'
import { state, toggleUnit } from '@/game/store'
</script>

<template>
  <section class="panel">
    <h2>Garrison ({{ state.pickedUnitDefIds.length }}/{{ GARRISON_PICKS }})</h2>
    <div class="list">
      <button
        v-for="def in UNIT_DEFS"
        :key="def.id"
        class="item"
        :class="{ selected: state.pickedUnitDefIds.includes(def.id) }"
        :disabled="
          !state.pickedUnitDefIds.includes(def.id) &&
          state.pickedUnitDefIds.length >= GARRISON_PICKS
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

.item.selected {
  border-color: $color-accent;
}
</style>
