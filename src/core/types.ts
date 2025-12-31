export type DebuggerEventType =
    | 'get'
    | 'has'
    | 'iterate'
    | 'set'
    | 'add'
    | 'delete'
    | 'clear'
    | 'change'

export interface DebuggerEvent {
    effect: any
    target: object
    type: DebuggerEventType
    key: string | symbol | undefined
    newValue?: any
    oldValue?: any
    oldTarget?: Map<any, any> | Set<any>
}

export interface RenderTrigger {
    key: string | symbol | undefined
    type: DebuggerEventType
    oldValue: any
    newValue: any
    isNoOp: boolean
    source: 'ref' | 'reactive' | 'computed' | 'store' | 'prop' | 'unknown'
    path: string
    /** Pinia store ID if this trigger came from a store */
    storeId?: string
    /** Property name in the Pinia store (e.g., 'totalServices', 'loading') */
    storePropName?: string
    /** Property type in the Pinia store ('state' or 'getter') */
    storePropType?: 'state' | 'getter' | 'action'
    /** For array mutations, the index that was modified */
    arrayIndex?: string | number
    /** Internal: Reference to computed ref for deferred value resolution */
    _computedRef?: any
}

export interface ComponentRenderEvent {
    componentName: string
    componentId: string
    timestamp: number
    triggers: RenderTrigger[]
    tracked: Set<string | symbol>
    isInitialRender: boolean
    rerenderReason: 'initial' | 'prop-change' | 'state-change' | 'store-change'
    /** How many times this component has re-rendered in this session */
    renderCount: number
}

export interface WhyDidYouRenderOptions {
    include?: (string | RegExp)[]
    exclude?: (string | RegExp)[]
    logLevel?: 'verbose' | 'warn' | 'error'
    logOnConsole?: boolean
    maxDepth?: number
    maxStringLength?: number
    pauseOnInit?: boolean
    groupUpdates?: boolean
    onRender?: (event: ComponentRenderEvent) => void
    enablePiniaTracking?: boolean
    enableDevtools?: boolean
    throttleMs?: number
    collectStackTrace?: boolean
    /** Enable debug logging for troubleshooting store property resolution */
    debug?: boolean
}

export interface WhyDidYouRenderInstance {
    pause: () => void
    resume: () => void
    reset: () => void
    getStats: () => RenderStats
    configure: (options: Partial<WhyDidYouRenderOptions>) => void
    /** Register a Pinia store for tracking (requires enablePiniaTracking: true) */
    registerStore: (store: any) => void
    /** Create a Pinia plugin that auto-registers all stores */
    createPiniaPlugin: () => (context: { store: any }) => void
}

export interface RenderStats {
    totalRenders: number
    byComponent: Record<string, number>
    mostExpensive: Array<{ component: string; count: number; avgMs: number }>
    noOpRenders: number
}
