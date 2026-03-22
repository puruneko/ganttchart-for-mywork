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
  import type { RenderLifecycle } from '../core/render-lifecycle';
  import {
    dateToX,
    rowToY,
    durationToWidth,
    calculateTimelineWidth,
    calculateTimelineHeight,
    getBarClass
  } from '../utils/timeline-calculations';
  import { generateTwoLevelTicks, getTickGenerationDefForScale } from '../utils/tick-generator';
  import { onMount, onDestroy } from 'svelte';
  import { ZoomGestureDetector } from '../utils/zoom-gesture';
  import {
    getDayWidthFromScale,
    getScaleFromDayWidth,
    ZOOM_SCALE_LIMITS
  } from '../utils/zoom-scale';
  
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
  /** セクション日付自動調整時のハンドラー */
  export let onAutoAdjustSection: ((nodeId: string) => void) | undefined = undefined;
  /** ズーム変更時のハンドラー（dayWidthの更新を通知） */
  export let onZoomChange: ((scale: number, dayWidth: number) => void) | undefined = undefined;
  export let renderLifecycle: RenderLifecycle | undefined = undefined;
  /** ズームスケール（グリッド描画のTick定義選択に使用） */
  export let zoomScale: number = 1.0;
  
  // ズーム関連
  let svgElement: SVGSVGElement;
  let timelineContainer: HTMLElement; // スクロールコンテナへの参照
  let zoomDetector: ZoomGestureDetector | null = null;
  let currentZoomScale = getScaleFromDayWidth(dayWidth);
  
  // SVGの寸法（リアクティブ式で計算される）
  let width = 0;
  let height = 0;
  
  // ready状態のローカル変数
  let isReady = true; // デフォルトはtrue（renderLifecycleがない場合は常にready）
  let readyUnsubscribe: (() => void) | null = null;
  
  // ズームスケールが変更されたときのハンドラー
  // マウス位置を中心にズームするため、スクロール位置を調整
  function handleZoomChange(newScale: number, _deltaScale: number, mouseX?: number, mouseY?: number): void {
    // ready状態でない場合はスキップ
    if (!isReady || !timelineContainer) {
      return;
    }
    
    // データの妥当性チェック
    if (!dateRange || !dateRange.start || !dateRange.end) return;
    
    // スケールを制限範囲内に収める
    const clampedScale = Math.max(
      ZOOM_SCALE_LIMITS.min,
      Math.min(ZOOM_SCALE_LIMITS.max, newScale)
    );
    
    // ビューポート中心またはマウス位置の日時を計算
    let targetDate: DateTime | null = null;
    let targetOffsetRatio = 0.5; // デフォルトは中心
    
    if (timelineContainer) {
      const scrollLeft = timelineContainer.scrollLeft;
      const containerWidth = timelineContainer.clientWidth;
      
      if (mouseX !== undefined) {
        // マウス位置の日時を計算
        const rect = timelineContainer.getBoundingClientRect();
        const mouseOffsetX = mouseX - rect.left;
        const mouseContentX = scrollLeft + mouseOffsetX;
        const mouseDays = mouseContentX / dayWidth;
        targetDate = dateRange.start.plus({ days: mouseDays });
        targetOffsetRatio = mouseOffsetX / containerWidth;
      } else {
        // ビューポート中心の日時を計算
        const centerContentX = scrollLeft + (containerWidth / 2);
        const centerDays = centerContentX / dayWidth;
        targetDate = dateRange.start.plus({ days: centerDays });
        targetOffsetRatio = 0.5;
      }
    }
    
    currentZoomScale = clampedScale;
    
    // 新しいdayWidthを計算
    const newDayWidth = getDayWidthFromScale(clampedScale);
    
    // 外部に通知（dayWidthの変更を親コンポーネントに伝える）
    if (onZoomChange) {
      onZoomChange(clampedScale, newDayWidth);
    }
    
    // 目標日時を維持するようスクロール位置を調整
    if (timelineContainer && targetDate) {
      const newTargetDays = targetDate.diff(dateRange.start, 'days').days;
      if (!isNaN(newTargetDays)) {
        const newTargetContentX = newTargetDays * newDayWidth;
        const newScrollLeft = newTargetContentX - (timelineContainer.clientWidth * targetOffsetRatio);
        
        // 同期的に設定（表示飛び防止）
        timelineContainer.scrollLeft = Math.max(0, newScrollLeft);
      }
    }
  }
  
  // ズームジェスチャー検出器の初期化
  let zoomDetectorInitialized = false;
  
  onMount(() => {
    if (svgElement) {
      // SVG要素の親要素（スクロールコンテナ）を取得
      timelineContainer = svgElement.parentElement as HTMLElement;
    }
    
    // renderLifecycle.isReadyを購読
    if (renderLifecycle && renderLifecycle.isReady) {
      readyUnsubscribe = renderLifecycle.isReady.subscribe(value => {
        isReady = value;
      });
    }
  });
  
  // レンダリング完了後にズーム検出器を初期化
  $: if (isReady && svgElement && !zoomDetectorInitialized) {
    const initialScale = getScaleFromDayWidth(dayWidth);
    zoomDetector = new ZoomGestureDetector(
      svgElement,
      { onZoomChange: handleZoomChange },
      initialScale
    );
    zoomDetector.start();
    zoomDetectorInitialized = true;
  }
  
  // クリーンアップ
  onDestroy(() => {
    if (zoomDetector) {
      zoomDetector.stop();
    }
    if (readyUnsubscribe) {
      readyUnsubscribe();
    }
  });
  
  // dayWidthが外部から変更されたときにズームスケールを同期
  $: {
    const newScale = getScaleFromDayWidth(dayWidth);
    if (Math.abs(newScale - currentZoomScale) > 0.01) {
      currentZoomScale = newScale;
      if (zoomDetector) {
        zoomDetector.setScale(newScale);
      }
    }
  }
  
  // 計算値 - Svelte 5では$derivedに変換される
  $: width = calculateTimelineWidth(dateRange, dayWidth);
  $: height = calculateTimelineHeight(visibleNodes.length, rowHeight);
  $: gridTickDef = getTickGenerationDefForScale(zoomScale);
  $: gridTwoLevelTicks = generateTwoLevelTicks(dateRange, gridTickDef);
  $: gridMinorTicks = gridTwoLevelTicks.minorTicks;
  $: gridMajorTicks = gridTwoLevelTicks.majorTicks;
  
  // ドラッグ状態
  let dragState: {
    nodeId: string;
    mode: 'move' | 'resize-start' | 'resize-end' | 'group-move';
    originalStart: DateTime;
    originalEnd: DateTime;
    startX: number;
    lastAppliedDelta: number; // グループ移動用：最後に適用したdelta
  } | null = null;
  
  // 右クリックドラッグでスクロールするための状態
  let panState: {
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
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
  bind:this={svgElement}
  class="{classPrefix}-timeline"
  {width}
  {height}
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- グラデーション定義 -->
  <defs>
    <linearGradient id="gradient-task" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#9b59b6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e74c3c;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 背景グリッド -->
  <g class="{classPrefix}-grid">
    {#each gridMinorTicks as tick (tick.start.toISO())}
      <line
        x1={dateToX(tick.start, dateRange, dayWidth)}
        y1={0}
        x2={dateToX(tick.start, dateRange, dayWidth)}
        y2={height}
        class="{classPrefix}-grid-line"
        stroke="#e0e0e0"
        stroke-width="1"
      />
    {/each}
    {#each gridMajorTicks as tick (tick.start.toISO())}
      <line
        x1={dateToX(tick.start, dateRange, dayWidth)}
        y1={0}
        x2={dateToX(tick.start, dateRange, dayWidth)}
        y2={height}
        class="{classPrefix}-grid-line-major"
        stroke="#c0c0c0"
        stroke-width="1"
      />
    {/each}
  </g>
  
  <!-- 現在時刻の縦ライン（赤） -->
  {#if dateRange}
    {@const now = DateTime.now().startOf('minute')}
    {@const isNowVisible = now >= dateRange.start && now <= dateRange.end}
    {#if isNowVisible}
      <line
        x1={dateToX(now, dateRange, dayWidth)}
        y1={0}
        x2={dateToX(now, dateRange, dayWidth)}
        y2={height}
        class="{classPrefix}-now-line"
        stroke="#e74c3c"
        stroke-width="2"
        stroke-dasharray="4,4"
      />
    {/if}
  {/if}
  
  <!-- ガントバー -->
  <g class="{classPrefix}-bars">
    {#each visibleNodes as node (node.id)}
      {#if node.start && node.end}
        {@const x = dateToX(node.start, dateRange, dayWidth)}
        {@const y = rowToY(node.visualIndex, rowHeight)}
        {@const barWidth = durationToWidth(node.start, node.end, dayWidth)}
        {@const barHeight = Math.round((rowHeight - 8) * 0.85)}
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
          {@const groupX = x}
          {@const groupWidth = barWidth}
          
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
        <!-- 名前の推定幅（12pxフォント × 文字数 × 0.6 + パディング16px） -->
        {@const estimatedLabelWidth = node.name.length * 12 * 0.6 + 16}
        {@const filledWidth = Math.min(estimatedLabelWidth, barWidth)}
        
        <!-- セクションバー：全体を濃い色で塗りつぶし -->
        <rect
          x={x}
          y={sectionBarY}
          width={barWidth}
          height={sectionBarHeight}
          class="{classPrefix}-section-bar-full {classPrefix}-section-bar-full--{node.type}"
          rx="2"
          data-node-id={node.id}
          data-node-type={node.type}
          on:click={(e) => handleBarClick(node, e)}
          on:mousedown={(e) => handleMouseDown(node, 'move', e)}
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
        
        <!-- リサイズハンドル（左） - セクション/サブセクションのみ、バーの上に重ねて配置 -->
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
        
        <!-- 自動調整アイコンボタン - セクション/サブセクションのみ -->
        {#if node.type === 'section' || node.type === 'subsection'}
          {@const iconSize = 16}
          {@const iconX = x + barWidth - handleSize - iconSize - 4}
          <g
            class="{classPrefix}-auto-adjust-btn"
            on:click={(e) => {
              e.stopPropagation();
              if (onAutoAdjustSection) {
                onAutoAdjustSection(node.id);
              }
            }}
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
        
        <!-- リサイズハンドル（右） - セクション/サブセクションのみ、バーの上に重ねて配置 -->
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
        {@const customStyle = node.style || {}}
        {@const barFill = customStyle.fill || undefined}
        {@const barStroke = customStyle.stroke || undefined}
        {@const barStrokeWidth = customStyle.strokeWidth || undefined}
        {@const barRx = customStyle.rx !== undefined ? customStyle.rx : 6}
        
        <!-- メインバー -->
        <rect
          x={x}
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
          on:click={(e) => handleBarClick(node, e)}
          on:mousedown={(e) => handleMouseDown(node, 'move', e)}
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
          fill={customStyle.labelColor}
          pointer-events="none"
        >
          {node.name} ({node.start.toFormat('yyyy/MM/dd')} - {node.end.toFormat('yyyy/MM/dd')})
        </text>
        
        <!-- リサイズハンドル（左） - バーの上に重ねて配置 -->
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
        
        <!-- リサイズハンドル（右） - バーの上に重ねて配置 -->
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
      {/if}
    {/each}
  </g>
</svg>

<style>
  /* スコープスタイル - ライブラリは最小限のスタイルを提供 */
  :global(.gantt-timeline) {
    display: block;
    user-select: none;
    will-change: transform;
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
  
  /* セクションバー：全体を濃い色で塗りつぶし */
  :global(.gantt-section-bar-full) {
    cursor: pointer;
    transition: opacity 0.2s;
    stroke: none;
  }
  
  :global(.gantt-section-bar-full:hover) {
    opacity: 0.9;
  }
  
  :global(.gantt-section-bar-full--section) {
    fill: #50c878;
  }
  
  :global(.gantt-section-bar-full--subsection) {
    fill: #f5a623;
  }
  
  :global(.gantt-section-bar-full--project) {
    fill: #4a90e2;
  }
  
  :global(.gantt-bar--task) {
    fill: rgba(92, 163, 243, 0.4);
    stroke: rgba(92, 163, 243, 1);
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
    fill: transparent;
    transition: fill 0.2s;
  }
  
  :global(.gantt-resize-handle:hover) {
    fill: rgba(0, 0, 0, 0.1);
  }
  
  :global(.gantt-resize-handle--start) {
    cursor: w-resize;
  }
  
  :global(.gantt-resize-handle--end) {
    cursor: e-resize;
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
  
  /* セクション/プロジェクト名ラベル（日付含む） */
  :global(.gantt-section-label) {
    fill: #fff;
    font-size: 11px;
    font-weight: 600;
    user-select: none;
  }
  
  /* タスク名ラベル（日付含む） */
  :global(.gantt-task-label) {
    fill: #2c3e50;
    font-size: 10px;
    font-weight: 500;
    user-select: none;
  }
  
  /* 日時未設定タスクのラベルは黒色 */
  :global(.gantt-task-label--unset) {
    fill: #2c3e50;
  }
  
  /* 自動調整ボタン */
  :global(.gantt-auto-adjust-btn) {
    cursor: pointer;
  }
  
  :global(.gantt-auto-adjust-btn-bg) {
    fill: rgba(0, 0, 0, 0.3);
    transition: fill 0.2s;
  }
  
  :global(.gantt-auto-adjust-btn:hover .gantt-auto-adjust-btn-bg) {
    fill: rgba(0, 0, 0, 0.5);
  }
</style>
