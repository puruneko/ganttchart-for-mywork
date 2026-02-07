/**
 * Custom styling example
 * 
 * The library uses a class prefix system for easy customization
 */

// In your component or app CSS:
/*
:global(.custom-gantt-container) {
  font-family: 'Roboto', sans-serif;
  border: 2px solid #333;
  border-radius: 8px;
}

:global(.custom-gantt-bar--project) {
  fill: #ff6b6b;
  stroke: #c92a2a;
  stroke-width: 2;
}

:global(.custom-gantt-bar--section) {
  fill: #4ecdc4;
  stroke: #1a535c;
  stroke-width: 2;
}

:global(.custom-gantt-bar--task) {
  fill: #ffe66d;
  stroke: #f4a261;
  stroke-width: 1;
}

:global(.custom-gantt-tree-row:hover) {
  background: #f0f0f0;
}

:global(.custom-gantt-toggle) {
  color: #ff6b6b;
  font-weight: bold;
}
*/

// In your Svelte component:
/*
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  
  const nodes = [...];
</script>

<GanttChart 
  {nodes}
  config={{
    classPrefix: 'custom-gantt',  // Use custom prefix
    rowHeight: 60,
    dayWidth: 50,
    treePaneWidth: 400,
    indentSize: 30
  }}
/>
*/

export {};
