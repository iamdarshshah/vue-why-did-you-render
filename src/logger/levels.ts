/**
 * Log level type definition
 */
export type LogLevel = 'verbose' | 'warn' | 'error'

/**
 * Event severity level for routing to appropriate log level
 */
export type EventSeverity = 'always' | 'noOp' | 'info'

/**
 * Determine if an event should be logged based on configured log level
 */
export function shouldLog(eventSeverity: EventSeverity, configuredLevel: LogLevel): boolean {
    if (configuredLevel === 'verbose') {
        // Verbose: log everything
        return true
    }

    if (configuredLevel === 'warn') {
        // Warn: log no-ops and important events
        return eventSeverity === 'noOp' || eventSeverity === 'always'
    }

    if (configuredLevel === 'error') {
        // Error: only log critical events
        return eventSeverity === 'always'
    }

    return false
}

/**
 * Get severity level for a render event
 */
export function getEventSeverity(hasNoOps: boolean, triggerCount: number): EventSeverity {
    // No-op renders are most important to log
    if (hasNoOps) {
        return 'noOp'
    }

    // Multiple triggers or state changes are important
    if (triggerCount > 1) {
        return 'always'
    }

    // Single trigger is info level
    return 'info'
}

/**
 * Format log level for display
 */
export function formatLogLevel(level: LogLevel): string {
    switch (level) {
        case 'verbose':
            return '🔍 Verbose'
        case 'warn':
            return '⚠️  Warning'
        case 'error':
            return '❌ Error'
        default:
            return level
    }
}

/**
 * Get color code for console styling (if needed)
 */
export function getLogLevelColor(level: LogLevel): string {
    switch (level) {
        case 'verbose':
            return '#808080' // Gray
        case 'warn':
            return '#FFA500' // Orange
        case 'error':
            return '#FF0000' // Red
        default:
            return '#000000' // Black
    }
}

/**
 * Configuration for log levels
 */
export interface LogLevelConfig {
    level: LogLevel
    showTimestamp: boolean
    showComponentId: boolean
    groupByComponent: boolean
    maxEntriesPerComponent: number
}

/**
 * Default log level configuration
 */
export const DEFAULT_LOG_LEVEL_CONFIG: LogLevelConfig = {
    level: 'warn',
    showTimestamp: false,
    showComponentId: false,
    groupByComponent: true,
    maxEntriesPerComponent: 100,
}

/**
 * Logger with level management
 */
export class LevelManager {
    private config: LogLevelConfig

    constructor(config: Partial<LogLevelConfig> = {}) {
        this.config = {
            ...DEFAULT_LOG_LEVEL_CONFIG,
            ...config,
        }
    }

    /**
     * Check if should log based on event severity
     */
    shouldLog(eventSeverity: EventSeverity): boolean {
        return shouldLog(eventSeverity, this.config.level)
    }

    /**
     * Get current log level
     */
    getLevel(): LogLevel {
        return this.config.level
    }

    /**
     * Set new log level
     */
    setLevel(level: LogLevel): void {
        this.config.level = level
    }

    /**
     * Get full configuration
     */
    getConfig(): LogLevelConfig {
        return { ...this.config }
    }

    /**
     * Update configuration
     */
    updateConfig(partial: Partial<LogLevelConfig>): void {
        this.config = {
            ...this.config,
            ...partial,
        }
    }

    /**
     * Reset to defaults
     */
    reset(): void {
        this.config = { ...DEFAULT_LOG_LEVEL_CONFIG }
    }
}
