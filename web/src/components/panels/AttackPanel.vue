<script setup lang="ts">
import { state } from '@/game/store'
import AttackRow from './AttackRow.vue'
</script>

<template>
  <section class="panel">
    <h2>Attacks</h2>
    <p class="hint">
      {{
        state.selectedUnitId
          ? 'Click an attack (or its tile) to send the selected unit there.'
          : 'Select a unit from your garrison first.'
      }}
    </p>
    <div class="list">
      <AttackRow v-for="attack in state.attacks" :key="attack.id" :attack="attack" />
    </div>
  </section>
</template>
