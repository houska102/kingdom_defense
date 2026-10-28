<script setup lang="ts">
import { computed } from 'vue'
import { describeUnitPassive } from '@/game/entities'
import { attackOfUnit, state, tileById } from '@/game/store'
import type { Unit } from '@/game/types'
import StatBar from '@/components/shared/StatBar.vue'

const props = defineProps<{ unit: Unit; targeting: boolean }>()

const inBattle = computed(() => state.phase === 'assign' || state.phase === 'event')

const assignedTileName = computed(() => {
  if (!inBattle.value) return undefined
  const attack = attackOfUnit(props.unit.id)
  return attack ? (tileById(attack.tileId)?.def.name ?? '?') : undefined
})
</script>

<template>
  <button
    class="item unit"
    :class="{
      selected: state.selectedUnitId === unit.id,
      targeting,
      assigned: !!assignedTileName,
    }"
  >
    <span class="title">
      {{ unit.def.name }} <span class="count">STR {{ unit.def.strength }}</span>
      <span v-if="assignedTileName" class="badge">Defending {{ assignedTileName }}</span>
      <span v-else-if="inBattle" class="badge resting">Resting</span>
    </span>
    <StatBar :value="unit.health" :max="unit.def.health" kind="health" />
    <StatBar :value="unit.endurance" :max="unit.def.endurance" kind="endurance" />
    <span v-if="unit.def.passive" class="passive">
      {{ describeUnitPassive(unit.def.passive) }}
    </span>
  </button>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.unit {
  gap: 4px;

  &.assigned {
    border-left: 6px solid $color-health;
    background: rgba(76, 175, 80, 0.12);
  }

  &.selected,
  &.targeting:hover {
    border-color: $color-accent;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .passive {
    font-size: 12px;
    color: $color-accent;
  }

  .badge {
    margin-left: auto;
    padding: 1px 8px;
    border-radius: 999px;
    background: $color-health;
    color: $color-bg;
    font-size: 11px;
    font-weight: 700;

    &.resting {
      background: $color-surface;
      color: $color-muted;
    }
  }
}
</style>
