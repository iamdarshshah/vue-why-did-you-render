import { createApp } from 'vue'
import { enableWhyDidYouRender } from 'vue-why-did-you-render'
import App from './App.vue'

const app = createApp(App)

// Enable vue-why-did-you-render BEFORE mounting
// Open browser DevTools Console to see render logs
const tracker = enableWhyDidYouRender(app, {
  logOnConsole: true,
  logLevel: 'verbose' // Log all renders for demo purposes
  // include: [/Counter/, /UserCard/], // Uncomment to filter specific components
  // exclude: [/App/], // Uncomment to exclude components
})

  // Expose tracker to window for demo controls
  ; (window as any).wdyrTracker = tracker

app.mount('#app')

console.log('%c🔍 vue-why-did-you-render is active!', 'color: #42b883; font-weight: bold; font-size: 14px')
console.log('Open DevTools Console to see render logs.')
console.log('Use window.wdyrTracker.pause() / .resume() / .getStats() for runtime control.')

