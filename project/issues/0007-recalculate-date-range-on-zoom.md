# ズームイン時の描画範囲再計算

## Status

closed

---

## Summary

`initExtendedDateRange` はマウント時のみ呼ばれ、ズーム変更時に再計算されない。ズームインすると広い日数範囲に細かいtickが生成され、SVG要素数が爆発する（例: 375日×24時間tick = 9,000 line要素）。ズーム変更時に描画範囲を再計算することで解消する。

---

## Current Direction

`gantt-store.ts` に `recalculateExtendedDateRange` を追加し、`handleTimelineZoom`・`zoomIn`・`zoomOut` から呼び出す。

ビューポート中心の日付を維持しながら、新スケールに適切なバッファ日数で範囲を再計算する。また `calculateAdaptiveBuffer` の時間単位バッファに上限（14日）を追加して過剰なバッファを防ぐ。

---

## TODO

* [ ] `gantt-store.ts` に `recalculateExtendedDateRange` 関数を追加する
* [ ] `calculateAdaptiveBuffer` の時間単位バッファに上限（14日）を追加する
* [ ] `gantt-store.ts` の return オブジェクトに `recalculateExtendedDateRange` を公開する
* [ ] `GanttChart.svelte` の `handleTimelineZoom` から `recalculateExtendedDateRange` を呼び出す
* [ ] `GanttChart.svelte` の `zoomIn` / `zoomOut` からも `recalculateExtendedDateRange` を呼び出す

---

## Notes (Append Only)

* 2026-03-21 — Issue起票。ユーザーの要望：「ズームインしていくたびにズームの動きがカクカクになっていく。おそらくロード範囲が縮尺広いときよりたくさんあって列数がかなり多くなっていることが原因」。調査により initExtendedDateRange がズーム時に呼ばれないことが根本原因と特定。scale=17でズームインすると375日×24=9,000個のSVG line要素が生成される。
* 2026-03-22 — 実装完了。gantt-store.ts に `recalculateExtendedDateRange` 関数を追加。ビューポート中心日付を維持しながら新スケールのバッファ日数で範囲を再計算。calculateAdaptiveBuffer の時間単位バッファに14日上限を追加。GanttChart.svelte の handleTimelineZoom/zoomIn/zoomOut から呼び出すよう変更。
