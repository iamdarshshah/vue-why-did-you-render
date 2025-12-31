<script setup lang="ts">
import { useCounter } from '../composables'

/**
 * CounterDisplay Component
 * 
 * Uses the shared useCounter composable.
 * Watch how this component re-renders when ANY component
 * updates the shared counter state!
 */

const { count, doubled, isPositive, isEven } = useCounter()
</script>

<template>
  <div class="card">
    <h2>📊 Counter Display <span class="shared-indicator">Shared State</span></h2>
    
    <p>
      This component <strong>only displays</strong> the counter value.
      <br>
      It will re-render whenever the shared counter changes!
    </p>

    <div style="font-size: 24px; margin: 20px 0;">
      Count: <strong>{{ count }}</strong>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
      <div style="background: #f0f9ff; padding: 10px; border-radius: 6px;">
        <div style="font-size: 12px; color: #666;">Doubled</div>
        <div style="font-size: 20px; font-weight: bold;">{{ doubled }}</div>
      </div>
      <div style="background: #f0fdf4; padding: 10px; border-radius: 6px;">
        <div style="font-size: 12px; color: #666;">Positive?</div>
        <div style="font-size: 20px;">{{ isPositive ? '✅' : '❌' }}</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
        <div style="font-size: 12px; color: #666;">Even?</div>
        <div style="font-size: 20px;">{{ isEven ? '✅' : '❌' }}</div>
      </div>
    </div>

    <div class="hint">
      <strong>Observe:</strong> This component has no buttons, but it re-renders
      when CounterControls changes the shared state!
    </div>
  </div>
</template>

