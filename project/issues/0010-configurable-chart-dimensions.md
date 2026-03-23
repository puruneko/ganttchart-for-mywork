# ガントチャートの高さ・幅を config で指定可能にする

## Status

closed

---

## Summary

`.gantt-container` の高さが `height: 600px` にハードコードされており、ユーザーが config で任意の高さ・幅を指定できない。`GanttConfig` に `width` / `height`（CSS 文字列型）を追加し、未指定時は親要素の 100% でコンテンツのはみ出し分をスクロールする動作にする。

---

## Current Direction

- `GanttConfig` に `width?: string`, `height?: string` を追加（CSS 値、デフォルト: `'100%'`）
- `DEFAULT_CONFIG` を更新
- `.gantt-container` の CSS から `height: 600px` を削除し、inline style でバインド
- `GanttConfigPanel` に入力フィールドを追加
- テスト追加

---

## TODO

* [x] `src/types.ts`: `width`・`height` フィールドを `GanttConfig` に追加
* [x] `src/core/gantt-store.ts`: `DEFAULT_CONFIG` に `width: '100%'`, `height: '100%'` を追加
* [x] `src/components/GanttChart.svelte`: CSS `height: 600px` 削除、コンテナに inline style バインド
* [x] `src/components/GanttConfigPanel.svelte`: `width`・`height` の入力フィールドを追加
* [x] `tests/core/gantt-store.test.ts`: デフォルト値テスト・カスタム値テスト追加（+2件）
* [x] `npm test` — 65件通過 / `npm run check` — 新規エラーなし

---

## Notes (Append Only)

* 2026-03-23 — Issue起票。実装完了。テスト 65件通過、svelte-check 新規エラーなし。現状 `.gantt-container` に `height: 600px` がハードコードされている。CSS 文字列型にすることで `px`・`%`・`vh`・`calc()` など柔軟に対応する。
