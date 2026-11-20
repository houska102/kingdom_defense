<script setup lang="ts">
import { computed } from 'vue'
import { incomingAttacks, setSpeed, state, tileById, togglePause } from '@/game/store'
import { DAY_TICKS, SPEEDS } from '@/game/ticks'

const incomingNames = computed(() =>
  incomingAttacks()
    .map((a) => tileById(a.tileId)?.def.name ?? '?')
    .join(', '),
)
const running = computed(() => state.phase === 'battle' && !state.paused)

const hint = computed(() => {
  if (incomingNames.value) {
    return `New attack on ${incomingNames.value}! Send defenders, then Resume.`
  }
  if (state.phase === 'draft') return 'The day is over, pick a card.'
  if (state.paused) return 'Paused.'
  return `${state.attacks.length} fight${state.attacks.length === 1 ? '' : 's'} in progress.`
})
</script>

<template>
  <div class="time-controls">
    <div class="day">
      <span class="label">Day {{ state.day }}</span>
      <div class="progress" :title="`Tick ${state.tick} of ${DAY_TICKS}`">
        <div class="fill" :style="{ width: `${(state.tick / DAY_TICKS) * 100}%` }" />
      </div>
    </div>
    <p class="hint" :class="{ alert: !!incomingNames }">{{ hint }}</p>
    <div class="buttons">
      <button class="btn" :disabled="state.phase !== 'battle'" @click="togglePause">
        {{ running ? 'Pause' : 'Resume' }}
      </button>
      <div class="speeds">
        <button
          v-for="speed in SPEEDS"
          :key="speed"
          class="speed"
          :class="{ active: state.speed === speed }"
          @click="setSpeed(speed)"
        >
          {{ speed }}x
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.time-controls {
  display: flex;
  flex-direction: column;
  gap: $spacing;
  width: 100%;
}

.day {
  display: flex;
  align-items: center;
  gap: $spacing;

  .label {
    font-weight: 700;
    color: $color-accent;
    white-space: nowrap;
  }
}

.progress {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;

  .fill {
    height: 100%;
    background: $color-accent;
    transition: width 0.25s linear;
  }
}

.hint {
  margin: 0;
  font-size: 13px;
  color: $color-muted;

  &.alert {
    color: $color-attack;
    font-weight: 600;
  }
}

.buttons {
  display: flex;
  align-items: center;
  gap: $spacing;

  .btn {
    flex: 1;
  }
}

.speeds {
  display: flex;
  gap: 4px;
}

.speed {
  padding: 4px 10px;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-surface-raised;
  color: $color-muted;
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &.active {
    border-color: $color-accent;
    color: $color-accent;
  }
}
</style>
