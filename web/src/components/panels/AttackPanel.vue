<script setup lang="ts">
import { state } from '@/game/store'
import AttackRow from './AttackRow.vue'

const emit = defineEmits<{ select: [attackId: string] }>()
</script>

<template>
  <section class="panel">
    <h2>Attacks</h2>
    <p class="hint">
      {{
        state.attacks.length
          ? 'Click an attack (or its tile) to assign defenders.'
          : 'No attacks right now. New ones pause the game.'
      }}
    </p>
    <div class="list">
      <AttackRow
        v-for="attack in state.attacks"
        :key="attack.id"
        :attack="attack"
        :selectable="state.phase === 'battle'"
        @select="emit('select', attack.id)"
      />
    </div>
  </section>
</template>
