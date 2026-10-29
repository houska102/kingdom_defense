<script setup lang="ts">
import { caravanGold, state } from '@/game/store'
</script>

<template>
  <p v-if="caravanGold() > 0" class="line">Caravan carries {{ caravanGold() }} gold</p>
  <p v-if="state.escapedGold > 0" class="line">{{ state.escapedGold }} gold secured for the next city</p>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.line {
  margin: 0 0 $spacing;
  font-size: 13px;
  color: $color-muted;
}
</style>
