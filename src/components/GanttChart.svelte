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
  import { createRenderLifecycle } from '../core/render-lifecycle';
  import GanttTree from './GanttTree.svelte';
  import GanttTimeline from './GanttTimeline.svelte';
  import GanttHeader from './GanttHeader.svelte';
  import { 
    getTickDefinitionForScale, 
    getDayWidthFromScale,
    getScaleFromDayWidth,
    ZOOM_SCALE_LIMITS
  } from '../utils/zoom-scale';
  import { getTickGenerationDefForScale, addCustomTickGenerationDef } from '../utils/tick-generator';
  import type { TickGenerationDef } from '../utils/tick-generator';
  import { Duration, DateTime } from 'luxon';
  import { onMount, tick } from 'svelte';
  
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
  
  // レンダリングライフサイクル管理（letで宣言してHMR互換性を向上）
  let lifecycle = createRenderLifecycle();
  
  // 外部からストアにアクセスできるようにエクスポート（Tick Editorなどで使用）
  export function getStore() {
    return store;
  }
  
  /**
   * 指定された日付に視点を移動
   * @param targetDate 移動先の日付
   */
  export function scrollToDate(targetDate: DateTime) {
    if (!timelineWrapperElement) return;
    
    const current = $extendedDateRangeStore;
    const currentDayWidth = $configStore.dayWidth;
    
    // 目標日付が拡張範囲外の場合は範囲を拡張
    if (targetDate < current.start || targetDate > current.end) {
      store.initExtendedDateRange(
        timelineWrapperElement.clientWidth,
        currentDayWidth,
        getScaleFromDayWidth(currentDayWidth)
      );
    }
    
    // スクロール位置を計算
    const containerWidth = timelineWrapperElement.clientWidth;
    const targetDays = targetDate.diff(current.start, 'days').days;
    const targetContentX = targetDays * currentDayWidth;
    const newScrollLeft = targetContentX - (containerWidth / 2);
    
    // スクロール位置を設定
    timelineWrapperElement.scrollLeft = Math.max(0, newScrollLeft);
  }
  
  /**
   * 今日の日付に視点を移動
   */
  export function scrollToToday() {
    scrollToDate(DateTime.now().startOf('day'));
  }
  
  // ストアの値を購読
  // これらはSvelte 5でシンプルな$state参照になる
  $: {
    store.setNodes(nodes); // 外部ノード変更時に更新（controlledモード）
  }
  $: store.updateConfig(config);
  
  // 購読用に個別ストアを抽出
  const { visibleNodes: visibleNodesStore, dateRange: dateRangeStore, extendedDateRange: extendedDateRangeStore, config: configStore } = store;
  
  // $構文で購読
  $: visibleNodes = $visibleNodesStore;
  $: dateRange = $dateRangeStore;
  $: extendedDateRange = $extendedDateRangeStore;
  $: chartConfig = $configStore;
  $: classPrefix = chartConfig.classPrefix;
  
  // 初期化をonMountで実行
  onMount(() => {
    // ライフサイクルイベント発行：初期化開始
    store.lifecycleEvents.emit('initializing');
    
    lifecycle.startMounting();
    lifecycle.startMeasuring();
    
    // ライフサイクルイベント発行：レンダリング開始
    store.lifecycleEvents.emit('rendering');
    
    // コンテナ幅を直接測定して初期化
    const containerWidth = timelineWrapperElement?.clientWidth || 1000;
    
    // extendedDateRangeを初期化
    store.initExtendedDateRange(containerWidth, chartConfig.dayWidth, currentZoomScale);
    
    // 次のマイクロタスク内でレンダリング完了を通知
    requestAnimationFrame(() => {
      lifecycle.startRendering();
      
      // さらに次のフレームで完了マーク
      requestAnimationFrame(() => {
        // ライフサイクルイベント発行：マウント完了
        store.lifecycleEvents.emit('mounted', { timestamp: Date.now() });
        
        lifecycle.markReady();
        
        // レディイベントをサブコンポーネント準備後に発行
        tick().then(() => {
          store.lifecycleEvents.emit('ready', { 
            allComponentsLoaded: true,
            timestamp: Date.now()
          });
        });
      });
    });
  });
  
  // 重要なデータ変更を監視してログ出力（showEventLogがtrueの場合のみ）
  $: {
    if (showEventLog && visibleNodes) {
      console.debug('👁️ [GanttChart] Visible nodes updated:', visibleNodes.length, 'visible');
    }
  }
  $: {
    if (showEventLog && dateRange) {
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
   * Tick定義エディタ表示切り替え
   */
  let showTickEditor = false;
  
  function toggleTickEditor() {
    showTickEditor = !showTickEditor;
  }
  
  /**
   * イベントログ表示切り替え
   */
  let showEventLog = false; // 既定値: 非表示
  
  function toggleEventLog() {
    showEventLog = !showEventLog;
  }
  
  /**
   * Tick定義エディタ用
   */
  import { getAllTickDefinitions, updateTickDefinition, type TickDefinition } from '../utils/zoom-scale';
  
  let tickDefinitions: TickDefinition[] = [];
  let editingTick: { index: number; def: TickDefinition } | null = null;
  
  // Tick定義を初期化（降順でソートされている：大きい→小さい）
  $: tickDefinitions = getAllTickDefinitions() as TickDefinition[];
  
  // 現在のスケールに対応するTick定義のインデックスを取得
  // TICK_DEFINITIONSは降順ソート済み（minScale: 100, 50, 25, ..., 0）
  $: currentTickIndex = (() => {
    if (tickDefinitions.length === 0) return -1;
    
    // 降順でチェック：最初にscale >= minScaleとなる定義を探す
    for (let i = 0; i < tickDefinitions.length; i++) {
      if (currentZoomScale >= tickDefinitions[i].minScale) {
        return i;
      }
    }
    
    // どれにも該当しない（scaleが最小のminScaleより小さい）場合は最後の定義
    return tickDefinitions.length - 1;
  })();
  
  function startEditTick(index: number) {
    const original = tickDefinitions[index];
    // DurationオブジェクトをディープコピーするためにtoObject()を使用
    editingTick = { 
      index, 
      def: {
        ...original,
        majorInterval: original.majorInterval ? Duration.fromObject(original.majorInterval.toObject()) : undefined,
        minorInterval: Duration.fromObject(original.minorInterval.toObject()),
      }
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
    }
  }
  
  // Duration文字列をパース
  function parseDurationString(str: string): Duration {
    try {
      const parts = str.trim().split(' ');
      if (parts.length !== 2) throw new Error('Invalid format');
      
      const value = parseFloat(parts[0]);
      const unit = parts[1].toLowerCase().replace(/s$/, '');
      
      const durationObj: any = {};
      durationObj[unit] = value;
      
      return Duration.fromObject(durationObj);
    } catch (e) {
      return Duration.fromObject({ days: 1 });
    }
  }
  
  // DurationをUI表示用文字列に変換
  function formatDurationForUI(duration: Duration | any): string {
    try {
      // 文字列の場合はそのまま返す
      if (typeof duration === 'string') {
        return duration;
      }
      
      // Durationオブジェクトでない場合は変換
      if (!(duration instanceof Duration)) {
        // オブジェクトの場合
        if (typeof duration === 'object' && duration !== null) {
          duration = Duration.fromObject(duration);
        } else {
          return '1 day';
        }
      }
      
      const obj = duration.toObject();
      const entries = Object.entries(obj).filter(([_, v]) => v && v !== 0);
      if (entries.length > 0) {
        const [unit, value] = entries[0];
        return `${value} ${unit}`;
      }
      return '1 day';
    } catch (e) {
      console.error('formatDurationForUI error:', e, duration);
      return '1 day';
    }
  }
  
  
  /**
   * ズーム機能（ジェスチャーベース + ボタン操作）
   */
  let currentZoomScale = 1.0; // 初期値
  
  // dayWidthからズームスケールを計算（外部からdayWidthが変更されたとき用）
  $: {
    const scaleFromDayWidth = getScaleFromDayWidth(chartConfig?.dayWidth ?? 40);
    // 大きく異なる場合のみ更新（ボタン操作との競合を避ける）
    if (Math.abs(scaleFromDayWidth - currentZoomScale) > 0.1) {
      currentZoomScale = scaleFromDayWidth;
    }
  }
  
  // ズームスケールの表示用（デフォルトscale=1.0で3になるように）
  // scale 1.0 → log2(1.0) = 0 → 0 + 3 = 3
  $: displayZoomLevel = Math.max(1, Math.min(5, Math.round(Math.log2(currentZoomScale) + 3)));
  
  // タイムラインからのズーム変更を処理
  function handleTimelineZoom(scale: number, newDayWidth: number): void {
    currentZoomScale = scale;
    store.setZoomScale(scale); // ストアにも反映
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
    store.setZoomScale(newScale); // ストアにも反映
    store.updateConfig({ ...chartConfig, dayWidth: newDayWidth });
    
    if (handlers.onZoomChange) {
      handlers.onZoomChange(newScale);
    }
  }
  
  function zoomOut() {
    const newScale = Math.max(currentZoomScale / 1.5, ZOOM_SCALE_LIMITS.min);
    const newDayWidth = getDayWidthFromScale(newScale);
    currentZoomScale = newScale;
    store.setZoomScale(newScale); // ストアにも反映
    store.updateConfig({ ...chartConfig, dayWidth: newDayWidth });
    
    if (handlers.onZoomChange) {
      handlers.onZoomChange(newScale);
    }
  }
  
  // 現在のtick定義を取得（zoom-scale用）
  $: currentTickDef = getTickDefinitionForScale(currentZoomScale);
  
  // ヘッダー用のtick定義を取得（tick-generator用）
  $: headerTickDef = getTickGenerationDefForScale(currentZoomScale);
  
  /**
   * スクロール同期機能
   * - ヘッダーとタイムラインの横スクロールを同期
   * - ツリーとタイムラインの縦スクロールを同期
   */
  let timelineHeaderWrapperElement: HTMLElement;
  let timelineWrapperElement: HTMLElement;
  let treeWrapperElement: HTMLElement;
  
  // スクロール同期処理中のフラグ（ループ防止）
  let isScrolling = false;
  
  /**
   * タイムラインの横スクロールとヘッダーを同期
   */
  function handleTimelineScroll(_event: Event) {
    if (isScrolling) return;
    isScrolling = true;
    
    try {
      // 横スクロール: ヘッダーと同期
      if (timelineWrapperElement && timelineHeaderWrapperElement) {
        const scrollLeft = timelineWrapperElement.scrollLeft;
        if (timelineHeaderWrapperElement.scrollLeft !== scrollLeft) {
          timelineHeaderWrapperElement.scrollLeft = scrollLeft;
        }
        
        // 端に近づいたら拡張dateRangeを拡張
        const containerWidth = timelineWrapperElement.clientWidth;
        const expanded = store.expandExtendedDateRangeIfNeeded(
          scrollLeft,
          containerWidth,
          chartConfig.dayWidth,
          currentZoomScale,
          timelineWrapperElement
        );
        
        // 拡張後、ヘッダーのスクロール位置を再同期
        if (expanded && timelineHeaderWrapperElement) {
          timelineHeaderWrapperElement.scrollLeft = timelineWrapperElement.scrollLeft;
        }
      }
      
      // 縦スクロール: ツリーと同期
      if (timelineWrapperElement && treeWrapperElement) {
        const scrollTop = timelineWrapperElement.scrollTop;
        if (treeWrapperElement.scrollTop !== scrollTop) {
          treeWrapperElement.scrollTop = scrollTop;
        }
      }
    } finally {
      setTimeout(() => { isScrolling = false; }, 0);
    }
  }
  
  /**
   * ツリーの縦スクロールとタイムラインを同期
   */
  function handleTreeScroll(_event: Event) {
    if (isScrolling) return;
    isScrolling = true;
    
    try {
      if (timelineWrapperElement && treeWrapperElement) {
        const scrollTop = treeWrapperElement.scrollTop;
        if (timelineWrapperElement.scrollTop !== scrollTop) {
          timelineWrapperElement.scrollTop = scrollTop;
        }
      }
    } finally {
      setTimeout(() => { isScrolling = false; }, 0);
    }
  }
  
  /**
   * ヘッダーの横スクロールとタイムラインを同期
   */
  function handleHeaderScroll(_event: Event) {
    if (isScrolling) return;
    isScrolling = true;
    
    try {
      if (timelineWrapperElement && timelineHeaderWrapperElement) {
        const scrollLeft = timelineHeaderWrapperElement.scrollLeft;
        if (timelineWrapperElement.scrollLeft !== scrollLeft) {
          timelineWrapperElement.scrollLeft = scrollLeft;
        }
      }
    } finally {
      setTimeout(() => { isScrolling = false; }, 0);
    }
  }
  
  /**
   * 右クリックドラッグでスクロール
   */
  let panState: {
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null = null;
  
  function handleMouseDown(event: MouseEvent) {
    // 右クリック（button = 2）でパン開始
    if (event.button !== 2) return;
    
    event.preventDefault();
    
    if (!timelineWrapperElement) return;
    
    panState = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: timelineWrapperElement.scrollLeft,
      scrollTop: timelineWrapperElement.scrollTop
    };
    
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
    window.addEventListener('contextmenu', preventContextMenu);
  }
  
  function handleContextMenu(event: MouseEvent) {
    // コンテキストメニューを防止
    event.preventDefault();
  }
  
  function handlePanMove(event: MouseEvent) {
    if (!panState || !timelineWrapperElement) return;
    
    // 右クリックボタン(buttons bit 2)が押されていない場合は終了
    if ((event.buttons & 2) === 0) {
      handlePanEnd();
      return;
    }
    
    event.preventDefault();
    
    const deltaX = event.clientX - panState.startX;
    const deltaY = event.clientY - panState.startY;
    
    // スクロール同期フラグを一時的に無効化
    isScrolling = true;
    timelineWrapperElement.scrollLeft = panState.scrollLeft - deltaX;
    timelineWrapperElement.scrollTop = panState.scrollTop - deltaY;
    isScrolling = false;
  }
  
  function handlePanEnd() {
    panState = null;
    window.removeEventListener('mousemove', handlePanMove);
    window.removeEventListener('mouseup', handlePanEnd);
    setTimeout(() => {
      window.removeEventListener('contextmenu', preventContextMenu);
    }, 100);
  }
  
  function preventContextMenu(event: MouseEvent) {
    event.preventDefault();
  }
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
  
  <!-- Tick定義エディタ切り替えボタン -->
  <button
    class="{classPrefix}-toggle-tick-editor-btn"
    on:click={toggleTickEditor}
    title={showTickEditor ? 'Tick Editorを非表示' : 'Tick Editorを表示'}
  >
    {showTickEditor ? '⚙' : '⚙'}
  </button>
  
  
  <div class="{classPrefix}-layout">
    <!-- 左ペイン: ツリー -->
    {#if showTreePane}
      <div class="{classPrefix}-left-pane">
        <div 
          class="{classPrefix}-tree-header"
          style="width: {chartConfig.treePaneWidth}px; height: 60px;"
        >
          <span class="{classPrefix}-tree-header-label">タスク</span>
        </div>
        <div 
          class="{classPrefix}-tree-wrapper"
          bind:this={treeWrapperElement}
          on:scroll={handleTreeScroll}
          on:mousedown={handleMouseDown}
          on:contextmenu={handleContextMenu}
          role="region"
          aria-label="ガントチャートツリービュー"
        >
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
      <div 
        class="{classPrefix}-timeline-header-wrapper"
        bind:this={timelineHeaderWrapperElement}
        on:scroll={handleHeaderScroll}
        on:mousedown={handleMouseDown}
        on:contextmenu={handleContextMenu}
        role="region"
        aria-label="ガントチャートタイムラインヘッダー"
      >
        <GanttHeader
          dateRange={extendedDateRange}
          dayWidth={chartConfig.dayWidth}
          {classPrefix}
          zoomScale={currentZoomScale}
        />
      </div>
      <div 
        class="{classPrefix}-timeline-wrapper"
        bind:this={timelineWrapperElement}
        on:scroll={handleTimelineScroll}
        on:mousedown={handleMouseDown}
        on:contextmenu={handleContextMenu}
        role="region"
        aria-label="ガントチャートタイムライン"
      >
        <GanttTimeline
          {visibleNodes}
          dateRange={extendedDateRange}
          dayWidth={chartConfig.dayWidth}
          rowHeight={chartConfig.rowHeight}
          dragSnapDivision={chartConfig.dragSnapDivision}
          {classPrefix}
          renderLifecycle={lifecycle}
          onBarClick={handleBarClick}
          onBarDrag={handleBarDrag}
          onGroupDrag={handleGroupDrag}
          onAutoAdjustSection={handleAutoAdjustSection}
          onZoomChange={handleTimelineZoom}
        />
      </div>
    </div>
    
    <!-- Tick定義エディタパネル -->
    {#if showTickEditor}
      <div class="{classPrefix}-tick-editor-pane">
        <div class="{classPrefix}-tick-editor-header">
          <span class="{classPrefix}-tick-editor-label">Tick Definitions</span>
        </div>
        <div class="{classPrefix}-tick-editor-wrapper">
          <div class="{classPrefix}-tick-info">
            <small>Current Scale: {currentZoomScale.toFixed(2)} | Active Index: {currentTickIndex}</small>
          </div>
          <div class="{classPrefix}-tick-list">
            {#each tickDefinitions as tick, i}
              <div class="{classPrefix}-tick-item" class:active={i === currentTickIndex}>
                <div class="{classPrefix}-tick-header">
                  <strong>{tick.label}</strong>
                  <button class="{classPrefix}-edit-btn" on:click={() => startEditTick(i)}>Edit</button>
                </div>
                <div class="{classPrefix}-tick-details">
                  <div>minScale: {tick.minScale}</div>
                  <div>Major: {tick.majorUnit} / {tick.majorFormat}</div>
                  <div>Minor: {tick.minorUnit} / {tick.minorFormat}</div>
                  <div>Minor Interval: {formatDurationForUI(tick.minorInterval)}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Tick Edit Modal -->
  {#if editingTick}
    <div class="{classPrefix}-modal-backdrop" on:click={cancelEditTick}>
      <div class="{classPrefix}-modal-content" on:click|stopPropagation>
        <h3>Edit Tick Definition</h3>
        <div class="{classPrefix}-form-group">
          <label>
            Label:
            <input type="text" bind:value={editingTick.def.label} />
          </label>
        </div>
        <div class="{classPrefix}-form-group">
          <label>
            Min Scale:
            <input type="number" step="0.1" bind:value={editingTick.def.minScale} />
          </label>
        </div>
        <div class="{classPrefix}-form-group">
          <label>
            Major Unit:
            <select bind:value={editingTick.def.majorUnit}>
              <option value="year">year</option>
              <option value="month">month</option>
              <option value="week">week</option>
              <option value="day">day</option>
            </select>
          </label>
        </div>
        <div class="{classPrefix}-form-group">
          <label>
            Major Format:
            <input type="text" bind:value={editingTick.def.majorFormat} />
          </label>
        </div>
        <div class="{classPrefix}-form-group">
          <label>
            Minor Unit:
            <select bind:value={editingTick.def.minorUnit}>
              <option value="month">month</option>
              <option value="week">week</option>
              <option value="day">day</option>
              <option value="hour">hour</option>
            </select>
          </label>
        </div>
        <div class="{classPrefix}-form-group">
          <label>
            Minor Format:
            <input type="text" bind:value={editingTick.def.minorFormat} />
          </label>
        </div>
        <div class="{classPrefix}-form-group">
          <label>
            Minor Interval (e.g., "1 day", "3 hours", "2 weeks"):
            <input 
              type="text" 
              value={formatDurationForUI(editingTick.def.minorInterval)}
              on:input={(e) => {
                if (editingTick) {
                  editingTick.def.minorInterval = parseDurationString(e.currentTarget.value);
                }
              }}
            />
          </label>
        </div>
        <div class="{classPrefix}-modal-actions">
          <button on:click={saveEditTick}>Save</button>
          <button on:click={cancelEditTick}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.gantt-container) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    border: 1px solid #ddd;
    background: white;
    overflow: hidden;
    position: relative;
    height: 600px; /* デフォルトの高さを設定 */
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
  
  :global(.gantt-toggle-tick-editor-btn) {
    position: absolute;
    top: 8px;
    right: 120px;
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
    font-size: 16px;
    transition: background 0.2s;
  }
  
  :global(.gantt-toggle-tick-editor-btn:hover) {
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
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }
  
  :global(.gantt-tree-wrapper::-webkit-scrollbar) {
    display: none; /* Chrome/Safari */
  }
  
  :global(.gantt-right-pane) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  :global(.gantt-tick-editor-pane) {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    width: 320px;
    border-left: 1px solid #ddd;
  }
  
  :global(.gantt-tick-editor-header) {
    border-bottom: 2px solid #ddd;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    padding: 0 16px;
    font-weight: 600;
    box-sizing: border-box;
    height: 60px;
  }
  
  :global(.gantt-tick-editor-wrapper) {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: #f9f9f9;
  }
  
  :global(.gantt-tick-info) {
    margin-bottom: 12px;
    padding: 8px;
    background: #e3f2fd;
    border-radius: 4px;
  }
  
  :global(.gantt-tick-info small) {
    font-size: 12px;
    color: #1976d2;
    font-weight: 600;
  }
  
  :global(.gantt-tick-list) {
    display: grid;
    gap: 12px;
  }
  
  :global(.gantt-tick-item) {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 12px;
    transition: all 0.2s;
  }
  
  :global(.gantt-tick-item.active) {
    background: #e8f5e9;
    border: 2px solid #4caf50;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
  }
  
  :global(.gantt-tick-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  :global(.gantt-tick-header strong) {
    font-size: 14px;
    color: #333;
  }
  
  :global(.gantt-edit-btn) {
    padding: 4px 12px;
    font-size: 12px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  :global(.gantt-edit-btn:hover) {
    background: #357abd;
  }
  
  :global(.gantt-tick-details) {
    font-size: 12px;
    color: #666;
    display: grid;
    gap: 4px;
  }
  
  :global(.gantt-timeline-header-wrapper) {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }
  
  :global(.gantt-timeline-header-wrapper::-webkit-scrollbar) {
    display: none; /* Chrome/Safari */
  }
  
  :global(.gantt-timeline-wrapper) {
    flex: 1;
    overflow: auto;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }
  
  :global(.gantt-timeline-wrapper::-webkit-scrollbar) {
    display: none; /* Chrome/Safari */
  }
  
  /* スクロールバー同期スタイリング */
  :global(.gantt-tree-wrapper),
  :global(.gantt-timeline-wrapper) {
    scrollbar-width: thin;
  }
  
  /* Modal */
  :global(.gantt-modal-backdrop) {
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
  
  :global(.gantt-modal-content) {
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  :global(.gantt-modal-content h3) {
    margin: 0 0 20px 0;
    font-size: 18px;
    color: #333;
  }
  
  :global(.gantt-form-group) {
    margin-bottom: 16px;
  }
  
  :global(.gantt-form-group label) {
    display: block;
    font-size: 14px;
    color: #333;
    margin-bottom: 6px;
  }
  
  :global(.gantt-form-group input),
  :global(.gantt-form-group select) {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
  }
  
  :global(.gantt-modal-actions) {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }
  
  :global(.gantt-modal-actions button) {
    padding: 8px 16px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  :global(.gantt-modal-actions button:hover) {
    background: #357abd;
  }
</style>
