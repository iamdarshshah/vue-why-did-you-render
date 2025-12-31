<script setup lang="ts">
import CounterDisplay from './components/CounterDisplay.vue'
import CounterControls from './components/CounterControls.vue'
import ThemeDemo from './components/ThemeDemo.vue'
import FetchDemo from './components/FetchDemo.vue'
</script>

<template>
  <div>
    <h1>🔍 vue-why-did-you-render - Composables Demo</h1>
    
    <p>
      Open your browser's <strong>DevTools Console</strong> to see render tracking logs.
      <br>
      This demo shows how <strong>composables with shared state</strong> cause multiple components to re-render.
    </p>

    <div class="hint">
      <strong>Key Concept:</strong> When a composable stores state <em>outside</em> the function 
      (like <code>useCounter</code>), all components using it share the same reactive state.
      <br><br>
      <strong>Tip:</strong> Use <code>window.wdyrTracker.getStats()</code> in console 
      to see which components render most often.
    </div>

    <h2 style="color: #8b5cf6; margin-top: 30px;">🔗 Shared State Example</h2>
    <p style="color: #666; margin-bottom: 20px;">
      Both components below use <code>useCounter()</code>. 
      Click buttons in Controls and watch Display re-render too!
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <CounterControls />
      <CounterDisplay />
    </div>

    <h2 style="color: #42b883; margin-top: 30px;">🎨 Computed Properties Example</h2>
    <ThemeDemo />

    <h2 style="color: #3b82f6; margin-top: 30px;">📦 Local State Example</h2>
    <FetchDemo />
  </div>
</template>

<style>
/* Additional app styles */
h2 {
  border-bottom: 2px solid currentColor;
  padding-bottom: 10px;
}
</style>

