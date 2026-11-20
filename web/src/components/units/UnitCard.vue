<script setup lang="ts">
import { computed } from 'vue'
import { describeUnitPassive, maxEndurance } from '@/game/entities'
import { attackOfUnit, isRushed, remainingPreview, state, tileById } from '@/game/store'
import type { Unit } from '@/game/types'
import StatBar from '@/components/shared/StatBar.vue'

const props = defineProps<{ unit: Unit; targeting: boolean }>()

const inBattle = computed(() => state.phase === 'battle' || state.phase === 'draft')

const attack = computed(() => (inBattle.value ? attackOfUnit(props.unit.id) : undefined))
const assignedTileName = computed(() =>
  attack.value ? (tileById(attack.value.tileId)?.def.name ?? '?') : undefined,
)
const ticksLeft = computed(() =>
  attack.value?.status === 'fighting' ? attack.value.duration - attack.value.elapsed : undefined,
)

/** Damage this unit still takes from its fight with the current assignments. */
const damage = computed(() =>
  attack.value
    ? remainingPreview(attack.value)?.unitDamage.find((d) => d.unitId === props.unit.id)
    : undefined,
)
const dies = computed(() => !!damage.value && damage.value.healthLoss >= props.unit.health)
</script>

<template>
  <button
    class="item unit"
    :class="{
      targeting,
      assigned: !!assignedTileName,
    }"
  >
    <span class="title">
      {{ unit.def.name }} <span class="count">STR {{ unit.def.strength }}</span>
      <span v-if="inBattle && isRushed(unit.id)" class="rushed" title="Rushed in, half strength">
        ½
      </span>
      <span v-if="assignedTileName && ticksLeft !== undefined" class="badge fighting">
        Fighting at {{ assignedTileName }}, {{ ticksLeft }} {{ ticksLeft === 1 ? 'tick' : 'ticks' }}
      </span>
      <span v-else-if="assignedTileName" class="badge">Defending {{ assignedTileName }}</span>
      <span v-else-if="inBattle" class="badge resting">Resting</span>
    </span>
    <StatBar
      :value="unit.health"
      :max="unit.def.health"
      kind="health"
      :threat="damage?.healthLoss"
    />
    <StatBar
      :value="unit.endurance"
      :max="maxEndurance(unit, state.fallenUnits)"
      kind="endurance"
      :threat="damage?.enduranceLoss"
    />
    <span v-if="damage && damage.absorbed > 0" class="incoming" :class="{ dies }">
      Takes -{{ damage.enduranceLoss }} end, -{{ damage.healthLoss }} hp
      <strong v-if="dies"> - will die!</strong>
    </span>
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

  &.targeting:not(:disabled):hover {
    border-color: $color-accent;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .incoming {
    font-size: 12px;
    color: $color-accent;

    &.dies {
      color: $color-attack;
    }
  }

  .passive {
    font-size: 12px;
    color: $color-accent;
  }

  .rushed {
    color: $color-danger;
    font-weight: 700;
  }

  .badge {
    margin-left: auto;
    padding: 1px 8px;
    border-radius: 999px;
    background: $color-health;
    color: $color-bg;
    font-size: 11px;
    font-weight: 700;

    &.fighting {
      background: $color-attack;
      color: $color-text;
    }

    &.resting {
      background: $color-surface;
      color: $color-muted;
    }
  }
}
</style>
