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
8. [パフォーマンス考慮事項](#パフォーマンス考慮事項)
9. [テストアーキテクチャ](#テストアーキテクチャ)

---

## 概要

### 技術スタック

- **Svelte 4**: UIフレームワーク
- **TypeScript**: 型安全性
- **Luxon**: 日付・時刻操作
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
│   Svelte Components (UI Layer)     │  ← GanttChart, GanttTree, GanttTimeline
├─────────────────────────────────────┤
│   Core Logic (Business Layer)      │  ← data-manager, gantt-store
├─────────────────────────────────────┤
│   Utils (Helper Layer)              │  ← zoom-scale, timeline-calculations
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
│   └── GanttHeader.svelte     # 日付ヘッダー
├── core/                # コアロジック（Svelte非依存）
│   ├── data-manager.ts        # データ操作（純粋関数）
│   └── gantt-store.ts         # 状態管理（Svelteストア）
├── utils/               # ユーティリティ（純粋関数）
│   ├── timeline-calculations.ts  # タイムライン計算
│   ├── zoom-scale.ts             # ズーム定義管理
│   ├── zoom-utils.ts             # ズームユーティリティ
│   ├── zoom-gesture.ts           # ズームジェスチャー
│   └── tick-generator.ts         # Tick生成
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
  const configStore = writable(config);
  
  // derived storeで自動計算
  const computedNodes = derived(nodesStore, $nodes => computeNodes($nodes));
  const visibleNodes = derived(computedNodes, $computed => 
    $computed.filter(n => n.isVisible)
  );
  
  return {
    nodes: { subscribe: nodesStore.subscribe },
    computedNodes: { subscribe: computedNodes.subscribe },
    visibleNodes: { subscribe: visibleNodes.subscribe },
    // アクション
    setNodes: (newNodes) => nodesStore.set(newNodes),
    toggleCollapse: (id) => nodesStore.update(...)
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
  // 外部状態を変更しない
  // グローバル変数を参照しない
  // 常に決定論的
  
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
- ズーム制御

**主要なstate:**
```typescript
const store = createGanttStore(nodes, config);
let currentZoomScale = 1.0;
let currentDayWidth = 30;
```

**公開API:**
```typescript
export function getStore() {
  return store; // 外部からストアにアクセス可能
}
```

### 2. GanttTree.svelte

**役割:** 左側のツリー表示

**責務:**
- 階層構造の表示（インデント）
- 折りたたみボタンの表示
- ノード名のクリックイベント

**レンダリング:**
```svelte
{#each $visibleNodes as node}
  <div class="gantt-tree-row" style="padding-left: {node.depth * indentSize}px">
    {#if node.childrenIds.length > 0}
      <button on:click={() => toggleCollapse(node.id)}>
        {node.isCollapsed ? '▶' : '▼'}
      </button>
    {/if}
    <span on:click={(e) => handleNameClick(node, e)}>
      {node.name}
    </span>
  </div>
{/each}
```

### 3. GanttTimeline.svelte

**役割:** 右側のタイムライン表示

**責務:**
- タスクバーの描画
- セクションバーの描画
- ドラッグ&ドロップ処理
- グリッド線の表示

**バー描画の計算:**
```typescript
function getBarPosition(node: ComputedGanttNode) {
  const startDays = node.start.diff(dateRange.start, 'days').days;
  const duration = node.end.diff(node.start, 'days').days;
  
  return {
    left: startDays * dayWidth,
    width: duration * dayWidth,
    top: node.visualIndex * rowHeight,
    height: rowHeight
  };
}
```

### 4. GanttHeader.svelte

**役割:** 日付ヘッダーの表示

**責務:**
- Major Tick（大目盛り）の表示
- Minor Tick（小目盛り）の表示
- ズームに応じたフォーマット変更

**2段階ヘッダー:**
```typescript
interface TwoLevelTicks {
  majorTicks: TickData[];  // 例: 月
  minorTicks: TickData[];  // 例: 日
}
```

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
    └→ dateRange (日付範囲の計算)
    ↓
[コンポーネントの再レンダリング]
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
  // 外部で状態を更新
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

---

## ズーム機構

### Tick定義システム

ズームレベルに応じて、11段階のTick定義から適切なものを選択します。

**定義構造:**
```typescript
interface TickDefinition {
  minScale: number;      // この定義が適用される最小スケール値
  interval: Duration;    // Tick間隔（例: { days: 1 }）
  majorFormat: string;   // 主目盛りフォーマット（例: 'yyyy MMM'）
  minorFormat?: string;  // 副目盛りフォーマット（例: 'dd'）
  label: string;         // 説明ラベル（例: '1日'）
}
```

**11段階の定義:**

| Scale範囲 | Tick間隔 | Major Format | Minor Format | 用途 |
|-----------|----------|--------------|--------------|------|
| ≥100 | 1時間 | HH:mm | dd MMM | 詳細計画 |
| ≥50 | 3時間 | HH:mm | dd MMM | 日内スケジュール |
| ≥25 | 6時間 | HH:mm | dd MMM | 半日単位 |
| ≥12 | 12時間 | HH:mm | dd MMM | 日単位（詳細） |
| ≥6 | 1日 | dd | MMM yyyy | 週単位計画 |
| ≥3 | 2日 | dd | MMM yyyy | 2週間単位 |
| ≥1.5 | 1週間 | dd MMM | yyyy | 月単位計画 |
| ≥0.8 | 2週間 | dd MMM | yyyy | 四半期計画 |
| ≥0.4 | 1ヶ月 | MMM | yyyy | 半期計画 |
| ≥0.2 | 3ヶ月 | MMM | yyyy | 年単位計画 |
| ≥0 | 1年 | yyyy | - | 長期計画 |

### ズームスケールの計算

```typescript
// スケール値から1日のピクセル幅を計算
export function getDayWidthFromScale(scale: number): number {
  const BASE_DAY_WIDTH = 40; // scale = 1.0のときの基準値
  return BASE_DAY_WIDTH * scale;
}

// 逆変換: ピクセル幅からスケール値を計算
export function getScaleFromDayWidth(dayWidth: number): number {
  const BASE_DAY_WIDTH = 40;
  return dayWidth / BASE_DAY_WIDTH;
}
```

### ズーム操作の実装

```typescript
// ズームイン/アウトボタン
function handleZoomIn() {
  currentZoomScale = Math.min(currentZoomScale * 1.2, ZOOM_SCALE_LIMITS.max);
  currentDayWidth = getDayWidthFromScale(currentZoomScale);
  store.setZoomScale(currentZoomScale);
}

// Ctrl+ホイールでズーム
function handleWheel(event: WheelEvent) {
  if (event.ctrlKey) {
    event.preventDefault();
    const delta = -event.deltaY * 0.01;
    currentZoomScale = clamp(
      currentZoomScale * (1 + delta),
      ZOOM_SCALE_LIMITS.min,
      ZOOM_SCALE_LIMITS.max
    );
  }
}
```

---

## ドラッグ&ドロップ

### ドラッグ可能な要素

1. **タスクバー全体**: タスクの移動
2. **タスクバーの端**: リサイズ
3. **セクションバー**: セクション全体とその子要素の移動

### ドラッグの実装

```typescript
// ドラッグ開始
function handleMouseDown(event: MouseEvent, node: ComputedGanttNode) {
  isDragging = true;
  dragStartX = event.clientX;
  dragStartNode = node;
  dragStartDate = node.start;
  
  // グローバルイベントリスナーを登録
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

// ドラッグ中
function handleMouseMove(event: MouseEvent) {
  if (!isDragging) return;
  
  const deltaX = event.clientX - dragStartX;
  const deltaDays = Math.round(deltaX / dayWidth / dragSnapDivision) * dragSnapDivision;
  
  // プレビュー表示を更新
  previewStart = dragStartDate.plus({ days: deltaDays });
  previewEnd = previewStart.plus({ 
    days: dragStartNode.end.diff(dragStartNode.start, 'days').days 
  });
}

// ドラッグ終了
function handleMouseUp(event: MouseEvent) {
  if (isDragging && previewStart && previewEnd) {
    // イベント発火
    handlers.onBarDrag?.(dragStartNode.id, previewStart, previewEnd);
  }
  
  // クリーンアップ
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

---

## パフォーマンス考慮事項

### 1. 仮想スクロール（未実装）

現在は全ノードをレンダリングしています。1000+ノードでは仮想スクロールが必要です。

**実装案:**
```typescript
// 表示領域内のノードのみレンダリング
const viewportStartIndex = Math.floor(scrollTop / rowHeight);
const viewportEndIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight);
const visibleNodesInViewport = visibleNodes.slice(viewportStartIndex, viewportEndIndex);
```

### 2. Derived Storeのメモ化

計算結果はSvelteのDerived Storeによって自動的にキャッシュされます。

```typescript
// nodesが変更されない限り、computeNodes()は再実行されない
const computedNodes = derived(nodes, $nodes => computeNodes($nodes));
```

### 3. イベントリスナーの最適化

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
5. **拡張可能**: 新機能の追加が容易

この設計により、保守性・拡張性・テスタビリティの高いライブラリを実現しています。
