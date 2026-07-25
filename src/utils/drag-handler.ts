/**
 * ドラッグ操作ハンドラー
 *
 * GanttTimeline.svelteのドラッグ関連ロジックを集約する。
 * ドラッグ状態の管理とマウスイベントハンドラーを提供する。
 */

import { DateTime } from "luxon"
import { addBusinessDayOffset } from "./business-days"
import { computeUnscheduledRange } from "./unscheduled-schedule"
import type { RoundingUnit } from "./unscheduled-schedule"

export type DragMode = "move" | "resize-start" | "resize-end" | "group-move"

/**
 * ドラッグ対象が満たすべき最小限の形（issue #0028: plan・milestone のドラッグにも
 * 同じ createDragHandler を再利用できるよう、ComputedGanttNode 全体ではなく
 * id/start/end だけを要求する。ComputedGanttNode は構造的にこれを満たすため、
 * 既存の呼び出し側（バー・グループ背景等）は変更不要）。
 */
export interface DraggableTarget {
    id: string
    start: DateTime
    end: DateTime
}

interface DragState {
    nodeId: string
    mode: DragMode
    originalStart: DateTime
    originalEnd: DateTime
    startX: number
    lastAppliedDelta: number
    currentStart: DateTime
    currentEnd: DateTime
}

export interface DragHandlerDeps {
    getParams: () => {
        dayWidth: number
        snapUnit: number // ドラッグスナップ単位（ピクセル）
        hideWeekends?: boolean // 土日を詰めた軸でドラッグ計算するかどうか
        onBarDrag?: (
            nodeId: string,
            newStart: DateTime,
            newEnd: DateTime,
        ) => void
        onBarDragEnd?: (
            nodeId: string,
            finalStart: DateTime,
            finalEnd: DateTime,
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

        const { dayWidth, snapUnit, hideWeekends, onBarDrag, onGroupDrag } =
            deps.getParams()
        const deltaX = event.clientX - dragState.startX
        const snappedDelta = Math.round(deltaX / snapUnit) * snapUnit
        const daysDelta = snappedDelta / dayWidth

        const addDays = (date: DateTime, delta: number): DateTime =>
            hideWeekends ? addBusinessDayOffset(date, delta) : date.plus({ days: delta })

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
                newStart = addDays(dragState.originalStart, daysDelta)
                newEnd = addDays(dragState.originalEnd, daysDelta)
            } else if (dragState.mode === "resize-start") {
                newStart = addDays(dragState.originalStart, daysDelta)
                if (newStart >= dragState.originalEnd) {
                    newStart = addDays(dragState.originalEnd, -1)
                }
            } else if (dragState.mode === "resize-end") {
                newEnd = addDays(dragState.originalEnd, daysDelta)
                if (newEnd <= dragState.originalStart) {
                    newEnd = addDays(dragState.originalStart, 1)
                }
            }

            dragState.currentStart = newStart
            dragState.currentEnd = newEnd
            onBarDrag(dragState.nodeId, newStart, newEnd)
        }
    }

    function handleMouseUp(): void {
        if (dragState) {
            const { onBarDragEnd } = deps.getParams()
            onBarDragEnd?.(dragState.nodeId, dragState.currentStart, dragState.currentEnd)
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
        node: DraggableTarget,
        mode: DragMode,
        event: MouseEvent,
    ): void {
        // 左クリック以外（右クリック等）は何もしない。イベントをバブルさせ、
        // チャート全体の右クリックパン（スクロール）にゆだねる（issue #0025）。
        if (event.button !== 0) return

        event.preventDefault()
        event.stopPropagation()

        dragState = {
            nodeId: node.id,
            mode,
            originalStart: node.start,
            originalEnd: node.end,
            startX: event.clientX,
            lastAppliedDelta: 0,
            currentStart: node.start,
            currentEnd: node.end,
        }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
    }

    return { handleMouseDown }
}

// ----------------------------------------------------------------
// 期間なしサブタスク行のドラッグ予定化（issue-gantt-phase004-008）
// ----------------------------------------------------------------

interface UnscheduledDragState {
    nodeId: string
    anchor: DateTime
    startX: number
}

export interface UnscheduledDragParams {
    /** 1日あたりの幅（ピクセル） */
    dayWidth: number
    /** 週末を詰めた軸で計算するかどうか */
    hideWeekends?: boolean
    /** 現在のズームレベルの tick 定義における minorUnit（丸め粒度の判定に使う） */
    minorUnit: RoundingUnit
    /** 予定化時の既定期間長（分） */
    defaultDurationMinutes: number
    /** 日単位丸め時に使う開始時刻（時） */
    defaultStartHour: number
    /**
     * mouseup 位置がタイムライン表示領域内かどうかを判定する。
     * 未指定の場合は常に領域内とみなす（DOM 非依存を保つため呼び出し側が注入する）。
     */
    isWithinTimeline?: (event: MouseEvent) => boolean
    /** ドラッグ中（mousemove ごと）にゴースト位置を通知する */
    onGhostUpdate?: (nodeId: string, start: DateTime, end: DateTime) => void
    /** ドラッグ終了時（mouseup）にゴーストを消去する */
    onGhostClear?: (nodeId: string) => void
    /** タイムライン内でドロップされたときに 1 回だけ発火する */
    onSchedule?: (nodeId: string, start: DateTime, end: DateTime) => void
}

export interface UnscheduledDragHandlerDeps {
    getParams: () => UnscheduledDragParams
}

/**
 * 期間なしサブタスク行（テキスト行）用のドラッグハンドラーを生成する。
 *
 * 既存のバードラッグ（createDragHandler）と同じ「mousedown で開始し、
 * window の mousemove/mouseup で追跡する」イベント機構を踏襲する。
 * バードラッグと異なり、ノードデータ（start/end）はライブラリ内部で一切書き換えない。
 * ドラッグ中は onGhostUpdate でホスト側（コンポーネント内 $state）にゴースト位置のみ通知し、
 * ドロップ確定時に onSchedule を 1 回だけ発火する。
 */
export function createUnscheduledDragHandler(deps: UnscheduledDragHandlerDeps) {
    let dragState: UnscheduledDragState | null = null

    function computeCurrent(event: MouseEvent): { start: DateTime; end: DateTime } {
        const { dayWidth, hideWeekends, minorUnit, defaultStartHour, defaultDurationMinutes } =
            deps.getParams()
        const deltaX = event.clientX - dragState!.startX
        const daysDelta = deltaX / dayWidth
        return computeUnscheduledRange(
            dragState!.anchor,
            daysDelta,
            minorUnit,
            defaultStartHour,
            defaultDurationMinutes,
            !!hideWeekends,
        )
    }

    function handleMouseMove(event: MouseEvent): void {
        if (!dragState) return
        const { onGhostUpdate } = deps.getParams()
        const { start, end } = computeCurrent(event)
        onGhostUpdate?.(dragState.nodeId, start, end)
    }

    function handleMouseUp(event: MouseEvent): void {
        if (!dragState) return
        const { onSchedule, onGhostClear, isWithinTimeline } = deps.getParams()
        const nodeId = dragState.nodeId
        const inside = isWithinTimeline ? isWithinTimeline(event) : true

        if (inside) {
            const { start, end } = computeCurrent(event)
            onSchedule?.(nodeId, start, end)
        }
        onGhostClear?.(nodeId)

        dragState = null
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
    }

    function handleMouseDown(nodeId: string, anchor: DateTime, event: MouseEvent): void {
        // 左クリック以外は何もしない（issue #0025）。
        if (event.button !== 0) return

        event.preventDefault()
        event.stopPropagation()

        dragState = { nodeId, anchor, startX: event.clientX }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
    }

    return { handleMouseDown }
}
