/**
 * ガントチャート用の状態管理
 *
 * Svelte 5移行を考慮した設計:
 * - writable storeを使用（$state runeに簡単に変換可能）
 * - 暗黙的リアクティビティではなく明示的な更新関数
 * - ライフサイクル依存なし
 * - Svelteコンポーネント外でも使用可能
 */

import { DateTime } from "luxon"
import { writable, derived, get } from "svelte/store"
import type { Writable, Readable } from "svelte/store"
import type {
    GanttNode,
    ComputedGanttNode,
    GanttConfig,
    DateRange,
    SnapDurationMap,
} from "../types"
import {
    computeNodes,
    getVisibleNodes,
    calculateDateRange,
    toggleNodeCollapse,
    autoAdjustSectionDates,
} from "./data-manager"
import { getTickDefinitionForScale } from "../utils/zoom-scale"
import { LifecycleEventEmitter } from "./lifecycle-events"

/**
 * デフォルト設定
 *
 * ガントチャートのデフォルト動作と見た目を定義。
 * ユーザーが設定を省略した場合にこれらの値が使用される。
 */
const DEFAULT_SNAP_DURATION_MAP: Required<SnapDurationMap> = {
    year: { weeks: 1 },
    month: { days: 1 },
    week: { days: 1 },
    day: { hours: 1 },
}

const DEFAULT_CONFIG: Required<GanttConfig> = {
    mode: "uncontrolled",
    rowHeight: 40,
    dayWidth: 30,
    treePaneWidth: 300,
    indentSize: 20,
    classPrefix: "gantt",
    showTreePane: true,
    width: "100%",
    height: "100%",
    snapDurationMap: DEFAULT_SNAP_DURATION_MAP,
    xOverscanPx: 500,
}

/**
 * ガントチャート状態管理用のストアファクトリー
 *
 * このパターンにより以下が可能:
 * 1. 複数の独立したインスタンスを作成可能
 * 2. Svelteコンテキストなしで簡単にテスト可能
 * 3. 将来のRune移行が容易（storeを$stateに置換）
 *
 * @param initialNodes - 初期ノード配列
 * @param initialConfig - 初期設定（部分的に指定可能）
 * @returns ストアオブジェクトとアクション関数
 */
export function createGanttStore(
    initialNodes: GanttNode[],
    initialConfig: Partial<GanttConfig> = {},
) {
    // ベースストア
    const nodes: Writable<GanttNode[]> = writable(initialNodes)
    const config: Writable<Required<GanttConfig>> = writable({
        ...DEFAULT_CONFIG,
        ...initialConfig,
        snapDurationMap: {
            ...DEFAULT_CONFIG.snapDurationMap,
            ...initialConfig.snapDurationMap,
        },
    })

    // ライフサイクルイベントエミッター
    const lifecycleEvents = new LifecycleEventEmitter()

    // 派生計算値
    // これらはSvelte 5で$derivedに簡単に変換可能
    const computedNodes: Readable<ComputedGanttNode[]> = derived(
        nodes,
        ($nodes) => computeNodes($nodes),
    )

    const visibleNodes: Readable<ComputedGanttNode[]> = derived(
        computedNodes,
        ($computed) => getVisibleNodes($computed),
    )

    const dateRange: Readable<DateRange> = derived(nodes, ($nodes) =>
        calculateDateRange($nodes),
    )

    // アクション（純粋関数、副作用なし）

    /**
     * ノードを設定
     *
     * 新しいノード配列でストアを更新。
     * Controlledモードで外部からデータを渡す際に使用。
     *
     * @param newNodes - 新しいノード配列
     */
    function setNodes(newNodes: GanttNode[]) {
        nodes.set(newNodes)
        console.debug(
            "📊 [GanttStore] Nodes updated:",
            newNodes.length,
            "nodes",
        )
    }

    /**
     * 設定を更新
     *
     * 部分的な設定変更を既存の設定にマージ。
     *
     * @param updates - 更新する設定項目（部分的に指定可能）
     */
    function updateConfig(updates: Partial<GanttConfig>) {
        config.update((current) => ({
            ...current,
            ...updates,
            snapDurationMap: {
                ...current.snapDurationMap,
                ...updates.snapDurationMap,
            },
        }))
    }

    /**
     * 折り畳み状態を切り替え
     *
     * Uncontrolledモードの場合のみ内部状態を更新。
     * Controlledモードでは新しいノード配列を返すだけで、
     * 実際の更新は外部で行う。
     *
     * @param nodeId - 切り替えるノードのID
     * @returns 更新された新しいノード配列（イベント通知用）
     */
    function toggleCollapse(nodeId: string): GanttNode[] {
        const currentNodes = get(nodes)
        const newNodes = toggleNodeCollapse(currentNodes, nodeId)

        // Uncontrolledモードの場合のみ更新
        const currentConfig = get(config)
        if (currentConfig.mode === "uncontrolled") {
            nodes.set(newNodes)
            console.debug("🔄 [GanttStore] Node collapsed toggled:", nodeId)
        }

        return newNodes // イベント通知用に返す
    }

    /**
     * IDでノードを取得
     *
     * 指定されたIDを持つノードを検索。
     *
     * @param nodeId - 検索するノードのID
     * @returns 見つかったノード、または undefined
     */
    function getNodeById(nodeId: string): GanttNode | undefined {
        const currentNodes = get(nodes)
        return currentNodes.find((n) => n.id === nodeId)
    }

    /**
     * セクション/サブセクションの日付を配下のタスクに合わせて自動調整
     *
     * Uncontrolledモードの場合のみ内部状態を更新。
     * Controlledモードでは新しいノード配列を返すだけで、
     * 実際の更新は外部で行う。
     *
     * @param nodeId - 調整するセクション/サブセクションのID
     * @returns 更新された新しいノード配列（イベント通知用）
     */
    function autoAdjustSection(nodeId: string): GanttNode[] {
        const currentNodes = get(nodes)
        const newNodes = autoAdjustSectionDates(currentNodes, nodeId)

        // Uncontrolledモードの場合のみ更新
        const currentConfig = get(config)
        if (currentConfig.mode === "uncontrolled") {
            nodes.set(newNodes)
            console.debug(
                "📅 [GanttStore] Section dates auto-adjusted:",
                nodeId,
            )
        }

        return newNodes // イベント通知用に返す
    }

    // 現在のズームスケールを保持するストア
    const zoomScale: Writable<number> = writable(1.0)

    // 拡張されたdateRange（スクロール領域に応じて動的に拡張）
    // 初期値: 安全なデフォルト値（initExtendedDateRangeで正しい値に更新される）
    const now = DateTime.now().startOf("day")
    const extendedDateRange: Writable<DateRange> = writable({
        start: now.minus({ days: 30 }),
        end: now.plus({ days: 60 }),
    })

    /**
     * 現在のTick定義に基づいて適切なバッファ日数を計算
     *
     * @param viewportDays - ビューポートに表示される日数
     * @param zoomScale - 現在のズームスケール
     * @returns 適切なバッファ日数
     */
    function calculateAdaptiveBuffer(
        viewportDays: number,
        zoomScale: number,
    ): number {
        // 現在のズームレベルに対応するTick定義を取得
        const tickDef = getTickDefinitionForScale(zoomScale)

        // minorIntervalから1単位の日数を計算
        const intervalDays = tickDef.minorInterval.as("days")

        // Tick単位ごとの適切な倍率を決定
        if (intervalDays < 1) {
            // 時間単位（1日未満） → 少なめ（ビューポート3倍 or Tick50単位分）、最大14日に制限
            return Math.min(
                14,
                Math.max(
                    Math.ceil(viewportDays * 3),
                    Math.ceil(intervalDays * 50),
                ),
            )
        } else if (intervalDays <= 7) {
            // 日単位（1-7日） → 中程度（ビューポート5倍 or Tick30単位分）
            return Math.max(
                Math.ceil(viewportDays * 5),
                Math.ceil(intervalDays * 30),
            )
        } else if (intervalDays <= 31) {
            // 週単位（8-31日） → 多め（ビューポート8倍 or Tick20単位分）
            return Math.max(
                Math.ceil(viewportDays * 8),
                Math.ceil(intervalDays * 20),
            )
        } else {
            // 月/年単位（32日以上） → さらに多め（ビューポート15倍 or Tick15単位分）
            return Math.max(
                Math.ceil(viewportDays * 15),
                Math.ceil(intervalDays * 15),
            )
        }
    }

    /**
     * 初期extendedDateRangeを広く設定
     *
     * @param containerWidth - 表示領域の幅（ピクセル）
     * @param dayWidth - 1日あたりの幅（ピクセル）
     * @param zoomScale - 現在のズームスケール
     */
    function initExtendedDateRange(
        containerWidth: number,
        dayWidth: number,
        zoomScale: number,
    ) {
        const currentDateRange = get(dateRange)

        // データの妥当性チェック
        if (!currentDateRange || !currentDateRange.start || !currentDateRange.end) {
            console.error(
                "[gantt-store] initExtendedDateRange: Invalid baseDateRange",
                currentDateRange,
            )
            return
        }

        // 無効な DateTime は修正する
        let start = currentDateRange.start
        let end = currentDateRange.end

        if (!start.isValid) {
            start = DateTime.now().startOf("day")
        }
        if (!end.isValid) {
            end = start.plus({ days: 30 })
        }

        const viewportDays = Math.ceil(containerWidth / dayWidth)
        const bufferDays = calculateAdaptiveBuffer(viewportDays, zoomScale)

        const extendedStart = start.minus({ days: bufferDays })
        const extendedEnd = end.plus({ days: bufferDays })

        extendedDateRange.set({
            start: extendedStart,
            end: extendedEnd,
        })
    }

    /**
     * スクロール端に近づいたら拡張dateRangeを拡張
     * ビューポート中心の日時を維持して表示飛びを防ぐ
     *
     * @param scrollLeft - スクロール位置（ピクセル）
     * @param containerWidth - 表示領域の幅（ピクセル）
     * @param dayWidth - 1日あたりの幅（ピクセル）
     * @param zoomScale - 現在のズームスケール
     * @returns 拡張が発生した場合はnewScrollLeft（同期的に設定すべき位置）、未拡張はnull
     */
    function expandExtendedDateRangeIfNeeded(
        scrollLeft: number,
        containerWidth: number,
        dayWidth: number,
        zoomScale: number,
    ): { expanded: boolean; newScrollLeft: number | null } {
        const current = get(extendedDateRange)
        const viewportDays = Math.ceil(containerWidth / dayWidth)
        const threshold = viewportDays * 0.5
        const bufferDays = calculateAdaptiveBuffer(viewportDays, zoomScale)

        const totalDays = current.end.diff(current.start, "days").days
        const scrollDays = scrollLeft / dayWidth
        const centerDays = scrollDays + viewportDays / 2
        const centerDate = current.start.plus({ days: centerDays })

        let needsExpansion = false
        let newStart = current.start
        let newEnd = current.end

        if (scrollDays < threshold) {
            newStart = current.start.minus({ days: bufferDays })
            needsExpansion = true
        }

        if (scrollDays > totalDays - threshold - viewportDays) {
            newEnd = current.end.plus({ days: bufferDays })
            needsExpansion = true
        }

        if (needsExpansion) {
            extendedDateRange.set({ start: newStart, end: newEnd })
            // スクロール位置補正値を計算して返す（実際の設定はUI層が行う）
            const newCenterDays = centerDate.diff(newStart, "days").days
            const newScrollDays = newCenterDays - viewportDays / 2
            return {
                expanded: true,
                newScrollLeft: Math.max(0, newScrollDays * dayWidth),
            }
        }

        return { expanded: false, newScrollLeft: null }
    }

    /**
     * ズーム変更時にextendedDateRangeを再計算（縮小含む）
     *
     * ズームイン時にtick数が爆発するのを防ぐため、新スケールに適したバッファ日数で範囲を再計算する。
     * ビューポート中心の日付を維持しながら範囲を調整する。
     *
     * @param centerDate - ビューポート中心の日付（維持対象）
     * @param containerWidth - 表示領域の幅（ピクセル）
     * @param newDayWidth - 新しい1日あたりの幅（ピクセル）
     * @param newZoomScale - 新しいズームスケール
     * @returns 次フレームで設定すべきスクロール位置
     */
    function recalculateExtendedDateRange(
        centerDate: DateTime,
        containerWidth: number,
        newDayWidth: number,
        newZoomScale: number,
    ): { newScrollLeft: number } {
        const currentDateRange = get(dateRange)

        if (!currentDateRange?.start?.isValid || !currentDateRange?.end?.isValid) {
            return { newScrollLeft: 0 }
        }

        const newViewportDays = containerWidth / newDayWidth
        const bufferDays = calculateAdaptiveBuffer(newViewportDays, newZoomScale)

        const viewBasedStart = centerDate.minus({ days: bufferDays })
        const viewBasedEnd = centerDate.plus({ days: bufferDays })

        const newStart = DateTime.min(
            currentDateRange.start.minus({ days: Math.ceil(bufferDays * 0.5) }),
            viewBasedStart,
        )
        const newEnd = DateTime.max(
            currentDateRange.end.plus({ days: Math.ceil(bufferDays * 0.5) }),
            viewBasedEnd,
        )

        extendedDateRange.set({ start: newStart, end: newEnd })

        // スクロール位置補正値を計算して返す（rAFによる設定はUI層が行う）
        const newCenterDays = centerDate.diff(newStart, "days").days
        const newScrollLeft = Math.max(0, newCenterDays * newDayWidth - containerWidth / 2)
        return { newScrollLeft }
    }

    return {
        // 読み取り専用ストア（購読可能）
        nodes: { subscribe: nodes.subscribe },
        config: { subscribe: config.subscribe },
        computedNodes: { subscribe: computedNodes.subscribe },
        visibleNodes: { subscribe: visibleNodes.subscribe },
        dateRange: { subscribe: dateRange.subscribe },
        extendedDateRange: { subscribe: extendedDateRange.subscribe },
        zoomScale: { subscribe: zoomScale.subscribe },

        // ライフサイクルイベントエミッター
        lifecycleEvents,

        // アクション関数
        setNodes,
        updateConfig,
        toggleCollapse,
        getNodeById,
        autoAdjustSectionDates: autoAdjustSection,
        setZoomScale: (scale: number) => zoomScale.set(scale),
        initExtendedDateRange,
        expandExtendedDateRangeIfNeeded,
        recalculateExtendedDateRange,

        // テストと外部アクセス用（プライベートメソッド）
        _getRawNodes: () => get(nodes),
        _getConfig: () => get(config),
    }
}

/**
 * ガントストアの型定義
 *
 * createGanttStore関数の戻り値の型。
 * TypeScriptの型推論により自動的に正確な型が得られる。
 */
export type GanttStore = ReturnType<typeof createGanttStore>
