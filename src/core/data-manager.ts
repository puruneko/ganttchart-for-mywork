/**
 * コアデータ管理ロジック
 *
 * 責務:
 * - フラットなノードリストから階層構造を構築
 * - 折り畳み状態に基づいて可視性を計算
 * - イミュータブル（不変）な操作を提供
 * - Svelte依存なし（純粋TypeScript）
 */

import type { GanttNode, ComputedGanttNode, DateRange } from "../types"
import { DateTime } from "luxon"

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
    const map = new Map<string, string[]>()

    for (const node of nodes) {
        const parentId = node.parentId ?? "root"
        if (!map.has(parentId)) {
            map.set(parentId, [])
        }
        map.get(parentId)!.push(node.id)
    }

    return map
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
    const map = new Map<string, GanttNode>()
    for (const node of nodes) {
        map.set(node.id, node)
    }
    return map
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
    cache: Map<string, number> = new Map(),
): number {
    if (cache.has(nodeId)) {
        return cache.get(nodeId)!
    }

    const node = nodeMap.get(nodeId)
    if (!node) return 0

    if (node.parentId === null) {
        cache.set(nodeId, 0)
        return 0
    }

    const depth = 1 + calculateDepth(node.parentId, nodeMap, cache)
    cache.set(nodeId, depth)
    return depth
}

/**
 * computeNodes / isNodeVisible の可視性計算オプション
 */
export interface ComputeNodesOptions {
    /**
     * 期間（start/end）未設定のサブタスク行（type: 'task'）を表示するかどうか。
     * デフォルト: true（従来どおり表示）。false の場合は可視ノードから除外する（issue #0021）。
     */
    showUnscheduledSubtasks?: boolean
}

/**
 * ノードが表示されるべきかチェック（すべての祖先が展開されているか）
 *
 * ノードは以下の場合に表示される:
 * - ルートノードである
 * - すべての祖先ノードが展開されている（isCollapsed === false または undefined）
 *
 * 親ノードが1つでも折り畳まれていれば、このノードは非表示となる。
 * また、`options.showUnscheduledSubtasks` が false の場合、期間未設定の
 * type: 'task' ノードはそれ自体が非表示となる（issue #0021）。
 *
 * @param nodeId - チェックするノードのID
 * @param nodeMap - ノードマップ（高速検索用）
 * @param options - 可視性計算オプション
 * @returns ノードが表示されるべきかどうか
 */
export function isNodeVisible(
    nodeId: string,
    nodeMap: Map<string, GanttNode>,
    options: ComputeNodesOptions = {},
): boolean {
    const node = nodeMap.get(nodeId)
    if (!node) return false

    // 期間未設定サブタスク行の表示可否（issue #0021）
    if (
        options.showUnscheduledSubtasks === false &&
        node.type === "task" &&
        (!node.start || !node.end)
    ) {
        return false
    }

    // ルートノードは常に表示
    if (node.parentId === null) return true

    const parent = nodeMap.get(node.parentId)
    if (!parent) return true // 孤立ノード - 表示する

    // 親が折り畳まれていれば、このノードは非表示
    if (parent.isCollapsed === true) return false

    // 親の可視性を再帰的にチェック
    return isNodeVisible(node.parentId, nodeMap, options)
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
 * @param options - 可視性計算オプション（showUnscheduledSubtasks 等）
 * @returns 計算済みメタデータを含むノード配列（表示順）
 */
export function computeNodes(
    nodes: GanttNode[],
    options: ComputeNodesOptions = {},
): ComputedGanttNode[] {
    const nodeMap = buildNodeMap(nodes)
    const hierarchyMap = buildHierarchyMap(nodes)
    const depthCache = new Map<string, number>()
    const result: ComputedGanttNode[] = []

    // 親の開始日時を取得（未設定タスク用）
    function getParentStartDate(nodeId: string): DateTime | undefined {
        const node = nodeMap.get(nodeId)
        if (!node || !node.parentId) return undefined

        const parent = nodeMap.get(node.parentId)
        if (!parent) return undefined

        return parent.start ?? getParentStartDate(node.parentId)
    }

    // ルートノードから深さ優先探索
    function traverse(nodeId: string) {
        const node = nodeMap.get(nodeId)
        if (!node) return

        const depth = calculateDepth(nodeId, nodeMap, depthCache)
        const visible = isNodeVisible(nodeId, nodeMap, options)
        const childrenIds = hierarchyMap.get(nodeId) ?? []

        // 日時未設定の処理
        const isDateUnset = !node.start || !node.end
        let start: DateTime
        let end: DateTime

        if (isDateUnset) {
            // 親の開始日時から設定（親も未設定なら現在日時）
            const parentStart = getParentStartDate(nodeId)
            start = parentStart ?? DateTime.now().startOf("day")
            // 終了日は開始日の1日後（1セル分）
            end = start.plus({ days: 1 })
        } else {
            start = node.start!
            end = node.end!
        }

        const computed: ComputedGanttNode = {
            ...node,
            start,
            end,
            depth,
            isVisible: visible,
            visualIndex: -1, // 後で設定
            childrenIds,
            isDateUnset,
        }

        result.push(computed)

        // 子要素を探索
        for (const childId of childrenIds) {
            traverse(childId)
        }
    }

    // ルートノードから開始
    const rootIds = hierarchyMap.get("root") ?? []
    for (const rootId of rootIds) {
        traverse(rootId)
    }

    // 表示されるノードに視覚的インデックスを割り当て
    let visualIndex = 0
    for (const node of result) {
        if (node.isVisible) {
            node.visualIndex = visualIndex++
        }
    }

    return result
}

/**
 * 表示されるノードのみを取得（表示順）
 *
 * computeNodes()で計算されたノードから、isVisibleがtrueのものだけをフィルタリング。
 *
 * @param computedNodes - 計算済みノード配列
 * @returns 表示されるノードのみの配列
 */
export function getVisibleNodes(
    computedNodes: ComputedGanttNode[],
): ComputedGanttNode[] {
    return computedNodes.filter((node) => node.isVisible)
}

/**
 * ノードの milestone（due）が持つ日時をすべて列挙する
 *
 * 一点なら1件、期間なら start/end の2件を返す。
 */
function collectMilestoneDates(node: GanttNode): DateTime[] {
    if (!node.milestone) return []
    if ("start" in node.milestone && "end" in node.milestone) {
        return [node.milestone.start, node.milestone.end]
    }
    return [node.milestone as DateTime]
}

/**
 * チャート全体の日付範囲を計算
 *
 * すべてのノードの開始日・終了日から、最小開始日と最大終了日を見つける。
 * plan・milestone（due）の日時も算入する（issue-gantt-phase004-002/003）。
 * 含め漏れると「データはあるのに画面外で見えない」事故になるため必ず含める。
 * 余白として終了日の翌日まで含める。
 * ノードが空の場合は、現在日から30日間をデフォルトとする。
 *
 * @param nodes - ノード配列
 * @returns タイムライン全体の日付範囲
 */
export function calculateDateRange(nodes: GanttNode[]): DateRange {
    if (nodes.length === 0) {
        const now = DateTime.now().startOf("day")
        return {
            start: now,
            end: now.plus({ days: 30 }),
        }
    }

    // すべてのノードから、範囲計算に使う日時（start/end/plan/milestone）を集める
    const allDates: DateTime[] = []
    for (const node of nodes) {
        if (node.start && node.end) {
            allDates.push(node.start, node.end)
        }
        if (node.plan) {
            allDates.push(node.plan.start, node.plan.end)
        }
        allDates.push(...collectMilestoneDates(node))
    }

    if (allDates.length === 0) {
        const now = DateTime.now().startOf("day")
        return {
            start: now,
            end: now.plus({ days: 30 }),
        }
    }

    let minStart = allDates[0]
    let maxEnd = allDates[0]

    for (const date of allDates) {
        if (date < minStart) minStart = date
        if (date > maxEnd) maxEnd = date
    }

    // 余白を追加(15日ずつ)
    return {
        start: minStart.startOf("day").plus({ days: -15 }).startOf("day"),
        end: maxEnd.endOf("day").plus({ days: 15 }).startOf("day"),
    }
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
    nodeId: string,
): GanttNode[] {
    return nodes.map((node) => {
        if (node.id === nodeId) {
            return {
                ...node,
                isCollapsed: !node.isCollapsed,
            }
        }
        return node
    })
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
    updates: Partial<GanttNode>,
): GanttNode[] {
    return nodes.map((node) => {
        if (node.id === nodeId) {
            return { ...node, ...updates }
        }
        return node
    })
}

/**
 * セクション/サブセクションの日付を配下のタスクに合わせて自動調整（イミュータブル操作）
 *
 * 指定されたセクション配下のすべての子ノード（再帰的）の開始日・終了日から、
 * 最小開始日と最大終了日を計算し、セクションの日付を更新する。
 * 子ノードがない場合、または日時未設定のノードのみの場合は変更しない。
 *
 * @param nodes - 元のノード配列
 * @param nodeId - 調整するセクション/サブセクションのID
 * @param edge - 調整対象。'start' は開始日のみ、'end' は終了日のみ、'both'（既定）は両方（issue #0026:
 *   左右リサイズハンドルのダブルクリックでそれぞれ片側だけを調整できるようにするため追加）
 * @returns 更新された新しいノード配列
 */
export function autoAdjustSectionDates(
    nodes: GanttNode[],
    nodeId: string,
    edge: "start" | "end" | "both" = "both",
): GanttNode[] {
    const nodeMap = buildNodeMap(nodes)
    const hierarchyMap = buildHierarchyMap(nodes)
    const targetNode = nodeMap.get(nodeId)

    if (!targetNode) return nodes

    // セクション/サブセクション/プロジェクトのみ対象
    if (
        targetNode.type !== "section" &&
        targetNode.type !== "subsection" &&
        targetNode.type !== "project"
    ) {
        return nodes
    }

    // 配下のすべての子孫ノードを取得（再帰的）
    const descendants: GanttNode[] = []

    function collectDescendants(parentId: string) {
        const childIds = hierarchyMap.get(parentId) ?? []
        for (const childId of childIds) {
            const child = nodeMap.get(childId)
            if (child) {
                descendants.push(child)
                collectDescendants(childId)
            }
        }
    }

    collectDescendants(nodeId)

    // 日時が設定されている子孫ノードのみを対象
    const nodesWithDates = descendants.filter((n) => n.start && n.end)

    if (nodesWithDates.length === 0) {
        // 日時が設定されているノードがない場合は変更しない
        return nodes
    }

    // 最小開始日と最大終了日を計算
    let minStart = nodesWithDates[0].start!
    let maxEnd = nodesWithDates[0].end!

    for (const node of nodesWithDates) {
        if (node.start! < minStart) minStart = node.start!
        if (node.end! > maxEnd) maxEnd = node.end!
    }

    // セクションの日付を更新（edge に応じて片側のみ、または両方）。
    // minStart/maxEnd をそのまま使う（.startOf('day')/.endOf('day') は付与しない）。
    // end は本ライブラリ全体で「排他的な境界（次の日の 0 時 = その前日まで含む）」として
    // 扱われており（dateToX/durationToWidth/ドラッグリサイズ等）、.endOf('day')（23:59:59.999）を
    // 適用すると実質的に丸1日分（約1日弱）の余分な期間が計算上・表示上に加算されてしまう
    // （例: end=8/5 00:00 → 8/5 23:59:59.999 で、4日間の予定が約5日間に見えてしまう）。
    const updates: Partial<GanttNode> = {}
    if (edge === "start" || edge === "both") updates.start = minStart
    if (edge === "end" || edge === "both") updates.end = maxEnd

    return updateNode(nodes, nodeId, updates)
}
