/**
 * svelte-gantt-lib のパブリックAPI
 *
 * ライブラリのメインエントリーポイント。
 * 利用者が必要とするもののみをエクスポートする。
 */

// メインコンポーネント
export { default as GanttChart } from "./components/GanttChart.svelte"

// 型定義
export type {
    GanttNode,
    GanttNodeType,
    GanttEventHandlers,
    GanttConfig,
    GanttChartProps,
    DateRange,
} from "./types"

// ライフサイクルイベント（ライブラリユーザー向け）
export {
    LifecycleEventEmitter,
    createLifecycleEventEmitter,
} from "./core/lifecycle-events"
export type {
    LifecycleEventDetail,
    LifecyclePhase,
} from "./core/lifecycle-events"

// ユーティリティ関数（高度な使用法向け）
export {
    buildHierarchyMap,
    buildNodeMap,
    computeNodes,
    calculateDateRange,
    toggleNodeCollapse,
    updateNode,
} from "./core/data-manager"

// ストアファクトリー（高度な使用法やテスト向け）
export { createGanttStore } from "./core/gantt-store"
export type { GanttStore } from "./core/gantt-store"
