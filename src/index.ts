import { App, getCurrentInstance } from 'vue'
import { RenderRegistry } from './core/registry'
import { RenderFormatter, createConsoleLogger } from './logger/formatter'
import type { WhyDidYouRenderOptions, WhyDidYouRenderInstance } from './core/types'

// Re-export types for library consumers
export type {
    WhyDidYouRenderOptions,
    WhyDidYouRenderInstance,
    RenderStats,
    ComponentRenderEvent,
    RenderTrigger,
} from './core/types'

/**
 * Check if we're in a production environment
 */
function isProduction(): boolean {
    // Check various environment indicators
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.NODE_ENV === 'production') return true
    }

    // Vite-style environment check
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        if ((import.meta as any).env.PROD) return true
        if ((import.meta as any).env.MODE === 'production') return true
    }

    return false
}

export function enableWhyDidYouRender(
    app: App,
    userOptions: Partial<WhyDidYouRenderOptions> = {}
): WhyDidYouRenderInstance {
    // Return no-op instance in production
    if (isProduction()) {
        return {
            pause: () => {},
            resume: () => {},
            reset: () => {},
            getStats: () => ({
                totalRenders: 0,
                byComponent: {},
                mostExpensive: [],
                noOpRenders: 0,
            }),
            configure: () => {},
        }
    }

    const options: WhyDidYouRenderOptions = {
        include: [],
        exclude: [],
        logLevel: 'warn',
        logOnConsole: true,
        maxDepth: 3,
        maxStringLength: 100,
        ...userOptions,
    }

    const registry = new RenderRegistry(options)
    const formatter = new RenderFormatter(options.maxDepth, options.maxStringLength)

    const consoleLogger = options.logOnConsole
        ? createConsoleLogger(formatter, options.logLevel)
        : null

    // Track components that have been set up
    const trackedComponents = new WeakSet<object>()

    // Helper to set up tracking for a component instance
    function setupTracking(instance: any) {
        if (!instance || trackedComponents.has(instance)) return

        const componentName =
            instance.type?.displayName ||
            instance.type?.name ||
            instance.type?.__name ||
            'Anonymous'
        const componentId = String(instance.uid)

        // Filter by include/exclude
        if (!shouldTrack(componentName, options.include, options.exclude)) {
            return
        }

        trackedComponents.add(instance)

        // Hook into the instance's render tracked/triggered callbacks
        // These are Vue's internal arrays that store lifecycle callbacks
        const originalRtc = instance.rtc || []
        instance.rtc = [
            ...originalRtc,
            (event: any) => {
                registry.recordTrackedDependency(componentId, componentName, event)
            },
        ]

        const originalRtg = instance.rtg || []
        instance.rtg = [
            ...originalRtg,
            (event: any) => {
                registry.recordRenderTrigger(componentId, componentName, event)
            },
        ]

        // Hook into updated lifecycle
        const originalU = instance.u || []
        instance.u = [
            ...originalU,
            () => {
                const renderEvent = registry.finalizeRender(componentId, componentName)
                if (renderEvent && consoleLogger) {
                    consoleLogger(renderEvent)
                }
                if (renderEvent && options.onRender) {
                    options.onRender(renderEvent)
                }
            },
        ]

        // Hook into mounted lifecycle
        const originalM = instance.m || []
        instance.m = [
            ...originalM,
            () => {
                registry.finalizeRender(componentId, componentName)
            },
        ]
    }

    // Use beforeCreate which runs earliest, and beforeMount as fallback
    app.mixin({
        beforeCreate() {
            const instance = getCurrentInstance()
            if (instance) {
                setupTracking(instance)
            }
        },
        // Fallback for components where beforeCreate doesn't work
        beforeMount() {
            const instance = getCurrentInstance()
            if (instance) {
                setupTracking(instance)
            }
        },
    })

    return {
        pause: () => registry.pause(),
        resume: () => registry.resume(),
        reset: () => registry.reset(),
        getStats: () => registry.getStats(),
        configure: opts => Object.assign(options, opts),
    }
}

function shouldTrack(
    componentName: string,
    include: (string | RegExp)[] | undefined,
    exclude: (string | RegExp)[] | undefined
): boolean {
    if (include && include.length > 0) {
        const matches = include.some(pattern => matchPattern(componentName, pattern))
        if (!matches) return false
    }
    if (exclude && exclude.length > 0) {
        const matches = exclude.some(pattern => matchPattern(componentName, pattern))
        if (matches) return false
    }
    return true
}

function matchPattern(str: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') return str.includes(pattern)
    return pattern.test(str)
}
