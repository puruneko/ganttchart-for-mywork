/**
 * Tests for Gantt store
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { createGanttStore } from '../../src/core/gantt-store';
import type { GanttNode } from '../../src/types';
import { get } from 'svelte/store';

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

describe('createGanttStore', () => {
  it('should initialize with nodes', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project')
    ];
    
    const store = createGanttStore(nodes);
    const rawNodes = store._getRawNodes();
    
    expect(rawNodes).toHaveLength(1);
    expect(rawNodes[0].id).toBe('1');
  });
  
  it('should use default config', () => {
    const store = createGanttStore([]);
    const config = store._getConfig();
    
    expect(config.mode).toBe('uncontrolled');
    expect(config.rowHeight).toBe(40);
    expect(config.dayWidth).toBe(30);
    expect(config.treePaneWidth).toBe(300);
    expect(config.classPrefix).toBe('gantt');
    expect(config.snapDurationMap).toEqual({
      year: { weeks: 1 },
      month: { days: 1 },
      week: { days: 1 },
      day: { hours: 1 },
    });
    expect(config.width).toBe('100%');
    expect(config.height).toBe('100%');
  });
  
  it('should allow custom config', () => {
    const store = createGanttStore([], {
      mode: 'uncontrolled',
      rowHeight: 50,
      classPrefix: 'custom'
    });

    const config = store._getConfig();
    expect(config.mode).toBe('uncontrolled');
    expect(config.rowHeight).toBe(50);
    expect(config.classPrefix).toBe('custom');
  });

  it('should allow custom width and height', () => {
    const store = createGanttStore([], {
      width: '800px',
      height: '600px'
    });
    const config = store._getConfig();
    expect(config.width).toBe('800px');
    expect(config.height).toBe('600px');
  });

  it('should keep default width/height when not specified', () => {
    const store = createGanttStore([], { rowHeight: 50 });
    const config = store._getConfig();
    expect(config.width).toBe('100%');
    expect(config.height).toBe('100%');
  });

  it('should deep-merge snapDurationMap with defaults when partial map is given', () => {
    const store = createGanttStore([], {
      snapDurationMap: { day: { minutes: 30 } }
    });
    const config = store._getConfig();
    // day はカスタム値、他はデフォルト値を保持
    expect(config.snapDurationMap.day).toEqual({ minutes: 30 });
    expect(config.snapDurationMap.year).toEqual({ weeks: 1 });
    expect(config.snapDurationMap.month).toEqual({ days: 1 });
    expect(config.snapDurationMap.week).toEqual({ days: 1 });
  });
});

describe('updateConfig - snapDurationMap deep merge', () => {
  it('should merge snapDurationMap keys instead of replacing the whole map', () => {
    const store = createGanttStore([]);
    store.updateConfig({ snapDurationMap: { day: { minutes: 15 } } });
    const config = store._getConfig();
    // day だけ更新、他のキーはそのまま
    expect(config.snapDurationMap.day).toEqual({ minutes: 15 });
    expect(config.snapDurationMap.year).toEqual({ weeks: 1 });
    expect(config.snapDurationMap.month).toEqual({ days: 1 });
  });

  it('should allow overriding multiple snapDurationMap keys at once', () => {
    const store = createGanttStore([]);
    store.updateConfig({
      snapDurationMap: { year: { months: 1 }, day: { hours: 6 } }
    });
    const config = store._getConfig();
    expect(config.snapDurationMap.year).toEqual({ months: 1 });
    expect(config.snapDurationMap.day).toEqual({ hours: 6 });
    expect(config.snapDurationMap.month).toEqual({ days: 1 }); // 変更なし
    expect(config.snapDurationMap.week).toEqual({ days: 1 });  // 変更なし
  });
});

describe('setNodes', () => {
  it('should update nodes', () => {
    const store = createGanttStore([]);
    const newNodes: GanttNode[] = [
      createTestNode('1', null, 'project')
    ];
    
    store.setNodes(newNodes);
    
    expect(store._getRawNodes()).toHaveLength(1);
  });
});

describe('computedNodes', () => {
  it('should compute metadata reactively', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      createTestNode('2', '1', 'section')
    ];
    
    const store = createGanttStore(nodes);
    const computed = get(store.computedNodes);
    
    expect(computed).toHaveLength(2);
    expect(computed[0].depth).toBe(0);
    expect(computed[1].depth).toBe(1);
  });
});

describe('visibleNodes', () => {
  it('should filter based on collapse state', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', true), // collapsed
      createTestNode('2', '1', 'section')
    ];
    
    const store = createGanttStore(nodes);
    const visible = get(store.visibleNodes);
    
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('1');
  });
});

describe('toggleCollapse - controlled mode', () => {
  it('should NOT update internal state in controlled mode', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', false)
    ];
    
    const store = createGanttStore(nodes, { mode: 'controlled' });
    const newNodes = store.toggleCollapse('1');
    
    // Returns new nodes but doesn't apply internally
    expect(newNodes[0].isCollapsed).toBe(true);
    expect(store._getRawNodes()[0].isCollapsed).toBe(false);
  });
});

describe('toggleCollapse - uncontrolled mode', () => {
  it('should update internal state in uncontrolled mode', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', false)
    ];
    
    const store = createGanttStore(nodes, { mode: 'uncontrolled' });
    const newNodes = store.toggleCollapse('1');
    
    // Both returned and internal should be updated
    expect(newNodes[0].isCollapsed).toBe(true);
    expect(store._getRawNodes()[0].isCollapsed).toBe(true);
  });
  
  it('should update visibility of children', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project', false),
      createTestNode('2', '1', 'section')
    ];
    
    const store = createGanttStore(nodes, { mode: 'uncontrolled' });
    
    // Initially both visible
    let visible = get(store.visibleNodes);
    expect(visible).toHaveLength(2);
    
    // Collapse parent
    store.toggleCollapse('1');
    
    // Now only parent visible
    visible = get(store.visibleNodes);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('1');
  });
});

describe('dateRange', () => {
  it('should calculate from all nodes', () => {
    const nodes: GanttNode[] = [
      {
        ...createTestNode('1', null, 'project'),
        start: DateTime.fromISO('2024-01-05'),
        end: DateTime.fromISO('2024-01-10')
      },
      {
        ...createTestNode('2', null, 'task'),
        start: DateTime.fromISO('2024-01-01'),
        end: DateTime.fromISO('2024-01-20')
      }
    ];
    
    const store = createGanttStore(nodes);
    const range = get(store.dateRange);
    
    // 最小開始日(2024-01-01) - 15日 = 2023-12-17
    expect(range.start.toISODate()).toBe('2023-12-17');
    // 最大終了日(2024-01-20) + 15日 = 2024-02-04
    expect(range.end.toISODate()).toBe('2024-02-04');
  });
});

describe('getNodeById', () => {
  it('should find node by ID', () => {
    const nodes: GanttNode[] = [
      createTestNode('1', null, 'project'),
      createTestNode('2', null, 'task')
    ];
    
    const store = createGanttStore(nodes);
    const node = store.getNodeById('2');
    
    expect(node?.id).toBe('2');
    expect(node?.type).toBe('task');
  });
  
  it('should return undefined for non-existent ID', () => {
    const store = createGanttStore([]);
    expect(store.getNodeById('nonexistent')).toBeUndefined();
  });
});
