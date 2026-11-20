<script setup lang="ts">
import { computed } from 'vue'
import { describeEffect } from '@/game/events'
import {
  isRushed,
  isUnitLocked,
  previewAttack,
  remainingPreview,
  tileById,
  unassignUnit,
  unitsOnAttack,
} from '@/game/store'
import type { Attack } from '@/game/types'

const props = defineProps<{ attack: Attack; selectable?: boolean }>()
const emit = defineEmits<{ select: [] }>()

const tile = computed(() => tileById(props.attack.tileId))
const preview = computed(() => previewAttack(props.attack))
const remaining = computed(() => remainingPreview(props.attack))
const units = computed(() => unitsOnAttack(props.attack.id))
const fighting = computed(() => props.attack.status === 'fighting')
const ticksLeft = computed(() => props.attack.duration - props.attack.elapsed)
const destroys = computed(
  () => !!tile.value && !!remaining.value && remaining.value.tileDamage >= tile.value.health,
)
const escapeBlocked = computed(
  () => props.attack.tileDamageDealt + (remaining.value?.tileDamage ?? 0) > 0,
)

function unitDamage(unitId: string) {
  return remaining.value?.unitDamage.find((d) => d.unitId === unitId)
}
</script>

<template>
  <div
    class="item attack"
    :class="{ ready: selectable, danger: destroys, incoming: !fighting }"
    @click="selectable && emit('select')"
  >
    <span class="title">
      {{ tile?.def.name }}
      <span class="strength">ATK {{ attack.strength }}</span>
      <span v-if="attack.merged > 0" class="merged">{{ attack.merged + 1 }} attacks merged</span>
      <span v-if="attack.deep" class="deep">half strength (behind front line)</span>
    </span>
    <span v-if="fighting" class="status">
      <span class="progress">
        <span :style="{ width: `${(attack.elapsed / attack.duration) * 100}%` }" />
      </span>
      Fighting, {{ ticksLeft }} {{ ticksLeft === 1 ? 'tick' : 'ticks' }} left
    </span>
    <span v-else class="status incoming">Incoming: send defenders, the fight starts on Resume.</span>
    <span v-if="attack.event" class="event" :class="attack.event.good ? 'good' : 'bad'">
      [{{ attack.event.title }}] {{ describeEffect(attack.event) }}
    </span>
    <span v-if="preview && remaining" class="stats">
      <template v-if="preview.reduction > 0">-{{ preview.reduction }} passives, </template>
      defense blocks {{ preview.blockedByTile }}, garrison absorbs
      {{ preview.absorbedByGarrison }}, tile takes {{ preview.tileDamage }}
      <template v-if="fighting">({{ remaining.tileDamage }} still to come)</template>
      <strong v-if="destroys"> - tile will be destroyed!</strong>
    </span>
    <span v-if="remaining && tile?.escaping" class="escape" :class="{ blocked: escapeBlocked }">
      <template v-if="attack.tileDamageDealt > 0">Escape fails: it already took damage.</template>
      <template v-else-if="remaining.tileDamage > 0">
        Escape fails: block {{ remaining.tileDamage }} more damage to get away.
      </template>
      <template v-else>Escaping: gets away when the fight ends.</template>
    </span>
    <div class="assigned">
      <button
        v-for="unit in units"
        :key="unit.id"
        class="chip"
        :class="{ locked: isUnitLocked(unit.id) }"
        :title="
          isRushed(unit.id)
            ? 'Rushed in, half strength'
            : isUnitLocked(unit.id)
              ? 'Fighting until the fight ends'
              : 'Click to recall'
        "
        @click.stop="unassignUnit(unit.id)"
      >
        {{ unit.def.name }}
        <span v-if="isRushed(unit.id)" class="rushed">½</span>
        <template v-if="remaining">
          (-{{ unitDamage(unit.id)?.enduranceLoss ?? 0 }} end, -{{ unitDamage(unit.id)?.healthLoss ?? 0 }} hp)
        </template>
        <template v-if="!isUnitLocked(unit.id)">x</template>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.attack {
  cursor: default;
  border-color: $color-attack;

  &.incoming {
    border-style: dashed;
  }

  &.ready {
    cursor: pointer;

    &:hover {
      border-color: $color-accent;
    }
  }

  &.danger .stats strong {
    color: $color-attack;
  }

  .strength {
    margin-left: 4px;
    color: $color-attack;
  }

  .status {
    display: flex;
    align-items: center;
    gap: $spacing;
    font-size: 12px;
    color: $color-muted;

    &.incoming {
      color: $color-attack;
      font-weight: 600;
    }
  }

  .progress {
    flex: 0 0 80px;
    height: 6px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.35);
    overflow: hidden;

    span {
      display: block;
      height: 100%;
      background: $color-attack;
      transition: width 0.25s linear;
    }
  }

  .event {
    font-size: 12px;
    font-weight: 600;

    &.good {
      color: $color-health;
    }

    &.bad {
      color: $color-attack;
    }
  }

  .escape {
    font-size: 13px;
    color: $color-accent;

    &.blocked {
      color: $color-attack;
    }
  }

  .deep {
    margin-left: 4px;
    font-size: 12px;
    color: $color-muted;
  }

  .merged {
    margin-left: 4px;
    font-size: 12px;
    color: $color-danger;
  }
}

.assigned {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.chip {
  padding: 2px 8px;
  border: 1px solid $color-border;
  border-radius: 999px;
  background: $color-surface;
  color: $color-text;
  font: inherit;
  font-size: 12px;
  cursor: pointer;

  &.locked {
    border-color: $color-attack;
    cursor: default;
  }

  .rushed {
    color: $color-danger;
    font-weight: 700;
  }
}
</style>
