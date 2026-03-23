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
  import { generateTwoLevelTicks } from '../utils/tick-generator';
  import { getTickDefinitionForScale } from '../utils/zoom-scale';
  import { onMount, onDestroy } from 'svelte';
  import { ZoomGestureDetector } from '../utils/zoom-gesture';
  import {
    getDayWidthFromScale,
    getScaleFromDayWidth,
    getSnapDays,
    ZOOM_SCALE_LIMITS
  } from '../utils/zoom-scale';
  import type { SnapDurationMap } from '../types';
  import { createDragHandler } from '../utils/drag-handler';
  import GanttGroupBackground from './GanttGroupBackground.svelte';
  import GanttSectionBar from './GanttSectionBar.svelte';
  import GanttTaskBar from './GanttTaskBar.svelte';

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
  /** スナップ粒度マッピング */
  export let snapDurationMap: SnapDurationMap;
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

  // SVGの寸法
  let width = 0;
  let height = 0;

  // ready状態のローカル変数
  let isReady = true;
  let readyUnsubscribe: (() => void) | null = null;

  // ドラッグハンドラー（スナップ単位は snapDurationMap から計算）
  const { handleMouseDown } = createDragHandler({
    getParams: () => {
      const tickDef = getTickDefinitionForScale(zoomScale);
      const snapDays = getSnapDays(tickDef.majorUnit, snapDurationMap);
      return {
        dayWidth,
        snapUnit: snapDays * dayWidth,
        onBarDrag,
        onGroupDrag,
      };
    },
  });

  const handleSize = 8;

  // ズームスケールが変更されたときのハンドラー
  function handleZoomChange(newScale: number, _deltaScale: number, mouseX?: number, _mouseY?: number): void {
    if (!isReady || !timelineContainer) return;
    if (!dateRange || !dateRange.start || !dateRange.end) return;

    const clampedScale = Math.max(
      ZOOM_SCALE_LIMITS.min,
      Math.min(ZOOM_SCALE_LIMITS.max, newScale)
    );

    let targetDate: DateTime | null = null;
    let targetOffsetRatio = 0.5;

    if (timelineContainer) {
      const scrollLeft = timelineContainer.scrollLeft;
      const containerWidth = timelineContainer.clientWidth;

      if (mouseX !== undefined) {
        const rect = timelineContainer.getBoundingClientRect();
        const mouseOffsetX = mouseX - rect.left;
        const mouseContentX = scrollLeft + mouseOffsetX;
        const mouseDays = mouseContentX / dayWidth;
        targetDate = dateRange.start.plus({ days: mouseDays });
        targetOffsetRatio = mouseOffsetX / containerWidth;
      } else {
        const centerContentX = scrollLeft + (containerWidth / 2);
        const centerDays = centerContentX / dayWidth;
        targetDate = dateRange.start.plus({ days: centerDays });
        targetOffsetRatio = 0.5;
      }
    }

    currentZoomScale = clampedScale;
    const newDayWidth = getDayWidthFromScale(clampedScale);

    if (onZoomChange) {
      onZoomChange(clampedScale, newDayWidth);
    }

    if (timelineContainer && targetDate) {
      const newTargetDays = targetDate.diff(dateRange.start, 'days').days;
      if (!isNaN(newTargetDays)) {
        const newTargetContentX = newTargetDays * newDayWidth;
        const newScrollLeft = newTargetContentX - (timelineContainer.clientWidth * targetOffsetRatio);
        timelineContainer.scrollLeft = Math.max(0, newScrollLeft);
      }
    }
  }

  // ズームジェスチャー検出器の初期化
  let zoomDetectorInitialized = false;

  onMount(() => {
    if (svgElement) {
      timelineContainer = svgElement.parentElement as HTMLElement;
    }
    if (renderLifecycle && renderLifecycle.isReady) {
      readyUnsubscribe = renderLifecycle.isReady.subscribe(value => {
        isReady = value;
      });
    }
  });

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

  onDestroy(() => {
    if (zoomDetector) zoomDetector.stop();
    if (readyUnsubscribe) readyUnsubscribe();
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

  // 計算値
  $: width = calculateTimelineWidth(dateRange, dayWidth);
  $: height = calculateTimelineHeight(visibleNodes.length, rowHeight);
  $: gridTickDef = getTickDefinitionForScale(zoomScale);
  $: gridTwoLevelTicks = generateTwoLevelTicks(dateRange, gridTickDef);
  $: gridMinorTicks = gridTwoLevelTicks.minorTicks;
  $: gridMajorTicks = gridTwoLevelTicks.majorTicks;
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
        {@const snapDays = getSnapDays(gridTickDef.majorUnit, snapDurationMap)}
        {@const barWidth = Math.max(durationToWidth(node.start, node.end, dayWidth), snapDays * dayWidth)}
        {@const barHeight = Math.round((rowHeight - 8) * 0.85)}
        {@const barClass = getBarClass(node.type, classPrefix)}

        <GanttGroupBackground
          {node}
          {visibleNodes}
          {x}
          {barWidth}
          {rowHeight}
          {y}
          {classPrefix}
          onMouseDown={handleMouseDown}
        />

        {#if node.type === 'section' || node.type === 'subsection' || node.type === 'project'}
          <GanttSectionBar
            {node}
            {x}
            {y}
            {barWidth}
            {rowHeight}
            {classPrefix}
            {handleSize}
            {onBarClick}
            onMouseDown={handleMouseDown}
            {onAutoAdjustSection}
          />
        {:else}
          {@const customStyle = node.style || {}}
          <GanttTaskBar
            {node}
            {x}
            {y}
            {barWidth}
            {barHeight}
            {barClass}
            barRx={customStyle.rx !== undefined ? customStyle.rx : 6}
            barFill={customStyle.fill || undefined}
            barStroke={customStyle.stroke || undefined}
            barStrokeWidth={customStyle.strokeWidth || undefined}
            labelColor={customStyle.labelColor || undefined}
            {classPrefix}
            {handleSize}
            {onBarClick}
            onMouseDown={handleMouseDown}
          />
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

  /* グループ背景 */
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
    font-size: 11px;
    font-weight: 600;
    user-select: none;
  }

  /* タスク名ラベル */
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
