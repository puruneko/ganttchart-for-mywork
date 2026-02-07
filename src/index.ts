/**
 * Public API for svelte-gantt-lib
 * 
 * This is the main entry point for the library.
 * Only exports what consumers need.
 */

// Main component
export { default as GanttChart } from './components/GanttChart.svelte';

// Type definitions
export type {
  GanttNode,
  GanttNodeType,
  GanttEventHandlers,
  GanttConfig,
  GanttChartProps,
  DateRange
} from './types';

// Utility functions (for advanced usage)
export {
  buildHierarchyMap,
  buildNodeMap,
  computeNodes,
  calculateDateRange,
  toggleNodeCollapse,
  updateNode
} from './core/data-manager';

// Store factory (for advanced usage or testing)
export { createGanttStore } from './core/gantt-store';
export type { GanttStore } from './core/gantt-store';
