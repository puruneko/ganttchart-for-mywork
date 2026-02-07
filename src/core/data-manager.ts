/**
 * コアデータ管理ロジック
 * 
 * 責務:
 * - フラットなノードリストから階層構造を構築
 * - 折り畳み状態に基づいて可視性を計算
 * - イミュータブル（不変）な操作を提供
 * - Svelte依存なし（純粋TypeScript）
 */

import type { GanttNode, ComputedGanttNode, DateRange } from '../types';
import { DateTime } from 'luxon';

/**
 * 親ID → 子IDリストのマップを構築
 * 
 * フラットなノード配列から、親子関係を高速に検索できるMapを作成する。
 * ルートノード（parentId が null）は 'root' キーに格納される。
 * 
 * @param nodes - ノードの配列
 * @returns 親ID（または'root'）をキー、子IDの配列を値とするMap
 */
export function buildHierarchyMap(nodes: GanttNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  
  for (const node of nodes) {
    const parentId = node.parentId ?? 'root';
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId)!.push(node.id);
  }
  
  return map;
}

/**
 * ノードID → ノードのマップを構築（O(1)検索用）
 * 
 * IDによるノード検索を高速化するため、MapオブジェクトでIDをキーとしたインデックスを作成する。
 * 
 * @param nodes - ノードの配列
 * @returns ノードIDをキー、ノードオブジェクトを値とするMap
 */
export function buildNodeMap(nodes: GanttNode[]): Map<string, GanttNode> {
  const map = new Map<string, GanttNode>();
  for (const node of nodes) {
    map.set(node.id, node);
  }
  return map;
}

/**
 * 階層内のノードの深さを計算
 * 
 * ルートノード（parentId が null）の深さは0。
 * 子ノードの深さは親の深さ + 1。
 * 再帰的に計算し、結果をキャッシュして効率化する。
 * 
 * @param nodeId - 深さを計算するノードのID
 * @param nodeMap - ノードマップ（高速検索用）
 * @param cache - 計算結果のキャッシュ（再計算を避けるため）
 * @returns ノードの深さ（0始まり）
 */
export function calculateDepth(
  nodeId: string,
  nodeMap: Map<string, GanttNode>,
  cache: Map<string, number> = new Map()
): number {
  if (cache.has(nodeId)) {
    return cache.get(nodeId)!;
  }
  
  const node = nodeMap.get(nodeId);
  if (!node) return 0;
  
  if (node.parentId === null) {
    cache.set(nodeId, 0);
    return 0;
  }
  
  const depth = 1 + calculateDepth(node.parentId, nodeMap, cache);
  cache.set(nodeId, depth);
  return depth;
}

/**
 * ノードが表示されるべきかチェック（すべての祖先が展開されているか）
 * 
 * ノードは以下の場合に表示される:
 * - ルートノードである
 * - すべての祖先ノードが展開されている（isCollapsed === false または undefined）
 * 
 * 親ノードが1つでも折り畳まれていれば、このノードは非表示となる。
 * 
 * @param nodeId - チェックするノードのID
 * @param nodeMap - ノードマップ（高速検索用）
 * @returns ノードが表示されるべきかどうか
 */
export function isNodeVisible(
  nodeId: string,
  nodeMap: Map<string, GanttNode>
): boolean {
  const node = nodeMap.get(nodeId);
  if (!node) return false;
  
  // ルートノードは常に表示
  if (node.parentId === null) return true;
  
  const parent = nodeMap.get(node.parentId);
  if (!parent) return true; // 孤立ノード - 表示する
  
  // 親が折り畳まれていれば、このノードは非表示
  if (parent.isCollapsed === true) return false;
  
  // 親の可視性を再帰的にチェック
  return isNodeVisible(node.parentId, nodeMap);
}

/**
 * すべてのノードの完全なメタデータを計算
 * 
 * 深さ優先探索（DFS）により、表示順序でノードを並べ替える。
 * 各ノードに対して以下を計算:
 * - depth: 階層の深さ
 * - isVisible: 表示されるべきか
 * - visualIndex: 表示リスト内のインデックス
 * - childrenIds: 直接の子要素のIDリスト
 * - start/end: 未設定の場合は親から計算
 * - isDateUnset: 元のデータで日時が未設定だったか
 * 
 * @param nodes - 元のノード配列
 * @returns 計算済みメタデータを含むノード配列（表示順）
 */
export function computeNodes(nodes: GanttNode[]): ComputedGanttNode[] {
  const nodeMap = buildNodeMap(nodes);
  const hierarchyMap = buildHierarchyMap(nodes);
  const depthCache = new Map<string, number>();
  const result: ComputedGanttNode[] = [];
  
  // 親の開始日時を取得（未設定タスク用）
  function getParentStartDate(nodeId: string): DateTime | undefined {
    const node = nodeMap.get(nodeId);
    if (!node || !node.parentId) return undefined;
    
    const parent = nodeMap.get(node.parentId);
    if (!parent) return undefined;
    
    return parent.start ?? getParentStartDate(node.parentId);
  }
  
  // ルートノードから深さ優先探索
  function traverse(nodeId: string) {
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    const depth = calculateDepth(nodeId, nodeMap, depthCache);
    const visible = isNodeVisible(nodeId, nodeMap);
    const childrenIds = hierarchyMap.get(nodeId) ?? [];
    
    // 日時未設定の処理
    const isDateUnset = !node.start || !node.end;
    let start: DateTime;
    let end: DateTime;
    
    if (isDateUnset) {
      // 親の開始日時から設定（親も未設定なら現在日時）
      const parentStart = getParentStartDate(nodeId);
      start = parentStart ?? DateTime.now().startOf('day');
      // 終了日は開始日の1日後（1セル分）
      end = start.plus({ days: 1 });
    } else {
      start = node.start!;
      end = node.end!;
    }
    
    const computed: ComputedGanttNode = {
      ...node,
      start,
      end,
      depth,
      isVisible: visible,
      visualIndex: -1, // 後で設定
      childrenIds,
      isDateUnset
    };
    
    result.push(computed);
    
    // 子要素を探索
    for (const childId of childrenIds) {
      traverse(childId);
    }
  }
  
  // ルートノードから開始
  const rootIds = hierarchyMap.get('root') ?? [];
  for (const rootId of rootIds) {
    traverse(rootId);
  }
  
  // 表示されるノードに視覚的インデックスを割り当て
  let visualIndex = 0;
  for (const node of result) {
    if (node.isVisible) {
      node.visualIndex = visualIndex++;
    }
  }
  
  return result;
}

/**
 * 表示されるノードのみを取得（表示順）
 * 
 * computeNodes()で計算されたノードから、isVisibleがtrueのものだけをフィルタリング。
 * 
 * @param computedNodes - 計算済みノード配列
 * @returns 表示されるノードのみの配列
 */
export function getVisibleNodes(computedNodes: ComputedGanttNode[]): ComputedGanttNode[] {
  return computedNodes.filter(node => node.isVisible);
}

/**
 * チャート全体の日付範囲を計算
 * 
 * すべてのノードの開始日・終了日から、最小開始日と最大終了日を見つける。
 * 余白として終了日の翌日まで含める。
 * ノードが空の場合は、現在日から30日間をデフォルトとする。
 * 
 * @param nodes - ノード配列
 * @returns タイムライン全体の日付範囲
 */
export function calculateDateRange(nodes: GanttNode[]): DateRange {
  if (nodes.length === 0) {
    const now = DateTime.now().startOf('day');
    return {
      start: now,
      end: now.plus({ days: 30 })
    };
  }
  
  // 日時が設定されているノードのみを対象
  const nodesWithDates = nodes.filter(n => n.start && n.end);
  
  if (nodesWithDates.length === 0) {
    const now = DateTime.now().startOf('day');
    return {
      start: now,
      end: now.plus({ days: 30 })
    };
  }
  
  let minStart = nodesWithDates[0].start!;
  let maxEnd = nodesWithDates[0].end!;
  
  for (const node of nodesWithDates) {
    if (node.start! < minStart) minStart = node.start!;
    if (node.end! > maxEnd) maxEnd = node.end!;
  }
  
  // 余白を追加
  return {
    start: minStart.startOf('day'),
    end: maxEnd.endOf('day').plus({ days: 1 }).startOf('day')
  };
}

/**
 * ノードの折り畳み状態を切り替え（イミュータブル操作）
 * 
 * 指定されたノードのisCollapsed状態を反転する。
 * 元の配列は変更せず、新しい配列を返す（不変性を保つ）。
 * 
 * @param nodes - 元のノード配列
 * @param nodeId - 切り替えるノードのID
 * @returns 更新された新しいノード配列
 */
export function toggleNodeCollapse(
  nodes: GanttNode[],
  nodeId: string
): GanttNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return {
        ...node,
        isCollapsed: !node.isCollapsed
      };
    }
    return node;
  });
}

/**
 * 特定のノードを更新（イミュータブル操作）
 * 
 * 指定されたノードに対して、部分的な更新を適用する。
 * 元の配列は変更せず、新しい配列を返す（不変性を保つ）。
 * 
 * @param nodes - 元のノード配列
 * @param nodeId - 更新するノードのID
 * @param updates - 更新する値（部分的なGanttNodeオブジェクト）
 * @returns 更新された新しいノード配列
 */
export function updateNode(
  nodes: GanttNode[],
  nodeId: string,
  updates: Partial<GanttNode>
): GanttNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    return node;
  });
}
