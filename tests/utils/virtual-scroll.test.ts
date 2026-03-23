/**
 * Tests for X-axis virtual scrolling utilities
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  calculateXWindow,
  filterTicksByWindow,
  filterNodesByWindow,
  calculateYWindow,
} from '../../src/utils/virtual-scroll';
import type { Tick } from '../../src/utils/tick-generator';
import type { ComputedGanttNode } from '../../src/types';

const BASE_DATE = DateTime.fromISO('2024-01-01T00:00:00.000Z');

// ヘルパー: Tick を作成
function makeTick(startDays: number, endDays: number): Tick {
  return {
    start: BASE_DATE.plus({ days: startDays }),
    end: BASE_DATE.plus({ days: endDays }),
    label: `Day ${startDays}`,
  };
}

// ヘルパー: ComputedGanttNode を最低限の情報で作成
function makeNode(
  id: string,
  startDays: number,
  endDays: number,
  isDateUnset = false,
): ComputedGanttNode {
  return {
    id,
    parentId: null,
    type: 'task',
    name: `Node ${id}`,
    start: BASE_DATE.plus({ days: startDays }),
    end: BASE_DATE.plus({ days: endDays }),
    isCollapsed: false,
    depth: 0,
    isVisible: true,
    visualIndex: 0,
    childrenIds: [],
    isDateUnset,
  };
}

describe('calculateXWindow', () => {
  it('should calculate window from scrollLeft and viewportWidth', () => {
    // dayWidth=10, scrollLeft=100, viewportWidth=200 → 表示範囲は x=100..300
    // overscan = 200*0.5 = 100 → ウィンドウは x=0..400
    const window = calculateXWindow(100, 200, 10, BASE_DATE);

    expect(window.startPx).toBe(0); // max(0, 100-100)
    expect(window.endPx).toBe(400); // 100+200+100
    expect(window.startDate.toISO()).toBe(BASE_DATE.toISO()); // 0px = day 0
    // endDate = day 40
    expect(window.endDate.diff(BASE_DATE, 'days').days).toBeCloseTo(40);
  });

  it('should use custom overscanPx', () => {
    const window = calculateXWindow(200, 100, 10, BASE_DATE, 50);

    expect(window.startPx).toBe(150); // 200 - 50
    expect(window.endPx).toBe(350); // 200 + 100 + 50
  });

  it('should clamp startPx to 0', () => {
    // scrollLeft が overscan より小さい場合
    const window = calculateXWindow(10, 100, 10, BASE_DATE, 200);

    expect(window.startPx).toBe(0);
  });

  it('should convert pixel positions to dates correctly', () => {
    // dayWidth=20, 1日=20px
    // scrollLeft=0, viewportWidth=100, overscan=50
    // startPx=0, endPx=150 → day=0..7.5
    const window = calculateXWindow(0, 100, 20, BASE_DATE, 50);

    expect(window.startDate.toISO()).toBe(BASE_DATE.toISO());
    expect(window.endDate.diff(BASE_DATE, 'days').days).toBeCloseTo(7.5);
  });

  it('should handle scrollLeft=0 (initial state)', () => {
    const window = calculateXWindow(0, 1000, 30, BASE_DATE);

    expect(window.startPx).toBe(0);
    expect(window.endPx).toBe(1500); // 0+1000+500
  });

  it('should use viewportWidth*0.5 as default overscan', () => {
    const withDefault = calculateXWindow(500, 200, 10, BASE_DATE);
    const withExplicit = calculateXWindow(500, 200, 10, BASE_DATE, 100);

    expect(withDefault.startPx).toBe(withExplicit.startPx);
    expect(withDefault.endPx).toBe(withExplicit.endPx);
  });
});

describe('filterTicksByWindow', () => {
  const window = {
    startDate: BASE_DATE.plus({ days: 5 }),
    endDate: BASE_DATE.plus({ days: 15 }),
    startPx: 0,
    endPx: 0,
  };

  it('should include ticks fully inside window', () => {
    const ticks = [makeTick(6, 8), makeTick(10, 12)];
    expect(filterTicksByWindow(ticks, window)).toHaveLength(2);
  });

  it('should include ticks partially overlapping window start', () => {
    const ticks = [makeTick(3, 7)]; // 3-7, window starts at 5 → overlap
    expect(filterTicksByWindow(ticks, window)).toHaveLength(1);
  });

  it('should include ticks partially overlapping window end', () => {
    const ticks = [makeTick(12, 18)]; // 12-18, window ends at 15 → overlap
    expect(filterTicksByWindow(ticks, window)).toHaveLength(1);
  });

  it('should exclude ticks entirely before window', () => {
    const ticks = [makeTick(0, 4)]; // ends at 4, window starts at 5
    expect(filterTicksByWindow(ticks, window)).toHaveLength(0);
  });

  it('should exclude ticks entirely after window', () => {
    const ticks = [makeTick(16, 20)]; // starts at 16, window ends at 15
    expect(filterTicksByWindow(ticks, window)).toHaveLength(0);
  });

  it('should return empty for empty input', () => {
    expect(filterTicksByWindow([], window)).toHaveLength(0);
  });

  it('should correctly filter a mixed set', () => {
    const ticks = [
      makeTick(0, 3),   // before → excluded
      makeTick(3, 7),   // partial start → included
      makeTick(8, 12),  // inside → included
      makeTick(14, 18), // partial end → included
      makeTick(17, 20), // after → excluded
    ];
    const result = filterTicksByWindow(ticks, window);
    expect(result).toHaveLength(3);
  });
});

describe('filterNodesByWindow', () => {
  const window = {
    startDate: BASE_DATE.plus({ days: 10 }),
    endDate: BASE_DATE.plus({ days: 20 }),
    startPx: 0,
    endPx: 0,
  };

  it('should include nodes fully inside window', () => {
    const nodes = [makeNode('1', 11, 15)];
    expect(filterNodesByWindow(nodes, window)).toHaveLength(1);
  });

  it('should include nodes partially overlapping', () => {
    const nodes = [makeNode('1', 8, 12)];
    expect(filterNodesByWindow(nodes, window)).toHaveLength(1);
  });

  it('should exclude nodes entirely outside window', () => {
    const nodes = [makeNode('1', 0, 8), makeNode('2', 22, 30)];
    expect(filterNodesByWindow(nodes, window)).toHaveLength(0);
  });

  it('should always include isDateUnset nodes', () => {
    const nodes = [makeNode('1', 0, 5, true)]; // outside window but isDateUnset
    expect(filterNodesByWindow(nodes, window)).toHaveLength(1);
  });

  it('should return empty for empty input', () => {
    expect(filterNodesByWindow([], window)).toHaveLength(0);
  });
});

describe('calculateYWindow', () => {
  const ROW_HEIGHT = 40;

  it('should return startIndex=0 when scrollTop=0', () => {
    const w = calculateYWindow(0, 400, ROW_HEIGHT, 100);
    expect(w.startIndex).toBe(0);
  });

  it('should include overscan rows above visible area', () => {
    // scrollTop=200 → first visible row=5, overscan=5 → startIndex=0
    const w = calculateYWindow(200, 400, ROW_HEIGHT, 100);
    expect(w.startIndex).toBe(0); // max(0, 5-5)
  });

  it('should include overscan rows below visible area', () => {
    // scrollTop=0, viewportHeight=200 → last visible row=4, overscan=5 → endIndex=9
    const w = calculateYWindow(0, 200, ROW_HEIGHT, 100);
    expect(w.endIndex).toBe(9); // ceil(200/40)+5-1 = 5+5-1 = 9
  });

  it('should clamp startIndex to 0', () => {
    const w = calculateYWindow(0, 400, ROW_HEIGHT, 100, 10);
    expect(w.startIndex).toBe(0);
  });

  it('should clamp endIndex to totalRows-1', () => {
    const w = calculateYWindow(0, 5000, ROW_HEIGHT, 10); // viewport taller than content
    expect(w.endIndex).toBe(9); // totalRows-1
  });

  it('should calculate offsetY correctly', () => {
    // scrollTop=800 → first visible row=20, overscan=5 → startIndex=15
    const w = calculateYWindow(800, 400, ROW_HEIGHT, 100);
    expect(w.startIndex).toBe(15); // max(0, 20-5)
    expect(w.offsetY).toBe(15 * ROW_HEIGHT); // 600
  });

  it('should calculate totalHeight correctly', () => {
    const w = calculateYWindow(0, 400, ROW_HEIGHT, 50);
    expect(w.totalHeight).toBe(50 * ROW_HEIGHT); // 2000
  });

  it('should handle totalRows=0', () => {
    const w = calculateYWindow(0, 400, ROW_HEIGHT, 0);
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(-1);
    expect(w.totalHeight).toBe(0);
  });

  it('should handle custom overscanRows', () => {
    // scrollTop=400 → first visible row=10, overscanRows=2 → startIndex=8
    const w = calculateYWindow(400, 400, ROW_HEIGHT, 100, 2);
    expect(w.startIndex).toBe(8); // max(0, 10-2)
  });

  it('should correctly window mid-scroll position', () => {
    // scrollTop=1000, viewportHeight=300, rowHeight=40, totalRows=200, overscan=5
    // firstVisible = floor(1000/40) = 25, startIndex = max(0, 25-5) = 20
    // lastVisible = ceil(1300/40) - 1 = 33 - 1 = 32, endIndex = min(199, 32+5) = 37
    const w = calculateYWindow(1000, 300, ROW_HEIGHT, 200);
    expect(w.startIndex).toBe(20);
    expect(w.endIndex).toBe(37);
    expect(w.offsetY).toBe(20 * ROW_HEIGHT);
    expect(w.totalHeight).toBe(200 * ROW_HEIGHT);
  });
});
