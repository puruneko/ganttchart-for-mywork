<script lang="ts">
  /**
   * Complete working demo
   * 
   * This demonstrates the library in action with both modes
   */
  
  import GanttChart from '../src/components/GanttChart.svelte';
  import GanttDebugPanel from '../src/components/GanttDebugPanel.svelte';
  import { DateTime } from 'luxon';
  import type { GanttNode, GanttEventHandlers } from '../src/types';
  
  // Demo data
  let nodes: GanttNode[] = [
    {
      id: 'proj-1',
      parentId: null,
      type: 'project',
      name: 'Website Redesign Project',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-02-29'),
      isCollapsed: false
    },
    {
      id: 'sec-1',
      parentId: 'proj-1',
      type: 'section',
      name: 'Planning & Research',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-01-15'),
      isCollapsed: false
    },
    {
      id: 'task-1',
      parentId: 'sec-1',
      type: 'task',
      name: 'User research',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-01-07')
    },
    {
      id: 'task-2',
      parentId: 'sec-1',
      type: 'task',
      name: 'Competitor analysis',
      start: DateTime.fromISO('2024-01-05'),
      end: DateTime.fromISO('2024-01-12')
    },
    {
      id: 'task-unset-1',
      parentId: 'sec-1',
      type: 'task',
      name: 'TBD Task (No dates)'
      // start/end未設定
    },
    {
      id: 'task-3',
      parentId: 'sec-1',
      type: 'task',
      name: 'Requirements gathering',
      start: DateTime.fromISO('2024-01-10'),
      end: DateTime.fromISO('2024-01-15')
    },
    {
      id: 'sec-2',
      parentId: 'proj-1',
      type: 'section',
      name: 'Design Phase',
      start: DateTime.fromISO('2024-01-16'),
      end: DateTime.fromISO('2024-02-05'),
      isCollapsed: false
    },
    {
      id: 'subsec-1',
      parentId: 'sec-2',
      type: 'subsection',
      name: 'UI/UX Design',
      start: DateTime.fromISO('2024-01-16'),
      end: DateTime.fromISO('2024-01-28'),
      isCollapsed: false
    },
    {
      id: 'task-4',
      parentId: 'subsec-1',
      type: 'task',
      name: 'Wireframes',
      start: DateTime.fromISO('2024-01-16'),
      end: DateTime.fromISO('2024-01-22')
    },
    {
      id: 'task-5',
      parentId: 'subsec-1',
      type: 'task',
      name: 'High-fidelity mockups',
      start: DateTime.fromISO('2024-01-23'),
      end: DateTime.fromISO('2024-01-28')
    },
    {
      id: 'task-unset-2',
      parentId: 'subsec-1',
      type: 'task',
      name: 'Prototype (TBD)'
      // start/end未設定
    },
    {
      id: 'task-6',
      parentId: 'sec-2',
      type: 'task',
      name: 'Design system creation',
      start: DateTime.fromISO('2024-01-29'),
      end: DateTime.fromISO('2024-02-05')
    },
    {
      id: 'sec-3',
      parentId: 'proj-1',
      type: 'section',
      name: 'Development',
      start: DateTime.fromISO('2024-02-06'),
      end: DateTime.fromISO('2024-02-25'),
      isCollapsed: false
    },
    {
      id: 'task-7',
      parentId: 'sec-3',
      type: 'task',
      name: 'Frontend development',
      start: DateTime.fromISO('2024-02-06'),
      end: DateTime.fromISO('2024-02-20')
    },
    {
      id: 'task-8',
      parentId: 'sec-3',
      type: 'task',
      name: 'Backend integration',
      start: DateTime.fromISO('2024-02-12'),
      end: DateTime.fromISO('2024-02-25')
    },
    {
      id: 'task-unset-3',
      parentId: 'sec-3',
      type: 'task',
      name: 'Code review (Pending)'
      // start/end未設定
    },
    {
      id: 'sec-4',
      parentId: 'proj-1',
      type: 'section',
      name: 'Testing & Launch',
      start: DateTime.fromISO('2024-02-26'),
      end: DateTime.fromISO('2024-02-29'),
      isCollapsed: false
    },
    {
      id: 'task-9',
      parentId: 'sec-4',
      type: 'task',
      name: 'QA Testing',
      start: DateTime.fromISO('2024-02-26'),
      end: DateTime.fromISO('2024-02-28')
    },
    {
      id: 'task-10',
      parentId: 'sec-4',
      type: 'task',
      name: 'Production deployment',
      start: DateTime.fromISO('2024-02-29'),
      end: DateTime.fromISO('2024-02-29')
    },
    {
      id: 'task-unset-4',
      parentId: 'sec-4',
      type: 'task',
      name: 'Post-launch monitoring (TBD)'
      // start/end未設定
    }
  ];
  
  // Mode toggle
  let mode: 'controlled' | 'uncontrolled' = 'controlled';
  
  // Event log
  let eventLog: string[] = [];
  
  function logEvent(message: string) {
    eventLog = [message, ...eventLog].slice(0, 10);
  }
  
  // Event handlers
  const handlers: GanttEventHandlers = {
    onNodeClick: (node) => {
      logEvent(`🖱️ Clicked: ${node.name} (${node.type})`);
    },
    
    onToggleCollapse: (nodeId, newState) => {
      logEvent(`${newState ? '▶' : '▼'} Toggled: ${nodeId} -> ${newState ? 'collapsed' : 'expanded'}`);
      
      if (mode === 'controlled') {
        // Update state in controlled mode
        nodes = nodes.map(n => 
          n.id === nodeId ? { ...n, isCollapsed: newState } : n
        );
      }
    },
    
    onDataChange: (updatedNodes) => {
      logEvent(`📊 Data changed (${updatedNodes.length} nodes)`);
    },
    
    onBarClick: (node, event) => {
      logEvent(`📊 Bar clicked: ${node.name}`);
    },
    
    onNameClick: (node, event) => {
      logEvent(`📝 Name clicked: ${node.name}`);
    },
    
    onBarDrag: (nodeId, newStart, newEnd) => {
      logEvent(`🔄 Dragged: ${nodeId} -> ${newStart.toFormat('MM/dd')} - ${newEnd.toFormat('MM/dd')}`);
      
      if (mode === 'controlled') {
        nodes = nodes.map(n => 
          n.id === nodeId ? { ...n, start: newStart, end: newEnd } : n
        );
        console.debug('📊 Gantt data updated after drag:', nodes);
      }
    },
    
    onGroupDrag: (nodeId, daysDelta) => {
      logEvent(`🔄 Group dragged: ${nodeId} -> ${daysDelta > 0 ? '+' : ''}${daysDelta.toFixed(2)} days`);
      
      if (mode === 'controlled' && daysDelta !== 0) {
        // グループ（セクション/プロジェクト）とその子孫すべてを移動
        const updateNodeAndDescendants = (nodes: GanttNode[], targetId: string, delta: number): GanttNode[] => {
          const descendants = new Set<string>();
          
          // 子孫を再帰的に収集
          const collectDescendants = (id: string) => {
            descendants.add(id);
            nodes.filter(n => n.parentId === id).forEach(child => collectDescendants(child.id));
          };
          collectDescendants(targetId);
          
          // 該当ノードとその子孫の日付を更新（日時未設定のノードは除外）
          return nodes.map(n => {
            if (descendants.has(n.id) && n.start && n.end) {
              return {
                ...n,
                start: n.start.plus({ days: delta }),
                end: n.end.plus({ days: delta })
              };
            }
            return n;
          });
        };
        
        nodes = updateNodeAndDescendants(nodes, nodeId, daysDelta);
        console.debug('📊 Gantt data updated after group drag:', nodes);
      }
    },
    
    onAutoAdjustSection: (nodeId) => {
      logEvent(`📅 Auto-adjust section: ${nodeId}`);
      
      if (mode === 'controlled') {
        // Controlledモードでは、配下のタスクに合わせて日付を調整
        const descendants = new Set<string>();
        
        // 子孫を再帰的に収集
        const collectDescendants = (id: string) => {
          nodes.filter(n => n.parentId === id).forEach(child => {
            descendants.add(child.id);
            collectDescendants(child.id);
          });
        };
        collectDescendants(nodeId);
        
        // 日時が設定されている子孫ノードのみを対象
        const descendantNodes = nodes.filter(n => descendants.has(n.id) && n.start && n.end);
        
        if (descendantNodes.length > 0) {
          let minStart = descendantNodes[0].start!;
          let maxEnd = descendantNodes[0].end!;
          
          for (const node of descendantNodes) {
            if (node.start! < minStart) minStart = node.start!;
            if (node.end! > maxEnd) maxEnd = node.end!;
          }
          
          // セクションの日付を更新
          nodes = nodes.map(n => 
            n.id === nodeId ? { ...n, start: minStart.startOf('day'), end: maxEnd.endOf('day') } : n
          );
          
          logEvent(`📅 Section adjusted: ${minStart.toFormat('MM/dd')} - ${maxEnd.toFormat('MM/dd')}`);
        }
      }
    }
  };
  
  // Helper functions
  function collapseAll() {
    nodes = nodes.map(n => ({ ...n, isCollapsed: true }));
    logEvent('🔽 Collapsed all nodes');
  }
  
  function expandAll() {
    nodes = nodes.map(n => ({ ...n, isCollapsed: false }));
    logEvent('🔼 Expanded all nodes');
  }
  
  function resetData() {
    // Just trigger reactivity
    nodes = [...nodes];
    logEvent('🔄 Data reset');
  }
</script>

<div class="demo-container">
  <div class="demo-header">
    <h1>Gantt Chart Library Demo</h1>
    <div class="controls">
      <div class="control-group">
        <label>
          Mode:
          <select bind:value={mode}>
            <option value="controlled">Controlled</option>
            <option value="uncontrolled">Uncontrolled</option>
          </select>
        </label>
      </div>
      <button on:click={expandAll}>Expand All</button>
      <button on:click={collapseAll}>Collapse All</button>
      <button on:click={resetData}>Reset</button>
    </div>
  </div>
  
  <div class="demo-content">
    <div class="gantt-wrapper">
      <GanttChart 
        {nodes}
        {handlers}
        config={{
          mode,
          rowHeight: 32,
          dayWidth: 30,
          treePaneWidth: 300,
          indentSize: 20,
          classPrefix: 'gantt',
          dragSnapDivision: 4
        }}
      />
    </div>
    
    <div class="event-log">
      <h3>Event Log</h3>
      <div class="log-entries">
        {#each eventLog as entry}
          <div class="log-entry">{entry}</div>
        {/each}
        {#if eventLog.length === 0}
          <div class="log-empty">No events yet. Try clicking nodes!</div>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Debug Panel -->
  <GanttDebugPanel {nodes} classPrefix="gantt" />
</div>

<style>
  .demo-container {
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .demo-header {
    margin-bottom: 20px;
  }
  
  .demo-header h1 {
    margin: 0 0 16px 0;
    font-size: 24px;
    color: #333;
  }
  
  .controls {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .control-group {
    display: flex;
    align-items: center;
  }
  
  .control-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  
  select {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  
  button {
    padding: 8px 16px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  }
  
  button:hover {
    background: #357abd;
  }
  
  .demo-content {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
  }
  
  .gantt-wrapper {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    height: 600px;
  }
  
  .event-log {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background: #f9f9f9;
  }
  
  .event-log h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #333;
  }
  
  .log-entries {
    max-height: 550px;
    overflow-y: auto;
  }
  
  .log-entry {
    padding: 8px;
    margin-bottom: 4px;
    background: white;
    border-radius: 4px;
    font-size: 13px;
    border-left: 3px solid #4a90e2;
  }
  
  .log-empty {
    padding: 16px;
    text-align: center;
    color: #999;
    font-size: 14px;
  }
  
  @media (max-width: 1024px) {
    .demo-content {
      grid-template-columns: 1fr;
    }
  }
</style>
