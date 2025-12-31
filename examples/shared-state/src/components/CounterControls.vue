<script setup lang="ts">
import { useCounter } from '../composables'

/**
 * CounterControls Component
 * 
 * Uses the shared useCounter composable.
 * When you click buttons here, BOTH this component AND
 * CounterDisplay will re-render!
 */

const { count, increment, decrement, reset, forceNoOp, history } = useCounter()
</script>

<template>
  <div class="card">
    <h2>🎮 Counter Controls <span class="shared-indicator">Shared State</span></h2>
    
    <p>
      Click the buttons below and watch the console.
      <br>
      Notice how <strong>multiple components</strong> re-render!
    </p>

    <div style="margin: 20px 0;">
      <button @click="increment">+ Increment</button>
      <button @click="decrement">- Decrement</button>
      <button class="warning" @click="reset">Reset</button>
      <button class="danger" @click="forceNoOp">⚠️ Force No-Op</button>
    </div>

    <div style="background: #f5f5f5; padding: 10px; border-radius: 6px; font-size: 13px;">
      <strong>History:</strong> {{ history.slice(-5).join(' → ') }}
      <span v-if="history.length > 5">...</span>
    </div>

    <div class="hint warning">
      <strong>⚠️ Force No-Op:</strong> This button sets the counter to its current value.
      In Vue 3.4+, this is optimized away, but <code>triggerRef</code> or object spreads can still cause unnecessary renders.
    </div>
  </div>
</template>

