# Architecture Documentation

## Overview

This library is designed with **long-term maintainability** as the top priority. Every decision favors future-proofing over immediate feature completeness.

## Core Principles

### 1. Library-First Design

**This is NOT an application.** It's a reusable UI library.

- ❌ No database integration
- ❌ No authentication
- ❌ No routing
- ❌ No API calls
- ✅ Pure UI components
- ✅ Event-driven communication
- ✅ Data agnostic

### 2. Svelte 5 Migration Path

Every component is designed to minimize migration effort when Svelte 5 becomes stable.

#### Current → Future

| Current (Svelte 4) | Future (Svelte 5) |
|-------------------|------------------|
| `writable()` stores | `$state` runes |
| `derived()` stores | `$derived` runes |
| `$: computed =` | `$: computed = $derived(...)` |
| Explicit props | Same (no change) |
| Event props | Same (no change) |

#### What We Avoid

- ❌ `beforeUpdate` / `afterUpdate` hooks
- ❌ Implicit reactive dependencies
- ❌ `$$props` / `$$restProps`
- ❌ Context API for data flow
- ❌ Slots with complex data passing

### 3. Separation of Concerns

```
Pure TypeScript (testable, reusable)
    ↓
Svelte Stores (reactive layer)
    ↓
Svelte Components (UI only)
```

**Core Logic (`src/core/`)**
- Pure TypeScript functions
- No Svelte imports
- 100% unit testable
- Framework-agnostic

**Store Layer (`src/core/gantt-store.ts`)**
- Bridges data and UI
- Wraps pure functions in reactivity
- Easy to replace with Runes

**Component Layer (`src/components/`)**
- UI only
- No business logic
- Receives data via props
- Emits events

### 4. Data Flow

#### Controlled Mode (Recommended)
```
External State (user's app)
    ↓ (props)
GanttChart Component
    ↓ (display)
User Interaction
    ↓ (events)
External State (user updates)
```

**Benefits:**
- Single source of truth (external)
- Predictable data flow
- Easy to integrate with Redux, MobX, etc.
- Time-travel debugging possible

#### Uncontrolled Mode
```
Internal Store
    ↓ (props)
GanttChart Component
    ↓ (display)
User Interaction
    ↓ (store.update)
Internal Store
    ↓ (onDataChange event)
External Persistence (optional)
```

**Benefits:**
- Less boilerplate
- Good for simple use cases
- Still emits change events

## File Structure

```
src/
├── types.ts                         # All TypeScript interfaces
├── index.ts                         # Public API (what users import)
│
├── core/                            # Business logic (no Svelte)
│   ├── data-manager.ts              # Pure functions for hierarchy
│   ├── data-manager.test.ts         # Unit tests
│   ├── gantt-store.ts               # Reactive state wrapper
│   └── gantt-store.test.ts          # Store tests
│
├── components/                      # Svelte UI components
│   ├── GanttChart.svelte            # Main component (orchestrator)
│   ├── GanttTree.svelte             # Left pane (hierarchy)
│   ├── GanttTimeline.svelte         # Right pane (SVG timeline)
│   └── GanttHeader.svelte           # Date header
│
└── utils/                           # Helper functions
    ├── timeline-calculations.ts     # Pure math for positioning
    └── timeline-calculations.test.ts
```

## Key Decisions

### Why Luxon?

- ✅ Immutable date handling
- ✅ Timezone-aware
- ✅ Better API than native Date
- ✅ Industry standard
- ❌ Not using moment.js (deprecated)
- ❌ Not using day.js (less features)

### Why SVG?

- ✅ Scalable
- ✅ Precise positioning
- ✅ Print-friendly
- ✅ Accessible (ARIA support)
- ❌ Not Canvas (harder to make accessible)

### Why No Context API?

Svelte's Context API is convenient but:
- ❌ Harder to test
- ❌ Implicit dependencies
- ❌ May change in Svelte 5

We use **explicit props** instead:
- ✅ Clear data flow
- ✅ Easy to test
- ✅ TypeScript friendly
- ✅ Future-proof

### Why Stores Over Runes?

Svelte 5 Runes aren't stable yet (as of this writing). Using stores:
- ✅ Works in Svelte 4 and 5
- ✅ Clear migration path
- ✅ Well-documented patterns
- ✅ Easy to convert later

## Testing Strategy

### What We Test

**Unit Tests (Pure Logic)**
- ✅ Hierarchy computation
- ✅ Visibility calculations
- ✅ Date range calculations
- ✅ Immutable operations
- ✅ Timeline math

**Integration Tests (Store)**
- ✅ Reactive updates
- ✅ Mode switching
- ✅ Event emissions
- ✅ Data synchronization

**What We Don't Test (Yet)**
- ❌ Component rendering (requires Svelte testing library setup)
- ❌ Visual regression (out of scope for prototype)

### Test Coverage

Target: **100% for business logic**

Current: 38 tests, all passing
- `data-manager.test.ts`: 18 tests
- `gantt-store.test.ts`: 12 tests
- `timeline-calculations.test.ts`: 8 tests

## Extension Points

### Custom Styling

Users can override any CSS:
```css
:global(.gantt-bar--task) {
  fill: #custom-color;
}
```

### Custom Node Types

Add new types:
```typescript
type GanttNodeType = 'project' | 'section' | 'task' | 'milestone';
```

Then style:
```css
:global(.gantt-bar--milestone) {
  fill: #gold;
}
```

### Custom Metadata

Store arbitrary data:
```typescript
const node: GanttNode = {
  id: '1',
  // ... required fields
  metadata: {
    assignee: 'John',
    priority: 'high',
    tags: ['urgent', 'frontend']
  }
};
```

Access in event handlers:
```typescript
onNodeClick: (node) => {
  console.log(node.metadata?.priority);
}
```

## Performance Considerations

### Current Optimizations

1. **Keyed Each Blocks**
   ```svelte
   {#each nodes as node (node.id)}
   ```
   Ensures efficient updates.

2. **Computed Values Cached**
   - Hierarchy computed once per data change
   - Visibility calculated via derived stores
   - No unnecessary recalculations

3. **SVG over Canvas**
   - Browser handles rendering
   - GPU acceleration
   - No manual redraw logic

### Future Optimizations (Not Implemented)

- Virtual scrolling for 1000+ nodes
- Windowing for large timelines
- Web workers for hierarchy computation
- Canvas fallback for massive datasets

These aren't needed for typical use cases (< 500 nodes).

## Migration Guide (Svelte 5)

When Svelte 5 is stable, here's the migration path:

### 1. Update Stores → Runes

**Before (Svelte 4):**
```typescript
const nodes = writable<GanttNode[]>([]);
const computed = derived(nodes, $nodes => computeNodes($nodes));
```

**After (Svelte 5):**
```typescript
let nodes = $state<GanttNode[]>([]);
let computed = $derived(computeNodes(nodes));
```

### 2. Update Components

**Before:**
```svelte
<script>
  export let nodes;
  $: visibleCount = nodes.filter(n => n.isVisible).length;
</script>
```

**After:**
```svelte
<script>
  let { nodes } = $props();
  let visibleCount = $derived(nodes.filter(n => n.isVisible).length);
</script>
```

### 3. Event Handlers

No change needed! Our explicit prop-based events work as-is.

## Common Patterns

### Adding a New Feature

1. **Define the data structure** in `types.ts`
2. **Implement pure logic** in `core/data-manager.ts`
3. **Write tests** for the logic
4. **Add to store** if it needs reactivity
5. **Update component** to use it
6. **Expose in public API** if needed

### Adding a New Event

1. **Add to `GanttEventHandlers`** interface
2. **Implement handler wrapper** in `GanttChart.svelte`
3. **Call from child component**
4. **Document** in README

### Custom Component

Users can create custom components that use the store:

```svelte
<script>
  import { createGanttStore } from 'svelte-gantt-lib';
  
  const store = createGanttStore(nodes);
  
  // Custom UI
</script>

<div>
  {$store.visibleNodes.length} visible nodes
</div>
```

## Known Limitations

### By Design

1. **No drag-and-drop** - Complex, application-specific behavior
2. **No dependencies** - Would require routing logic
3. **No persistence** - Application concern
4. **Day-level only** - Hour/minute granularity not implemented

### Technical

1. **Large datasets** - No virtualization (fine up to ~500 nodes)
2. **Print layout** - May need CSS adjustments
3. **Mobile gestures** - Basic touch support only

## Contributing Guidelines

When adding features:

1. ✅ Keep it generic
2. ✅ No application logic
3. ✅ Add tests
4. ✅ Update TypeScript types
5. ✅ Document in README
6. ✅ Maintain Svelte 5 compatibility
7. ❌ Don't use deprecated Svelte features
8. ❌ Don't add external dependencies without discussion

## FAQ

**Q: Why not use Svelte 5 directly?**
A: Not stable yet. Our design makes migration trivial when it is.

**Q: Why so much TypeScript?**
A: Type safety prevents bugs and makes refactoring safe.

**Q: Can I use this in vanilla JS?**
A: Yes, but you'll miss type checking. Not recommended.

**Q: Will you add feature X?**
A: Only if it's generic and library-appropriate. Submit an issue first.

**Q: Can I fork this for my app?**
A: Yes (MIT license), but consider using it as-is and extending via events/props.
