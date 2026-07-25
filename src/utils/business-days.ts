/**
 * 営業日（土日を除いた日）ベースの日付計算ユーティリティ
 *
 * 土日非表示モードでは、タイムラインの日付軸から土日分の幅を取り除いて
 * 営業日だけが連続して表示されるようにする。このモジュールは、
 * カレンダー日付と「土日を詰めた軸上のオフセット（日数単位）」を
 * 相互変換する純粋関数を提供する。
 */

import { DateTime } from 'luxon';

/**
 * 指定された日付が土曜日または日曜日かどうかを判定
 *
 * @param date - 判定する日付
 * @returns 土日であれば true
 */
export function isWeekendDay(date: DateTime): boolean {
  // Luxon の weekday: 1=月曜 ... 6=土曜, 7=日曜
  return date.weekday === 6 || date.weekday === 7;
}

/**
 * from（含む）から to（含まない）までの営業日数を数える
 *
 * from <= to を前提とし、両者は startOf('day') 済みであること。
 * 週7日ごとに5営業日というパターンを使い、O(1)に近い計算量で求める。
 */
function countBusinessDaysForward(from: DateTime, to: DateTime): number {
  const totalDays = Math.round(to.diff(from, 'days').days);
  if (totalDays <= 0) return 0;

  const fullWeeks = Math.floor(totalDays / 7);
  const remainder = totalDays % 7;

  let count = fullWeeks * 5;
  for (let i = 0; i < remainder; i++) {
    if (!isWeekendDay(from.plus({ days: i }))) count++;
  }
  return count;
}

/**
 * 土日を詰めた軸上での、start から date までのオフセット（日数単位、小数可）を計算する
 *
 * 土日は幅0として扱われるため、土曜・日曜のどの時刻も直後の月曜0時と同じオフセットになる。
 *
 * @param date - オフセットを求める日付
 * @param start - 基準日（軸の原点）
 * @returns 営業日単位のオフセット（date が start より前の場合は負値）
 */
export function businessDayOffset(date: DateTime, start: DateTime): number {
  const startDay = start.startOf('day');
  const dateDay = date.startOf('day');

  if (dateDay >= startDay) {
    const whole = countBusinessDaysForward(startDay, dateDay);
    const fraction = isWeekendDay(dateDay) ? 0 : date.diff(dateDay, 'days').days;
    return whole + fraction;
  }

  const whole = countBusinessDaysForward(dateDay, startDay);
  const fraction = isWeekendDay(dateDay) ? 0 : date.diff(dateDay, 'days').days;
  return -(whole - fraction);
}

/**
 * 営業日単位のオフセットから、対応するカレンダー日付を計算する（businessDayOffset の逆変換）
 *
 * @param start - 基準日（軸の原点）
 * @param offsetDays - 営業日単位のオフセット（小数可、負値可）
 * @returns 対応するカレンダー日付
 */
export function addBusinessDayOffset(start: DateTime, offsetDays: number): DateTime {
  const sign = offsetDays >= 0 ? 1 : -1;
  const absOffset = Math.abs(offsetDays);
  const fullDays = Math.floor(absOffset);
  const fraction = absOffset - fullDays;

  const fullWeeks = Math.floor(fullDays / 5);
  const remainder = fullDays % 5;

  let cursor = start.startOf('day').plus({ days: sign * fullWeeks * 7 });

  let remaining = remainder;
  while (remaining > 0) {
    cursor = cursor.plus({ days: sign });
    if (!isWeekendDay(cursor)) remaining--;
  }

  if (fraction > 0) {
    // 端数（時刻）は平日上でのみ意味を持つため、週末上にいる場合は次の平日へ進める
    while (isWeekendDay(cursor)) {
      cursor = cursor.plus({ days: sign });
    }
    cursor = cursor.plus({ days: sign * fraction });
  }

  return cursor;
}
