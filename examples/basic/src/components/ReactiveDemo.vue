<script setup lang="ts">
import { reactive } from 'vue'

/**
 * ReactiveDemo Component
 * Demonstrates reactive() object tracking.
 * 
 * Expected console output:
 * ✅ [ReactiveDemo] Re-rendered
 *   Triggers:
 *     ✅ [reactive:set] "items" (Array(2) → Array(3))
 */

interface TodoItem {
  id: number
  text: string
  done: boolean
}

const state = reactive({
  items: [
    { id: 1, text: 'Learn Vue', done: true },
    { id: 2, text: 'Try vue-why-did-you-render', done: false }
  ] as TodoItem[],
  filter: 'all' as 'all' | 'active' | 'done'
})

let nextId = 3

function addItem() {
  state.items.push({
    id: nextId++,
    text: `New task ${nextId - 1}`,
    done: false
  })
}

function removeItem(id: number) {
  const index = state.items.findIndex(item => item.id === id)
  if (index > -1) {
    state.items.splice(index, 1)
  }
}

function toggleItem(id: number) {
  const item = state.items.find(item => item.id === id)
  if (item) {
    item.done = !item.done
  }
}

function setFilter(filter: typeof state.filter) {
  state.filter = filter
}

const filteredItems = () => {
  if (state.filter === 'all') return state.items
  if (state.filter === 'active') return state.items.filter(i => !i.done)
  return state.items.filter(i => i.done)
}
</script>

<template>
  <div class="card">
    <h2>📋 ReactiveDemo (Reactive Object)</h2>
    
    <div style="margin-bottom: 10px">
      <button 
        v-for="f in ['all', 'active', 'done']" 
        :key="f"
        :style="{ opacity: state.filter === f ? 1 : 0.6 }"
        @click="setFilter(f as any)"
      >
        {{ f }}
      </button>
    </div>

    <ul style="list-style: none; padding: 0">
      <li 
        v-for="item in filteredItems()" 
        :key="item.id"
        style="padding: 5px 0"
      >
        <input 
          type="checkbox" 
          :checked="item.done" 
          @change="toggleItem(item.id)"
        />
        <span :style="{ textDecoration: item.done ? 'line-through' : 'none' }">
          {{ item.text }}
        </span>
        <button 
          style="margin-left: 10px; padding: 2px 8px"
          @click="removeItem(item.id)"
        >
          ×
        </button>
      </li>
    </ul>

    <button @click="addItem">+ Add Item</button>

    <div class="hint">
      Uses <code>reactive()</code> for complex state. 
      Watch for <code>[reactive:set]</code> triggers when adding/removing/toggling items.
    </div>
  </div>
</template>

