/**
 * Tests for dayKind (weekend/holiday classification)
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { dayKind, buildHolidaySet, DEFAULT_WEEKEND_DAYS } from '../../src/utils/day-kind';

describe('dayKind', () => {
  it('should classify a plain weekday as normal', () => {
    // 2024-01-01 is a Monday
    const date = DateTime.fromISO('2024-01-01');
    expect(dayKind(date, [], [6, 7])).toBe('normal');
  });

  it('should classify Saturday/Sunday as weekend by default', () => {
    const saturday = DateTime.fromISO('2024-01-06');
    const sunday = DateTime.fromISO('2024-01-07');
    expect(dayKind(saturday, [])).toBe('weekend');
    expect(dayKind(sunday, [])).toBe('weekend');
  });

  it('should classify a listed date as holiday', () => {
    const date = DateTime.fromISO('2024-01-01');
    expect(dayKind(date, ['2024-01-01'])).toBe('holiday');
  });

  it('should prioritize holiday over weekend when both apply', () => {
    // 2024-01-06 is a Saturday
    const date = DateTime.fromISO('2024-01-06');
    expect(dayKind(date, ['2024-01-06'])).toBe('holiday');
  });

  it('should return normal for empty holidays and no weekend match', () => {
    const date = DateTime.fromISO('2024-01-02'); // Tuesday
    expect(dayKind(date, [])).toBe('normal');
  });

  it('should respect a custom weekend definition', () => {
    // Friday(5) + Saturday(6) as weekend, Sunday(7) as normal
    const friday = DateTime.fromISO('2024-01-05');
    const sunday = DateTime.fromISO('2024-01-07');
    expect(dayKind(friday, [], [5, 6])).toBe('weekend');
    expect(dayKind(sunday, [], [5, 6])).toBe('normal');
  });

  it('should accept a pre-built holiday Set', () => {
    const set = buildHolidaySet(['2024-01-01']);
    const date = DateTime.fromISO('2024-01-01');
    expect(dayKind(date, set)).toBe('holiday');
  });

  it('should have Sat/Sun as the default weekend days', () => {
    expect(DEFAULT_WEEKEND_DAYS).toEqual([6, 7]);
  });
});
