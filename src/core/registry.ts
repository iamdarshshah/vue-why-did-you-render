import { toRaw } from 'vue'
import type {
    ComponentRenderEvent,
    DebuggerEvent,
    RenderTrigger,
    WhyDidYouRenderOptions,
    RenderStats,
} from './types'
import { PiniaTracker, type StorePropertyInfo } from './pinia-tracker'

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

    // Pinia store tracking
    private piniaTracker: PiniaTracker | null = null

    constructor(options: WhyDidYouRenderOptions) {
        this.options = options
        this.isPaused = options.pauseOnInit ?? false

        // Initialize Pinia tracker if enabled
        if (options.enablePiniaTracking) {
            this.piniaTracker = new PiniaTracker()
            if (options.debug) {
                this.piniaTracker.setDebug(true)
            }
        }
    }

    /**
     * Get the Pinia tracker instance for registering stores
     */
    getPiniaTracker(): PiniaTracker | null {
        return this.piniaTracker
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
        let arrayIndex: string | number | undefined
        let computedRefForDeferred: any = undefined

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
                        // Detect computed: has effect OR __v_isComputed flag
                        const isComputed = depTarget.__v_isComputed || depTarget.effect

                        if (isComputed) {
                            source = 'computed'
                            key = 'value'
                            type = 'get'
                            // Read _value FIRST to get the cached old value
                            // Vue's lazy computed keeps old value in _value until .value is accessed
                            try {
                                oldValue = depTarget._value
                            } catch {
                                oldValue = undefined
                            }
                            // For computed refs, we can't reliably get the new value during rtg
                            // because Vue hasn't recomputed it yet. Store a reference to resolve later.
                            // We'll update the newValue in finalizeRender after the component renders.
                            newValue = oldValue // Placeholder, will be updated in finalizeRender
                            // Store the computed ref for later resolution
                            computedRefForDeferred = depTarget
                            break
                        } else if (depTarget.__v_isRef) {
                            source = 'ref'
                            key = 'value'
                            type = 'set'
                            // For regular refs, use _value for both (already updated)
                            try {
                                oldValue = depTarget._value
                                newValue = depTarget._value
                            } catch {
                                oldValue = undefined
                                newValue = undefined
                            }
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
                // For computed, read _value FIRST for old, then defer new value
                if (oldValue === undefined && newValue === undefined) {
                    // Read _value first (cached old value before recompute)
                    try {
                        oldValue = target._value
                    } catch {
                        oldValue = undefined
                    }
                    // Defer new value resolution to finalizeRender
                    newValue = oldValue // Placeholder
                    computedRefForDeferred = target
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

        let isNoOp = this.detectNoOp(oldValue, newValue)

        // Detect array mutations for any reactive array (not just stores)
        const isArrayMutation =
            type === 'add' ||
            type === 'delete' ||
            (type === 'set' && typeof key === 'string' && /^\d+$/.test(key))

        if (isArrayMutation && key !== undefined && typeof key !== 'symbol') {
            arrayIndex = key
        }

        // Try to look up Pinia store property info
        let storeId: string | undefined
        let storePropName: string | undefined
        let storePropType: 'state' | 'getter' | 'action' | undefined

        if (this.piniaTracker) {
            // Try multiple lookup strategies to find store property info
            let storeInfo = this.lookupStoreProperty(target, effect)

            // Fallback: try value-based lookup for computed getters
            if (!storeInfo && type === 'get') {
                storeInfo = this.lookupStorePropertyByValue(newValue, type)
            }

            if (storeInfo) {
                storeId = storeInfo.storeId
                storePropName = storeInfo.propName
                storePropType = storeInfo.propType
                source = 'store'

                // For array mutations, preserve the original key as arrayIndex
                // before overwriting key with the property name
                const originalKey = key
                const isArrayMutation =
                    type === 'add' ||
                    type === 'delete' ||
                    (type === 'set' && typeof originalKey === 'string' && /^\d+$/.test(originalKey))

                // Use the actual property name as the key
                key = storeInfo.propName

                // For getters, use the cached old value since Vue doesn't provide it
                if (storePropType === 'getter') {
                    const cachedValues = this.piniaTracker.getGetterValueWithOld(
                        storeInfo.storeId,
                        storeInfo.propName
                    )
                    oldValue = cachedValues.oldValue
                    newValue = cachedValues.newValue
                    // Recalculate isNoOp with the correct getter values
                    isNoOp = this.detectNoOp(oldValue, newValue)
                }

                // Store array index for formatting
                if (
                    isArrayMutation &&
                    originalKey !== undefined &&
                    typeof originalKey !== 'symbol'
                ) {
                    arrayIndex = originalKey
                }
            }
        }

        const trigger: RenderTrigger = {
            key: key,
            type: type,
            oldValue: oldValue,
            newValue: newValue,
            isNoOp,
            source,
            path: this.buildPath(target, key, storeId),
            storeId,
            storePropName,
            storePropType,
            arrayIndex,
            // Store computed ref for deferred value resolution in finishRender
            _computedRef: computedRefForDeferred,
        }

        if (!this.pendingTriggers.has(componentId)) {
            this.pendingTriggers.set(componentId, [])
        }
        this.pendingTriggers.get(componentId)!.push(trigger)
    }

    /**
     * Try multiple strategies to look up store property info
     */
    private lookupStoreProperty(
        target: object | undefined,
        effect: any
    ): StorePropertyInfo | undefined {
        if (!this.piniaTracker) return undefined

        // Strategy 1: Direct target lookup (works for state refs)
        if (target) {
            const info = this.piniaTracker.lookupProperty(target)
            if (info) return info
        }

        // Strategy 2: Check effect.computed (for computed getters in Vue 3.4+)
        if (effect?.computed) {
            const info = this.piniaTracker.lookupProperty(effect.computed)
            if (info) return info
        }

        // Strategy 3: Check effect.fn if it's a computed's getter
        if (effect?.fn) {
            const info = this.piniaTracker.lookupProperty(effect.fn)
            if (info) return info
        }

        // Strategy 4: Walk effect dependencies (Vue 3.4+ linked list structure)
        if (effect?.deps) {
            let dep = effect.deps
            while (dep) {
                // Check the computed ref in the dep
                if (dep.dep?.computed) {
                    const info = this.piniaTracker.lookupProperty(dep.dep.computed)
                    if (info) return info
                }
                // Check the target in the dep
                if (dep.dep?.target) {
                    const info = this.piniaTracker.lookupProperty(dep.dep.target)
                    if (info) return info
                }
                dep = dep.nextDep
            }
        }

        // Strategy 5: For older Vue versions, check deps array
        if (Array.isArray(effect?.deps)) {
            for (const dep of effect.deps) {
                if (dep?.computed) {
                    const info = this.piniaTracker.lookupProperty(dep.computed)
                    if (info) return info
                }
            }
        }

        // Strategy 6: Check if target is a computed ref with effect property
        if (target) {
            const targetAny = target as any
            // The target might be the computed's internal value holder
            // Check parent computed ref
            if (targetAny._value !== undefined && targetAny.effect) {
                const info = this.piniaTracker.lookupProperty(target)
                if (info) return info
            }
        }

        return undefined
    }

    /**
     * Try to look up store property by value (fallback strategy)
     */
    private lookupStorePropertyByValue(value: any, type: string): StorePropertyInfo | undefined {
        if (!this.piniaTracker) return undefined
        return this.piniaTracker.lookupByValue(value, type)
    }

    finalizeRender(componentId: string, componentName: string): ComponentRenderEvent | null {
        if (this.isPaused) return null

        const triggers = this.pendingTriggers.get(componentId) || []
        const tracked = this.trackedDeps.get(componentId) || new Set()
        const now = Date.now()
        const isInitialRender = !this.initialRenderComplete.has(componentId)

        // Resolve deferred computed values now that the render is complete
        // At this point, Vue has accessed the computed refs during render, so they're updated
        for (const trigger of triggers) {
            if (trigger._computedRef && trigger.source === 'computed') {
                try {
                    // Now the computed should be recomputed, read its current value
                    const currentValue = trigger._computedRef.value
                    trigger.newValue = currentValue
                    // Recalculate isNoOp with the correct new value
                    trigger.isNoOp = this.detectNoOp(trigger.oldValue, currentValue)
                } catch {
                    trigger.newValue = '[error reading computed]'
                }
                // Clean up the internal reference
                delete trigger._computedRef
            }
        }

        // Mark component as having completed initial render
        if (isInitialRender) {
            this.initialRenderComplete.add(componentId)
        }

        // Get the render count for this component
        const renderCount = this.rendersByComponent.get(componentName) || 0

        const event: ComponentRenderEvent = {
            componentName,
            componentId,
            timestamp: now,
            triggers,
            tracked,
            isInitialRender,
            rerenderReason: this.inferReason(triggers),
            renderCount,
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

        // Snapshot getter values after render completes
        // This captures current values for comparison in the next render cycle
        if (this.piniaTracker) {
            this.piniaTracker.snapshotAllGetterValues()
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
        // Use toRaw to handle Vue reactive proxies
        if (typeof oldValue === 'object' && oldValue !== null && newValue !== null) {
            const rawOld = toRaw(oldValue)
            const rawNew = toRaw(newValue)

            // Arrays
            if (Array.isArray(rawOld) && Array.isArray(rawNew)) {
                if (rawOld.length !== rawNew.length) return false
                // Compare raw values of each element
                return rawOld.every((v, i) => {
                    const rawV = toRaw(v)
                    const rawNewV = toRaw(rawNew[i])
                    // For objects, compare by reference (shallow)
                    return rawV === rawNewV
                })
            }

            // Plain objects - shallow compare
            const oldKeys = Object.keys(rawOld)
            const newKeys = Object.keys(rawNew)
            if (oldKeys.length !== newKeys.length) return false
            return oldKeys.every(key => toRaw(rawOld[key]) === toRaw(rawNew[key]))
        }

        return false
    }

    /**
     * Build a readable path string for the trigger
     */
    private buildPath(
        target: object | undefined,
        key: string | symbol | undefined,
        storeId?: string
    ): string {
        if (!key) return 'unknown'

        const keyStr = typeof key === 'symbol' ? key.description || 'symbol' : String(key)

        // If we have a store ID from Pinia tracking, use it
        if (storeId) {
            return `${storeId}.${keyStr}`
        }

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
        this.initialRenderComplete.clear()
    }

    /**
     * Clean up tracking data for a specific component (e.g., on unmount).
     * This prevents memory leaks from accumulating component tracking data.
     */
    cleanupComponent(componentId: string): void {
        this.trackedDeps.delete(componentId)
        this.pendingTriggers.delete(componentId)
        this.lastRenderTime.delete(componentId)
        this.throttledEvents.delete(componentId)
        this.initialRenderComplete.delete(componentId)
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
