<script lang="ts">
  /**
   * メインガントチャートコンポーネント
   * 
   * ライブラリの主要なパブリックAPI。
   * 
   * Svelte 5移行戦略:
   * - ストアサブスクリプションは$stateに変換される
   * - リアクティブ文は$derivedに変換される
   * - イベントハンドラーは既に明示的なprops
   * - ライフサイクルフック不使用
   */
  
  import type { GanttNode, GanttEventHandlers, GanttConfig, ComputedGanttNode } from '../types';
  import { createGanttStore } from '../core/gantt-store';
  import GanttTree from './GanttTree.svelte';
  import GanttTimeline from './GanttTimeline.svelte';
  import GanttHeader from './GanttHeader.svelte';
  import { 
    getTickDefinitionForScale, 
    getDayWidthFromScale,
    getScaleFromDayWidth,
    ZOOM_SCALE_LIMITS 
  } from '../utils/zoom-scale';
  
  // パブリックprops
  /** 表示するノードの配列 */
  export let nodes: GanttNode[];
  /** イベントハンドラー群 */
  export let handlers: GanttEventHandlers = {};
  /** 設定オプション */
  export let config: GanttConfig = {};
  
  // ストアインスタンスを作成
  // Svelte 5では、このストア全体を$stateと$derivedに置き換え可能
  const store = createGanttStore(nodes, config);
  
  // ストアの値を購読
  // これらはSvelte 5でシンプルな$state参照になる
  $: {
    store.setNodes(nodes); // 外部ノード変更時に更新（controlledモード）
  }
  $: store.updateConfig(config);
  
  // 購読用に個別ストアを抽出
  const { visibleNodes: visibleNodesStore, dateRange: dateRangeStore, config: configStore } = store;
  
  // $構文で購読
  $: visibleNodes = $visibleNodesStore;
  $: dateRange = $dateRangeStore;
  $: chartConfig = $configStore;
  $: classPrefix = chartConfig.classPrefix;
  
  // 重要なデータ変更を監視してログ出力
  $: {
    if (visibleNodes) {
      console.debug('👁️ [GanttChart] Visible nodes updated:', visibleNodes.length, 'visible');
    }
  }
  $: {
    if (dateRange) {
      console.debug('📅 [GanttChart] Date range:', dateRange.start.toISODate(), '→', dateRange.end.toISODate());
    }
  }
  
  /**
   * ノード名クリックハンドラー
   * 内部イベントを外部ハンドラーに橋渡し
   */
  function handleNameClick(node: ComputedGanttNode, event: MouseEvent) {
    if (handlers.onNodeClick) {
      handlers.onNodeClick(node);
    }
    if (handlers.onNameClick) {
      handlers.onNameClick(node, event);
    }
  }
  
  /**
   * バークリックハンドラー
   * 内部イベントを外部ハンドラーに橋渡し
   */
  function handleBarClick(node: ComputedGanttNode, event: MouseEvent) {
    if (handlers.onNodeClick) {
      handlers.onNodeClick(node);
    }
    if (handlers.onBarClick) {
      handlers.onBarClick(node, event);
    }
  }
  
  /**
   * バードラッグハンドラー
   * 内部イベントを外部ハンドラーに橋渡し
   */
  function handleBarDrag(nodeId: string, newStart: any, newEnd: any) {
    if (handlers.onBarDrag) {
      handlers.onBarDrag(nodeId, newStart, newEnd);
    }
  }
  
  /**
   * グループドラッグハンドラー
   * グループ全体を移動する際のハンドラー
   */
  function handleGroupDrag(nodeId: string, daysDelta: number) {
    if (handlers.onGroupDrag) {
      handlers.onGroupDrag(nodeId, daysDelta);
    }
  }
  
  /**
   * 折り畳み切り替えハンドラー
   * Controlledモードでは外部に通知のみ、Uncontrolledモードでは内部状態も更新
   */
  function handleToggleCollapse(nodeId: string) {
    const node = store.getNodeById(nodeId);
    if (!node) return;
    
    const newCollapsedState = !node.isCollapsed;
    
    // 外部ハンドラーに通知
    if (handlers.onToggleCollapse) {
      handlers.onToggleCollapse(nodeId, newCollapsedState);
    }
    
    // ストアで切り替え（uncontrolledモードの場合のみ適用される）
    const newNodes = store.toggleCollapse(nodeId);
    
    // uncontrolledモードの場合、データ変更ハンドラーに通知
    if (chartConfig.mode === 'uncontrolled' && handlers.onDataChange) {
      handlers.onDataChange(newNodes);
    }
  }
  
  /**
   * セクション日付自動調整ハンドラー
   */
  function handleAutoAdjustSection(nodeId: string) {
    // 外部ハンドラーに通知
    if (handlers.onAutoAdjustSection) {
      handlers.onAutoAdjustSection(nodeId);
    }
    
    // uncontrolledモードの場合、内部で自動調整
    if (chartConfig.mode === 'uncontrolled') {
      const newNodes = store.autoAdjustSectionDates(nodeId);
      
      // データ変更ハンドラーに通知
      if (handlers.onDataChange) {
        handlers.onDataChange(newNodes);
      }
    }
  }
  
  /**
   * ツリーペイン表示切り替え
   */
  let showTreePane = true;
  $: showTreePane = chartConfig?.showTreePane ?? true;
  
  function toggleTreePane() {
    showTreePane = !showTreePane;
    store.updateConfig({ ...chartConfig, showTreePane });
  }
  
  /**
   * ズーム機能（ジェスチャーベース + ボタン操作）
   */
  let currentZoomScale = 1.0; // 初期値
  $: currentZoomScale = getScaleFromDayWidth(chartConfig?.dayWidth ?? 40);
  
  // ズームスケールの表示用（1-5の範囲にマッピング）
  $: displayZoomLevel = Math.round(Math.log2(currentZoomScale) * 2 + 3);
  
  // タイムラインからのズーム変更を処理
  function handleTimelineZoom(scale: number, newDayWidth: number): void {
    currentZoomScale = scale;
    store.updateConfig({ ...chartConfig, dayWidth: newDayWidth });
    
    // 外部ハンドラーに通知
    if (handlers.onZoomChange) {
      handlers.onZoomChange(scale);
    }
  }
  
  // ボタンからのズーム操作
  function zoomIn() {
    const newScale = Math.min(currentZoomScale * 1.5, ZOOM_SCALE_LIMITS.max);
    const newDayWidth = getDayWidthFromScale(newScale);
    currentZoomScale = newScale;
    store.updateConfig({ ...chartConfig, dayWidth: newDayWidth });
    
    if (handlers.onZoomChange) {
      handlers.onZoomChange(newScale);
    }
  }
  
  function zoomOut() {
    const newScale = Math.max(currentZoomScale / 1.5, ZOOM_SCALE_LIMITS.min);
    const newDayWidth = getDayWidthFromScale(newScale);
    currentZoomScale = newScale;
    store.updateConfig({ ...chartConfig, dayWidth: newDayWidth });
    
    if (handlers.onZoomChange) {
      handlers.onZoomChange(newScale);
    }
  }
  
  // 現在のtick定義を取得
  $: currentTickDef = getTickDefinitionForScale(currentZoomScale);
</script>

<div class="{classPrefix}-container">
  <!-- ツリーペイン切り替えボタン -->
  <button
    class="{classPrefix}-toggle-tree-btn"
    on:click={toggleTreePane}
    title={showTreePane ? 'ツリーペインを非表示' : 'ツリーペインを表示'}
  >
    {showTreePane ? '◀' : '▶'}
  </button>
  
  <!-- ズームボタン -->
  <div class="{classPrefix}-zoom-controls">
    <button
      class="{classPrefix}-zoom-btn"
      on:click={zoomOut}
      disabled={currentZoomScale <= ZOOM_SCALE_LIMITS.min}
      title="ズームアウト (Ctrl+ホイールでも可)"
    >
      −
    </button>
    <span class="{classPrefix}-zoom-level" title={currentTickDef.label}>
      {displayZoomLevel}
    </span>
    <button
      class="{classPrefix}-zoom-btn"
      on:click={zoomIn}
      disabled={currentZoomScale >= ZOOM_SCALE_LIMITS.max}
      title="ズームイン (Ctrl+ホイールでも可)"
    >
      +
    </button>
  </div>
  
  <div class="{classPrefix}-layout">
    <!-- 左ペイン: ツリー -->
    {#if showTreePane}
      <div class="{classPrefix}-left-pane">
        <div 
          class="{classPrefix}-tree-header"
          style="width: {chartConfig.treePaneWidth}px; height: 50px;"
        >
          <span class="{classPrefix}-tree-header-label">タスク</span>
        </div>
        <div class="{classPrefix}-tree-wrapper">
          <GanttTree
            {visibleNodes}
            rowHeight={chartConfig.rowHeight}
            indentSize={chartConfig.indentSize}
            treePaneWidth={chartConfig.treePaneWidth}
            {classPrefix}
            onNameClick={handleNameClick}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>
      </div>
    {/if}
    
    <!-- 右ペイン: タイムライン -->
    <div class="{classPrefix}-right-pane">
      <div class="{classPrefix}-timeline-header-wrapper">
        <GanttHeader
          {dateRange}
          dayWidth={chartConfig.dayWidth}
          {classPrefix}
          zoomScale={currentZoomScale}
        />
      </div>
      <div class="{classPrefix}-timeline-wrapper">
        <GanttTimeline
          {visibleNodes}
          {dateRange}
          dayWidth={chartConfig.dayWidth}
          rowHeight={chartConfig.rowHeight}
          dragSnapDivision={chartConfig.dragSnapDivision}
          {classPrefix}
          onBarClick={handleBarClick}
          onBarDrag={handleBarDrag}
          onGroupDrag={handleGroupDrag}
          onAutoAdjustSection={handleAutoAdjustSection}
          onZoomChange={handleTimelineZoom}
        />
      </div>
    </div>
  </div>
</div>

<style>
  :global(.gantt-container) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    border: 1px solid #ddd;
    background: white;
    overflow: hidden;
    position: relative;
  }
  
  :global(.gantt-toggle-tree-btn) {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 10;
    width: 32px;
    height: 32px;
    border: 1px solid #ccc;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: background 0.2s;
  }
  
  :global(.gantt-toggle-tree-btn:hover) {
    background: #f0f0f0;
  }
  
  :global(.gantt-zoom-controls) {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 4px;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px;
  }
  
  :global(.gantt-zoom-btn) {
    width: 28px;
    height: 28px;
    border: 1px solid #ccc;
    background: #fff;
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    transition: background 0.2s;
  }
  
  :global(.gantt-zoom-btn:hover:not(:disabled)) {
    background: #f0f0f0;
  }
  
  :global(.gantt-zoom-btn:disabled) {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  :global(.gantt-zoom-level) {
    font-size: 12px;
    color: #666;
    min-width: 16px;
    text-align: center;
  }
  
  :global(.gantt-layout) {
    display: flex;
    height: 100%;
  }
  
  :global(.gantt-left-pane) {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
  
  :global(.gantt-tree-header) {
    border-right: 1px solid #ddd;
    border-bottom: 2px solid #ddd;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    padding: 0 16px;
    font-weight: 600;
    box-sizing: border-box;
  }
  
  :global(.gantt-tree-wrapper) {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  :global(.gantt-right-pane) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  :global(.gantt-timeline-header-wrapper) {
    overflow-x: auto;
    overflow-y: hidden;
  }
  
  :global(.gantt-timeline-wrapper) {
    flex: 1;
    overflow: auto;
  }
  
  /* スクロールバー同期スタイリング */
  :global(.gantt-tree-wrapper),
  :global(.gantt-timeline-wrapper) {
    scrollbar-width: thin;
  }
</style>
