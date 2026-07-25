/**
 * タスクバーの状態解決（tentative・done の描き分け判定）
 *
 * Svelte依存なし - 独立してテスト可能
 *
 * 優先順位: done が tentative に優先する（完了した仮予定は「終わった事実」が勝つ）。
 * done は completed（既存フィールド）と status === 'done'（新フィールド）のいずれでも成立する。
 */

export interface TaskBarStyleInput {
  completed?: boolean;
  status?: string;
  tentative?: boolean;
}

export interface TaskBarStyleState {
  /** 完了扱いかどうか（completed または status==='done'） */
  isDone: boolean;
  /** 仮置き表示（?バッジ＋半透明）を適用するかどうか。done の場合は常に false */
  isTentative: boolean;
}

/**
 * ノードの completed / status / tentative から、バーの描画状態を解決する
 *
 * @param node - 判定対象のフィールドを持つノード
 * @returns isDone / isTentative の解決結果
 */
export function resolveTaskBarStyle(node: TaskBarStyleInput): TaskBarStyleState {
  const isDone = node.completed === true || node.status === 'done';
  const isTentative = !!node.tentative && !isDone;
  return { isDone, isTentative };
}
