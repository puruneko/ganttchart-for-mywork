# Issue #0026: セクション自動調整をリサイズハンドルのダブルクリックに変更（右上バツボタン廃止）

## ステータス

Open

## 概要

セクション/サブセクションバーの右上にあった自動調整アイコンボタン（配下タスクの日付範囲に合わせて開始・終了を同時に調整するボタン）を廃止する。代わりに、左右のリサイズハンドルをそれぞれダブルクリックすると、開始日・終了日を個別に配下タスクへ合わせて自動調整できるようにする。

## 仕様

- `GanttSectionBar.svelte` 右上の自動調整アイコン（`.gantt-auto-adjust-btn`）を削除する。
- 左リサイズハンドル（`.gantt-resize-handle--start`）のダブルクリックで `onAutoAdjustSection(nodeId, 'start')` を発火し、開始日のみを配下タスクの最小開始日に合わせる（終了日は変更しない）。
- 右リサイズハンドル（`.gantt-resize-handle--end`）のダブルクリックで `onAutoAdjustSection(nodeId, 'end')` を発火し、終了日のみを配下タスクの最大終了日に合わせる（開始日は変更しない）。
- 既存の `autoAdjustSectionDates(nodes, nodeId)`（両方同時調整）は `edge` 引数省略時のデフォルト `'both'` として後方互換を維持する。

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/core/data-manager.ts` | `autoAdjustSectionDates` に `edge: 'start' \| 'end' \| 'both' = 'both'` を追加 |
| `src/core/gantt-store.ts` | `autoAdjustSection` アクションに `edge` を追加 |
| `src/types.ts` | `onAutoAdjustSection` シグネチャに `edge` を追加。`GanttUserEventDetailMap.autoAdjustSection` に `edge` を追加 |
| `src/components/GanttChart.svelte` | `handleAutoAdjustSection` に `edge` を追加 |
| `src/components/GanttTimeline.svelte` | `onAutoAdjustSection` prop 型を更新。自動調整ボタンの死んだCSSを削除 |
| `src/components/GanttSectionBar.svelte` | 自動調整アイコンを削除。左右ハンドルに `on:dblclick` を追加 |
| `tests/core/data-manager.test.ts` | `autoAdjustSectionDates` の edge='start'/'end'/'both' テストを追加 |
| `tests/components/gantt-click-and-adjust.test.ts` | 新規。ボタン廃止の確認、ダブルクリックでの `onAutoAdjustSection` 発火・片側のみ更新されることを確認 |

## TODO

- [x] Issue #0026 作成
- [x] `data-manager.ts` / `gantt-store.ts` に `edge` 引数を追加（既定 `'both'` で後方互換）
- [x] `types.ts` のシグネチャ更新
- [x] `GanttChart.svelte` の `handleAutoAdjustSection` を更新
- [x] `GanttSectionBar.svelte`: 自動調整アイコンを削除、リサイズハンドルに `on:dblclick` を追加
- [x] `GanttTimeline.svelte`: 死んだCSS（`.gantt-auto-adjust-btn*`）を削除
- [x] 単体テスト追加（`autoAdjustSectionDates` の edge 別動作）
- [x] コンポーネントテスト追加（ボタン非存在の確認、ダブルクリックでの片側調整）
- [x] Playwright実機確認
- [x] 全テスト通過
- [x] バグ修正: `autoAdjustSectionDates` が余分な1日を加算していた不具合を修正（下記「バグ修正」参照）
- [ ] ユーザー承認後にクローズ

## 動作確認

`npx vitest run`（`data-manager.test.ts` に5件、`gantt-click-and-adjust.test.ts` に5件追加、全体で成功。既存失敗3件は変更前から存在）。Playwright実機確認: `.gantt-auto-adjust-btn` がDOM上に存在しないこと、左リサイズハンドルのダブルクリックがエラーなく実行できることを確認。

## バグ修正（2026-07-23 追記）: 自動調整で期間が1日分多く確保される不具合

- User Instruction:
  - 「リサイズについて、謎に1日分多く期間が確保される。リサイズ周りの日付の計算を確認し修正して」との報告。

- 根本原因:
  - `data-manager.ts` の `autoAdjustSectionDates` が、調整後の日付に `minStart.startOf("day")` / `maxEnd.endOf("day")` を適用していた（本Issueで `edge` 引数を追加する前から存在した既存コード）。
  - 本ライブラリ全体（`dateToX` / `durationToWidth` / ドラッグリサイズの `resize-start`/`resize-end` など）は `end` を「排他的境界（次の日の0時＝その前日まで含む）」として一貫して扱っている。しかし `.endOf("day")` は `23:59:59.999` を返すため、例えば子タスクの実際の終了が `2026-08-05T00:00`（＝8/4まで含む）であっても、セクションの `end` は `2026-08-05T23:59:59.999` になり、`end.diff(start,'days').days` で計算される幅が実質的に丸1日弱多くなる（4日間の予定が約5日間の幅で表示・計算される）。
  - 本Issueでボタンをリサイズハンドルのダブルクリックに置き換えたことで、この既存バグが「リサイズ操作の結果」として初めて表面化した。
  - `.toISODate()` だけを比較する既存テストは、同じ暦日内の時刻差（`00:00:00` と `23:59:59.999`）を区別できず、このバグを検出できていなかった。

- Change:
  - `autoAdjustSectionDates`: `minStart.startOf("day")` / `maxEnd.endOf("day")` を、加工しない `minStart` / `maxEnd` にそのまま変更（子ノードの実際の値を尊重し、境界の水増しを行わない）。
  - `tests/core/data-manager.test.ts`: 既存の `autoAdjustSectionDates` テストを `toISODate()` から `toISO()`（時刻まで厳密比較）に強化し、回帰テスト（`end.diff(start,'days').days` が期待どおりの整数日数になることを確認）を追加。
  - 修正前のコードに一時的に戻して新テストが実際に失敗する（`19` 期待に対し `19.999999988425927` を検出）ことを確認した上で、修正を再適用し全テスト通過を確認した。
  - Playwright実機確認: デモの複数セクションで右ハンドルをダブルクリックし、`end` が子タスクの実際の終端に正確に一致する（従来より早い日付に補正される）ことを確認。

- Rationale:
  - `calculateDateRange`（同ファイル内、チャート全体の日付範囲計算）は `maxEnd.endOf("day").plus({ days: 15 }).startOf("day")` のように、`endOf("day")` を使う場合は必ず `startOf("day")` へ再正規化してから返す既存パターンを踏襲しており、`autoAdjustSectionDates` だけがこのパターンを踏襲せず生の `endOf("day")` を返していた。子ノードの日付をそのまま使うことで、この不整合を解消しつつ、既存の日付規約（排他的境界）と完全に一致させた。

## 関連スペック

- project/specs/system-baseline.spec.md

## 作成日

2026-07-23
