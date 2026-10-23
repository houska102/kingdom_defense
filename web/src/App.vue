<script setup lang="ts">
import { computed } from 'vue'
import AttackPanel from '@/components/AttackPanel.vue'
import CardDraft from '@/components/CardDraft.vue'
import CityGrid from '@/components/CityGrid.vue'
import EventModal from '@/components/EventModal.vue'
import GameOver from '@/components/GameOver.vue'
import TilePalette from '@/components/TilePalette.vue'
import TurnLog from '@/components/TurnLog.vue'
import UnitPicker from '@/components/UnitPicker.vue'
import UnitRoster from '@/components/UnitRoster.vue'
import { ALL_TILE_DEFS, ALL_UNIT_DEFS, CAMPAIGN_LENGTH } from '@/game/data'
import {
  assignSelectedUnit,
  attackOnTile,
  canStartCity,
  chooseCardTarget,
  currentCity,
  garrisonPicks,
  placeTile,
  endTurn,
  removeTile,
  selectUnit,
  startCity,
  state,
  tileAt,
} from '@/game/store'

const kingdomUnlocks = computed(() => [
  ...Object.entries(state.tileUnlocks).map(([id, n]) => `${ALL_TILE_DEFS[id].name} +${n}`),
  ...state.unitUnlocks.map((id) => ALL_UNIT_DEFS[id].name),
])

const hasPrebuilt = computed(() => state.tiles.some((t) => t.prebuilt))
const cityOver = computed(() => state.phase === 'cityFallen' || state.phase === 'campaignOver')

const gridHighlight = computed(() => {
  switch (state.phase) {
    case 'setup':
      return state.selectedTileDefId ? 'empty' : 'filled'
    case 'assign':
      return state.selectedUnitId ? 'attacked' : null
    case 'draft':
      return state.pendingCard?.target === 'tile' ? 'alive' : null
    default:
      return null
  }
})

function onCellClick(cell: number) {
  const tile = tileAt(cell)
  if (state.phase === 'setup') {
    if (tile) removeTile(cell)
    else placeTile(cell)
  } else if (state.phase === 'assign' && tile) {
    const attack = attackOnTile(tile.id)
    if (attack) assignSelectedUnit(attack.id)
  } else if (state.phase === 'draft' && tile && state.pendingCard?.target === 'tile') {
    chooseCardTarget(tile.id)
  }
}

function onUnitClick(unitId: string) {
  if (state.phase === 'assign') selectUnit(unitId)
  else if (state.phase === 'draft' && state.pendingCard?.target === 'unit') chooseCardTarget(unitId)
}
</script>

<template>
  <main class="app">
    <header>
      <h1>Kingdom Defense</h1>
      <span class="turn">
        City {{ state.cityIndex + 1 }} / {{ CAMPAIGN_LENGTH }}: {{ currentCity().name }}
        <template v-if="state.phase !== 'setup'"> - Turn {{ state.turn }}</template>
      </span>
    </header>

    <div class="layout">
      <div class="board">
        <CityGrid :highlight="gridHighlight" @cell-click="onCellClick" />
        <p v-if="state.phase === 'setup'" class="hint">
          Place the Keep and pick {{ garrisonPicks() }} garrison units to begin. Losing the Keep loses the city.
          The enemy attacks from the {{ state.attackDirection }}: tiles marked red on that side are the
          front line and get hit first, and the attacks push deeper as they fall.
          <template v-if="hasPrebuilt">
            Some buildings are already standing from earlier fighting and cannot be moved.
          </template>
          <template v-if="currentCity().attackBonus > 0">
            Enemies here are stronger: +{{ currentCity().attackBonus }} attack.
          </template>
        </p>
        <p v-if="state.phase === 'setup' && kingdomUnlocks.length" class="hint">
          Kingdom unlocks: {{ kingdomUnlocks.join(', ') }}
        </p>
      </div>

      <aside class="side">
        <template v-if="state.phase === 'setup'">
          <TilePalette />
          <UnitPicker />
          <button class="btn" :disabled="!canStartCity()" @click="startCity">Defend the city</button>
        </template>

        <template v-else-if="state.phase === 'assign' || state.phase === 'event'">
          <AttackPanel />
          <UnitRoster :targeting="false" @unit-click="onUnitClick" />
          <button class="btn" :disabled="state.phase !== 'assign'" @click="endTurn">End turn</button>
        </template>

        <template v-else-if="state.phase === 'draft'">
          <CardDraft />
          <UnitRoster
            :targeting="state.pendingCard?.target === 'unit'"
            @unit-click="onUnitClick"
          />
        </template>

        <GameOver v-else />

        <section v-if="state.unlocks.length && !cityOver" class="panel">
          <h2>Unlocked for later cities</h2>
          <ul class="unlocks">
            <li v-for="card in state.unlocks" :key="card.id">{{ card.name }}</li>
          </ul>
        </section>

        <TurnLog />
      </aside>
    </div>

    <EventModal />
  </main>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: $spacing * 4;
}

header {
  display: flex;
  align-items: baseline;
  gap: $spacing * 2;

  h1 {
    color: $color-accent;
  }

  .turn {
    font-size: 18px;
    color: $color-muted;
  }
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: $spacing * 3;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.board .hint {
  color: $color-muted;
  font-size: 14px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: $spacing * 2;
}

.unlocks {
  margin: 0;
  padding-left: $spacing * 2;
  font-size: 13px;
}
</style>
