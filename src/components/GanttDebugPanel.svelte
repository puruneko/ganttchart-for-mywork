<script lang="ts">
  /**
   * ガントチャートデバッグパネル
   * ズーム定義の確認と編集用
   */
  
  import { Duration } from 'luxon';
  import type { TickGenerationDef } from '../utils/tick-generator';
  
  export let currentScale: number;
  export let tickDef: TickGenerationDef;
  export let classPrefix: string;
  
  // ズーム定義を編集した際のコールバック
  export let onUpdateZoomDef: ((updates: { minScale: number; interval: Duration; majorFormat: string; minorFormat: string }) => void) | null = null;
  
  // 編集可能な値
  let editMinScale = currentScale.toFixed(3);
  let editMajorFormat = tickDef?.majorFormat || '';
  let editMinorFormat = tickDef?.minorFormat || '';
  
  // minorIntervalの編集用（単位ごとに分解）
  let intervalValue = 1;
  let intervalUnit: 'hours' | 'days' | 'weeks' | 'months' | 'years' = 'days';
  
  // tickDefからintervalを解析
  $: {
    const interval = tickDef?.minorInterval;
    if (interval) {
      if (interval.hours && interval.hours > 0) {
        intervalValue = interval.hours;
        intervalUnit = 'hours';
      } else if (interval.days && interval.days > 0) {
        intervalValue = interval.days;
        intervalUnit = 'days';
      } else if (interval.weeks && interval.weeks > 0) {
        intervalValue = interval.weeks;
        intervalUnit = 'weeks';
      } else if (interval.months && interval.months > 0) {
        intervalValue = interval.months;
        intervalUnit = 'months';
      } else if (interval.years && interval.years > 0) {
        intervalValue = interval.years;
        intervalUnit = 'years';
      }
    }
  }
  
  
  // 現在の値を同期
  $: editMinScale = currentScale.toFixed(3);
  $: {
    if (tickDef?.majorFormat) editMajorFormat = tickDef.majorFormat;
  }
  $: {
    if (tickDef?.minorFormat) editMinorFormat = tickDef.minorFormat;
  }
  
  /**
   * 編集内容を適用
   */
  function applyChanges() {
    if (!onUpdateZoomDef) {
      alert('編集機能は現在利用できません');
      return;
    }
    
    const newInterval = Duration.fromObject({ [intervalUnit]: intervalValue });
    
    onUpdateZoomDef({
      minScale: parseFloat(editMinScale),
      interval: newInterval,
      majorFormat: editMajorFormat,
      minorFormat: editMinorFormat
    });
    
    console.log('✅ ズーム定義を更新しました');
  }
  
  /**
   * 編集内容をリセット
   */
  function resetChanges() {
    editMinScale = currentScale.toFixed(3);
    editMajorFormat = tickDef?.majorFormat || '';
    editMinorFormat = tickDef?.minorFormat || '';
    
    const interval = tickDef?.minorInterval;
    if (interval) {
      if (interval.hours && interval.hours > 0) {
        intervalValue = interval.hours;
        intervalUnit = 'hours';
      } else if (interval.days && interval.days > 0) {
        intervalValue = interval.days;
        intervalUnit = 'days';
      } else if (interval.weeks && interval.weeks > 0) {
        intervalValue = interval.weeks;
        intervalUnit = 'weeks';
      } else if (interval.months && interval.months > 0) {
        intervalValue = interval.months;
        intervalUnit = 'months';
      } else if (interval.years && interval.years > 0) {
        intervalValue = interval.years;
        intervalUnit = 'years';
      }
    }
  }
</script>

<div class="{classPrefix}-debug-panel">
  <h3>ズーム定義エディタ</h3>
  
  <div class="{classPrefix}-debug-row">
    <label>Current Scale:</label>
    <span>{currentScale.toFixed(3)}</span>
  </div>
  
  <div class="{classPrefix}-debug-row">
    <label>Min Scale:</label>
    <input type="text" bind:value={editMinScale} />
  </div>
  
  <div class="{classPrefix}-debug-row">
    <label>Major Unit:</label>
    <span>{tickDef.majorUnit}</span>
  </div>
  
  <div class="{classPrefix}-debug-row">
    <label>Major Format:</label>
    <input type="text" bind:value={editMajorFormat} />
  </div>
  
  <div class="{classPrefix}-debug-row">
    <label>Minor Unit:</label>
    <span>{tickDef.minorUnit}</span>
  </div>
  
  <div class="{classPrefix}-debug-row">
    <label>Minor Format:</label>
    <input type="text" bind:value={editMinorFormat} />
  </div>
  
  <div class="{classPrefix}-debug-row">
    <label>Interval Value:</label>
    <input type="number" bind:value={intervalValue} min="1" />
  </div>
  
  <div class="{classPrefix}-debug-row">
    <label>Interval Unit:</label>
    <select bind:value={intervalUnit}>
      <option value="hours">時間</option>
      <option value="days">日</option>
      <option value="weeks">週</option>
      <option value="months">月</option>
      <option value="years">年</option>
    </select>
  </div>
  
  <div class="{classPrefix}-debug-actions">
    <button class="{classPrefix}-debug-btn-apply" on:click={applyChanges}>適用</button>
    <button class="{classPrefix}-debug-btn-reset" on:click={resetChanges}>リセット</button>
  </div>
  
  <div class="{classPrefix}-debug-info">
    <small>※ 編集した値を「適用」ボタンで反映できます</small>
  </div>
</div>

<style>
  :global(.gantt-debug-panel) {
    position: absolute;
    top: 50px;
    right: 8px;
    z-index: 10;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 12px;
    min-width: 280px;
    max-width: 320px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    font-size: 12px;
  }
  
  :global(.gantt-debug-panel) h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    border-bottom: 1px solid #ddd;
    padding-bottom: 8px;
  }
  
  :global(.gantt-debug-row) {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
  }
  
  :global(.gantt-debug-row) label {
    flex: 0 0 110px;
    font-weight: 500;
    color: #555;
  }
  
  :global(.gantt-debug-row) input {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 11px;
    font-family: monospace;
  }
  
  :global(.gantt-debug-row) select {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 11px;
    background: white;
  }
  
  :global(.gantt-debug-row) span {
    flex: 1;
    color: #333;
    font-family: monospace;
  }
  
  :global(.gantt-debug-actions) {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  
  :global(.gantt-debug-btn-apply),
  :global(.gantt-debug-btn-reset) {
    flex: 1;
    padding: 6px 12px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  :global(.gantt-debug-btn-apply) {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }
  
  :global(.gantt-debug-btn-apply):hover {
    background: #45a049;
  }
  
  :global(.gantt-debug-btn-reset) {
    background: #f5f5f5;
    color: #333;
  }
  
  :global(.gantt-debug-btn-reset):hover {
    background: #e0e0e0;
  }
  
  :global(.gantt-debug-info) {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #eee;
    color: #888;
    font-size: 10px;
  }
</style>
