/**
 * GanttEventEmitter のテスト
 *
 * Issue #0017: 公開イベントバスの追加
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DateTime } from 'luxon'
import { GanttEventEmitter, createGanttEventEmitter } from '../../src/core/gantt-event-emitter'
import { createGanttStore } from '../../src/core/gantt-store'
import type { GanttNode } from '../../src/types'

// ---- ヘルパー ----

function makeNode(): GanttNode {
    return {
        id: 'node-1',
        parentId: null,
        type: 'task',
        name: 'テストタスク',
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-10'),
    }
}

// ---- GanttEventEmitter 単体テスト ----

describe('GanttEventEmitter', () => {
    let emitter: GanttEventEmitter

    beforeEach(() => {
        emitter = new GanttEventEmitter()
    })

    // --- emit / on ---

    describe('emit / on', () => {
        it('on() で登録したハンドラーが emit() で呼ばれる', () => {
            const handler = vi.fn()
            emitter.on('zoomChange', handler)
            emitter.emit('zoomChange', { zoomLevel: 1.5 })
            expect(handler).toHaveBeenCalledOnce()
        })

        it('emit した detail が event.detail に渡される', () => {
            const handler = vi.fn()
            emitter.on('zoomChange', handler)
            emitter.emit('zoomChange', { zoomLevel: 2.0 })
            expect(handler.mock.calls[0][0].detail).toEqual({ zoomLevel: 2.0 })
        })

        it('同じイベントに複数のリスナーを登録できる', () => {
            const h1 = vi.fn()
            const h2 = vi.fn()
            emitter.on('zoomChange', h1)
            emitter.on('zoomChange', h2)
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            expect(h1).toHaveBeenCalledOnce()
            expect(h2).toHaveBeenCalledOnce()
        })

        it('複数回 emit されるたびにハンドラーが呼ばれる', () => {
            const handler = vi.fn()
            emitter.on('zoomChange', handler)
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            emitter.emit('zoomChange', { zoomLevel: 2.0 })
            expect(handler).toHaveBeenCalledTimes(2)
        })

        it('異なるイベント種別のリスナーは互いに干渉しない', () => {
            const zoomHandler = vi.fn()
            const panHandler = vi.fn()
            emitter.on('zoomChange', zoomHandler)
            emitter.on('panStart', panHandler)
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            expect(zoomHandler).toHaveBeenCalledOnce()
            expect(panHandler).not.toHaveBeenCalled()
        })
    })

    // --- on() の購読解除 ---

    describe('on() 購読解除', () => {
        it('on() の戻り値を呼ぶとリスナーが削除される', () => {
            const handler = vi.fn()
            const unsub = emitter.on('zoomChange', handler)
            unsub()
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            expect(handler).not.toHaveBeenCalled()
        })

        it('購読解除後も他のリスナーは動作する', () => {
            const h1 = vi.fn()
            const h2 = vi.fn()
            const unsub = emitter.on('zoomChange', h1)
            emitter.on('zoomChange', h2)
            unsub()
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            expect(h1).not.toHaveBeenCalled()
            expect(h2).toHaveBeenCalledOnce()
        })
    })

    // --- once ---

    describe('once', () => {
        it('once() で登録したハンドラーは1回だけ呼ばれる', () => {
            const handler = vi.fn()
            emitter.once('zoomChange', handler)
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            emitter.emit('zoomChange', { zoomLevel: 2.0 })
            expect(handler).toHaveBeenCalledOnce()
        })

        it('once() の detail は正しく渡される', () => {
            const handler = vi.fn()
            emitter.once('zoomChange', handler)
            emitter.emit('zoomChange', { zoomLevel: 3.0 })
            expect(handler.mock.calls[0][0].detail).toEqual({ zoomLevel: 3.0 })
        })
    })

    // --- onAny ---

    describe('onAny', () => {
        it('onAny() は全イベントを受信する', () => {
            const handler = vi.fn()
            emitter.onAny(handler)
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            emitter.emit('panStart', { startX: 100, startY: 200 })
            expect(handler).toHaveBeenCalledTimes(2)
        })

        it('onAny() の detail に type フィールドが含まれる', () => {
            const handler = vi.fn()
            emitter.onAny(handler)
            emitter.emit('zoomChange', { zoomLevel: 1.5 })
            const detail = handler.mock.calls[0][0].detail
            expect(detail.type).toBe('zoomChange')
        })

        it('onAny() の戻り値で購読解除できる', () => {
            const handler = vi.fn()
            const unsub = emitter.onAny(handler)
            unsub()
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            expect(handler).not.toHaveBeenCalled()
        })
    })

    // --- off ---

    describe('off', () => {
        it('off() でリスナーを削除できる', () => {
            const handler = vi.fn()
            emitter.on('zoomChange', handler)
            emitter.off('zoomChange', handler)
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            expect(handler).not.toHaveBeenCalled()
        })
    })

    // --- dispose ---

    describe('dispose', () => {
        it('dispose() 後は emit が無視される', () => {
            const handler = vi.fn()
            emitter.on('zoomChange', handler)
            emitter.dispose()
            emitter.emit('zoomChange', { zoomLevel: 1.0 })
            expect(handler).not.toHaveBeenCalled()
        })
    })

    // --- createGanttEventEmitter ファクトリ ---

    describe('createGanttEventEmitter', () => {
        it('GanttEventEmitter インスタンスを返す', () => {
            const e = createGanttEventEmitter()
            expect(e).toBeInstanceOf(GanttEventEmitter)
        })
    })

    // --- 各イベント型の detail 検証 ---

    describe('各イベント型の detail', () => {
        const node = makeNode()

        it('nodeClick: node が渡される', () => {
            const handler = vi.fn()
            emitter.on('nodeClick', handler)
            emitter.emit('nodeClick', { node })
            expect(handler.mock.calls[0][0].detail.node).toBe(node)
        })

        it('barDrag: nodeId / newStart / newEnd が渡される', () => {
            const handler = vi.fn()
            emitter.on('barDrag', handler)
            const newStart = DateTime.fromISO('2024-02-01')
            const newEnd = DateTime.fromISO('2024-02-10')
            emitter.emit('barDrag', { nodeId: 'n1', newStart, newEnd })
            const detail = handler.mock.calls[0][0].detail
            expect(detail.nodeId).toBe('n1')
            expect(detail.newStart).toBe(newStart)
            expect(detail.newEnd).toBe(newEnd)
        })

        it('barDragEnd: nodeId / finalStart / finalEnd が渡される', () => {
            const handler = vi.fn()
            emitter.on('barDragEnd', handler)
            const finalStart = DateTime.fromISO('2024-03-01')
            const finalEnd = DateTime.fromISO('2024-03-10')
            emitter.emit('barDragEnd', { nodeId: 'n2', finalStart, finalEnd })
            const detail = handler.mock.calls[0][0].detail
            expect(detail.nodeId).toBe('n2')
            expect(detail.finalStart).toBe(finalStart)
            expect(detail.finalEnd).toBe(finalEnd)
        })

        it('panStart: startX / startY が渡される', () => {
            const handler = vi.fn()
            emitter.on('panStart', handler)
            emitter.emit('panStart', { startX: 123, startY: 456 })
            const detail = handler.mock.calls[0][0].detail
            expect(detail.startX).toBe(123)
            expect(detail.startY).toBe(456)
        })

        it('panEnd: detail は空オブジェクト', () => {
            const handler = vi.fn()
            emitter.on('panEnd', handler)
            emitter.emit('panEnd', {})
            expect(handler).toHaveBeenCalledOnce()
        })

        it('toggleCollapse: nodeId / newCollapsedState が渡される', () => {
            const handler = vi.fn()
            emitter.on('toggleCollapse', handler)
            emitter.emit('toggleCollapse', { nodeId: 'n3', newCollapsedState: true })
            const detail = handler.mock.calls[0][0].detail
            expect(detail.nodeId).toBe('n3')
            expect(detail.newCollapsedState).toBe(true)
        })

        it('dataChange: nodes 配列が渡される', () => {
            const handler = vi.fn()
            emitter.on('dataChange', handler)
            emitter.emit('dataChange', { nodes: [node] })
            expect(handler.mock.calls[0][0].detail.nodes).toHaveLength(1)
        })

        it('groupDrag: nodeId / daysDelta が渡される', () => {
            const handler = vi.fn()
            emitter.on('groupDrag', handler)
            emitter.emit('groupDrag', { nodeId: 'g1', daysDelta: 3 })
            const detail = handler.mock.calls[0][0].detail
            expect(detail.nodeId).toBe('g1')
            expect(detail.daysDelta).toBe(3)
        })

        it('autoAdjustSection: nodeId が渡される', () => {
            const handler = vi.fn()
            emitter.on('autoAdjustSection', handler)
            emitter.emit('autoAdjustSection', { nodeId: 's1' })
            expect(handler.mock.calls[0][0].detail.nodeId).toBe('s1')
        })
    })
})

// ---- GanttStore 統合テスト ----

describe('createGanttStore - events プロパティ', () => {
    it('store.events が GanttEventEmitter インスタンスである', () => {
        const store = createGanttStore([])
        expect(store.events).toBeInstanceOf(GanttEventEmitter)
    })

    it('store.events.on() でイベントを購読できる', () => {
        const store = createGanttStore([])
        const handler = vi.fn()
        store.events.on('zoomChange', handler)
        store.events.emit('zoomChange', { zoomLevel: 2.0 })
        expect(handler).toHaveBeenCalledOnce()
    })

    it('store ごとに独立した events インスタンスを持つ', () => {
        const store1 = createGanttStore([])
        const store2 = createGanttStore([])
        expect(store1.events).not.toBe(store2.events)
    })
})
