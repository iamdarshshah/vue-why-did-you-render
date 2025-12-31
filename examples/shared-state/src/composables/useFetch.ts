import { ref, shallowRef, triggerRef } from 'vue'

/**
 * useFetch - A data fetching composable
 * 
 * This demonstrates:
 * 1. Local state (each component gets its own instance)
 * 2. Loading states and error handling
 * 3. How shallowRef can help with performance
 */

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useFetch<T = unknown>() {
  // Each component gets its own instance of these refs
  // (state is inside the function, not shared)
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(url: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Simulate different responses based on URL
      if (url.includes('error')) {
        throw new Error('Simulated fetch error')
      }

      if (url.includes('users')) {
        data.value = [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
          { id: 3, name: 'Charlie', email: 'charlie@example.com' },
        ] as T
      } else if (url.includes('posts')) {
        data.value = [
          { id: 1, title: 'Hello World', body: 'This is a post' },
          { id: 2, title: 'Vue is awesome', body: 'Learning Vue!' },
        ] as T
      } else {
        data.value = { message: 'Success!', url } as T
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      data.value = null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    data.value = null
    loading.value = false
    error.value = null
  }

  // Simulate a refetch that returns the same data (no-op scenario)
  async function refetchWithSameData(): Promise<void> {
    loading.value = true

    await new Promise(resolve => setTimeout(resolve, 300))

    // Use triggerRef to force a re-render even though data hasn't changed
    // This demonstrates detecting unnecessary re-renders
    triggerRef(data)
    loading.value = false
  }

  return {
    data,
    loading,
    error,
    execute,
    reset,
    refetchWithSameData,
  }
}

