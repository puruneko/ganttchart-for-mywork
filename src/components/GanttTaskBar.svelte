<script lang="ts">
  /**
   * タスクバーコンポーネント
   *
   * 通常タスクノードのSVGバー・ラベル・リサイズハンドルを描画する。
   */

  import type { ComputedGanttNode } from '../types';
  import type { DragMode } from '../utils/drag-handler';

  export let node: ComputedGanttNode;
  export let x: number;
  export let y: number;
  export let barWidth: number;
  export let barHeight: number;
  export let barClass: string;
  export let barRx: number;
  export let barFill: string | undefined = undefined;
  export let barStroke: string | undefined = undefined;
  export let barStrokeWidth: number | undefined = undefined;
  export let labelColor: string | undefined = undefined;
  export let classPrefix: string;
  export let handleSize: number;
  export let onBarClick: ((node: ComputedGanttNode, event: MouseEvent) => void) | undefined = undefined;
  export let onMouseDown: (node: ComputedGanttNode, mode: DragMode, event: MouseEvent) => void;
</script>

<g>
  <!-- メインバー -->
  <rect
    {x}
    y={y + 4}
    width={barWidth}
    height={barHeight}
    class="{barClass} {node.isDateUnset ? classPrefix + '-bar--unset' : ''}"
    rx={barRx}
    fill={barFill}
    stroke={barStroke}
    stroke-width={barStrokeWidth}
    data-node-id={node.id}
    data-node-type={node.type}
    on:click={(e) => onBarClick?.(node, e)}
    on:mousedown={(e) => onMouseDown(node, 'move', e)}
    role="button"
    tabindex="0"
  >
    <title>{node.name}: {node.start.toFormat('yyyy-MM-dd')} - {node.end.toFormat('yyyy-MM-dd')}{node.isDateUnset ? ' (日時未設定)' : ''}</title>
  </rect>

  <!-- タスク名と日付のラベル -->
  <text
    x={x + 8}
    y={y + 4 + barHeight / 2}
    class="{classPrefix}-task-label {node.isDateUnset ? classPrefix + '-task-label--unset' : ''}"
    dominant-baseline="middle"
    fill={labelColor}
    pointer-events="none"
  >
    {node.name} ({node.start.toFormat('yyyy/MM/dd')} - {node.end.toFormat('yyyy/MM/dd')})
  </text>

  <!-- リサイズハンドル（左） -->
  <rect
    {x}
    y={y + 4}
    width={handleSize}
    height={barHeight}
    class="{classPrefix}-resize-handle {classPrefix}-resize-handle--start"
    data-node-id={node.id}
    on:mousedown={(e) => onMouseDown(node, 'resize-start', e)}
    role="button"
    tabindex="0"
  >
    <title>開始日をリサイズ: {node.name}</title>
  </rect>

  <!-- リサイズハンドル（右） -->
  <rect
    x={x + barWidth - handleSize}
    y={y + 4}
    width={handleSize}
    height={barHeight}
    class="{classPrefix}-resize-handle {classPrefix}-resize-handle--end"
    data-node-id={node.id}
    on:mousedown={(e) => onMouseDown(node, 'resize-end', e)}
    role="button"
    tabindex="0"
  >
    <title>終了日をリサイズ: {node.name}</title>
  </rect>
</g>
