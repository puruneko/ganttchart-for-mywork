<script lang="ts">
  /**
   * マイルストン（due）コンポーネント
   *
   * 一点なら ◆、期間指定なら始点・終点に ◆＋間を塗りつぶして描画する。
   * クリック可能（issue #0024）。期間指定の場合は左右の ◆ でリサイズ、
   * 中央の帯で移動できる。一点の場合は ◆ 自体をドラッグして移動できる（issue #0028）。
   */

  import type { DateTime } from 'luxon';
  import type { ComputedGanttNode, DateRange } from '../types';
  import { dateToX } from '../utils/timeline-calculations';
  import type { DragMode, DraggableTarget } from '../utils/drag-handler';

  export let node: ComputedGanttNode;
  export let milestone: DateTime | { start: DateTime; end: DateTime };
  export let dateRange: DateRange;
  export let dayWidth: number;
  export let hideWeekends: boolean;
  export let y: number;
  export let rowHeight: number;
  export let classPrefix: string;
  export let tentative: boolean = false;
  /** マイルストンクリック時のハンドラー（issue #0024: 外部アプリ連携対応） */
  export let onBarClick: ((node: ComputedGanttNode, event: MouseEvent) => void) | undefined = undefined;
  /** マイルストンのドラッグ（移動・リサイズ）ハンドラー（issue #0028） */
  export let onMouseDown: ((target: DraggableTarget, mode: DragMode, event: MouseEvent) => void) | undefined = undefined;
  /** ラベルのクリップ幅（issue #0028）。null なら全文表示、hidden なら非表示 */
  export let labelClipWidth: number | null = null;
  export let labelHidden: boolean = false;

  $: isPeriod = typeof milestone === 'object' && 'start' in milestone && 'end' in milestone;
  $: diamondSize = Math.round(rowHeight * 0.65);
  $: centerY = y + rowHeight / 2;

  function diamondPoints(cx: number, cy: number, size: number): string {
    const half = size / 2;
    return `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;
  }

  $: pointX = !isPeriod ? dateToX(milestone as DateTime, dateRange, dayWidth, hideWeekends) : 0;
  $: startX = isPeriod ? dateToX((milestone as { start: DateTime }).start, dateRange, dayWidth, hideWeekends) : 0;
  $: endX = isPeriod ? dateToX((milestone as { end: DateTime }).end, dateRange, dayWidth, hideWeekends) : 0;

  // ドラッグ対象の日時（一点の場合は start === end。move 時はどちらも同量シフトされる）
  $: pointTarget = { id: node.id, start: milestone as DateTime, end: milestone as DateTime };
  $: periodStart = isPeriod ? (milestone as { start: DateTime }).start : (milestone as DateTime);
  $: periodEnd = isPeriod ? (milestone as { end: DateTime }).end : (milestone as DateTime);
  $: periodTarget = { id: node.id, start: periodStart, end: periodEnd };

  $: labelAnchorX = (isPeriod ? endX : pointX) + diamondSize / 2 + 4;
  $: labelClipId = `${classPrefix}-milestone-label-clip-${node.id}`;

  // ドラッグ後（issue #0028）に <title> ツールチップが古い日時のまま更新されない不具合の修正:
  // 以前は formatLabel() が milestone を閉じ込めた「素の関数」だったため、Svelte の
  // テンプレート依存解析がテキスト内容の再評価を milestone の変化に正しく紐付けられず、
  // 図形の位置（$: startX 等）は更新されてもツールチップだけが古い値のまま残っていた。
  // $: の代入式にすることで、他のジオメトリと同様に milestone の変化を確実に追跡させる。
  $: formattedLabel = isPeriod
    ? `${(milestone as { start: DateTime }).start.toFormat('yyyy-MM-dd')} 〜 ${(milestone as { end: DateTime }).end.toFormat('yyyy-MM-dd')}`
    : (milestone as DateTime).toFormat('yyyy-MM-dd HH:mm');
</script>

<g
  class="{classPrefix}-milestone {tentative ? classPrefix + '-milestone--tentative' : ''}"
  data-node-id={node.id}
  on:click={(e) => onBarClick?.(node, e)}
  role="button"
  tabindex="0"
>
  {#if isPeriod}
    <rect
      x={Math.min(startX, endX)}
      y={centerY - diamondSize / 4}
      width={Math.abs(endX - startX)}
      height={diamondSize / 2}
      class="{classPrefix}-milestone-fill"
      on:mousedown={(e) => onMouseDown?.(periodTarget, 'move', e)}
      role="button"
      tabindex="0"
    />
    <polygon
      points={diamondPoints(startX, centerY, diamondSize)}
      class="{classPrefix}-milestone-diamond {classPrefix}-milestone-diamond--start"
      on:mousedown={(e) => onMouseDown?.(periodTarget, 'resize-start', e)}
      role="button"
      tabindex="0"
    >
      <title>{formattedLabel}</title>
    </polygon>
    <polygon
      points={diamondPoints(endX, centerY, diamondSize)}
      class="{classPrefix}-milestone-diamond {classPrefix}-milestone-diamond--end"
      on:mousedown={(e) => onMouseDown?.(periodTarget, 'resize-end', e)}
      role="button"
      tabindex="0"
    >
      <title>{formattedLabel}</title>
    </polygon>
  {:else}
    <polygon
      points={diamondPoints(pointX, centerY, diamondSize)}
      class="{classPrefix}-milestone-diamond {classPrefix}-milestone-diamond--movable"
      on:mousedown={(e) => onMouseDown?.(pointTarget, 'move', e)}
      role="button"
      tabindex="0"
    >
      <title>{formattedLabel}</title>
    </polygon>
  {/if}

  <!-- マイルストンのラベル（issue #0028: 最優先のため他オブジェクトにクリップされることはない） -->
  {#if !labelHidden}
    {#if labelClipWidth !== null}
      <clipPath id={labelClipId}>
        <rect x={labelAnchorX} y={y} width={labelClipWidth} height={rowHeight} />
      </clipPath>
    {/if}
    <text
      x={labelAnchorX}
      y={centerY}
      class="{classPrefix}-task-label {classPrefix}-milestone-label {node.completed ? classPrefix + '-task-label--completed' : ''}"
      dominant-baseline="middle"
      pointer-events="none"
      clip-path={labelClipWidth !== null ? `url(#${labelClipId})` : undefined}
    >{node.name}</text>
  {/if}
</g>

<style>
  :global(.gantt-milestone-diamond) {
    fill: var(--gantt-milestone-fill, #e67e22);
    stroke: var(--gantt-milestone-stroke, #b9590a);
    stroke-width: 1.5;
    cursor: pointer;
  }

  :global(.gantt-milestone-diamond--movable) {
    cursor: move;
  }

  :global(.gantt-milestone-diamond--start) {
    cursor: w-resize;
  }

  :global(.gantt-milestone-diamond--end) {
    cursor: e-resize;
  }

  :global(.gantt-milestone-fill) {
    fill: var(--gantt-milestone-range-fill, rgba(230, 126, 34, 0.18));
    cursor: move;
  }

  :global(.gantt-milestone--tentative) {
    opacity: 0.5;
  }

  :global(.gantt-milestone-label) {
    fill: var(--gantt-milestone-fill, #e67e22);
  }
</style>
