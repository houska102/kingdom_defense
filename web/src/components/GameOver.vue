<script setup lang="ts">
import { restart, state } from '@/game/store'
</script>

<template>
  <section class="panel game-over">
    <h2>The city has fallen</h2>
    <p>{{ state.fallReason }}</p>
    <p class="score">Turns survived: {{ state.turn - 1 }}</p>
    <template v-if="state.unlocks.length">
      <h3>Unlocked for the next city</h3>
      <ul>
        <li v-for="card in state.unlocks" :key="card.id">{{ card.name }}</li>
      </ul>
    </template>
    <button class="btn" @click="restart">Defend a new city</button>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.game-over {
  .score {
    font-size: 20px;
    font-weight: 700;
  }

  h3 {
    font-size: 14px;
    color: $color-muted;
  }
}
</style>
