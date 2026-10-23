<script setup lang="ts">
import { pickCard, skipDraft, state } from '@/game/store'
</script>

<template>
  <section class="panel">
    <h2>Make a choice</h2>
    <p class="hint">
      <template v-if="state.pendingCard?.target === 'tile'">Click a standing tile on the grid.</template>
      <template v-else-if="state.pendingCard?.target === 'unit'">Click a unit in your garrison.</template>
      <template v-else>Pick one card. Next-city cards are kept for later.</template>
    </p>
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
    <button class="btn secondary skip" @click="skipDraft">Skip</button>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.card {
  &.selected {
    border-color: $color-accent;
  }

  &.future {
    border-style: dashed;
  }
}

.skip {
  margin-top: $spacing;
}
</style>
