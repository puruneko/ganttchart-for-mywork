# Svelte Gantt Library

A **generic, environment-agnostic** Gantt chart library for TypeScript and Svelte. Designed as a reusable UI library, not an application.

## ⚠️ Critical Design Principles

This is a **library**, not an app:
- ✅ Provides UI components only
- ✅ No business logic or application-specific code
- ✅ Maximum customizability
- ✅ Controlled and uncontrolled modes
- ✅ Environment-agnostic (works in web, VSCode, Electron, Tauri, Obsidian, etc.)
- ✅ Future-proof architecture (Svelte 5 ready)

## Features

### Core Features
- ✅ Hierarchical data display (project → section → subsection → task)
- ✅ SVG-based timeline rendering
- ✅ Collapsible sections
- ✅ Day-based timeline
- ✅ Controlled and uncontrolled modes
- ✅ Comprehensive event system
- ✅ Full TypeScript support
- ✅ Fully tested (38 tests, 100% pass rate)

### Future-Ready Architecture
- **Svelte 5 migration path**: Uses patterns that convert cleanly to Runes
- **No deprecated APIs**: Avoids features that will break in future versions
- **Pure TypeScript core**: Business logic separated from UI
- **Minimal lifecycle dependencies**: Easy to refactor

## Installation

```bash
npm install svelte-gantt-lib luxon
```

**Note**: `luxon` is a peer dependency for date handling.

## Quick Start

```svelte
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  import { DateTime } from 'luxon';
  import type { GanttNode, GanttEventHandlers } from 'svelte-gantt-lib';
  
  let nodes: GanttNode[] = [
    {
      id: '1',
      parentId: null,
      type: 'project',
      name: 'My Project',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-01-31'),
      isCollapsed: false
    },
    {
      id: '2',
      parentId: '1',
      type: 'task',
      name: 'Task 1',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-01-15')
    }
  ];
  
  const handlers: GanttEventHandlers = {
    onNodeClick: (node) => console.log('Clicked:', node.name),
    onToggleCollapse: (nodeId, newState) => {
      // Update your data
      nodes = nodes.map(n => 
        n.id === nodeId ? { ...n, isCollapsed: newState } : n
      );
    }
  };
</script>

<GanttChart {nodes} {handlers} />
```

## Data Structure

```typescript
interface GanttNode {
  id: string;                    // Unique identifier
  parentId: string | null;       // Parent node ID (null for root)
  type: 'project' | 'section' | 'subsection' | 'task';
  name: string;                  // Display name
  start: DateTime;               // Start date (luxon DateTime)
  end: DateTime;                 // End date (luxon DateTime)
  isCollapsed?: boolean;         // Collapse state (for containers)
  metadata?: Record<string, unknown>;  // Optional custom data
}
```

## Controlled vs Uncontrolled Modes

### Controlled Mode (Recommended)

**You manage the data** - Library only displays and emits events.

```svelte
<script lang="ts">
  let nodes = [...]; // Your state
  
  const handlers = {
    onToggleCollapse: (nodeId, newState) => {
      // YOU update the state
      nodes = nodes.map(n => 
        n.id === nodeId ? { ...n, isCollapsed: newState } : n
      );
    }
  };
</script>

<GanttChart 
  {nodes} 
  {handlers}
  config={{ mode: 'controlled' }}
/>
```

### Uncontrolled Mode

**Library manages the data** - You get notified of changes.

```svelte
<script lang="ts">
  const initialNodes = [...]; // Set once
  
  const handlers = {
    onDataChange: (updatedNodes) => {
      // Optional: persist to backend
      console.log('Data changed:', updatedNodes);
    }
  };
</script>

<GanttChart 
  nodes={initialNodes}
  {handlers}
  config={{ mode: 'uncontrolled' }}
/>
```

## Event Handlers

All events are optional and passed via the `handlers` prop:

```typescript
interface GanttEventHandlers {
  // Node clicked (either name or bar)
  onNodeClick?: (node: GanttNode) => void;
  
  // Collapse/expand toggled
  onToggleCollapse?: (nodeId: string, newState: boolean) => void;
  
  // Data changed (uncontrolled mode only)
  onDataChange?: (nodes: GanttNode[]) => void;
  
  // Timeline bar clicked
  onBarClick?: (node: GanttNode, event: MouseEvent) => void;
  
  // Tree name clicked
  onNameClick?: (node: GanttNode, event: MouseEvent) => void;
}
```

## Configuration

```typescript
interface GanttConfig {
  mode?: 'controlled' | 'uncontrolled';  // Default: 'controlled'
  rowHeight?: number;                     // Default: 40
  dayWidth?: number;                      // Default: 30
  treePaneWidth?: number;                 // Default: 300
  indentSize?: number;                    // Default: 20
  classPrefix?: string;                   // Default: 'gantt'
}
```

Example:
```svelte
<GanttChart 
  {nodes}
  config={{
    mode: 'controlled',
    rowHeight: 50,
    dayWidth: 40,
    treePaneWidth: 400,
    classPrefix: 'my-gantt'
  }}
/>
```

## Styling

The library uses CSS classes with a configurable prefix. Override these in your app:

```css
/* Container */
:global(.gantt-container) {
  font-family: 'Your Font';
  border: 1px solid #custom-color;
}

/* Bars by type */
:global(.gantt-bar--project) {
  fill: #your-color;
  stroke: #your-border;
}

:global(.gantt-bar--section) {
  fill: #another-color;
}

:global(.gantt-bar--task) {
  fill: #task-color;
}

/* Tree rows */
:global(.gantt-tree-row:hover) {
  background: #hover-color;
}

/* Toggle buttons */
:global(.gantt-toggle) {
  color: #custom-color;
}
```

## Advanced Usage

### Direct Store Access

For maximum control, use the store factory:

```typescript
import { createGanttStore } from 'svelte-gantt-lib';

const store = createGanttStore(nodes, config);

// Subscribe to computed values
store.visibleNodes.subscribe(nodes => {
  console.log('Visible:', nodes);
});

store.dateRange.subscribe(range => {
  console.log('Range:', range);
});

// Manually control
store.setNodes(newNodes);
store.toggleCollapse('node-id');
```

### Utility Functions

```typescript
import {
  computeNodes,
  calculateDateRange,
  toggleNodeCollapse,
  updateNode
} from 'svelte-gantt-lib';

// Compute hierarchy metadata
const computed = computeNodes(nodes);

// Calculate overall date range
const range = calculateDateRange(nodes);

// Immutable operations
const toggled = toggleNodeCollapse(nodes, 'id-1');
const updated = updateNode(nodes, 'id-1', { name: 'New Name' });
```

## Architecture

### File Structure
```
src/
├── types.ts                    # TypeScript definitions
├── core/
│   ├── data-manager.ts         # Pure logic (no Svelte)
│   ├── gantt-store.ts          # State management
│   └── *.test.ts               # Unit tests
├── components/
│   ├── GanttChart.svelte       # Main component
│   ├── GanttTree.svelte        # Left pane
│   ├── GanttTimeline.svelte    # SVG timeline
│   └── GanttHeader.svelte      # Date header
├── utils/
│   └── timeline-calculations.ts # Pure calculation functions
└── index.ts                    # Public API
```

### Design Philosophy

1. **Separation of Concerns**
   - Pure TypeScript logic in `core/`
   - Svelte components only handle UI
   - No business logic in components

2. **Svelte 5 Migration Path**
   - Stores → `$state` runes
   - Derived stores → `$derived` runes
   - Reactive statements → `$derived`
   - No deprecated lifecycle hooks

3. **Testability**
   - Core logic is framework-agnostic
   - 100% test coverage for business logic
   - Easy to mock and test

4. **Immutability**
   - All data operations return new objects
   - Original data never mutated
   - Predictable data flow

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

**Test Results**: ✅ 38/38 tests passing

## Examples

See the `examples/` directory:
- `basic-usage.ts` - Controlled mode example
- `uncontrolled-usage.ts` - Uncontrolled mode
- `custom-styling.ts` - CSS customization
- `advanced-usage.ts` - Direct store usage

## Environment Compatibility

This library works in:
- ✅ Standard web apps
- ✅ SvelteKit
- ✅ VSCode extensions
- ✅ Electron apps
- ✅ Tauri apps
- ✅ Obsidian plugins
- ✅ Any JavaScript environment with Svelte support

## Limitations (Prototype Scope)

Not implemented (by design):
- ❌ Dependency arrows between tasks
- ❌ Drag-and-drop editing
- ❌ Data persistence (DB/localStorage)
- ❌ Advanced zoom/pan
- ❌ Date range selection
- ❌ Multiple projects in one chart

These can be added later without breaking changes.

## Contributing

This is a prototype focused on **architecture over features**. Contributions should:
- Maintain the library-first approach
- Not add application-specific logic
- Preserve Svelte 5 migration path
- Include tests for new features

## License

MIT

## Credits

Built with:
- TypeScript
- Svelte 4 (with Svelte 5 compatibility)
- Luxon for date handling
- Vitest for testing
