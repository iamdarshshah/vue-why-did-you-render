<script setup lang="ts">
import { useServicesStore } from '../stores/services'
import { storeToRefs } from 'pinia'

const store = useServicesStore()
const { filteredServices, categories, selectedCategory, searchQuery, loading } = storeToRefs(store)
</script>

<template>
  <div class="card">
    <h2>🗂️ Service Catalog</h2>
    
    <p>
      This component displays filtered services from the Pinia store.
      <br>
      Try filtering - watch how <code>[store:services] (state) "selectedCategory"</code> appears in logs.
    </p>

    <div v-if="!loading" style="margin-bottom: 15px;">
      <input 
        type="text" 
        :value="searchQuery"
        @input="store.setSearchQuery(($event.target as HTMLInputElement).value)"
        placeholder="Search services..."
        style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; width: 200px; margin-right: 10px;"
      />
      
      <button 
        :class="{ active: !selectedCategory }"
        @click="store.setCategory(null)"
        style="margin-right: 5px;"
      >
        All
      </button>
      
      <button 
        v-for="cat in categories" 
        :key="cat"
        :class="{ active: selectedCategory === cat }"
        @click="store.setCategory(cat)"
        style="margin-right: 5px;"
      >
        {{ cat }}
      </button>
    </div>

    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else class="service-list">
      <div 
        v-for="service in filteredServices" 
        :key="service.id"
        class="service-item"
        :class="{ inactive: service.status !== 'active' }"
      >
        <strong>{{ service.name }}</strong>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">
          {{ service.category }} · {{ service.requests.toLocaleString() }} requests
        </div>
        <div style="margin-top: 8px;">
          <button 
            style="padding: 4px 8px; font-size: 12px;"
            :class="{ danger: service.status === 'active' }"
            @click="store.toggleServiceStatus(service.id)"
          >
            {{ service.status === 'active' ? 'Deactivate' : 'Activate' }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="!loading && filteredServices.length === 0" style="color: #666;">
      No services match your filter.
    </p>
  </div>
</template>

<style scoped>
button.active {
  background: #35495e;
}
</style>

