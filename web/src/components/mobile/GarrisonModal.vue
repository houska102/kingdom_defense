<script setup lang="ts">
import SetupHint from '@/components/board/SetupHint.vue'
import UnitPicker from '@/components/units/UnitPicker.vue'
import { canStartCity, startCity } from '@/game/store'
import MobileModal from './MobileModal.vue'

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <MobileModal :closable="false">
    <UnitPicker class="picker" />
    <SetupHint />

    <template #footer>
      <button class="btn secondary" @click="emit('back')">Back to building</button>
      <button class="btn" :disabled="!canStartCity()" @click="startCity">Defend the city</button>
    </template>
  </MobileModal>
</template>

<style lang="scss" scoped>
.picker {
  padding: 0;

  :deep(.list) {
    grid-template-columns: 1fr;
  }
}
</style>
