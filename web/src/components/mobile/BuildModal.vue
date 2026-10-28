<script setup lang="ts">
import { computed } from 'vue'
import { ALL_TILE_DEFS } from '@/game/data'
import { tileDefense } from '@/game/entities'
import { placeTile, removeTile, state, tileAt } from '@/game/store'
import MobileModal from './MobileModal.vue'

const props = defineProps<{ cell: number }>()
const emit = defineEmits<{ close: [] }>()

const tile = computed(() => tileAt(props.cell))
const available = computed(() =>
  Object.entries(state.palette)
    .filter(([defId, count]) => count > 0 && defId !== tile.value?.def.id)
    .map(([defId, count]) => ({ def: ALL_TILE_DEFS[defId], count })),
)

function build(defId: string) {
  if (tile.value) removeTile(props.cell)
  placeTile(props.cell, defId)
  emit('close')
}

function remove() {
  removeTile(props.cell)
  emit('close')
}
</script>

<template>
  <MobileModal :title="tile ? tile.def.name : 'Build'" @close="emit('close')">
    <div v-if="tile" class="current">
      <span class="stats">DEF {{ tileDefense(tile) }} / HP {{ tile.health }}/{{ tile.def.health }}</span>
      <span class="desc">{{ tile.def.description }}</span>
      <p v-if="tile.prebuilt" class="hint">Prebuilt: cannot be moved or replaced.</p>
      <button v-else class="btn secondary" @click="remove">Remove</button>
    </div>

    <template v-if="!tile?.prebuilt">
      <h3 v-if="tile">Replace with</h3>
      <p v-if="available.length === 0" class="hint">No buildings left to place.</p>
      <div class="list">
        <button v-for="{ def, count } in available" :key="def.id" class="item" @click="build(def.id)">
          <span class="title">
            {{ def.name }} <span class="count">x{{ count }}</span>
          </span>
          <span class="stats">DEF {{ def.defense }} / HP {{ def.health }}</span>
          <span class="desc">{{ def.description }}</span>
        </button>
      </div>
    </template>
  </MobileModal>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.current {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: $spacing * 1.5;

  .stats {
    font-size: 13px;
    color: $color-muted;
  }

  .desc {
    font-size: 13px;
  }

  .btn {
    align-self: flex-start;
    margin-top: 4px;
  }
}

h3 {
  margin: 0 0 $spacing;
  font-size: 14px;
  color: $color-muted;
}

.hint {
  margin: 0 0 $spacing;
  font-size: 13px;
  color: $color-muted;
}
</style>
