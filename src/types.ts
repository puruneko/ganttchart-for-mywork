/**
 * Core type definitions for the Gantt chart library
 * 
 * Design principles:
 * - Minimal coupling to implementation
 * - Easy to extend without breaking changes
 * - Explicit over implicit
 */

import type { DateTime } from 'luxon';

/**
 * Node type discriminator
 */
export type GanttNodeType = 'project' | 'section' | 'subsection' | 'task';

/**
 * Core data structure for a single Gantt chart node
 * 
 * This represents the fundamental unit in the hierarchy.
 * All fields are immutable from the library's perspective.
 */
export interface GanttNode {
  /** Unique identifier - must be unique across all nodes */
  id: string;
  
  /** Parent node ID - null for root-level nodes */
  parentId: string | null;
  
  /** Type discriminator for rendering and behavior */
  type: GanttNodeType;
  
  /** Display name */
  name: string;
  
  /** Start date/time (luxon DateTime) */
  start: DateTime;
  
  /** End date/time (luxon DateTime) */
  end: DateTime;
  
  /** UI state: whether this node's children are hidden */
  isCollapsed?: boolean;
  
  /** Optional metadata - library ignores this, but passes through events */
  metadata?: Record<string, unknown>;
}

/**
 * Event handler type definitions
 * All handlers are optional and registered externally
 */
export interface GanttEventHandlers {
  /** Fired when a node is clicked */
  onNodeClick?: (node: GanttNode) => void;
  
  /** Fired when collapse/expand is toggled */
  onToggleCollapse?: (nodeId: string, newCollapsedState: boolean) => void;
  
  /** Fired when internal data changes (uncontrolled mode only) */
  onDataChange?: (nodes: GanttNode[]) => void;
  
  /** Fired when a bar is clicked in the timeline */
  onBarClick?: (node: GanttNode, event: MouseEvent) => void;
  
  /** Fired when a node name is clicked in the tree */
  onNameClick?: (node: GanttNode, event: MouseEvent) => void;
}

/**
 * Configuration options for the Gantt chart
 */
export interface GanttConfig {
  /** Controlled mode: data managed externally. Uncontrolled: managed internally */
  mode?: 'controlled' | 'uncontrolled';
  
  /** Height of each row in pixels */
  rowHeight?: number;
  
  /** Width of a single day in pixels */
  dayWidth?: number;
  
  /** Width of the left tree pane in pixels */
  treePaneWidth?: number;
  
  /** Indent per hierarchy level in pixels */
  indentSize?: number;
  
  /** CSS class prefix for custom styling */
  classPrefix?: string;
}

/**
 * Internal computed node with rendering metadata
 * (Not exposed in public API)
 */
export interface ComputedGanttNode extends GanttNode {
  /** Depth level in hierarchy (0 = root) */
  depth: number;
  
  /** Whether this node is visible (parent not collapsed) */
  isVisible: boolean;
  
  /** Index in flattened visible list */
  visualIndex: number;
  
  /** Direct children IDs */
  childrenIds: string[];
}

/**
 * Props for the main Gantt component
 */
export interface GanttChartProps {
  /** Array of nodes to display */
  nodes: GanttNode[];
  
  /** Event handlers */
  handlers?: GanttEventHandlers;
  
  /** Configuration options */
  config?: GanttConfig;
}

/**
 * Date range for timeline rendering
 */
export interface DateRange {
  start: DateTime;
  end: DateTime;
}
