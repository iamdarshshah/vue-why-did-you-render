# vue-why-did-you-render - Basic Example

This example demonstrates the core features of `vue-why-did-you-render`.

## Setup

```bash
# From the examples/basic directory
npm install
npm run dev
```

Then open http://localhost:5173 and your browser's DevTools Console.

## What's Demonstrated

### 1. Counter (Ref Demo)
Basic `ref()` reactivity tracking. Click increment/decrement to see:
```
✅ [Counter] Re-rendered
  Triggers:
    ✅ [ref:set] "value" (0 → 1)
```

### 2. UserCard (Computed Demo)
Multiple refs and computed properties. Shows how computed dependencies trigger re-renders.

### 3. NoOpDemo (Performance Issue Detection)
**The most important demo!** Shows how the library detects wasteful unchanged renders:
```
⚠️ [NoOpDemo] Re-rendered
  Triggers:
    ❌ [ref:set] "value" (5 → 5) (UNCHANGED!)
  ⚠️  Found 1 unnecessary trigger (values unchanged)
```

### 4. ReactiveDemo (Reactive Object)
Demonstrates `reactive()` object tracking with arrays and nested mutations.

## Runtime Controls

In the browser console, you can use:

```javascript
// Pause tracking
wdyrTracker.pause()

// Resume tracking
wdyrTracker.resume()

// Get statistics
wdyrTracker.getStats()
// Returns: { totalRenders, byComponent, mostExpensive, noOpRenders }

// Reset all tracking data
wdyrTracker.reset()
```

## Configuration Options

In `src/main.ts`, you can experiment with different options:

```typescript
enableWhyDidYouRender(app, {
  logOnConsole: true,
  logLevel: 'verbose',    // 'verbose' | 'warn' | 'error'
  include: [/Counter/],   // Only track these components
  exclude: [/App/],       // Skip these components
  throttleMs: 100,        // Debounce rapid renders
  maxDepth: 3,            // Object inspection depth
  maxStringLength: 100,   // Truncate long strings
})
```

