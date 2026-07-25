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
    getBarClass,
    generateDateTicks
  } from '../utils/timeline-calculations';
  import { generateTwoLevelTicks } from '../utils/tick-generator';
  import { dayKind, buildHolidaySet, DEFAULT_WEEKEND_DAYS } from '../utils/day-kind';
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
  import { createDragHandler, createUnscheduledDragHandler } from '../utils/drag-handler';
  import { filterTicksByWindow, filterNodesByWindow, fullWindow } from '../utils/virtual-scroll';
  import type { XAxisWindow, YAxisWindow } from '../utils/virtual-scroll';
  import { computeLabelClipping } from '../utils/label-layout';
  import type { LabelRegion, LabelClipResult } from '../utils/label-layout';
  import GanttGroupBackground from './GanttGroupBackground.svelte';
  import GanttSectionBar from './GanttSectionBar.svelte';
  import GanttTaskBar from './GanttTaskBar.svelte';
  import GanttPlanBar from './GanttPlanBar.svelte';
  import GanttMilestone from './GanttMilestone.svelte';

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
  /** バードラッグ確定時（mouseup）のハンドラー */
  export let onBarDragEnd: ((nodeId: string, finalStart: DateTime, finalEnd: DateTime) => void) | undefined = undefined;
  /** グループドラッグ時のハンドラー */
  export let onGroupDrag: ((nodeId: string, daysDelta: number) => void) | undefined = undefined;
  /** セクション日付自動調整時のハンドラー（issue #0026: edge で開始/終了/両方を指定） */
  export let onAutoAdjustSection: ((nodeId: string, edge: 'start' | 'end' | 'both') => void) | undefined = undefined;
  /** ズーム変更時のハンドラー（dayWidthの更新を通知） */
  export let onZoomChange: ((scale: number, dayWidth: number) => void) | undefined = undefined;
  export let renderLifecycle: RenderLifecycle | undefined = undefined;
  /** ズームスケール（グリッド描画のTick定義選択に使用） */
  export let zoomScale: number = 1.0;
  /** X 軸仮想スクロールウィンドウ */
  export let xWindow: XAxisWindow | undefined = undefined;
  /** Y 軸仮想スクロールウィンドウ */
  export let yWindow: YAxisWindow | undefined = undefined;
  /** 土日を詰めて非表示にするかどうか */
  export let hideWeekends: boolean = false;
  /** 土日をグレー背景で強調するかどうか（hideWeekends が false の場合のみ有効） */
  export let weekendBackground: boolean = true;
  /** 祝日リスト（YYYY-MM-DD） */
  export let holidays: string[] = [];
  /** 週末とみなす曜日（luxon weekday 規約） */
  export let weekend: number[] = DEFAULT_WEEKEND_DAYS;
  /** 期間なしサブタスク行をドラッグ予定化したときのハンドラー（issue-gantt-phase004-008） */
  export let onSchedule: ((nodeId: string, start: DateTime, end: DateTime) => void) | undefined = undefined;
  /** 予定化時の既定期間長（分） */
  export let defaultDurationMinutes: number = 60;
  /** 日単位ズームで予定化したときの開始時刻（時） */
  export let defaultStartHour: number = 9;
  /** ベースフォントサイズ（px）。ラベルクリップ幅の概算計算に使用する（issue #0028） */
  export let fontSize: number = 14;
  /** plan のドラッグ時のハンドラー（issue #0028） */
  export let onPlanDrag: ((nodeId: string, newStart: DateTime, newEnd: DateTime) => void) | undefined = undefined;
  /** plan のドラッグ確定時（mouseup）のハンドラー（issue #0028） */
  export let onPlanDragEnd: ((nodeId: string, finalStart: DateTime, finalEnd: DateTime) => void) | undefined = undefined;
  /** マイルストンのドラッグ時のハンドラー（issue #0028） */
  export let onMilestoneDrag: ((nodeId: string, newMilestone: DateTime | { start: DateTime; end: DateTime }) => void) | undefined = undefined;
  /** マイルストンのドラッグ確定時（mouseup）のハンドラー（issue #0028） */
  export let onMilestoneDragEnd: ((nodeId: string, finalMilestone: DateTime | { start: DateTime; end: DateTime }) => void) | undefined = undefined;

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
        hideWeekends,
        onBarDrag,
        onBarDragEnd,
        onGroupDrag,
      };
    },
  });

  // plan 用ドラッグハンドラー（issue #0028）: バーと同じ機構を再利用し、
  // node.start/end ではなく node.plan を更新対象として onPlanDrag/onPlanDragEnd に通知する。
  const { handleMouseDown: handlePlanMouseDown } = createDragHandler({
    getParams: () => {
      const tickDef = getTickDefinitionForScale(zoomScale);
      const snapDays = getSnapDays(tickDef.majorUnit, snapDurationMap);
      return {
        dayWidth,
        snapUnit: snapDays * dayWidth,
        hideWeekends,
        onBarDrag: onPlanDrag,
        onBarDragEnd: onPlanDragEnd,
      };
    },
  });

  // マイルストン用ドラッグハンドラー（issue #0028）: 一点か期間かに応じて
  // DateTime | {start,end} へ組み立て直してから onMilestoneDrag/onMilestoneDragEnd に通知する。
  function reconstructMilestone(nodeId: string, newStart: DateTime, newEnd: DateTime): DateTime | { start: DateTime; end: DateTime } {
    const target = visibleNodes.find((n) => n.id === nodeId);
    const isPeriod = !!target?.milestone && typeof target.milestone === 'object' && 'start' in target.milestone;
    return isPeriod ? { start: newStart, end: newEnd } : newStart;
  }

  const { handleMouseDown: handleMilestoneMouseDown } = createDragHandler({
    getParams: () => {
      const tickDef = getTickDefinitionForScale(zoomScale);
      const snapDays = getSnapDays(tickDef.majorUnit, snapDurationMap);
      return {
        dayWidth,
        snapUnit: snapDays * dayWidth,
        hideWeekends,
        onBarDrag: onMilestoneDrag
          ? (nodeId: string, newStart: DateTime, newEnd: DateTime) =>
              onMilestoneDrag?.(nodeId, reconstructMilestone(nodeId, newStart, newEnd))
          : undefined,
        onBarDragEnd: onMilestoneDragEnd
          ? (nodeId: string, finalStart: DateTime, finalEnd: DateTime) =>
              onMilestoneDragEnd?.(nodeId, reconstructMilestone(nodeId, finalStart, finalEnd))
          : undefined,
      };
    },
  });

  // 期間なしサブタスク行のドラッグ予定化（issue-gantt-phase004-008）
  // ドラッグ中は ghostDrag のみを更新する（ノードデータは書き換えない）。
  let ghostDrag: { nodeId: string; start: DateTime; end: DateTime } | null = null;

  function isWithinTimeline(event: MouseEvent): boolean {
    if (!timelineContainer) return true;
    const rect = timelineContainer.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  const { handleMouseDown: handleUnscheduledMouseDown } = createUnscheduledDragHandler({
    getParams: () => {
      const tickDef = getTickDefinitionForScale(zoomScale);
      return {
        dayWidth,
        hideWeekends,
        minorUnit: tickDef.minorUnit,
        defaultDurationMinutes,
        defaultStartHour,
        isWithinTimeline,
        onGhostUpdate: (nodeId, start, end) => {
          ghostDrag = { nodeId, start, end };
        },
        onGhostClear: () => {
          ghostDrag = null;
        },
        onSchedule,
      };
    },
  });

  const handleSize = 8;

  // ラベルクリッピング（issue #0028）: 同一行内の plan / バー / マイルストンのラベルが
  // 重なる場合、プラン＜バー＜マイルストンの優先度で低い方をクリップする。
  const LABEL_CLIP_MARGIN_PX = 6;
  const LABEL_PRIORITY = { plan: 0, bar: 1, milestone: 2 } as const;
  const NO_CLIP: LabelClipResult = { id: '', clipWidth: null, hidden: false };

  interface MilestoneGeometry {
    startX: number;
    endX: number;
    labelAnchorX: number;
  }

  function getMilestoneGeometry(node: ComputedGanttNode): MilestoneGeometry | null {
    if (!node.milestone) return null;
    const dSize = Math.round(rowHeight * 0.65);
    const isPeriod = typeof node.milestone === 'object' && 'start' in node.milestone;
    if (isPeriod) {
      const m = node.milestone as { start: DateTime; end: DateTime };
      const sX = dateToX(m.start, dateRange, dayWidth, hideWeekends);
      const eX = dateToX(m.end, dateRange, dayWidth, hideWeekends);
      const rightX = Math.max(sX, eX);
      return { startX: Math.min(sX, eX) - dSize / 2, endX: rightX + dSize / 2, labelAnchorX: rightX + dSize / 2 + 4 };
    }
    const pX = dateToX(node.milestone as DateTime, dateRange, dayWidth, hideWeekends);
    return { startX: pX - dSize / 2, endX: pX + dSize / 2, labelAnchorX: pX + dSize / 2 + 4 };
  }

  interface LabelClips {
    bar: LabelClipResult;
    plan: LabelClipResult;
    milestone: LabelClipResult;
  }

  /**
   * 1行（1ノード）内の plan / バー / マイルストンのラベルについて、
   * 優先度ベースのクリップ結果を計算する。純粋な geometry のみを扱う
   * label-layout.ts の computeLabelClipping に、この行固有のジオメトリを渡す。
   */
  function getLabelClips(
    node: ComputedGanttNode,
    x: number,
    barWidth: number,
    showScheduleBar: boolean,
  ): LabelClips {
    const regions: LabelRegion[] = [];
    const isSectionLike = node.type === 'section' || node.type === 'subsection' || node.type === 'project';
    const barLabelFontSize = fontSize * (isSectionLike ? 0.93 : 0.71);
    const barLabelText = `${node.name} (${node.start.toFormat('yyyy/MM/dd')} - ${node.end.toFormat('yyyy/MM/dd')})`;

    if (showScheduleBar) {
      regions.push({
        id: 'bar',
        priority: LABEL_PRIORITY.bar,
        anchorX: x + 8,
        text: barLabelText,
        fontSize: barLabelFontSize,
        shapeStartX: x,
        shapeEndX: x + barWidth,
      });
    }

    if (node.plan) {
      const planX = dateToX(node.plan.start, dateRange, dayWidth, hideWeekends);
      const planWidth = Math.max(durationToWidth(node.plan.start, node.plan.end, dayWidth, hideWeekends), dayWidth);
      regions.push({
        id: 'plan',
        priority: LABEL_PRIORITY.plan,
        anchorX: planX + 8,
        text: node.name,
        fontSize: fontSize * 0.71,
        shapeStartX: planX,
        shapeEndX: planX + planWidth,
      });
    }

    const milestoneGeometry = getMilestoneGeometry(node);
    if (milestoneGeometry) {
      regions.push({
        id: 'milestone',
        priority: LABEL_PRIORITY.milestone,
        anchorX: milestoneGeometry.labelAnchorX,
        text: node.name,
        fontSize: fontSize * 0.71,
        shapeStartX: milestoneGeometry.startX,
        shapeEndX: milestoneGeometry.endX,
      });
    }

    const results = computeLabelClipping(regions, LABEL_CLIP_MARGIN_PX);
    const byId = new Map(results.map((r) => [r.id, r]));
    return {
      bar: byId.get('bar') ?? NO_CLIP,
      plan: byId.get('plan') ?? NO_CLIP,
      milestone: byId.get('milestone') ?? NO_CLIP,
    };
  }

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
  $: width = calculateTimelineWidth(dateRange, dayWidth, hideWeekends);
  $: height = calculateTimelineHeight(visibleNodes.length, rowHeight);
  $: gridTickDef = getTickDefinitionForScale(zoomScale);
  $: gridTwoLevelTicks = generateTwoLevelTicks(dateRange, gridTickDef, hideWeekends);
  $: gridMinorTicks = gridTwoLevelTicks.minorTicks;
  $: gridMajorTicks = gridTwoLevelTicks.majorTicks;
  $: showWeekendHighlight = !hideWeekends && weekendBackground;

  // Y 軸仮想スクロール: Y ウィンドウ内の行だけにスライス
  $: yWindowedNodes = yWindow
    ? visibleNodes.slice(yWindow.startIndex, yWindow.endIndex + 1)
    : visibleNodes;

  // X 軸仮想スクロール: さらに X ウィンドウでフィルタリング
  $: _window = xWindow ?? fullWindow(dateRange);
  $: windowedMinorTicks = filterTicksByWindow(gridMinorTicks, _window);
  $: windowedMajorTicks = filterTicksByWindow(gridMajorTicks, _window);
  $: windowedNodes = filterNodesByWindow(yWindowedNodes, _window);

  // 週末・祝日の列背景: ウィンドウ内の日付を種別判定（showWeekendHighlight の場合のみ）
  // 祝日 > 週末 の優先度で dayKind() が判定する（issue-gantt-phase004-006）
  $: holidaySet = buildHolidaySet(holidays);
  $: dayKindEntries = showWeekendHighlight
    ? generateDateTicks({ start: _window.startDate.startOf('day'), end: _window.endDate.startOf('day') }, 1)
        .map((day) => ({ day, kind: dayKind(day, holidaySet, weekend) }))
        .filter((entry) => entry.kind !== 'normal')
    : [];
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

  <!-- 週末・祝日の列背景 -->
  {#if showWeekendHighlight}
    <g class="{classPrefix}-weekend-bg">
      {#each dayKindEntries as entry (entry.day.toISODate())}
        <rect
          x={dateToX(entry.day, dateRange, dayWidth)}
          y={0}
          width={dayWidth}
          height={height}
          class="{classPrefix}-weekend-band {entry.kind === 'holiday' ? classPrefix + '-holiday-band' : ''}"
        />
      {/each}
    </g>
  {/if}

  <!-- 背景グリッド -->
  <g class="{classPrefix}-grid">
    {#each windowedMinorTicks as tick (tick.start.toISO())}
      <line
        x1={dateToX(tick.start, dateRange, dayWidth, hideWeekends)}
        y1={0}
        x2={dateToX(tick.start, dateRange, dayWidth, hideWeekends)}
        y2={height}
        class="{classPrefix}-grid-line"
        stroke="#e0e0e0"
        stroke-width="1"
      />
    {/each}
    {#each windowedMajorTicks as tick (tick.start.toISO())}
      <line
        x1={dateToX(tick.start, dateRange, dayWidth, hideWeekends)}
        y1={0}
        x2={dateToX(tick.start, dateRange, dayWidth, hideWeekends)}
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
        x1={dateToX(now, dateRange, dayWidth, hideWeekends)}
        y1={0}
        x2={dateToX(now, dateRange, dayWidth, hideWeekends)}
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
    {#each windowedNodes as node (node.id)}
      {#if node.start && node.end}
        {@const x = dateToX(node.start, dateRange, dayWidth, hideWeekends)}
        {@const y = rowToY(node.visualIndex, rowHeight)}
        {@const snapDays = getSnapDays(gridTickDef.majorUnit, snapDurationMap)}
        {@const barWidth = Math.max(durationToWidth(node.start, node.end, dayWidth, hideWeekends), snapDays * dayWidth)}
        {@const barHeight = Math.round((rowHeight - 8) * 0.85)}
        {@const barClass = getBarClass(node.type, classPrefix)}
        {@const isTaskType = node.type === 'task'}
        {@const showScheduleBar = !(isTaskType && node.isDateUnset)}
        {@const labelClips = getLabelClips(node, x, barWidth, showScheduleBar)}

        <GanttGroupBackground
          {node}
          {visibleNodes}
          {x}
          {barWidth}
          {rowHeight}
          {y}
          {classPrefix}
          onMouseDown={handleMouseDown}
          {onBarClick}
        />

        <!-- plan（issue-gantt-phase004-003 / #0027 / #0028）: バーの亜種として実装し、
             スケジュールバーより背面に描画する。期間未設定タスクで plan のみの場合も
             同じコンポーネントでクリック・リサイズ・ラベル表示を統一する。 -->
        {#if node.plan}
          {@const planX = dateToX(node.plan.start, dateRange, dayWidth, hideWeekends)}
          {@const planWidth = Math.max(durationToWidth(node.plan.start, node.plan.end, dayWidth, hideWeekends), dayWidth)}
          <GanttPlanBar
            {node}
            x={planX}
            {y}
            {planWidth}
            {barHeight}
            {classPrefix}
            {handleSize}
            {onBarClick}
            onMouseDown={handlePlanMouseDown}
            labelClipWidth={labelClips.plan.clipWidth}
            labelHidden={labelClips.plan.hidden}
          />
        {/if}

        {#if showScheduleBar}
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
              labelClipWidth={labelClips.bar.clipWidth}
              labelHidden={labelClips.bar.hidden}
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
              labelClipWidth={labelClips.bar.clipWidth}
              labelHidden={labelClips.bar.hidden}
            />
          {/if}
        {:else if !node.plan}
          <!-- 期間なしサブタスク行（issue-gantt-phase004-007）: バーを描かず「・タスク名」のテキスト行のみ -->
          <!-- タイムラインへドラッグすると予定化できる（issue-gantt-phase004-008） -->
          <text
            {x}
            y={y + 4 + barHeight / 2}
            class="{classPrefix}-task-label {classPrefix}-task-label--textrow {classPrefix}-task-label--draggable {node.completed ? classPrefix + '-task-label--completed' : ''}"
            dominant-baseline="middle"
            pointer-events="auto"
            data-node-id={node.id}
            on:click={(e) => onBarClick?.(node, e)}
            on:mousedown={(e) => handleUnscheduledMouseDown(node.id, node.start, e)}
            role="button"
            tabindex="0"
          >・{node.name}</text>
        {/if}

        <!-- milestone（due）: バーの有無に関わらず独立して描画（issue-gantt-phase004-002）。
             クリック・ドラッグ（移動/リサイズ）・ラベル表示に対応（issue #0028）。 -->
        {#if node.milestone}
          <GanttMilestone
            {node}
            milestone={node.milestone}
            {dateRange}
            {dayWidth}
            {hideWeekends}
            {y}
            {rowHeight}
            {classPrefix}
            tentative={!!node.tentative}
            {onBarClick}
            onMouseDown={handleMilestoneMouseDown}
            labelClipWidth={labelClips.milestone.clipWidth}
            labelHidden={labelClips.milestone.hidden}
          />
        {/if}

        <!-- trailingLabels（issue-gantt-phase004-005）: バー/◆ の右端外側に描画 -->
        {#if node.trailingLabels && node.trailingLabels.length > 0}
          {@const barEndX = showScheduleBar ? x + barWidth : x}
          {@const milestoneEndX = node.milestone
            ? (typeof node.milestone === 'object' && 'end' in node.milestone
                ? dateToX(node.milestone.end, dateRange, dayWidth, hideWeekends)
                : dateToX(node.milestone, dateRange, dayWidth, hideWeekends))
            : 0}
          {@const labelX = Math.max(barEndX, milestoneEndX) + 10}
          <text
            x={labelX}
            y={y + 4 + barHeight / 2}
            class="{classPrefix}-trailing-label"
            dominant-baseline="middle"
            pointer-events="none"
          >{node.trailingLabels.join(' / ')}</text>
        {/if}
      {/if}
    {/each}

    <!-- 期間なしサブタスク行のドラッグ予定化ゴースト（issue-gantt-phase004-008） -->
    {#if ghostDrag}
      {@const dragNodeId = ghostDrag.nodeId}
      {@const ghostNode = visibleNodes.find((n) => n.id === dragNodeId)}
      {#if ghostNode}
        {@const gx = dateToX(ghostDrag.start, dateRange, dayWidth, hideWeekends)}
        {@const gy = rowToY(ghostNode.visualIndex, rowHeight)}
        {@const gBarHeight = Math.round((rowHeight - 8) * 0.85)}
        {@const gWidth = Math.max(durationToWidth(ghostDrag.start, ghostDrag.end, dayWidth, hideWeekends), 4)}
        <rect
          x={gx}
          y={gy}
          width={gWidth}
          height={gBarHeight}
          rx="6"
          class="{classPrefix}-ghost-bar"
          pointer-events="none"
        />
        <text
          x={gx + 4}
          y={gy + 4 + gBarHeight / 2}
          class="{classPrefix}-ghost-label"
          dominant-baseline="middle"
          pointer-events="none"
        >{ghostNode.name}</text>
      {/if}
    {/if}
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

  :global(.gantt-weekend-band) {
    fill: var(--gantt-weekend-bg, rgba(0, 0, 0, 0.06));
    pointer-events: none;
  }

  :global(.gantt-holiday-band) {
    fill: var(--gantt-holiday-bg, rgba(231, 76, 60, 0.12));
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

  /* セクションバー：枠線のみ（塗りつぶしなし） */
  :global(.gantt-section-bar-full) {
    cursor: pointer;
    transition: opacity 0.2s;
    fill: none;
    stroke-width: 2;
  }

  :global(.gantt-section-bar-full:hover) {
    opacity: 0.7;
  }

  :global(.gantt-section-bar-full--section) {
    stroke: #50c878;
  }

  :global(.gantt-section-bar-full--subsection) {
    stroke: #f5a623;
  }

  :global(.gantt-section-bar-full--project) {
    stroke: #4a90e2;
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

  /* 完了タスクのバー（取消線は使用せず、グレー配色のみで表現）
     ホストページ/テーマ側のCSSに上書きされないよう !important を付与する */
  :global(.gantt-bar--task.gantt-bar--completed) {
    fill: #d0d3d4 !important;
    stroke: #95a5a6 !important;
  }

  /* status === 'done' によるバー（issue-gantt-phase004-004。completed とは独立した経路） */
  :global(.gantt-bar--task.gantt-bar--done) {
    fill: var(--gantt-done-fill, #d0d3d4) !important;
    stroke: var(--gantt-done-stroke, #95a5a6) !important;
  }

  /* 仮置き（tentative）: 半透明。done と同時の場合は done を優先しこのクラスは付与されない */
  :global(.gantt-bar--task.gantt-bar--tentative) {
    opacity: var(--gantt-tentative-opacity, 0.5);
  }

  :global(.gantt-done-badge-bg) {
    fill: var(--gantt-done-badge-bg, #27ae60);
  }

  :global(.gantt-tentative-badge-bg) {
    fill: var(--gantt-tentative-badge-bg, #7f8c8d);
  }

  :global(.gantt-tentative-badge-text) {
    fill: #fff;
    font-size: calc(var(--gantt-font-size, 14px) * 0.7);
    font-weight: 700;
    user-select: none;
  }

  :global(.gantt-section-bar-full--completed) {
    stroke: #95a5a6 !important;
    opacity: 0.6;
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
    fill: #2c3e50;
    font-size: calc(var(--gantt-font-size, 14px) * 0.93);
    font-weight: 600;
    user-select: none;
  }

  :global(.gantt-section-label--section) {
    fill: #3aaf62;
  }

  :global(.gantt-section-label--subsection) {
    fill: #d4891a;
  }

  :global(.gantt-section-label--project) {
    fill: #2d7dd2;
  }

  /* タスク名ラベル */
  :global(.gantt-task-label) {
    fill: #2c3e50;
    font-size: calc(var(--gantt-font-size, 14px) * 0.71);
    font-weight: 500;
    user-select: none;
  }

  /* 日時未設定タスクのラベルは黒色 */
  :global(.gantt-task-label--unset) {
    fill: #2c3e50;
  }

  /* 期間なしサブタスク行・plan のみタスクのテキスト行（issue-gantt-phase004-007/003）
     フォント色・スタイルは他の（done以外の）バーのラベルと統一する（issue #0027）。
     done は共通の .gantt-task-label--completed が引き続き優先して灰色化する。 */

  /* 期間なしサブタスク行: タイムラインへドラッグして予定化できる（issue-gantt-phase004-008） */
  :global(.gantt-task-label--draggable) {
    cursor: grab;
  }

  /* ドラッグ予定化中のゴースト（issue-gantt-phase004-008） */
  :global(.gantt-ghost-bar) {
    fill: var(--gantt-ghost-fill, rgba(92, 163, 243, 0.35));
    stroke: var(--gantt-ghost-stroke, #5ca3f3);
    stroke-width: 1.5;
    stroke-dasharray: 4 2;
    opacity: 0.75;
  }

  :global(.gantt-ghost-label) {
    fill: var(--gantt-ghost-label-color, #2c3e50);
    font-size: calc(var(--gantt-font-size, 14px) * 0.71);
    font-weight: 500;
    user-select: none;
  }

  /* plan 枠（issue-gantt-phase004-003 / #0027: バーの亜種としてクリック・ドラッグ可能） */
  :global(.gantt-plan-frame) {
    fill: var(--gantt-plan-fill, rgba(0, 0, 0, 0.02));
    stroke: var(--gantt-plan-stroke, #95a5a6);
    stroke-width: 1.5;
    stroke-dasharray: 5 3;
    cursor: move;
    transition: opacity 0.2s;
  }

  :global(.gantt-plan-frame:hover) {
    opacity: 0.8;
  }

  :global(.gantt-plan-frame--tentative) {
    opacity: 0.5;
  }

  /* plan のラベル（issue #0028）: 確定スケジュールと視覚的に区別するため plan 枠と同系色にする */
  :global(.gantt-plan-label) {
    fill: var(--gantt-plan-stroke, #95a5a6);
  }

  :global(.gantt-plan-resize-handle) {
    cursor: ew-resize;
  }

  /* trailingLabels（issue-gantt-phase004-005） */
  :global(.gantt-trailing-label) {
    fill: var(--gantt-trailing-label-color, #999);
    font-size: calc(var(--gantt-font-size, 14px) * 0.64);
    user-select: none;
  }

  /* 完了タスクのラベルはグレー（ホストページ/テーマ側のCSSに上書きされないよう !important を付与） */
  :global(.gantt-task-label--completed) {
    fill: #7f8c8d !important;
  }

  :global(.gantt-section-label--completed) {
    fill: #95a5a6 !important;
  }
</style>
