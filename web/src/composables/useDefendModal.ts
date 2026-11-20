import { computed, ref, watch } from 'vue'
import { incomingAttacks, state } from '@/game/store'

/** Attack shown in the Defend modal. Opens on its own for every newly spawned attack. */
export function useDefendModal() {
  const attackId = ref<string | null>(null)

  const attack = computed(() =>
    state.phase === 'battle' ? state.attacks.find((a) => a.id === attackId.value) : undefined,
  )

  watch(
    () => incomingAttacks().map((a) => a.id),
    (ids, old) => {
      const fresh = ids.find((id) => !old?.includes(id))
      if (fresh) attackId.value = fresh
    },
  )

  return { attackId, attack }
}
