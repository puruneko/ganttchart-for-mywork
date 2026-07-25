/**
 * 期間なしサブタスク行のドラッグ予定化（issue-gantt-phase004-008）の
 * コンポーネント統合テスト。
 *
 * タイムライン外ドロップ時のキャンセル判定（isWithinTimeline）自体は
 * tests/utils/drag-handler.test.ts で DOM 非依存の純粋ロジックとして検証済み。
 * ここでは実際に GanttChart をマウントし、テキスト行のドラッグから
 * onSchedule 発火・ゴースト描画までのワイヤリングを確認する。
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { DateTime } from 'luxon';
import GanttChart from '../../src/components/GanttChart.svelte';
import type { GanttNode } from '../../src/types';

function makeNodes(): GanttNode[] {
  return [
    {
      id: 'parent',
      parentId: null,
      type: 'task',
      name: '親タスク',
      start: DateTime.fromISO('2026-08-01T09:00'),
      end: DateTime.fromISO('2026-08-10T18:00'),
    },
    {
      id: 'child-unscheduled',
      parentId: 'parent',
      type: 'task',
      name: '子タスクB（未定）',
    },
  ];
}

describe('GanttChart — 期間なしサブタスク行のドラッグ予定化', () => {
  it('テキスト行をドラッグするとゴーストが表示され、ドロップで onSchedule が1回発火する', async () => {
    const onSchedule = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: { onSchedule },
      },
    });

    const textEl = [...container.querySelectorAll('text')].find((el) =>
      el.textContent?.includes('子タスクB'),
    );
    expect(textEl).toBeTruthy();

    await fireEvent.mouseDown(textEl!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: 40, clientY: 0 }); // dayWidth 分 = 1日移動

    expect(container.querySelector('.gantt-ghost-bar')).toBeTruthy();

    await fireEvent.mouseUp(window, { clientX: 40, clientY: 0 });

    expect(onSchedule).toHaveBeenCalledTimes(1);
    const [nodeId, start, end] = onSchedule.mock.calls[0];
    expect(nodeId).toBe('child-unscheduled');
    expect(start.toISODate()).toBe('2026-08-02'); // 親の anchor(08-01) + 1日
    expect(end.diff(start, 'minutes').minutes).toBe(60); // 既定期間長

    // ドロップ後はゴーストが消える
    expect(container.querySelector('.gantt-ghost-bar')).toBeFalsy();
  });

  it('ドラッグ中は onSchedule が発火しない（mouseup で1回だけ発火する）', async () => {
    const onSchedule = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: { onSchedule },
      },
    });

    const textEl = [...container.querySelectorAll('text')].find((el) =>
      el.textContent?.includes('子タスクB'),
    );

    await fireEvent.mouseDown(textEl!, { clientX: 0, clientY: 0 });
    for (let i = 1; i <= 5; i++) {
      await fireEvent.mouseMove(window, { clientX: 10 * i, clientY: 0 });
    }
    expect(onSchedule).not.toHaveBeenCalled();

    await fireEvent.mouseUp(window, { clientX: 50, clientY: 0 });
    expect(onSchedule).toHaveBeenCalledTimes(1);
  });

  it('defaultDurationMinutes を config で変更すると end がその分だけ離れる', async () => {
    const onSchedule = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40, defaultDurationMinutes: 30 },
        handlers: { onSchedule },
      },
    });

    const textEl = [...container.querySelectorAll('text')].find((el) =>
      el.textContent?.includes('子タスクB'),
    );
    await fireEvent.mouseDown(textEl!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseUp(window, { clientX: 0, clientY: 0 });

    const [, start, end] = onSchedule.mock.calls[0];
    expect(end.diff(start, 'minutes').minutes).toBe(30);
  });

  it('テキスト行をクリックすると onBarClick が対象ノードで1回発火する', async () => {
    const onBarClick = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: { onBarClick },
      },
    });

    const textEl = [...container.querySelectorAll('text')].find((el) =>
      el.textContent?.includes('子タスクB'),
    );
    expect(textEl).toBeTruthy();

    await fireEvent.click(textEl!);

    expect(onBarClick).toHaveBeenCalledTimes(1);
    const [node] = onBarClick.mock.calls[0];
    expect(node.id).toBe('child-unscheduled');
  });
});
