<script setup lang="ts">
import { state } from '@/game/store'
</script>

<template>
  <section v-if="state.unlocks.length" class="panel">
    <h2>Unlocked for later cities</h2>
    <ul>
      <li v-for="card in state.unlocks" :key="card.id">{{ card.name }}</li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

ul {
  margin: 0;
  padding-left: $spacing * 2;
  font-size: 13px;
}
</style>
