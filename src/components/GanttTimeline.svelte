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
  
  import { DateTime } from 'luxon';
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
  /** ドラッグスナップ分割数 */
  export let dragSnapDivision: number;
  /** バークリック時のハンドラー */
  export let onBarClick: ((node: ComputedGanttNode, event: MouseEvent) => void) | undefined = undefined;
  /** バードラッグ時のハンドラー */
  export let onBarDrag: ((nodeId: string, newStart: DateTime, newEnd: DateTime) => void) | undefined = undefined;
  /** グループドラッグ時のハンドラー */
  export let onGroupDrag: ((nodeId: string, daysDelta: number) => void) | undefined = undefined;
  
  // 計算値 - Svelte 5では$derivedに変換される
  $: width = calculateTimelineWidth(dateRange, dayWidth);
  $: height = calculateTimelineHeight(visibleNodes.length, rowHeight);
  $: dateTicks = generateDateTicks(dateRange);
  
  // ドラッグ状態
  let dragState: {
    nodeId: string;
    mode: 'move' | 'resize-start' | 'resize-end' | 'group-move';
    originalStart: DateTime;
    originalEnd: DateTime;
    startX: number;
    lastAppliedDelta: number; // グループ移動用：最後に適用したdelta
  } | null = null;
  
  /**
   * バークリックハンドラー
   */
  function handleBarClick(node: ComputedGanttNode, event: MouseEvent) {
    if (onBarClick) {
      onBarClick(node, event);
    }
  }
  
  /**
   * ドラッグ開始ハンドラー
   */
  function handleMouseDown(node: ComputedGanttNode, mode: 'move' | 'resize-start' | 'resize-end' | 'group-move', event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    dragState = {
      nodeId: node.id,
      mode,
      originalStart: node.start,
      originalEnd: node.end,
      startX: event.clientX,
      lastAppliedDelta: 0
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  
  /**
   * ドラッグ中のハンドラー
   */
  function handleMouseMove(event: MouseEvent) {
    if (!dragState) return;
    
    const deltaX = event.clientX - dragState.startX;
    const snapUnit = dayWidth / dragSnapDivision;
    const snappedDelta = Math.round(deltaX / snapUnit) * snapUnit;
    const daysDelta = snappedDelta / dayWidth;
    
    if (dragState.mode === 'group-move') {
      // グループ全体移動：差分のみを適用
      if (onGroupDrag && daysDelta !== dragState.lastAppliedDelta) {
        const deltaDiff = daysDelta - dragState.lastAppliedDelta;
        onGroupDrag(dragState.nodeId, deltaDiff);
        dragState.lastAppliedDelta = daysDelta;
      }
    } else if (onBarDrag) {
      // 個別ノード移動/リサイズ
      let newStart = dragState.originalStart;
      let newEnd = dragState.originalEnd;
      
      if (dragState.mode === 'move') {
        newStart = dragState.originalStart.plus({ days: daysDelta });
        newEnd = dragState.originalEnd.plus({ days: daysDelta });
      } else if (dragState.mode === 'resize-start') {
        newStart = dragState.originalStart.plus({ days: daysDelta });
        if (newStart >= dragState.originalEnd) {
          newStart = dragState.originalEnd.minus({ days: 1 });
        }
      } else if (dragState.mode === 'resize-end') {
        newEnd = dragState.originalEnd.plus({ days: daysDelta });
        if (newEnd <= dragState.originalStart) {
          newEnd = dragState.originalStart.plus({ days: 1 });
        }
      }
      
      onBarDrag(dragState.nodeId, newStart, newEnd);
    }
  }
  
  /**
   * ドラッグ終了ハンドラー
   */
  function handleMouseUp() {
    if (dragState) {
      console.debug('🎯 [GanttTimeline] Drag completed:', dragState.mode, 'for node', dragState.nodeId);
    }
    dragState = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
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
      {@const handleSize = 8}
      
      <!-- セクション/サブセクションのグループ背景（プロジェクトは除外） -->
      {#if (node.type === 'section' || node.type === 'subsection') && node.childrenIds.length > 0}
        {@const childNodes = visibleNodes.filter(n => {
          // このノードの子孫かどうかを確認
          let current = n;
          while (current.parentId) {
            if (current.parentId === node.id) return true;
            current = visibleNodes.find(p => p.id === current.parentId);
            if (!current) break;
          }
          return false;
        })}
        {#if childNodes.length > 0}
          {@const lastChild = childNodes[childNodes.length - 1]}
          {@const sectionBarHeight = 20}
          {@const sectionBarY = y + (rowHeight - sectionBarHeight) / 2}
          {@const groupY = sectionBarY}
          {@const groupHeight = (lastChild.visualIndex - node.visualIndex + 1) * rowHeight - (rowHeight - sectionBarHeight) / 2}
          {@const minStartDate = DateTime.min(
            node.start,
            ...childNodes.map(c => c.start)
          )}
          {@const maxEndDate = DateTime.max(
            node.end,
            ...childNodes.map(c => c.end)
          )}
          {@const groupX = dateToX(minStartDate, dateRange, dayWidth)}
          {@const groupWidth = dateToX(maxEndDate, dateRange, dayWidth) - groupX}
          
          <!-- グループ背景矩形（セクション自体と配下のタスクを囲む） -->
          <rect
            x={groupX}
            y={groupY}
            width={groupWidth}
            height={groupHeight}
            class="{classPrefix}-group-bg {classPrefix}-group-bg--{node.type}"
            rx="6"
            on:mousedown={(e) => handleMouseDown(node, 'group-move', e)}
            style="cursor: move;"
          />
        {/if}
      {/if}
      
      <!-- セクション/サブセクション/プロジェクトバーは小さく表示 -->
      {#if node.type === 'section' || node.type === 'subsection' || node.type === 'project'}
        {@const sectionBarHeight = 20}
        {@const sectionBarY = y + (rowHeight - sectionBarHeight) / 2}
        
        <!-- リサイズハンドル（左） - セクション/サブセクションのみ -->
        {#if node.type === 'section' || node.type === 'subsection'}
          <rect
            x={x}
            y={sectionBarY}
            width={handleSize}
            height={sectionBarHeight}
            class="{classPrefix}-resize-handle {classPrefix}-resize-handle--start"
            data-node-id={node.id}
            on:mousedown={(e) => handleMouseDown(node, 'resize-start', e)}
            role="button"
            tabindex="0"
          >
            <title>開始日をリサイズ: {node.name}</title>
          </rect>
        {/if}
        
        <!-- セクション名のコンパクトバー -->
        <rect
          x={node.type === 'section' || node.type === 'subsection' ? x + handleSize : x}
          y={sectionBarY}
          width={node.type === 'section' || node.type === 'subsection' ? barWidth - handleSize * 2 : barWidth}
          height={sectionBarHeight}
          class="{classPrefix}-section-bar {classPrefix}-section-bar--{node.type}"
          rx="4"
          data-node-id={node.id}
          data-node-type={node.type}
          on:click={(e) => handleBarClick(node, e)}
          on:mousedown={(e) => handleMouseDown(node, 'move', e)}
          role="button"
          tabindex="0"
        >
          <title>{node.name}: {node.start.toFormat('yyyy-MM-dd')} - {node.end.toFormat('yyyy-MM-dd')}</title>
        </rect>
        
        <!-- セクション/プロジェクト名のラベル -->
        <text
          x={(node.type === 'section' || node.type === 'subsection' ? x + handleSize : x) + 8}
          y={sectionBarY + sectionBarHeight / 2}
          dominant-baseline="middle"
          class="{classPrefix}-section-label"
          pointer-events="none"
        >
          {node.name}
        </text>
        
        <!-- リサイズハンドル（右） - セクション/サブセクションのみ -->
        {#if node.type === 'section' || node.type === 'subsection'}
          <rect
            x={x + barWidth - handleSize}
            y={sectionBarY}
            width={handleSize}
            height={sectionBarHeight}
            class="{classPrefix}-resize-handle {classPrefix}-resize-handle--end"
            data-node-id={node.id}
            on:mousedown={(e) => handleMouseDown(node, 'resize-end', e)}
            role="button"
            tabindex="0"
          >
            <title>終了日をリサイズ: {node.name}</title>
          </rect>
        {/if}
      {:else}
        <!-- 通常のタスクバー（リサイズハンドル付き） -->
        <!-- リサイズハンドル（左） -->
        <rect
          x={x}
          y={y + 4}
          width={handleSize}
          height={barHeight}
          class="{classPrefix}-resize-handle {classPrefix}-resize-handle--start"
          data-node-id={node.id}
          on:mousedown={(e) => handleMouseDown(node, 'resize-start', e)}
          role="button"
          tabindex="0"
        >
          <title>開始日をリサイズ: {node.name}</title>
        </rect>
        
        <!-- メインバー -->
        <rect
          x={x + handleSize}
          y={y + 4}
          width={barWidth - handleSize * 2}
          height={barHeight}
          class="{barClass} {node.isDateUnset ? classPrefix + '-bar--unset' : ''}"
          rx="4"
          data-node-id={node.id}
          data-node-type={node.type}
          on:click={(e) => handleBarClick(node, e)}
          on:mousedown={(e) => handleMouseDown(node, 'move', e)}
          role="button"
          tabindex="0"
        >
          <title>{node.name}: {node.start.toFormat('yyyy-MM-dd')} - {node.end.toFormat('yyyy-MM-dd')}{node.isDateUnset ? ' (日時未設定)' : ''}</title>
        </rect>
        
        <!-- タスク名のラベル -->
        <text
          x={x + handleSize + 8}
          y={y + 4 + barHeight / 2}
          dominant-baseline="middle"
          class="{classPrefix}-task-label"
          pointer-events="none"
        >
          {node.name}
        </text>
        
        <!-- リサイズハンドル（右） -->
        <rect
          x={x + barWidth - handleSize}
          y={y + 4}
          width={handleSize}
          height={barHeight}
          class="{classPrefix}-resize-handle {classPrefix}-resize-handle--end"
          data-node-id={node.id}
          on:mousedown={(e) => handleMouseDown(node, 'resize-end', e)}
          role="button"
          tabindex="0"
        >
          <title>終了日をリサイズ: {node.name}</title>
        </rect>
      {/if}
    {/each}
  </g>
</svg>

<style>
  /* スコープスタイル - ライブラリは最小限のスタイルを提供 */
  :global(.gantt-timeline) {
    display: block;
    user-select: none;
  }
  
  :global(.gantt-bar) {
    cursor: move;
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
  
  /* セクション専用のコンパクトバー */
  :global(.gantt-section-bar) {
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  :global(.gantt-section-bar:hover) {
    opacity: 0.9;
  }
  
  :global(.gantt-section-bar--section) {
    fill: #50c878;
    stroke: #3a9c5e;
    stroke-width: 2;
  }
  
  :global(.gantt-section-bar--subsection) {
    fill: #f5a623;
    stroke: #d68a1a;
    stroke-width: 2;
  }
  
  :global(.gantt-section-bar--project) {
    fill: #4a90e2;
    stroke: #3a7bc8;
    stroke-width: 2;
  }
  
  :global(.gantt-bar--task) {
    fill: #9b59b6;
    stroke: #7d3c98;
    stroke-width: 1.5;
  }
  
  /* 日時未設定のタスクバー */
  :global(.gantt-bar--task.gantt-bar--unset) {
    fill: #bdc3c7;
    stroke: #95a5a6;
    stroke-width: 1.5;
    stroke-dasharray: 4 2;
    opacity: 0.7;
  }
  
  :global(.gantt-resize-handle) {
    cursor: ew-resize;
    fill: rgba(0, 0, 0, 0.1);
    transition: fill 0.2s;
  }
  
  :global(.gantt-resize-handle:hover) {
    fill: rgba(0, 0, 0, 0.3);
  }
  
  /* グループ背景（markwenスタイル） */
  :global(.gantt-group-bg) {
    fill: rgba(0, 0, 0, 0.02);
    stroke: rgba(0, 0, 0, 0.15);
    stroke-width: 1.5;
  }
  
  :global(.gantt-group-bg--section) {
    fill: rgba(80, 200, 120, 0.05);
    stroke: rgba(80, 200, 120, 0.4);
  }
  
  :global(.gantt-group-bg--subsection) {
    fill: rgba(245, 166, 35, 0.05);
    stroke: rgba(245, 166, 35, 0.4);
  }
  
  :global(.gantt-group-bg--project) {
    fill: rgba(74, 144, 226, 0.05);
    stroke: rgba(74, 144, 226, 0.4);
  }
  
  /* セクション/プロジェクト名ラベル */
  :global(.gantt-section-label) {
    fill: #fff;
    font-size: 12px;
    font-weight: 600;
    user-select: none;
  }
  
  /* タスク名ラベル */
  :global(.gantt-task-label) {
    fill: #fff;
    font-size: 11px;
    font-weight: 500;
    user-select: none;
  }
</style>
