/**
 * ドラッグハンドラーのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateTime } from 'luxon';
import { createDragHandler } from '../../src/utils/drag-handler';
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

function makeMouseEvent(clientX: number): MouseEvent {
  return { clientX, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent;
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
});
