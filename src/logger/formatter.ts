import { ComponentRenderEvent, RenderTrigger } from '../core/types'
import { getEventSeverity, shouldLog, LogLevel } from './levels'

export type { LogLevel } from './levels'

export class RenderFormatter {
    private maxDepth: number
    private maxStringLength: number

    constructor(maxDepth = 3, maxStringLength = 100) {
        this.maxDepth = maxDepth
        this.maxStringLength = maxStringLength
    }

    /**
     * Format render event for console output
     */
    format(event: ComponentRenderEvent): string[] {
        const lines: string[] = []

        // Header with badge indicator
        const hasNoOps = event.triggers.some(t => t.isNoOp)
        const badge = hasNoOps ? '⚠️' : '✅'
        lines.push(`${badge} [${event.componentName}] Re-rendered`)

        // Triggers section
        if (event.triggers.length > 0) {
            lines.push('  Triggers:')
            event.triggers.forEach(trigger => {
                lines.push(this.formatTrigger(trigger))
            })
        } else if (event.isInitialRender) {
            lines.push('  (Initial render)')
        } else {
            // Re-render with no captured triggers (Vue optimized away or unknown cause)
            lines.push('  (No triggers captured - possibly batched or parent re-render)')
        }

        // Analysis section
        const analysis = this.analyzeTriggers(event.triggers)
        if (analysis) {
            lines.push(...analysis)
        }

        return lines
    }

    /**
     * Format a single trigger entry
     */
    private formatTrigger(trigger: RenderTrigger): string {
        const icon = trigger.isNoOp ? '❌' : '✅'
        const typeStr = `[${trigger.source}:${trigger.type}]`
        const keyStr = trigger.key !== undefined ? String(trigger.key) : 'unknown'
        const valueChange = this.formatValueChange(trigger.oldValue, trigger.newValue)
        const note = trigger.isNoOp ? ' (NO-OP!)' : ''

        return `    ${icon} ${typeStr} "${keyStr}" ${valueChange}${note}`
    }

    /**
     * Format value change for display
     */
    private formatValueChange(oldVal: any, newVal: any): string {
        const oldStr = this.stringifyValue(oldVal)
        const newStr = this.stringifyValue(newVal)
        return `(${oldStr} → ${newStr})`
    }

    /**
     * Safely stringify value for display
     */
    private stringifyValue(val: any, depth = 0): string {
        // Depth limit
        if (depth > this.maxDepth) {
            return '[...]'
        }

        // Handle primitives
        if (val === undefined) return 'undefined'
        if (val === null) return 'null'

        if (typeof val === 'boolean') {
            return String(val)
        }

        if (typeof val === 'number') {
            return String(val)
        }

        // Handle strings
        if (typeof val === 'string') {
            const truncated =
                val.length > this.maxStringLength ? val.slice(0, this.maxStringLength) + '...' : val
            return `"${truncated}"`
        }

        // Handle functions
        if (typeof val === 'function') {
            return `[Function: ${val.name || 'anonymous'}]`
        }

        // Handle Vue Ref
        if (val && val.__v_isRef) {
            const valueStr = this.stringifyValue(val.value, depth + 1)
            return `Ref<${valueStr}>`
        }

        // Handle Vue Reactive
        if (val && val.__v_isReactive) {
            return 'Reactive<Object>'
        }

        // Handle Array
        if (Array.isArray(val)) {
            if (val.length === 0) return '[]'
            if (val.length > 3) return `Array(${val.length})`
            const items = val
                .slice(0, 3)
                .map(v => this.stringifyValue(v, depth + 1))
                .join(', ')
            return `[${items}]`
        }

        // Handle Objects
        if (typeof val === 'object') {
            const keys = Object.keys(val).slice(0, 3)
            if (keys.length === 0) return '{}'
            const keysStr = keys.join(', ')
            const hasMore = Object.keys(val).length > 3 ? ', ...' : ''
            return `{${keysStr}${hasMore}}`
        }

        // Fallback
        return String(val)
    }

    /**
     * Analyze triggers for insights
     */
    private analyzeTriggers(triggers: RenderTrigger[]): string[] | null {
        if (triggers.length === 0) return null

        const lines: string[] = []
        const noOpCount = triggers.filter(t => t.isNoOp).length

        // Warn about no-ops
        if (noOpCount > 0) {
            const plural = noOpCount !== 1 ? 's' : ''
            lines.push(`  ⚠️  Found ${noOpCount} no-op trigger${plural} (values unchanged)`)
        }

        // Breakdown by source
        const bySource = triggers.reduce(
            (acc, t) => {
                acc[t.source] = (acc[t.source] || 0) + 1
                return acc
            },
            {} as Record<string, number>
        )

        if (Object.keys(bySource).length > 1) {
            const sources = Object.entries(bySource)
                .map(([src, count]) => `${src}(${count})`)
                .join(', ')
            lines.push(`  Source breakdown: ${sources}`)
        }

        return lines.length > 0 ? lines : null
    }
}

/**
 * Create console logger function with log level filtering
 */
export function createConsoleLogger(formatter: RenderFormatter, logLevel: LogLevel = 'warn') {
    return (event: ComponentRenderEvent) => {
        // Determine event severity based on triggers
        const hasNoOps = event.triggers.some(t => t.isNoOp)
        const severity = getEventSeverity(hasNoOps, event.triggers.length)

        // Check if we should log based on configured level
        if (!shouldLog(severity, logLevel)) {
            return
        }

        const lines = formatter.format(event)

        // Use console.group for better readability if available
        if (typeof console.group === 'function') {
            console.group(...lines.slice(0, 1))
            console.log(lines.slice(1).join('\n'))
            console.groupEnd()
        } else {
            // Fallback for environments without console.group
            console.log(lines.join('\n'))
        }
    }
}
