<script setup lang="ts">
import { computed } from 'vue'
import { attackOnTile, canEscape, escapeDamage, escapeTile } from '@/game/store'
import type { Tile } from '@/game/types'

const props = defineProps<{ tile: Tile }>()

const attacked = computed(() => !!attackOnTile(props.tile.id))
const damage = computed(() => escapeDamage(props.tile))
const blocked = computed(() => canEscape(props.tile) && attacked.value && damage.value > 0)
const warning = computed(() => canEscape(props.tile) && attacked.value && !!props.tile.escaping)

const hint = computed(() => {
  if (!canEscape(props.tile)) return 'Can only be sent away before ending the turn.'
  if (!attacked.value) return 'Leaves the city now.'
  if (damage.value > 0) {
    return `Under attack: ${damage.value} damage gets through, the escape would fail. Send defenders to block all of it.`
  }
  return 'Under attack: all damage is blocked, it gets away unless an event changes the attack.'
})
</script>

<template>
  <div class="escape-action">
    <button
      class="btn"
      :class="{ secondary: tile.escaping }"
      :disabled="!canEscape(tile)"
      @click="escapeTile(tile.id)"
    >
      {{ tile.escaping ? 'Cancel escape' : 'Escape' }}
    </button>

    <div v-if="warning" class="warning" role="alert">
      <strong>Under attack!</strong>
      <span>The {{ tile.def.name }} only gets away if it takes no damage this turn.</span>
      <span v-if="damage > 0">
        {{ damage }} damage gets through right now, the escape will fail and it takes the hit.
        Send defenders to block all of it.
      </span>
      <span v-else>All damage is blocked for now, but an event can still break the escape.</span>
    </div>
    <span v-else class="hint" :class="{ blocked }">{{ hint }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.escape-action {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: $spacing;

  .btn {
    align-self: flex-start;
  }

  .hint {
    font-size: 13px;
    color: $color-muted;

    &.blocked {
      color: $color-attack;
    }
  }

  .warning {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 4px;
    padding: $spacing $spacing * 1.5;
    border: 2px solid $color-attack;
    border-radius: $radius;
    background: rgba($color-attack, 0.15);
    color: $color-attack;
    font-size: 14px;

    strong {
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
}
</style>
