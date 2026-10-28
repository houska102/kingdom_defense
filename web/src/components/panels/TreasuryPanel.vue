<script setup lang="ts">
import { computed } from 'vue'
import { canHireMercenary, goldIncome, hireMercenary, mercenaryCost, state } from '@/game/store'

const cost = computed(() => mercenaryCost())

const hireHint = computed(() => {
  if (cost.value === undefined) return 'Build a Mercenary Camp to hire mercenaries.'
  if (state.gold < cost.value) return `Need ${cost.value - state.gold} more gold.`
  if (state.phase !== 'assign') return 'Mercenaries can only be hired before ending the turn.'
  return 'Hires a random unit, even ones you have not unlocked.'
})
</script>

<template>
  <section v-if="cost !== undefined || state.gold > 0" class="panel">
    <h2>Treasury</h2>
    <p class="gold">
      {{ state.gold }} gold
      <span v-if="goldIncome() > 0" class="income">+{{ goldIncome() }} per turn</span>
    </p>
    <button class="btn" :disabled="!canHireMercenary()" @click="hireMercenary">
      Hire mercenary<template v-if="cost !== undefined"> ({{ cost }} gold)</template>
    </button>
    <p class="hint">{{ hireHint }}</p>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.gold {
  margin: 0 0 $spacing;
  font-size: 18px;
  color: $color-accent;
}

.income {
  margin-left: 4px;
  font-size: 13px;
  color: $color-muted;
}
</style>
