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

const rows = computed(() =>
  state.attacks.map((attack) => {
    const tile = tileById(attack.tileId)
    const preview = previewAttack(attack)
    return {
      attack,
      tile,
      preview,
      units: unitsOnAttack(attack.id),
      destroys: !!tile && !!preview && preview.tileDamage >= tile.health,
    }
  }),
)
</script>

<template>
  <section class="panel">
    <h2>Attacks</h2>
    <p class="hint">
      {{
        state.selectedUnitId
          ? 'Click an attack (or its tile) to send the selected unit there.'
          : 'Select a unit from your garrison first.'
      }}
    </p>
    <div class="list">
      <div
        v-for="row in rows"
        :key="row.attack.id"
        class="item attack"
        :class="{ ready: !!state.selectedUnitId, danger: row.destroys }"
        @click="assignSelectedUnit(row.attack.id)"
      >
        <span class="title">
          {{ row.tile?.def.name }}
          <span class="strength">ATK {{ row.attack.strength }}</span>
          <span v-if="row.attack.merged > 0" class="merged">
            {{ row.attack.merged + 1 }} attacks merged
          </span>
          <span v-if="row.attack.deep" class="deep">half strength (behind front line)</span>
        </span>
        <span v-if="row.preview" class="stats">
          <template v-if="row.preview.reduction > 0">-{{ row.preview.reduction }} passives, </template>
          defense blocks {{ row.preview.blockedByTile }}, garrison absorbs
          {{ row.preview.absorbedByGarrison }}, tile takes {{ row.preview.tileDamage }}
          <strong v-if="row.destroys"> - tile will be destroyed!</strong>
        </span>
        <div class="assigned">
          <button
            v-for="unit in row.units"
            :key="unit.id"
            class="chip"
            title="Click to recall"
            @click.stop="unassignUnit(unit.id)"
          >
            {{ unit.def.name }}
            <template v-if="row.preview">
              (-{{ row.preview.unitDamage.find((d) => d.unitId === unit.id)?.enduranceLoss ?? 0 }}
              end, -{{ row.preview.unitDamage.find((d) => d.unitId === unit.id)?.healthLoss ?? 0 }}
              hp)
            </template>
            x
          </button>
        </div>
      </div>
    </div>
  </section>
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
