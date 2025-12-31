/**
 * Pinia Store Tracker
 *
 * This module tracks Pinia stores and maps their internal reactive objects
 * (refs, computeds) back to their property names in the store.
 *
 * When a component uses `storeToRefs(store)`, each property becomes a ref
 * that we can trace back to the original store property name.
 */

export interface StorePropertyInfo {
    storeId: string
    propName: string
    propType: 'state' | 'getter' | 'action'
}

export class PiniaTracker {
    // Map from reactive object identity to store property info
    // Using regular Map instead of WeakMap so we can iterate for debugging
    // Note: This may hold references to disposed stores - call clear() if needed
    private refToStoreMap = new Map<object, StorePropertyInfo>()

    // Track registered stores by their $id
    private registeredStores = new Map<string, object>()

    // Cache getter values to track old/new values
    // Key: "storeId.propName", Value: cached value
    private getterValueCache = new Map<string, any>()

    // Reverse mapping: "storeId.propName" -> computed ref object
    // Used to access raw computed refs for fresh value reads
    private propToRefMap = new Map<string, object>()

    private debug = false

    /**
     * Enable or disable debug logging
     */
    setDebug(enabled: boolean): void {
        this.debug = enabled
    }

    /**
     * Register a Pinia store for tracking.
     * This extracts all state and getter properties and maps their
     * underlying refs/computeds to property names.
     */
    registerStore(store: any): void {
        if (!store || !store.$id) {
            return
        }

        const storeId = store.$id

        // Avoid re-registering the same store
        if (this.registeredStores.has(storeId)) {
            return
        }

        this.registeredStores.set(storeId, store)

        // Use Pinia's $onAction to snapshot getter values BEFORE any action runs
        // This gives us the "old" value before mutations happen
        if (typeof store.$onAction === 'function') {
            store.$onAction(
                ({ name, after }: { name: string; after: (cb: () => void) => void }) => {
                    // Snapshot BEFORE the action runs (this callback runs before the action)
                    this.snapshotGetterValues(storeId)

                    if (this.debug) {
                        console.log(`[PiniaTracker] Snapshotted getters before action: ${name}`)
                    }

                    // Also snapshot after the action completes for the next cycle
                    after(() => {
                        // Use setTimeout to ensure Vue has finished updating
                        setTimeout(() => this.snapshotGetterValues(storeId), 0)
                    })
                },
                true
            ) // detached = true to avoid cleanup issues
        }

        // Get the store's $state which contains all state refs
        const state = store.$state
        if (state) {
            // Register the $state object itself
            this.refToStoreMap.set(state, {
                storeId,
                propName: '$state',
                propType: 'state',
            })

            // Also register the raw reactive object if available
            const rawState = (state as any).__v_raw
            if (rawState) {
                this.refToStoreMap.set(rawState, {
                    storeId,
                    propName: '$state',
                    propType: 'state',
                })
            }

            // Iterate through state properties
            for (const propName of Object.keys(state)) {
                const propValue = state[propName]
                if (propValue && typeof propValue === 'object') {
                    // Register the value (e.g., the array itself)
                    this.refToStoreMap.set(propValue, {
                        storeId,
                        propName,
                        propType: 'state',
                    })

                    // Also register the raw value if it's a reactive proxy
                    const rawValue = (propValue as any).__v_raw
                    if (rawValue && rawValue !== propValue) {
                        this.refToStoreMap.set(rawValue, {
                            storeId,
                            propName,
                            propType: 'state',
                        })
                    }
                }
            }
        }

        // For setup stores (composition API style), we need to check the store itself
        // The store object contains refs and computeds directly
        // BUT: Pinia's proxy unwraps refs, so store[propName] returns the value, not the ref
        // We need to access the raw store to get the actual ref objects

        // Try to get the raw (non-proxy) store object
        // Pinia uses Vue's reactive() which creates a proxy with __v_raw
        const rawStore = (store as any).__v_raw || store

        for (const propName of Object.keys(store)) {
            // Skip internal Pinia properties
            if (propName.startsWith('$') || propName.startsWith('_')) {
                continue
            }

            // Get the property value
            let propValue = store[propName]

            // Skip functions (actions)
            if (typeof propValue === 'function') {
                continue
            }

            // For refs and computeds, try to get the raw ref object
            // First check if propValue itself is a ref (for non-proxied access)
            let isRef = propValue?.__v_isRef === true
            let isComputed = propValue?.__v_isComputed === true || propValue?.effect !== undefined

            // If propValue is unwrapped, try to get raw ref from rawStore
            if (!isRef && !isComputed && rawStore !== store) {
                const rawValue = rawStore[propName]
                if (rawValue?.__v_isRef || rawValue?.__v_isComputed || rawValue?.effect) {
                    propValue = rawValue
                    isRef = propValue.__v_isRef === true
                    isComputed =
                        propValue.__v_isComputed === true || propValue?.effect !== undefined
                }
            }

            if (isRef || isComputed) {
                this.refToStoreMap.set(propValue, {
                    storeId,
                    propName,
                    propType: isComputed ? 'getter' : 'state',
                })

                // For computed refs, also store reverse mapping for value lookup
                if (isComputed) {
                    const cacheKey = `${storeId}.${propName}`
                    this.propToRefMap.set(cacheKey, propValue)

                    // Also register the internal dep object
                    // Vue 3.4+ uses dep.computed to store the computed ref
                    if (propValue.dep) {
                        this.refToStoreMap.set(propValue.dep, {
                            storeId,
                            propName,
                            propType: 'getter',
                        })
                    }
                }
            }
        }

        // Also try to access the raw reactive state via Vue's internal marker
        const rawState = store.$state?.__v_raw || store.$state
        if (rawState && rawState !== state) {
            for (const propName of Object.keys(rawState)) {
                const propValue = rawState[propName]
                if (propValue && typeof propValue === 'object') {
                    this.refToStoreMap.set(propValue, {
                        storeId,
                        propName,
                        propType: 'state',
                    })
                }
            }
        }

        // Initial snapshot of getter values
        this.snapshotGetterValues(storeId)
    }

    /**
     * Look up store property info for a reactive object.
     * Returns undefined if the object isn't from a registered store.
     */
    lookupProperty(target: object): StorePropertyInfo | undefined {
        if (!target) {
            return undefined
        }

        // Direct lookup
        const direct = this.refToStoreMap.get(target)
        if (direct) {
            if (this.debug) {
                console.log(`[WDYR] Direct lookup found: ${direct.storeId}.${direct.propName}`)
            }
            return direct
        }

        // Try to get the raw object if this is a proxy
        const raw = (target as any).__v_raw
        if (raw) {
            const rawResult = this.refToStoreMap.get(raw)
            if (rawResult) {
                if (this.debug) {
                    console.log(
                        `[WDYR] Raw lookup found: ${rawResult.storeId}.${rawResult.propName}`
                    )
                }
                return rawResult
            }
        }

        // For arrays: try to match via the store's current array value
        // Vue's reactivity may give us a different proxy than what we registered
        if (Array.isArray(target)) {
            for (const [storeId, store] of this.registeredStores) {
                const storeAny = store as Record<string, any>
                for (const propName of Object.keys(storeAny.$state || {})) {
                    const stateValue = storeAny.$state[propName]
                    // Check if target matches the current state value
                    if (stateValue === target) {
                        if (this.debug) {
                            console.log(
                                `[WDYR] Array matched via store state: ${storeId}.${propName}`
                            )
                        }
                        return { storeId, propName, propType: 'state' }
                    }
                    // Also check raw value
                    const rawStateValue = stateValue?.__v_raw
                    if (rawStateValue === target || rawStateValue === raw) {
                        if (this.debug) {
                            console.log(`[WDYR] Array matched via raw: ${storeId}.${propName}`)
                        }
                        return { storeId, propName, propType: 'state' }
                    }
                }
            }

            if (this.debug) {
                console.log(
                    `[WDYR] Array lookup failed. target length=${target.length}, mapSize=${this.refToStoreMap.size}`
                )
            }
        }

        const targetAny = target as any

        // For refs created by toRef (used by storeToRefs), check _object and _key
        // Vue's toRef creates refs with _object pointing to the source object
        if (targetAny._object && targetAny._key) {
            const sourceObject = targetAny._object
            const keyName = targetAny._key

            // Check if the source object is a registered store
            for (const [storeId, store] of this.registeredStores) {
                if (sourceObject === store || sourceObject === (store as any).$state) {
                    // Determine if it's a getter or state
                    const propValue = (store as Record<string, any>)[keyName]
                    const isComputed = propValue?.effect !== undefined || propValue?.__v_isComputed

                    return {
                        storeId,
                        propName: keyName,
                        propType: isComputed ? 'getter' : 'state',
                    }
                }
            }
        }

        // For computed refs, check the effect's computed property
        if (targetAny.effect?.computed) {
            const computedRef = targetAny.effect.computed
            const computedResult = this.refToStoreMap.get(computedRef)
            if (computedResult) return computedResult
        }

        // Check if target has a dep with a computed we know about
        if (targetAny.dep?.computed) {
            const computedResult = this.refToStoreMap.get(targetAny.dep.computed)
            if (computedResult) return computedResult
        }

        return undefined
    }

    /**
     * Look up store property by matching the current value.
     * This is a fallback strategy when we can't trace the ref identity.
     * Note: This can have false positives if multiple getters have the same value.
     */
    lookupByValue(value: any, type: string): StorePropertyInfo | undefined {
        // Only use this for computed/getter types to reduce false positives
        if (type !== 'get') {
            return undefined
        }

        for (const [storeId, store] of this.registeredStores) {
            const storeAny = store as Record<string, any>
            const stateKeys = new Set(Object.keys(storeAny.$state || {}))

            // Check each property in the store
            for (const propName of Object.keys(storeAny)) {
                if (propName.startsWith('$') || propName.startsWith('_')) continue

                // Pinia's proxy unwraps refs, so propValue is the actual value
                const propValue = storeAny[propName]

                // Skip functions (actions)
                if (typeof propValue === 'function') continue

                // Skip state properties - we only want getters here
                if (stateKeys.has(propName)) continue

                // propValue is already the unwrapped value due to Pinia's proxy
                // Compare it directly with the trigger value
                try {
                    if (this.valuesMatch(propValue, value)) {
                        if (this.debug) {
                            console.log(`[WDYR] Value match found: ${storeId}.${propName}`)
                        }
                        return {
                            storeId,
                            propName,
                            propType: 'getter',
                        }
                    }
                } catch {
                    // Ignore errors from accessing value
                }
            }
        }

        return undefined
    }

    /**
     * Compare two values for matching (used in value-based lookup)
     */
    private valuesMatch(a: any, b: any): boolean {
        // Strict equality for primitives
        if (a === b) return true

        // For arrays, check length and reference
        if (Array.isArray(a) && Array.isArray(b)) {
            return a.length === b.length && a === b
        }

        // For objects, check by reference
        if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
            return a === b
        }

        return false
    }

    /**
     * Check if a store with the given ID is registered
     */
    hasStore(storeId: string): boolean {
        return this.registeredStores.has(storeId)
    }

    /**
     * Get all registered store IDs
     */
    getRegisteredStoreIds(): string[] {
        return Array.from(this.registeredStores.keys())
    }

    /**
     * Get the current value of a getter and update the cache.
     * Returns { oldValue, newValue } where oldValue is from cache.
     */
    getGetterValueWithOld(storeId: string, propName: string): { oldValue: any; newValue: any } {
        const cacheKey = `${storeId}.${propName}`
        const oldValue = this.getterValueCache.get(cacheKey)

        let newValue: any

        // Try to get the raw computed ref and force recomputation
        const computedRef = this.propToRefMap.get(cacheKey) as any
        if (computedRef) {
            try {
                // In Vue 3, the computed's getter function is in effect.fn
                // Calling it directly bypasses the cache and recomputes the value
                if (computedRef.effect?.fn) {
                    newValue = computedRef.effect.fn()
                } else if (computedRef._getter) {
                    // Older Vue versions might store it in _getter
                    newValue = computedRef._getter()
                } else {
                    // Fallback: try to force dirty and read .value
                    if (computedRef._dirty !== undefined) {
                        computedRef._dirty = true
                    }
                    if (computedRef.effect?._dirty !== undefined) {
                        computedRef.effect._dirty = true
                    }
                    newValue = computedRef.value
                }
            } catch {
                // Fallback to store access
                const store = this.registeredStores.get(storeId) as any
                newValue = store?.[propName]
            }
        } else {
            // Fallback: access through store
            const store = this.registeredStores.get(storeId) as any
            newValue = store?.[propName]
        }

        if (this.debug) {
            console.log(`[PiniaTracker] getGetterValueWithOld: ${cacheKey}`, {
                oldValue,
                newValue,
                cacheHas: this.getterValueCache.has(cacheKey),
                hasComputedRef: !!computedRef,
                hasEffectFn: !!computedRef?.effect?.fn,
            })
        }

        // DON'T update the cache here - only update after render completes
        // This ensures multiple components can read the same old value

        return { oldValue, newValue }
    }

    /**
     * Snapshot all getter values for a store.
     * Call this before a render to capture pre-render values.
     */
    snapshotGetterValues(storeId: string): void {
        const store = this.registeredStores.get(storeId) as any
        if (!store) return

        const stateKeys = new Set(Object.keys(store.$state || {}))

        for (const propName of Object.keys(store)) {
            if (propName.startsWith('$') || propName.startsWith('_')) continue

            const propValue = store[propName]
            if (typeof propValue === 'function') continue

            // Skip state - only cache getters
            if (stateKeys.has(propName)) continue

            const cacheKey = `${storeId}.${propName}`
            try {
                this.getterValueCache.set(cacheKey, propValue)
            } catch {
                // Ignore errors accessing value
            }
        }
    }

    /**
     * Snapshot all getter values for all registered stores.
     */
    snapshotAllGetterValues(): void {
        for (const storeId of this.registeredStores.keys()) {
            this.snapshotGetterValues(storeId)
        }
    }

    /**
     * Clear all tracking data
     */
    reset(): void {
        this.registeredStores.clear()
        this.getterValueCache.clear()
        this.propToRefMap.clear()
        this.refToStoreMap.clear()
    }
}
