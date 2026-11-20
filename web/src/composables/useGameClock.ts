import { onBeforeUnmount, onMounted, watch } from 'vue'
import { canTick, pause, state, tick, togglePause } from '@/game/store'
import { TICK_MS } from '@/game/ticks'

/** Runs the battle ticks while mounted. Space toggles pause, a hidden tab pauses the battle. */
export function useGameClock() {
  let timer: number | undefined

  const start = () => {
    window.clearInterval(timer)
    timer = window.setInterval(() => {
      if (canTick()) tick()
    }, TICK_MS / state.speed)
  }

  const onVisibility = () => {
    if (document.hidden) pause()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || state.phase !== 'battle' || e.repeat) return
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, button')) return
    e.preventDefault()
    togglePause()
  }

  watch(() => state.speed, start)

  onMounted(() => {
    start()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('keydown', onKey)
  })

  onBeforeUnmount(() => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('keydown', onKey)
  })
}
