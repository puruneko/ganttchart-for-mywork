<script lang="ts">
  /**
   * タイムラインヘッダーコンポーネント - 日付ラベルを表示
   */
  
  import type { DateRange } from '../types';
  import { generateDateTicks, dateToX } from '../utils/timeline-calculations';
  
  /** タイムラインの日付範囲 */
  export let dateRange: DateRange;
  /** 1日あたりの幅（ピクセル） */
  export let dayWidth: number;
  /** CSSクラスのプレフィックス */
  export let classPrefix: string;
  
  $: dateTicks = generateDateTicks(dateRange);
</script>

<div class="{classPrefix}-header">
  {#each dateTicks as date (date.toISO())}
    {@const x = dateToX(date, dateRange, dayWidth)}
    <div
      class="{classPrefix}-header-day"
      style="left: {x}px; width: {dayWidth}px;"
    >
      <div class="{classPrefix}-header-day-label">
        {date.toFormat('dd')}
      </div>
      <div class="{classPrefix}-header-month-label">
        {date.toFormat('MMM')}
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
