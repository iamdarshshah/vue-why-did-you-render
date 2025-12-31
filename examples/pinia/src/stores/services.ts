import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Service {
  id: number
  name: string
  status: 'active' | 'inactive' | 'maintenance'
  category: string
  requests: number
}

// Sample services data
const sampleServices: Service[] = [
  { id: 1, name: 'Authentication API', status: 'active', category: 'security', requests: 15234 },
  { id: 2, name: 'Payment Gateway', status: 'active', category: 'billing', requests: 8921 },
  { id: 3, name: 'Email Service', status: 'maintenance', category: 'communication', requests: 3456 },
  { id: 4, name: 'Storage API', status: 'active', category: 'infrastructure', requests: 12045 },
  { id: 5, name: 'Analytics Engine', status: 'inactive', category: 'analytics', requests: 0 },
  { id: 6, name: 'Search Service', status: 'active', category: 'search', requests: 7823 },
  { id: 7, name: 'Notification Hub', status: 'active', category: 'communication', requests: 4521 },
  { id: 8, name: 'CDN Service', status: 'active', category: 'infrastructure', requests: 28456 },
]

export const useServicesStore = defineStore('services', () => {
  // State
  const services = ref<Service[]>([])
  const loading = ref(false)
  const selectedCategory = ref<string | null>(null)
  const searchQuery = ref('')

  // Getters
  const totalServices = computed(() => services.value.length)

  const activeServices = computed(() =>
    services.value.filter(s => s.status === 'active')
  )

  const totalRequests = computed(() =>
    services.value.reduce((sum, s) => sum + s.requests, 0)
  )

  const filteredServices = computed(() => {
    let result = services.value

    if (selectedCategory.value) {
      result = result.filter(s => s.category === selectedCategory.value)
    }

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(s => s.name.toLowerCase().includes(query))
    }

    return result
  })

  const categories = computed(() =>
    [...new Set(services.value.map(s => s.category))]
  )

  // Actions
  async function fetchServices() {
    loading.value = true

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    services.value = [...sampleServices]
    loading.value = false
  }

  function toggleServiceStatus(id: number) {
    const service = services.value.find(s => s.id === id)
    if (service) {
      service.status = service.status === 'active' ? 'inactive' : 'active'
    }
  }

  function setCategory(category: string | null) {
    selectedCategory.value = category
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  // This action triggers a no-op re-render (setting same value)
  function refreshWithoutChange() {
    // Setting a primitive to the same value is optimized away by Vue
    // So we trigger a no-op by replacing the array with itself spread into a new array
    // This creates a new array reference with the same contents - a wasteful update!
    services.value = [...services.value]
  }

  function addRandomService() {
    const newService: Service = {
      id: Date.now(),
      name: `New Service ${Math.floor(Math.random() * 1000)}`,
      status: 'active',
      category: categories.value[Math.floor(Math.random() * categories.value.length)] || 'misc',
      requests: Math.floor(Math.random() * 10000),
    }
    services.value.push(newService)
  }

  return {
    // State
    services,
    loading,
    selectedCategory,
    searchQuery,
    // Getters
    totalServices,
    activeServices,
    totalRequests,
    filteredServices,
    categories,
    // Actions
    fetchServices,
    toggleServiceStatus,
    setCategory,
    setSearchQuery,
    refreshWithoutChange,
    addRandomService,
  }
})

