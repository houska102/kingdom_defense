<script setup lang="ts">
import { computed } from 'vue'
import {
  assignSelectedUnit,
  previewAttack,
  state,
  tileById,
  unassignUnit,
  unitsOnAttack,
} from '@/game/store'
import type { Attack } from '@/game/types'

const props = defineProps<{ attack: Attack }>()

const tile = computed(() => tileById(props.attack.tileId))
const preview = computed(() => previewAttack(props.attack))
const units = computed(() => unitsOnAttack(props.attack.id))
const destroys = computed(
  () => !!tile.value && !!preview.value && preview.value.tileDamage >= tile.value.health,
)

function unitDamage(unitId: string) {
  return preview.value?.unitDamage.find((d) => d.unitId === unitId)
}
</script>

<template>
  <div
    class="item attack"
    :class="{ ready: !!state.selectedUnitId, danger: destroys }"
    @click="assignSelectedUnit(attack.id)"
  >
    <span class="title">
      {{ tile?.def.name }}
      <span class="strength">ATK {{ attack.strength }}</span>
      <span v-if="attack.merged > 0" class="merged">{{ attack.merged + 1 }} attacks merged</span>
      <span v-if="attack.deep" class="deep">half strength (behind front line)</span>
    </span>
    <span v-if="preview" class="stats">
      <template v-if="preview.reduction > 0">-{{ preview.reduction }} passives, </template>
      defense blocks {{ preview.blockedByTile }}, garrison absorbs
      {{ preview.absorbedByGarrison }}, tile takes {{ preview.tileDamage }}
      <strong v-if="destroys"> - tile will be destroyed!</strong>
    </span>
    <span v-if="preview && tile?.escaping" class="escape" :class="{ blocked: preview.tileDamage > 0 }">
      <template v-if="preview.tileDamage > 0">
        Escape fails: block {{ preview.tileDamage }} more damage to get away.
      </template>
      <template v-else>Escaping: gets away unless an event changes the attack.</template>
    </span>
    <div class="assigned">
      <button
        v-for="unit in units"
        :key="unit.id"
        class="chip"
        title="Click to recall"
        @click.stop="unassignUnit(unit.id)"
      >
        {{ unit.def.name }}
        <template v-if="preview">
          (-{{ unitDamage(unit.id)?.enduranceLoss ?? 0 }} end, -{{ unitDamage(unit.id)?.healthLoss ?? 0 }} hp)
        </template>
        x
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.attack {
  cursor: default;
  border-color: $color-attack;

  &.ready {
    cursor: pointer;

    &:hover {
      border-color: $color-accent;
    }
  }

  &.danger .stats strong {
    color: $color-attack;
  }

  .strength {
    margin-left: 4px;
    color: $color-attack;
  }

  .escape {
    font-size: 13px;
    color: $color-accent;

    &.blocked {
      color: $color-attack;
    }
  }

  .deep {
    margin-left: 4px;
    font-size: 12px;
    color: $color-muted;
  }

  .merged {
    margin-left: 4px;
    font-size: 12px;
    color: $color-danger;
  }
}

.assigned {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.chip {
  padding: 2px 8px;
  border: 1px solid $color-border;
  border-radius: 999px;
  background: $color-surface;
  color: $color-text;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
</style>
