<script setup lang="ts">
import { CAMPAIGN_LENGTH } from '@/game/data'
import { currentCity, nextCity, restart, state, totalTurns } from '@/game/store'
</script>

<template>
  <section v-if="state.phase === 'cityFallen'" class="panel game-over">
    <h2>{{ currentCity().name }} has fallen</h2>
    <p>{{ state.fallReason }}</p>
    <p class="score">Turns survived: {{ state.turn - 1 }}</p>
    <template v-if="state.unlocks.length">
      <h3>Unlocked for later cities</h3>
      <ul>
        <li v-for="card in state.unlocks" :key="card.id">{{ card.name }}</li>
      </ul>
    </template>
    <p class="muted">{{ CAMPAIGN_LENGTH - state.cityIndex - 1 }} cities remain.</p>
    <button class="btn" @click="nextCity">Retreat to the next city</button>
  </section>

  <section v-else class="panel game-over">
    <h2>The kingdom has fallen</h2>
    <p>{{ state.fallReason }}</p>
    <table class="results">
      <tbody>
        <tr v-for="(result, i) in state.cityResults" :key="i">
          <td>{{ i + 1 }}. {{ result.name }}</td>
          <td class="num">{{ result.turns }}</td>
        </tr>
      </tbody>
    </table>
    <p class="score">Total turns survived: {{ totalTurns() }}</p>
    <p class="score">Permanent points earned: {{ totalTurns() }}</p>
    <p class="muted">Permanent points can't be spent yet.</p>
    <button class="btn" @click="restart">New campaign</button>
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

  .muted {
    color: $color-muted;
    font-size: 13px;
  }

  .results {
    width: 100%;
    font-size: 14px;

    .num {
      text-align: right;
    }
  }
}
</style>
