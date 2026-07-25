/**
 * Tests for business-day (weekend-compressed axis) utilities
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { isWeekendDay, businessDayOffset, addBusinessDayOffset } from '../../src/utils/business-days';

describe('isWeekendDay', () => {
  it('should identify Saturday and Sunday as weekend', () => {
    expect(isWeekendDay(DateTime.fromISO('2024-01-06'))).toBe(true); // Sat
    expect(isWeekendDay(DateTime.fromISO('2024-01-07'))).toBe(true); // Sun
  });

  it('should identify Monday through Friday as non-weekend', () => {
    expect(isWeekendDay(DateTime.fromISO('2024-01-01'))).toBe(false); // Mon
    expect(isWeekendDay(DateTime.fromISO('2024-01-05'))).toBe(false); // Fri
  });
});

describe('businessDayOffset', () => {
  it('should count only business days between weekdays in the same week', () => {
    const monday = DateTime.fromISO('2024-01-01'); // Mon
    const friday = DateTime.fromISO('2024-01-05'); // Fri
    expect(businessDayOffset(friday, monday)).toBe(4);
  });

  it('should collapse the weekend to zero width', () => {
    const monday = DateTime.fromISO('2024-01-01');
    const saturday = DateTime.fromISO('2024-01-06');
    const sunday = DateTime.fromISO('2024-01-07');
    const nextMonday = DateTime.fromISO('2024-01-08');

    expect(businessDayOffset(saturday, monday)).toBe(businessDayOffset(nextMonday, monday));
    expect(businessDayOffset(sunday, monday)).toBe(businessDayOffset(nextMonday, monday));
    expect(businessDayOffset(nextMonday, monday)).toBe(5);
  });

  it('should return 0 for the same day', () => {
    const monday = DateTime.fromISO('2024-01-01');
    expect(businessDayOffset(monday, monday)).toBe(0);
  });

  it('should count business days across multiple weeks', () => {
    const start = DateTime.fromISO('2024-01-01'); // Mon
    const twoWeeksLater = DateTime.fromISO('2024-01-15'); // Mon, 2 weeks later
    expect(businessDayOffset(twoWeeksLater, start)).toBe(10);
  });
});

describe('addBusinessDayOffset', () => {
  it('should add whole business days skipping weekends', () => {
    const monday = DateTime.fromISO('2024-01-01');
    // 4 business days from Monday lands on Friday
    expect(addBusinessDayOffset(monday, 4).toISODate()).toBe('2024-01-05');
    // 5 business days from Monday skips the weekend and lands on next Monday
    expect(addBusinessDayOffset(monday, 5).toISODate()).toBe('2024-01-08');
  });

  it('should round-trip with businessDayOffset for business-day dates', () => {
    const start = DateTime.fromISO('2024-01-01');
    const target = DateTime.fromISO('2024-01-17'); // Wed, 3rd week
    const offset = businessDayOffset(target, start);
    expect(addBusinessDayOffset(start, offset).toISODate()).toBe(target.toISODate());
  });
});
