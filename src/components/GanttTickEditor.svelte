<script lang="ts">
  /**
   * Tick定義エディタコンポーネント
   *
   * ズームスケールに対応するTick定義の一覧表示と編集UIを提供する。
   * GanttChart.svelteから分離した独立コンポーネント。
   */

  import { Duration } from 'luxon';
  import {
    getAllTickDefinitions,
    updateTickDefinition,
    type TickDefinition,
  } from '../utils/zoom-scale';

  /** CSSクラスのプレフィックス */
  export let classPrefix: string;
  /** 現在のズームスケール（アクティブなTick定義の強調表示用） */
  export let currentZoomScale: number;

  // Tick定義リスト
  let tickDefinitions: TickDefinition[] = [];
  let editingTick: { index: number; def: TickDefinition } | null = null;

  $: tickDefinitions = getAllTickDefinitions() as TickDefinition[];

  // 現在のスケールに対応するTick定義のインデックスを取得（降順ソート済み）
  $: currentTickIndex = (() => {
    if (tickDefinitions.length === 0) return -1;
    for (let i = 0; i < tickDefinitions.length; i++) {
      if (currentZoomScale >= tickDefinitions[i].minScale) {
        return i;
      }
    }
    return tickDefinitions.length - 1;
  })();

  function startEditTick(index: number) {
    const original = tickDefinitions[index];
    editingTick = {
      index,
      def: {
        ...original,
        majorInterval: original.majorInterval
          ? Duration.fromObject(original.majorInterval.toObject())
          : undefined,
        minorInterval: Duration.fromObject(original.minorInterval.toObject()),
      },
    };
  }

  function cancelEditTick() {
    editingTick = null;
  }

  function saveEditTick() {
    if (editingTick) {
      updateTickDefinition(editingTick.index, editingTick.def);
      tickDefinitions = getAllTickDefinitions() as TickDefinition[];
      editingTick = null;
    }
  }

  /** Duration文字列をパース（例: "1 day", "3 hours"） */
  function parseDurationString(str: string): Duration {
    try {
      const parts = str.trim().split(' ');
      if (parts.length !== 2) throw new Error('Invalid format');
      const value = parseFloat(parts[0]);
      const unit = parts[1].toLowerCase().replace(/s$/, '');
      const durationObj: any = {};
      durationObj[unit] = value;
      return Duration.fromObject(durationObj);
    } catch (_) {
      return Duration.fromObject({ days: 1 });
    }
  }

  /** DurationをUI表示用文字列に変換 */
  function formatDurationForUI(duration: Duration | any): string {
    try {
      if (typeof duration === 'string') return duration;
      if (!(duration instanceof Duration)) {
        if (typeof duration === 'object' && duration !== null) {
          duration = Duration.fromObject(duration);
        } else {
          return '1 day';
        }
      }
      const obj = duration.toObject();
      const entries = Object.entries(obj).filter(([_, v]) => v && v !== 0);
      if (entries.length > 0) {
        const [unit, value] = entries[0];
        return `${value} ${unit}`;
      }
      return '1 day';
    } catch (_) {
      return '1 day';
    }
  }
</script>

<!-- Tick定義リスト -->
<div class="{classPrefix}-tick-info">
  <small>Current Scale: {currentZoomScale.toFixed(2)} | Active Index: {currentTickIndex}</small>
</div>
<div class="{classPrefix}-tick-list">
  {#each tickDefinitions as tick, i}
    <div class="{classPrefix}-tick-item" class:active={i === currentTickIndex}>
      <div class="{classPrefix}-tick-header">
        <strong>{tick.label}</strong>
        <button class="{classPrefix}-edit-btn" on:click={() => startEditTick(i)}>Edit</button>
      </div>
      <div class="{classPrefix}-tick-details">
        <div>minScale: {tick.minScale}</div>
        <div>Major: {tick.majorUnit} / {tick.majorFormat}</div>
        <div>Minor: {tick.minorUnit} / {tick.minorFormat}</div>
        <div>Minor Interval: {formatDurationForUI(tick.minorInterval)}</div>
      </div>
    </div>
  {/each}
</div>

<!-- Tick Edit Modal -->
{#if editingTick}
  <div class="{classPrefix}-modal-backdrop" on:click={cancelEditTick}>
    <div class="{classPrefix}-modal-content" on:click|stopPropagation>
      <h3>Edit Tick Definition</h3>
      <div class="{classPrefix}-form-group">
        <label>
          Label:
          <input type="text" bind:value={editingTick.def.label} />
        </label>
      </div>
      <div class="{classPrefix}-form-group">
        <label>
          Min Scale:
          <input type="number" step="0.1" bind:value={editingTick.def.minScale} />
        </label>
      </div>
      <div class="{classPrefix}-form-group">
        <label>
          Major Unit:
          <select bind:value={editingTick.def.majorUnit}>
            <option value="year">year</option>
            <option value="month">month</option>
            <option value="week">week</option>
            <option value="day">day</option>
          </select>
        </label>
      </div>
      <div class="{classPrefix}-form-group">
        <label>
          Major Format:
          <input type="text" bind:value={editingTick.def.majorFormat} />
        </label>
      </div>
      <div class="{classPrefix}-form-group">
        <label>
          Minor Unit:
          <select bind:value={editingTick.def.minorUnit}>
            <option value="month">month</option>
            <option value="week">week</option>
            <option value="day">day</option>
            <option value="hour">hour</option>
          </select>
        </label>
      </div>
      <div class="{classPrefix}-form-group">
        <label>
          Minor Format:
          <input type="text" bind:value={editingTick.def.minorFormat} />
        </label>
      </div>
      <div class="{classPrefix}-form-group">
        <label>
          Minor Interval (e.g., "1 day", "3 hours", "2 weeks"):
          <input
            type="text"
            value={formatDurationForUI(editingTick.def.minorInterval)}
            on:input={(e) => {
              if (editingTick) {
                editingTick.def.minorInterval = parseDurationString(e.currentTarget.value);
              }
            }}
          />
        </label>
      </div>
      <div class="{classPrefix}-modal-actions">
        <button on:click={saveEditTick}>Save</button>
        <button on:click={cancelEditTick}>Cancel</button>
      </div>
    </div>
  </div>
{/if}
