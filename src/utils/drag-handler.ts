/**
 * ドラッグ操作ハンドラー
 *
 * GanttTimeline.svelteのドラッグ関連ロジックを集約する。
 * ドラッグ状態の管理とマウスイベントハンドラーを提供する。
 */

import { DateTime } from "luxon"
import type { ComputedGanttNode } from "../types"

export type DragMode = "move" | "resize-start" | "resize-end" | "group-move"

interface DragState {
    nodeId: string
    mode: DragMode
    originalStart: DateTime
    originalEnd: DateTime
    startX: number
    lastAppliedDelta: number
}

export interface DragHandlerDeps {
    getParams: () => {
        dayWidth: number
        snapUnit: number // ドラッグスナップ単位（ピクセル）
        onBarDrag?: (
            nodeId: string,
            newStart: DateTime,
            newEnd: DateTime,
        ) => void
        onGroupDrag?: (nodeId: string, daysDelta: number) => void
    }
}

/**
 * ドラッグハンドラーを生成する
 *
 * @param deps - 依存オブジェクト（パラメータゲッター）
 * @returns ドラッグ開始ハンドラー
 */
export function createDragHandler(deps: DragHandlerDeps) {
    let dragState: DragState | null = null

    function handleMouseMove(event: MouseEvent): void {
        if (!dragState) return

        const { dayWidth, snapUnit, onBarDrag, onGroupDrag } =
            deps.getParams()
        const deltaX = event.clientX - dragState.startX
        const snappedDelta = Math.round(deltaX / snapUnit) * snapUnit
        const daysDelta = snappedDelta / dayWidth

        if (dragState.mode === "group-move") {
            if (onGroupDrag && daysDelta !== dragState.lastAppliedDelta) {
                const deltaDiff = daysDelta - dragState.lastAppliedDelta
                onGroupDrag(dragState.nodeId, deltaDiff)
                dragState.lastAppliedDelta = daysDelta
            }
        } else if (onBarDrag) {
            let newStart = dragState.originalStart
            let newEnd = dragState.originalEnd

            if (dragState.mode === "move") {
                newStart = dragState.originalStart.plus({ days: daysDelta })
                newEnd = dragState.originalEnd.plus({ days: daysDelta })
            } else if (dragState.mode === "resize-start") {
                newStart = dragState.originalStart.plus({ days: daysDelta })
                if (newStart >= dragState.originalEnd) {
                    newStart = dragState.originalEnd.minus({ days: 1 })
                }
            } else if (dragState.mode === "resize-end") {
                newEnd = dragState.originalEnd.plus({ days: daysDelta })
                if (newEnd <= dragState.originalStart) {
                    newEnd = dragState.originalStart.plus({ days: 1 })
                }
            }

            onBarDrag(dragState.nodeId, newStart, newEnd)
        }
    }

    function handleMouseUp(): void {
        if (dragState) {
            console.debug(
                "🎯 [GanttTimeline] Drag completed:",
                dragState.mode,
                "for node",
                dragState.nodeId,
            )
        }
        dragState = null
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
    }

    function handleMouseDown(
        node: ComputedGanttNode,
        mode: DragMode,
        event: MouseEvent,
    ): void {
        event.preventDefault()
        event.stopPropagation()

        dragState = {
            nodeId: node.id,
            mode,
            originalStart: node.start,
            originalEnd: node.end,
            startX: event.clientX,
            lastAppliedDelta: 0,
        }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
    }

    return { handleMouseDown }
}
