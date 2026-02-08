/**
 * タイムライン計算用の純粋関数群
 * 
 * Svelte依存なし - 独立してテスト可能
 * すべての関数は副作用がなく、同じ入力に対して常に同じ出力を返す。
 */

import { DateTime, Duration } from 'luxon';
import type { DateRange } from '../types';

/**
 * タイムライン上の日付のX座標を計算
 * 
 * 開始日からの経過日数に基づいて、SVG上のX座標を算出する。
 * 
 * @param date - X座標を求める日付
 * @param dateRange - タイムラインの日付範囲
 * @param dayWidth - 1日あたりの幅（ピクセル）
 * @returns X座標（ピクセル）
 */
export function dateToX(date: DateTime, dateRange: DateRange, dayWidth: number): number {
  const diffDays = date.diff(dateRange.start, 'days').days;
  return diffDays * dayWidth;
}

/**
 * 行インデックスからY座標を計算
 * 
 * 0始まりの行番号から、SVG上のY座標を算出する。
 * 
 * @param rowIndex - 行インデックス（0始まり）
 * @param rowHeight - 各行の高さ（ピクセル）
 * @returns Y座標（ピクセル）
 */
export function rowToY(rowIndex: number, rowHeight: number): number {
  return rowIndex * rowHeight;
}

/**
 * 日付範囲から幅を計算
 * 
 * 開始日と終了日の差分から、タスクバーの幅を算出する。
 * 最小幅は1セル分として、極端に短い期間でも視認できるようにする。
 * 
 * @param start - 開始日時
 * @param end - 終了日時
 * @param dayWidth - 1日あたりの幅（ピクセル）
 * @returns バーの幅（ピクセル、最小1セル分）
 */
export function durationToWidth(start: DateTime, end: DateTime, dayWidth: number): number {
  const diffDays = end.diff(start, 'days').days;
  return Math.max(diffDays * dayWidth, dayWidth); // 最小1セル分の幅
}

/**
 * タイムラインヘッダー用の日付配列を生成
 * 
 * 開始日から終了日まで、指定された間隔で日付配列を作成する。
 * ヘッダーに日付ラベルを表示するために使用。
 * 
 * @param dateRange - タイムラインの日付範囲
 * @param intervalDays - 目盛りの間隔（日数、デフォルト: 1）
 * @returns 日付の配列
 */
export function generateDateTicks(dateRange: DateRange, intervalDays: number = 1): DateTime[];

/**
 * タイムラインヘッダー用の日付配列を生成（Duration版）
 * 
 * Luxon Durationを使用して、より柔軟な間隔指定をサポート。
 * 
 * @param dateRange - タイムラインの日付範囲
 * @param interval - 目盛りの間隔（Luxon Duration）
 * @returns 日付の配列
 */
export function generateDateTicks(dateRange: DateRange, interval: Duration): DateTime[];

export function generateDateTicks(dateRange: DateRange, intervalOrDays: number | Duration = 1): DateTime[] {
  const ticks: DateTime[] = [];
  let current = dateRange.start;
  
  // Duration オブジェクトか数値かを判定
  const interval = typeof intervalOrDays === 'number' 
    ? (intervalOrDays >= 1 
        ? Duration.fromObject({ days: intervalOrDays })
        : Duration.fromObject({ hours: intervalOrDays * 24 }))
    : intervalOrDays;
  
  while (current <= dateRange.end) {
    ticks.push(current);
    current = current.plus(interval);
  }
  
  return ticks;
}

/**
 * タイムライン全体の幅を計算
 * 
 * 日付範囲の総日数から、SVG全体の幅を算出する。
 * 
 * @param dateRange - タイムラインの日付範囲
 * @param dayWidth - 1日あたりの幅（ピクセル）
 * @returns タイムライン全体の幅（ピクセル）
 */
export function calculateTimelineWidth(dateRange: DateRange, dayWidth: number): number {
  const days = dateRange.end.diff(dateRange.start, 'days').days;
  return days * dayWidth;
}

/**
 * タイムライン全体の高さを計算
 * 
 * 表示される行数から、SVG全体の高さを算出する。
 * 
 * @param visibleRowCount - 表示される行の数
 * @param rowHeight - 各行の高さ（ピクセル）
 * @returns タイムライン全体の高さ（ピクセル）
 */
export function calculateTimelineHeight(visibleRowCount: number, rowHeight: number): number {
  return visibleRowCount * rowHeight;
}

/**
 * ノードタイプに基づいてバーのCSSクラスを取得
 * 
 * ノードタイプと設定されたプレフィックスから、
 * CSSクラス名を生成する。
 * 
 * @param nodeType - ノードのタイプ（'project', 'section', 'task'など）
 * @param classPrefix - CSSクラスのプレフィックス
 * @returns CSSクラス文字列（例: "gantt-bar gantt-bar--task"）
 */
export function getBarClass(nodeType: string, classPrefix: string): string {
  return `${classPrefix}-bar ${classPrefix}-bar--${nodeType}`;
}
