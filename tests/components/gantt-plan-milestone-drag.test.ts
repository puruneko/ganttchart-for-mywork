/**
 * issue #0028:
 * - plan（実施予定枠）のリサイズ・移動
 * - マイルストン（期間指定）のリサイズ・移動
 * - マイルストン（一点指定）の移動
 * - ラベルの優先度ベースのクリッピング（plan ＜ バー ＜ マイルストン）
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { DateTime } from 'luxon';
import GanttChart from '../../src/components/GanttChart.svelte';
import type { GanttNode } from '../../src/types';

const DAY_WIDTH = 40;

describe('issue #0028: plan のリサイズ・移動', () => {
  function makeNodes(): GanttNode[] {
    return [
      {
        id: 'task-with-plan',
        parentId: null,
        type: 'task',
        name: 'PlanタスクA',
        start: DateTime.fromISO('2026-08-05'),
        end: DateTime.fromISO('2026-08-10'),
        // plan はスケジュールより広く取り、plan独自のハンドルがバーのハンドルと重ならないようにする
        plan: { start: DateTime.fromISO('2026-08-01'), end: DateTime.fromISO('2026-08-15') },
      },
    ];
  }

  it('plan の左ハンドルをドラッグすると onPlanDragEnd が発火し、終了日は変わらない', async () => {
    const onPlanDragEnd = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: DAY_WIDTH },
        handlers: { onPlanDragEnd },
      },
    });

    const startHandle = container.querySelector(
      '.gantt-plan-resize-handle.gantt-resize-handle--start[data-node-id="task-with-plan"]',
    );
    expect(startHandle).toBeTruthy();

    await fireEvent.mouseDown(startHandle!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: DAY_WIDTH * 2, clientY: 0 }); // 2日分右へ
    await fireEvent.mouseUp(window, { clientX: DAY_WIDTH * 2, clientY: 0 });

    expect(onPlanDragEnd).toHaveBeenCalledTimes(1);
    const [nodeId, finalStart, finalEnd] = onPlanDragEnd.mock.calls[0];
    expect(nodeId).toBe('task-with-plan');
    expect(finalStart.toISODate()).toBe('2026-08-03'); // 8/1 + 2日
    expect(finalEnd.toISODate()).toBe('2026-08-15'); // 不変
  });

  it('plan の右ハンドルをドラッグすると onPlanDragEnd が発火し、開始日は変わらない', async () => {
    const onPlanDragEnd = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: DAY_WIDTH },
        handlers: { onPlanDragEnd },
      },
    });

    const endHandle = container.querySelector(
      '.gantt-plan-resize-handle.gantt-resize-handle--end[data-node-id="task-with-plan"]',
    );
    expect(endHandle).toBeTruthy();

    await fireEvent.mouseDown(endHandle!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: -DAY_WIDTH * 3, clientY: 0 }); // 3日分左へ
    await fireEvent.mouseUp(window, { clientX: -DAY_WIDTH * 3, clientY: 0 });

    expect(onPlanDragEnd).toHaveBeenCalledTimes(1);
    const [nodeId, finalStart, finalEnd] = onPlanDragEnd.mock.calls[0];
    expect(nodeId).toBe('task-with-plan');
    expect(finalStart.toISODate()).toBe('2026-08-01'); // 不変
    expect(finalEnd.toISODate()).toBe('2026-08-12'); // 8/15 - 3日
  });

  it('plan 枠本体をドラッグすると両端が同じ日数だけ移動する（move）', async () => {
    const onPlanDragEnd = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: DAY_WIDTH },
        handlers: { onPlanDragEnd },
      },
    });

    const frame = container.querySelector('.gantt-plan-frame[data-node-id="task-with-plan"]');
    expect(frame).toBeTruthy();

    await fireEvent.mouseDown(frame!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: DAY_WIDTH * 4, clientY: 0 });
    await fireEvent.mouseUp(window, { clientX: DAY_WIDTH * 4, clientY: 0 });

    expect(onPlanDragEnd).toHaveBeenCalledTimes(1);
    const [, finalStart, finalEnd] = onPlanDragEnd.mock.calls[0];
    expect(finalStart.toISODate()).toBe('2026-08-05'); // 8/1 + 4日
    expect(finalEnd.toISODate()).toBe('2026-08-19'); // 8/15 + 4日
  });

  it('uncontrolledモードでは plan ドラッグ後に onDataChange で node.plan が更新される', async () => {
    const onDataChange = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'uncontrolled' as const, dayWidth: DAY_WIDTH },
        handlers: { onDataChange },
      },
    });

    const startHandle = container.querySelector(
      '.gantt-plan-resize-handle.gantt-resize-handle--start[data-node-id="task-with-plan"]',
    );
    await fireEvent.mouseDown(startHandle!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: DAY_WIDTH, clientY: 0 });
    await fireEvent.mouseUp(window, { clientX: DAY_WIDTH, clientY: 0 });

    expect(onDataChange).toHaveBeenCalled();
    const lastCallNodes = onDataChange.mock.calls[onDataChange.mock.calls.length - 1][0] as GanttNode[];
    const updated = lastCallNodes.find(n => n.id === 'task-with-plan')!;
    expect(updated.plan!.start.toISODate()).toBe('2026-08-02');
    expect(updated.plan!.end.toISODate()).toBe('2026-08-15');
    // node.start/end（本来のスケジュール）は影響を受けない
    expect(updated.start!.toISODate()).toBe('2026-08-05');
  });
});

describe('issue #0028: マイルストン（期間指定）のリサイズ・移動', () => {
  function makeNodes(): GanttNode[] {
    return [
      {
        id: 'task-period-milestone',
        parentId: null,
        type: 'task',
        name: '期間マイルストンタスク',
        start: DateTime.fromISO('2026-08-01'),
        end: DateTime.fromISO('2026-08-03'),
        milestone: { start: DateTime.fromISO('2026-08-10'), end: DateTime.fromISO('2026-08-14') },
      },
    ];
  }

  it('左◆をドラッグすると onMilestoneDragEnd が {start,end} 形式で発火し、endは変わらない', async () => {
    const onMilestoneDragEnd = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: DAY_WIDTH },
        handlers: { onMilestoneDragEnd },
      },
    });

    const startHandle = container.querySelector('.gantt-milestone-diamond--start');
    expect(startHandle).toBeTruthy();

    await fireEvent.mouseDown(startHandle!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: DAY_WIDTH, clientY: 0 });
    await fireEvent.mouseUp(window, { clientX: DAY_WIDTH, clientY: 0 });

    expect(onMilestoneDragEnd).toHaveBeenCalledTimes(1);
    const [nodeId, finalMilestone] = onMilestoneDragEnd.mock.calls[0];
    expect(nodeId).toBe('task-period-milestone');
    expect(finalMilestone).toEqual(expect.objectContaining({}));
    expect(finalMilestone.start.toISODate()).toBe('2026-08-11');
    expect(finalMilestone.end.toISODate()).toBe('2026-08-14');
  });

  it('回帰テスト: uncontrolledモードでドラッグ後、◆の <title> ツールチップが新しい日時に更新される', async () => {
    // 実機確認で発見: formatLabel() が milestone を閉じ込めた素の関数だったため、
    // 図形の位置（$: startX 等）は再描画されてもツールチップだけ古い日時のまま残っていた。
    // $: formattedLabel への変更（GanttMilestone.svelte）が正しく効いていることを確認する。
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'uncontrolled' as const, dayWidth: DAY_WIDTH },
        handlers: {},
      },
    });

    const startHandle = container.querySelector('.gantt-milestone-diamond--start');
    expect(startHandle!.querySelector('title')!.textContent).toBe('2026-08-10 〜 2026-08-14');

    await fireEvent.mouseDown(startHandle!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: DAY_WIDTH * 3, clientY: 0 });
    await fireEvent.mouseUp(window, { clientX: DAY_WIDTH * 3, clientY: 0 });

    const updatedHandle = container.querySelector('.gantt-milestone-diamond--start');
    expect(updatedHandle!.querySelector('title')!.textContent).toBe('2026-08-13 〜 2026-08-14');
  });

  it('右◆をドラッグすると endのみ変わる', async () => {
    const onMilestoneDragEnd = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: DAY_WIDTH },
        handlers: { onMilestoneDragEnd },
      },
    });

    const endHandle = container.querySelector('.gantt-milestone-diamond--end');
    expect(endHandle).toBeTruthy();

    await fireEvent.mouseDown(endHandle!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: DAY_WIDTH * 2, clientY: 0 });
    await fireEvent.mouseUp(window, { clientX: DAY_WIDTH * 2, clientY: 0 });

    const [, finalMilestone] = onMilestoneDragEnd.mock.calls[0];
    expect(finalMilestone.start.toISODate()).toBe('2026-08-10');
    expect(finalMilestone.end.toISODate()).toBe('2026-08-16');
  });

  it('中央の帯をドラッグすると move（両端が同じ日数だけ移動）になる', async () => {
    const onMilestoneDragEnd = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: DAY_WIDTH },
        handlers: { onMilestoneDragEnd },
      },
    });

    const fillRect = container.querySelector('.gantt-milestone-fill');
    expect(fillRect).toBeTruthy();

    await fireEvent.mouseDown(fillRect!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: DAY_WIDTH * 3, clientY: 0 });
    await fireEvent.mouseUp(window, { clientX: DAY_WIDTH * 3, clientY: 0 });

    const [, finalMilestone] = onMilestoneDragEnd.mock.calls[0];
    expect(finalMilestone.start.toISODate()).toBe('2026-08-13');
    expect(finalMilestone.end.toISODate()).toBe('2026-08-17');
  });
});

describe('issue #0028: マイルストン（一点指定）の移動', () => {
  function makeNodes(): GanttNode[] {
    return [
      {
        id: 'task-point-milestone',
        parentId: null,
        type: 'task',
        name: '一点マイルストンタスク',
        start: DateTime.fromISO('2026-08-01'),
        end: DateTime.fromISO('2026-08-03'),
        milestone: DateTime.fromISO('2026-08-10'),
      },
    ];
  }

  it('◆をドラッグすると onMilestoneDragEnd が単一の DateTime で発火する', async () => {
    const onMilestoneDragEnd = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: DAY_WIDTH },
        handlers: { onMilestoneDragEnd },
      },
    });

    const diamond = container.querySelector('.gantt-milestone-diamond--movable');
    expect(diamond).toBeTruthy();

    await fireEvent.mouseDown(diamond!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: DAY_WIDTH * 5, clientY: 0 });
    await fireEvent.mouseUp(window, { clientX: DAY_WIDTH * 5, clientY: 0 });

    expect(onMilestoneDragEnd).toHaveBeenCalledTimes(1);
    const [nodeId, finalMilestone] = onMilestoneDragEnd.mock.calls[0];
    expect(nodeId).toBe('task-point-milestone');
    // 一点指定の場合は DateTime そのもの（{start,end} オブジェクトではない）
    expect(typeof finalMilestone.toISODate).toBe('function');
    expect(finalMilestone.toISODate()).toBe('2026-08-15');
  });

  it('uncontrolledモードでは移動後に onDataChange で node.milestone が単一DateTimeとして更新される', async () => {
    const onDataChange = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'uncontrolled' as const, dayWidth: DAY_WIDTH },
        handlers: { onDataChange },
      },
    });

    const diamond = container.querySelector('.gantt-milestone-diamond--movable');
    await fireEvent.mouseDown(diamond!, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(window, { clientX: DAY_WIDTH, clientY: 0 });
    await fireEvent.mouseUp(window, { clientX: DAY_WIDTH, clientY: 0 });

    const lastCallNodes = onDataChange.mock.calls[onDataChange.mock.calls.length - 1][0] as GanttNode[];
    const updated = lastCallNodes.find(n => n.id === 'task-point-milestone')!;
    expect(DateTime.isDateTime(updated.milestone)).toBe(true);
    expect((updated.milestone as DateTime).toISODate()).toBe('2026-08-11');
  });
});

describe('issue #0028: ラベルの優先度クリッピング（plan ＜ バー ＜ マイルストン）', () => {
  it('plan・バー・マイルストンが同じ行で近接する場合、plan のラベルがクリップまたは非表示になる', () => {
    const nodes: GanttNode[] = [
      {
        id: 'overlap-task',
        parentId: null,
        type: 'task',
        name: 'とても長いタスク名がここにたくさん入っています',
        start: DateTime.fromISO('2026-08-05'),
        end: DateTime.fromISO('2026-08-06'),
        plan: { start: DateTime.fromISO('2026-08-05'), end: DateTime.fromISO('2026-08-06') },
        milestone: DateTime.fromISO('2026-08-05T12:00'),
      },
    ];

    const { container } = render(GanttChart, {
      props: {
        nodes,
        config: { mode: 'controlled' as const, dayWidth: DAY_WIDTH },
        handlers: {},
      },
    });

    const planLabel = container.querySelector('.gantt-plan-label');
    // クリップされて幅0で非表示になっているか、clip-path が設定されているはず
    const isHiddenOrClipped = !planLabel || planLabel.hasAttribute('clip-path');
    expect(isHiddenOrClipped).toBe(true);

    // マイルストンのラベル（最優先）は必ず存在し、clip-path は付与されない
    const milestoneLabel = container.querySelector('.gantt-milestone-label');
    expect(milestoneLabel).toBeTruthy();
    expect(milestoneLabel!.hasAttribute('clip-path')).toBe(false);
  });

  it('十分に離れている場合はどのラベルもクリップされない', () => {
    const nodes: GanttNode[] = [
      {
        id: 'far-task',
        parentId: null,
        type: 'task',
        name: 'タスクA',
        start: DateTime.fromISO('2026-08-05'),
        end: DateTime.fromISO('2026-08-06'),
        plan: { start: DateTime.fromISO('2026-01-01'), end: DateTime.fromISO('2026-01-02') },
        milestone: DateTime.fromISO('2027-01-01'),
      },
    ];

    const { container } = render(GanttChart, {
      props: {
        nodes,
        config: { mode: 'controlled' as const, dayWidth: DAY_WIDTH },
        handlers: {},
      },
    });

    const planLabel = container.querySelector('.gantt-plan-label');
    expect(planLabel).toBeTruthy();
    expect(planLabel!.hasAttribute('clip-path')).toBe(false);
  });
});
