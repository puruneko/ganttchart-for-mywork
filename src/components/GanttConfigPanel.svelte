<script lang="ts">
  /**
   * 設定パネルコンポーネント
   *
   * GanttConfig の各項目を UI から変更できるパネル。
   * 変更は即座に onConfigChange コールバックで通知される。
   */

  import type { GanttConfig, SnapDurationMap } from '../types';
  import type { DurationLikeObject } from 'luxon';

  /** 現在の設定値 */
  export let config: Required<GanttConfig>;
  /** CSSクラスのプレフィックス */
  export let classPrefix: string;
  /** 設定変更時のコールバック */
  export let onConfigChange: (updates: Partial<GanttConfig>) => void;

  // snapDurationMap の各キーの選択肢
  const snapOptions: { label: string; value: DurationLikeObject }[] = [
    { label: '15分',  value: { minutes: 15 } },
    { label: '30分',  value: { minutes: 30 } },
    { label: '1時間', value: { hours: 1 } },
    { label: '3時間', value: { hours: 3 } },
    { label: '6時間', value: { hours: 6 } },
    { label: '12時間', value: { hours: 12 } },
    { label: '1日',   value: { days: 1 } },
    { label: '3日',   value: { days: 3 } },
    { label: '1週',   value: { weeks: 1 } },
    { label: '2週',   value: { weeks: 2 } },
    { label: '1ヶ月', value: { months: 1 } },
  ];

  // majorUnit ごとに表示する選択肢のサブセット
  const snapOptionsFor: Record<'year' | 'month' | 'week' | 'day', typeof snapOptions> = {
    year:  snapOptions.filter(o => ['1日','3日','1週','2週','1ヶ月'].includes(o.label)),
    month: snapOptions.filter(o => ['6時間','12時間','1日','3日','1週'].includes(o.label)),
    week:  snapOptions.filter(o => ['1時間','3時間','6時間','12時間','1日'].includes(o.label)),
    day:   snapOptions.filter(o => ['15分','30分','1時間','3時間','6時間'].includes(o.label)),
  };

  /** DurationLikeObject を JSON 文字列に変換（select の value 比較用） */
  function toKey(obj: DurationLikeObject): string {
    return JSON.stringify(obj);
  }

  /** 現在の snapDurationMap[unit] に一致する選択肢キーを取得 */
  function currentSnapKey(unit: 'year' | 'month' | 'week' | 'day'): string {
    const current = config.snapDurationMap[unit];
    if (!current) return '';
    return toKey(current);
  }

  function handleSnapChange(unit: 'year' | 'month' | 'week' | 'day', key: string) {
    const opt = snapOptions.find(o => toKey(o.value) === key);
    if (!opt) return;
    onConfigChange({
      snapDurationMap: { [unit]: opt.value } as SnapDurationMap,
    });
  }
</script>

<div class="{classPrefix}-config-panel">
  <div class="{classPrefix}-config-panel-title">設定</div>

  <!-- 表示モード -->
  <div class="{classPrefix}-config-section">
    <div class="{classPrefix}-config-section-title">動作モード</div>
    <label class="{classPrefix}-config-row">
      <span>モード</span>
      <select
        value={config.mode}
        on:change={(e) => onConfigChange({ mode: e.currentTarget.value as 'controlled' | 'uncontrolled' })}
      >
        <option value="uncontrolled">uncontrolled（内部管理）</option>
        <option value="controlled">controlled（外部管理）</option>
      </select>
    </label>
  </div>

  <!-- レイアウト -->
  <div class="{classPrefix}-config-section">
    <div class="{classPrefix}-config-section-title">レイアウト</div>

    <label class="{classPrefix}-config-row">
      <span>行の高さ <em>{config.rowHeight}px</em></span>
      <input
        type="range" min="24" max="80" step="4"
        value={config.rowHeight}
        on:input={(e) => onConfigChange({ rowHeight: Number(e.currentTarget.value) })}
      />
    </label>

    <label class="{classPrefix}-config-row">
      <span>ツリーペイン幅 <em>{config.treePaneWidth}px</em></span>
      <input
        type="range" min="150" max="500" step="10"
        value={config.treePaneWidth}
        on:input={(e) => onConfigChange({ treePaneWidth: Number(e.currentTarget.value) })}
      />
    </label>

    <label class="{classPrefix}-config-row">
      <span>インデント幅 <em>{config.indentSize}px</em></span>
      <input
        type="range" min="8" max="40" step="4"
        value={config.indentSize}
        on:input={(e) => onConfigChange({ indentSize: Number(e.currentTarget.value) })}
      />
    </label>

    <label class="{classPrefix}-config-row">
      <span>ツリーペインを表示</span>
      <input
        type="checkbox"
        checked={config.showTreePane}
        on:change={(e) => onConfigChange({ showTreePane: e.currentTarget.checked })}
      />
    </label>
  </div>

  <!-- スナップ設定 -->
  <div class="{classPrefix}-config-section">
    <div class="{classPrefix}-config-section-title">スナップ粒度</div>
    <div class="{classPrefix}-config-snap-hint">ズームレベルごとのDnD・表示最小単位</div>

    {#each (['year', 'month', 'week', 'day'] as const) as unit}
      {@const unitLabel = { year: '年表示時', month: '月表示時', week: '週表示時', day: '日表示時' }[unit]}
      <label class="{classPrefix}-config-row">
        <span>{unitLabel}</span>
        <select
          value={currentSnapKey(unit)}
          on:change={(e) => handleSnapChange(unit, e.currentTarget.value)}
        >
          {#each snapOptionsFor[unit] as opt}
            <option value={toKey(opt.value)}>{opt.label}</option>
          {/each}
        </select>
      </label>
    {/each}
  </div>
</div>

<style>
  :global(.gantt-config-panel) {
    padding: 12px;
    font-size: 12px;
    overflow-y: auto;
    height: 100%;
  }

  :global(.gantt-config-panel-title) {
    font-size: 13px;
    font-weight: 700;
    color: #333;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0;
  }

  :global(.gantt-config-section) {
    margin-bottom: 16px;
  }

  :global(.gantt-config-section-title) {
    font-size: 11px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }

  :global(.gantt-config-row) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    cursor: pointer;
  }

  :global(.gantt-config-row span) {
    flex: 1;
    color: #444;
    white-space: nowrap;
  }

  :global(.gantt-config-row em) {
    font-style: normal;
    color: #888;
    font-size: 11px;
    margin-left: 4px;
  }

  :global(.gantt-config-row input[type="range"]) {
    width: 80px;
    accent-color: #4a90e2;
  }

  :global(.gantt-config-row select) {
    font-size: 11px;
    padding: 2px 4px;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: #fff;
    color: #333;
    max-width: 120px;
  }

  :global(.gantt-config-row input[type="checkbox"]) {
    accent-color: #4a90e2;
    width: 14px;
    height: 14px;
  }

  :global(.gantt-config-snap-hint) {
    font-size: 10px;
    color: #aaa;
    margin-bottom: 8px;
  }
</style>
