import type {
    ComponentRenderEvent,
    DebuggerEvent,
    RenderTrigger,
    WhyDidYouRenderOptions,
    RenderStats,
} from './types'

export class RenderRegistry {
    private registry = new Map<string, ComponentRenderEvent>()
    private trackedDeps = new Map<string, Set<string | symbol>>()
    private pendingTriggers = new Map<string, RenderTrigger[]>()
    private isPaused = false
    private options: WhyDidYouRenderOptions

    // Stats tracking
    private totalRenders = 0
    private rendersByComponent = new Map<string, number>()
    private noOpRenderCount = 0

    // Throttling support
    private lastRenderTime = new Map<string, number>()
    private throttledEvents = new Map<string, ComponentRenderEvent>()

    // Track which components have had their initial render
    private initialRenderComplete = new Set<string>()

    constructor(options: WhyDidYouRenderOptions) {
        this.options = options
        this.isPaused = options.pauseOnInit ?? false
    }

    recordTrackedDependency(
        componentId: string,
        _componentName: string,
        event: DebuggerEvent
    ): void {
        if (this.isPaused) return
        if (!this.trackedDeps.has(componentId)) {
            this.trackedDeps.set(componentId, new Set())
        }
        this.trackedDeps.get(componentId)!.add(event.key ?? 'unknown')
    }

    recordRenderTrigger(componentId: string, _componentName: string, event: DebuggerEvent): void {
        if (this.isPaused) return

        // Extract values, handling computed refs which may have different structure
        const target = event.target as any
        const effect = (event as any).effect
        let oldValue = event.oldValue
        let newValue = event.newValue
        let key = event.key
        let type = event.type
        let source: 'ref' | 'reactive' | 'computed' | 'store' | 'prop' | 'unknown' = 'unknown'

        // Vue 3.4+ may only provide effect without target/type/key
        // This happens when computed dependencies trigger the render
        if (!target && effect) {
            // Try to extract info from the effect's dependencies
            const deps = effect.deps
            if (deps) {
                // The effect.deps is a linked list in Vue 3.4+
                // Try to get the first dependency's info
                let dep = deps
                while (dep) {
                    const depTarget = dep.dep?.computed || dep.dep?.target
                    if (depTarget) {
                        // Get both cached and current values
                        let cachedValue: any
                        let currentValue: any
                        try {
                            cachedValue = depTarget._value
                            currentValue = depTarget.value
                        } catch {
                            cachedValue = undefined
                            currentValue = '[error reading value]'
                        }

                        // Detect computed: has effect OR _value differs from .value (lazy recomputation)
                        const isComputed =
                            depTarget.__v_isComputed ||
                            depTarget.effect ||
                            (depTarget.__v_isRef && cachedValue !== currentValue)

                        if (isComputed) {
                            source = 'computed'
                            key = 'value'
                            type = 'get'
                            oldValue = cachedValue // OLD cached value before recompute
                            newValue = currentValue // NEW recomputed value
                            break
                        } else if (depTarget.__v_isRef) {
                            source = 'ref'
                            key = 'value'
                            type = 'set'
                            // For regular refs, cached and current should be the same
                            oldValue = cachedValue
                            newValue = currentValue
                            break
                        }
                    }
                    dep = dep.nextDep
                }
            }

            // If we still don't have info, mark it as a dependency change
            if (source === 'unknown') {
                source = 'computed'
                key = 'dependency'
                type = 'change'
                newValue = '[dependency changed]'
            }
        } else if (target) {
            // Traditional event with target
            if (target.__v_isComputed || target.effect) {
                source = 'computed'
                key = key ?? 'value'
                type = type ?? 'get'
                // For computed, try to get old from _value and new from .value
                if (oldValue === undefined && newValue === undefined) {
                    try {
                        oldValue = target._value // cached before recompute
                        newValue = target.value // triggers recompute
                    } catch {
                        // Ignore
                    }
                }
            } else if (target.__v_isRef) {
                source = 'ref'
                if (key === undefined) key = 'value'
                if (type === undefined) type = 'set'
                // For refs, _value is current value
                if (oldValue === undefined || newValue === undefined) {
                    try {
                        const currentVal = target._value ?? target.value
                        if (newValue === undefined) newValue = currentVal
                        if (oldValue === undefined) oldValue = currentVal
                    } catch {
                        // Ignore
                    }
                }
            } else {
                source = this.inferSource(target)
            }
        }

        const isNoOp = this.detectNoOp(oldValue, newValue)
        const trigger: RenderTrigger = {
            key: key,
            type: type,
            oldValue: oldValue,
            newValue: newValue,
            isNoOp,
            source,
            path: this.buildPath(target, key),
        }

        if (!this.pendingTriggers.has(componentId)) {
            this.pendingTriggers.set(componentId, [])
        }
        this.pendingTriggers.get(componentId)!.push(trigger)
    }

    finalizeRender(componentId: string, componentName: string): ComponentRenderEvent | null {
        if (this.isPaused) return null

        const triggers = this.pendingTriggers.get(componentId) || []
        const tracked = this.trackedDeps.get(componentId) || new Set()
        const now = Date.now()
        const isInitialRender = !this.initialRenderComplete.has(componentId)

        // Mark component as having completed initial render
        if (isInitialRender) {
            this.initialRenderComplete.add(componentId)
        }

        const event: ComponentRenderEvent = {
            componentName,
            componentId,
            timestamp: now,
            triggers,
            tracked,
            isInitialRender,
            rerenderReason: this.inferReason(triggers),
        }

        // Check throttling
        if (this.options.throttleMs && this.options.throttleMs > 0) {
            const lastTime = this.lastRenderTime.get(componentId) || 0
            const elapsed = now - lastTime

            if (elapsed < this.options.throttleMs) {
                // Store event for later, merge triggers
                const existing = this.throttledEvents.get(componentId)
                if (existing) {
                    existing.triggers.push(...triggers)
                } else {
                    this.throttledEvents.set(componentId, { ...event })
                }
                this.pendingTriggers.delete(componentId)
                this.trackedDeps.delete(componentId)
                return null // Throttled, don't emit yet
            }

            // Check if we have throttled events to emit
            const throttled = this.throttledEvents.get(componentId)
            if (throttled) {
                event.triggers = [...throttled.triggers, ...event.triggers]
                this.throttledEvents.delete(componentId)
            }
        }

        this.lastRenderTime.set(componentId, now)

        // Update stats
        this.totalRenders++
        this.rendersByComponent.set(
            componentName,
            (this.rendersByComponent.get(componentName) || 0) + 1
        )
        if (event.triggers.some(t => t.isNoOp)) {
            this.noOpRenderCount++
        }

        // Store in registry for history
        this.registry.set(`${componentId}-${event.timestamp}`, event)

        if (this.options.onRender) {
            this.options.onRender(event)
        }

        this.pendingTriggers.delete(componentId)
        this.trackedDeps.delete(componentId)
        return event
    }

    /**
     * Infer the source type of the reactive target
     */
    private inferSource(target: object): RenderTrigger['source'] {
        if (!target) return 'unknown'

        // Check for Vue internal markers
        const targetAny = target as any

        // Check if it's a ref (has _value property)
        if ('_value' in target || targetAny.__v_isRef) {
            return 'ref'
        }

        // Check if it's a computed
        if (targetAny.effect || targetAny.__v_isComputed) {
            return 'computed'
        }

        // Check if it's a reactive object
        if (targetAny.__v_isReactive) {
            return 'reactive'
        }

        // Check for Pinia store markers
        if (targetAny.$id || targetAny._p) {
            return 'store'
        }

        // Default to reactive for plain objects
        return 'reactive'
    }

    /**
     * Detect if a value change is a no-op (values are equivalent)
     */
    private detectNoOp(oldValue: any, newValue: any): boolean {
        // Both undefined/null - not a no-op, it's initial
        if (oldValue === undefined && newValue === undefined) return false
        if (oldValue === null && newValue === null) return true

        // Same reference or primitive value
        if (oldValue === newValue) return true

        // One is undefined - not a no-op (triggerRef case)
        if (oldValue === undefined || newValue === undefined) return false

        // Different types - not a no-op
        if (typeof oldValue !== typeof newValue) return false

        // For objects, do a shallow comparison
        if (typeof oldValue === 'object' && oldValue !== null && newValue !== null) {
            // Arrays
            if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                if (oldValue.length !== newValue.length) return false
                return oldValue.every((v, i) => v === newValue[i])
            }

            // Plain objects - shallow compare
            const oldKeys = Object.keys(oldValue)
            const newKeys = Object.keys(newValue)
            if (oldKeys.length !== newKeys.length) return false
            return oldKeys.every(key => oldValue[key] === newValue[key])
        }

        return false
    }

    /**
     * Build a readable path string for the trigger
     */
    private buildPath(target: object | undefined, key: string | symbol | undefined): string {
        if (!key) return 'unknown'

        const keyStr = typeof key === 'symbol' ? key.description || 'symbol' : String(key)

        // Handle undefined target (Vue 3.4+ computed dependency chains)
        if (!target) {
            return keyStr
        }

        const targetAny = target as any

        // Try to get a name for the target
        if (targetAny.__v_isRef) {
            return `ref.${keyStr}`
        }

        if (targetAny.$id) {
            return `${targetAny.$id}.${keyStr}`
        }

        return keyStr
    }

    /**
     * Infer the reason for re-render based on triggers
     */
    private inferReason(triggers: RenderTrigger[]): ComponentRenderEvent['rerenderReason'] {
        if (triggers.length === 0) {
            return 'initial'
        }

        const sources = new Set(triggers.map(t => t.source))

        if (sources.has('store')) {
            return 'store-change'
        }

        if (sources.has('prop')) {
            return 'prop-change'
        }

        return 'state-change'
    }

    pause(): void {
        this.isPaused = true
    }

    resume(): void {
        this.isPaused = false
    }

    reset(): void {
        this.registry.clear()
        this.trackedDeps.clear()
        this.pendingTriggers.clear()
        this.totalRenders = 0
        this.rendersByComponent.clear()
        this.noOpRenderCount = 0
        this.lastRenderTime.clear()
        this.throttledEvents.clear()
    }

    getStats(): RenderStats {
        const byComponent: Record<string, number> = {}
        this.rendersByComponent.forEach((count, name) => {
            byComponent[name] = count
        })

        // Sort components by render count to find most expensive
        const sorted = Array.from(this.rendersByComponent.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([component, count]) => ({
                component,
                count,
                avgMs: 0, // Would need performance timing to calculate
            }))

        return {
            totalRenders: this.totalRenders,
            byComponent,
            mostExpensive: sorted,
            noOpRenders: this.noOpRenderCount,
        }
    }
}
