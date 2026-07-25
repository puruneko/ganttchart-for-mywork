# Issue #0024: バー以外の全ガント表示オブジェクトへの onClick イベント追加（外部アプリ連携対応）

## ステータス

Open

## 概要

タスクバー・セクションバーは既に `onBarClick` によるクリックイベントを持つが、それ以外の表示オブジェクト（グループ背景、マイルストン、planのみのテキスト行、各種リサイズハンドル）にはクリックイベントが無かった。外部アプリ連携（ホスト側でのノード選択・詳細表示など）のため、バー以外のすべての表示オブジェクトでもクリック時に `onBarClick` が発火するようにする。

## 仕様

- 既存の `onBarClick?: (node: GanttNode, event: MouseEvent) => void` を再利用し、新たなイベント種別は追加しない（既存パターンの横展開）。
- 対象:
  - `GanttGroupBackground.svelte`（グループ背景の矩形）
  - `GanttMilestone.svelte`（マイルストンの ◆ / 期間表示）— ドラッグ対象外の設計は維持し、クリックのみ追加
  - `GanttTimeline.svelte` 内の plan のみテキスト行（期間・スケジュール未定でも `plan` がある場合の表示）
  - `GanttTaskBar.svelte` / `GanttSectionBar.svelte` のリサイズハンドル（本体バーには既存だが、ハンドル自体には無かった）

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/components/GanttTaskBar.svelte` | 左右リサイズハンドルに `on:click` を追加 |
| `src/components/GanttSectionBar.svelte` | 左右リサイズハンドルに `on:click` を追加 |
| `src/components/GanttGroupBackground.svelte` | `onBarClick` prop 追加、背景矩形に `on:click` を追加 |
| `src/components/GanttMilestone.svelte` | `node` / `onBarClick` prop 追加、`pointer-events: none` を解除しクリック可能に |
| `src/components/GanttTimeline.svelte` | `GanttGroupBackground` / `GanttMilestone` へ `onBarClick` を伝搬。planのみテキスト行に `on:click` を追加 |
| `tests/components/gantt-click-and-adjust.test.ts` | 新規。各要素のクリックで `onBarClick` が発火することを確認 |

## TODO

- [x] Issue #0024 作成
- [x] `GanttTaskBar.svelte` / `GanttSectionBar.svelte` のリサイズハンドルに `on:click` を追加
- [x] `GanttGroupBackground.svelte` に `onBarClick` を追加
- [x] `GanttMilestone.svelte` を非ドラッグのままクリック可能に変更
- [x] `GanttTimeline.svelte` の plan のみテキスト行に `on:click` を追加、`onBarClick` の伝搬を配線
- [x] コンポーネントテスト追加（グループ背景・マイルストン・planのみ行・リサイズハンドル）
- [x] Playwright実機確認（`npm run demo`）
- [x] 全テスト通過
- [ ] ユーザー承認後にクローズ

## 動作確認

`npx vitest run`（全体 205 件成功、既存失敗3件は変更前から存在）。`npx svelte-check` で新規エラーなし（新規 a11y warning 5件は既存バーと同一パターンの許容済み警告）。Playwright実機確認: グループ背景・マイルストンのクリックでランタイムエラーが発生しないことを確認。

## 関連スペック

- project/specs/system-baseline.spec.md

## 作成日

2026-07-23
