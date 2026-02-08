/**
 * セクション日付自動調整機能のテスト
 */

import { describe, it, expect } from 'vitest';
import { autoAdjustSectionDates } from './data-manager';
import { DateTime } from 'luxon';
import type { GanttNode } from '../types';

describe('autoAdjustSectionDates', () => {
  it('配下のタスクに合わせてセクションの日付を調整する', () => {
    const nodes: GanttNode[] = [
      {
        id: 'sec-1',
        parentId: null,
        type: 'section',
        name: 'Section 1',
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-10'),
      },
      {
        id: 'task-1',
        parentId: 'sec-1',
        type: 'task',
        name: 'Task 1',
        start: DateTime.fromISO('2024-01-05'),
        end: DateTime.fromISO('2024-01-08'),
      },
      {
        id: 'task-2',
        parentId: 'sec-1',
        type: 'task',
        name: 'Task 2',
        start: DateTime.fromISO('2024-01-07'),
        end: DateTime.fromISO('2024-01-15'),
      },
    ];

    const result = autoAdjustSectionDates(nodes, 'sec-1');
    const section = result.find(n => n.id === 'sec-1');

    expect(section?.start?.toISODate()).toBe('2024-01-05');
    expect(section?.end?.toISODate()).toBe('2024-01-15');
  });

  it('子孫ノード（再帰的）に合わせて調整する', () => {
    const nodes: GanttNode[] = [
      {
        id: 'sec-1',
        parentId: null,
        type: 'section',
        name: 'Section 1',
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-10'),
      },
      {
        id: 'subsec-1',
        parentId: 'sec-1',
        type: 'subsection',
        name: 'Subsection 1',
        start: DateTime.fromISO('2024-01-02'),
        end: DateTime.fromISO('2024-01-08'),
      },
      {
        id: 'task-1',
        parentId: 'subsec-1',
        type: 'task',
        name: 'Task 1',
        start: DateTime.fromISO('2024-01-03'),
        end: DateTime.fromISO('2024-01-20'),
      },
    ];

    const result = autoAdjustSectionDates(nodes, 'sec-1');
    const section = result.find(n => n.id === 'sec-1');

    // サブセクションとタスクの両方を含めた範囲に調整される
    expect(section?.start?.toISODate()).toBe('2024-01-02');
    expect(section?.end?.toISODate()).toBe('2024-01-20');
  });

  it('日時未設定のタスクは無視する', () => {
    const nodes: GanttNode[] = [
      {
        id: 'sec-1',
        parentId: null,
        type: 'section',
        name: 'Section 1',
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-10'),
      },
      {
        id: 'task-1',
        parentId: 'sec-1',
        type: 'task',
        name: 'Task 1',
        start: DateTime.fromISO('2024-01-05'),
        end: DateTime.fromISO('2024-01-08'),
      },
      {
        id: 'task-unset',
        parentId: 'sec-1',
        type: 'task',
        name: 'Task Unset',
        // start/end未設定
      },
    ];

    const result = autoAdjustSectionDates(nodes, 'sec-1');
    const section = result.find(n => n.id === 'sec-1');

    expect(section?.start?.toISODate()).toBe('2024-01-05');
    expect(section?.end?.toISODate()).toBe('2024-01-08');
  });

  it('日時が設定されているノードがない場合は変更しない', () => {
    const nodes: GanttNode[] = [
      {
        id: 'sec-1',
        parentId: null,
        type: 'section',
        name: 'Section 1',
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-10'),
      },
      {
        id: 'task-unset',
        parentId: 'sec-1',
        type: 'task',
        name: 'Task Unset',
        // start/end未設定
      },
    ];

    const result = autoAdjustSectionDates(nodes, 'sec-1');
    const section = result.find(n => n.id === 'sec-1');

    expect(section?.start?.toISODate()).toBe('2024-01-01');
    expect(section?.end?.toISODate()).toBe('2024-01-10');
  });

  it('セクション/サブセクション/プロジェクト以外は変更しない', () => {
    const nodes: GanttNode[] = [
      {
        id: 'task-1',
        parentId: null,
        type: 'task',
        name: 'Task 1',
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-10'),
      },
    ];

    const result = autoAdjustSectionDates(nodes, 'task-1');
    
    expect(result).toEqual(nodes);
  });

  it('存在しないノードIDを指定した場合は変更しない', () => {
    const nodes: GanttNode[] = [
      {
        id: 'sec-1',
        parentId: null,
        type: 'section',
        name: 'Section 1',
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-10'),
      },
    ];

    const result = autoAdjustSectionDates(nodes, 'non-existent');
    
    expect(result).toEqual(nodes);
  });

  it('イミュータブル操作である（元の配列を変更しない）', () => {
    const nodes: GanttNode[] = [
      {
        id: 'sec-1',
        parentId: null,
        type: 'section',
        name: 'Section 1',
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-10'),
      },
      {
        id: 'task-1',
        parentId: 'sec-1',
        type: 'task',
        name: 'Task 1',
        start: DateTime.fromISO('2024-01-05'),
        end: DateTime.fromISO('2024-01-15'),
      },
    ];

    const originalStart = nodes[0].start;
    const result = autoAdjustSectionDates(nodes, 'sec-1');

    expect(nodes[0].start).toBe(originalStart);
    expect(result).not.toBe(nodes);
  });
});
