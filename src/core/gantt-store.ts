/**
 * ガントチャート用の状態管理
 * 
 * Svelte 5移行を考慮した設計:
 * - writable storeを使用（$state runeに簡単に変換可能）
 * - 暗黙的リアクティビティではなく明示的な更新関数
 * - ライフサイクル依存なし
 * - Svelteコンポーネント外でも使用可能
 */

import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import type { GanttNode, ComputedGanttNode, GanttConfig, DateRange } from '../types';
import {
  computeNodes,
  getVisibleNodes,
  calculateDateRange,
  toggleNodeCollapse
} from './data-manager';

/**
 * デフォルト設定
 * 
 * ガントチャートのデフォルト動作と見た目を定義。
 * ユーザーが設定を省略した場合にこれらの値が使用される。
 */
const DEFAULT_CONFIG: Required<GanttConfig> = {
  mode: 'controlled',
  rowHeight: 40,
  dayWidth: 30,
  treePaneWidth: 300,
  indentSize: 20,
  classPrefix: 'gantt'
};

/**
 * ガントチャート状態管理用のストアファクトリー
 * 
 * このパターンにより以下が可能:
 * 1. 複数の独立したインスタンスを作成可能
 * 2. Svelteコンテキストなしで簡単にテスト可能
 * 3. 将来のRune移行が容易（storeを$stateに置換）
 * 
 * @param initialNodes - 初期ノード配列
 * @param initialConfig - 初期設定（部分的に指定可能）
 * @returns ストアオブジェクトとアクション関数
 */
export function createGanttStore(
  initialNodes: GanttNode[],
  initialConfig: Partial<GanttConfig> = {}
) {
  // ベースストア
  const nodes: Writable<GanttNode[]> = writable(initialNodes);
  const config: Writable<Required<GanttConfig>> = writable({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });
  
  // 派生計算値
  // これらはSvelte 5で$derivedに簡単に変換可能
  const computedNodes: Readable<ComputedGanttNode[]> = derived(
    nodes,
    $nodes => computeNodes($nodes)
  );
  
  const visibleNodes: Readable<ComputedGanttNode[]> = derived(
    computedNodes,
    $computed => getVisibleNodes($computed)
  );
  
  const dateRange: Readable<DateRange> = derived(
    nodes,
    $nodes => calculateDateRange($nodes)
  );
  
  // アクション（純粋関数、副作用なし）
  
  /**
   * ノードを設定
   * 
   * 新しいノード配列でストアを更新。
   * Controlledモードで外部からデータを渡す際に使用。
   * 
   * @param newNodes - 新しいノード配列
   */
  function setNodes(newNodes: GanttNode[]) {
    nodes.set(newNodes);
  }
  
  /**
   * 設定を更新
   * 
   * 部分的な設定変更を既存の設定にマージ。
   * 
   * @param updates - 更新する設定項目（部分的に指定可能）
   */
  function updateConfig(updates: Partial<GanttConfig>) {
    config.update(current => ({ ...current, ...updates }));
  }
  
  /**
   * 折り畳み状態を切り替え
   * 
   * Uncontrolledモードの場合のみ内部状態を更新。
   * Controlledモードでは新しいノード配列を返すだけで、
   * 実際の更新は外部で行う。
   * 
   * @param nodeId - 切り替えるノードのID
   * @returns 更新された新しいノード配列（イベント通知用）
   */
  function toggleCollapse(nodeId: string): GanttNode[] {
    const currentNodes = get(nodes);
    const newNodes = toggleNodeCollapse(currentNodes, nodeId);
    
    // Uncontrolledモードの場合のみ更新
    const currentConfig = get(config);
    if (currentConfig.mode === 'uncontrolled') {
      nodes.set(newNodes);
    }
    
    return newNodes; // イベント通知用に返す
  }
  
  /**
   * IDでノードを取得
   * 
   * 指定されたIDを持つノードを検索。
   * 
   * @param nodeId - 検索するノードのID
   * @returns 見つかったノード、または undefined
   */
  function getNodeById(nodeId: string): GanttNode | undefined {
    const currentNodes = get(nodes);
    return currentNodes.find(n => n.id === nodeId);
  }
  
  return {
    // 読み取り専用ストア（購読可能）
    nodes: { subscribe: nodes.subscribe },
    config: { subscribe: config.subscribe },
    computedNodes: { subscribe: computedNodes.subscribe },
    visibleNodes: { subscribe: visibleNodes.subscribe },
    dateRange: { subscribe: dateRange.subscribe },
    
    // アクション関数
    setNodes,
    updateConfig,
    toggleCollapse,
    getNodeById,
    
    // テストと外部アクセス用（プライベートメソッド）
    _getRawNodes: () => get(nodes),
    _getConfig: () => get(config)
  };
}

/**
 * ガントストアの型定義
 * 
 * createGanttStore関数の戻り値の型。
 * TypeScriptの型推論により自動的に正確な型が得られる。
 */
export type GanttStore = ReturnType<typeof createGanttStore>;
