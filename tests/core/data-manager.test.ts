/**
 * Tests for core data management logic
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  buildHierarchyMap,
  buildNodeMap,
  calculateDepth,
  isNodeVisible,
  computeNodes,
  getVisibleNodes,
  calculateDateRange,
  toggleNodeCollapse,
  updateNode,
  autoAdjustSectionDates
} from '../../src/core/data-manager';
import type { GanttNode } from '../../src/types';

// Test data factory
function createTestNode(
  id: string,
  parentId: string | null,
  type: 'project' | 'section' | 'subsection' | 'task',
  isCollapsed = false
): GanttNode {
  return {
    id,
    parentId,
    type,
    name: `Node ${id}`,
    start: DateTime.fromISO('2024-01-01'),
    end: DateTime.fromISO('2024-01-10'),
    isCollapsed
  };
}

describe('buildHierarchyMap', () => {
  it('should build correct parent-child relationships', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      createTestNode('2', '1', 'section'),
      createTestNode('3', '1', 'section'),
      createTestNode('4', '2', 'task')
    ];
    
    const map = buildHierarchyMap(nodes);
    
    expect(map.get('root')).toEqual(['1']);
    expect(map.get('1')).toEqual(['2', '3']);
    expect(map.get('2')).toEqual(['4']);
  });
  
  it('should handle empty node list', () => {
    const map = buildHierarchyMap([]);
    expect(map.size).toBe(0);
  });
});

describe('buildNodeMap', () => {
  it('should create ID to node mapping', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      createTestNode('2', '1', 'section')
    ];
    
    const map = buildNodeMap(nodes);
    
    expect(map.get('1')?.name).toBe('Node 1');
    expect(map.get('2')?.parentId).toBe('1');
  });
});

describe('calculateDepth', () => {
  it('should calculate correct depth for nested nodes', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      createTestNode('2', '1', 'section'),
      createTestNode('3', '2', 'subsection'),
      createTestNode('4', '3', 'task')
    ];
    
    const nodeMap = buildNodeMap(nodes);
    
    expect(calculateDepth('1', nodeMap)).toBe(0);
    expect(calculateDepth('2', nodeMap)).toBe(1);
    expect(calculateDepth('3', nodeMap)).toBe(2);
    expect(calculateDepth('4', nodeMap)).toBe(3);
  });
  
  it('should return 0 for non-existent node', () => {
    const nodeMap = buildNodeMap([]);
    expect(calculateDepth('nonexistent', nodeMap)).toBe(0);
  });
});

describe('isNodeVisible', () => {
  it('should return true for root nodes', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project')
    ];
    
    const nodeMap = buildNodeMap(nodes);
    expect(isNodeVisible('1', nodeMap)).toBe(true);
  });
  
  it('should return false when parent is collapsed', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', true), // collapsed
      createTestNode('2', '1', 'section')
    ];
    
    const nodeMap = buildNodeMap(nodes);
    expect(isNodeVisible('2', nodeMap)).toBe(false);
  });
  
  it('should return true when parent is expanded', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', false),
      createTestNode('2', '1', 'section')
    ];
    
    const nodeMap = buildNodeMap(nodes);
    expect(isNodeVisible('2', nodeMap)).toBe(true);
  });
  
  it('should handle multi-level collapse', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', false),
      createTestNode('2', '1', 'section', true), // collapsed
      createTestNode('3', '2', 'task')
    ];

    const nodeMap = buildNodeMap(nodes);
    expect(isNodeVisible('3', nodeMap)).toBe(false);
  });

  it('should keep unscheduled task rows visible by default (showUnscheduledSubtasks omitted)', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      { ...createTestNode('2', '1', 'task'), start: undefined, end: undefined },
    ];

    const nodeMap = buildNodeMap(nodes);
    expect(isNodeVisible('2', nodeMap)).toBe(true);
  });

  it('should hide unscheduled task rows when showUnscheduledSubtasks is false (issue #0021)', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      { ...createTestNode('2', '1', 'task'), start: undefined, end: undefined },
    ];

    const nodeMap = buildNodeMap(nodes);
    expect(isNodeVisible('2', nodeMap, { showUnscheduledSubtasks: false })).toBe(false);
  });

  it('should not hide scheduled task rows when showUnscheduledSubtasks is false', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      createTestNode('2', '1', 'task'), // has start/end
    ];

    const nodeMap = buildNodeMap(nodes);
    expect(isNodeVisible('2', nodeMap, { showUnscheduledSubtasks: false })).toBe(true);
  });

  it('should not hide non-task node types even without start/end when showUnscheduledSubtasks is false', () => {
    const nodes: GanttNode[] = [
      { ...createTestNode('1', null, 'section'), start: undefined, end: undefined },
    ];

    const nodeMap = buildNodeMap(nodes);
    expect(isNodeVisible('1', nodeMap, { showUnscheduledSubtasks: false })).toBe(true);
  });
});

describe('computeNodes', () => {
  it('should compute full metadata for nodes', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      createTestNode('2', '1', 'section'),
      createTestNode('3', '1', 'task')
    ];
    
    const computed = computeNodes(nodes);
    
    expect(computed).toHaveLength(3);
    expect(computed[0].id).toBe('1');
    expect(computed[0].depth).toBe(0);
    expect(computed[0].isVisible).toBe(true);
    expect(computed[0].childrenIds).toEqual(['2', '3']);
    
    expect(computed[1].depth).toBe(1);
    expect(computed[2].depth).toBe(1);
  });
  
  it('should assign correct visual indices', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', false),
      createTestNode('2', '1', 'section', false),
      createTestNode('3', '2', 'task'),
      createTestNode('4', '1', 'section')
    ];
    
    const computed = computeNodes(nodes);
    const visible = computed.filter(n => n.isVisible);
    
    expect(visible[0].visualIndex).toBe(0);
    expect(visible[1].visualIndex).toBe(1);
    expect(visible[2].visualIndex).toBe(2);
    expect(visible[3].visualIndex).toBe(3);
  });
  
  it('should maintain depth-first order', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      createTestNode('2', '1', 'section'),
      createTestNode('3', '2', 'task'),
      createTestNode('4', '1', 'section')
    ];

    const computed = computeNodes(nodes);

    expect(computed.map(n => n.id)).toEqual(['1', '2', '3', '4']);
  });

  it('should keep unscheduled task rows in the computed list by default (showUnscheduledSubtasks omitted)', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      { ...createTestNode('2', '1', 'task'), start: undefined, end: undefined },
      createTestNode('3', '1', 'task'),
    ];

    const computed = computeNodes(nodes);
    const visible = computed.filter(n => n.isVisible);

    expect(visible.map(n => n.id)).toEqual(['1', '2', '3']);
  });

  it('should exclude unscheduled task rows and keep visualIndex contiguous when showUnscheduledSubtasks is false (issue #0021)', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      { ...createTestNode('2', '1', 'task'), start: undefined, end: undefined }, // unscheduled: hidden
      createTestNode('3', '1', 'task'),
      { ...createTestNode('4', '1', 'task'), start: undefined, end: undefined }, // unscheduled: hidden
      createTestNode('5', '1', 'task'),
    ];

    const computed = computeNodes(nodes, { showUnscheduledSubtasks: false });
    const visible = computed.filter(n => n.isVisible);

    expect(visible.map(n => n.id)).toEqual(['1', '3', '5']);
    // visualIndex must stay contiguous (0, 1, 2, ...) with no gaps for the filtered-out nodes,
    // since both the tree pane and timeline rely on visibleNodes[i].visualIndex === i.
    visible.forEach((node, i) => expect(node.visualIndex).toBe(i));
  });
});

describe('getVisibleNodes', () => {
  it('should filter only visible nodes', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', true), // collapsed
      createTestNode('2', '1', 'section'),
      createTestNode('3', null, 'project')
    ];
    
    const computed = computeNodes(nodes);
    const visible = getVisibleNodes(computed);
    
    expect(visible).toHaveLength(2);
    expect(visible.map(n => n.id)).toEqual(['1', '3']);
  });
});

describe('calculateDateRange', () => {
  it('should find min/max dates from nodes', () => {
    const nodes: GanttNode[] = [
      {
        ...createTestNode('1', null, 'project'),
        start: DateTime.fromISO('2024-01-15'),
        end: DateTime.fromISO('2024-01-20')
      },
      {
        ...createTestNode('2', null, 'task'),
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-30')
      }
    ];
    
    const range = calculateDateRange(nodes);
    
    // 最小開始日(2024-01-01) - 15日 = 2023-12-17
    expect(range.start.toISODate()).toBe('2023-12-17');
    // 最大終了日(2024-01-30) + 15日 = 2024-02-14
    expect(range.end.toISODate()).toBe('2024-02-14');
  });
  
  it('should return default range for empty nodes', () => {
    const range = calculateDateRange([]);

    expect(range.end.diff(range.start, 'days').days).toBeGreaterThan(0);
  });

  it('should include plan dates even when they extend beyond start/end', () => {
    const nodes: GanttNode[] = [
      {
        ...createTestNode('1', null, 'task'),
        start: DateTime.fromISO('2024-01-10'),
        end: DateTime.fromISO('2024-01-15'),
        plan: {
          start: DateTime.fromISO('2024-01-01'),
          end: DateTime.fromISO('2024-01-31'),
        },
      },
    ];

    const range = calculateDateRange(nodes);

    // plan.start(2024-01-01) - 15日 = 2023-12-17
    expect(range.start.toISODate()).toBe('2023-12-17');
    // plan.end(2024-01-31) + 15日 = 2024-02-15
    expect(range.end.toISODate()).toBe('2024-02-15');
  });

  it('should include a single-point milestone (due) date', () => {
    const nodes: GanttNode[] = [
      {
        ...createTestNode('1', null, 'task'),
        start: DateTime.fromISO('2024-01-10'),
        end: DateTime.fromISO('2024-01-15'),
        milestone: DateTime.fromISO('2024-03-01'),
      },
    ];

    const range = calculateDateRange(nodes);

    // milestone(2024-03-01) + 15日 = 2024-03-16
    expect(range.end.toISODate()).toBe('2024-03-16');
  });

  it('should include a period milestone (due range) start/end', () => {
    const nodes: GanttNode[] = [
      {
        ...createTestNode('1', null, 'task'),
        start: DateTime.fromISO('2024-01-10'),
        end: DateTime.fromISO('2024-01-15'),
        milestone: {
          start: DateTime.fromISO('2024-02-01'),
          end: DateTime.fromISO('2024-02-10'),
        },
      },
    ];

    const range = calculateDateRange(nodes);

    expect(range.end.toISODate()).toBe('2024-02-25'); // 2024-02-10 + 15日
  });

  it('should include plan/milestone dates for a node with no start/end at all', () => {
    const nodes: GanttNode[] = [
      {
        id: '1',
        parentId: null,
        type: 'task',
        name: 'Unset task with plan',
        plan: {
          start: DateTime.fromISO('2024-05-01'),
          end: DateTime.fromISO('2024-05-10'),
        },
      },
    ];

    const range = calculateDateRange(nodes);

    expect(range.start.toISODate()).toBe('2024-04-16'); // plan.start - 15日
    expect(range.end.toISODate()).toBe('2024-05-25'); // plan.end + 15日
  });
});

describe('toggleNodeCollapse', () => {
  it('should toggle isCollapsed state immutably', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', false),
      createTestNode('2', null, 'project', true)
    ];
    
    const updated = toggleNodeCollapse(nodes, '1');
    
    expect(updated[0].isCollapsed).toBe(true);
    expect(updated[1].isCollapsed).toBe(true);
    expect(nodes[0].isCollapsed).toBe(false); // original unchanged
  });
  
  it('should toggle from undefined to true', () => {
    const nodes: GanttNode[] = [
      { ...createTestNode('1', null, 'project'), isCollapsed: undefined }
    ];
    
    const updated = toggleNodeCollapse(nodes, '1');
    expect(updated[0].isCollapsed).toBe(true);
  });
});

describe('updateNode', () => {
  it('should update specific node immutably', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      createTestNode('2', null, 'project')
    ];
    
    const updated = updateNode(nodes, '1', { name: 'Updated Name' });

    expect(updated[0].name).toBe('Updated Name');
    expect(updated[1].name).toBe('Node 2');
    expect(nodes[0].name).toBe('Node 1'); // original unchanged
  });
});

describe('autoAdjustSectionDates (issue #0026: edge 引数で片側のみ調整)', () => {
  function makeSection(): GanttNode[] {
    return [
      { ...createTestNode('section-1', null, 'section'), start: DateTime.fromISO('2026-01-05'), end: DateTime.fromISO('2026-01-10') },
      { ...createTestNode('child-1', 'section-1', 'task'), start: DateTime.fromISO('2026-01-01'), end: DateTime.fromISO('2026-01-03') },
      { ...createTestNode('child-2', 'section-1', 'task'), start: DateTime.fromISO('2026-01-08'), end: DateTime.fromISO('2026-01-20') },
    ];
  }

  it('edge省略時（既定 both）は開始・終了の両方を配下タスクの範囲に合わせる（時刻まで完全一致・余分な1日を加算しない）', () => {
    const updated = autoAdjustSectionDates(makeSection(), 'section-1');
    const section = updated.find(n => n.id === 'section-1')!;

    // toISODate() だけでは 00:00:00 と 23:59:59.999 の違い（＝約1日分の余分な期間）を
    // 検出できない（同じ暦日として一致してしまう）ため、toISO() で時刻まで厳密に比較する。
    expect(section.start!.toISO()).toBe(DateTime.fromISO('2026-01-01').toISO());
    expect(section.end!.toISO()).toBe(DateTime.fromISO('2026-01-20').toISO());
  });

  it("edge='start' のときは開始日のみ調整し、終了日は変更しない", () => {
    const updated = autoAdjustSectionDates(makeSection(), 'section-1', 'start');
    const section = updated.find(n => n.id === 'section-1')!;

    expect(section.start!.toISO()).toBe(DateTime.fromISO('2026-01-01').toISO());
    expect(section.end!.toISO()).toBe(DateTime.fromISO('2026-01-10').toISO()); // 元のまま
  });

  it("edge='end' のときは終了日のみ調整し、開始日は変更しない", () => {
    const updated = autoAdjustSectionDates(makeSection(), 'section-1', 'end');
    const section = updated.find(n => n.id === 'section-1')!;

    expect(section.start!.toISO()).toBe(DateTime.fromISO('2026-01-05').toISO()); // 元のまま
    expect(section.end!.toISO()).toBe(DateTime.fromISO('2026-01-20').toISO());
  });

  it("edge='both' を明示指定した場合も従来どおり両方調整する", () => {
    const updated = autoAdjustSectionDates(makeSection(), 'section-1', 'both');
    const section = updated.find(n => n.id === 'section-1')!;

    expect(section.start!.toISO()).toBe(DateTime.fromISO('2026-01-01').toISO());
    expect(section.end!.toISO()).toBe(DateTime.fromISO('2026-01-20').toISO());
  });

  it('配下タスクがない場合は edge を指定してもノードを変更しない', () => {
    const nodes: GanttNode[] = [createTestNode('section-1', null, 'section')];
    const updated = autoAdjustSectionDates(nodes, 'section-1', 'start');

    expect(updated).toEqual(nodes);
  });

  it('回帰テスト: 調整後の期間（日数換算の幅）が配下タスクの実際の範囲と完全に一致し、余分な1日を含まない', () => {
    // バグ再現条件: 子の end が「排他的境界（次の日の0時）」を表す典型的な値（ここでは 2026-01-20T00:00）
    // の場合、以前の実装は .endOf('day') を適用して 2026-01-20T23:59:59.999 にしてしまい、
    // 実質的な幅計算（end.diff(start, 'days').days）が 19 日から約 19.999... 日（見た目上ほぼ20日、
    // つまり丸1日分多い）に変化してしまっていた。
    const nodes = makeSection();
    const updated = autoAdjustSectionDates(nodes, 'section-1', 'both');
    const section = updated.find(n => n.id === 'section-1')!;

    const expectedWidthDays = DateTime.fromISO('2026-01-20').diff(DateTime.fromISO('2026-01-01'), 'days').days;
    const actualWidthDays = section.end!.diff(section.start!, 'days').days;

    expect(actualWidthDays).toBe(expectedWidthDays);
    expect(actualWidthDays).toBe(19); // 1/1 〜 1/20 の排他的境界での日数差
  });
});
