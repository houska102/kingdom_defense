import { onBeforeUnmount, ref } from 'vue'

export const MOBILE_QUERY = '(max-width: 900px)'

/** True while the viewport is narrow enough for the grid-only mobile view. */
export function useMobile() {
  const query = window.matchMedia(MOBILE_QUERY)
  const mobile = ref(query.matches)
  const update = (e: MediaQueryListEvent) => (mobile.value = e.matches)
  query.addEventListener('change', update)
  onBeforeUnmount(() => query.removeEventListener('change', update))
  return mobile
}
