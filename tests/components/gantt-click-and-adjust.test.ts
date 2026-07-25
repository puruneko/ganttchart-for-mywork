/**
 * issue #0024: バー以外の全gantt表示オブジェクト（グループ背景・マイルストン・
 * planのみ行）への onClick 追加、および issue #0026: セクションのリサイズ
 * ハンドルのダブルクリックによる開始/終了の個別自動調整のコンポーネント統合テスト。
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { DateTime } from 'luxon';
import GanttChart from '../../src/components/GanttChart.svelte';
import type { GanttNode } from '../../src/types';

describe('issue #0024: バー以外のgantt表示オブジェクトのクリックイベント', () => {
  function makeNodes(): GanttNode[] {
    return [
      {
        id: 'section-1',
        parentId: null,
        type: 'section',
        name: 'セクション',
        start: DateTime.fromISO('2026-08-01'),
        end: DateTime.fromISO('2026-08-10'),
      },
      {
        id: 'child-task',
        parentId: 'section-1',
        type: 'task',
        name: '子タスク',
        start: DateTime.fromISO('2026-08-02'),
        end: DateTime.fromISO('2026-08-05'),
      },
      {
        id: 'milestone-task',
        parentId: null,
        type: 'task',
        name: 'マイルストン付きタスク',
        start: DateTime.fromISO('2026-08-01'),
        end: DateTime.fromISO('2026-08-03'),
        milestone: DateTime.fromISO('2026-08-04'),
      },
      {
        id: 'plan-only-task',
        parentId: null,
        type: 'task',
        name: 'planだけタスク',
        plan: { start: DateTime.fromISO('2026-08-05'), end: DateTime.fromISO('2026-08-06') },
      },
    ];
  }

  it('グループ背景（.gantt-group-bg）をクリックすると onBarClick がセクションノードで発火する', async () => {
    const onBarClick = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: { onBarClick },
      },
    });

    const groupBg = container.querySelector('.gantt-group-bg');
    expect(groupBg).toBeTruthy();

    await fireEvent.click(groupBg!);

    expect(onBarClick).toHaveBeenCalledTimes(1);
    const [node] = onBarClick.mock.calls[0];
    expect(node.id).toBe('section-1');
  });

  it('マイルストン（.gantt-milestone）をクリックすると onBarClick がそのノードで発火する', async () => {
    const onBarClick = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: { onBarClick },
      },
    });

    const milestone = container.querySelector('.gantt-milestone');
    expect(milestone).toBeTruthy();

    await fireEvent.click(milestone!);

    expect(onBarClick).toHaveBeenCalledTimes(1);
    const [node] = onBarClick.mock.calls[0];
    expect(node.id).toBe('milestone-task');
  });

  it('planのみのタスクは plan 枠（バーの亜種）としてラベル付きで描画され、枠のクリックで onBarClick が発火する（issue #0027）', async () => {
    const onBarClick = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: { onBarClick },
      },
    });

    // ラベル（タスク名）自体は表示されるが、他のバーのラベルと同様クリック対象ではない
    const textEl = [...container.querySelectorAll('text')].find((el) =>
      el.textContent?.includes('planだけタスク'),
    );
    expect(textEl).toBeTruthy();

    const planFrame = container.querySelector('[data-node-id="plan-only-task"].gantt-plan-frame');
    expect(planFrame).toBeTruthy();

    await fireEvent.click(planFrame!);

    expect(onBarClick).toHaveBeenCalledTimes(1);
    const [node] = onBarClick.mock.calls[0];
    expect(node.id).toBe('plan-only-task');
  });

  it('タスクバーのリサイズハンドルをクリックしても onBarClick が発火する', async () => {
    const onBarClick = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: { onBarClick },
      },
    });

    const handle = container.querySelector('[data-node-id="milestone-task"].gantt-resize-handle--start');
    expect(handle).toBeTruthy();

    await fireEvent.click(handle!);

    expect(onBarClick).toHaveBeenCalledTimes(1);
    const [node] = onBarClick.mock.calls[0];
    expect(node.id).toBe('milestone-task');
  });
});

describe('issue #0026: セクションのリサイズハンドルのダブルクリックで開始/終了を個別自動調整', () => {
  function makeSectionNodes(): GanttNode[] {
    return [
      {
        id: 'section-1',
        parentId: null,
        type: 'section',
        name: 'セクション',
        start: DateTime.fromISO('2026-08-05'),
        end: DateTime.fromISO('2026-08-10'),
      },
      {
        id: 'child-a',
        parentId: 'section-1',
        type: 'task',
        name: '子A',
        start: DateTime.fromISO('2026-08-01'),
        end: DateTime.fromISO('2026-08-03'),
      },
      {
        id: 'child-b',
        parentId: 'section-1',
        type: 'task',
        name: '子B',
        start: DateTime.fromISO('2026-08-08'),
        end: DateTime.fromISO('2026-08-20'),
      },
    ];
  }

  it('自動調整アイコン（.gantt-auto-adjust-btn）は廃止され、DOMに存在しない', () => {
    const { container } = render(GanttChart, {
      props: {
        nodes: makeSectionNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: {},
      },
    });

    expect(container.querySelector('.gantt-auto-adjust-btn')).toBeFalsy();
  });

  it('左リサイズハンドルのダブルクリックで onAutoAdjustSection が edge=start で発火する', async () => {
    const onAutoAdjustSection = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeSectionNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: { onAutoAdjustSection },
      },
    });

    const startHandle = container.querySelector(
      '[data-node-id="section-1"].gantt-resize-handle--start',
    );
    expect(startHandle).toBeTruthy();

    await fireEvent.dblClick(startHandle!);

    expect(onAutoAdjustSection).toHaveBeenCalledTimes(1);
    expect(onAutoAdjustSection).toHaveBeenCalledWith('section-1', 'start');
  });

  it('右リサイズハンドルのダブルクリックで onAutoAdjustSection が edge=end で発火する', async () => {
    const onAutoAdjustSection = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeSectionNodes(),
        config: { mode: 'controlled' as const, dayWidth: 40 },
        handlers: { onAutoAdjustSection },
      },
    });

    const endHandle = container.querySelector(
      '[data-node-id="section-1"].gantt-resize-handle--end',
    );
    expect(endHandle).toBeTruthy();

    await fireEvent.dblClick(endHandle!);

    expect(onAutoAdjustSection).toHaveBeenCalledTimes(1);
    expect(onAutoAdjustSection).toHaveBeenCalledWith('section-1', 'end');
  });

  it('uncontrolledモードでは左ハンドルのダブルクリックで開始日のみ配下タスクに合わせて更新される（終了日は不変）', async () => {
    const onDataChange = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeSectionNodes(),
        config: { mode: 'uncontrolled' as const, dayWidth: 40 },
        handlers: { onDataChange },
      },
    });

    const startHandle = container.querySelector(
      '[data-node-id="section-1"].gantt-resize-handle--start',
    );
    await fireEvent.dblClick(startHandle!);

    expect(onDataChange).toHaveBeenCalledTimes(1);
    const [newNodes] = onDataChange.mock.calls[0];
    const section = newNodes.find((n: GanttNode) => n.id === 'section-1');
    expect(section.start.toISODate()).toBe('2026-08-01'); // 子Aの開始日
    expect(section.end.toISODate()).toBe('2026-08-10'); // 元のまま
  });

  it('uncontrolledモードでは右ハンドルのダブルクリックで終了日のみ配下タスクに合わせて更新される（開始日は不変）', async () => {
    const onDataChange = vi.fn();
    const { container } = render(GanttChart, {
      props: {
        nodes: makeSectionNodes(),
        config: { mode: 'uncontrolled' as const, dayWidth: 40 },
        handlers: { onDataChange },
      },
    });

    const endHandle = container.querySelector(
      '[data-node-id="section-1"].gantt-resize-handle--end',
    );
    await fireEvent.dblClick(endHandle!);

    expect(onDataChange).toHaveBeenCalledTimes(1);
    const [newNodes] = onDataChange.mock.calls[0];
    const section = newNodes.find((n: GanttNode) => n.id === 'section-1');
    expect(section.start.toISODate()).toBe('2026-08-05'); // 元のまま
    expect(section.end.toISODate()).toBe('2026-08-20'); // 子Bの終了日
  });
});
