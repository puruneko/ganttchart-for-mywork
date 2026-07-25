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
  /** リサイズハンドルのダブルクリックで発火（issue #0026: 開始/終了を個別に自動調整） */
  export let onAutoAdjustSection: ((nodeId: string, edge: 'start' | 'end' | 'both') => void) | undefined = undefined;
  /** ラベルのクリップ幅（issue #0028）。null なら全文表示、hidden なら非表示 */
  export let labelClipWidth: number | null = null;
  export let labelHidden: boolean = false;

  $: sectionBarHeight = 20;
  $: sectionBarY = y + (rowHeight - sectionBarHeight) / 2;
  $: labelClipId = `${classPrefix}-section-label-clip-${node.id}`;

  function handleResizeHandleDblClick(edge: 'start' | 'end', event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    onAutoAdjustSection?.(node.id, edge);
  }
</script>

<g>
  <!-- セクションバー：全体を濃い色で塗りつぶし -->
  <rect
    {x}
    y={sectionBarY}
    width={barWidth}
    height={sectionBarHeight}
    class="{classPrefix}-section-bar-full {classPrefix}-section-bar-full--{node.type} {node.completed ? classPrefix + '-section-bar-full--completed' : ''}"
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

  <!-- セクション/プロジェクト名と日付のラベル（issue #0028: 優先度の高いマイルストン等と重なる場合はクリップされる） -->
  {#if !labelHidden}
    {#if labelClipWidth !== null}
      <clipPath id={labelClipId}>
        <rect x={x + 8} y={sectionBarY} width={labelClipWidth} height={sectionBarHeight} />
      </clipPath>
    {/if}
    <text
      x={x + 8}
      y={sectionBarY + sectionBarHeight / 2}
      class="{classPrefix}-section-label {classPrefix}-section-label--{node.type} {node.completed ? classPrefix + '-section-label--completed' : ''}"
      dominant-baseline="middle"
      pointer-events="none"
      clip-path={labelClipWidth !== null ? `url(#${labelClipId})` : undefined}
    >
      {node.name} ({node.start.toFormat('yyyy/MM/dd')} - {node.end.toFormat('yyyy/MM/dd')})
    </text>
  {/if}

  <!-- リサイズハンドル（左）- セクション/サブセクションのみ。ダブルクリックで開始日を配下タスクに合わせて自動調整（issue #0026） -->
  {#if node.type === 'section' || node.type === 'subsection'}
    <rect
      {x}
      y={sectionBarY}
      width={handleSize}
      height={sectionBarHeight}
      class="{classPrefix}-resize-handle {classPrefix}-resize-handle--start"
      data-node-id={node.id}
      on:click={(e) => onBarClick?.(node, e)}
      on:mousedown={(e) => onMouseDown(node, 'resize-start', e)}
      on:dblclick={(e) => handleResizeHandleDblClick('start', e)}
      role="button"
      tabindex="0"
    >
      <title>開始日をリサイズ（ダブルクリックで配下タスクに合わせて自動調整）: {node.name}</title>
    </rect>
  {/if}

  <!-- リサイズハンドル（右）- セクション/サブセクションのみ。ダブルクリックで終了日を配下タスクに合わせて自動調整（issue #0026） -->
  {#if node.type === 'section' || node.type === 'subsection'}
    <rect
      x={x + barWidth - handleSize}
      y={sectionBarY}
      width={handleSize}
      height={sectionBarHeight}
      class="{classPrefix}-resize-handle {classPrefix}-resize-handle--end"
      data-node-id={node.id}
      on:click={(e) => onBarClick?.(node, e)}
      on:mousedown={(e) => onMouseDown(node, 'resize-end', e)}
      on:dblclick={(e) => handleResizeHandleDblClick('end', e)}
      role="button"
      tabindex="0"
    >
      <title>終了日をリサイズ（ダブルクリックで配下タスクに合わせて自動調整）: {node.name}</title>
    </rect>
  {/if}
</g>
