<script setup lang="ts">
import { state } from '@/game/store'
</script>

<template>
  <section v-if="state.reports.length" class="panel">
    <h2>Battle log</h2>
    <div class="reports">
      <div v-for="report in state.reports" :key="report.turn" class="report">
        <h3>Turn {{ report.turn }}</h3>
        <ul>
          <li v-for="(line, i) in report.lines" :key="i">{{ line }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.reports {
  max-height: 260px;
  overflow-y: auto;
}

.report {
  h3 {
    margin: $spacing 0 4px;
    font-size: 13px;
    color: $color-muted;
  }

  ul {
    margin: 0;
    padding-left: $spacing * 2;
    font-size: 13px;
  }
}
</style>
