<script lang="ts">
  /**
   * タスクバーコンポーネント
   *
   * 通常タスクノードのSVGバー・ラベル・リサイズハンドルを描画する。
   */

  import type { ComputedGanttNode } from '../types';
  import type { DragMode } from '../utils/drag-handler';
  import { resolveTaskBarStyle } from '../utils/task-bar-style';

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
  /** ラベルのクリップ幅（issue #0028）。null なら全文表示、hidden なら非表示 */
  export let labelClipWidth: number | null = null;
  export let labelHidden: boolean = false;

  // issue-gantt-phase004-004: tentative（仮置き）・done（status）の描き分け
  $: ({ isDone, isTentative } = resolveTaskBarStyle(node));
  $: badgeSize = Math.min(barHeight, 16);
  // 極小バー対策: バー幅がバッジ2個分より狭ければ、tentative バッジをバー外右側に出す
  $: tentativeBadgeCx = barWidth < badgeSize * 2 + 8
    ? x + barWidth + badgeSize / 2 + 2
    : x + barWidth - badgeSize / 2 - 2;
  $: labelClipId = `${classPrefix}-bar-label-clip-${node.id}`;
</script>

<g>
  <!-- メインバー -->
  <rect
    {x}
    y={y + 4}
    width={barWidth}
    height={barHeight}
    class="{barClass} {node.isDateUnset ? classPrefix + '-bar--unset' : ''} {node.completed ? classPrefix + '-bar--completed' : ''} {node.status === 'done' ? classPrefix + '-bar--done' : ''} {isTentative ? classPrefix + '-bar--tentative' : ''}"
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

  <!-- タスク名と日付のラベル（issue #0028: 優先度の高いマイルストン等と重なる場合はクリップされる） -->
  {#if !labelHidden}
    {#if labelClipWidth !== null}
      <clipPath id={labelClipId}>
        <rect x={x + 8} y={y} width={labelClipWidth} height={barHeight + 8} />
      </clipPath>
    {/if}
    <text
      x={x + 8}
      y={y + 4 + barHeight / 2}
      class="{classPrefix}-task-label {node.isDateUnset ? classPrefix + '-task-label--unset' : ''} {node.completed ? classPrefix + '-task-label--completed' : ''}"
      dominant-baseline="middle"
      fill={labelColor}
      pointer-events="none"
      clip-path={labelClipWidth !== null ? `url(#${labelClipId})` : undefined}
    >
      {node.name} ({node.start.toFormat('yyyy/MM/dd')} - {node.end.toFormat('yyyy/MM/dd')})
    </text>
  {/if}

  <!-- done バッジ（✓）: バー左側 -->
  {#if isDone}
    <g class="{classPrefix}-done-badge" pointer-events="none">
      <circle cx={x + badgeSize / 2 + 2} cy={y + 4 + barHeight / 2} r={badgeSize / 2} class="{classPrefix}-done-badge-bg" />
      <path
        d="M {x + 2 + badgeSize * 0.28} {y + 4 + barHeight / 2} L {x + 2 + badgeSize * 0.45} {y + 4 + barHeight / 2 + badgeSize * 0.2} L {x + 2 + badgeSize * 0.72} {y + 4 + barHeight / 2 - badgeSize * 0.22}"
        fill="none"
        stroke="#fff"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
  {/if}

  <!-- tentative バッジ（?）: バー右端付近 -->
  {#if isTentative}
    <g class="{classPrefix}-tentative-badge" pointer-events="none">
      <circle cx={tentativeBadgeCx} cy={y + 4 + barHeight / 2} r={badgeSize / 2} class="{classPrefix}-tentative-badge-bg" />
      <text
        x={tentativeBadgeCx}
        y={y + 4 + barHeight / 2}
        class="{classPrefix}-tentative-badge-text"
        text-anchor="middle"
        dominant-baseline="central"
      >?</text>
    </g>
  {/if}

  <!-- リサイズハンドル（左） -->
  <rect
    {x}
    y={y + 4}
    width={handleSize}
    height={barHeight}
    class="{classPrefix}-resize-handle {classPrefix}-resize-handle--start"
    data-node-id={node.id}
    on:click={(e) => onBarClick?.(node, e)}
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
    on:click={(e) => onBarClick?.(node, e)}
    on:mousedown={(e) => onMouseDown(node, 'resize-end', e)}
    role="button"
    tabindex="0"
  >
    <title>終了日をリサイズ: {node.name}</title>
  </rect>
</g>
