<script setup lang="ts">
import { describeUnitPassive } from '@/game/entities'
import { attackOfUnit, state, tileById } from '@/game/store'
import StatBar from './StatBar.vue'

const props = defineProps<{ targeting: boolean }>()
const emit = defineEmits<{ unitClick: [unitId: string] }>()

function assignedTileName(unitId: string): string | undefined {
  if (state.phase !== 'assign' && state.phase !== 'event') return undefined
  const attack = attackOfUnit(unitId)
  return attack ? (tileById(attack.tileId)?.def.name ?? '?') : undefined
}
</script>

<template>
  <section class="panel">
    <h2>Garrison</h2>
    <p v-if="state.units.length === 0" class="hint">Your whole garrison has fallen.</p>
    <div class="list">
      <button
        v-for="unit in state.units"
        :key="unit.id"
        class="item unit"
        :class="{
          selected: state.selectedUnitId === unit.id,
          targeting: props.targeting,
          assigned: !!assignedTileName(unit.id),
        }"
        @click="emit('unitClick', unit.id)"
      >
        <span class="title">
          {{ unit.def.name }} <span class="count">STR {{ unit.def.strength }}</span>
          <span v-if="assignedTileName(unit.id)" class="badge">
            Defending {{ assignedTileName(unit.id) }}
          </span>
          <span
            v-else-if="state.phase === 'assign' || state.phase === 'event'"
            class="badge resting"
          >
            Resting
          </span>
        </span>
        <StatBar :value="unit.health" :max="unit.def.health" kind="health" />
        <StatBar :value="unit.endurance" :max="unit.def.endurance" kind="endurance" />
        <span v-if="unit.def.passive" class="passive">
          {{ describeUnitPassive(unit.def.passive) }}
        </span>
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
