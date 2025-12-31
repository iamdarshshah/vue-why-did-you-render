<script setup lang="ts">
import { useTheme } from '../composables'

/**
 * ThemeDemo Component
 * 
 * Demonstrates the useTheme composable with computed properties.
 * Shows how theme changes propagate to all consuming components.
 */

const { 
  mode, 
  theme, 
  primaryColor,
  fontSize,
  toggleDarkMode, 
  setPrimaryColor,
  increaseFontSize,
  decreaseFontSize,
  forceNoOpUpdate 
} = useTheme()

const colors = ['#42b883', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6']
</script>

<template>
  <div class="card" :style="{ 
    background: theme.cssVars['--bg-color'],
    color: theme.cssVars['--text-color'],
    transition: 'all 0.3s ease'
  }">
    <h2 :style="{ color: primaryColor }">🎨 Theme Demo <span class="shared-indicator">Shared State</span></h2>
    
    <p>
      This component uses computed properties from <code>useTheme</code>.
      <br>
      Theme changes affect all components using this composable.
    </p>

    <div style="margin: 20px 0; display: flex; gap: 10px; align-items: center;">
      <strong>Mode:</strong>
      <button @click="toggleDarkMode">
        {{ mode === 'dark' ? '☀️ Light' : '🌙 Dark' }}
      </button>
    </div>

    <div style="margin: 20px 0;">
      <strong>Primary Color:</strong>
      <div style="display: flex; gap: 8px; margin-top: 10px;">
        <button 
          v-for="color in colors" 
          :key="color"
          :style="{ 
            background: color, 
            width: '40px', 
            height: '40px',
            border: primaryColor === color ? '3px solid white' : 'none',
            boxShadow: primaryColor === color ? '0 0 0 2px ' + color : 'none'
          }"
          @click="setPrimaryColor(color)"
        />
      </div>
    </div>

    <div style="margin: 20px 0; display: flex; gap: 10px; align-items: center;">
      <strong>Font Size: {{ fontSize }}px</strong>
      <button @click="decreaseFontSize">A-</button>
      <button @click="increaseFontSize">A+</button>
    </div>

    <button class="danger" @click="forceNoOpUpdate" style="margin-top: 10px;">
      ⚠️ Force No-Op Update
    </button>

    <div class="hint" :style="{ 
      background: mode === 'dark' ? '#2d3748' : '#e8f5e9',
      borderColor: primaryColor 
    }">
      <strong>Theme Object (computed):</strong>
      <pre style="margin: 5px 0; font-size: 12px;">{{ JSON.stringify(theme, null, 2) }}</pre>
    </div>
  </div>
</template>

