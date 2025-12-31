import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { enableWhyDidYouRender } from 'vue-why-did-you-render'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

// Enable vue-why-did-you-render with Pinia tracking BEFORE mounting
const tracker = enableWhyDidYouRender(app, {
  logOnConsole: true,
  logLevel: 'verbose', // Log all renders for demo purposes
  enablePiniaTracking: true, // Enable Pinia store property tracking
})

// Use the Pinia plugin to auto-register all stores
// This allows the tracker to map store properties to meaningful names
pinia.use(tracker.createPiniaPlugin())

  // Expose tracker to window for demo controls
  ; (window as any).wdyrTracker = tracker

app.use(pinia)
app.mount('#app')

console.log('%c🔍 vue-why-did-you-render is active with Pinia tracking!', 'color: #42b883; font-weight: bold; font-size: 14px')
console.log('Open DevTools Console to see render logs.')
console.log('Store changes will show as: [store:storeName] (state/getter) "propertyName"')
console.log('Use window.wdyrTracker.pause() / .resume() / .getStats() for runtime control.')

