<script setup lang="ts">
import { state } from '@/game/store'
import UnitCard from './UnitCard.vue'

defineProps<{ targeting: boolean }>()
const emit = defineEmits<{ unitClick: [unitId: string] }>()
</script>

<template>
  <section class="panel">
    <h2>Garrison</h2>
    <p v-if="state.units.length === 0" class="hint">Your whole garrison has fallen.</p>
    <div class="list">
      <UnitCard
        v-for="unit in state.units"
        :key="unit.id"
        :unit="unit"
        :targeting="targeting"
        @click="emit('unitClick', unit.id)"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
</style>
