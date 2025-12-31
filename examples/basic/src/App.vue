<script setup lang="ts">
import Counter from './components/Counter.vue'
import UserCard from './components/UserCard.vue'
import NoOpDemo from './components/NoOpDemo.vue'
import ReactiveDemo from './components/ReactiveDemo.vue'
</script>

<template>
  <div>
    <h1>🔍 vue-why-did-you-render Demo</h1>
    
    <p>
      Open your browser's <strong>DevTools Console</strong> to see render tracking logs.
      <br>
      Each component below demonstrates different reactivity scenarios.
    </p>

    <div class="hint">
      <strong>Tip:</strong> Use <code>window.wdyrTracker.getStats()</code> in console 
      to see render statistics, or <code>.pause()</code> / <code>.resume()</code> to control tracking.
    </div>

    <Counter />
    <UserCard />
    <NoOpDemo />
    <ReactiveDemo />
  </div>
</template>

