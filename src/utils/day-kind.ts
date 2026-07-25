/**
 * 日付の種別（祝日・週末・通常）を判定する純粋関数
 *
 * 「どの日が祝日か」の意味はライブラリは知らない。呼び出し側（ホスト）が
 * 解決済みの holidays / weekend を渡し、この関数は判定するだけ。
 */

import type { DateTime } from 'luxon';

export type DayKind = 'holiday' | 'weekend' | 'normal';

/** デフォルトの週末曜日（luxon weekday 規約: 6=土, 7=日） */
export const DEFAULT_WEEKEND_DAYS: number[] = [6, 7];

/**
 * 祝日リストを O(1) 判定用の Set に変換する
 *
 * @param holidays - YYYY-MM-DD 形式の祝日文字列配列
 * @returns 祝日文字列の Set
 */
export function buildHolidaySet(holidays: string[] | undefined): Set<string> {
  return new Set(holidays ?? []);
}

/**
 * 日付の種別を判定する
 *
 * 優先順位: 祝日 > 週末 > 通常（祝日が土曜でも祝日色になる）。
 *
 * @param date - 判定する日付
 * @param holidays - 祝日リスト（YYYY-MM-DD）または事前構築済みの Set
 * @param weekend - 週末とみなす曜日の配列（luxon weekday 規約）。省略時は [6, 7]
 * @returns 'holiday' | 'weekend' | 'normal'
 */
export function dayKind(
  date: DateTime,
  holidays: string[] | Set<string> | undefined,
  weekend: number[] | undefined = DEFAULT_WEEKEND_DAYS,
): DayKind {
  const holidaySet = holidays instanceof Set ? holidays : buildHolidaySet(holidays);

  if (holidaySet.has(date.toISODate() ?? '')) {
    return 'holiday';
  }

  const weekendDays = weekend ?? DEFAULT_WEEKEND_DAYS;
  if (weekendDays.includes(date.weekday)) {
    return 'weekend';
  }

  return 'normal';
}
