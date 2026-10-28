<script setup lang="ts">
import { computed } from 'vue'
import { CAMPAIGN_LENGTH } from '@/game/data'
import { currentCity, restart, state } from '@/game/store'

const canRestart = computed(() => state.phase !== 'cityFallen' && state.phase !== 'campaignOver')

function confirmRestart() {
  if (window.confirm('Abandon this campaign and start over?')) restart()
}
</script>

<template>
  <header>
    <h1>Kingdom Defense</h1>
    <span class="turn">
      City {{ state.cityIndex + 1 }} / {{ CAMPAIGN_LENGTH }}: {{ currentCity().name }}
      <template v-if="state.phase !== 'setup'"> - Turn {{ state.turn }}</template>
    </span>
    <span class="gold">{{ state.gold }} gold</span>
    <button v-if="canRestart" class="restart" @click="confirmRestart">Restart</button>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

header {
  position: relative;
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

  .restart {
    padding: 2px $spacing;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: none;
    color: $color-muted;
    font: inherit;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      color: $color-text;
    }
  }

  @media (max-width: 900px) {
    flex-wrap: wrap;
    gap: $spacing;

    h1 {
      width: 100%;
      margin: 0;
      font-size: 20px;
    }

    .turn,
    .gold {
      font-size: 14px;
    }

    .restart {
      position: absolute;
      top: 2px;
      right: 0;
      font-size: 11px;
    }
  }
}
</style>
