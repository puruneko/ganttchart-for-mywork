/**
 * Pure functions for timeline calculations
 * No Svelte dependencies - can be tested independently
 */

import type { DateTime } from 'luxon';
import type { DateRange } from '../types';

/**
 * Calculate X position for a date on the timeline
 */
export function dateToX(date: DateTime, dateRange: DateRange, dayWidth: number): number {
  const diffDays = date.diff(dateRange.start, 'days').days;
  return diffDays * dayWidth;
}

/**
 * Calculate Y position for a row index
 */
export function rowToY(rowIndex: number, rowHeight: number): number {
  return rowIndex * rowHeight;
}

/**
 * Calculate width for a date span
 */
export function durationToWidth(start: DateTime, end: DateTime, dayWidth: number): number {
  const diffDays = end.diff(start, 'days').days;
  return Math.max(diffDays * dayWidth, 2); // Minimum 2px width
}

/**
 * Generate array of dates for timeline header
 */
export function generateDateTicks(dateRange: DateRange): DateTime[] {
  const ticks: DateTime[] = [];
  let current = dateRange.start;
  
  while (current <= dateRange.end) {
    ticks.push(current);
    current = current.plus({ days: 1 });
  }
  
  return ticks;
}

/**
 * Calculate total width of timeline
 */
export function calculateTimelineWidth(dateRange: DateRange, dayWidth: number): number {
  const days = dateRange.end.diff(dateRange.start, 'days').days;
  return days * dayWidth;
}

/**
 * Calculate total height of timeline
 */
export function calculateTimelineHeight(visibleRowCount: number, rowHeight: number): number {
  return visibleRowCount * rowHeight;
}

/**
 * Get bar style based on node type
 */
export function getBarClass(nodeType: string, classPrefix: string): string {
  return `${classPrefix}-bar ${classPrefix}-bar--${nodeType}`;
}
