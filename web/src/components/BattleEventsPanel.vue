<script setup lang="ts">
import { describeBattleEffect } from '@/game/battleEvents'
import { state } from '@/game/store'
</script>

<template>
  <section v-if="state.battleEvents.length" class="panel">
    <h2>Battle omens</h2>
    <ul class="events">
      <li v-for="event in state.battleEvents" :key="event.id" :class="event.good ? 'good' : 'bad'">
        <div class="title">{{ event.title }}</div>
        <div class="effect">{{ describeBattleEffect(event.effect) }}</div>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.events {
  display: flex;
  flex-direction: column;
  gap: $spacing;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  padding: $spacing;
  border-left: 3px solid $color-border;
  border-radius: $radius;
  background: $color-surface-raised;

  &.good {
    border-color: $color-health;

    .effect {
      color: $color-health;
    }
  }

  &.bad {
    border-color: $color-attack;

    .effect {
      color: $color-attack;
    }
  }
}

.title {
  font-weight: 700;
  color: $color-accent;
}

.effect {
  font-size: 13px;
}
</style>
