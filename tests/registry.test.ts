import { describe, it, expect, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { RenderRegistry } from '../src/core/registry'
import { PiniaTracker } from '../src/core/pinia-tracker'
import type { WhyDidYouRenderOptions, DebuggerEvent } from '../src/core/types'

describe('RenderRegistry', () => {
    let registry: RenderRegistry
    let options: WhyDidYouRenderOptions

    beforeEach(() => {
        options = {
            include: [],
            exclude: [],
            logLevel: 'warn',
            logOnConsole: false,
        }
        registry = new RenderRegistry(options)
    })

    describe('constructor', () => {
        it('should initialize with default paused state as false', () => {
            const stats = registry.getStats()
            expect(stats.totalRenders).toBe(0)
        })

        it('should respect pauseOnInit option', () => {
            const pausedRegistry = new RenderRegistry({ ...options, pauseOnInit: true })
            const mockEvent: DebuggerEvent = {
                effect: {},
                target: {},
                type: 'set',
                key: 'test',
                oldValue: 1,
                newValue: 2,
            }
            pausedRegistry.recordRenderTrigger('1', 'TestComponent', mockEvent)
            const result = pausedRegistry.finalizeRender('1', 'TestComponent')
            expect(result).toBeNull()
        })
    })

    describe('recordTrackedDependency', () => {
        it('should track dependencies for a component', () => {
            const event: DebuggerEvent = {
                effect: {},
                target: {},
                type: 'get',
                key: 'count',
            }
            registry.recordTrackedDependency('comp-1', 'Counter', event)
            // Dependencies are tracked internally - verify via finalizeRender
            const renderEvent = registry.finalizeRender('comp-1', 'Counter')
            expect(renderEvent).not.toBeNull()
            expect(renderEvent!.tracked.has('count')).toBe(true)
        })

        it('should not track when paused', () => {
            registry.pause()
            const event: DebuggerEvent = {
                effect: {},
                target: {},
                type: 'get',
                key: 'count',
            }
            registry.recordTrackedDependency('comp-1', 'Counter', event)
            registry.resume()
            const renderEvent = registry.finalizeRender('comp-1', 'Counter')
            expect(renderEvent!.tracked.size).toBe(0)
        })
    })

    describe('recordRenderTrigger', () => {
        it('should record trigger with correct properties', () => {
            const event: DebuggerEvent = {
                effect: {},
                target: { __v_isRef: true },
                type: 'set',
                key: 'value',
                oldValue: 1,
                newValue: 2,
            }
            registry.recordRenderTrigger('comp-1', 'Counter', event)
            const renderEvent = registry.finalizeRender('comp-1', 'Counter')

            expect(renderEvent!.triggers).toHaveLength(1)
            expect(renderEvent!.triggers[0].key).toBe('value')
            expect(renderEvent!.triggers[0].oldValue).toBe(1)
            expect(renderEvent!.triggers[0].newValue).toBe(2)
            expect(renderEvent!.triggers[0].isNoOp).toBe(false)
            expect(renderEvent!.triggers[0].source).toBe('ref')
        })

        it('should detect no-op triggers', () => {
            const event: DebuggerEvent = {
                effect: {},
                target: {},
                type: 'set',
                key: 'count',
                oldValue: 5,
                newValue: 5,
            }
            registry.recordRenderTrigger('comp-1', 'Counter', event)
            const renderEvent = registry.finalizeRender('comp-1', 'Counter')

            expect(renderEvent!.triggers[0].isNoOp).toBe(true)
        })

        it('should accumulate multiple triggers', () => {
            const event1: DebuggerEvent = {
                effect: {},
                target: {},
                type: 'set',
                key: 'a',
                oldValue: 1,
                newValue: 2,
            }
            const event2: DebuggerEvent = {
                effect: {},
                target: {},
                type: 'set',
                key: 'b',
                oldValue: 'x',
                newValue: 'y',
            }
            registry.recordRenderTrigger('comp-1', 'Counter', event1)
            registry.recordRenderTrigger('comp-1', 'Counter', event2)
            const renderEvent = registry.finalizeRender('comp-1', 'Counter')

            expect(renderEvent!.triggers).toHaveLength(2)
        })
    })

    describe('finalizeRender', () => {
        it('should return null when paused', () => {
            registry.pause()
            const result = registry.finalizeRender('comp-1', 'Counter')
            expect(result).toBeNull()
        })

        it('should create event with correct component info', () => {
            const event = registry.finalizeRender('comp-123', 'MyComponent')
            expect(event!.componentId).toBe('comp-123')
            expect(event!.componentName).toBe('MyComponent')
            expect(event!.timestamp).toBeGreaterThan(0)
        })

        it('should clear pending triggers after finalize', () => {
            const triggerEvent: DebuggerEvent = {
                effect: {},
                target: {},
                type: 'set',
                key: 'test',
                oldValue: 1,
                newValue: 2,
            }
            registry.recordRenderTrigger('comp-1', 'Counter', triggerEvent)
            registry.finalizeRender('comp-1', 'Counter')

            // Second finalize should have no triggers
            const secondEvent = registry.finalizeRender('comp-1', 'Counter')
            expect(secondEvent!.triggers).toHaveLength(0)
        })

        it('should call onRender callback if provided', () => {
            let callbackEvent: any = null
            const optionsWithCallback: WhyDidYouRenderOptions = {
                ...options,
                onRender: event => {
                    callbackEvent = event
                },
            }
            const registryWithCallback = new RenderRegistry(optionsWithCallback)
            registryWithCallback.finalizeRender('comp-1', 'TestComponent')

            expect(callbackEvent).not.toBeNull()
            expect(callbackEvent.componentName).toBe('TestComponent')
        })
    })

    describe('getStats', () => {
        it('should track total renders', () => {
            registry.finalizeRender('comp-1', 'A')
            registry.finalizeRender('comp-2', 'B')
            registry.finalizeRender('comp-1', 'A')

            const stats = registry.getStats()
            expect(stats.totalRenders).toBe(3)
        })

        it('should track renders by component', () => {
            registry.finalizeRender('comp-1', 'Counter')
            registry.finalizeRender('comp-1', 'Counter')
            registry.finalizeRender('comp-2', 'Header')

            const stats = registry.getStats()
            expect(stats.byComponent['Counter']).toBe(2)
            expect(stats.byComponent['Header']).toBe(1)
        })

        it('should track no-op renders', () => {
            const noOpEvent: DebuggerEvent = {
                effect: {},
                target: {},
                type: 'set',
                key: 'count',
                oldValue: 5,
                newValue: 5,
            }
            registry.recordRenderTrigger('comp-1', 'Counter', noOpEvent)
            registry.finalizeRender('comp-1', 'Counter')

            const stats = registry.getStats()
            expect(stats.noOpRenders).toBe(1)
        })
    })

    describe('pause/resume', () => {
        it('should pause and resume tracking', () => {
            registry.pause()
            const result1 = registry.finalizeRender('comp-1', 'Counter')
            expect(result1).toBeNull()

            registry.resume()
            const result2 = registry.finalizeRender('comp-1', 'Counter')
            expect(result2).not.toBeNull()
        })
    })

    describe('reset', () => {
        it('should clear all tracking data', () => {
            registry.finalizeRender('comp-1', 'Counter')
            registry.finalizeRender('comp-2', 'Header')

            registry.reset()
            const stats = registry.getStats()

            expect(stats.totalRenders).toBe(0)
            expect(Object.keys(stats.byComponent)).toHaveLength(0)
            expect(stats.noOpRenders).toBe(0)
        })
    })
})

describe('PiniaTracker', () => {
    let tracker: PiniaTracker

    beforeEach(() => {
        tracker = new PiniaTracker()
    })

    describe('registerStore', () => {
        it('should register a store and track its properties', () => {
            const countRef = ref(0)
            const mockStore = {
                $id: 'counter',
                $state: { count: 0 },
                count: countRef,
            }

            tracker.registerStore(mockStore)

            // The ref should now be mapped to the store property
            const result = tracker.lookupProperty(countRef)
            expect(result).toEqual({
                storeId: 'counter',
                propName: 'count',
                propType: 'state',
            })
        })

        it('should track computed getters', () => {
            const countRef = ref(5)
            const doubleComputed = computed(() => countRef.value * 2)
            const mockStore = {
                $id: 'counter',
                $state: { count: 5 },
                count: countRef,
                double: doubleComputed,
            }

            tracker.registerStore(mockStore)

            const result = tracker.lookupProperty(doubleComputed)
            expect(result).toEqual({
                storeId: 'counter',
                propName: 'double',
                propType: 'getter',
            })
        })

        it('should ignore non-reactive properties', () => {
            const mockStore = {
                $id: 'counter',
                $state: { count: 0 },
                increment: () => {},
                staticValue: 42,
            }

            // Should not throw
            tracker.registerStore(mockStore)
        })

        it('should handle stores without $id gracefully', () => {
            const mockStore = {
                $state: { count: 0 },
            }

            // Should not throw
            tracker.registerStore(mockStore)
        })
    })

    describe('lookupProperty', () => {
        it('should return undefined for unregistered objects', () => {
            const unknownRef = ref(0)
            const result = tracker.lookupProperty(unknownRef)
            expect(result).toBeUndefined()
        })

        it('should return undefined for null/undefined', () => {
            expect(tracker.lookupProperty(null as any)).toBeUndefined()
            expect(tracker.lookupProperty(undefined as any)).toBeUndefined()
        })
    })
})

describe('RenderRegistry with Pinia tracking', () => {
    it('should enable Pinia tracking when option is set', () => {
        const options: WhyDidYouRenderOptions = {
            include: [],
            exclude: [],
            logLevel: 'warn',
            logOnConsole: false,
            enablePiniaTracking: true,
        }
        const registry = new RenderRegistry(options)

        const piniaTracker = registry.getPiniaTracker()
        expect(piniaTracker).not.toBeNull()
    })

    it('should not enable Pinia tracking when option is false', () => {
        const options: WhyDidYouRenderOptions = {
            include: [],
            exclude: [],
            logLevel: 'warn',
            logOnConsole: false,
            enablePiniaTracking: false,
        }
        const registry = new RenderRegistry(options)

        const piniaTracker = registry.getPiniaTracker()
        expect(piniaTracker).toBeNull()
    })

    it('should not enable Pinia tracking by default', () => {
        const options: WhyDidYouRenderOptions = {
            include: [],
            exclude: [],
            logLevel: 'warn',
            logOnConsole: false,
        }
        const registry = new RenderRegistry(options)

        const piniaTracker = registry.getPiniaTracker()
        expect(piniaTracker).toBeNull()
    })
})
