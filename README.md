# vue-why-did-you-render 🔍

[![npm](https://img.shields.io/npm/dt/vue-why-did-you-render.svg)](https://www.npmjs.com/package/vue-why-did-you-render) [![npm](https://img.shields.io/npm/v/vue-why-did-you-render.svg)](https://www.npmjs.com/package/vue-why-did-you-render) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Debug Vue 3 render performance issues. See exactly why your components re-render.

Inspired by [React's why-did-you-render](https://github.com/welldone-software/why-did-you-render), but designed for Vue 3's reactivity system.

## Features

- ✅ **Track render causes** - See which reactive dependency triggered a re-render
- ✅ **Detect no-op renders** - Identify renders where values don't actually change
- ✅ **Group by source** - Understand if changes came from props, refs, computed, or store
- ✅ **Zero production overhead** - Disabled in production builds
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Vue 3 native** - Built for the Composition API

## Installation

```bash
npm install vue-why-did-you-render
```

## Quick Start

```typescript
import { createApp } from "vue";
import { enableWhyDidYouRender } from "vue-why-did-you-render";
import App from "./App.vue";

const app = createApp(App);

// Enable in development only
if (import.meta.env.DEV) {
  enableWhyDidYouRender(app, {
    logOnConsole: true,
    logLevel: "warn",
  });
}

app.mount("#app");
```

## Console Output

When a component mounts:

```
✅ [UserCard] Mounted
  Triggers:
    ✅ [ref:set] "isOpen" (undefined → false)
```

When a component re-renders:

```
✅ [UserCard] (render #2) Re-rendered
  Triggers:
    ✅ [ref:set] "isOpen" (false → true)
  Source breakdown: ref(1)
```

For unnecessary renders (values unchanged):

```
⚠️  [Dashboard] (render #3) Re-rendered
  Triggers:
    ❌ [reactive:set] "count" (5 → 5) (UNCHANGED!)
  ⚠️  Found 1 unnecessary trigger (values unchanged)
```

## API

### enableWhyDidYouRender(app, options)

Initialize the debugging library.

**Parameters:**

- `app` - Vue application instance
- `options` - Configuration options

**Returns:** WhyDidYouRenderInstance with control methods

### Options

```typescript
interface WhyDidYouRenderOptions {
  // Component filtering
  include?: (string | RegExp)[]; // Only track these components
  exclude?: (string | RegExp)[]; // Skip these components

  // Logging
  logLevel?: "verbose" | "warn" | "error"; // Default: 'warn'
  logOnConsole?: boolean; // Default: true
  maxDepth?: number; // Default: 3
  maxStringLength?: number; // Default: 100

  // Behavior
  pauseOnInit?: boolean; // Default: false
  groupUpdates?: boolean; // Default: false
  throttleMs?: number; // Debounce rapid renders

  // Integration
  onRender?: (event) => void; // Custom callback
  enablePiniaTracking?: boolean; // Default: false
  enableDevtools?: boolean; // Default: false (coming soon)
  collectStackTrace?: boolean; // Default: false
}
```

### Instance Methods

```typescript
interface WhyDidYouRenderInstance {
  pause(); // Stop logging
  resume(); // Resume logging
  reset(); // Clear history
  getStats(): RenderStats; // Get statistics
  configure(options: Partial<Options>); // Update configuration
}
```

## Examples

### Basic Usage

```typescript
enableWhyDidYouRender(app, {
  logOnConsole: true,
});
```

### Track Specific Components

```typescript
enableWhyDidYouRender(app, {
  include: [/UserCard/, /Dashboard/, "Header"],
  logOnConsole: true,
});
```

### Exclude Components

```typescript
enableWhyDidYouRender(app, {
  exclude: [/Tooltip/, "Loading"],
  logOnConsole: true,
});
```

### Custom Log Level

```typescript
enableWhyDidYouRender(app, {
  logLevel: "verbose", // Log everything
  logOnConsole: true,
});
```

### Control at Runtime

```typescript
const tracker = enableWhyDidYouRender(app, {
  logOnConsole: true,
});

// Later: pause/resume as needed
tracker.pause(); // Stop logging
tracker.resume(); // Resume logging
tracker.reset(); // Clear history
```

### Custom Callback

```typescript
enableWhyDidYouRender(app, {
  logOnConsole: false,
  onRender: (event) => {
    // Send to analytics, monitoring service, etc.
    console.log(`${event.componentName} rendered ${event.triggers.length} times`);
  },
});
```

### Pinia Store Tracking

```typescript
import { createPinia } from 'pinia'
import { enableWhyDidYouRender } from 'vue-why-did-you-render'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Enable with Pinia tracking
const { registerStore } = enableWhyDidYouRender(app, {
  logOnConsole: true,
  enablePiniaTracking: true,
})

// Register stores you want to track
import { useMyStore } from './stores/myStore'
const myStore = useMyStore()
registerStore(myStore)
```

Console output for Pinia stores:

```
✅ [MyComponent] Re-rendered
  Triggers:
    ✅ [store:myStore] (state) "loading" (false → true)
    ✅ [store:myStore] (getter) "filteredItems" (Array(5) → Array(3))
  Source breakdown: store(2)
```

## How It Works

The library hooks into Vue 3's internal reactivity system using:

- **`onRenderTracked`** - Captures which dependencies are accessed during render
- **`onRenderTriggered`** - Captures what caused the re-render to happen
- **`onUpdated`** - Finalizes the event after DOM update completes

Then it:

1. Maps each dependency change to its component
2. Detects no-op renders (old value === new value)
3. Classifies triggers by source (ref, computed, prop, store)
4. Formats output with helpful emoji indicators
5. Logs to console or calls custom callback

## Understanding Output

### Badges

- ✅ **Green check** - Expected render (value changed)
- ⚠️ **Yellow warning** - Suspicious (unchanged values or multiple sources)
- ❌ **Red X** - Unnecessary render (value unchanged)

### Source Types

- `ref:set` - Ref value assignment
- `reactive:set` - Reactive object mutation
- `computed` - Computed property dependency
- `prop` - Props passed from parent
- `store` - Pinia store mutation

### Trigger Types

- `set` - Value assignment
- `add` - Array/object property added
- `delete` - Array/object property deleted
- `clear` - Collection cleared

## Performance Considerations

The library is designed to have minimal overhead:

- ✅ Disabled in production (`NODE_ENV !== 'development'`)
- ✅ Optional component filtering (include/exclude)
- ✅ Shallow object inspection by default
- ✅ String truncation to prevent huge logs
- ✅ Can be paused at runtime

**Use `include` to track only specific components in large apps.**

## Best Practices

1. **Limit tracked components**

   ```typescript
   enableWhyDidYouRender(app, {
     include: [/Page/, /Card/, /List/], // Only track these
   });
   ```

2. **Use warn level** (not verbose by default)

   ```typescript
   enableWhyDidYouRender(app, {
     logLevel: "warn", // Only show important renders
   });
   ```

3. **Check for unchanged values** - These are performance issues

   ```
   ❌ [store:myStore] (getter) "count" (5 → 5) (UNCHANGED!)
   → This means unnecessary rendering is happening
   ```

4. **Pause during testing** to reduce noise
   ```typescript
   const tracker = enableWhyDidYouRender(app);
   tracker.pause(); // In test setup
   ```

## Troubleshooting

### No logs appearing?

1. Check that you're in development mode (`import.meta.env.DEV`)
2. Verify `logOnConsole: true` is set
3. Check that components match `include` filter (if specified)
4. Open browser DevTools Console tab

### Logs too verbose?

```typescript
// Use 'warn' instead of 'verbose'
enableWhyDidYouRender(app, {
  logLevel: "warn",
});

// Or track only specific components
enableWhyDidYouRender(app, {
  include: [/ImportantComponent/],
});
```

### Performance impact?

```typescript
// Disable in production (already does this automatically)
if (import.meta.env.DEV) {
  enableWhyDidYouRender(app);
}

// Or pause when not needed
tracker.pause();
```

## Roadmap

- [x] Pinia store mutation tracking
- [ ] Vue Devtools panel integration
- [ ] Performance timeline visualization
- [ ] Render comparison between commits
- [ ] Custom formatters and plugins
- [ ] Export/import render traces

## Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm run build

# Run tests
pnpm run test

# Type checking
pnpm run typecheck

# Linting
pnpm run lint
pnpm run lint:fix  # Auto-fix issues

# Formatting
pnpm run format
pnpm run format:check

# Run all checks (typecheck + lint + format)
pnpm run check

# Run the demo app
cd examples/demo
pnpm install
pnpm run dev
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our development process, code style, and how to submit pull requests.

We use [Conventional Commits](https://www.conventionalcommits.org/) with [Commitizen](https://github.com/commitizen/cz-cli) - run `pnpm commit` to create commits.

## License

MIT © 2025

## Related Projects

- [React why-did-you-render](https://github.com/welldone-software/why-did-you-render) - Inspiration
- [Vue Devtools](https://github.com/vuejs/devtools) - Official Vue debugging tools
- [Vue 3 Documentation](https://vuejs.org) - Official Vue.js documentation
