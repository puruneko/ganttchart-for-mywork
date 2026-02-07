<script lang="ts">
  /**
   * Main Gantt Chart component
   * 
   * This is the primary public API.
   * 
   * Svelte 5 migration strategy:
   * - Store subscriptions will convert to $state
   * - Reactive statements will convert to $derived
   * - Event handlers are already explicit props
   * - No lifecycle hooks used
   */
  
  import type { GanttNode, GanttEventHandlers, GanttConfig, ComputedGanttNode } from '../types';
  import { createGanttStore } from '../core/gantt-store';
  import GanttTree from './GanttTree.svelte';
  import GanttTimeline from './GanttTimeline.svelte';
  import GanttHeader from './GanttHeader.svelte';
  
  // Public props
  export let nodes: GanttNode[];
  export let handlers: GanttEventHandlers = {};
  export let config: GanttConfig = {};
  
  // Create store instance
  // In Svelte 5, this entire store could be replaced with $state and $derived
  const store = createGanttStore(nodes, config);
  
  // Subscribe to store values
  // These will become simple $state references in Svelte 5
  $: store.setNodes(nodes); // Update when external nodes change (controlled mode)
  $: store.updateConfig(config);
  
  // Extract individual stores for subscription
  const { visibleNodes: visibleNodesStore, dateRange: dateRangeStore, config: configStore } = store;
  
  // Subscribe using $ syntax
  $: visibleNodes = $visibleNodesStore;
  $: dateRange = $dateRangeStore;
  $: chartConfig = $configStore;
  $: classPrefix = chartConfig.classPrefix;
  
  // Event handler wrappers
  // These bridge internal events to external handlers
  function handleNameClick(node: ComputedGanttNode, event: MouseEvent) {
    if (handlers.onNodeClick) {
      handlers.onNodeClick(node);
    }
    if (handlers.onNameClick) {
      handlers.onNameClick(node, event);
    }
  }
  
  function handleBarClick(node: ComputedGanttNode, event: MouseEvent) {
    if (handlers.onNodeClick) {
      handlers.onNodeClick(node);
    }
    if (handlers.onBarClick) {
      handlers.onBarClick(node, event);
    }
  }
  
  function handleToggleCollapse(nodeId: string) {
    const node = store.getNodeById(nodeId);
    if (!node) return;
    
    const newCollapsedState = !node.isCollapsed;
    
    // Notify external handler
    if (handlers.onToggleCollapse) {
      handlers.onToggleCollapse(nodeId, newCollapsedState);
    }
    
    // Toggle in store (will only apply in uncontrolled mode)
    const newNodes = store.toggleCollapse(nodeId);
    
    // Notify data change handler if in uncontrolled mode
    if (chartConfig.mode === 'uncontrolled' && handlers.onDataChange) {
      handlers.onDataChange(newNodes);
    }
  }
</script>

<div class="{classPrefix}-container">
  <div class="{classPrefix}-layout">
    <!-- Left pane: Tree -->
    <div class="{classPrefix}-left-pane">
      <div 
        class="{classPrefix}-tree-header"
        style="width: {chartConfig.treePaneWidth}px; height: 50px;"
      >
        <span class="{classPrefix}-tree-header-label">Tasks</span>
      </div>
      <div class="{classPrefix}-tree-wrapper">
        <GanttTree
          {visibleNodes}
          rowHeight={chartConfig.rowHeight}
          indentSize={chartConfig.indentSize}
          treePaneWidth={chartConfig.treePaneWidth}
          {classPrefix}
          onNameClick={handleNameClick}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>
    </div>
    
    <!-- Right pane: Timeline -->
    <div class="{classPrefix}-right-pane">
      <div class="{classPrefix}-timeline-header-wrapper">
        <GanttHeader
          {dateRange}
          dayWidth={chartConfig.dayWidth}
          {classPrefix}
        />
      </div>
      <div class="{classPrefix}-timeline-wrapper">
        <GanttTimeline
          {visibleNodes}
          {dateRange}
          dayWidth={chartConfig.dayWidth}
          rowHeight={chartConfig.rowHeight}
          {classPrefix}
          onBarClick={handleBarClick}
        />
      </div>
    </div>
  </div>
</div>

<style>
  :global(.gantt-container) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    border: 1px solid #ddd;
    background: white;
    overflow: hidden;
  }
  
  :global(.gantt-layout) {
    display: flex;
    height: 100%;
  }
  
  :global(.gantt-left-pane) {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
  
  :global(.gantt-tree-header) {
    border-right: 1px solid #ddd;
    border-bottom: 2px solid #ddd;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    padding: 0 16px;
    font-weight: 600;
    box-sizing: border-box;
  }
  
  :global(.gantt-tree-wrapper) {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  :global(.gantt-right-pane) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  :global(.gantt-timeline-header-wrapper) {
    overflow-x: auto;
    overflow-y: hidden;
  }
  
  :global(.gantt-timeline-wrapper) {
    flex: 1;
    overflow: auto;
  }
  
  /* Scrollbar sync styling */
  :global(.gantt-tree-wrapper),
  :global(.gantt-timeline-wrapper) {
    scrollbar-width: thin;
  }
</style>
