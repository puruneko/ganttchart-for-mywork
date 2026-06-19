# Issue #0016: タスク名クリック時にバー左端が見える位置へ横スクロール

## ステータス

Open

## 概要

左パネルのタスク名をクリックしたとき、対応するバーの左端（start 日時）がタイムラインの視野に入っていない場合、横スクロールを自動調整してバー左端が見えるようにする。ズームレベル（dayWidth）は変更しない。

## 要件

- バー左端が視野内にある場合: スクロールしない
- バー左端が視野外の場合: バー左端が viewport 左寄り（40px の余白）に来るようスクロール
- ズームレベルは変更しない

## 実装

### 変更ファイル: `src/components/GanttChart.svelte`

1. `dateToX` を `../utils/timeline-calculations` からインポート
2. `scrollToNodeBarStart(node: ComputedGanttNode)` 関数を追加
3. `handleNameClick` 内で `scrollToNodeBarStart(node)` を呼び出す

### 実装の詳細

```typescript
function scrollToNodeBarStart(node: ComputedGanttNode): void {
  if (!timelineWrapperElement) return;
  const barLeftX = dateToX(node.start, extendedDateRange, chartConfig.dayWidth);
  const viewLeft = timelineScrollLeft;
  const viewRight = timelineScrollLeft + timelineViewportWidth;
  if (barLeftX >= viewLeft && barLeftX < viewRight) return;
  timelineWrapperElement.scrollLeft = Math.max(0, barLeftX - 40);
}
```

## 完了条件

- バーが視野外のタスク名をクリックするとバー左端が見えるようスクロールする
- バーが既に視野内の場合はスクロールしない
- ズームレベルが変わらない
- 全ユニットテストパス（zoom-gesture の既存3件失敗を除く）
