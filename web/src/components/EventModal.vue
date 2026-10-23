<script setup lang="ts">
import { computed } from 'vue'
import { describeEffect } from '@/game/events'
import { acknowledgeEvent, currentEvent, eventImpact, state } from '@/game/store'

const triggered = computed(() => currentEvent())
const impact = computed(() => (triggered.value ? eventImpact(triggered.value) : undefined))
</script>

<template>
  <div v-if="state.phase === 'event' && triggered" class="backdrop">
    <div class="modal" :class="triggered.event.good ? 'good' : 'bad'" role="dialog">
      <span class="tag">{{ triggered.event.good ? 'Fortune favors you' : 'Misfortune strikes' }}</span>
      <h2>{{ triggered.event.title }}</h2>
      <p class="text">{{ triggered.event.text }}</p>

      <div v-if="impact" class="impact">
        <div class="effect">{{ describeEffect(triggered.event) }} on {{ impact.tile.def.name }}</div>
        <div v-if="impact.attackBefore !== impact.attackAfter">
          Attack on {{ impact.tile.def.name }}: {{ impact.attackBefore }} -> {{ impact.attackAfter }}
        </div>
        <div>
          Damage to {{ impact.tile.def.name }}: {{ impact.before.tileDamage }} ->
          {{ impact.after.tileDamage }}
        </div>
        <div v-if="impact.before.absorbedByGarrison !== impact.after.absorbedByGarrison">
          Absorbed by garrison: {{ impact.before.absorbedByGarrison }} ->
          {{ impact.after.absorbedByGarrison }}
        </div>
      </div>

      <div class="footer">
        <span class="counter">Event {{ state.eventIndex + 1 }} of {{ state.pendingEvents.length }}</span>
        <button class="btn" @click="acknowledgeEvent">Continue</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing * 2;
  background: rgba(0, 0, 0, 0.6);
}

.modal {
  width: min(100%, 440px);
  padding: $spacing * 3;
  border: 2px solid $color-border;
  border-radius: $radius;
  background: $color-surface;

  &.good {
    border-color: $color-health;

    .tag {
      color: $color-health;
    }
  }

  &.bad {
    border-color: $color-attack;

    .tag {
      color: $color-attack;
    }
  }

  .tag {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  h2 {
    margin: 4px 0 $spacing * 1.5;
    color: $color-accent;
  }

  .text {
    margin: 0 0 $spacing * 2;
    font-style: italic;
    line-height: 1.5;
  }
}

.impact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: $spacing * 1.5;
  border-radius: $radius;
  background: $color-surface-raised;
  font-size: 14px;

  .effect {
    font-weight: 700;
  }
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $spacing * 2;

  .counter {
    font-size: 13px;
    color: $color-muted;
  }
}
</style>
