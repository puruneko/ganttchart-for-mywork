/**
 * Basic usage example - Controlled mode
 * 
 * In controlled mode, the parent component manages the data.
 * The library only displays and emits events.
 */

import { DateTime } from 'luxon';
import type { GanttNode, GanttEventHandlers } from '../src';

// Define your data
const nodes: GanttNode[] = [
  {
    id: 'project-1',
    parentId: null,
    type: 'project',
    name: 'Website Redesign',
    start: DateTime.fromISO('2024-01-01'),
    end: DateTime.fromISO('2024-01-31'),
    isCollapsed: false
  },
  {
    id: 'section-1',
    parentId: 'project-1',
    type: 'section',
    name: 'Design Phase',
    start: DateTime.fromISO('2024-01-01'),
    end: DateTime.fromISO('2024-01-10'),
    isCollapsed: false
  },
  {
    id: 'task-1',
    parentId: 'section-1',
    type: 'task',
    name: 'Create wireframes',
    start: DateTime.fromISO('2024-01-01'),
    end: DateTime.fromISO('2024-01-05')
  },
  {
    id: 'task-2',
    parentId: 'section-1',
    type: 'task',
    name: 'Design mockups',
    start: DateTime.fromISO('2024-01-06'),
    end: DateTime.fromISO('2024-01-10')
  },
  {
    id: 'section-2',
    parentId: 'project-1',
    type: 'section',
    name: 'Development Phase',
    start: DateTime.fromISO('2024-01-11'),
    end: DateTime.fromISO('2024-01-31'),
    isCollapsed: false
  },
  {
    id: 'task-3',
    parentId: 'section-2',
    type: 'task',
    name: 'Frontend development',
    start: DateTime.fromISO('2024-01-11'),
    end: DateTime.fromISO('2024-01-25')
  },
  {
    id: 'task-4',
    parentId: 'section-2',
    type: 'task',
    name: 'Backend integration',
    start: DateTime.fromISO('2024-01-20'),
    end: DateTime.fromISO('2024-01-31')
  }
];

// Define event handlers
const handlers: GanttEventHandlers = {
  onNodeClick: (node) => {
    console.log('Node clicked:', node.name);
  },
  
  onToggleCollapse: (nodeId, newState) => {
    console.log(`Node ${nodeId} collapse state:`, newState);
    
    // In controlled mode, YOU must update the data
    // Update your state management (Redux, Svelte store, etc.)
    // Then pass updated nodes back to the component
  },
  
  onBarClick: (node, event) => {
    console.log('Bar clicked:', node.name, event);
  },
  
  onNameClick: (node, event) => {
    console.log('Name clicked:', node.name, event);
  }
};

// In your Svelte component:
/*
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  
  let nodes = [...]; // Your reactive data
  
  const handlers = {
    onToggleCollapse: (nodeId, newState) => {
      // Update nodes immutably
      nodes = nodes.map(n => 
        n.id === nodeId 
          ? { ...n, isCollapsed: newState }
          : n
      );
    }
  };
</script>

<GanttChart 
  {nodes}
  {handlers}
  config={{
    mode: 'controlled',
    rowHeight: 40,
    dayWidth: 30
  }}
/>
*/

export { nodes, handlers };
