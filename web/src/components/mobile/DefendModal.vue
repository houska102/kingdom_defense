<script setup lang="ts">
import { computed } from 'vue'
import TileExtras from '@/components/board/TileExtras.vue'
import TileInfo from '@/components/board/TileInfo.vue'
import AttackRow from '@/components/panels/AttackRow.vue'
import UnitCard from '@/components/units/UnitCard.vue'
import { assignUnit, state, tileById, unassignUnit } from '@/game/store'
import type { Attack } from '@/game/types'
import MobileModal from './MobileModal.vue'

const props = defineProps<{ attack: Attack }>()
const emit = defineEmits<{ close: [] }>()

const tile = computed(() => tileById(props.attack.tileId))

function toggle(unitId: string) {
  if (state.assignments[props.attack.id]?.includes(unitId)) unassignUnit(unitId)
  else assignUnit(unitId, props.attack.id)
}
</script>

<template>
  <MobileModal :title="`Defend ${tile?.def.name ?? ''}`" @close="emit('close')">
    <TileInfo v-if="tile" :tile="tile">
      <TileExtras :tile="tile" />
    </TileInfo>
    <AttackRow :attack="attack" />

    <h3>Garrison</h3>
    <p v-if="state.units.length === 0" class="hint">Your whole garrison has fallen.</p>
    <p v-else class="hint">Tap a unit to send it here, tap again to recall it.</p>
    <div class="list">
      <UnitCard
        v-for="unit in state.units"
        :key="unit.id"
        :unit="unit"
        targeting
        @click="toggle(unit.id)"
      />
    </div>

    <template #footer>
      <button class="btn" @click="emit('close')">Done</button>
    </template>
  </MobileModal>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

h3 {
  margin: $spacing * 2 0 4px;
  font-size: 14px;
  color: $color-accent;
}

.hint {
  margin: 0 0 $spacing;
  font-size: 13px;
  color: $color-muted;
}
</style>
