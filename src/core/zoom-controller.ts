/**
 * ズーム操作コントローラー
 *
 * GanttChart.svelteのズーム関連ロジックを集約する。
 * ストアとの連携・dayWidth計算・スケール制限を管理する。
 */

import type { DateTime } from "luxon"
import {
    getDayWidthFromScale,
    getScaleFromDayWidth,
    ZOOM_SCALE_LIMITS,
} from "../utils/zoom-scale"
import type { GanttStore } from "./gantt-store"

/**
 * ズームコントローラーの依存注入
 */
export interface ZoomControllerDeps {
    store: GanttStore
    getTimelineWrapper: () => HTMLElement | null
    onZoomChange?: (scale: number) => void
}

/**
 * ズームコントローラーを生成する
 *
 * @param deps - 依存オブジェクト（ストア・要素ゲッター・外部コールバック）
 * @returns ズーム関連のハンドラーと状態更新関数
 */
export function createZoomController(deps: ZoomControllerDeps) {
    /**
     * ビューポート中心日付を計算する
     */
    function getCenterDate(
        extendedDateRangeStart: DateTime,
        currentDayWidth: number,
    ): DateTime | null {
        const el = deps.getTimelineWrapper()
        if (!el) return null
        const centerDays =
            el.scrollLeft / currentDayWidth + el.clientWidth / currentDayWidth / 2
        return extendedDateRangeStart.plus({ days: centerDays })
    }

    /**
     * タイムラインからのズーム変更を処理する
     * （ジェスチャー操作・ホイール操作から呼ばれる）
     */
    function handleTimelineZoom(
        scale: number,
        newDayWidth: number,
        extendedDateRangeStart: DateTime,
        currentDayWidth: number,
    ): void {
        const centerDate = getCenterDate(extendedDateRangeStart, currentDayWidth)

        const store = deps.store
        store.setZoomScale(scale)
        store.updateConfig({ dayWidth: newDayWidth })

        const el = deps.getTimelineWrapper()
        if (centerDate && el) {
            store.recalculateExtendedDateRange(
                centerDate,
                el.clientWidth,
                newDayWidth,
                scale,
                el,
            )
        }

        deps.onZoomChange?.(scale)
    }

    /**
     * ズームインボタンの処理
     */
    function zoomIn(
        currentZoomScale: number,
        extendedDateRangeStart: DateTime,
        currentDayWidth: number,
    ): number {
        const newScale = Math.min(
            currentZoomScale * 1.5,
            ZOOM_SCALE_LIMITS.max,
        )
        const newDayWidth = getDayWidthFromScale(newScale)

        const store = deps.store
        store.setZoomScale(newScale)
        store.updateConfig({ dayWidth: newDayWidth })

        const el = deps.getTimelineWrapper()
        if (el) {
            const centerDate = getCenterDate(extendedDateRangeStart, currentDayWidth)
            if (centerDate) {
                store.recalculateExtendedDateRange(
                    centerDate,
                    el.clientWidth,
                    newDayWidth,
                    newScale,
                    el,
                )
            }
        }

        deps.onZoomChange?.(newScale)
        return newScale
    }

    /**
     * ズームアウトボタンの処理
     */
    function zoomOut(
        currentZoomScale: number,
        extendedDateRangeStart: DateTime,
        currentDayWidth: number,
    ): number {
        const newScale = Math.max(
            currentZoomScale / 1.5,
            ZOOM_SCALE_LIMITS.min,
        )
        const newDayWidth = getDayWidthFromScale(newScale)

        const store = deps.store
        store.setZoomScale(newScale)
        store.updateConfig({ dayWidth: newDayWidth })

        const el = deps.getTimelineWrapper()
        if (el) {
            const centerDate = getCenterDate(extendedDateRangeStart, currentDayWidth)
            if (centerDate) {
                store.recalculateExtendedDateRange(
                    centerDate,
                    el.clientWidth,
                    newDayWidth,
                    newScale,
                    el,
                )
            }
        }

        deps.onZoomChange?.(newScale)
        return newScale
    }

    /**
     * ズームレベル表示値を計算する（1-5）
     * scale 1.0 → log2(1.0) = 0 → 0 + 3 = 3
     */
    function calcDisplayZoomLevel(scale: number): number {
        return Math.max(1, Math.min(5, Math.round(Math.log2(scale) + 3)))
    }

    /**
     * dayWidthからズームスケールを計算する（外部同期用）
     */
    function scaleFromDayWidth(dayWidth: number): number {
        return getScaleFromDayWidth(dayWidth)
    }

    return {
        handleTimelineZoom,
        zoomIn,
        zoomOut,
        calcDisplayZoomLevel,
        scaleFromDayWidth,
        ZOOM_SCALE_LIMITS,
    }
}
