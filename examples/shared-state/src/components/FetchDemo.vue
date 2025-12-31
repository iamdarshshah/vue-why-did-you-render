<script setup lang="ts">
import { useFetch } from '../composables'

/**
 * FetchDemo Component
 * 
 * Demonstrates the useFetch composable with local state.
 * Each component instance gets its own fetch state (not shared).
 * 
 * This shows:
 * - Loading states
 * - Error handling  
 * - shallowRef for data (better performance with large objects)
 */

interface User {
  id: number
  name: string
  email: string
}

const { data, loading, error, execute, reset, refetchWithSameData } = useFetch<User[]>()
</script>

<template>
  <div class="card">
    <h2>🔄 Fetch Demo (Local State)</h2>
    
    <p>
      Unlike the counter, <code>useFetch</code> creates <strong>local state</strong>
      for each component instance. No shared state here!
    </p>

    <div style="margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap;">
      <button @click="execute('/api/users')">Fetch Users</button>
      <button @click="execute('/api/posts')">Fetch Posts</button>
      <button class="warning" @click="execute('/api/error')">Fetch Error</button>
      <button @click="reset">Reset</button>
      <button 
        v-if="data" 
        class="danger" 
        @click="refetchWithSameData"
      >
        ⚠️ Refetch Same Data
      </button>
    </div>

    <div v-if="loading" style="padding: 20px; text-align: center; color: #666;">
      ⏳ Loading...
    </div>

    <div v-else-if="error" style="padding: 15px; background: #fef2f2; border-radius: 6px; color: #dc2626;">
      ❌ Error: {{ error }}
    </div>

    <div v-else-if="data" style="background: #f5f5f5; padding: 15px; border-radius: 6px;">
      <pre style="margin: 0; font-size: 12px; overflow: auto;">{{ JSON.stringify(data, null, 2) }}</pre>
    </div>

    <div v-else style="padding: 20px; text-align: center; color: #666;">
      Click a button to fetch data
    </div>

    <div class="hint">
      <strong>Note:</strong> This uses <code>shallowRef</code> for data, which only triggers
      re-renders when the reference changes, not when nested properties change.
      <br><br>
      <strong>⚠️ Refetch Same Data</strong> demonstrates setting the same reference again.
    </div>
  </div>
</template>

