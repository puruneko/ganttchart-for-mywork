<script lang="ts">
  /**
   * タイムラインコンポーネント - SVGガントバーを描画
   * 
   * Svelte 5対応:
   * - 明示的なpropsを使用（$$propsは不使用）
   * - 最小限のリアクティブ文
   * - ライフサイクルフックなし
   * - イベントハンドラーはpropsとして渡される
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
  
  // Props - Svelte 5互換性のため明示的
  /** 表示される（可視な）ノードの配列 */
  export let visibleNodes: ComputedGanttNode[];
  /** タイムラインの日付範囲 */
  export let dateRange: DateRange;
  /** 1日あたりの幅（ピクセル） */
  export let dayWidth: number;
  /** 各行の高さ（ピクセル） */
  export let rowHeight: number;
  /** CSSクラスのプレフィックス */
  export let classPrefix: string;
  /** バークリック時のハンドラー */
  export let onBarClick: ((node: ComputedGanttNode, event: MouseEvent) => void) | undefined = undefined;
  
  // 計算値 - Svelte 5では$derivedに変換される
  $: width = calculateTimelineWidth(dateRange, dayWidth);
  $: height = calculateTimelineHeight(visibleNodes.length, rowHeight);
  $: dateTicks = generateDateTicks(dateRange);
  
  /**
   * バークリックハンドラー
   */
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
  <!-- 背景グリッド -->
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
  
  <!-- ガントバー -->
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
  /* スコープスタイル - ライブラリは最小限のスタイルを提供 */
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
