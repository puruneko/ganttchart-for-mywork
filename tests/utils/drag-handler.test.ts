/**
 * ドラッグハンドラーのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateTime } from 'luxon';
import { createDragHandler, createUnscheduledDragHandler } from '../../src/utils/drag-handler';
import type { ComputedGanttNode } from '../../src/types';

function makeNode(id: string, startIso: string, endIso: string): ComputedGanttNode {
  return {
    id,
    label: id,
    start: DateTime.fromISO(startIso),
    end: DateTime.fromISO(endIso),
    x: 0,
    width: 100,
    y: 0,
    level: 0,
    type: 'bar',
    children: [],
    originalNode: { id, label: id, start: startIso, end: endIso },
  } as unknown as ComputedGanttNode;
}

function makeMouseEvent(clientX: number, button = 0): MouseEvent {
  return { clientX, button, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent;
}

describe('createDragHandler', () => {
  let onBarDrag: ReturnType<typeof vi.fn>;
  let onBarDragEnd: ReturnType<typeof vi.fn>;
  let onGroupDrag: ReturnType<typeof vi.fn>;

  const DAY_WIDTH = 40;
  const SNAP_UNIT = 40; // 1日単位スナップ

  beforeEach(() => {
    onBarDrag = vi.fn();
    onBarDragEnd = vi.fn();
    onGroupDrag = vi.fn();
    vi.restoreAllMocks();
  });

  function createHandler() {
    return createDragHandler({
      getParams: () => ({
        dayWidth: DAY_WIDTH,
        snapUnit: SNAP_UNIT,
        onBarDrag,
        onBarDragEnd,
        onGroupDrag,
      }),
    });
  }

  function simulateDrag(
    handler: ReturnType<typeof createDragHandler>,
    node: ComputedGanttNode,
    mode: Parameters<ReturnType<typeof createDragHandler>['handleMouseDown']>[1],
    startClientX: number,
    endClientX: number,
  ) {
    // mousemove / mouseup リスナーを window.addEventListener でキャプチャ
    const listeners: Record<string, EventListener> = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
      listeners[type] = listener as EventListener;
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});

    handler.handleMouseDown(node, mode, makeMouseEvent(startClientX));

    // mousemove
    if (listeners['mousemove']) {
      listeners['mousemove'](makeMouseEvent(endClientX) as unknown as Event);
    }

    // mouseup
    if (listeners['mouseup']) {
      listeners['mouseup'](makeMouseEvent(endClientX) as unknown as Event);
    }
  }

  describe('onBarDragEnd', () => {
    it('mouseup 時に onBarDragEnd が呼ばれる', () => {
      const handler = createHandler();
      const node = makeNode('task-1', '2026-01-01', '2026-01-05');

      simulateDrag(handler, node, 'move', 0, DAY_WIDTH * 2); // 2日移動

      expect(onBarDragEnd).toHaveBeenCalledTimes(1);
    });

    it('onBarDragEnd に正しい最終 start/end が渡される（move モード）', () => {
      const handler = createHandler();
      const node = makeNode('task-1', '2026-01-01', '2026-01-05');

      simulateDrag(handler, node, 'move', 0, DAY_WIDTH * 3); // 3日移動

      const [nodeId, finalStart, finalEnd] = onBarDragEnd.mock.calls[0];
      expect(nodeId).toBe('task-1');
      expect(finalStart.toISODate()).toBe('2026-01-04'); // 1/1 + 3日
      expect(finalEnd.toISODate()).toBe('2026-01-08');   // 1/5 + 3日
    });

    it('mousemove なしで mouseup した場合は初期位置が渡される', () => {
      const handler = createHandler();
      const node = makeNode('task-1', '2026-01-01', '2026-01-05');

      const listeners: Record<string, EventListener> = {};
      vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
        listeners[type] = listener as EventListener;
      });
      vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});

      handler.handleMouseDown(node, 'move', makeMouseEvent(0));
      // mousemove なし → mouseup のみ
      if (listeners['mouseup']) {
        listeners['mouseup'](makeMouseEvent(0) as unknown as Event);
      }

      const [nodeId, finalStart, finalEnd] = onBarDragEnd.mock.calls[0];
      expect(nodeId).toBe('task-1');
      expect(finalStart.toISODate()).toBe('2026-01-01');
      expect(finalEnd.toISODate()).toBe('2026-01-05');
    });

    it('mousemove 中は onBarDragEnd が呼ばれない', () => {
      const handler = createHandler();
      const node = makeNode('task-1', '2026-01-01', '2026-01-05');

      const listeners: Record<string, EventListener> = {};
      vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
        listeners[type] = listener as EventListener;
      });
      vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});

      handler.handleMouseDown(node, 'move', makeMouseEvent(0));

      // 複数回 mousemove
      for (let i = 1; i <= 5; i++) {
        listeners['mousemove']?.(makeMouseEvent(DAY_WIDTH * i) as unknown as Event);
      }

      expect(onBarDragEnd).not.toHaveBeenCalled();
    });

    it('onBarDragEnd が未設定でもエラーにならない', () => {
      const handler = createDragHandler({
        getParams: () => ({
          dayWidth: DAY_WIDTH,
          snapUnit: SNAP_UNIT,
          onBarDrag,
          // onBarDragEnd なし
        }),
      });
      const node = makeNode('task-1', '2026-01-01', '2026-01-05');

      expect(() => simulateDrag(handler, node, 'move', 0, DAY_WIDTH)).not.toThrow();
    });
  });

  describe('右クリック等（issue #0025: チャート全域での右クリックパン対応）', () => {
    it('button !== 0（右クリック等）の場合は preventDefault/stopPropagation を呼ばず、何もしない', () => {
      const handler = createHandler();
      const node = makeNode('task-1', '2026-01-01', '2026-01-05');
      const event = makeMouseEvent(0, 2); // 右クリック

      vi.spyOn(window, 'addEventListener');

      handler.handleMouseDown(node, 'move', event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.stopPropagation).not.toHaveBeenCalled();
      expect(window.addEventListener).not.toHaveBeenCalled();
    });

    it('button === 0（左クリック）の場合は従来どおり preventDefault/stopPropagation を呼ぶ', () => {
      const handler = createHandler();
      const node = makeNode('task-1', '2026-01-01', '2026-01-05');
      const event = makeMouseEvent(0, 0);

      vi.spyOn(window, 'addEventListener').mockImplementation(() => {});

      handler.handleMouseDown(node, 'move', event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('group-move モードでも右クリックは何もしない', () => {
      const handler = createHandler();
      const node = makeNode('section-1', '2026-01-01', '2026-01-05');
      const event = makeMouseEvent(0, 2);

      handler.handleMouseDown(node, 'group-move', event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.stopPropagation).not.toHaveBeenCalled();
    });
  });
});

describe('createUnscheduledDragHandler', () => {
  const DAY_WIDTH = 40;
  const ANCHOR = DateTime.fromISO('2026-08-01T09:00');

  let onGhostUpdate: ReturnType<typeof vi.fn>;
  let onGhostClear: ReturnType<typeof vi.fn>;
  let onSchedule: ReturnType<typeof vi.fn>;
  let isWithinTimeline: ReturnType<typeof vi.fn>;
  let listeners: Record<string, EventListener>;

  beforeEach(() => {
    vi.restoreAllMocks();
    onGhostUpdate = vi.fn();
    onGhostClear = vi.fn();
    onSchedule = vi.fn();
    isWithinTimeline = vi.fn().mockReturnValue(true);
    listeners = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
      listeners[type] = listener as EventListener;
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  function createHandler(overrides: Partial<{
    minorUnit: 'hour' | 'day' | 'week' | 'month';
    defaultDurationMinutes: number;
    defaultStartHour: number;
    hideWeekends: boolean;
  }> = {}) {
    return createUnscheduledDragHandler({
      getParams: () => ({
        dayWidth: DAY_WIDTH,
        hideWeekends: overrides.hideWeekends,
        minorUnit: overrides.minorUnit ?? 'day',
        defaultDurationMinutes: overrides.defaultDurationMinutes ?? 60,
        defaultStartHour: overrides.defaultStartHour ?? 9,
        isWithinTimeline,
        onGhostUpdate,
        onGhostClear,
        onSchedule,
      }),
    });
  }

  it('mousedown 時に window へ mousemove/mouseup リスナーを登録する', () => {
    const handler = createHandler();
    handler.handleMouseDown('sub-1', ANCHOR, makeMouseEvent(0));
    expect(listeners['mousemove']).toBeDefined();
    expect(listeners['mouseup']).toBeDefined();
  });

  it('mousemove のたびに onGhostUpdate が呼ばれ、onSchedule は呼ばれない', () => {
    const handler = createHandler();
    handler.handleMouseDown('sub-1', ANCHOR, makeMouseEvent(0));
    listeners['mousemove'](makeMouseEvent(DAY_WIDTH) as unknown as Event);

    expect(onGhostUpdate).toHaveBeenCalledTimes(1);
    expect(onSchedule).not.toHaveBeenCalled();
    const [nodeId] = onGhostUpdate.mock.calls[0];
    expect(nodeId).toBe('sub-1');
  });

  it('タイムライン内で mouseup すると onSchedule が1回だけ呼ばれる', () => {
    const handler = createHandler();
    handler.handleMouseDown('sub-1', ANCHOR, makeMouseEvent(0));
    listeners['mousemove'](makeMouseEvent(DAY_WIDTH) as unknown as Event);
    listeners['mouseup'](makeMouseEvent(DAY_WIDTH) as unknown as Event);

    expect(onSchedule).toHaveBeenCalledTimes(1);
    const [nodeId, start] = onSchedule.mock.calls[0];
    expect(nodeId).toBe('sub-1');
    expect(start.toISODate()).toBe('2026-08-02'); // anchor + 1日
  });

  it('onSchedule の start/end は defaultDurationMinutes だけ離れている', () => {
    const handler = createHandler({ defaultDurationMinutes: 30 });
    handler.handleMouseDown('sub-1', ANCHOR, makeMouseEvent(0));
    listeners['mouseup'](makeMouseEvent(0) as unknown as Event);

    const [, start, end] = onSchedule.mock.calls[0];
    expect(end.diff(start, 'minutes').minutes).toBe(30);
  });

  it('タイムライン外で mouseup すると onSchedule は呼ばれない', () => {
    isWithinTimeline.mockReturnValue(false);
    const handler = createHandler();
    handler.handleMouseDown('sub-1', ANCHOR, makeMouseEvent(0));
    listeners['mouseup'](makeMouseEvent(DAY_WIDTH) as unknown as Event);

    expect(onSchedule).not.toHaveBeenCalled();
  });

  it('タイムライン外で mouseup してもゴーストは消去される', () => {
    isWithinTimeline.mockReturnValue(false);
    const handler = createHandler();
    handler.handleMouseDown('sub-1', ANCHOR, makeMouseEvent(0));
    listeners['mouseup'](makeMouseEvent(DAY_WIDTH) as unknown as Event);

    expect(onGhostClear).toHaveBeenCalledWith('sub-1');
  });

  it('mouseup 後は mousemove を追跡しない（リスナー解除）', () => {
    const handler = createHandler();
    handler.handleMouseDown('sub-1', ANCHOR, makeMouseEvent(0));
    listeners['mouseup'](makeMouseEvent(0) as unknown as Event);

    expect(window.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });

  it('minorUnit=hour のときは15分単位に丸めた start になる', () => {
    const handler = createHandler({ minorUnit: 'hour' });
    // DAY_WIDTH(40px) = 1日 → 10px ≈ 0.25日 ≈ 6時間 → 09:00 + 6h = 15:00（15分単位で丸め不要な例）
    handler.handleMouseDown('sub-1', ANCHOR, makeMouseEvent(0));
    listeners['mouseup'](makeMouseEvent(10) as unknown as Event);

    const [, start] = onSchedule.mock.calls[0];
    expect(start.minute % 15).toBe(0);
  });

  it('右クリック等（button !== 0）では何もしない（issue #0025）', () => {
    const handler = createHandler();
    const event = makeMouseEvent(0, 2);

    handler.handleMouseDown('sub-1', ANCHOR, event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(window.addEventListener).not.toHaveBeenCalled();
  });
});
