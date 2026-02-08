<script lang="ts">
  /**
   * タイムラインヘッダーコンポーネント - 日付ラベルを表示
   */
  
  import type { DateRange } from '../types';
  import { generateDateTicks, dateToX } from '../utils/timeline-calculations';
  import { getTickIntervalForZoomLevel } from '../utils/zoom-utils';
  
  /** タイムラインの日付範囲 */
  export let dateRange: DateRange;
  /** 1日あたりの幅（ピクセル） */
  export let dayWidth: number;
  /** CSSクラスのプレフィックス */
  export let classPrefix: string;
  /** ズームレベル（1-5） */
  export let zoomLevel: number = 3;
  
  $: tickInterval = getTickIntervalForZoomLevel(zoomLevel);
  $: dateTicks = generateDateTicks(dateRange, tickInterval);
  
  // ズームレベルに応じた表示フォーマット
  function getDateFormat(zoomLevel: number): { day: string; month: string } {
    switch (zoomLevel) {
      case 1: // 月単位
        return { day: 'MMM', month: 'yyyy' };
      case 2: // 週単位
        return { day: 'dd', month: 'MMM' };
      case 3: // 日単位（デフォルト）
        return { day: 'dd', month: 'MMM' };
      case 4: // 半日単位
        return { day: 'dd', month: 'HH:mm' };
      case 5: // 時間単位
        return { day: 'HH:mm', month: 'dd MMM' };
      default:
        return { day: 'dd', month: 'MMM' };
    }
  }
  
  $: dateFormat = getDateFormat(zoomLevel);
</script>

<div class="{classPrefix}-header">
  {#each dateTicks as date (date.toISO())}
    {@const x = dateToX(date, dateRange, dayWidth)}
    <div
      class="{classPrefix}-header-day"
      style="left: {x}px; width: {dayWidth}px;"
    >
      <div class="{classPrefix}-header-day-label">
        {date.toFormat(dateFormat.day)}
      </div>
      <div class="{classPrefix}-header-month-label">
        {date.toFormat(dateFormat.month)}
      </div>
    </div>
  {/each}
</div>

<style>
  :global(.gantt-header) {
    position: relative;
    height: 50px;
    background: #f5f5f5;
    border-bottom: 2px solid #ddd;
    overflow: hidden;
  }
  
  :global(.gantt-header-day) {
    position: absolute;
    top: 0;
    height: 100%;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }
  
  :global(.gantt-header-day-label) {
    font-size: 14px;
    font-weight: 600;
  }
  
  :global(.gantt-header-month-label) {
    font-size: 11px;
    color: #666;
  }
</style>
