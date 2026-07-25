/**
 * ガントチャートライブラリのコア型定義
 * 
 * 設計原則:
 * - 実装との結合を最小限にする
 * - 破壊的変更なしで拡張可能にする
 * - 暗黙的より明示的を優先する
 */

import type { DateTime } from 'luxon';
import type { DurationLikeObject } from 'luxon';

/**
 * 外部ドロップイベント
 */
export interface GanttExternalDropEvent {
  /** ドロップが発生した DragEvent（DataTransfer へのアクセス用） */
  originalEvent: DragEvent
  /** ドロップ位置の日付（スナップ適用後） */
  dropDate: DateTime
  /** ドロップ位置の直近の GanttNode。なければ null */
  nearestNode: GanttNode | null
}

/**
 * 外部ドラッグオーバーイベント
 */
export interface GanttExternalDragOverEvent {
  /** 現在のホバー日付（スナップ適用後） */
  hoverDate: DateTime
  /** ホバー位置の直近ノード */
  nearestNode: GanttNode | null
}

/**
 * ズームレベル（majorUnit）ごとのスナップ粒度マッピング
 *
 * majorUnit（年・月・週・日）をキーとし、その単位が表示中のときの
 * スナップ単位とバー最低幅を Duration で指定する。
 * 省略したキーはデフォルト値が使われる。
 */
export type SnapDurationMap = Partial<Record<'year' | 'month' | 'week' | 'day', DurationLikeObject>>;

/**
 * ノードタイプ識別子
 * 
 * ガントチャート内のノードの種類を示す文字列リテラル型。
 * 各タイプは異なる描画スタイルと動作を持つ。
 */
export type GanttNodeType = 'project' | 'section' | 'subsection' | 'task';

/**
 * ガントバーのカスタムスタイル定義
 *
 * タスクバーの外観を個別にカスタマイズするためのオプションプロパティ群。
 * すべてのフィールドはオプショナルで、省略時はデフォルトスタイルが適用される。
 */
export interface GanttNodeStyle {
  /** バーの塗りつぶし色（CSSカラー文字列） */
  fill?: string;
  /** バーの枠線色（CSSカラー文字列） */
  stroke?: string;
  /** バーの枠線幅（ピクセル） */
  strokeWidth?: number;
  /** バーの角丸半径（ピクセル、デフォルト: 6） */
  rx?: number;
  /** ラベルテキストの色（CSSカラー文字列） */
  labelColor?: string;
}

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
 * @property start - 開始日時（luxon DateTimeオブジェクト、未設定の場合はundefined）
 * @property end - 終了日時（luxon DateTimeオブジェクト、未設定の場合はundefined）
 * @property isCollapsed - UI状態: このノードの子要素を非表示にするかどうか
 * @property style - バーの外観カスタマイズ（タスクタイプのみ有効）
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
  
  /** 開始日時（luxon DateTimeオブジェクト、未設定の場合はundefined） */
  start?: DateTime;
  
  /** 終了日時（luxon DateTimeオブジェクト、未設定の場合はundefined） */
  end?: DateTime;
  
  /** UI状態: このノードの子要素が非表示かどうか */
  isCollapsed?: boolean;

  /** バーの外観カスタマイズ（タスクタイプのみ有効） */
  style?: GanttNodeStyle;

  /** 任意のメタデータ - ライブラリは無視するが、イベント経由で渡される */
  metadata?: Record<string, unknown>;

  /** タスクが完了しているかどうか。true の場合はツリーペインおよびガント表示でグレー配色になる（取消線は付与しない） */
  completed?: boolean;

  /**
   * 期限（due）。ガント上では ◆ のマイルストンとして描画される。
   * 一点なら ◆、期間指定なら始点と終点に ◆＋間を塗りつぶす。
   * 値の意味（「期限」であること）はライブラリは知らない。受けて描くだけ。
   */
  milestone?: DateTime | { start: DateTime; end: DateTime };

  /**
   * 実施予定枠（plan）。ガント上では schedule バーを包む点線枠として描画される。
   * バーが無い（日時未設定の）タスクでも plan だけは描画される。
   * 値の意味（「バッファ込みの枠」であること）はライブラリは知らない。受けて描くだけ。
   */
  plan?: { start: DateTime; end: DateTime };

  /**
   * 仮置きかどうか。true の場合、バー・plan 枠・milestone を半透明にし「?」バッジを付与する。
   * 値の意味（「仮置き」であること）はライブラリは知らない。受けて描くだけ。
   */
  tentative?: boolean;

  /**
   * ステータス文字列。'done' の場合はバーを完了配色にし ✓ バッジを付与する。
   * 'done' 以外の値はライブラリでは特別扱いしない（色分けはホスト側の責務）。
   */
  status?: string;

  /**
   * バー横に描く汎用ラベル群。何を表示するかはホストが決め、ライブラリは
   * 受け取った文字列配列を区切り文字で連結して描くだけ。
   */
  trailingLabels?: string[];
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

  /** バーのドラッグが確定したとき（mouseup）に発火。最終的な start/end を通知する */
  onBarDragEnd?: (nodeId: string, finalStart: DateTime, finalEnd: DateTime) => void;

  /** グループ全体がドラッグされたときに発火 */
  onGroupDrag?: (nodeId: string, daysDelta: number) => void;
  
  /**
   * セクション日付自動調整時に発火。
   * `edge` は調整対象（'start' | 'end' | 'both'）。左右のリサイズハンドルをダブルクリックすると
   * それぞれ 'start' / 'end' で発火する（issue #0026）。
   */
  onAutoAdjustSection?: (nodeId: string, edge: 'start' | 'end' | 'both') => void;
  
  /** ズームレベルが変更されたときに発火 */
  onZoomChange?: (zoomLevel: number) => void;

  /** タイムラインのパン（右クリックドラッグスクロール）開始 */
  onPanStart?: (startX: number, startY: number, originalEvent: MouseEvent) => void;

  /** タイムラインのパン終了 */
  onPanEnd?: (endX: number, endY: number, originalEvent: MouseEvent) => void;

  /** タイムラインのスクロール位置変化 */
  onScrollChange?: (scrollLeft: number, scrollTop: number) => void;

  /** タイムライン描画領域のサイズ変化 */
  onViewportChange?: (width: number, height: number) => void;

  /** 表示日付範囲（extendedDateRange）が変化したとき */
  onDateRangeChange?: (range: DateRange) => void;

  /** 外部ドロップが発生したとき（既存バーとは異なるソース） */
  onExternalDrop?: (event: GanttExternalDropEvent) => void;

  /** 外部ドラッグがタイムライン上をホバーしているとき */
  onExternalDragOver?: (event: GanttExternalDragOverEvent) => void;

  /** 左ツリーペイン幅がドラッグリサイズで確定したときに発火（永続化はホストの責務） */
  onPanelResize?: (width: number) => void;

  /**
   * 期間なしサブタスク行をタイムラインへドラッグして予定化したときに発火する
   * （issue-gantt-phase004-008）。ライブラリはノードの start/end を自分で書き換えない。
   * 書き戻しはホストの責務（onBarDragEnd と同じ一方向データフロー）。
   */
  onSchedule?: (nodeId: string, start: DateTime, end: DateTime) => void;

  /** plan（実施予定枠）がドラッグされたときに発火する（issue #0028） */
  onPlanDrag?: (nodeId: string, newStart: DateTime, newEnd: DateTime) => void;

  /** plan のドラッグが確定したとき（mouseup）に発火。最終的な start/end を通知する（issue #0028） */
  onPlanDragEnd?: (nodeId: string, finalStart: DateTime, finalEnd: DateTime) => void;

  /**
   * マイルストンがドラッグされたときに発火する（issue #0028）。
   * 一点（DateTime）の場合は移動のみ、期間（{start,end}）の場合は移動・左右リサイズに対応する。
   */
  onMilestoneDrag?: (nodeId: string, newMilestone: DateTime | { start: DateTime; end: DateTime }) => void;

  /** マイルストンのドラッグが確定したとき（mouseup）に発火する（issue #0028） */
  onMilestoneDragEnd?: (nodeId: string, finalMilestone: DateTime | { start: DateTime; end: DateTime }) => void;
}

/**
 * ユーザーインタラクションイベントの種別
 */
export type GanttUserEventType =
  | 'nodeClick'
  | 'barClick'
  | 'nameClick'
  | 'barDrag'
  | 'barDragEnd'
  | 'groupDrag'
  | 'toggleCollapse'
  | 'dataChange'
  | 'autoAdjustSection'
  | 'zoomChange'
  | 'panStart'
  | 'panEnd'
  | 'scrollChange'
  | 'viewportChange'
  | 'dateRangeChange'
  | 'externalDrop'
  | 'externalDragOver'
  | 'schedule'
  | 'planDrag'
  | 'planDragEnd'
  | 'milestoneDrag'
  | 'milestoneDragEnd'

/**
 * イベント種別ごとの detail 型マップ
 */
export type GanttUserEventDetailMap = {
  nodeClick:         { node: GanttNode }
  barClick:          { node: GanttNode; originalEvent: MouseEvent }
  nameClick:         { node: GanttNode; originalEvent: MouseEvent }
  barDrag:           { nodeId: string; newStart: DateTime; newEnd: DateTime }
  barDragEnd:        { nodeId: string; finalStart: DateTime; finalEnd: DateTime }
  groupDrag:         { nodeId: string; daysDelta: number }
  toggleCollapse:    { nodeId: string; newCollapsedState: boolean }
  dataChange:        { nodes: GanttNode[] }
  autoAdjustSection: { nodeId: string; edge: 'start' | 'end' | 'both' }
  zoomChange:        { zoomLevel: number }
  panStart:          { startX: number; startY: number; originalEvent: MouseEvent }
  panEnd:            { endX: number; endY: number; originalEvent: MouseEvent }
  scrollChange:      { scrollLeft: number; scrollTop: number }
  viewportChange:    { width: number; height: number }
  dateRangeChange:   { range: DateRange }
  externalDrop:      { originalEvent: DragEvent; dropDate: DateTime; nearestNode: GanttNode | null }
  externalDragOver:  { hoverDate: DateTime; nearestNode: GanttNode | null }
  schedule:          { nodeId: string; start: DateTime; end: DateTime }
  planDrag:          { nodeId: string; newStart: DateTime; newEnd: DateTime }
  planDragEnd:       { nodeId: string; finalStart: DateTime; finalEnd: DateTime }
  milestoneDrag:     { nodeId: string; newMilestone: DateTime | { start: DateTime; end: DateTime } }
  milestoneDragEnd:  { nodeId: string; finalMilestone: DateTime | { start: DateTime; end: DateTime } }
}

export type GanttUserEventDetail<T extends GanttUserEventType = GanttUserEventType> =
  GanttUserEventDetailMap[T]

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
  
  /** 左側のツリーペインを表示するかどうか */
  showTreePane?: boolean;

  /** コンテナの幅。CSSの値（例: '800px', '100%'）。未指定時は '100%' */
  width?: string;

  /** コンテナの高さ。CSSの値（例: '600px', '80vh'）。未指定時は '100%' */
  height?: string;

  /**
   * ズームレベル（majorUnit）ごとのスナップ粒度マッピング
   *
   * 表示中の majorUnit に応じてスナップ単位とバー最低幅が決まる。
   * 省略したキーはデフォルト値（年→1週、月→1日、週→1日、日→1時間）が使われる。
   *
   * @example
   * // 日単位表示のとき30分スナップにする
   * { day: { minutes: 30 } }
   */
  snapDurationMap?: SnapDurationMap;

  /**
   * X 軸仮想スクロールのオーバースキャン幅（px、片側）
   *
   * ビューポート左右にそれぞれこのピクセル数だけ余分に描画し、
   * 高速スクロール時のちらつきを防ぐ。
   * 0 を指定するとオーバースキャンなし。デフォルト: 500
   */
  xOverscanPx?: number;

  /** ベースフォントサイズ（px）。タスク名・ラベル等に適用される。デフォルト: 14 */
  fontSize?: number;

  /** 土日を表示するかどうか。false の場合はタイムライン上で土日カラムを詰めて非表示にする。デフォルト: true */
  showWeekends?: boolean;

  /** 土日をグレー背景で強調表示するかどうか（showWeekends が true の場合のみ有効）。デフォルト: true */
  weekendBackground?: boolean;

  /**
   * 祝日リスト（YYYY-MM-DD形式の文字列）。重複・順不同許容。
   * どの日が祝日かの意味はライブラリは知らない。ヘッダ・列を赤系で塗るだけ。デフォルト: []
   */
  holidays?: string[];

  /**
   * 週末とみなす曜日の配列（luxon の weekday 規約: 1=月 ... 6=土, 7=日）。
   * デフォルト: [6, 7]（土日）
   */
  weekend?: number[];

  /**
   * 期間なしサブタスク行をドラッグ予定化したときの既定期間長（分）。
   * デフォルト: 60（issue-gantt-phase004-008）。
   */
  defaultDurationMinutes?: number;

  /**
   * 期間なしサブタスク行を日単位ズームでドラッグ予定化したときの開始時刻（時）。
   * 時間単位ズームでは 15 分単位に丸めるため使われない。デフォルト: 9（issue-gantt-phase004-008）。
   */
  defaultStartHour?: number;

  /**
   * 期間（start/end）未設定のサブタスク行（type: 'task'）を表示するかどうか。
   * false の場合、該当ノードは可視ノードから除外される。デフォルト: true（issue #0021）。
   */
  showUnscheduledSubtasks?: boolean;
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
 * @property start - 開始日時（必須、未設定の場合は親から計算される）
 * @property end - 終了日時（必須、未設定の場合は親から計算される）
 * @property isDateUnset - 元のデータで日時が未設定だったかどうか
 */
export interface ComputedGanttNode extends Omit<GanttNode, 'start' | 'end'> {
  /** 階層の深さレベル（0 = ルート） */
  depth: number;
  
  /** このノードが表示されるかどうか（親が折り畳まれていない） */
  isVisible: boolean;
  
  /** フラット化された表示リスト内のインデックス */
  visualIndex: number;
  
  /** 直接の子要素のIDリスト */
  childrenIds: string[];
  
  /** 開始日時（必須、未設定の場合は親から計算される） */
  start: DateTime;
  
  /** 終了日時（必須、未設定の場合は親から計算される） */
  end: DateTime;
  
  /** 元のデータで日時が未設定だったかどうか */
  isDateUnset: boolean;
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
