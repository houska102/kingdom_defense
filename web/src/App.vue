<script setup lang="ts">
import { computed } from 'vue'
import CityGrid from '@/components/board/CityGrid.vue'
import SetupHint from '@/components/board/SetupHint.vue'
import GameHeader from '@/components/layout/GameHeader.vue'
import EventModal from '@/components/modals/EventModal.vue'
import MobileGame from '@/components/mobile/MobileGame.vue'
import AttackPanel from '@/components/panels/AttackPanel.vue'
import BattleEventsPanel from '@/components/panels/BattleEventsPanel.vue'
import CardDraft from '@/components/panels/CardDraft.vue'
import GameOver from '@/components/panels/GameOver.vue'
import TilePalette from '@/components/panels/TilePalette.vue'
import TreasuryPanel from '@/components/panels/TreasuryPanel.vue'
import TurnLog from '@/components/panels/TurnLog.vue'
import UnlocksPanel from '@/components/panels/UnlocksPanel.vue'
import UnitPicker from '@/components/units/UnitPicker.vue'
import UnitRoster from '@/components/units/UnitRoster.vue'
import { useMobile } from '@/composables/useMobile'
import {
  assignSelectedUnit,
  attackOnTile,
  canStartCity,
  chooseCardTarget,
  placeTile,
  endTurn,
  removeTile,
  selectUnit,
  startCity,
  state,
  tileAt,
} from '@/game/store'

const mobile = useMobile()

const cityOver = computed(() => state.phase === 'cityFallen' || state.phase === 'campaignOver')

const BOARD_WIDTHS: Record<number, number> = { 4: 600, 5: 690, 6: 760 }
const boardWidth = computed(() => `${BOARD_WIDTHS[state.gridSize] ?? 600}px`)

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
  <MobileGame v-if="mobile" />

  <main v-else class="app" :class="{ wide: !cityOver }">
    <GameHeader />

    <div
      class="layout"
      :class="{ 'with-units': !cityOver }"
      :style="{ '--board-width': boardWidth }"
    >
      <div class="board">
        <CityGrid :highlight="gridHighlight" @cell-click="onCellClick" />
        <SetupHint v-if="state.phase === 'setup'" />
      </div>

      <div v-if="!cityOver" class="units">
        <UnitPicker v-if="state.phase === 'setup'" />
        <UnitRoster
          v-else
          :targeting="state.phase === 'draft' && state.pendingCard?.target === 'unit'"
          @unit-click="onUnitClick"
        />
      </div>

      <aside class="side">
        <BattleEventsPanel v-if="!cityOver" />

        <template v-if="state.phase === 'setup'">
          <TilePalette />
          <button class="btn" :disabled="!canStartCity()" @click="startCity">Defend the city</button>
        </template>

        <template v-else-if="state.phase === 'assign' || state.phase === 'event'">
          <TreasuryPanel />
          <AttackPanel />
          <button class="btn" :disabled="state.phase !== 'assign'" @click="endTurn">End turn</button>
        </template>

        <CardDraft v-else-if="state.phase === 'draft'" />

        <GameOver v-else />

        <UnlocksPanel v-if="!cityOver" />

        <TurnLog />
      </aside>
    </div>
  </main>

  <EventModal />
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: $spacing * 4;

  &.wide {
    max-width: 1700px;
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

.layout.with-units {
  grid-template-columns: minmax(0, 1fr) minmax(0, calc(var(--board-width) + 48px)) 380px;
  align-items: start;

  .units {
    grid-row: 1;
    grid-column: 1;
  }

  .board {
    grid-row: 1;
    grid-column: 2;
  }

  .side {
    grid-row: 1;
    grid-column: 3;
  }

  @media (max-width: 1350px) {
    grid-template-columns: minmax(0, 1fr) 380px;

    .board {
      grid-row: 1;
      grid-column: 1;
    }

    .units {
      grid-row: 2;
      grid-column: 1;
    }

    .side {
      grid-row: 1 / span 2;
      grid-column: 2;
    }
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;

    .units,
    .board,
    .side {
      grid-column: auto;
      grid-row: auto;
    }
  }
}

.side {
  display: flex;
  flex-direction: column;
  gap: $spacing * 2;
}
</style>
