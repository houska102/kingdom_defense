<script setup lang="ts">
import { computed } from 'vue'
import MobileModal from '@/components/mobile/MobileModal.vue'
import UnitCard from '@/components/units/UnitCard.vue'
import { chooseCardTarget, pickCard, skipDraft, state } from '@/game/store'

/** Hidden while a tile card waits for its tile, so the grid can be clicked. */
const open = computed(() => state.phase === 'draft' && state.pendingCard?.target !== 'tile')
const unitCard = computed(() =>
  state.pendingCard?.target === 'unit' ? state.pendingCard : undefined,
)
</script>

<template>
  <MobileModal v-if="open" :title="`Day ${state.day} survived`" :closable="false" centered>
    <p class="hint">Make a choice: pick one card. Next-city cards are kept for later.</p>
    <div class="list">
      <button
        v-for="card in state.draft"
        :key="card.id"
        class="item card"
        :class="{ selected: state.pendingCard?.id === card.id, future: card.nextCity }"
        @click="pickCard(card)"
      >
        <span class="title">
          {{ card.name }}
          <span v-if="card.nextCity" class="count">next city</span>
        </span>
        <span class="desc">{{ card.description }}</span>
      </button>
    </div>

    <template v-if="unitCard">
      <h3>{{ unitCard.name }}: pick a unit</h3>
      <p v-if="state.units.length === 0" class="hint">Your whole garrison has fallen.</p>
      <div class="list">
        <UnitCard
          v-for="unit in state.units"
          :key="unit.id"
          :unit="unit"
          targeting
          @click="chooseCardTarget(unit.id)"
        />
      </div>
    </template>

    <template #footer>
      <button class="btn secondary" @click="skipDraft">Skip</button>
    </template>
  </MobileModal>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.hint {
  margin: 0 0 $spacing;
  font-size: 13px;
  color: $color-muted;
}

h3 {
  margin: $spacing * 2 0 $spacing;
  font-size: 14px;
  color: $color-accent;
}

.card {
  &.selected {
    border-color: $color-accent;
  }

  &.future {
    border-style: dashed;
  }
}
</style>
