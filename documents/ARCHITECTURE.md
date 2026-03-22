# Svelte Gantt Library - 技術的説明書

このドキュメントは、Svelte Gantt Libraryの内部アーキテクチャと技術的な設計について説明します。
ライブラリの保守・拡張を行う開発者向けのドキュメントです。

---

## 目次

1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [設計思想](#設計思想)
4. [主要コンポーネント](#主要コンポーネント)
5. [データフローとリアクティビティ](#データフローとリアクティビティ)
6. [ズーム機構](#ズーム機構)
7. [ドラッグ&ドロップ](#ドラッグドロップ)
8. [レンダーライフサイクル](#レンダーライフサイクル)
9. [パフォーマンス考慮事項](#パフォーマンス考慮事項)
10. [テストアーキテクチャ](#テストアーキテクチャ)

---

## 概要

### 技術スタック

- **Svelte 4**: UIフレームワーク（Svelte 5もpeer dependencyで対応）
- **TypeScript**: 型安全性
- **Luxon**: 日付・時刻操作
- **Hammer.js**: タッチジェスチャー（ピンチズーム）
- **Vite**: ビルドツール
- **Vitest**: 単体テスト
- **Playwright**: E2Eテスト

### 設計目標

1. **イミュータブル（不変性）**: データは常に新しいオブジェクトを生成
2. **疎結合**: コンポーネント間の依存を最小化
3. **型安全**: TypeScriptによる完全な型推論
4. **テスタビリティ**: 純粋関数とモックしやすい設計
5. **Svelte 5対応**: 将来的な移行を考慮した設計

---

## アーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────┐
│   Svelte Components (UI Layer)     │  ← GanttChart, GanttTree, GanttTimeline,
│                                     │     GanttHeader, GanttDebugPanel
├─────────────────────────────────────┤
│   Core Logic (Business Layer)      │  ← data-manager, gantt-store,
│                                     │     lifecycle-events, render-lifecycle
├─────────────────────────────────────┤
│   Utils (Helper Layer)              │  ← zoom-scale, zoom-gesture,
│                                     │     timeline-calculations, tick-generator
├─────────────────────────────────────┤
│   Types (Type Layer)                │  ← types.ts
└─────────────────────────────────────┘
```

### ディレクトリ構造

```
src/
├── components/           # UIコンポーネント（Svelte依存）
│   ├── GanttChart.svelte      # メインコンポーネント
│   ├── GanttTree.svelte       # 左側ツリー表示
│   ├── GanttTimeline.svelte   # 右側タイムライン
│   ├── GanttHeader.svelte     # 日付ヘッダー
│   └── GanttDebugPanel.svelte # 開発者向けデバッグパネル
├── core/                # コアロジック（Svelte非依存）
│   ├── data-manager.ts        # データ操作（純粋関数）
│   ├── gantt-store.ts         # 状態管理（Svelteストア）
│   ├── lifecycle-events.ts    # ライフサイクルイベント（EventTarget）
│   └── render-lifecycle.ts    # レンダリングフェーズ管理
├── utils/               # ユーティリティ（純粋関数）
│   ├── timeline-calculations.ts  # タイムライン計算
│   ├── zoom-scale.ts             # ズーム定義管理・Tick定義
│   ├── zoom-utils.ts             # ズームユーティリティ（レガシー）
│   ├── zoom-gesture.ts           # ズームジェスチャー検出
│   └── tick-generator.ts         # 2段階Tick生成
├── types.ts             # 型定義
└── index.ts             # エントリーポイント
```

---

## 設計思想

### 1. イミュータブル設計

すべてのデータ操作は**新しいオブジェクトを返す**ことで不変性を保ちます。

```typescript
// ❌ ミュータブル（変更可能）
function badToggle(nodes: GanttNode[], id: string) {
  const node = nodes.find(n => n.id === id);
  node.isCollapsed = !node.isCollapsed; // 元のオブジェクトを変更
  return nodes; // 同じ配列を返す
}

// ✅ イミュータブル（不変）
function toggleNodeCollapse(nodes: GanttNode[], id: string): GanttNode[] {
  return nodes.map(node =>
    node.id === id
      ? { ...node, isCollapsed: !node.isCollapsed } // 新しいオブジェクト
      : node // 変更なしのノードはそのまま
  );
}
```

**メリット:**
- Svelteのリアクティビティが正しく動作
- タイムトラベルデバッグが可能
- 並行処理での競合を回避
- テストが容易

### 2. ストア駆動アーキテクチャ

状態管理は**Svelteストア**を中心に構築されています。

```typescript
export function createGanttStore(nodes: GanttNode[], config: GanttConfig) {
  const nodesStore = writable(nodes);
  const configStore = writable({ ...DEFAULT_CONFIG, ...config });

  // derived storeで自動計算
  const computedNodes = derived(nodesStore, $nodes => computeNodes($nodes));
  const visibleNodes = derived(computedNodes, $computed =>
    getVisibleNodes($computed)
  );
  const dateRange = derived(nodesStore, $nodes => calculateDateRange($nodes));

  // 動的に拡張される日付範囲（スクロール・ズーム用）
  const extendedDateRange = writable<DateRange>({ ... });

  // 連続ズームスケール
  const zoomScale = writable(ZOOM_SCALE_LIMITS.default);

  // ライフサイクルイベント
  const lifecycleEvents = createLifecycleEventEmitter();

  return {
    nodes: { subscribe: nodesStore.subscribe },
    computedNodes: { subscribe: computedNodes.subscribe },
    visibleNodes: { subscribe: visibleNodes.subscribe },
    dateRange: { subscribe: dateRange.subscribe },
    extendedDateRange: { subscribe: extendedDateRange.subscribe },
    zoomScale: { subscribe: zoomScale.subscribe },
    lifecycleEvents,
    // アクション
    setNodes, toggleCollapse, updateConfig,
    setZoomScale, initExtendedDateRange,
    expandExtendedDateRangeIfNeeded,
    recalculateExtendedDateRange,
    autoAdjustSectionDates,
    // デバッグ用
    _getRawNodes, _getConfig
  };
}
```

**メリット:**
- 自動的なリアクティビティ
- コンポーネント間での状態共有
- Svelte 5の`$state`と`$derived`へ容易に移行可能

### 3. 純粋関数による計算

コアロジックは**副作用のない純粋関数**として実装されています。

```typescript
// 純粋関数: 同じ入力に対して常に同じ出力
export function calculateDateRange(nodes: GanttNode[]): DateRange {
  const nodesWithDates = nodes.filter(n => n.start && n.end);
  let minStart = nodesWithDates[0].start!;
  let maxEnd = nodesWithDates[0].end!;

  for (const node of nodesWithDates) {
    if (node.start! < minStart) minStart = node.start!;
    if (node.end! > maxEnd) maxEnd = node.end!;
  }

  return {
    start: minStart.plus({ days: -15 }),
    end: maxEnd.plus({ days: 15 })
  };
}
```

**メリット:**
- テストが容易（モック不要）
- 予測可能な動作
- デバッグしやすい
- 並列処理に安全

---

## 主要コンポーネント

### 1. GanttChart.svelte

**役割:** メインコンポーネント、全体の統合

**責務:**
- ストアの作成と管理
- 子コンポーネントへのデータ配信
- イベントハンドラーの統合
- ズーム制御（連続スケール）
- スクロール同期（ツリー・ヘッダー・タイムライン）
- Tick定義エディタパネル
- 右クリックドラッグによるパンニング

**主要なstate:**
```typescript
const store = createGanttStore(nodes, config);
let currentZoomScale = 1.0;
// displayZoomLevel は UI表示用（1-5の整数に変換）
$: displayZoomLevel = Math.round(Math.log2(currentZoomScale) + 3);
```

**公開API:**
```typescript
export function getStore() {
  return store;
}

export function scrollToDate(targetDate: DateTime) {
  // 指定日付にタイムラインをスクロール
  // 表示範囲外の場合は自動的に範囲を拡張
}

export function scrollToToday() {
  scrollToDate(DateTime.now().startOf('day'));
}
```

**内蔵UI機能:**
- ツリーペイン表示切替ボタン（◀/▶）
- ズームコントロール（+/−）、現在のTick定義ラベル表示
- Tick定義エディタパネル（⚙ボタンで表示切替）
- 右クリックドラッグによるパンニング

### 2. GanttTree.svelte

**役割:** 左側のツリー表示

**責務:**
- 階層構造の表示（インデント）
- 折りたたみボタンの表示（▶/▼）
- ノード名のクリックイベント
- ノードタイプに応じたフォント（project: bold、section: semi-bold）

**レンダリング:**
```svelte
{#each visibleNodes as node}
  <div class="gantt-tree-row" style="padding-left: {node.depth * indentSize}px">
    {#if node.childrenIds.length > 0}
      <button on:click={() => onToggleCollapse(node.id)}>
        {node.isCollapsed ? '▶' : '▼'}
      </button>
    {/if}
    <span on:click={(e) => onNameClick(node, e)}>
      {node.name}
    </span>
  </div>
{/each}
```

### 3. GanttTimeline.svelte

**役割:** 右側のタイムライン表示（SVGベース）

**責務:**
- タスクバーの描画（グラデーション、カスタムスタイル対応）
- セクションバーの描画（グループ背景矩形、リサイズハンドル、自動調整ボタン）
- プロジェクトバーの描画
- ドラッグ&ドロップ処理（move, resize-start, resize-end, group-move）
- グリッド線の表示（minor: 薄い線、major: 濃い線）
- 現在時刻ライン（赤い点線）
- ZoomGestureDetectorによるズーム制御

**バー描画の計算:**
```typescript
function getBarPosition(node: ComputedGanttNode) {
  const left = dateToX(node.start, dateRange, dayWidth);
  const width = durationToWidth(node.start, node.end, dayWidth);
  const top = node.visualIndex * rowHeight;
  return { left, width, top, height: rowHeight };
}
```

**日付未設定タスクの表示:**
- `isDateUnset`が`true`のタスクはグレー・点線で表示

### 4. GanttHeader.svelte

**役割:** 日付ヘッダーの表示（2段構成、各30px、合計60px）

**責務:**
- 上段（Major Tick）: 大目盛りの表示（年/月/週/日）
- 下段（Minor Tick）: 小目盛りの表示（日/時間等）
- ズームに応じた自動フォーマット変更

**2段階ヘッダー:**
```typescript
interface TwoLevelTicks {
  majorTicks: Tick[];  // 例: 月
  minorTicks: Tick[];  // 例: 日
}
```

### 5. GanttDebugPanel.svelte

**役割:** 開発者向けデバッグオーバーレイパネル

**責務:**
- 現在のズームスケールとTick定義情報の表示
- Tick定義のインライン編集（minScale、フォーマット、インターバル）
- 変更の適用とリセット

---

## データフローとリアクティビティ

### データフローの全体像

```
[ユーザー操作]
    ↓
[イベントハンドラー]
    ↓
[ストアの更新] ← nodesStore.set(newNodes)
    ↓
[Derived Storeの自動計算]
    ├→ computedNodes (階層・可視性計算)
    ├→ visibleNodes (表示ノードのフィルタ)
    ├→ dateRange (日付範囲の計算)
    └→ extendedDateRange (動的拡張日付範囲)
    ↓
[コンポーネントの再レンダリング]
```

### dateRange と extendedDateRange

`dateRange`はノードデータから自動計算される実データの範囲です。
`extendedDateRange`はスクロール・ズーム操作に応じて動的に拡張される表示用の範囲で、すべてのレンダリングはこちらを使用します。

**拡張の仕組み:**
```typescript
// スクロール端に到達した場合に範囲を拡張
expandExtendedDateRangeIfNeeded(scrollLeft, containerWidth, dayWidth, zoomScale, timelineElement)

// ズーム変更時に中心日付を基準に再計算
recalculateExtendedDateRange(centerDate, containerWidth, newDayWidth, newZoomScale, timelineElement)

// バッファ日数の計算（Tick間隔の粒度に基づく適応的計算）
calculateAdaptiveBuffer(viewportDays, zoomScale)
```

### リアクティビティの例

```typescript
// ノードの折りたたみ
function handleToggleCollapse(nodeId: string) {
  // 1. イベント発火（外部通知）
  handlers.onToggleCollapse?.(nodeId, !node.isCollapsed);

  // 2. ストア更新
  store.setNodes(
    toggleNodeCollapse(currentNodes, nodeId)
  );

  // 3. Derived Storeが自動計算
  // computedNodes → visibleNodes → 再レンダリング
}
```

### Controlled vs Uncontrolled モード

#### Controlled モード（推奨）

外部でデータを管理し、イベント経由で変更を通知します。

```typescript
let nodes = [...];

function handleBarDrag(nodeId, newStart, newEnd) {
  nodes = updateNode(nodes, nodeId, { start: newStart, end: newEnd });
}

<GanttChart {nodes} handlers={{ onBarDrag: handleBarDrag }} />
```

#### Uncontrolled モード

内部でデータを管理し、変更を`onDataChange`で通知します。

```typescript
<GanttChart
  nodes={initialNodes}
  config={{ mode: 'uncontrolled' }}
  handlers={{ onDataChange: (newNodes) => console.log(newNodes) }}
/>
```

### SVG初期化と幅計算の依存関係

SVGの幅（width属性）の計算は、複数の依存要素に基づいています。初期化の順序が重要です。

**依存チェーン:**
```
dateRange（ノードから計算）
    ↓
extendedDateRange（dateRangeから初期化） ← initExtendedDateRange()
    ↓
calculateTimelineWidth（extendedDateRangeから計算）
    ↓
SVG width属性の確定
```

**初期化フロー（GanttChart.svelte → onMount）:**

1. **同期的：** GanttChart マウント時に`initExtendedDateRange()`を直ちに実行
2. **検証：** DateTime オブジェクトの有効性をチェック（無効な場合は修正）
3. **リアクティブ：** extendedDateRange ストア更新 → GanttTimeline 自動再計算
4. **計算：** `calculateTimelineWidth(dateRange, dayWidth)`で自動計算

**重要な注意点：**

- `dateRange.end`が無効な場合（例：冬季の31日月の2月29日）、DateTime.diff()は NaN を返します
- 無効な DateTime は`initExtendedDateRange()`でキャッチして、有効な日付に修正します
- 非同期遅延（Promise.resolve()など）を避け、同期的に初期化することが重要です

---

## ズーム機構

### 連続ズームスケール

ズームは**連続的なスケール値**（float）で管理されます。旧来の1-5段階の整数zoomLevelはUI表示用の`displayZoomLevel`として残っていますが、内部ではすべて連続スケールを使用します。

**スケール範囲:**
```typescript
const ZOOM_SCALE_LIMITS = {
  min: 0.1,     // 最小（広域表示）
  max: 200,     // 最大（詳細表示）
  default: 1.0  // デフォルト
};
```

### Tick定義システム

ズームスケールに応じて、10段階のTick定義から適切なものを選択します。

**定義構造:**
```typescript
interface TickDefinition {
  minScale: number;           // この定義が適用される最小スケール値
  minCellWidthEm: number;     // 最小セル幅（em単位）→ minScaleの動的計算に使用
  majorUnit: 'year' | 'month' | 'week' | 'day';   // Major Tickの単位
  majorFormat: string;        // Major Tickフォーマット（例: 'yyyy MMM'）
  majorInterval?: Duration;   // Major Tick間隔（省略時はmajorUnit単位）
  minorUnit: 'month' | 'week' | 'day' | 'hour';   // Minor Tickの単位
  minorFormat: string;        // Minor Tickフォーマット（例: 'dd'）
  minorInterval: Duration;    // Minor Tick間隔
  label: string;              // 説明ラベル（例: '1日'）
}
```

**10段階の定義（minScaleは`minCellWidthEm`から動的計算）:**

| Label  | Minor Unit | Minor Interval | minCellWidthEm | Major Unit | 用途             |
| ------ | ---------- | -------------- | -------------- | ---------- | ---------------- |
| 1時間  | hour       | 1時間          | 2em            | day        | 詳細計画         |
| 3時間  | hour       | 3時間          | 2em            | day        | 日内スケジュール |
| 6時間  | hour       | 6時間          | 2em            | day        | 半日単位         |
| 12時間 | hour       | 12時間         | 2em            | day        | 日単位（詳細）   |
| 1日    | day        | 1日            | 2em            | month      | 週単位計画       |
| 1週間  | week       | 1週間          | 4em            | month      | 月単位計画       |
| 2週間  | week       | 2週間          | 3em            | month      | 四半期計画       |
| 1ヶ月  | month      | 1ヶ月          | 3em            | year       | 半期計画         |
| 3ヶ月  | month      | 3ヶ月          | 3em            | year       | 年単位計画       |
| 1年    | month      | 1ヶ月          | 0（fallback）  | year       | 長期計画         |

**minScaleの動的計算:**
```typescript
// minCellWidthEm から minScale を計算
export function calculateMinScale(def: TickDefinition, emPx: number = DEFAULT_EM_PX): number {
  // minCellWidthEm * emPx / (interval日数 * BASE_DAY_WIDTH)
}
```

**カスタムTick定義のサポート:**
```typescript
addCustomTickDefinition(definition);    // カスタム定義の追加
removeCustomTickDefinition(minScale);   // カスタム定義の削除
updateTickDefinition(index, definition); // 既存定義の更新
getAllTickDefinitions();                 // 全定義の取得
```

### ズームスケールの計算

```typescript
const BASE_DAY_WIDTH = 40; // scale = 1.0のときの基準値

// スケール値から1日のピクセル幅を計算
export function getDayWidthFromScale(scale: number): number {
  return BASE_DAY_WIDTH * scale;
}

// 逆変換: ピクセル幅からスケール値を計算
export function getScaleFromDayWidth(dayWidth: number): number {
  return dayWidth / BASE_DAY_WIDTH;
}
```

### ズームジェスチャー検出（ZoomGestureDetector）

`ZoomGestureDetector`クラスはHammer.jsとネイティブホイールイベントを組み合わせてズーム操作を検出します。

**入力方式:**
- **Ctrl/Cmd + マウスホイール**: デスクトップでのズーム
- **ピンチジェスチャー**: タッチデバイスでのズーム（Hammer.js）

**最適化:**
- **requestAnimationFrame バッチング**: ホイールイベントを1フレームに1コールバックに集約
- **適応的ズームステップ**: スケール範囲に応じてステップサイズを調整

```typescript
// スケール範囲に応じたステップサイズ
function getAdaptiveZoomStep(scale: number): number {
  if (scale >= 5.0) return 0.12;
  if (scale >= 1.0) return 0.08;
  if (scale >= 0.1) return 0.06;
  return 0.04;
}
```

**マウス位置基準ズーム:**
ズーム時のコールバックにマウス座標（mouseX, mouseY）を渡し、マウスカーソル位置を中心にズームします。

### ズーム操作の実装

```typescript
// ズームイン/アウトボタン（×1.5 / ÷1.5）
function zoomIn() {
  currentZoomScale = Math.min(currentZoomScale * 1.5, ZOOM_SCALE_LIMITS.max);
  // → handleTimelineZoom → recalculateExtendedDateRange
}

// GanttTimelineからのズームコールバック
function handleTimelineZoom(scale: number, newDayWidth: number) {
  currentZoomScale = scale;
  store.setZoomScale(scale);
  store.recalculateExtendedDateRange(centerDate, containerWidth, newDayWidth, scale, timelineElement);
}
```

**ZoomGestureDetectorの初期化タイミング:**
`RenderLifecycle`の`isReady`が`true`になった後に初期化されます。これにより、レンダリング完了前のズーム操作による不整合を防ぎます。

---

## ドラッグ&ドロップ

### ドラッグモード

| モード           | 対象要素                 | 動作                               |
| ---------------- | ----------------------- | ---------------------------------- |
| `move`           | タスクバー全体          | タスクの開始日・終了日を平行移動    |
| `resize-start`   | タスクバーの左端ハンドル | 開始日のみ変更                     |
| `resize-end`     | タスクバーの右端ハンドル | 終了日のみ変更                     |
| `group-move`     | セクションバーの背景     | セクション全体とその子要素を移動    |

### ドラッグの実装

```typescript
// ドラッグ開始
function handleMouseDown(event: MouseEvent, node: ComputedGanttNode) {
  isDragging = true;
  dragStartX = event.clientX;
  dragStartNode = node;
  dragStartDate = node.start;

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

// ドラッグ中
function handleMouseMove(event: MouseEvent) {
  if (!isDragging) return;

  const deltaX = event.clientX - dragStartX;
  const deltaDays = Math.round(deltaX / dayWidth / dragSnapDivision) * dragSnapDivision;

  previewStart = dragStartDate.plus({ days: deltaDays });
  previewEnd = previewStart.plus({
    days: dragStartNode.end.diff(dragStartNode.start, 'days').days
  });
}

// ドラッグ終了
function handleMouseUp(event: MouseEvent) {
  if (isDragging && previewStart && previewEnd) {
    handlers.onBarDrag?.(dragStartNode.id, previewStart, previewEnd);
  }

  isDragging = false;
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
}
```

### スナップ機能

```typescript
// dragSnapDivision = 4 の場合、0.25日単位でスナップ
const snapDelta = Math.round(rawDelta / dragSnapDivision) * dragSnapDivision;
```

### セクション自動調整

セクション/サブセクションバーには自動調整ボタン（SVGアイコン）が表示されます。クリックすると、セクションの日付を全子孫タスクの範囲に合わせて自動調整します。

```typescript
function autoAdjustSectionDates(nodes: GanttNode[], nodeId: string): GanttNode[] {
  // 全子孫のmin start/max endを計算してセクション日付を更新
}
```

---

## レンダーライフサイクル

### RenderLifecycle（内部レンダリングフェーズ管理）

`render-lifecycle.ts`はコンポーネントのレンダリングフェーズを管理します。

**6段階のフェーズ:**

| フェーズ         | 説明                           |
| --------------- | ------------------------------ |
| `initializing`  | 初期化開始                     |
| `mounting`      | マウント処理中                 |
| `measuring`     | DOM計測中                      |
| `rendering`     | レンダリング中                 |
| `ready`         | 初回レンダリング完了           |
| `updating`      | 更新中（ready後の再レンダリング）|

**公開ストア:**
```typescript
const lifecycle = createRenderLifecycle();
// Readable stores
lifecycle.phase;          // 現在のフェーズ
lifecycle.isInitializing; // 初期化中かどうか
lifecycle.isReady;        // 準備完了かどうか
lifecycle.canInteract;    // 操作可能かどうか（ready or updating）
```

**使用例:**
GanttTimelineでは`isReady`を監視し、準備完了後にZoomGestureDetectorを初期化します。

### LifecycleEventEmitter（外部向けライフサイクルイベント）

`lifecycle-events.ts`はEventTargetベースの外部向けイベントAPIです。詳細は[LIFECYCLE_EVENTS.md](./LIFECYCLE_EVENTS.md)を参照してください。

---

## パフォーマンス考慮事項

### 1. 仮想スクロール（未実装）

現在は全ノードをレンダリングしています。1000+ノードでは仮想スクロールが必要です。

### 2. Derived Storeのメモ化

計算結果はSvelteのDerived Storeによって自動的にキャッシュされます。

```typescript
// nodesが変更されない限り、computeNodes()は再実行されない
const computedNodes = derived(nodes, $nodes => computeNodes($nodes));
```

### 3. ズームイベントのバッチング

ZoomGestureDetectorは`requestAnimationFrame`を使用してホイールイベントを1フレームに1回のコールバックに集約し、過剰な再レンダリングを防ぎます。

### 4. 適応的バッファ計算

`extendedDateRange`のバッファ日数はTick間隔の粒度に基づいて適応的に計算されます。広域表示（低スケール）では大きなバッファ、詳細表示（高スケール）では小さなバッファを使用します。

### 5. イベントリスナーの最適化

```typescript
// ドラッグ中のみグローバルリスナーを登録
function startDrag() {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

function endDrag() {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
}
```

---

## テストアーキテクチャ

### 単体テスト（Vitest）

**テスト対象:**
- `src/core/data-manager.ts`: データ操作関数
- `src/utils/*.ts`: ユーティリティ関数

**テスト方針:**
- 純粋関数のため、モック不要
- エッジケースを重点的にテスト
- カバレッジ目標: 90%以上

**例:**
```typescript
describe('calculateDateRange', () => {
  it('should calculate range with 15-day margin', () => {
    const nodes = [
      { id: '1', start: DateTime.fromISO('2024-01-01'), end: DateTime.fromISO('2024-01-30') }
    ];
    const range = calculateDateRange(nodes);

    expect(range.start.toISODate()).toBe('2023-12-17'); // -15日
    expect(range.end.toISODate()).toBe('2024-02-14');   // +15日
  });
});
```

### E2Eテスト（Playwright）

**テスト対象:**
- ユーザー操作のフロー
- UI統合動作

**テスト方針:**
- 実際のユーザー操作をシミュレート
- クリティカルパスを優先
- 非安定なテストはスキップ

**例:**
```typescript
test('タスクバーをドラッグして移動できること', async ({ page }) => {
  const taskBar = page.locator('.gantt-bar--task').first();
  const box = await taskBar.boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();

  await expect(page.locator('.log-entry').filter({ hasText: 'Dragged' })).toBeVisible();
});
```

---

## まとめ

Svelte Gantt Libraryは、以下の原則に基づいて設計されています：

1. **イミュータブル**: データの不変性を保つ
2. **型安全**: TypeScriptによる完全な型推論
3. **疎結合**: コンポーネント間の依存を最小化
4. **テスタブル**: 純粋関数とモックしやすい設計
5. **拡張可能**: カスタムTick定義やスタイルの追加が容易
6. **高パフォーマンス**: rAFバッチング、適応的バッファ、Derived Storeメモ化

この設計により、保守性・拡張性・テスタビリティの高いライブラリを実現しています。
