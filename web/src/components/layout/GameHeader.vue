<script setup lang="ts">
import { CAMPAIGN_LENGTH } from '@/game/data'
import { currentCity, state } from '@/game/store'
</script>

<template>
  <header>
    <h1>Kingdom Defense</h1>
    <span class="turn">
      City {{ state.cityIndex + 1 }} / {{ CAMPAIGN_LENGTH }}: {{ currentCity().name }}
      <template v-if="state.phase !== 'setup'"> - Turn {{ state.turn }}</template>
    </span>
    <span class="gold">{{ state.gold }} gold</span>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

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

  .gold {
    margin-left: auto;
    font-size: 18px;
    color: $color-accent;
  }
}
</style>
