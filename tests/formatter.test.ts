import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RenderFormatter, createConsoleLogger } from '../src/logger/formatter'
import type { ComponentRenderEvent, RenderTrigger } from '../src/core/types'

describe('RenderFormatter', () => {
    let formatter: RenderFormatter

    beforeEach(() => {
        formatter = new RenderFormatter(3, 100)
    })

    const createMockEvent = (
        overrides: Partial<ComponentRenderEvent> = {}
    ): ComponentRenderEvent => ({
        componentName: 'TestComponent',
        componentId: 'test-1',
        timestamp: Date.now(),
        triggers: [],
        tracked: new Set(),
        isInitialRender: false,
        rerenderReason: 'state-change',
        renderCount: 1,
        ...overrides,
    })

    const createMockTrigger = (overrides: Partial<RenderTrigger> = {}): RenderTrigger => ({
        key: 'count',
        type: 'set',
        oldValue: 1,
        newValue: 2,
        isNoOp: false,
        source: 'ref',
        path: 'count',
        ...overrides,
    })

    describe('format', () => {
        it('should format event with green check when no no-ops', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger()],
            })
            const lines = formatter.format(event)

            expect(lines[0]).toContain('✅')
            expect(lines[0]).toContain('[TestComponent]')
            expect(lines[0]).toContain('Re-rendered')
        })

        it('should format event with warning when has no-ops', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ isNoOp: true, oldValue: 5, newValue: 5 })],
            })
            const lines = formatter.format(event)

            expect(lines[0]).toContain('⚠️')
        })

        it('should show Mounted label for initial render', () => {
            const event = createMockEvent({ triggers: [], isInitialRender: true })
            const lines = formatter.format(event)

            expect(lines[0]).toContain('Mounted')
            expect(lines[0]).not.toContain('Re-rendered')
        })

        it('should show "no triggers captured" message when no triggers and isInitialRender is false', () => {
            const event = createMockEvent({ triggers: [], isInitialRender: false })
            const lines = formatter.format(event)

            expect(lines.some(l => l.includes('No triggers captured'))).toBe(true)
        })

        it('should include trigger details', () => {
            const event = createMockEvent({
                triggers: [
                    createMockTrigger({
                        key: 'isOpen',
                        oldValue: false,
                        newValue: true,
                        source: 'ref',
                        type: 'set',
                    }),
                ],
            })
            const lines = formatter.format(event)
            const triggerLine = lines.find(l => l.includes('isOpen'))

            expect(triggerLine).toBeDefined()
            expect(triggerLine).toContain('[ref:set]')
            expect(triggerLine).toContain('false')
            expect(triggerLine).toContain('true')
        })

        it('should mark no-op triggers with red X', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ isNoOp: true })],
            })
            const lines = formatter.format(event)
            const triggerLine = lines.find(l => l.includes('count'))

            expect(triggerLine).toContain('❌')
            expect(triggerLine).toContain('(UNCHANGED!)')
        })

        it('should show no-op warning count', () => {
            const event = createMockEvent({
                triggers: [
                    createMockTrigger({ key: 'a', isNoOp: true }),
                    createMockTrigger({ key: 'b', isNoOp: true }),
                ],
            })
            const lines = formatter.format(event)

            expect(lines.some(l => l.includes('2 unnecessary re-renders'))).toBe(true)
        })

        it('should show source breakdown for multiple sources', () => {
            const event = createMockEvent({
                triggers: [
                    createMockTrigger({ source: 'ref' }),
                    createMockTrigger({ source: 'reactive' }),
                    createMockTrigger({ source: 'ref' }),
                ],
            })
            const lines = formatter.format(event)

            expect(lines.some(l => l.includes('Source breakdown'))).toBe(true)
            expect(lines.some(l => l.includes('ref(2)'))).toBe(true)
            expect(lines.some(l => l.includes('reactive(1)'))).toBe(true)
        })
    })

    describe('value stringification', () => {
        it('should handle undefined', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ oldValue: undefined, newValue: 'test' })],
            })
            const lines = formatter.format(event)
            expect(lines.some(l => l.includes('undefined'))).toBe(true)
        })

        it('should handle null', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ oldValue: null, newValue: 'test' })],
            })
            const lines = formatter.format(event)
            expect(lines.some(l => l.includes('null'))).toBe(true)
        })

        it('should handle booleans', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ oldValue: false, newValue: true })],
            })
            const lines = formatter.format(event)
            expect(lines.some(l => l.includes('false') && l.includes('true'))).toBe(true)
        })

        it('should handle numbers', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ oldValue: 42, newValue: 100 })],
            })
            const lines = formatter.format(event)
            expect(lines.some(l => l.includes('42') && l.includes('100'))).toBe(true)
        })

        it('should truncate long strings', () => {
            const longString = 'a'.repeat(200)
            const shortFormatter = new RenderFormatter(3, 50)
            const event = createMockEvent({
                triggers: [createMockTrigger({ oldValue: '', newValue: longString })],
            })
            const lines = shortFormatter.format(event)
            expect(lines.some(l => l.includes('...'))).toBe(true)
        })

        it('should handle arrays', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ oldValue: [], newValue: [1, 2, 3] })],
            })
            const lines = formatter.format(event)
            expect(lines.some(l => l.includes('[1, 2, 3]'))).toBe(true)
        })

        it('should summarize large arrays', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ oldValue: [], newValue: [1, 2, 3, 4, 5, 6, 7] })],
            })
            const lines = formatter.format(event)
            expect(lines.some(l => l.includes('Array(7)'))).toBe(true)
        })

        it('should handle objects', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ oldValue: {}, newValue: { a: 1, b: 2 } })],
            })
            const lines = formatter.format(event)
            expect(lines.some(l => l.includes('{a, b}'))).toBe(true)
        })

        it('should handle functions', () => {
            const event = createMockEvent({
                triggers: [createMockTrigger({ oldValue: null, newValue: function myFunc() {} })],
            })
            const lines = formatter.format(event)
            expect(lines.some(l => l.includes('[Function: myFunc]'))).toBe(true)
        })
    })
})

describe('createConsoleLogger', () => {
    it('should create a logger function', () => {
        const formatter = new RenderFormatter()
        const logger = createConsoleLogger(formatter)
        expect(typeof logger).toBe('function')
    })

    it('should call console.group when available', () => {
        const formatter = new RenderFormatter()
        // Use 'verbose' level to ensure logging happens
        const logger = createConsoleLogger(formatter, 'verbose')

        const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

        const event: ComponentRenderEvent = {
            componentName: 'Test',
            componentId: '1',
            timestamp: Date.now(),
            triggers: [],
            tracked: new Set(),
            isInitialRender: true,
            rerenderReason: 'initial',
            renderCount: 1,
        }

        logger(event)

        expect(groupSpy).toHaveBeenCalled()
        expect(groupEndSpy).toHaveBeenCalled()

        groupSpy.mockRestore()
        logSpy.mockRestore()
        groupEndSpy.mockRestore()
    })

    it('should filter events based on log level', () => {
        const formatter = new RenderFormatter()
        // 'warn' level should filter out single-trigger events without no-ops
        const logger = createConsoleLogger(formatter, 'warn')

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})

        const event: ComponentRenderEvent = {
            componentName: 'Test',
            componentId: '1',
            timestamp: Date.now(),
            triggers: [
                {
                    key: 'count',
                    type: 'set',
                    oldValue: 1,
                    newValue: 2,
                    isNoOp: false,
                    source: 'ref',
                    path: 'count',
                },
            ],
            tracked: new Set(),
            isInitialRender: false,
            rerenderReason: 'state-change',
            renderCount: 1,
        }

        logger(event)

        // Single non-no-op trigger at 'warn' level should be filtered
        expect(groupSpy).not.toHaveBeenCalled()

        logSpy.mockRestore()
        groupSpy.mockRestore()
    })

    it('should log no-op events at warn level', () => {
        const formatter = new RenderFormatter()
        const logger = createConsoleLogger(formatter, 'warn')

        const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

        const event: ComponentRenderEvent = {
            componentName: 'Test',
            componentId: '1',
            timestamp: Date.now(),
            triggers: [
                {
                    key: 'count',
                    type: 'set',
                    oldValue: 5,
                    newValue: 5,
                    isNoOp: true,
                    source: 'ref',
                    path: 'count',
                },
            ],
            tracked: new Set(),
            isInitialRender: false,
            rerenderReason: 'state-change',
            renderCount: 1,
        }

        logger(event)

        // No-op events should be logged at 'warn' level
        expect(groupSpy).toHaveBeenCalled()

        groupSpy.mockRestore()
        logSpy.mockRestore()
        groupEndSpy.mockRestore()
    })
})

describe('RenderFormatter - Pinia store formatting', () => {
    let formatter: RenderFormatter

    beforeEach(() => {
        formatter = new RenderFormatter(3, 100)
    })

    const createMockEvent = (
        overrides: Partial<ComponentRenderEvent> = {}
    ): ComponentRenderEvent => ({
        componentName: 'TestComponent',
        componentId: 'test-1',
        timestamp: Date.now(),
        triggers: [],
        tracked: new Set(),
        isInitialRender: false,
        rerenderReason: 'state-change',
        renderCount: 1,
        ...overrides,
    })

    it('should format store state trigger with store name and property', () => {
        const event = createMockEvent({
            triggers: [
                {
                    key: 'loading',
                    type: 'set',
                    oldValue: true,
                    newValue: false,
                    isNoOp: false,
                    source: 'store',
                    path: 'services.loading',
                    storeId: 'services',
                    storePropName: 'loading',
                },
            ],
        })
        const lines = formatter.format(event)

        expect(lines.join('\n')).toContain('[store:services]')
        expect(lines.join('\n')).toContain('(state)')
        expect(lines.join('\n')).toContain('"loading"')
    })

    it('should format store getter trigger with store name and property', () => {
        const event = createMockEvent({
            triggers: [
                {
                    key: 'totalServices',
                    type: 'get',
                    oldValue: 55,
                    newValue: 55,
                    isNoOp: true,
                    source: 'store',
                    path: 'services.totalServices',
                    storeId: 'services',
                    storePropName: 'totalServices',
                },
            ],
        })
        const lines = formatter.format(event)

        expect(lines.join('\n')).toContain('[store:services]')
        expect(lines.join('\n')).toContain('(getter)')
        expect(lines.join('\n')).toContain('"totalServices"')
        expect(lines.join('\n')).toContain('UNCHANGED')
    })

    it('should fall back to regular formatting for non-store triggers', () => {
        const event = createMockEvent({
            triggers: [
                {
                    key: 'count',
                    type: 'set',
                    oldValue: 1,
                    newValue: 2,
                    isNoOp: false,
                    source: 'ref',
                    path: 'count',
                },
            ],
        })
        const lines = formatter.format(event)

        expect(lines.join('\n')).toContain('[ref:set]')
        expect(lines.join('\n')).toContain('"count"')
        expect(lines.join('\n')).not.toContain('[store:')
    })
})
