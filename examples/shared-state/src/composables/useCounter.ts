import { ref, computed, triggerRef } from 'vue'

/**
 * useCounter - A shared counter composable
 * 
 * This demonstrates how shared state in composables causes
 * multiple components to re-render when the state changes.
 * 
 * When you increment the counter, ALL components using this
 * composable will re-render - watch the console to see this!
 */

// Shared state - lives outside the composable function
// This means all components share the same counter instance
const count = ref(0)
const history = ref<number[]>([0])

export function useCounter() {
  // Computed values derived from shared state
  const doubled = computed(() => count.value * 2)
  const isPositive = computed(() => count.value > 0)
  const isEven = computed(() => count.value % 2 === 0)

  function increment() {
    count.value++
    history.value.push(count.value)
  }

  function decrement() {
    count.value--
    history.value.push(count.value)
  }

  function reset() {
    count.value = 0
    history.value = [0]
  }

  // Force a no-op update (for demonstrating performance issues)
  function forceNoOp() {
    // Vue 3.4+ optimizes away `count.value = count.value` for primitives
    // So we use triggerRef to FORCE a re-render even though value doesn't change
    triggerRef(count)
  }

  return {
    // State
    count,
    history,
    // Computed
    doubled,
    isPositive,
    isEven,
    // Actions
    increment,
    decrement,
    reset,
    forceNoOp,
  }
}

