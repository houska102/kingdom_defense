<script setup lang="ts">
import { computed } from 'vue'
import { tileDefense } from '@/game/entities'
import {
  attackOnTile,
  cityReduction,
  isFrontline,
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
      defenders: attack ? unitsOnAttack(attack.id) : [],
      reduction: tile && state.phase !== 'setup' ? cityReduction(tile) : 0,
      front: !!tile && isFrontline(tile),
    }
  }),
)

function isActive(c: (typeof cells.value)[number]): boolean {
  switch (props.highlight) {
    case 'empty':
      return !c.tile
    case 'filled':
      return !!c.tile
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
  <div class="battlefield" :class="`from-${state.attackDirection}`">
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
          front: c.front,
        }"
        :title="c.front ? 'Front line: attacked first' : undefined"
        @click="emit('cellClick', c.cell)"
      >
        <template v-if="c.tile">
          <span class="name">{{ c.tile.def.name }}</span>
          <span class="defense">
            DEF {{ tileDefense(c.tile) }}
            <em v-if="c.tile.bonusDefense > 0">(+{{ c.tile.bonusDefense }})</em>
          </span>
          <StatBar :value="c.tile.health" :max="c.tile.def.health" kind="health" />
          <span v-if="c.attack" class="attack-badge" :class="{ merged: c.attack.merged > 0 }">
            ATK {{ c.attack.strength }}
            <template v-if="c.attack.merged > 0"> x{{ c.attack.merged + 1 }}</template>
          </span>
          <span v-if="c.attack && c.reduction > 0" class="reduction">-{{ c.reduction }} tower</span>
          <span
            v-if="c.defenders.length"
            class="defenders-badge"
            :title="c.defenders.map((u) => u.def.name).join(', ')"
          >
            {{ c.defenders.length }} {{ c.defenders.length === 1 ? 'defender' : 'defenders' }}
          </span>
        </template>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

$front-marker: 5px;

.battlefield {
  display: grid;
  gap: $spacing;
  width: min(100%, 560px);

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

  &.from-west .banner,
  &.from-east .banner {
    writing-mode: vertical-rl;
  }

  &.from-north .cell.front {
    box-shadow: inset 0 $front-marker 0 $color-attack;
  }

  &.from-south .cell.front {
    box-shadow: inset 0 (-$front-marker) 0 $color-attack;
  }

  &.from-west .cell.front {
    box-shadow: inset $front-marker 0 0 $color-attack;
  }

  &.from-east .cell.front {
    box-shadow: inset (-$front-marker) 0 0 $color-attack;
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

  .reduction {
    position: absolute;
    top: 30px;
    right: 6px;
    font-size: 10px;
    color: $color-accent;
  }
}
</style>
