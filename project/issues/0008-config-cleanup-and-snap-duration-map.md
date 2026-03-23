# Config整理 + snap/minBarWidth の設定可能化

## Status

closed

---

## Summary

`GanttConfig` に未使用フィールド `zoomLevel`（1-5、定義のみで未使用）と `dragSnapDivision`（直前のリファクタでminorTickベースに変更済み）が残っている。
加えて、ドラッグスナップ単位とバー最低幅が minorTick 固定でユーザが制御できない。

`zoomLevel` / `dragSnapDivision` を除去し、`snapDurationMap` を追加することで、設定の明確化とユーザ制御の両立を実現する。

---

## Current Direction

- `GanttConfig` から `dragSnapDivision`・`zoomLevel` を削除
- `SnapDurationMap` 型を追加: `Partial<Record<'year'|'month'|'week'|'day', DurationLikeObject>>`
- `snapDurationMap` を `GanttConfig` に追加（majorUnit ごとのスナップ粒度を指定）
- `gantt-store.ts` の `DEFAULT_CONFIG` を更新し、deep-merge ロジックを追加
- `zoom-scale.ts` に `getSnapDays(majorUnit, snapDurationMap)` を追加
- `GanttTimeline.svelte` の prop を `dragSnapDivision` → `snapDurationMap` に差し替え
- `GanttChart.svelte` で `GanttTimeline` に渡す prop を更新
- `src/index.ts` で `SnapDurationMap` と `getSnapDays` をエクスポート
- テストを新しい設定形状に合わせて更新

デフォルト値:
```
{ year: { weeks: 1 }, month: { days: 1 }, week: { days: 1 }, day: { hours: 1 } }
```

---

## TODO

* [x] `src/types.ts`: `dragSnapDivision` / `zoomLevel` 削除、`SnapDurationMap` 型追加、`snapDurationMap` フィールド追加
* [x] `src/core/gantt-store.ts`: `DEFAULT_CONFIG` 更新、初期化・`updateConfig` に deep-merge 追加
* [x] `src/utils/zoom-scale.ts`: `getSnapDays()` 関数追加
* [x] `src/components/GanttTimeline.svelte`: prop 差し替え、snap・minBarWidth 計算を `getSnapDays()` ベースに変更
* [x] `src/components/GanttChart.svelte`: `GanttTimeline` に渡す prop を更新
* [x] `src/index.ts`: `SnapDurationMap` / `getSnapDays` をエクスポートに追加
* [x] `tests/core/gantt-store.test.ts`: デフォルト設定テストを新しい形状に合わせて修正
* [x] `npm test` 実行 — 全テスト通過確認（pre-existing 3件失敗のみ）

---

## Notes (Append Only)

* 2026-03-23 — Issue起票。実装完了。全 TODO 完了、テスト 51件通過（pre-existing 3件失敗のまま）。ユーザーの要望：「移動や表示の最小単位をconfigで設定できるようにしたい。既定値は年→週、月→日、週→日、日→時間」。`zoomLevel`/`dragSnapDivision` が未使用と確認済み。`snapDurationMap` の deep-merge が必要（partial map を渡した場合に他のキーが消えないよう）。
