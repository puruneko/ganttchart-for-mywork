<script lang="ts">
  /**
   * セクション/サブセクション/プロジェクトバーコンポーネント
   *
   * セクション系ノードのSVGバー・ラベル・リサイズハンドル・自動調整ボタンを描画する。
   */

  import type { ComputedGanttNode } from '../types';
  import type { DragMode } from '../utils/drag-handler';

  export let node: ComputedGanttNode;
  export let x: number;
  export let y: number;
  export let barWidth: number;
  export let rowHeight: number;
  export let classPrefix: string;
  export let handleSize: number;
  export let onBarClick: ((node: ComputedGanttNode, event: MouseEvent) => void) | undefined = undefined;
  export let onMouseDown: (node: ComputedGanttNode, mode: DragMode, event: MouseEvent) => void;
  export let onAutoAdjustSection: ((nodeId: string) => void) | undefined = undefined;

  $: sectionBarHeight = 20;
  $: sectionBarY = y + (rowHeight - sectionBarHeight) / 2;
  $: iconSize = 16;
  $: iconX = x + barWidth - handleSize - iconSize - 4;
</script>

<g>
  <!-- セクションバー：全体を濃い色で塗りつぶし -->
  <rect
    {x}
    y={sectionBarY}
    width={barWidth}
    height={sectionBarHeight}
    class="{classPrefix}-section-bar-full {classPrefix}-section-bar-full--{node.type}"
    rx="2"
    data-node-id={node.id}
    data-node-type={node.type}
    on:click={(e) => onBarClick?.(node, e)}
    on:mousedown={(e) => onMouseDown(node, 'move', e)}
    role="button"
    tabindex="0"
  >
    <title>{node.name}: {node.start.toFormat('yyyy-MM-dd')} - {node.end.toFormat('yyyy-MM-dd')}</title>
  </rect>

  <!-- セクション/プロジェクト名と日付のラベル -->
  <text
    x={x + 8}
    y={sectionBarY + sectionBarHeight / 2}
    class="{classPrefix}-section-label"
    dominant-baseline="middle"
    pointer-events="none"
  >
    {node.name} ({node.start.toFormat('yyyy/MM/dd')} - {node.end.toFormat('yyyy/MM/dd')})
  </text>

  <!-- リサイズハンドル（左）- セクション/サブセクションのみ -->
  {#if node.type === 'section' || node.type === 'subsection'}
    <rect
      {x}
      y={sectionBarY}
      width={handleSize}
      height={sectionBarHeight}
      class="{classPrefix}-resize-handle {classPrefix}-resize-handle--start"
      data-node-id={node.id}
      on:mousedown={(e) => onMouseDown(node, 'resize-start', e)}
      role="button"
      tabindex="0"
    >
      <title>開始日をリサイズ: {node.name}</title>
    </rect>
  {/if}

  <!-- 自動調整アイコンボタン - セクション/サブセクションのみ -->
  {#if node.type === 'section' || node.type === 'subsection'}
    <g
      class="{classPrefix}-auto-adjust-btn"
      on:click={(e) => { e.stopPropagation(); onAutoAdjustSection?.(node.id); }}
      role="button"
      tabindex="0"
    >
      <rect
        x={iconX}
        y={sectionBarY + (sectionBarHeight - iconSize) / 2}
        width={iconSize}
        height={iconSize}
        rx="2"
        class="{classPrefix}-auto-adjust-btn-bg"
      />
      <path
        d="M {iconX + 4} {sectionBarY + sectionBarHeight / 2 - 4} L {iconX + 8} {sectionBarY + sectionBarHeight / 2} L {iconX + 4} {sectionBarY + sectionBarHeight / 2 + 4} M {iconX + 12} {sectionBarY + sectionBarHeight / 2 - 4} L {iconX + 8} {sectionBarY + sectionBarHeight / 2} L {iconX + 12} {sectionBarY + sectionBarHeight / 2 + 4}"
        stroke="#fff"
        stroke-width="1.5"
        fill="none"
        stroke-linecap="round"
        pointer-events="none"
      />
      <title>配下のタスクに合わせて日付を調整</title>
    </g>
  {/if}

  <!-- リサイズハンドル（右）- セクション/サブセクションのみ -->
  {#if node.type === 'section' || node.type === 'subsection'}
    <rect
      x={x + barWidth - handleSize}
      y={sectionBarY}
      width={handleSize}
      height={sectionBarHeight}
      class="{classPrefix}-resize-handle {classPrefix}-resize-handle--end"
      data-node-id={node.id}
      on:mousedown={(e) => onMouseDown(node, 'resize-end', e)}
      role="button"
      tabindex="0"
    >
      <title>終了日をリサイズ: {node.name}</title>
    </rect>
  {/if}
</g>
