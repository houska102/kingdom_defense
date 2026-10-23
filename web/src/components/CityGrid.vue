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
import StatBar from './StatBar.vue'

const ARROWS: Record<Direction, string> = { north: '▼', east: '◀', south: '▲', west: '▶' }
const LABELS: Record<Direction, string> = {
  north: 'North',
  east: 'East',
  south: 'South',
  west: 'West',
}

const FRONT_MARKER = 5
const MARKER_COLOR = '#e0563f'
const MARKER_OFFSETS: Record<Direction, string> = {
  north: `0 ${FRONT_MARKER}px`,
  south: `0 -${FRONT_MARKER}px`,
  west: `${FRONT_MARKER}px 0`,
  east: `-${FRONT_MARKER}px 0`,
}

function frontMarkerShadow(sides: Direction[]): string | undefined {
  if (sides.length === 0) return undefined
  return sides.map((side) => `inset ${MARKER_OFFSETS[side]} 0 ${MARKER_COLOR}`).join(', ')
}

const props = defineProps<{
  /** Highlights cells that react to clicks in the current interaction. */
  highlight: 'empty' | 'filled' | 'attacked' | 'alive' | null
}>()

const emit = defineEmits<{ cellClick: [cell: number] }>()

const cells = computed(() =>
  Array.from({ length: state.gridSize * state.gridSize }, (_, cell) => {
    const tile = tileAt(cell)
    const attack = tile ? attackOnTile(tile.id) : undefined
    return {
      cell,
      tile,
      attack,
      threat: attack ? previewAttack(attack)?.tileDamage : 0,
      defenders: attack ? unitsOnAttack(attack.id) : [],
      reduction: tile && state.phase !== 'setup' ? cityReduction(tile) : 0,
      exposed: tile ? exposedSidesOf(tile) : [],
    }
  }),
)

function isActive(c: (typeof cells.value)[number]): boolean {
  switch (props.highlight) {
    case 'empty':
      return !c.tile
    case 'filled':
      return !!c.tile && !c.tile.prebuilt
    case 'attacked':
      return !!c.attack
    case 'alive':
      return !!c.tile && c.tile.health > 0
    default:
      return false
  }
}
</script>

<template>
  <div
    class="battlefield"
    :class="[`from-${state.attackDirection}`, { dense: state.gridSize >= 5 }]"
  >
    <div class="banner">
      <span class="arrows">
        {{ ARROWS[state.attackDirection] }} {{ ARROWS[state.attackDirection] }}
        {{ ARROWS[state.attackDirection] }}
      </span>
      <span>Enemy approaches from the {{ LABELS[state.attackDirection] }}</span>
    </div>
    <div class="city-grid" :style="{ gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))` }">
      <button
        v-for="c in cells"
        :key="c.cell"
        class="cell"
        :class="{
          empty: !c.tile,
          ruined: c.tile && c.tile.health === 0,
          attacked: !!c.attack,
          active: isActive(c),
          prebuilt: c.tile?.prebuilt,
        }"
        :style="{ boxShadow: frontMarkerShadow(c.exposed) }"
        :title="
          [
            c.exposed.length && `Exposed from ${c.exposed.join(', ')}: attacked first`,
            c.tile?.prebuilt && 'Prebuilt: cannot be moved',
          ]
            .filter(Boolean)
            .join('. ') || undefined
        "
        @click="emit('cellClick', c.cell)"
      >
        <template v-if="c.tile">
          <span class="name">{{ c.tile.def.name }}</span>
          <span v-if="c.tile.prebuilt && state.phase === 'setup'" class="prebuilt-badge">Prebuilt</span>
          <span class="defense">
            DEF {{ tileDefense(c.tile) }}
            <em v-if="c.tile.bonusDefense > 0">(+{{ c.tile.bonusDefense }})</em>
          </span>
          <StatBar
            :value="c.tile.health"
            :max="c.tile.def.health"
            kind="health"
            :threat="c.threat"
          />
          <span v-if="c.attack" class="attack-badge" :class="{ merged: c.attack.merged > 0 }">
            ATK {{ c.attack.strength }}
            <template v-if="c.attack.merged > 0"> x{{ c.attack.merged + 1 }}</template>
            <template v-if="c.attack.deep"> ½</template>
          </span>
          <span v-if="c.attack && c.reduction > 0" class="reduction">-{{ c.reduction }} tower</span>
          <span
            v-if="c.defenders.length"
            class="defenders-badge"
            :title="c.defenders.map((u) => u.def.name).join(', ')"
          >
            <template v-if="state.gridSize >= 5">{{ c.defenders.length }} def</template>
            <template v-else>
              {{ c.defenders.length }} {{ c.defenders.length === 1 ? 'defender' : 'defenders' }}
            </template>
          </span>
        </template>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

/* --board-width is set by the page layout and grows with the grid size. */
$grid-width: var(--board-width, 600px);
$side-banner-width: 48px;

.battlefield {
  display: grid;
  gap: $spacing;
  width: min(100%, $grid-width);

  &.from-north {
    grid-template-areas: 'banner' 'grid';
  }

  &.from-south {
    grid-template-areas: 'grid' 'banner';
  }

  &.from-west {
    grid-template-areas: 'banner grid';
    grid-template-columns: auto minmax(0, 1fr);
  }

  &.from-east {
    grid-template-areas: 'grid banner';
    grid-template-columns: minmax(0, 1fr) auto;
  }

  &.from-west,
  &.from-east {
    width: min(100%, calc(#{$grid-width} + #{$side-banner-width}));
  }

  &.from-west .banner,
  &.from-east .banner {
    writing-mode: vertical-rl;
  }
}

.banner {
  grid-area: banner;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing;
  padding: $spacing;
  border-radius: $radius;
  background: rgba(224, 86, 63, 0.15);
  color: $color-attack;
  font-weight: 700;
  font-size: 14px;

  .arrows {
    letter-spacing: 4px;
  }
}

.city-grid {
  grid-area: grid;
  display: grid;
  gap: $spacing;
}

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

.battlefield.dense {
  .city-grid {
    gap: 6px;
  }

  .cell {
    gap: 3px;
    padding: 6px;
    font-size: 13px;
  }

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
