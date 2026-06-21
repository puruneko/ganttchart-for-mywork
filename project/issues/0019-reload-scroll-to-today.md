# Issue #0019: ページ再読み込み時のスクロール位置ずれと名前クリック移動無効

## ステータス

Open

## 概要

ガントチャートをブラウザでページ再読み込みすると、今日ではなく2025年中盤あたりにスクロールされる。
また再読み込み後は左パネルのタスク名クリックによるスクロール移動も効かない。

再読み込み時は今日を中央に表示する。

## 根本原因

1. **ブラウザのスクロール復元**: モダンブラウザは overflow コンテナ（`.gantt-timeline-wrapper`）の `scrollLeft` を前セッションから復元する。この復元が `onMount` の double-rAF 内 `scrollToToday()` より**後**に発火し、スクロール位置を上書きしてしまう。
2. **stale reference バグ**: `scrollToDate()` 内で `initExtendedDateRange()` を呼んだ後も、ローカル変数 `current` が更新前の古い `extendedDateRange.start` を参照したままになっている。
3. **DOM更新タイミング**: `lifecycle.markReady()` によるSvelteの更新が `tick()` で反映される前に `scrollToToday()` が呼ばれている。

## 修正方針

1. `GanttChart.svelte` の `scrollToDate()` 内の stale reference を修正（`const current` → `let current`、`initExtendedDateRange` 後に再取得）
2. `onMount` 内で `scrollToToday()` を `tick().then()` の中に移動し、DOM更新後に実行
3. `onMount` で `pageshow` イベントリスナーを登録し、ブラウザのスクロール復元後に `scrollToToday()` を再適用

## TODO

- [x] Issue #0019 作成
- [x] `scrollToDate` の stale reference バグを修正
- [x] `onMount` 内で `scrollToToday()` を `tick().then()` 内に移動
- [x] `pageshow` リスナーを `onMount` に追加
- [x] 全テスト通過（既存失敗3件は変更前から存在）

## 関連スペック

- project/specs/system-baseline.spec.md

## 作成日

2026-06-20
