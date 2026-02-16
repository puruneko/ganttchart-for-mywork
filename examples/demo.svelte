<script lang="ts">
  /**
   * Complete working demo
   * 
   * This demonstrates the library in action with both modes
   */
  
  import GanttChart from '../src/components/GanttChart.svelte';
  import { DateTime, Duration } from 'luxon';
  import type { GanttNode, GanttEventHandlers } from '../src/types';
  import { getAllTickDefinitions, updateTickDefinition, type TickDefinition } from '../src/utils/zoom-scale';
  
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
  let showEventLog = false;
  
  // Tick定義エディター
  let showTickEditor = false;
  let tickDefinitions: TickDefinition[] = [];
  let editingTick: { index: number; def: TickDefinition } | null = null;
  
  // データデバッグパネル
  let showDataDebug = false;
  
  // 現在のズームスケール（外部から取得）
  let currentZoomScale = 1.0;
  
  // Tick定義を初期化
  $: tickDefinitions = getAllTickDefinitions() as TickDefinition[];
  
  // 現在のスケールに対応するTick定義のインデックスを取得
  $: currentTickIndex = tickDefinitions.findIndex((tick, i) => {
    if (i === tickDefinitions.length - 1) return true; // 最後の定義
    return currentZoomScale >= tick.minScale && currentZoomScale < tickDefinitions[i + 1].minScale;
  });
  
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
    },
    
    onZoomChange: (zoomLevel) => {
      currentZoomScale = zoomLevel;
      logEvent(`🔍 Zoom level changed: ${zoomLevel.toFixed(2)}`);
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
  
  // Tick定義の編集
  function startEditTick(index: number) {
    editingTick = { 
      index, 
      def: JSON.parse(JSON.stringify(tickDefinitions[index])) // ディープコピー
    };
  }
  
  function cancelEditTick() {
    editingTick = null;
  }
  
  function saveEditTick() {
    if (editingTick) {
      const label = editingTick.def.label;
      updateTickDefinition(editingTick.index, editingTick.def);
      tickDefinitions = getAllTickDefinitions() as TickDefinition[];
      editingTick = null;
      logEvent(`⚙️ Tick定義を更新: ${label}`);
    }
  }
  
  // Duration文字列をパース
  function parseDurationString(str: string): Duration {
    try {
      // "1 hour", "3 hours", "1 day", "2 weeks", "1 month", "1 year" などの形式をサポート
      const parts = str.trim().split(' ');
      if (parts.length !== 2) throw new Error('Invalid format');
      
      const value = parseFloat(parts[0]);
      const unit = parts[1].toLowerCase().replace(/s$/, ''); // 複数形を単数形に
      
      const durationObj: any = {};
      durationObj[unit] = value;
      
      return Duration.fromObject(durationObj);
    } catch (e) {
      console.error('Duration parse error:', str, e);
      return Duration.fromObject({ days: 1 });
    }
  }
  
  // DurationをUI表示用文字列に変換
  function formatDurationForUI(duration: Duration): string {
    const obj = duration.toObject();
    const entries = Object.entries(obj).filter(([_, v]) => v && v !== 0);
    if (entries.length > 0) {
      const [unit, value] = entries[0];
      return `${value} ${unit}`;
    }
    return '1 day';
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
      <button on:click={() => showEventLog = !showEventLog}>
        {showEventLog ? 'Hide' : 'Show'} Event Log
      </button>
      <button on:click={() => showTickEditor = !showTickEditor}>
        {showTickEditor ? 'Hide' : 'Show'} Tick Editor
      </button>
      <button on:click={() => showDataDebug = !showDataDebug}>
        {showDataDebug ? 'Hide' : 'Show'} Data Debug
      </button>
    </div>
  </div>
  
  <div class="demo-content">
    <div class="gantt-area" class:has-tick-editor={showTickEditor}>
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
      
      {#if showTickEditor}
        <div class="tick-editor">
          <h3>Tick Definitions Editor</h3>
          <div class="tick-info">
            <small>Current Scale: {currentZoomScale.toFixed(2)}</small>
          </div>
          <div class="tick-list">
            {#each tickDefinitions as tick, i}
              <div class="tick-item" class:active={i === currentTickIndex}>
                <div class="tick-header">
                  <strong>{tick.label}</strong>
                  <button class="edit-btn" on:click={() => startEditTick(i)}>Edit</button>
                </div>
                <div class="tick-details">
                  <div>minScale: {tick.minScale}</div>
                  <div>interval: {formatDurationForUI(tick.interval)}</div>
                  <div>majorFormat: {tick.majorFormat}</div>
                  <div>minorFormat: {tick.minorFormat || '(none)'}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    
    <div class="bottom-panels">
      {#if showEventLog}
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
      {/if}
      
      {#if showDataDebug}
        <div class="data-debug">
          <h3>Internal Data Debug Panel</h3>
          <div class="debug-sections">
            <div class="debug-section">
              <h4>📊 Nodes Summary</h4>
              <div class="debug-content">
                <div class="debug-item">
                  <span class="label">Total Nodes:</span>
                  <span class="value">{nodes.length}</span>
                </div>
                <div class="debug-item">
                  <span class="label">Visible Nodes:</span>
                  <span class="value">{nodes.filter(n => !n.isCollapsed || n.parentId === null).length}</span>
                </div>
                <div class="debug-item">
                  <span class="label">Collapsed Nodes:</span>
                  <span class="value">{nodes.filter(n => n.isCollapsed).length}</span>
                </div>
                <div class="debug-item">
                  <span class="label">Nodes with Dates:</span>
                  <span class="value">{nodes.filter(n => n.start && n.end).length}</span>
                </div>
                <div class="debug-item">
                  <span class="label">Nodes without Dates:</span>
                  <span class="value">{nodes.filter(n => !n.start || !n.end).length}</span>
                </div>
              </div>
            </div>
            
            <div class="debug-section">
              <h4>🎯 Node Types</h4>
              <div class="debug-content">
                <div class="debug-item">
                  <span class="label">Projects:</span>
                  <span class="value">{nodes.filter(n => n.type === 'project').length}</span>
                </div>
                <div class="debug-item">
                  <span class="label">Sections:</span>
                  <span class="value">{nodes.filter(n => n.type === 'section').length}</span>
                </div>
                <div class="debug-item">
                  <span class="label">Subsections:</span>
                  <span class="value">{nodes.filter(n => n.type === 'subsection').length}</span>
                </div>
                <div class="debug-item">
                  <span class="label">Tasks:</span>
                  <span class="value">{nodes.filter(n => n.type === 'task').length}</span>
                </div>
              </div>
            </div>
            
            <div class="debug-section">
              <h4>🔍 Zoom & Scale</h4>
              <div class="debug-content">
                <div class="debug-item">
                  <span class="label">Current Zoom Scale:</span>
                  <span class="value">{currentZoomScale.toFixed(3)}</span>
                </div>
                <div class="debug-item">
                  <span class="label">Active Tick Definition:</span>
                  <span class="value">{currentTickIndex >= 0 ? tickDefinitions[currentTickIndex]?.label : 'N/A'}</span>
                </div>
                <div class="debug-item">
                  <span class="label">Mode:</span>
                  <span class="value">{mode}</span>
                </div>
              </div>
            </div>
            
            <div class="debug-section full-width">
              <h4>📋 Node List (First 10)</h4>
              <div class="debug-content node-list">
                {#each nodes.slice(0, 10) as node}
                  <div class="node-item" class:collapsed={node.isCollapsed}>
                    <div class="node-id">{node.id}</div>
                    <div class="node-name">{node.name}</div>
                    <div class="node-type">{node.type}</div>
                    <div class="node-dates">
                      {node.start && node.end ? `${node.start.toFormat('MM/dd')} - ${node.end.toFormat('MM/dd')}` : 'No dates'}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Tick Edit Modal -->
  {#if editingTick}
    <div class="modal-backdrop" on:click={cancelEditTick}>
      <div class="modal-content" on:click|stopPropagation>
        <h3>Edit Tick Definition</h3>
        <div class="form-group">
          <label>
            Label:
            <input type="text" bind:value={editingTick.def.label} />
          </label>
        </div>
        <div class="form-group">
          <label>
            Min Scale:
            <input type="number" step="0.1" bind:value={editingTick.def.minScale} />
          </label>
        </div>
        <div class="form-group">
          <label>
            Interval (e.g., "1 day", "3 hours", "2 weeks"):
            <input 
              type="text" 
              value={formatDurationForUI(editingTick.def.interval)}
              on:input={(e) => {
                editingTick.def.interval = parseDurationString(e.currentTarget.value);
              }}
            />
          </label>
        </div>
        <div class="form-group">
          <label>
            Major Format:
            <input type="text" bind:value={editingTick.def.majorFormat} />
          </label>
        </div>
        <div class="form-group">
          <label>
            Minor Format (optional):
            <input type="text" bind:value={editingTick.def.minorFormat} />
          </label>
        </div>
        <div class="modal-actions">
          <button on:click={saveEditTick}>Save</button>
          <button on:click={cancelEditTick}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}
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
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .gantt-area {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  /* Tick Editor表示時 */
  .gantt-area.has-tick-editor {
    grid-template-columns: 1fr 350px;
  }
  
  .gantt-wrapper {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    height: 600px;
  }
  
  .bottom-panels {
    display: grid;
    gap: 20px;
  }
  
  .event-log {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background: #f9f9f9;
    max-height: 300px;
  }
  
  .event-log h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #333;
  }
  
  .log-entries {
    max-height: 240px;
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
  
  /* Tick Editor */
  .tick-editor {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background: #f9f9f9;
    height: 600px;
    overflow-y: auto;
  }
  
  .tick-editor h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    color: #333;
  }
  
  .tick-info {
    margin-bottom: 12px;
    padding: 8px;
    background: #e3f2fd;
    border-radius: 4px;
  }
  
  .tick-info small {
    font-size: 12px;
    color: #1976d2;
    font-weight: 600;
  }
  
  .tick-list {
    display: grid;
    gap: 12px;
  }
  
  .tick-item {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 12px;
    transition: all 0.2s;
  }
  
  .tick-item.active {
    background: #e8f5e9;
    border: 2px solid #4caf50;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
  }
  
  .tick-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .tick-header strong {
    font-size: 14px;
    color: #333;
  }
  
  .edit-btn {
    padding: 4px 12px;
    font-size: 12px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .edit-btn:hover {
    background: #357abd;
  }
  
  .tick-details {
    font-size: 12px;
    color: #666;
    display: grid;
    gap: 4px;
  }
  
  /* Modal */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .modal-content h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    color: #333;
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  .form-group label {
    display: block;
    font-size: 14px;
    color: #333;
    margin-bottom: 6px;
  }
  
  .form-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
  }
  
  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }
  
  .modal-actions button {
    padding: 8px 16px;
  }
  
  /* Data Debug Panel */
  .data-debug {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background: #f9f9f9;
  }
  
  .data-debug h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #333;
  }
  
  .debug-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }
  
  .debug-section {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 12px;
  }
  
  .debug-section.full-width {
    grid-column: 1 / -1;
  }
  
  .debug-section h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #555;
    font-weight: 600;
  }
  
  .debug-content {
    display: grid;
    gap: 8px;
  }
  
  .debug-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 13px;
  }
  
  .debug-item .label {
    color: #666;
    font-weight: 500;
  }
  
  .debug-item .value {
    color: #333;
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }
  
  .node-list {
    max-height: 300px;
    overflow-y: auto;
  }
  
  .node-item {
    display: grid;
    grid-template-columns: 100px 1fr 100px 150px;
    gap: 8px;
    padding: 8px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 12px;
    align-items: center;
  }
  
  .node-item.collapsed {
    opacity: 0.6;
  }
  
  .node-id {
    font-family: 'Courier New', monospace;
    color: #666;
    font-weight: 600;
  }
  
  .node-name {
    color: #333;
  }
  
  .node-type {
    color: #4a90e2;
    font-weight: 600;
    text-align: center;
  }
  
  .node-dates {
    color: #666;
    font-family: 'Courier New', monospace;
    text-align: right;
  }
</style>
