/**
 * Core data management logic
 * 
 * Responsibilities:
 * - Build hierarchy from flat node list
 * - Compute visibility based on collapse state
 * - Provide immutable operations
 * - No Svelte dependencies (pure TypeScript)
 */

import type { GanttNode, ComputedGanttNode, DateRange } from '../types';
import { DateTime } from 'luxon';

/**
 * Build a map of parent ID -> children IDs
 */
export function buildHierarchyMap(nodes: GanttNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  
  for (const node of nodes) {
    const parentId = node.parentId ?? 'root';
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId)!.push(node.id);
  }
  
  return map;
}

/**
 * Build a map of node ID -> node for O(1) lookup
 */
export function buildNodeMap(nodes: GanttNode[]): Map<string, GanttNode> {
  const map = new Map<string, GanttNode>();
  for (const node of nodes) {
    map.set(node.id, node);
  }
  return map;
}

/**
 * Calculate depth of a node in the hierarchy
 */
export function calculateDepth(
  nodeId: string,
  nodeMap: Map<string, GanttNode>,
  cache: Map<string, number> = new Map()
): number {
  if (cache.has(nodeId)) {
    return cache.get(nodeId)!;
  }
  
  const node = nodeMap.get(nodeId);
  if (!node) return 0;
  
  if (node.parentId === null) {
    cache.set(nodeId, 0);
    return 0;
  }
  
  const depth = 1 + calculateDepth(node.parentId, nodeMap, cache);
  cache.set(nodeId, depth);
  return depth;
}

/**
 * Check if a node is visible (all ancestors are expanded)
 */
export function isNodeVisible(
  nodeId: string,
  nodeMap: Map<string, GanttNode>
): boolean {
  const node = nodeMap.get(nodeId);
  if (!node) return false;
  
  // Root nodes are always visible
  if (node.parentId === null) return true;
  
  const parent = nodeMap.get(node.parentId);
  if (!parent) return true; // Orphaned node - show it
  
  // If parent is collapsed, this node is hidden
  if (parent.isCollapsed === true) return false;
  
  // Check parent's visibility recursively
  return isNodeVisible(node.parentId, nodeMap);
}

/**
 * Compute full metadata for all nodes
 * Returns nodes in display order (depth-first traversal)
 */
export function computeNodes(nodes: GanttNode[]): ComputedGanttNode[] {
  const nodeMap = buildNodeMap(nodes);
  const hierarchyMap = buildHierarchyMap(nodes);
  const depthCache = new Map<string, number>();
  const result: ComputedGanttNode[] = [];
  
  // Depth-first traversal starting from root nodes
  function traverse(nodeId: string) {
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    const depth = calculateDepth(nodeId, nodeMap, depthCache);
    const visible = isNodeVisible(nodeId, nodeMap);
    const childrenIds = hierarchyMap.get(nodeId) ?? [];
    
    const computed: ComputedGanttNode = {
      ...node,
      depth,
      isVisible: visible,
      visualIndex: -1, // Will be set below
      childrenIds
    };
    
    result.push(computed);
    
    // Traverse children
    for (const childId of childrenIds) {
      traverse(childId);
    }
  }
  
  // Start with root nodes
  const rootIds = hierarchyMap.get('root') ?? [];
  for (const rootId of rootIds) {
    traverse(rootId);
  }
  
  // Assign visual indices to visible nodes
  let visualIndex = 0;
  for (const node of result) {
    if (node.isVisible) {
      node.visualIndex = visualIndex++;
    }
  }
  
  return result;
}

/**
 * Get only visible nodes in display order
 */
export function getVisibleNodes(computedNodes: ComputedGanttNode[]): ComputedGanttNode[] {
  return computedNodes.filter(node => node.isVisible);
}

/**
 * Calculate the overall date range for the chart
 */
export function calculateDateRange(nodes: GanttNode[]): DateRange {
  if (nodes.length === 0) {
    const now = DateTime.now().startOf('day');
    return {
      start: now,
      end: now.plus({ days: 30 })
    };
  }
  
  let minStart = nodes[0].start;
  let maxEnd = nodes[0].end;
  
  for (const node of nodes) {
    if (node.start < minStart) minStart = node.start;
    if (node.end > maxEnd) maxEnd = node.end;
  }
  
  // Add some padding
  return {
    start: minStart.startOf('day'),
    end: maxEnd.endOf('day').plus({ days: 1 }).startOf('day')
  };
}

/**
 * Toggle collapse state of a node (immutable operation)
 */
export function toggleNodeCollapse(
  nodes: GanttNode[],
  nodeId: string
): GanttNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return {
        ...node,
        isCollapsed: !node.isCollapsed
      };
    }
    return node;
  });
}

/**
 * Update a specific node (immutable operation)
 */
export function updateNode(
  nodes: GanttNode[],
  nodeId: string,
  updates: Partial<GanttNode>
): GanttNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    return node;
  });
}
