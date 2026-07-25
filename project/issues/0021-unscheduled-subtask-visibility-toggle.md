# Issue #0021: 期間未設定サブタスク行の表示可否を設定項目として追加

## ステータス

Open

## 概要

期間（start/end）が未設定のサブタスク（`type: 'task'` かつ `isDateUnset: true`）は、タイムライン上に「・タスク名」の左寄せテキスト行として表示される（issue-gantt-phase004-007）。この表示自体は本ライブラリの既定動作だが、ホスト側で常に表示させたくないケースのため、`GanttConfig` に表示可否のスイッチを追加し、設定パネルからも切り替えられるようにする。

## 仕様

- `GanttConfig` に `showUnscheduledSubtasks?: boolean` を追加する（デフォルト: `true`。既存動作を維持）。
- `false` の場合、期間未設定の `type: 'task'` ノードは非表示（`isVisible: false`）として扱う。
- 非表示判定は `visualIndex` 割り当てより前（`computeNodes` 内の可視性計算）で行う。可視ノード配列に穴を作らないため。
- `GanttConfigPanel.svelte` にチェックボックスを追加する。

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/types.ts` | `GanttConfig.showUnscheduledSubtasks?: boolean` を追加 |
| `src/core/data-manager.ts` | `isNodeVisible` / `computeNodes` にオプションを追加し、期間未設定タスクの可視性を制御 |
| `src/core/gantt-store.ts` | `DEFAULT_CONFIG.showUnscheduledSubtasks = true`、`computedNodes` の derived を `config` にも依存させる |
| `src/components/GanttConfigPanel.svelte` | チェックボックス UI を追加 |
| `tests/core/data-manager.test.ts` | true/false 両方のケースのテストを追加 |

## TODO

- [x] Issue #0021 作成
- [x] `types.ts` に `showUnscheduledSubtasks` を追加
- [x] `data-manager.ts`: `isNodeVisible` / `computeNodes` にオプション対応
- [x] `gantt-store.ts`: デフォルト値・derived の依存関係を更新
- [x] `GanttConfigPanel.svelte` にチェックボックス追加
- [x] 単体テスト追加（デフォルト/true/false の回帰・visualIndex の連続性確認）
- [x] 全テスト通過（既存失敗3件は変更前から存在。`tests/utils/zoom-gesture.test.ts`）
- [ ] ユーザー承認後にクローズ

## 実装メモ

- `showUnscheduledSubtasks: false` の判定は `computeNodes` の可視性計算（`isNodeVisible`）の中で行い、`visualIndex` 割り当てより前段で除外した。可視ノード配列に穴を作らないことを単体テストで確認済み。
- Playwright（`npm run demo`）で設定パネルのチェックボックスをOFFにすると、期間未設定サブタスクのテキスト行がタイムラインから消えることを実機確認済み。

## 動作確認

Vite開発サーバー + Playwright（ヘッドレスChromium）で確認。設定パネルの「期間未設定のサブタスク行を表示」チェックボックスをOFFにすると、タイムライン上のテキスト行（`.gantt-task-label--textrow`）が0件になることを確認。

## 関連スペック

- project/specs/system-baseline.spec.md

## 関連Issue

- issue-gantt-phase004-007__subtask-rows-and-collapse（期間未設定サブタスク行のテキスト表示を本ライブラリに実装した元Issue。本Issueはその表示可否を設定項目として公開する）

## 作成日

2026-07-23
