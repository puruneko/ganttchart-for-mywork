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
    
    expect(config.mode).toBe('controlled');
    expect(config.rowHeight).toBe(40);
    expect(config.dayWidth).toBe(30);
    expect(config.treePaneWidth).toBe(300);
    expect(config.classPrefix).toBe('gantt');
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
    
    expect(range.start.toISODate()).toBe('2024-01-01');
    expect(range.end.toISODate()).toBe('2024-01-21');
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
