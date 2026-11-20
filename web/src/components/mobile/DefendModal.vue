<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import TileExtras from '@/components/board/TileExtras.vue'
import TileInfo from '@/components/board/TileInfo.vue'
import AttackRow from '@/components/panels/AttackRow.vue'
import StatBar from '@/components/shared/StatBar.vue'
import UnitCard from '@/components/units/UnitCard.vue'
import { useMobile } from '@/composables/useMobile'
import {
  assignUnit,
  attackOfUnit,
  holdTicks,
  incomingAttacks,
  isUnitLocked,
  remainingPreview,
  resume,
  state,
  tileById,
  unassignUnit,
  unitsOnAttack,
} from '@/game/store'
import type { Attack } from '@/game/types'
import MobileModal from './MobileModal.vue'

const props = defineProps<{ attack: Attack }>()
const emit = defineEmits<{ close: [] }>()

const mobile = useMobile()
onBeforeUnmount(holdTicks())

const tile = computed(() => tileById(props.attack.tileId))
const tileDamage = computed(() => remainingPreview(props.attack)?.tileDamage ?? 0)
const fighting = computed(() => props.attack.status === 'fighting')
const assigned = computed(() => unitsOnAttack(props.attack.id))
/** Resting units first, then units on other attacks, units locked in other fights last. */
const available = computed(() => {
  const ids = new Set(assigned.value.map((u) => u.id))
  const others = state.units.filter((u) => !ids.has(u.id))
  return [
    ...others.filter((u) => !attackOfUnit(u.id)),
    ...others.filter((u) => attackOfUnit(u.id) && !isUnitLocked(u.id)),
    ...others.filter((u) => isUnitLocked(u.id)),
  ]
})
const awaitingOrders = computed(() => state.paused && incomingAttacks().length > 0)

/** Units locked in another fight can't be sent, locked units here can't be recalled. */
const lockedElsewhere = (unitId: string) =>
  isUnitLocked(unitId) && !state.assignments[props.attack.id]?.includes(unitId)

function toggle(unitId: string) {
  if (state.assignments[props.attack.id]?.includes(unitId)) unassignUnit(unitId)
  else assignUnit(unitId, props.attack.id)
}

function startFight() {
  resume()
  emit('close')
}
</script>

<template>
  <MobileModal
    :title="`Defend ${tile?.def.name ?? ''}`"
    :wide="!mobile"
    @close="emit('close')"
  >
    <template v-if="tile">
      <StatBar
        class="tile-health"
        :value="tile.health"
        :max="tile.def.health"
        kind="health"
        :threat="tileDamage"
      />
      <TileInfo :tile="tile">
        <TileExtras :tile="tile" />
      </TileInfo>
    </template>
    <AttackRow :attack="attack" />

    <p v-if="state.units.length === 0" class="hint">Your whole garrison has fallen.</p>

    <!-- Mobile: one list, tap toggles. -->
    <template v-else-if="mobile">
      <h3>Garrison</h3>
      <p class="hint">
        Tap a unit to send it here, tap again to recall it.
        <template v-if="fighting">
          Units already fighting stay until their fight ends. Units sent now are rushed in at half
          strength.
        </template>
      </p>
      <div class="list">
        <UnitCard
          v-for="unit in state.units"
          :key="unit.id"
          :unit="unit"
          targeting
          :disabled="lockedElsewhere(unit.id)"
          @click="toggle(unit.id)"
        />
      </div>
    </template>

    <!-- Desktop: available garrison on the left, defenders of this attack on the right. -->
    <div v-else class="columns">
      <section>
        <h3>Available garrison</h3>
        <p class="hint">
          Click a unit to send it here. Units on incoming attacks are moved, units in a running
          fight can't leave it.
          <template v-if="fighting">This fight is on, units sent now fight at half strength.</template>
        </p>
        <div class="list">
          <UnitCard
            v-for="unit in available"
            :key="unit.id"
            :unit="unit"
            targeting
            :disabled="lockedElsewhere(unit.id)"
            @click="toggle(unit.id)"
          />
          <p v-if="available.length === 0" class="hint">Everyone is defending here.</p>
        </div>
      </section>
      <section>
        <h3>Defending this attack</h3>
        <p class="hint">
          {{
            fighting
              ? 'The fight is on, defenders stay until it ends. Reinforcements are rushed in at half strength.'
              : 'Click a unit to recall it.'
          }}
        </p>
        <div class="list">
          <UnitCard
            v-for="unit in assigned"
            :key="unit.id"
            :unit="unit"
            targeting
            @click="toggle(unit.id)"
          />
          <p v-if="assigned.length === 0" class="hint">No defenders yet.</p>
        </div>
      </section>
    </div>

    <template #footer>
      <button v-if="awaitingOrders" class="btn" @click="startFight">Resume</button>
      <button class="btn" :class="{ secondary: awaitingOrders }" @click="emit('close')">
        Done
      </button>
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

.tile-health {
  margin-bottom: $spacing;
}

.columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $spacing * 3;
  align-items: start;
}
</style>
