<script setup lang="ts">
import { ref, watch } from 'vue'
import { useServicesStore } from '../stores/services'
import { storeToRefs } from 'pinia'

const store = useServicesStore()
const { filteredServices, loading } = storeToRefs(store)

// Local state for immediate input feedback
const localSearchQuery = ref('')
const debouncedSearchQuery = ref('')

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Immediate search (no debounce) - causes re-render on every keystroke
function handleImmediateSearch(event: Event) {
  const value = (event.target as HTMLInputElement).value
  localSearchQuery.value = value
  store.setSearchQuery(value)
}

// Debounced search - causes re-render only after user stops typing
function handleDebouncedSearch(event: Event) {
  const value = (event.target as HTMLInputElement).value
  debouncedSearchQuery.value = value
  
  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  // Set new timer - update store after 300ms of no input
  debounceTimer = setTimeout(() => {
    store.setSearchQuery(value)
  }, 300)
}

// Clear search
function clearSearch() {
  localSearchQuery.value = ''
  debouncedSearchQuery.value = ''
  store.setSearchQuery('')
}

// Track re-renders
const renderCount = ref(0)
watch(() => filteredServices.value, () => {
  renderCount.value++
}, { immediate: true })
</script>

<template>
  <div class="card">
    <h2>🔎 Debounced Search Demo</h2>
    
    <p>
      Compare how <strong>immediate</strong> vs <strong>debounced</strong> search affects re-renders.
      <br>
      Type quickly in each input and watch the console for render triggers.
    </p>

    <div class="hint warning">
      <strong>Try this:</strong> Type "auth" quickly in the immediate input - you'll see 4 re-renders.
      <br>
      Now type "auth" in the debounced input - you'll see only 1 re-render (after you stop typing).
    </div>

    <div v-if="!loading" class="search-inputs">
      <div class="search-group">
        <label>
          <strong>Immediate Search</strong>
          <span class="badge danger">Re-renders on every keystroke</span>
        </label>
        <input 
          type="text" 
          :value="localSearchQuery"
          @input="handleImmediateSearch"
          placeholder="Type to search (no debounce)..."
          class="search-input"
        />
      </div>

      <div class="search-group">
        <label>
          <strong>Debounced Search</strong>
          <span class="badge success">Re-renders after 300ms pause</span>
        </label>
        <input 
          type="text" 
          :value="debouncedSearchQuery"
          @input="handleDebouncedSearch"
          placeholder="Type to search (300ms debounce)..."
          class="search-input"
        />
      </div>

      <button @click="clearSearch" style="margin-top: 10px;">
        Clear Search
      </button>
    </div>

    <div class="results-info">
      <strong>Results:</strong> {{ filteredServices.length }} services found
      <br>
      <small>Render count: {{ renderCount }}</small>
    </div>
  </div>
</template>

<style scoped>
.search-inputs {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 15px;
}

.search-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.search-group label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  padding: 10px 14px;
  border: 2px solid #ddd;
  border-radius: 6px;
  width: 300px;
  font-size: 14px;
}

.search-input:focus {
  border-color: #42b883;
  outline: none;
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: normal;
}

.badge.danger {
  background: #ff6b6b;
  color: white;
}

.badge.success {
  background: #42b883;
  color: white;
}

.results-info {
  padding: 10px;
  background: #f5f5f5;
  border-radius: 6px;
  margin-top: 10px;
}
</style>

