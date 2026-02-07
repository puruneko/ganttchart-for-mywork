/**
 * svelte-gantt-lib のパブリックAPI
 * 
 * ライブラリのメインエントリーポイント。
 * 利用者が必要とするもののみをエクスポートする。
 */

// メインコンポーネント
export { default as GanttChart } from './components/GanttChart.svelte';
export { default as GanttDebugPanel } from './components/GanttDebugPanel.svelte';

// 型定義
export type {
  GanttNode,
  GanttNodeType,
  GanttEventHandlers,
  GanttConfig,
  GanttChartProps,
  DateRange
} from './types';

// ユーティリティ関数（高度な使用法向け）
export {
  buildHierarchyMap,
  buildNodeMap,
  computeNodes,
  calculateDateRange,
  toggleNodeCollapse,
  updateNode
} from './core/data-manager';

// ストアファクトリー（高度な使用法やテスト向け）
export { createGanttStore } from './core/gantt-store';
export type { GanttStore } from './core/gantt-store';
