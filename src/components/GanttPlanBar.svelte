<script lang="ts">
  /**
   * plan（実施予定枠）コンポーネント（issue #0028）
   *
   * バーの亜種として実装する（バーとplanは本質的には同じ「期間を表す矩形」であり、
   * クリック・リサイズ・ラベル表示の挙動を統一する）。schedule バーより背面に描画される。
   * schedule バーとの違いは見た目（枠のみの控えめなスタイル）と、更新対象が
   * node.start/end ではなく node.plan であること。
   */

  import type { DateTime } from 'luxon';
  import type { ComputedGanttNode } from '../types';
  import type { DragMode, DraggableTarget } from '../utils/drag-handler';

  export let node: ComputedGanttNode;
  export let x: number;
  export let y: number;
  export let planWidth: number;
  export let barHeight: number;
  export let classPrefix: string;
  export let handleSize: number;
  export let onBarClick: ((node: ComputedGanttNode, event: MouseEvent) => void) | undefined = undefined;
  export let onMouseDown: (target: DraggableTarget, mode: DragMode, event: MouseEvent) => void;
  /** ラベルのクリップ幅（issue #0028）。null なら全文表示、0 かつ hidden なら非表示 */
  export let labelClipWidth: number | null = null;
  export let labelHidden: boolean = false;

  // GanttTimeline.svelte は node.plan が存在する場合のみこのコンポーネントを描画する
  $: plan = node.plan as { start: DateTime; end: DateTime };
  $: planTarget = { id: node.id, start: plan.start, end: plan.end };
  $: labelClipId = `${classPrefix}-plan-label-clip-${node.id}`;
</script>

<g>
  <!-- plan 枠本体 -->
  <rect
    {x}
    y={y + 2}
    width={planWidth}
    height={barHeight + 4}
    rx="8"
    class="{classPrefix}-plan-frame {node.tentative ? classPrefix + '-plan-frame--tentative' : ''}"
    data-node-id={node.id}
    on:click={(e) => onBarClick?.(node, e)}
    on:mousedown={(e) => onMouseDown(planTarget, 'move', e)}
    role="button"
    tabindex="0"
  >
    <title>{node.name} (plan): {plan.start.toFormat('yyyy-MM-dd')} - {plan.end.toFormat('yyyy-MM-dd')}</title>
  </rect>

  <!-- plan のラベル（issue #0028: 他オブジェクトと重なる場合は優先度に応じてクリップされる） -->
  {#if !labelHidden}
    {#if labelClipWidth !== null}
      <clipPath id={labelClipId}>
        <rect x={x + 8} y={y} width={labelClipWidth} height={barHeight + 8} />
      </clipPath>
    {/if}
    <text
      x={x + 8}
      y={y + 4 + barHeight / 2}
      class="{classPrefix}-task-label {classPrefix}-plan-label {node.completed ? classPrefix + '-task-label--completed' : ''}"
      dominant-baseline="middle"
      pointer-events="none"
      clip-path={labelClipWidth !== null ? `url(#${labelClipId})` : undefined}
    >{node.name}</text>
  {/if}

  <!-- リサイズハンドル（左） -->
  <rect
    {x}
    y={y + 2}
    width={handleSize}
    height={barHeight + 4}
    class="{classPrefix}-resize-handle {classPrefix}-resize-handle--start {classPrefix}-plan-resize-handle"
    data-node-id={node.id}
    on:click={(e) => onBarClick?.(node, e)}
    on:mousedown={(e) => onMouseDown(planTarget, 'resize-start', e)}
    role="button"
    tabindex="0"
  >
    <title>plan開始日をリサイズ: {node.name}</title>
  </rect>

  <!-- リサイズハンドル（右） -->
  <rect
    x={x + planWidth - handleSize}
    y={y + 2}
    width={handleSize}
    height={barHeight + 4}
    class="{classPrefix}-resize-handle {classPrefix}-resize-handle--end {classPrefix}-plan-resize-handle"
    data-node-id={node.id}
    on:click={(e) => onBarClick?.(node, e)}
    on:mousedown={(e) => onMouseDown(planTarget, 'resize-end', e)}
    role="button"
    tabindex="0"
  >
    <title>plan終了日をリサイズ: {node.name}</title>
  </rect>
</g>
