<script setup lang="ts">
import { isFreePick, upkeepOf } from '@/game/campaign'
import {
  canPickUnit,
  garrisonPicks,
  garrisonPool,
  pickedCount,
  state,
  toggleUnit,
} from '@/game/store'
</script>

<template>
  <section class="panel">
    <h2>Garrison ({{ pickedCount() }}/{{ garrisonPicks() }})</h2>
    <div class="list">
      <button
        v-for="def in garrisonPool()"
        :key="def.id"
        class="item"
        :class="{ selected: state.pickedUnitDefIds.includes(def.id) }"
        :disabled="!state.pickedUnitDefIds.includes(def.id) && !canPickUnit(def)"
        @click="toggleUnit(def.id)"
      >
        <span class="title">
          {{ def.name }}
          <span v-if="isFreePick(def)" class="tag">free, {{ upkeepOf(def) }} gold/turn</span>
        </span>
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

.tag {
  margin-left: 4px;
  font-size: 12px;
  color: $color-accent;
}
</style>
