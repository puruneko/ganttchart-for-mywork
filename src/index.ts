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
    GanttNodeStyle,
    GanttEventHandlers,
    GanttConfig,
    GanttChartProps,
    DateRange,
    SnapDurationMap,
    GanttUserEventType,
    GanttUserEventDetail,
    GanttUserEventDetailMap,
    GanttExternalDropEvent,
    GanttExternalDragOverEvent,
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

// ユーザーインタラクションイベントバス
export {
    GanttEventEmitter,
    createGanttEventEmitter,
} from "./core/gantt-event-emitter"

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

// ズームスケールユーティリティ
export { getTickDefinitionForScale, getSnapDays } from "./utils/zoom-scale"

// 日種別（週末・祝日）判定ユーティリティ
export { dayKind, buildHolidaySet, DEFAULT_WEEKEND_DAYS } from "./utils/day-kind"
export type { DayKind } from "./utils/day-kind"
