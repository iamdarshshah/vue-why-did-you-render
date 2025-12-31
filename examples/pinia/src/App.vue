<script setup lang="ts">
import ServiceCatalog from './components/ServiceCatalog.vue'
import StoreStats from './components/StoreStats.vue'
import NoOpDemo from './components/NoOpDemo.vue'
import DebouncedSearch from './components/DebouncedSearch.vue'
</script>

<template>
  <div>
    <h1>🔍 vue-why-did-you-render + Pinia Demo</h1>

    <p>
      Open your browser's <strong>DevTools Console</strong> to see render tracking logs.
      <br>
      This demo shows how Pinia store changes are tracked with meaningful property names.
    </p>

    <div class="hint success">
      <strong>New Feature:</strong> Store changes now display as
      <code>[store:services] (state) "loading"</code> instead of generic
      <code>[ref:set] "value"</code>
    </div>

    <div class="hint">
      <strong>Tip:</strong> Use <code>window.wdyrTracker.getStats()</code> in console
      to see render statistics.
    </div>

    <StoreStats />
    <DebouncedSearch />
    <ServiceCatalog />
    <NoOpDemo />
  </div>
</template>

