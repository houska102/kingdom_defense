<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CityGrid from '@/components/board/CityGrid.vue'
import GameHeader from '@/components/layout/GameHeader.vue'
import BattleEventsPanel from '@/components/panels/BattleEventsPanel.vue'
import GameOver from '@/components/panels/GameOver.vue'
import TreasuryPanel from '@/components/panels/TreasuryPanel.vue'
import TurnLog from '@/components/panels/TurnLog.vue'
import UnlocksPanel from '@/components/panels/UnlocksPanel.vue'
import {
  attackOnTile,
  cancelPendingCard,
  caravanGold,
  chooseCardTarget,
  endTurn,
  mercenaryCost,
  state,
  tileAt,
} from '@/game/store'
import TileInfoModal from '@/components/modals/TileInfoModal.vue'
import BuildModal from './BuildModal.vue'
import DefendModal from './DefendModal.vue'
import DraftModal from './DraftModal.vue'
import GarrisonModal from './GarrisonModal.vue'
import MobileModal from './MobileModal.vue'

type InfoPanel = 'omens' | 'treasury' | 'log' | 'unlocks'

const setupStep = ref<'build' | 'garrison'>('build')
const buildCell = ref<number | null>(null)
const defendAttackId = ref<string | null>(null)
const infoPanel = ref<InfoPanel | null>(null)
const infoTileId = ref<string | null>(null)

watch(
  () => state.phase,
  (phase) => {
    if (phase === 'setup') setupStep.value = 'build'
    buildCell.value = null
    defendAttackId.value = null
    infoTileId.value = null
  },
)

const cityOver = computed(() => state.phase === 'cityFallen' || state.phase === 'campaignOver')
const keepPlaced = computed(() => state.tiles.some((t) => t.def.essential))
const tileTargeting = computed(
  () => state.phase === 'draft' && state.pendingCard?.target === 'tile',
)
const defendAttack = computed(() =>
  state.phase === 'assign' ? state.attacks.find((a) => a.id === defendAttackId.value) : undefined,
)
const defendedCount = computed(
  () => state.attacks.filter((a) => (state.assignments[a.id]?.length ?? 0) > 0).length,
)

const infoButtons = computed(() =>
  (
    [
      ['omens', 'Omens', state.battleEvents.length > 0],
      [
        'treasury',
        'Treasury',
        mercenaryCost() !== undefined ||
          state.gold > 0 ||
          state.escapedGold > 0 ||
          caravanGold() > 0,
      ],
      ['log', 'Log', state.reports.length > 0],
      ['unlocks', 'Unlocks', state.unlocks.length > 0],
    ] as const
  ).filter(([, , visible]) => visible),
)

const gridHighlight = computed(() => {
  if (state.phase === 'assign') return 'attacked'
  if (tileTargeting.value) return 'alive'
  return null
})

function onCellClick(cell: number) {
  const tile = tileAt(cell)
  if (state.phase === 'setup') {
    if (setupStep.value === 'build') buildCell.value = cell
    return
  }
  if (!tile) return
  const attack = attackOnTile(tile.id)
  if (state.phase === 'assign' && attack) defendAttackId.value = attack.id
  else if (tileTargeting.value) chooseCardTarget(tile.id)
  else infoTileId.value = tile.id
}
</script>

<template>
  <main class="mobile" :style="{ '--board-width': '100%' }">
    <GameHeader />

    <nav v-if="infoButtons.length" class="info-bar">
      <button
        v-for="[id, label] in infoButtons"
        :key="id"
        class="info-btn"
        @click="infoPanel = id"
      >
        {{ label }}
      </button>
    </nav>

    <CityGrid :highlight="gridHighlight" @cell-click="onCellClick" />

    <div class="action-bar">
      <template v-if="state.phase === 'setup'">
        <p class="hint">
          Tap a cell to build.
          <template v-if="!keepPlaced">Place the Keep to continue.</template>
        </p>
        <button class="btn" :disabled="!keepPlaced" @click="setupStep = 'garrison'">
          Pick garrison
        </button>
      </template>

      <template v-else-if="state.phase === 'assign' || state.phase === 'event'">
        <p class="hint">
          Tap an attacked tile to send defenders. {{ defendedCount }}/{{ state.attacks.length }}
          defended.
        </p>
        <button class="btn" :disabled="state.phase !== 'assign'" @click="endTurn">End turn</button>
      </template>

      <template v-else-if="tileTargeting">
        <p class="hint">{{ state.pendingCard?.name }}: tap a standing tile.</p>
        <button class="btn secondary" @click="cancelPendingCard">Cancel</button>
      </template>
    </div>

    <BuildModal v-if="buildCell !== null" :cell="buildCell" @close="buildCell = null" />

    <GarrisonModal
      v-if="state.phase === 'setup' && setupStep === 'garrison'"
      @back="setupStep = 'build'"
    />

    <DefendModal v-if="defendAttack" :attack="defendAttack" @close="defendAttackId = null" />

    <TileInfoModal v-if="infoTileId" :tile-id="infoTileId" @close="infoTileId = null" />

    <DraftModal v-if="state.phase === 'draft' && !tileTargeting" />

    <MobileModal v-if="cityOver" :closable="false">
      <GameOver />
    </MobileModal>

    <MobileModal v-if="infoPanel" @close="infoPanel = null">
      <BattleEventsPanel v-if="infoPanel === 'omens'" />
      <TreasuryPanel v-else-if="infoPanel === 'treasury'" />
      <TurnLog v-else-if="infoPanel === 'log'" />
      <UnlocksPanel v-else />
    </MobileModal>
  </main>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.mobile {
  display: flex;
  flex-direction: column;
  gap: $spacing * 1.5;
  min-height: 100dvh;
  padding: $spacing;
}

.info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing;
}

.info-btn {
  padding: 4px 12px;
  border: 1px solid $color-border;
  border-radius: 999px;
  background: $color-surface-raised;
  color: $color-text;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.action-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: $spacing;
  margin-top: auto;
  padding: $spacing;
  border-radius: $radius;
  background: $color-surface;

  &:empty {
    display: none;
  }

  .hint {
    flex: 1;
    margin: 0;
    font-size: 13px;
    color: $color-muted;
  }
}
</style>
