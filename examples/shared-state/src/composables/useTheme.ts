import { ref, computed, triggerRef } from 'vue'

/**
 * useTheme - A shared theme composable
 * 
 * Demonstrates reactive theme management with computed properties.
 * Multiple components can share the theme and react to changes.
 */

export type ThemeMode = 'light' | 'dark' | 'system'

// Shared state
const mode = ref<ThemeMode>('light')
const primaryColor = ref('#42b883')
const fontSize = ref(16)

export function useTheme() {
  // Computed theme object - recomputes when any dependency changes
  const theme = computed(() => ({
    mode: mode.value,
    primaryColor: primaryColor.value,
    fontSize: fontSize.value,
    isDark: mode.value === 'dark',
    cssVars: {
      '--primary-color': primaryColor.value,
      '--font-size': `${fontSize.value}px`,
      '--bg-color': mode.value === 'dark' ? '#1a1a1a' : '#ffffff',
      '--text-color': mode.value === 'dark' ? '#ffffff' : '#333333',
    }
  }))

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
  }

  function toggleDarkMode() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  function setPrimaryColor(color: string) {
    primaryColor.value = color
  }

  function setFontSize(size: number) {
    fontSize.value = size
  }

  function increaseFontSize() {
    fontSize.value = Math.min(fontSize.value + 2, 24)
  }

  function decreaseFontSize() {
    fontSize.value = Math.max(fontSize.value - 2, 12)
  }

  // Simulate a no-op update for demonstration
  function forceNoOpUpdate() {
    // Vue 3.4+ optimizes away `ref.value = ref.value` for primitives
    // So we use triggerRef to FORCE a re-render even though value doesn't change
    triggerRef(primaryColor)
  }

  return {
    // State
    mode,
    primaryColor,
    fontSize,
    // Computed
    theme,
    // Actions
    setMode,
    toggleDarkMode,
    setPrimaryColor,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    forceNoOpUpdate,
  }
}

