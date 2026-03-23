# X 軸仮想スクロール（列方向のウィンドウイング）

## Status

closed

---

## Summary

ズームインすると `extendedDateRange` の広い日付範囲に対して大量のグリッド線・ヘッダーセルが生成され、描画負荷が急増しユーザ体験が悪化する。ビューポートに表示されている X 座標範囲のみの列要素をレンダリングする「X 軸仮想スクロール」を導入し、ズームレベルに関わらず一定の描画コストに抑える。

---

## 背景：現状の問題

### 列要素数の爆発

ズームインすると `extendedDateRange` 内の Tick 数が急増する：

| 表示範囲 | Tick 単位 | minor Tick 数 | major Tick 数 | グリッド `<line>` | ヘッダー `<div>` |
|----------|-----------|---------------|---------------|-------------------|------------------|
| 90 日    | 1 日      | ~90           | ~3            | ~93               | ~93              |
| 90 日    | 1 時間    | ~2,160        | ~90           | ~2,250            | ~2,250           |
| 365 日   | 1 時間    | ~8,760        | ~365          | ~9,125            | ~9,125           |

### 現状で描画されている X 軸要素

**GanttTimeline.svelte（グリッド線）**:
- `{#each gridMinorTicks}` → 全 minor Tick 分の `<line>` SVG 要素
- `{#each gridMajorTicks}` → 全 major Tick 分の `<line>` SVG 要素
- ビューポート外の線も全て描画されている

**GanttHeader.svelte（ヘッダーセル）**:
- `{#each majorTicks}` → 全 major Tick 分の `<div>` 要素
- `{#each minorTicks}` → 全 minor Tick 分の `<div>` 要素
- 絶対配置（`position: absolute; left: Xpx`）だが全て DOM に存在

**GanttTimeline.svelte（バー）**:
- `{#each visibleNodes}` でビューポート外の X 範囲にあるバーも全て描画

### 既存の対策（不十分）

`extendedDateRange` + `recalculateExtendedDateRange`（Issue 0007）はズーム時に日付バッファを調整するが、これは**範囲の縮小**であって、ビューポート外の列を描画しない仕組みではない。バッファが広いほど Tick 数は膨大になる。

---

## 仕様

### 基本方針

`scrollLeft` と `viewportWidth` から、ビューポート内 ± オーバースキャン範囲に含まれる要素だけを描画する。

### 用語

| 用語 | 意味 |
|------|------|
| **ビューポート X 範囲** | ユーザーに見えている水平方向のピクセル範囲 |
| **可視日付範囲** | ビューポート X 範囲に対応する日付範囲 |
| **オーバースキャン** | ビューポート外に余分に描画するピクセル幅（スクロール時のちらつき防止） |

### アルゴリズム

```
入力:
  scrollLeft      — 現在の水平スクロール位置（px）
  viewportWidth   — ビューポートの幅（px）
  dayWidth        — 1日あたりの幅（px）
  dateRangeStart  — extendedDateRange の開始日
  overscanPx      — X 方向のオーバースキャン幅（デフォルト: viewportWidth × 0.5）

計算:
  visibleStartPx = scrollLeft - overscanPx
  visibleEndPx   = scrollLeft + viewportWidth + overscanPx

  visibleStartDate = dateRangeStart + (visibleStartPx / dayWidth) 日
  visibleEndDate   = dateRangeStart + (visibleEndPx / dayWidth) 日

フィルタリング:
  windowedMinorTicks = minorTicks.filter(tick => tick.end >= visibleStartDate && tick.start <= visibleEndDate)
  windowedMajorTicks = majorTicks.filter(tick => tick.end >= visibleStartDate && tick.start <= visibleEndDate)
  windowedBars       = visibleNodes.filter(node => node.end >= visibleStartDate && node.start <= visibleEndDate)
```

### 効果

| 状況 | 改善前 Tick 数 | 改善後 Tick 数 |
|------|----------------|----------------|
| 365 日 × 1 時間 Tick、ビューポート 1000px | ~9,125 | ~60-80 |
| 90 日 × 1 時間 Tick、ビューポート 1000px | ~2,250 | ~60-80 |

ビューポート幅に比例した一定数に抑えられる。

### 対象コンポーネントと変更内容

#### 1. X 軸ウィンドウ計算（新規）

**`src/utils/virtual-scroll.ts`** を新規作成:

```typescript
interface XAxisWindow {
  startDate: DateTime;   // ウィンドウ開始日時
  endDate: DateTime;     // ウィンドウ終了日時
  startPx: number;       // ウィンドウ開始 X 座標
  endPx: number;         // ウィンドウ終了 X 座標
}

function calculateXWindow(
  scrollLeft: number,
  viewportWidth: number,
  dayWidth: number,
  dateRangeStart: DateTime,
  overscanPx?: number
): XAxisWindow
```

Tick 配列・ノード配列のフィルタリング関数も提供:

```typescript
function filterTicksByWindow(ticks: Tick[], window: XAxisWindow): Tick[]
function filterNodesByWindow(nodes: ComputedGanttNode[], window: XAxisWindow): ComputedGanttNode[]
```

- 純粋関数として実装（テストしやすい）
- コンポーネント非依存

#### 2. GanttChart.svelte（親コンポーネント）

- タイムラインの `scrollLeft` を監視し、`XAxisWindow` をリアクティブに計算
- 計算した `XAxisWindow` を `GanttTimeline` と `GanttHeader` に prop として渡す
- 既存の `handleTimelineScroll` 内で計算（scroll-sync と統合）
- スクロールイベントの処理は `requestAnimationFrame` でスロットリング

#### 3. GanttTimeline.svelte（グリッド線 + バー）

- **グリッド線**: `{#each gridMinorTicks}` → `{#each windowedMinorTicks}` に変更
  - `windowedMinorTicks = filterTicksByWindow(gridMinorTicks, xWindow)` で計算
- **グリッド線（major）**: 同様にフィルタリング
- **バー**: `{#each visibleNodes}` → `{#each windowedVisibleNodes}` に変更
  - ビューポート X 範囲外のバーは描画しない
  - ただし日付未設定のバー（`isDateUnset`）はフォールバック位置で描画するため除外しない
- SVG の `width` / `height` は変更なし（スクロール領域サイズを維持するため）

#### 4. GanttHeader.svelte（ヘッダーセル）

- `{#each majorTicks}` → `{#each windowedMajorTicks}` に変更
- `{#each minorTicks}` → `{#each windowedMinorTicks}` に変更
- ヘッダーの全体 `width` は変更なし（スクロール幅を維持するため）
- `XAxisWindow` を新しい prop として受け取る

### スクロール時のちらつき防止

- オーバースキャン幅のデフォルト: `viewportWidth × 0.5`（片側）
- 高速スクロール時でもオーバースキャン分があるため、描画が追いつく
- `requestAnimationFrame` でスクロールイベントをバッチ処理

### extendedDateRange との関係

- `extendedDateRange` は引き続き「スクロール可能な最大範囲」を定義する役割を維持
- X 軸仮想化はその範囲内で「実際に描画する列」をさらに絞り込む
- `expandExtendedDateRangeIfNeeded` による動的拡張はそのまま動作

### ズーム変更時の処理

- ズーム変更 → `dayWidth` 変化 → `XAxisWindow` 再計算 → 描画更新
- `recalculateExtendedDateRange` との連携は既存のまま

---

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/utils/virtual-scroll.ts` | **新規** — X 軸ウィンドウ計算の純粋関数 |
| `src/components/GanttChart.svelte` | 変更 — scrollLeft 監視、XAxisWindow 計算、prop 追加 |
| `src/components/GanttTimeline.svelte` | 変更 — グリッド線とバーのフィルタリング |
| `src/components/GanttHeader.svelte` | 変更 — ヘッダーセルのフィルタリング |
| `tests/utils/virtual-scroll.test.ts` | **新規** — X 軸ウィンドウ計算のテスト |

---

## スコープ外

- **Y 軸（行方向）の仮想化**: Issue 0012 で対応
- **extendedDateRange ロジックの変更**: 既存のバッファ制御はそのまま維持
- **Tick 生成ロジック自体の変更**: `generateTwoLevelTicks` は全範囲分を生成し続ける（フィルタリングは描画側で行う）

---

## TODO

* [x] `src/utils/virtual-scroll.ts` を新規作成（`calculateXWindow`, `filterTicksByWindow`, `filterNodesByWindow`）
* [x] `tests/utils/virtual-scroll.test.ts` を新規作成（X 軸ウィンドウ計算のテスト）
* [x] `src/components/GanttChart.svelte` に scrollLeft 監視と XAxisWindow 計算を追加
* [x] `src/components/GanttTimeline.svelte` のグリッド線・バーをフィルタリング
* [x] `src/components/GanttHeader.svelte` のヘッダーセルをフィルタリング
* [x] `npm test` / `npm run check` で検証

---

## Notes (Append Only)

* 2026-03-23 — Issue起票。元 0011（Y 軸仮想化）を X 軸に変更。現状の問題: ズームインすると extendedDateRange 内の全 Tick がグリッド線・ヘッダーセルとして描画され、要素数が数千〜数万に達する。ビューポート X 範囲 ± オーバースキャンのみ描画するフィルタリング方式で対応する。
* 2026-03-23 — 実装完了。テスト 18件追加（86件中83通過、3件は zoom-gesture の pre-existing failure）。svelte-check 新規エラーなし。
