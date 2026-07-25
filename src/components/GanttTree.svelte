<script lang="ts">
  /**
   * ツリーペインコンポーネント - 階層的なノードリストを表示
   * 
   * Svelte 5対応:
   * - 明示的なprops
   * - 外部状態へのリアクティブ依存なし
   * - イベントはpropsとして渡される
   */
  
  import type { ComputedGanttNode } from '../types';
  import type { YAxisWindow } from '../utils/virtual-scroll';
  
  // Props
  /** 表示される（可視な）ノードの配列 */
  export let visibleNodes: ComputedGanttNode[];
  /** 各行の高さ（ピクセル） */
  export let rowHeight: number;
  /** 階層レベルごとのインデント幅（ピクセル） */
  export let indentSize: number;
  /** ツリーペインの幅（ピクセル） */
  export let treePaneWidth: number;
  /** CSSクラスのプレフィックス */
  export let classPrefix: string;
  /** ノード名クリック時のハンドラー */
  export let onNameClick: ((node: ComputedGanttNode, event: MouseEvent) => void) | undefined = undefined;
  /** 折り畳み切り替え時のハンドラー */
  export let onToggleCollapse: ((nodeId: string) => void) | undefined = undefined;
  /** Y 軸仮想スクロールウィンドウ */
  export let yWindow: YAxisWindow | undefined = undefined;

  // Y 軸仮想スクロール: ウィンドウ内の行だけにスライス
  $: windowedNodes = yWindow
    ? visibleNodes.slice(yWindow.startIndex, yWindow.endIndex + 1)
    : visibleNodes;
  
  /**
   * ノード名クリックハンドラー
   */
  function handleNameClick(node: ComputedGanttNode, event: MouseEvent) {
    if (onNameClick) {
      onNameClick(node, event);
    }
  }
  
  /**
   * 折り畳みトグルクリックハンドラー
   * イベントの伝播を止めて、親要素のクリックイベントを防ぐ
   */
  function handleToggleClick(node: ComputedGanttNode, event: MouseEvent) {
    event.stopPropagation();
    if (onToggleCollapse) {
      onToggleCollapse(node.id);
    }
  }
  
  /**
   * ノードが子要素を持つかチェック
   */
  function hasChildren(node: ComputedGanttNode): boolean {
    return node.childrenIds.length > 0;
  }
  
  /**
   * 階層の深さに応じたインデントスタイルを取得
   */
  function getIndentStyle(depth: number): string {
    return `padding-left: ${depth * indentSize}px;`;
  }
</script>

<div
  class="{classPrefix}-tree"
  style="width: {treePaneWidth}px; {yWindow ? `min-height: ${yWindow.totalHeight}px;` : ''}"
>
  <!-- Y 軸仮想スクロール: 上部スペーサー -->
  {#if yWindow && yWindow.offsetY > 0}
    <div style="height: {yWindow.offsetY}px;" aria-hidden="true"></div>
  {/if}

  {#each windowedNodes as node (node.id)}
    <div
      class="{classPrefix}-tree-row {classPrefix}-tree-row--{node.type}"
      style="height: {rowHeight}px; {getIndentStyle(node.depth)}"
      data-node-id={node.id}
      data-depth={node.depth}
    >
      <div class="{classPrefix}-tree-row-content">
        {#if hasChildren(node)}
          <button
            class="{classPrefix}-toggle"
            class:collapsed={node.isCollapsed}
            on:click={(e) => handleToggleClick(node, e)}
            aria-label={node.isCollapsed ? '展開' : '折り畳み'}
          >
            {node.isCollapsed ? '▶' : '▼'}
          </button>
        {:else}
          <span class="{classPrefix}-toggle-spacer"></span>
        {/if}

        {#if node.type === 'task'}
          <span
            class="{classPrefix}-node-type-icon {classPrefix}-node-type-icon--task {node.completed ? classPrefix + '-node-type-icon--checked' : ''}"
            aria-hidden="true"
          >
            {#if node.completed}
              <svg class="{classPrefix}-node-type-icon-check" viewBox="0 0 16 16">
                <path d="M3 8.5 L6.5 12 L13 4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            {/if}
          </span>
        {/if}

        <span
          class="{classPrefix}-node-name {node.completed ? classPrefix + '-node-name--completed' : ''}"
          on:click={(e) => handleNameClick(node, e)}
          role="button"
          tabindex="0"
        >
          {node.name}
        </span>
      </div>
    </div>
  {/each}
</div>

<style>
  :global(.gantt-tree) {
    border-right: 1px solid #ddd;
    overflow-y: auto;
    background: #fafafa;
  }
  
  :global(.gantt-tree-row) {
    display: flex;
    align-items: center;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
  }
  
  :global(.gantt-tree-row-content) {
    display: flex;
    align-items: center;
    width: 100%;
  }
  
  :global(.gantt-toggle) {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 12px;
    color: #666;
    flex-shrink: 0;
  }
  
  :global(.gantt-toggle:hover) {
    color: #000;
  }
  
  :global(.gantt-toggle-spacer) {
    width: 28px;
    display: inline-block;
    flex-shrink: 0;
  }

  /* タスク種別アイコン: チェックボックス風（未完了=枠のみ、完了=チェック付き塗りつぶし） */
  :global(.gantt-node-type-icon) {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    margin-right: 6px;
    box-sizing: border-box;
  }

  :global(.gantt-node-type-icon--task) {
    border: 1.5px solid #5ca3f3 !important;
    border-radius: 3px;
    background: transparent !important;
  }

  /* 完了タスク: チェックボックスを塗りつぶしてチェックマークを表示（取消線は使用しない） */
  :global(.gantt-node-type-icon--task.gantt-node-type-icon--checked) {
    background: #95a5a6 !important;
    border-color: #95a5a6 !important;
  }

  :global(.gantt-node-type-icon-check) {
    width: 10px;
    height: 10px;
    pointer-events: none;
  }

  :global(.gantt-node-name) {
    cursor: pointer;
    flex: 1;
    padding: 4px 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #000;
    font-size: var(--gantt-font-size, 14px);
  }

  :global(.gantt-node-name:hover) {
    background: rgba(0, 0, 0, 0.05);
  }

  /* 完了タスク: グレー配色（取消線は使用しない）。ホストページ/テーマ側のCSSに
     上書きされないよう、プレフィックス付きクラス名 + !important を使用する。 */
  :global(.gantt-node-name--completed) {
    color: #999 !important;
  }
  
  :global(.gantt-tree-row--project .gantt-node-name) {
    font-weight: bold;
  }
  
  :global(.gantt-tree-row--section .gantt-node-name) {
    font-weight: 600;
  }
</style>
