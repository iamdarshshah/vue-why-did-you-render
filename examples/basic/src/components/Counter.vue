<script setup lang="ts">
import { ref } from 'vue'

/**
 * Counter Component
 * Demonstrates basic ref reactivity tracking.
 * 
 * Expected console output when clicking:
 * ✅ [Counter] Re-rendered
 *   Triggers:
 *     ✅ [ref:set] "value" (0 → 1)
 */

const count = ref(0)

function increment() {
  count.value++
}

function decrement() {
  count.value--
}
</script>

<template>
  <div class="card">
    <h2>🔢 Counter (Ref Demo)</h2>
    <p>Count: <strong>{{ count }}</strong></p>
    <button @click="increment">+ Increment</button>
    <button @click="decrement">- Decrement</button>
    <div class="hint">
      Click buttons to see <code>[ref:set]</code> triggers in console.
    </div>
  </div>
</template>

