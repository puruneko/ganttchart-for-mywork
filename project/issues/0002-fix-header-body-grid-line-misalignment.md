# ヘッダーとボディの縦罫線描画ずれ修正

## Status

closed

---

## Summary

日時ヘッダーの縦罫線とアイテム表示ボディの縦罫線が位置ずれしている。ヘッダーとボディで描画方式とTick生成ロジックが異なることが根本原因であり、描画方式を統一して解消する。

---

## Current Direction

ボディのグリッド描画で使用するTick生成ロジックを、ヘッダーと同じズームレベル対応のものに統一する。

- ヘッダー: `generateTwoLevelTicks(dateRange, tickDef)` でズームレベルに応じたTick間隔を使用
- ボディ: `generateDateTicks(dateRange)` で常に1日間隔（固定）を使用 ← これが原因
- 修正: ボディのTick生成を `getTickGenerationDefForScale` + `generateTwoLevelTicks` に置換する

---

## TODO

* [ ] `GanttTimeline.svelte` に `zoomScale` propを追加する
* [ ] `GanttTimeline.svelte` のTick生成ロジックを `generateTwoLevelTicks` に変更する
* [ ] ボディのSVGグリッドをminorTicks/majorTicksベースで描画する（majorは太線、minorは細線）
* [ ] `GanttChart.svelte` から `GanttTimeline` に `zoomScale` を受け渡す
* [ ] 全ズームレベルでヘッダーとボディの罫線位置が一致することをテストする

---

## Notes (Append Only)

* 2026-03-21 — Issue起票。ヘッダーはCSS（HTML div + border-right）、ボディはSVG（`<line>`要素）で描画。同一の `dateToX()` 関数を使用しているが、Tick生成ロジックが異なるため1日以外のズームレベルで罫線が完全に不一致になる。
* 2026-03-21 — 実装完了。GanttTimeline.svelte に `zoomScale` prop を追加し、グリッド描画を `generateDateTicks`（1日固定）から `generateTwoLevelTicks`（ズームレベル対応）に変更。majorTicks は太めの線、minorTicks は細い線で描画。GanttChart.svelte から `zoomScale={currentZoomScale}` を受け渡すよう修正。
