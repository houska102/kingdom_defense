<script setup lang="ts">
withDefaults(defineProps<{ title?: string; closable?: boolean }>(), { closable: true })
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="backdrop" @click.self="closable && emit('close')">
    <div class="modal" role="dialog">
      <header v-if="title || closable">
        <h2>{{ title }}</h2>
        <button v-if="closable" class="close" aria-label="Close" @click="emit('close')">x</button>
      </header>
      <div class="body">
        <slot />
      </div>
      <footer v-if="$slots.footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

/* Below EventModal (z-index 10) so events always show on top. */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 9;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: $spacing;
  background: rgba(0, 0, 0, 0.6);
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(100%, 520px);
  max-height: 85vh;
  border: 2px solid $color-border;
  border-radius: $radius;
  background: $color-surface;
}

header {
  display: flex;
  align-items: center;
  gap: $spacing;
  padding: $spacing * 1.5 $spacing * 2 0;

  h2 {
    margin: 0;
    font-size: 16px;
    color: $color-accent;
  }
}

.close {
  margin-left: auto;
  padding: 2px 10px;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-surface-raised;
  color: $color-text;
  font: inherit;
  cursor: pointer;
}

.body {
  overflow-y: auto;
  padding: $spacing * 1.5 $spacing * 2;
}

footer {
  display: flex;
  gap: $spacing;
  justify-content: flex-end;
  padding: 0 $spacing * 2 $spacing * 1.5;
}
</style>
