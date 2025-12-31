<script setup lang="ts">
import { useServicesStore } from '../stores/services'
import { storeToRefs } from 'pinia'

const store = useServicesStore()
const { services } = storeToRefs(store)
</script>

<template>
  <div class="card">
    <h2>⚠️ No-Op Detection Demo</h2>

    <p>
      This demonstrates detecting wasteful re-renders from Pinia stores.
      <br>
      Click the button to trigger a no-op: replacing <code>services</code> array with a copy of itself.
    </p>

    <div class="hint">
      <strong>Current services count:</strong> <code>{{ services.length }}</code>
    </div>

    <button class="warning" @click="store.refreshWithoutChange()">
      Trigger No-Op Update
    </button>

    <p style="font-size: 14px; color: #666; margin-top: 15px;">
      After clicking, check the console for:<br>
      <code>⚠️ [NoOpDemo] Re-rendered</code> with a <code>(UNCHANGED!)</code> indicator
    </p>

    <div class="hint success">
      <strong>Why this matters:</strong> No-op triggers indicate wasted work.
      In a real app, you might be doing <code>items = [...items]</code> or
      <code>state = { ...state }</code> unnecessarily, causing re-renders with no actual data change.
    </div>
  </div>
</template>

