import { createApp } from 'vue'
import { enableWhyDidYouRender } from 'vue-why-did-you-render'
import App from './App.vue'

const app = createApp(App)

// Enable vue-why-did-you-render BEFORE mounting
// Open browser DevTools Console to see render logs
const tracker = enableWhyDidYouRender(app, {
  logOnConsole: true,
  logLevel: 'verbose', // Log all renders for demo purposes
  debug: true, // Enable debug logging to diagnose computed tracking
  // include: [/Counter/, /Theme/], // Uncomment to filter specific components
  // exclude: [/App/], // Uncomment to exclude components
})

  // Expose tracker to window for demo controls
  ; (window as any).wdyrTracker = tracker

app.mount('#app')

console.log(`
🔍 vue-why-did-you-render - Shared State Example
=================================================

This example demonstrates how shared state in composables
causes multiple components to re-render.

Try these in the console:
  wdyrTracker.getStats()    - See render statistics
  wdyrTracker.pause()       - Pause tracking
  wdyrTracker.resume()      - Resume tracking
  wdyrTracker.reset()       - Reset all stats

Watch for:
  ✅ Normal re-renders when state changes
  ⚠️ UNCHANGED warnings for unnecessary re-renders
  📊 Multiple components re-rendering from shared state
`)

