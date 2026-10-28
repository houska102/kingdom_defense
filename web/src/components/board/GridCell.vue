<script setup lang="ts">
import { computed } from 'vue'
import { tileDefense } from '@/game/entities'
import {
  attackOnTile,
  cityReduction,
  exposedSidesOf,
  previewAttack,
  state,
  tileAt,
  unitsOnAttack,
} from '@/game/store'
import type { Direction } from '@/game/types'
import StatBar from '@/components/shared/StatBar.vue'

const FRONT_MARKER = 5
const MARKER_COLOR = '#e0563f'
const MARKER_OFFSETS: Record<Direction, string> = {
  north: `0 ${FRONT_MARKER}px`,
  south: `0 -${FRONT_MARKER}px`,
  west: `${FRONT_MARKER}px 0`,
  east: `-${FRONT_MARKER}px 0`,
}

const props = defineProps<{ cell: number; active: boolean }>()

const tile = computed(() => tileAt(props.cell))
const attack = computed(() => (tile.value ? attackOnTile(tile.value.id) : undefined))
const threat = computed(() => (attack.value ? previewAttack(attack.value)?.tileDamage : 0))
const defenders = computed(() => (attack.value ? unitsOnAttack(attack.value.id) : []))
const reduction = computed(() =>
  tile.value && state.phase !== 'setup' ? cityReduction(tile.value) : 0,
)
const exposed = computed(() => (tile.value ? exposedSidesOf(tile.value) : []))
const dense = computed(() => state.gridSize >= 5)

const frontMarkerShadow = computed(() => {
  if (exposed.value.length === 0) return undefined
  return exposed.value.map((side) => `inset ${MARKER_OFFSETS[side]} 0 ${MARKER_COLOR}`).join(', ')
})

const title = computed(
  () =>
    [
      exposed.value.length && `Exposed from ${exposed.value.join(', ')}: attacked first`,
      tile.value?.prebuilt && 'Prebuilt: cannot be moved',
    ]
      .filter(Boolean)
      .join('. ') || undefined,
)
</script>

<template>
  <button
    class="cell"
    :class="{
      empty: !tile,
      ruined: tile && tile.health === 0,
      attacked: !!attack,
      active,
      prebuilt: tile?.prebuilt,
      dense,
    }"
    :style="{ boxShadow: frontMarkerShadow }"
    :title="title"
  >
    <template v-if="tile">
      <span class="name">{{ tile.def.name }}</span>
      <span v-if="tile.prebuilt && state.phase === 'setup'" class="prebuilt-badge">Prebuilt</span>
      <span class="defense">
        DEF {{ tileDefense(tile) }}
        <em v-if="tile.bonusDefense > 0">(+{{ tile.bonusDefense }})</em>
      </span>
      <StatBar :value="tile.health" :max="tile.def.health" kind="health" :threat="threat" />
      <span v-if="attack" class="attack-badge" :class="{ merged: attack.merged > 0 }">
        ATK {{ attack.strength }}
        <template v-if="attack.merged > 0"> x{{ attack.merged + 1 }}</template>
        <template v-if="attack.deep"> ½</template>
      </span>
      <span v-if="attack && reduction > 0" class="reduction">-{{ reduction }} tower</span>
      <span
        v-if="defenders.length"
        class="defenders-badge"
        :title="defenders.map((u) => u.def.name).join(', ')"
      >
        <template v-if="dense">{{ defenders.length }} def</template>
        <template v-else>
          {{ defenders.length }} {{ defenders.length === 1 ? 'defender' : 'defenders' }}
        </template>
      </span>
    </template>
  </button>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.cell {
  position: relative;
  aspect-ratio: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  padding: $spacing;
  border: 2px solid $color-border;
  border-radius: $radius;
  background: $color-surface-raised;
  color: $color-text;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &.empty {
    background: $color-surface;
    border-style: dashed;
  }

  &.ruined {
    opacity: 0.4;
  }

  &.prebuilt {
    border-style: double;
    border-width: 4px;
  }

  &.attacked {
    border-color: $color-attack;
  }

  &.active {
    outline: 2px solid $color-accent;
    outline-offset: 2px;
  }

  .name {
    overflow: hidden;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .defense {
    font-size: 12px;
    color: $color-muted;
  }

  .attack-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    background: $color-attack;
    font-size: 12px;
    font-weight: 700;

    &.merged {
      background: $color-danger;
      box-shadow: 0 0 8px $color-danger;
    }
  }

  .defenders-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    background: $color-health;
    color: $color-bg;
    font-size: 11px;
    font-weight: 700;
  }

  .prebuilt-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    font-size: 10px;
    color: $color-muted;
    text-transform: uppercase;
  }

  .reduction {
    position: absolute;
    top: 30px;
    right: 6px;
    font-size: 10px;
    color: $color-accent;
  }
}

.cell.dense {
  gap: 3px;
  padding: 6px;
  font-size: 13px;

  .defense {
    font-size: 11px;
  }

  .attack-badge {
    top: 4px;
    right: 4px;
    padding: 1px 4px;
    font-size: 11px;
  }

  .defenders-badge,
  .prebuilt-badge {
    top: 4px;
    left: 4px;
    padding: 1px 4px;
    font-size: 10px;
  }

  .reduction {
    top: 24px;
    right: 4px;
  }
}
</style>
