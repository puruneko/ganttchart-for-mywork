/**
 * 期間なしサブタスク行のドラッグ予定化（issue-gantt-phase004-008）に関する
 * 日時計算ロジック。DOM に依存しない純粋関数として提供し、ドラッグハンドラー・
 * コンポーネントの両方から利用する。
 */

import { DateTime } from 'luxon';
import { addBusinessDayOffset } from './business-days';

/** 丸め粒度の判定に使う tick 定義の minorUnit */
export type RoundingUnit = 'hour' | 'day' | 'week' | 'month';

/**
 * ドラッグ中の日数オフセットから、予定化後の開始日時を計算する。
 *
 * - minorUnit が 'hour'（時間単位ズーム）のとき: 15 分単位に丸める。
 * - それ以外（日・週・月単位ズーム）のとき: 日単位に丸め、時刻は defaultStartHour:00 に固定する
 *   （粗いズームでは分単位の位置が画面上で意味を持たないため）。
 *
 * @param anchor - ドラッグ開始時の基準日時（対象ノードの計算済み start）
 * @param daysDelta - mousedown からの水平移動量（日数換算、符号あり）
 * @param minorUnit - 現在のズームレベルの tick 定義における minorUnit
 * @param defaultStartHour - 日単位丸め時に使う開始時刻（時）
 * @param hideWeekends - 週末を詰めた軸で計算するかどうか
 */
export function computeUnscheduledStart(
  anchor: DateTime,
  daysDelta: number,
  minorUnit: RoundingUnit,
  defaultStartHour: number,
  hideWeekends: boolean,
): DateTime {
  const raw = hideWeekends
    ? addBusinessDayOffset(anchor, daysDelta)
    : anchor.plus({ days: daysDelta });

  if (minorUnit === 'hour') {
    const totalMinutes = raw.hour * 60 + raw.minute;
    const snappedMinutes = Math.round(totalMinutes / 15) * 15;
    return raw.startOf('day').plus({ minutes: snappedMinutes });
  }

  return raw.startOf('day').set({
    hour: defaultStartHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

/**
 * anchor・daysDelta・設定値から、予定化後の start/end の組を計算する。
 */
export function computeUnscheduledRange(
  anchor: DateTime,
  daysDelta: number,
  minorUnit: RoundingUnit,
  defaultStartHour: number,
  defaultDurationMinutes: number,
  hideWeekends: boolean,
): { start: DateTime; end: DateTime } {
  const start = computeUnscheduledStart(anchor, daysDelta, minorUnit, defaultStartHour, hideWeekends);
  const end = start.plus({ minutes: defaultDurationMinutes });
  return { start, end };
}
