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
  updateNode
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
    
    expect(range.start.toISODate()).toBe('2024-01-01');
    expect(range.end.toISODate()).toBe('2024-01-31'); // includes end day + 1
  });
  
  it('should return default range for empty nodes', () => {
    const range = calculateDateRange([]);
    
    expect(range.end.diff(range.start, 'days').days).toBeGreaterThan(0);
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
