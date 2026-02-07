/**
 * Tests for timeline calculation utilities
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  dateToX,
  rowToY,
  durationToWidth,
  generateDateTicks,
  calculateTimelineWidth,
  calculateTimelineHeight,
  getBarClass
} from './timeline-calculations';

describe('dateToX', () => {
  it('should calculate X position for dates', () => {
    const dateRange = {
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-01-10')
    };
    
    const x1 = dateToX(DateTime.fromISO('2024-01-01'), dateRange, 30);
    const x2 = dateToX(DateTime.fromISO('2024-01-02'), dateRange, 30);
    const x5 = dateToX(DateTime.fromISO('2024-01-05'), dateRange, 30);
    
    expect(x1).toBe(0);
    expect(x2).toBe(30);
    expect(x5).toBe(120);
  });
});

describe('rowToY', () => {
  it('should calculate Y position for rows', () => {
    expect(rowToY(0, 40)).toBe(0);
    expect(rowToY(1, 40)).toBe(40);
    expect(rowToY(5, 40)).toBe(200);
  });
});

describe('durationToWidth', () => {
  it('should calculate width from duration', () => {
    const start = DateTime.fromISO('2024-01-01');
    const end1 = DateTime.fromISO('2024-01-05');
    const end2 = DateTime.fromISO('2024-01-11');
    
    expect(durationToWidth(start, end1, 30)).toBe(120); // 4 days * 30
    expect(durationToWidth(start, end2, 30)).toBe(300); // 10 days * 30
  });
  
  it('should enforce minimum width', () => {
    const start = DateTime.fromISO('2024-01-01');
    const end = DateTime.fromISO('2024-01-01'); // same day
    
    expect(durationToWidth(start, end, 30)).toBe(2); // minimum 2px
  });
});

describe('generateDateTicks', () => {
  it('should generate daily ticks', () => {
    const dateRange = {
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-01-05')
    };
    
    const ticks = generateDateTicks(dateRange);
    
    expect(ticks).toHaveLength(5);
    expect(ticks[0].toISODate()).toBe('2024-01-01');
    expect(ticks[4].toISODate()).toBe('2024-01-05');
  });
});

describe('calculateTimelineWidth', () => {
  it('should calculate total width', () => {
    const dateRange = {
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-01-11')
    };
    
    const width = calculateTimelineWidth(dateRange, 30);
    expect(width).toBe(300); // 10 days * 30px
  });
});

describe('calculateTimelineHeight', () => {
  it('should calculate total height', () => {
    expect(calculateTimelineHeight(5, 40)).toBe(200);
    expect(calculateTimelineHeight(10, 50)).toBe(500);
  });
});

describe('getBarClass', () => {
  it('should generate correct class names', () => {
    expect(getBarClass('project', 'gantt')).toBe('gantt-bar gantt-bar--project');
    expect(getBarClass('task', 'gantt')).toBe('gantt-bar gantt-bar--task');
    expect(getBarClass('section', 'custom')).toBe('custom-bar custom-bar--section');
  });
});
