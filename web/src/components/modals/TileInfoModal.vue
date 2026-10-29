<script setup lang="ts">
import { computed, watch } from 'vue'
import TileExtras from '@/components/board/TileExtras.vue'
import TileInfo from '@/components/board/TileInfo.vue'
import MobileModal from '@/components/mobile/MobileModal.vue'
import { tileById } from '@/game/store'

const props = defineProps<{ tileId: string }>()
const emit = defineEmits<{ close: [] }>()

const tile = computed(() => tileById(props.tileId))

watch(tile, (current) => {
  if (!current) emit('close')
})
</script>

<template>
  <MobileModal v-if="tile" :title="tile.def.name" @close="emit('close')">
    <TileInfo :tile="tile">
      <TileExtras :tile="tile" />
    </TileInfo>
  </MobileModal>
</template>
