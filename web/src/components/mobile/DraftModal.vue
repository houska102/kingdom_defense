<script setup lang="ts">
import CardDraft from '@/components/panels/CardDraft.vue'
import UnitRoster from '@/components/units/UnitRoster.vue'
import { chooseCardTarget, state } from '@/game/store'
import MobileModal from './MobileModal.vue'
</script>

<template>
  <MobileModal :closable="false">
    <CardDraft class="flat" />
    <UnitRoster
      v-if="state.pendingCard?.target === 'unit'"
      class="flat roster"
      targeting
      @unit-click="chooseCardTarget"
    />
  </MobileModal>
</template>

<style lang="scss" scoped>
.flat {
  padding: 0;
}

.roster {
  margin-top: 16px;

  :deep(.list) {
    grid-template-columns: 1fr;
  }
}
</style>
