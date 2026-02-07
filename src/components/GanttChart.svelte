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
  $: store.setNodes(nodes); // 外部ノード変更時に更新（controlledモード）
  $: store.updateConfig(config);
  
  // 購読用に個別ストアを抽出
  const { visibleNodes: visibleNodesStore, dateRange: dateRangeStore, config: configStore } = store;
  
  // $構文で購読
  $: visibleNodes = $visibleNodesStore;
  $: dateRange = $dateRangeStore;
  $: chartConfig = $configStore;
  $: classPrefix = chartConfig.classPrefix;
  
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
</script>

<div class="{classPrefix}-container">
  <div class="{classPrefix}-layout">
    <!-- 左ペイン: ツリー -->
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
    
    <!-- 右ペイン: タイムライン -->
    <div class="{classPrefix}-right-pane">
      <div class="{classPrefix}-timeline-header-wrapper">
        <GanttHeader
          {dateRange}
          dayWidth={chartConfig.dayWidth}
          {classPrefix}
        />
      </div>
      <div class="{classPrefix}-timeline-wrapper">
        <GanttTimeline
          {visibleNodes}
          {dateRange}
          dayWidth={chartConfig.dayWidth}
          rowHeight={chartConfig.rowHeight}
          {classPrefix}
          onBarClick={handleBarClick}
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
