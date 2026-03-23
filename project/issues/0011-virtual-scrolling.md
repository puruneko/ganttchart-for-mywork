# 仮想スクロール（Virtual Scrolling）の実装

## Status

open

---

## Summary

現在、ガントチャートは全ての表示行（`visibleNodes`）を一度に DOM/SVG にレンダリングしている。ノード数が数百〜数千になるとパフォーマンスが大幅に低下する。仮想スクロールを導入し、ビューポートに表示される行とその付近のみをレンダリングすることで大量データにも対応する。

---

## 背景：現状の問題

### DOM 要素数の爆発

| ノード数 | ツリー側 DOM 要素 | タイムライン側 SVG 要素 | 合計 |
|----------|-------------------|-------------------------|------|
| 100      | ~400              | ~500-700               | ~1,100 |
| 1,000    | ~4,000            | ~5,000-7,000           | ~11,000 |
| 5,000    | ~20,000           | ~25,000-35,000         | ~55,000 |

- **ツリー行（GanttTree.svelte）**: 1行あたり 3〜4 個の HTML 要素
- **タイムラインバー**: 1行あたり 4〜7 個の SVG 要素（バー本体・リサイズハンドル・ラベル・グループ背景）
- **グリッド線**: 全行を縦断する共有要素（行数とは独立だが、SVG 高さが巨大になる）

### 仮想化しやすい条件（既に満たしている）

- **行高さが固定**: `rowHeight`（デフォルト 40px）で全行一律
- **Y座標が決定的**: `y = visualIndex × rowHeight` で計算可能
- **フラット配列で管理**: `visibleNodes` が既にフラット化された表示順配列
- **水平方向は対応済み**: `extendedDateRange` による日付範囲の動的拡縮が既に実装済み

---

## 仕様

### 用語

| 用語 | 意味 |
|------|------|
| **ビューポート** | ユーザーに見えているスクロール領域 |
| **ウィンドウ** | 実際にレンダリングする行の範囲 |
| **オーバースキャン** | ビューポート外に余分にレンダリングする行数（スクロール時のちらつき防止） |

### 基本アルゴリズム

```
入力:
  scrollTop     — 現在のスクロール位置（px）
  viewportHeight — ビューポートの高さ（px）
  rowHeight      — 1行の高さ（px）
  totalRows      — visibleNodes.length
  overscan       — オーバースキャン行数（デフォルト: 5）

計算:
  startIndex = max(0, floor(scrollTop / rowHeight) - overscan)
  endIndex   = min(totalRows - 1, ceil((scrollTop + viewportHeight) / rowHeight) + overscan)

出力:
  windowedNodes = visibleNodes.slice(startIndex, endIndex + 1)
  offsetY       = startIndex * rowHeight     ← レンダリング開始位置のオフセット
  totalHeight   = totalRows * rowHeight       ← スクロール領域の全体高さ
```

### 対象コンポーネントと変更内容

#### 1. 仮想スクロールコア（新規）

**`src/utils/virtual-scroll.ts`** を新規作成:

```typescript
interface VirtualScrollState {
  startIndex: number;   // レンダリング開始行
  endIndex: number;     // レンダリング終了行
  offsetY: number;      // 開始行のY座標オフセット
  totalHeight: number;  // 全体の論理的な高さ
}

function calculateVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  totalRows: number,
  overscan?: number
): VirtualScrollState
```

- 純粋関数として実装（テストしやすい）
- コンポーネント非依存

#### 2. GanttTree.svelte（ツリーペイン）

- **スペーサー方式**: 実際の行の前後に高さだけのスペーサー `<div>` を配置し、スクロールバーの見た目を維持
- `{#each visibleNodes}` → `{#each windowedNodes}` に変更
- 各行の `style` にオフセットを適用

```
スクロール領域の構造:
┌─────────────────────┐
│ 上スペーサー          │ height = startIndex × rowHeight
├─────────────────────┤
│ 実際にレンダリングされる行 │ windowedNodes (startIndex 〜 endIndex)
├─────────────────────┤
│ 下スペーサー          │ height = (totalRows - endIndex - 1) × rowHeight
└─────────────────────┘
```

#### 3. GanttTimeline.svelte（タイムラインペイン）

- SVG の `height` は引き続き `totalRows × rowHeight`（スクロール領域全体）
- **バーのレンダリング**: `{#each visibleNodes}` → `{#each windowedNodes}` に変更
- `rowToY()` はそのまま使用（`visualIndex` ベースなので仮想化しても正しい座標を返す）
- **グリッド線**: SVG 高さ全体を描くのは維持（線は行数に依存しないため軽量）

#### 4. GanttChart.svelte（親コンポーネント）

- スクロールイベントで `scrollTop` を取得し、仮想ウィンドウを再計算
- `windowedNodes` を派生値として Tree と Timeline に渡す
- 既存の `scroll-sync` との統合: 縦スクロール同期時にも仮想ウィンドウを更新

### グループ背景の処理

`GanttGroupBackground` はセクション/サブセクションの子行全体を囲む矩形を描画する。子行がウィンドウ外にある場合の対応:

- **方針**: グループ背景の描画は、そのセクションノード自体がウィンドウ内にある場合のみ描画する（現状と同じ条件）
- グループ背景の高さは `visibleNodes` 全体から計算するが、描画は開始ノードがウィンドウ内のときのみ

### 折り畳み/展開時の処理

- `toggleCollapse` → `visibleNodes` が変化 → `totalRows` が変化 → 仮想ウィンドウを再計算
- スクロール位置のジャンプを防ぐため、折り畳み時は `scrollTop` を調整する必要がある場合がある

### ズーム時の処理

- ズーム変更は `dayWidth` を変えるが `rowHeight` は不変 → 仮想スクロールの Y 軸計算に影響なし
- ズーム時の `recalculateExtendedDateRange`（水平方向の仮想化）とは独立して動作

### パフォーマンス目標

- **レンダリング行数の上限**: ビューポート内の行数 + overscan × 2（通常 20〜40 行程度）
- **10,000 行でも 60fps スクロール** を目標
- スクロールイベントの処理は `requestAnimationFrame` でスロットリング

---

## 設定

`GanttConfig` にオプションを追加:

```typescript
interface GanttConfig {
  // ... 既存フィールド ...

  /** 仮想スクロールのオーバースキャン行数（デフォルト: 5） */
  virtualScrollOverscan?: number;
}
```

- 仮想スクロールはデフォルトで有効（行数が少ない場合も軽量なので問題なし）
- `virtualScrollOverscan` でスクロール時のバッファを調整可能

---

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/utils/virtual-scroll.ts` | **新規** — 仮想ウィンドウ計算の純粋関数 |
| `src/types.ts` | 変更 — `virtualScrollOverscan` を `GanttConfig` に追加 |
| `src/core/gantt-store.ts` | 変更 — `DEFAULT_CONFIG` 更新 |
| `src/components/GanttChart.svelte` | 変更 — スクロール監視、仮想ウィンドウ計算、windowedNodes の配信 |
| `src/components/GanttTree.svelte` | 変更 — スペーサー方式の仮想レンダリング |
| `src/components/GanttTimeline.svelte` | 変更 — windowedNodes ベースのバーレンダリング |
| `tests/utils/virtual-scroll.test.ts` | **新規** — 仮想ウィンドウ計算のテスト |
| `tests/core/gantt-store.test.ts` | 変更 — デフォルト config テスト更新 |

---

## スコープ外

- **水平方向の仮想化**: `extendedDateRange` で既に対応済み。本 Issue では扱わない
- **可変行高さ**: 現状は全行 `rowHeight` 固定。可変対応は別 Issue で検討
- **ヘッダーの仮想化**: ヘッダー（GanttHeader）は行方向に1段しかないため不要

---

## TODO

* [ ] `src/utils/virtual-scroll.ts` を新規作成（純粋関数）
* [ ] `tests/utils/virtual-scroll.test.ts` を新規作成（単体テスト）
* [ ] `src/types.ts` に `virtualScrollOverscan` を追加
* [ ] `src/core/gantt-store.ts` の `DEFAULT_CONFIG` 更新
* [ ] `src/components/GanttChart.svelte` にスクロール監視と仮想ウィンドウ計算を追加
* [ ] `src/components/GanttTree.svelte` をスペーサー方式に変更
* [ ] `src/components/GanttTimeline.svelte` を windowedNodes ベースに変更
* [ ] `tests/core/gantt-store.test.ts` のデフォルト config テスト更新
* [ ] `npm test` / `npm run check` で検証

---

## Notes (Append Only)

* 2026-03-23 — Issue起票。現状分析: ツリーは1行3〜4 DOM要素、タイムラインは1行4〜7 SVG要素。行高さ固定・Y座標決定的・フラット配列管理により仮想化の前提条件は整っている。水平方向は extendedDateRange で対応済み。
