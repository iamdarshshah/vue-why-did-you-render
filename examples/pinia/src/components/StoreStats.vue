<script setup lang="ts">
import { onMounted } from 'vue'
import { useServicesStore } from '../stores/services'
import { storeToRefs } from 'pinia'

const store = useServicesStore()
const { totalServices, activeServices, totalRequests, loading } = storeToRefs(store)

onMounted(() => {
  store.fetchServices()
})
</script>

<template>
  <div class="card">
    <h2>📊 Store Statistics</h2>
    
    <p>This component uses <code>storeToRefs</code> to access Pinia getters.</p>
    <p>Watch the console - you'll see triggers like <code>[store:services] (getter) "totalServices"</code></p>

    <div v-if="loading" class="loading">
      Loading services...
    </div>

    <div v-else class="stats">
      <div class="stat-box">
        <div class="value">{{ totalServices }}</div>
        <div class="label">Total Services</div>
      </div>
      <div class="stat-box">
        <div class="value">{{ activeServices.length }}</div>
        <div class="label">Active Services</div>
      </div>
      <div class="stat-box">
        <div class="value">{{ totalRequests.toLocaleString() }}</div>
        <div class="label">Total Requests</div>
      </div>
    </div>

    <button @click="store.addRandomService()">
      Add Random Service
    </button>
    
    <button @click="store.fetchServices()" class="warning">
      Reload Services
    </button>
  </div>
</template>

