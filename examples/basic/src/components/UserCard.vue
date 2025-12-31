<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * UserCard Component
 * Demonstrates computed properties and multiple refs.
 * 
 * Expected console output:
 * ✅ [UserCard] Re-rendered
 *   Triggers:
 *     ✅ [ref:set] "value" (John → Jane)
 */

const firstName = ref('John')
const lastName = ref('Doe')
const isOnline = ref(true)

// Computed property - triggers re-render when dependencies change
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

function toggleOnline() {
  isOnline.value = !isOnline.value
}

function changeFirstName() {
  const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie']
  const current = names.indexOf(firstName.value)
  firstName.value = names[(current + 1) % names.length]
}

function changeLastName() {
  const names = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown']
  const current = names.indexOf(lastName.value)
  lastName.value = names[(current + 1) % names.length]
}
</script>

<template>
  <div class="card">
    <h2>👤 UserCard (Computed Demo)</h2>
    <p>
      Name: <strong>{{ fullName }}</strong>
      <span :style="{ color: isOnline ? 'green' : 'gray' }">
        {{ isOnline ? '● Online' : '○ Offline' }}
      </span>
    </p>
    <button @click="changeFirstName">Change First Name</button>
    <button @click="changeLastName">Change Last Name</button>
    <button @click="toggleOnline">Toggle Status</button>
    <div class="hint">
      Multiple refs + computed property. Watch how changing either name updates the computed.
    </div>
  </div>
</template>

