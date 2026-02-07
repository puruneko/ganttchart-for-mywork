/**
 * State management for Gantt chart
 * 
 * Design for Svelte 5 migration:
 * - Uses writable stores (easy to convert to $state runes)
 * - Explicit update functions instead of implicit reactivity
 * - No lifecycle dependencies
 * - Can be used outside Svelte components
 */

import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import type { GanttNode, ComputedGanttNode, GanttConfig, DateRange } from '../types';
import {
  computeNodes,
  getVisibleNodes,
  calculateDateRange,
  toggleNodeCollapse
} from './data-manager';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<GanttConfig> = {
  mode: 'controlled',
  rowHeight: 40,
  dayWidth: 30,
  treePaneWidth: 300,
  indentSize: 20,
  classPrefix: 'gantt'
};

/**
 * Store factory for Gantt chart state
 * 
 * This pattern allows:
 * 1. Multiple independent instances
 * 2. Easy testing without Svelte context
 * 3. Future migration to Runes (replace stores with $state)
 */
export function createGanttStore(
  initialNodes: GanttNode[],
  initialConfig: Partial<GanttConfig> = {}
) {
  // Base stores
  const nodes: Writable<GanttNode[]> = writable(initialNodes);
  const config: Writable<Required<GanttConfig>> = writable({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });
  
  // Derived computed values
  // These will easily convert to $derived in Svelte 5
  const computedNodes: Readable<ComputedGanttNode[]> = derived(
    nodes,
    $nodes => computeNodes($nodes)
  );
  
  const visibleNodes: Readable<ComputedGanttNode[]> = derived(
    computedNodes,
    $computed => getVisibleNodes($computed)
  );
  
  const dateRange: Readable<DateRange> = derived(
    nodes,
    $nodes => calculateDateRange($nodes)
  );
  
  // Actions (pure functions, no side effects)
  function setNodes(newNodes: GanttNode[]) {
    nodes.set(newNodes);
  }
  
  function updateConfig(updates: Partial<GanttConfig>) {
    config.update(current => ({ ...current, ...updates }));
  }
  
  function toggleCollapse(nodeId: string): GanttNode[] {
    const currentNodes = get(nodes);
    const newNodes = toggleNodeCollapse(currentNodes, nodeId);
    
    // Only update if in uncontrolled mode
    const currentConfig = get(config);
    if (currentConfig.mode === 'uncontrolled') {
      nodes.set(newNodes);
    }
    
    return newNodes; // Return for event notification
  }
  
  function getNodeById(nodeId: string): GanttNode | undefined {
    const currentNodes = get(nodes);
    return currentNodes.find(n => n.id === nodeId);
  }
  
  return {
    // Readable stores
    nodes: { subscribe: nodes.subscribe },
    config: { subscribe: config.subscribe },
    computedNodes: { subscribe: computedNodes.subscribe },
    visibleNodes: { subscribe: visibleNodes.subscribe },
    dateRange: { subscribe: dateRange.subscribe },
    
    // Actions
    setNodes,
    updateConfig,
    toggleCollapse,
    getNodeById,
    
    // For testing and external access
    _getRawNodes: () => get(nodes),
    _getConfig: () => get(config)
  };
}

export type GanttStore = ReturnType<typeof createGanttStore>;
