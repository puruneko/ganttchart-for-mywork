/**
 * X 軸仮想スクロール（列方向ウィンドウイング）
 *
 * ビューポートに表示されている X 座標範囲 ± オーバースキャンのみを描画対象にする
 * 純粋関数群。コンポーネント非依存でテストしやすい。
 */

import { DateTime } from 'luxon';
import type { Tick } from './tick-generator';
import type { ComputedGanttNode, DateRange } from '../types';

/**
 * X 軸ウィンドウ（描画対象の日付範囲 + ピクセル範囲）
 */
export interface XAxisWindow {
  /** ウィンドウ開始日時 */
  startDate: DateTime;
  /** ウィンドウ終了日時 */
  endDate: DateTime;
  /** ウィンドウ開始 X 座標（px） */
  startPx: number;
  /** ウィンドウ終了 X 座標（px） */
  endPx: number;
}

/**
 * X 軸ウィンドウを計算する
 *
 * @param scrollLeft   現在の水平スクロール位置（px）
 * @param viewportWidth ビューポートの幅（px）
 * @param dayWidth     1日あたりの幅（px）
 * @param dateRangeStart extendedDateRange の開始日
 * @param overscanPx   オーバースキャン幅（省略時: viewportWidth × 0.5）
 */
export function calculateXWindow(
  scrollLeft: number,
  viewportWidth: number,
  dayWidth: number,
  dateRangeStart: DateTime,
  overscanPx?: number,
): XAxisWindow {
  const overscan = overscanPx ?? viewportWidth * 0.5;

  const startPx = Math.max(0, scrollLeft - overscan);
  const endPx = scrollLeft + viewportWidth + overscan;

  const startDate = dateRangeStart.plus({ days: startPx / dayWidth });
  const endDate = dateRangeStart.plus({ days: endPx / dayWidth });

  return { startDate, endDate, startPx, endPx };
}

/**
 * Tick 配列を XAxisWindow でフィルタリングする
 *
 * tick.start が window.endDate より前、かつ tick.end が window.startDate より後
 * のものだけを返す（部分的にビューポートにかかる tick も含む）。
 */
export function filterTicksByWindow(ticks: Tick[], window: XAxisWindow): Tick[] {
  return ticks.filter(
    tick => tick.start < window.endDate && tick.end > window.startDate,
  );
}

/**
 * ComputedGanttNode 配列を XAxisWindow でフィルタリングする
 *
 * ノードのバーがウィンドウと重なっているものだけを返す。
 * isDateUnset のノード（フォールバック位置に描画）は除外しない。
 */
export function filterNodesByWindow(
  nodes: ComputedGanttNode[],
  window: XAxisWindow,
): ComputedGanttNode[] {
  return nodes.filter(
    node => node.isDateUnset || (node.start < window.endDate && node.end > window.startDate),
  );
}

/**
 * dateRange が未設定または dayWidth が 0 以下の場合に使うフォールバックウィンドウ
 * （全件表示に相当）
 */
export function fullWindow(dateRange: DateRange): XAxisWindow {
  return {
    startDate: dateRange.start,
    endDate: dateRange.end,
    startPx: 0,
    endPx: Infinity,
  };
}

// ─── Y 軸仮想スクロール ───────────────────────────────────────────────────────

/**
 * Y 軸ウィンドウ（描画対象の行インデックス範囲）
 */
export interface YAxisWindow {
  /** 描画開始インデックス（visibleNodes の配列インデックス） */
  startIndex: number;
  /** 描画終了インデックス（inclusive） */
  endIndex: number;
  /** 上部スペーサーの高さ（px） = startIndex * rowHeight */
  offsetY: number;
  /** 全行の合計高さ（px） = totalRows * rowHeight */
  totalHeight: number;
}

/**
 * Y 軸ウィンドウを計算する
 *
 * @param scrollTop      現在の垂直スクロール位置（px）
 * @param viewportHeight ビューポートの高さ（px）
 * @param rowHeight      1行あたりの高さ（px）
 * @param totalRows      visibleNodes の総数
 * @param overscanRows   オーバースキャン行数（省略時: 5）
 */
export function calculateYWindow(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  totalRows: number,
  overscanRows = 5,
): YAxisWindow {
  if (totalRows === 0 || rowHeight <= 0) {
    return { startIndex: 0, endIndex: -1, offsetY: 0, totalHeight: 0 };
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRows);
  // ceil(bottom / rowHeight) - 1 は「ビューポート底辺が含まれる行」のインデックス
  const lastVisibleIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight) - 1;
  const endIndex = Math.min(totalRows - 1, lastVisibleIndex + overscanRows);

  return {
    startIndex,
    endIndex,
    offsetY: startIndex * rowHeight,
    totalHeight: totalRows * rowHeight,
  };
}
