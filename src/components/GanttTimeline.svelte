<script lang="ts">
  /**
   * Timeline component - renders SVG gantt bars
   * 
   * Svelte 5 ready:
   * - Uses explicit props (not $$props)
   * - Minimal reactive statements
   * - No lifecycle hooks
   * - Event handlers passed as props
   */
  
  import type { ComputedGanttNode, DateRange } from '../types';
  import {
    dateToX,
    rowToY,
    durationToWidth,
    generateDateTicks,
    calculateTimelineWidth,
    calculateTimelineHeight,
    getBarClass
  } from '../utils/timeline-calculations';
  
  // Props - explicit for Svelte 5 compatibility
  export let visibleNodes: ComputedGanttNode[];
  export let dateRange: DateRange;
  export let dayWidth: number;
  export let rowHeight: number;
  export let classPrefix: string;
  export let onBarClick: ((node: ComputedGanttNode, event: MouseEvent) => void) | undefined = undefined;
  
  // Computed values - will convert to $derived in Svelte 5
  $: width = calculateTimelineWidth(dateRange, dayWidth);
  $: height = calculateTimelineHeight(visibleNodes.length, rowHeight);
  $: dateTicks = generateDateTicks(dateRange);
  
  function handleBarClick(node: ComputedGanttNode, event: MouseEvent) {
    if (onBarClick) {
      onBarClick(node, event);
    }
  }
</script>

<svg
  class="{classPrefix}-timeline"
  {width}
  {height}
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Background grid -->
  <g class="{classPrefix}-grid">
    {#each dateTicks as date}
      <line
        x1={dateToX(date, dateRange, dayWidth)}
        y1={0}
        x2={dateToX(date, dateRange, dayWidth)}
        y2={height}
        class="{classPrefix}-grid-line"
        stroke="#e0e0e0"
        stroke-width="1"
      />
    {/each}
  </g>
  
  <!-- Gantt bars -->
  <g class="{classPrefix}-bars">
    {#each visibleNodes as node (node.id)}
      {@const x = dateToX(node.start, dateRange, dayWidth)}
      {@const y = rowToY(node.visualIndex, rowHeight)}
      {@const barWidth = durationToWidth(node.start, node.end, dayWidth)}
      {@const barHeight = rowHeight - 8}
      {@const barClass = getBarClass(node.type, classPrefix)}
      
      <rect
        {x}
        y={y + 4}
        width={barWidth}
        height={barHeight}
        class={barClass}
        rx="4"
        data-node-id={node.id}
        data-node-type={node.type}
        on:click={(e) => handleBarClick(node, e)}
        role="button"
        tabindex="0"
      >
        <title>{node.name}: {node.start.toFormat('yyyy-MM-dd')} - {node.end.toFormat('yyyy-MM-dd')}</title>
      </rect>
    {/each}
  </g>
</svg>

<style>
  /* Scoped styles - library provides minimal styling */
  :global(.gantt-timeline) {
    display: block;
  }
  
  :global(.gantt-bar) {
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  :global(.gantt-bar:hover) {
    opacity: 0.8;
  }
  
  :global(.gantt-bar--project) {
    fill: #4a90e2;
  }
  
  :global(.gantt-bar--section) {
    fill: #50c878;
  }
  
  :global(.gantt-bar--subsection) {
    fill: #f5a623;
  }
  
  :global(.gantt-bar--task) {
    fill: #9b59b6;
  }
</style>
