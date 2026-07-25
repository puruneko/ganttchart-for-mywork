import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { computeUnscheduledStart, computeUnscheduledRange } from '../../src/utils/unscheduled-schedule';

describe('computeUnscheduledStart', () => {
  const anchor = DateTime.fromISO('2026-08-01T09:00');

  it('minorUnit=hour: 15分単位に丸める（切り上げ）', () => {
    // anchor + 0日、時刻はそのまま 09:00 のまま daysDelta を分に反映させるため
    // ここでは daysDelta で時間帯をずらすテストにする（daysDelta は日数なので端数で時刻が動く）
    const result = computeUnscheduledStart(anchor, 0.0071, 'hour', 9, false); // +約10分
    // 09:00 + 10.2分 ≈ 09:10.2 → 15分単位で 09:15 に丸め
    expect(result.toFormat('HH:mm')).toBe('09:15');
  });

  it('minorUnit=hour: 端数が7分未満なら切り捨てる', () => {
    const result = computeUnscheduledStart(anchor, 0.0028, 'hour', 9, false); // +約4分
    expect(result.toFormat('HH:mm')).toBe('09:00');
  });

  it('minorUnit=day: 日単位に丸め、時刻は defaultStartHour:00 に固定する', () => {
    const result = computeUnscheduledStart(anchor, 2, 'day', 9, false);
    expect(result.toISODate()).toBe('2026-08-03');
    expect(result.toFormat('HH:mm')).toBe('09:00');
  });

  it('minorUnit=day: anchor の時刻(09:00)を無視して defaultStartHour を使う', () => {
    const afternoonAnchor = DateTime.fromISO('2026-08-01T15:30');
    const result = computeUnscheduledStart(afternoonAnchor, 1, 'day', 9, false);
    expect(result.toFormat('HH:mm')).toBe('09:00');
  });

  it('defaultStartHour が変更されている場合はその時刻を使う', () => {
    const result = computeUnscheduledStart(anchor, 0, 'week', 13, false);
    expect(result.toFormat('HH:mm')).toBe('13:00');
  });

  it('minorUnit=month でも日単位丸めと同じ扱いになる', () => {
    const result = computeUnscheduledStart(anchor, 30, 'month', 9, false);
    expect(result.toISODate()).toBe('2026-08-31');
    expect(result.toFormat('HH:mm')).toBe('09:00');
  });

  it('負の daysDelta（左方向へのドラッグ）でも正しく計算される', () => {
    const result = computeUnscheduledStart(anchor, -1, 'day', 9, false);
    expect(result.toISODate()).toBe('2026-07-31');
  });
});

describe('computeUnscheduledRange', () => {
  it('start に defaultDurationMinutes を加えた end を返す', () => {
    const anchor = DateTime.fromISO('2026-08-01T09:00');
    const { start, end } = computeUnscheduledRange(anchor, 1, 'day', 9, 60, false);
    expect(start.toISODate()).toBe('2026-08-02');
    expect(start.toFormat('HH:mm')).toBe('09:00');
    expect(end.toFormat('HH:mm')).toBe('10:00');
  });

  it('defaultDurationMinutes が 30 の場合は30分後が end になる', () => {
    const anchor = DateTime.fromISO('2026-08-01T09:00');
    const { start, end } = computeUnscheduledRange(anchor, 0, 'hour', 9, 30, false);
    expect(end.diff(start, 'minutes').minutes).toBe(30);
  });
});
