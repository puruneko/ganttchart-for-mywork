/**
 * Advanced usage - Using the store directly
 * 
 * For advanced use cases, you can use the store factory directly
 * to have more control over the data flow.
 */

import { DateTime } from 'luxon';
import { createGanttStore } from '../src';
import type { GanttNode } from '../src';

// Create store instance
const nodes: GanttNode[] = [
  {
    id: '1',
    parentId: null,
    type: 'project',
    name: 'Advanced Project',
    start: DateTime.fromISO('2024-03-01'),
    end: DateTime.fromISO('2024-03-31')
  }
];

const ganttStore = createGanttStore(nodes, {
  mode: 'uncontrolled',
  rowHeight: 45,
  dayWidth: 35
});

// Subscribe to changes
ganttStore.visibleNodes.subscribe(nodes => {
  console.log('Visible nodes changed:', nodes.length);
});

ganttStore.dateRange.subscribe(range => {
  console.log('Date range:', range.start.toISODate(), '-', range.end.toISODate());
});

// Manually control the store
function collapseAll() {
  const currentNodes = ganttStore._getRawNodes();
  const collapsed = currentNodes.map(n => ({
    ...n,
    isCollapsed: true
  }));
  ganttStore.setNodes(collapsed);
}

function expandAll() {
  const currentNodes = ganttStore._getRawNodes();
  const expanded = currentNodes.map(n => ({
    ...n,
    isCollapsed: false
  }));
  ganttStore.setNodes(expanded);
}

// Use in Svelte component:
/*
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  import { ganttStore } from './my-store';
  
  // Access reactive stores
  $: nodes = $ganttStore.nodes;
  $: visible = $ganttStore.visibleNodes;
  
  function handleCustomAction() {
    // You have full control over the store
    ganttStore.setNodes([...]);
  }
</script>

<button on:click={collapseAll}>Collapse All</button>
<button on:click={expandAll}>Expand All</button>

<GanttChart 
  nodes={$ganttStore.nodes}
  config={$ganttStore.config}
/>
*/

export { ganttStore, collapseAll, expandAll };
