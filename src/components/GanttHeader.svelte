<script lang="ts">
  /**
   * タイムラインヘッダーコンポーネント - 2段日付ラベルを表示
   * 
   * 上段: 大きい単位（年、月、週など）
   * 下段: 小さい単位（日、時間など）
   */
  
  import type { DateRange } from '../types';
  import { dateToX, durationToWidth, calculateTimelineWidth } from '../utils/timeline-calculations';
  import { generateTwoLevelTicks, getTickGenerationDefForScale } from '../utils/tick-generator';
  
  /** タイムラインの日付範囲 */
  export let dateRange: DateRange;
  /** 1日あたりの幅（ピクセル） */
  export let dayWidth: number;
  /** CSSクラスのプレフィックス */
  export let classPrefix: string;
  /** ズームスケール */
  export let zoomScale: number = 1.0;
  
  // ズームスケールに応じた2段tick定義を取得
  $: tickDef = getTickGenerationDefForScale(zoomScale);
  $: twoLevelTicks = generateTwoLevelTicks(dateRange, tickDef);
  $: majorTicks = twoLevelTicks.majorTicks;
  $: minorTicks = twoLevelTicks.minorTicks;
  
  // タイムライン全体の幅を計算（SVGと同じ幅）
  $: timelineWidth = calculateTimelineWidth(dateRange, dayWidth);
</script>

<div class="{classPrefix}-header">
  <!-- 上段: 大きい単位 -->
  <div class="{classPrefix}-header-major">
    <div class="{classPrefix}-header-major-content" style="width: {timelineWidth}px;">
      {#each majorTicks as tick (tick.start.toISO())}
        {@const x = dateToX(tick.start, dateRange, dayWidth)}
        {@const width = durationToWidth(tick.start, tick.end, dayWidth)}
        <div
          class="{classPrefix}-header-major-cell"
          style="left: {x}px; width: {width}px;"
        >
          {tick.label}
        </div>
      {/each}
    </div>
  </div>
  
  <!-- 下段: 小さい単位 -->
  <div class="{classPrefix}-header-minor">
    <div class="{classPrefix}-header-minor-content" style="width: {timelineWidth}px;">
      {#each minorTicks as tick (tick.start.toISO())}
        {@const x = dateToX(tick.start, dateRange, dayWidth)}
        {@const width = durationToWidth(tick.start, tick.end, dayWidth)}
        <div
          class="{classPrefix}-header-minor-cell"
          style="left: {x}px; width: {width}px;"
        >
          {tick.label}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  :global(.gantt-header) {
    position: relative;
    height: 60px;
    background: #f5f5f5;
    border-bottom: 2px solid #ddd;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  /* 上段: 大きい単位 */
  :global(.gantt-header-major) {
    position: relative;
    height: 30px;
    background: #e8e8e8;
    border-bottom: 1px solid #ccc;
    overflow: hidden;
  }
  
  :global(.gantt-header-major-content) {
    position: relative;
    height: 100%;
  }
  
  :global(.gantt-header-major-cell) {
    position: absolute;
    top: 0;
    height: 100%;
    border-right: 1px solid #bbb;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    font-size: 13px;
    font-weight: 600;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 4px;
  }
  
  /* 下段: 小さい単位 */
  :global(.gantt-header-minor) {
    position: relative;
    height: 30px;
    background: #f5f5f5;
    overflow: hidden;
  }
  
  :global(.gantt-header-minor-content) {
    position: relative;
    height: 100%;
  }
  
  :global(.gantt-header-minor-cell) {
    position: absolute;
    top: 0;
    height: 100%;
    border-right: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    font-size: 12px;
    color: #555;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 2px;
  }
</style>
