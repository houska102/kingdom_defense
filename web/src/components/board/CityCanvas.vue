<script setup lang="ts">
import { bootstrapCanvas, destroyElement, type BootstrapOptions } from 'canvasengine'
import { onBeforeUnmount, onMounted, useTemplateRef, watchEffect } from 'vue'
import CityScene from '@/canvas/CityScene.ce'
import { sceneSize, syncScene } from '@/canvas/cityScene'
import { state } from '@/game/store'

type Bootstrapped = Awaited<ReturnType<typeof bootstrapCanvas>>

const host = useTemplateRef<HTMLDivElement>('host')
let canvas: Bootstrapped | undefined
let unmounted = false

watchEffect(() => syncScene(state.tiles, state.gridSize))

const observer = new ResizeObserver(([entry]) => {
  sceneSize.set(entry.contentRect.width)
  canvas?.app.resize()
})

function destroy(target: Bootstrapped) {
  target.hmrSubscription?.unsubscribe()
  destroyElement(target.canvasElement)
  target.app.destroy(true)
}

onMounted(async () => {
  const el = host.value!
  sceneSize.set(el.clientWidth)
  observer.observe(el)
  // BootstrapOptions types every Pixi option as required.
  const result = await bootstrapCanvas(el, CityScene, {
    // Layers draw in absolute board coordinates, flex layout would lay them out side by side.
    enableLayout: false,
    resolution: window.devicePixelRatio,
    autoDensity: true,
  } as BootstrapOptions)
  if (unmounted) destroy(result)
  else canvas = result
})

onBeforeUnmount(() => {
  unmounted = true
  observer.disconnect()
  if (canvas) destroy(canvas)
  canvas = undefined
})
</script>

<template>
  <div ref="host" class="city-canvas" aria-hidden="true" />
</template>

<style lang="scss" scoped>
.city-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 6px;
  pointer-events: none;

  :deep(canvas) {
    display: block;
  }
}
</style>
