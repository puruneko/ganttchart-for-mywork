/**
 * Uncontrolled mode example
 * 
 * In uncontrolled mode, the library manages its own state internally.
 * You get notified of changes but don't need to manage the data yourself.
 */

import { DateTime } from 'luxon';
import type { GanttNode, GanttEventHandlers } from '../src';

// Initial data only
const initialNodes: GanttNode[] = [
  {
    id: '1',
    parentId: null,
    type: 'project',
    name: 'Product Launch',
    start: DateTime.fromISO('2024-02-01'),
    end: DateTime.fromISO('2024-02-28')
  },
  {
    id: '2',
    parentId: '1',
    type: 'section',
    name: 'Marketing',
    start: DateTime.fromISO('2024-02-01'),
    end: DateTime.fromISO('2024-02-15')
  },
  {
    id: '3',
    parentId: '2',
    type: 'task',
    name: 'Social media campaign',
    start: DateTime.fromISO('2024-02-01'),
    end: DateTime.fromISO('2024-02-10')
  }
];

// Event handlers - you get notified but don't need to update state
const handlers: GanttEventHandlers = {
  onDataChange: (updatedNodes) => {
    console.log('Data changed internally:', updatedNodes);
    
    // Optional: persist to backend, localStorage, etc.
    // But you don't need to pass it back to the component
  },
  
  onToggleCollapse: (nodeId, newState) => {
    console.log(`Collapsed state changed: ${nodeId} -> ${newState}`);
    // Library already updated internally
  },
  
  onNodeClick: (node) => {
    console.log('Clicked:', node.name);
  }
};

// In your Svelte component:
/*
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  
  const initialNodes = [...];
  
  const handlers = {
    onDataChange: (nodes) => {
      // Save to backend/localStorage if needed
      localStorage.setItem('gantt-data', JSON.stringify(nodes));
    }
  };
</script>

<GanttChart 
  nodes={initialNodes}
  {handlers}
  config={{
    mode: 'uncontrolled',  // Library manages state
    rowHeight: 50,
    dayWidth: 40
  }}
/>
*/

export { initialNodes, handlers };
