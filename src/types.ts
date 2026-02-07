/**
 * ガントチャートライブラリのコア型定義
 * 
 * 設計原則:
 * - 実装との結合を最小限にする
 * - 破壊的変更なしで拡張可能にする
 * - 暗黙的より明示的を優先する
 */

import type { DateTime } from 'luxon';

/**
 * ノードタイプ識別子
 * 
 * ガントチャート内のノードの種類を示す文字列リテラル型。
 * 各タイプは異なる描画スタイルと動作を持つ。
 */
export type GanttNodeType = 'project' | 'section' | 'subsection' | 'task';

/**
 * ガントチャートノードのコアデータ構造
 * 
 * 階層構造における基本単位を表す。
 * ライブラリの観点では全フィールドがイミュータブル（不変）として扱われる。
 * 
 * @property id - 全ノード間で一意な識別子（必須）
 * @property parentId - 親ノードのID。ルートレベルのノードの場合はnull
 * @property type - 描画と動作を決定するノードタイプ
 * @property name - 表示名
 * @property start - 開始日時（luxon DateTimeオブジェクト）
 * @property end - 終了日時（luxon DateTimeオブジェクト）
 * @property isCollapsed - UI状態: このノードの子要素を非表示にするかどうか
 * @property metadata - 任意のメタデータ。ライブラリは無視するが、イベント経由で渡される
 */
export interface GanttNode {
  /** 全ノード間で一意でなければならない識別子 */
  id: string;
  
  /** 親ノードのID - ルートレベルのノードの場合はnull */
  parentId: string | null;
  
  /** 描画と動作を決定するノードタイプ識別子 */
  type: GanttNodeType;
  
  /** 表示名 */
  name: string;
  
  /** 開始日時（luxon DateTimeオブジェクト） */
  start: DateTime;
  
  /** 終了日時（luxon DateTimeオブジェクト） */
  end: DateTime;
  
  /** UI状態: このノードの子要素が非表示かどうか */
  isCollapsed?: boolean;
  
  /** 任意のメタデータ - ライブラリは無視するが、イベント経由で渡される */
  metadata?: Record<string, unknown>;
}

/**
 * イベントハンドラー型定義
 * 
 * すべてのハンドラーはオプショナルで、外部から登録される。
 * イベント駆動設計により、ライブラリは状態変更を外部に通知するだけで、
 * 実際の処理は利用者側で実装する。
 */
export interface GanttEventHandlers {
  /** ノードがクリックされたときに発火 */
  onNodeClick?: (node: GanttNode) => void;
  
  /** 折り畳み/展開が切り替えられたときに発火 */
  onToggleCollapse?: (nodeId: string, newCollapsedState: boolean) => void;
  
  /** 内部データが変更されたときに発火（uncontrolledモードのみ） */
  onDataChange?: (nodes: GanttNode[]) => void;
  
  /** タイムライン上のバーがクリックされたときに発火 */
  onBarClick?: (node: GanttNode, event: MouseEvent) => void;
  
  /** ツリー内のノード名がクリックされたときに発火 */
  onNameClick?: (node: GanttNode, event: MouseEvent) => void;
  
  /** バーがドラッグされたときに発火（controlled モードでは必須） */
  onBarDrag?: (nodeId: string, newStart: DateTime, newEnd: DateTime) => void;
  
  /** グループ全体がドラッグされたときに発火 */
  onGroupDrag?: (nodeId: string, daysDelta: number) => void;
}

/**
 * ガントチャートの設定オプション
 * 
 * ライブラリの動作と見た目をカスタマイズするための設定。
 * すべてのフィールドはオプショナルで、デフォルト値が提供される。
 */
export interface GanttConfig {
  /** 
   * データ管理モード
   * - 'controlled': 外部でデータ管理（推奨）
   * - 'uncontrolled': 内部でデータ管理
   */
  mode?: 'controlled' | 'uncontrolled';
  
  /** 各行の高さ（ピクセル） */
  rowHeight?: number;
  
  /** 1日あたりの幅（ピクセル） */
  dayWidth?: number;
  
  /** 左側ツリーペインの幅（ピクセル） */
  treePaneWidth?: number;
  
  /** 階層レベルごとのインデント幅（ピクセル） */
  indentSize?: number;
  
  /** カスタムスタイリング用のCSSクラスプレフィックス */
  classPrefix?: string;
  
  /** ドラッグ時のスナップ単位（1セルの何分の1か、デフォルト: 4） */
  dragSnapDivision?: number;
}

/**
 * レンダリング用メタデータを含む内部計算済みノード
 * 
 * パブリックAPIには公開されない内部型。
 * GanttNodeを拡張し、描画に必要な計算済み情報を追加する。
 * 
 * @property depth - 階層の深さレベル（0 = ルート）
 * @property isVisible - このノードが表示されるかどうか（親が折り畳まれていないか）
 * @property visualIndex - フラット化された表示リスト内のインデックス
 * @property childrenIds - 直接の子要素のIDリスト
 */
export interface ComputedGanttNode extends GanttNode {
  /** 階層の深さレベル（0 = ルート） */
  depth: number;
  
  /** このノードが表示されるかどうか（親が折り畳まれていない） */
  isVisible: boolean;
  
  /** フラット化された表示リスト内のインデックス */
  visualIndex: number;
  
  /** 直接の子要素のIDリスト */
  childrenIds: string[];
}

/**
 * メインガントチャートコンポーネントのプロパティ
 * 
 * GanttChartコンポーネントに渡されるプロパティの型定義。
 */
export interface GanttChartProps {
  /** 表示するノードの配列 */
  nodes: GanttNode[];
  
  /** イベントハンドラー */
  handlers?: GanttEventHandlers;
  
  /** 設定オプション */
  config?: GanttConfig;
}

/**
 * タイムライン描画用の日付範囲
 * 
 * タイムラインの開始日と終了日を表す。
 * すべてのノードを包含する範囲が自動計算される。
 */
export interface DateRange {
  /** 開始日時 */
  start: DateTime;
  /** 終了日時 */
  end: DateTime;
}
