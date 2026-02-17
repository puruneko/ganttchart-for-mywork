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
      start: DateTime.fromISO('2026-01-01'),
      end: DateTime.fromISO('2026-02-29'),
      isCollapsed: false
    },
    {
      id: 'sec-1',
      parentId: 'proj-1',
      type: 'section',
      name: 'Planning & Research',
      start: DateTime.fromISO('2026-01-01'),
      end: DateTime.fromISO('2026-01-15'),
      isCollapsed: false
    },
    {
      id: 'task-1',
      parentId: 'sec-1',
      type: 'task',
      name: 'User research',
      start: DateTime.fromISO('2026-01-01'),
      end: DateTime.fromISO('2026-01-07')
    },
    {
      id: 'task-2',
      parentId: 'sec-1',
      type: 'task',
      name: 'Competitor analysis',
      start: DateTime.fromISO('2026-01-05'),
      end: DateTime.fromISO('2026-01-12')
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
      start: DateTime.fromISO('2026-01-10'),
      end: DateTime.fromISO('2026-01-15')
    },
    {
      id: 'sec-2',
      parentId: 'proj-1',
      type: 'section',
      name: 'Design Phase',
      start: DateTime.fromISO('2026-01-16'),
      end: DateTime.fromISO('2026-02-05'),
      isCollapsed: false
    },
    {
      id: 'subsec-1',
      parentId: 'sec-2',
      type: 'subsection',
      name: 'UI/UX Design',
      start: DateTime.fromISO('2026-01-16'),
      end: DateTime.fromISO('2026-01-28'),
      isCollapsed: false
    },
    {
      id: 'task-4',
      parentId: 'subsec-1',
      type: 'task',
      name: 'Wireframes',
      start: DateTime.fromISO('2026-01-16'),
      end: DateTime.fromISO('2026-01-22')
    },
    {
      id: 'task-5',
      parentId: 'subsec-1',
      type: 'task',
      name: 'High-fidelity mockups',
      start: DateTime.fromISO('2026-01-23'),
      end: DateTime.fromISO('2026-01-28')
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
      start: DateTime.fromISO('2026-01-29'),
      end: DateTime.fromISO('2026-02-05')
    },
    {
      id: 'sec-3',
      parentId: 'proj-1',
      type: 'section',
      name: 'Development',
      start: DateTime.fromISO('2026-02-06'),
      end: DateTime.fromISO('2026-02-25'),
      isCollapsed: false
    },
    {
      id: 'task-7',
      parentId: 'sec-3',
      type: 'task',
      name: 'Frontend development',
      start: DateTime.fromISO('2026-02-06'),
      end: DateTime.fromISO('2026-02-20')
    },
    {
      id: 'task-8',
      parentId: 'sec-3',
      type: 'task',
      name: 'Backend integration',
      start: DateTime.fromISO('2026-02-12'),
      end: DateTime.fromISO('2026-02-25')
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
      start: DateTime.fromISO('2026-02-26'),
      end: DateTime.fromISO('2026-02-29'),
      isCollapsed: false
    },
    {
      id: 'task-9',
      parentId: 'sec-4',
      type: 'task',
      name: 'QA Testing',
      start: DateTime.fromISO('2026-02-26'),
      end: DateTime.fromISO('2026-02-28')
    },
    {
      id: 'task-10',
      parentId: 'sec-4',
      type: 'task',
      name: 'Production deployment',
      start: DateTime.fromISO('2026-02-29'),
      end: DateTime.fromISO('2026-02-29')
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
  
  // データデバッグパネル
  let showDataDebug = false;
  
  // GanttChartコンポーネントへの参照
  let ganttChartComponent: any;
  
  // 現在のズームスケール（ガントチャートからsubscribe）
  let currentZoomScale = 1.0;
  
  // Tick定義を初期化（デバッグパネル用）
  let tickDefinitions: TickDefinition[] = [];
  $: tickDefinitions = getAllTickDefinitions() as TickDefinition[];
  
  // 現在のスケールに対応するTick定義のインデックスを取得
  $: currentTickIndex = tickDefinitions.findIndex((tick, i) => {
    if (i === tickDefinitions.length - 1) return true; // 最後の定義
    return currentZoomScale >= tick.minScale && currentZoomScale < tickDefinitions[i + 1].minScale;
  });
  
  // GanttChartのストアをsubscribe
  $: if (ganttChartComponent) {
    const store = ganttChartComponent.getStore();
    if (store) {
      store.zoomScale.subscribe((scale: number) => {
        currentZoomScale = scale;
      });
      
      // ライフサイクルイベントの購読例
      // すべてのライフサイクルイベントをリッスン
      store.lifecycleEvents.onLifecycle((event) => {
        console.log(`[ライフサイクル] フェーズ: ${event.detail.phase}`, event.detail.details);
        logEvent(`🔄 ライフサイクル: ${event.detail.phase}`);
      });
      
      // readyフェーズの1回限りのリッスン
      store.lifecycleEvents.once('ready', (event) => {
        console.log('[ライフサイクル] ガントチャートがreadyになりました！', event.detail);
        logEvent('✅ ガントチャートがReady完了！');
      });
    }
  }
  
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
      <button on:click={() => showDataDebug = !showDataDebug}>
        {showDataDebug ? 'Hide' : 'Show'} Data Debug
      </button>
    </div>
  </div>
  
  <div class="demo-content">
    <div class="gantt-area">
      <div class="gantt-wrapper">
        <GanttChart
          bind:this={ganttChartComponent}
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
                    <div class="node-detail">
                      <div class="detail-row">
                        <span class="detail-label">ID:</span>
                        <span class="detail-value">{node.id}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">{node.name}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value type-badge type-{node.type}">{node.type}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Parent:</span>
                        <span class="detail-value">{node.parentId || '(root)'}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Dates:</span>
                        <span class="detail-value">
                          {node.start && node.end ? `${node.start.toFormat('yyyy-MM-dd')} - ${node.end.toFormat('yyyy-MM-dd')}` : 'Not set'}
                        </span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Collapsed:</span>
                        <span class="detail-value">{node.isCollapsed ? 'Yes' : 'No'}</span>
                      </div>
                      {#if node.metadata}
                        <div class="detail-row metadata">
                          <span class="detail-label">Metadata:</span>
                          <span class="detail-value metadata-value">{JSON.stringify(node.metadata)}</span>
                        </div>
                      {/if}
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
    max-height: 400px;
    overflow-y: auto;
  }
  
  .node-item {
    padding: 12px;
    background: #f5f5f5;
    border-radius: 4px;
    margin-bottom: 8px;
    border-left: 3px solid #4a90e2;
  }
  
  .node-item.collapsed {
    opacity: 0.6;
    border-left-color: #999;
  }
  
  .node-detail {
    display: grid;
    gap: 6px;
  }
  
  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
  }
  
  .detail-row.metadata {
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid #ddd;
  }
  
  .detail-label {
    min-width: 80px;
    color: #666;
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .detail-value {
    color: #333;
    word-break: break-word;
  }
  
  .detail-value.metadata-value {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    background: #fff;
    padding: 4px 6px;
    border-radius: 3px;
    border: 1px solid #ddd;
  }
  
  .type-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
  }
  
  .type-project {
    background: #e3f2fd;
    color: #1976d2;
  }
  
  .type-section {
    background: #f3e5f5;
    color: #7b1fa2;
  }
  
  .type-subsection {
    background: #fff3e0;
    color: #e65100;
  }
  
  .type-task {
    background: #e8f5e9;
    color: #2e7d32;
  }
</style>
