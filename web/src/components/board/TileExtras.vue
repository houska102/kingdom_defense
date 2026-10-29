<script setup lang="ts">
import CaravanInfo from '@/components/caravan/CaravanInfo.vue'
import { isCaravan } from '@/game/caravan'
import { isEscape } from '@/game/entities'
import type { Tile } from '@/game/types'
import EscapeAction from './EscapeAction.vue'

defineProps<{ tile: Tile }>()
</script>

<template>
  <CaravanInfo v-if="isCaravan(tile)" :tile="tile" />
  <EscapeAction v-if="isEscape(tile)" :tile="tile" />
</template>
