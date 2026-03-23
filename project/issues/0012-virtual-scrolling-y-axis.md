# Y 軸仮想スクロール（行方向のウィンドウイング）

## Status

open

---

## Summary

ノード数が多い場合、ビューポート外の行（ツリーペイン行 + タイムラインバー行）も全て DOM に存在し、描画負荷が増大する。ビューポートに表示されている Y 座標範囲のみの行要素をレンダリングする「Y 軸仮想スクロール」を導入し、ノード数に関わらず一定の描画コストに抑える。

---

## 背景：現状の問題

### 行要素数の増加

`visibleNodes` の全ノードに対して以下の要素が生成される：

- **GanttTimeline.svelte**: `{#each visibleNodes}` → 全ノード分の SVG バー要素
- **GanttTreePane.svelte**: `{#each visibleNodes}` → 全ノード分の行 `<div>` 要素

ノード数が数百〜数千になると、ビューポート外の行も全て DOM に存在し、初期レンダリングと更新の両方でコストがかかる。

### 現状

現在は Y 方向のフィルタリングは折りたたみ（`isCollapsed`）による `visibleNodes` の絞り込みのみ。ビューポート外の行は全て描画されている。

---

## 仕様

### 基本方針

`scrollTop` と `viewportHeight` から、ビューポート内 ± オーバースキャン範囲に含まれる行だけを描画する。

### 用語

| 用語 | 意味 |
|------|------|
| **ビューポート Y 範囲** | ユーザーに見えている垂直方向のピクセル範囲 |
| **可視行インデックス範囲** | ビューポート Y 範囲に対応するノードインデックス範囲 |
| **オーバースキャン** | ビューポート外に余分に描画する行数（スクロール時のちらつき防止） |

### アルゴリズム

```
入力:
  scrollTop       — 現在の垂直スクロール位置（px）
  viewportHeight  — ビューポートの高さ（px）
  rowHeight       — 1行あたりの高さ（px）
  totalRows       — visibleNodes の総数
  overscanRows    — Y 方向のオーバースキャン行数（デフォルト: 5）

計算:
  startIndex = Math.floor(scrollTop / rowHeight) - overscanRows
  endIndex   = Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscanRows

  startIndex = Math.max(0, startIndex)
  endIndex   = Math.min(totalRows - 1, endIndex)

  offsetY = startIndex * rowHeight  （スペーサー用）

フィルタリング:
  windowedNodes = visibleNodes.slice(startIndex, endIndex + 1)
```

### 対象コンポーネントと変更内容

#### 1. Y 軸ウィンドウ計算

`src/utils/virtual-scroll.ts` に追加（Issue 0011 で作成済みの想定）:

```typescript
interface YAxisWindow {
  startIndex: number;   // 描画開始インデックス
  endIndex: number;     // 描画終了インデックス
  offsetY: number;      // 上部スペーサーの高さ（px）
  totalHeight: number;  // 全行の合計高さ（px）
}

function calculateYWindow(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  totalRows: number,
  overscanRows?: number
): YAxisWindow
```

#### 2. GanttTimeline.svelte（バー行）

- `{#each visibleNodes}` → `{#each windowedNodes}` に変更
- SVG 内にスペーサー（`transform: translate(0, offsetY)`）を追加
- SVG の `height` は `totalHeight` を維持（スクロール領域サイズ保持）

#### 3. GanttTreePane.svelte（ツリー行）

- `{#each visibleNodes}` → `{#each windowedNodes}` に変更
- 上部に `height: offsetY` のスペーサー div を追加
- コンテナの `height` は `totalHeight` を維持

#### 4. GanttChart.svelte（親コンポーネント）

- タイムラインの `scrollTop` を監視し、`YAxisWindow` をリアクティブに計算
- 計算した `YAxisWindow` を `GanttTimeline` と `GanttTreePane` に prop として渡す

---

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/utils/virtual-scroll.ts` | 変更 — Y 軸ウィンドウ計算関数を追加 |
| `src/components/GanttChart.svelte` | 変更 — scrollTop 監視、YAxisWindow 計算、prop 追加 |
| `src/components/GanttTimeline.svelte` | 変更 — バー行のフィルタリング |
| `src/components/GanttTreePane.svelte` | 変更 — ツリー行のフィルタリング |
| `tests/utils/virtual-scroll.test.ts` | 変更 — Y 軸ウィンドウ計算のテスト追加 |

---

## スコープ外

- **X 軸（列方向）の仮想化**: Issue 0011 で対応済み（の想定）
- **可変行高さ**: 全行が同じ `rowHeight` を使う前提。可変高さは将来の拡張

---

## TODO

* [ ] `src/utils/virtual-scroll.ts` に `calculateYWindow` を追加
* [ ] `tests/utils/virtual-scroll.test.ts` に Y 軸ウィンドウ計算のテストを追加
* [ ] `src/components/GanttChart.svelte` に scrollTop 監視と YAxisWindow 計算を追加
* [ ] `src/components/GanttTimeline.svelte` のバー行をフィルタリング
* [ ] `src/components/GanttTreePane.svelte` のツリー行をフィルタリング
* [ ] `npm test` / `npm run check` で検証

---

## Notes (Append Only)

* 2026-03-23 — Issue起票。元 0011 の Y 軸仮想化を分離。X 軸仮想化（Issue 0011）完了後に着手予定。
