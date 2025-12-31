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
}

export interface ComponentRenderEvent {
    componentName: string
    componentId: string
    timestamp: number
    triggers: RenderTrigger[]
    tracked: Set<string | symbol>
    isInitialRender: boolean
    rerenderReason: 'initial' | 'prop-change' | 'state-change' | 'store-change'
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
}

export interface WhyDidYouRenderInstance {
    pause: () => void
    resume: () => void
    reset: () => void
    getStats: () => RenderStats
    configure: (options: Partial<WhyDidYouRenderOptions>) => void
}

export interface RenderStats {
    totalRenders: number
    byComponent: Record<string, number>
    mostExpensive: Array<{ component: string; count: number; avgMs: number }>
    noOpRenders: number
}
