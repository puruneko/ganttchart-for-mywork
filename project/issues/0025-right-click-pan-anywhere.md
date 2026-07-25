# Issue #0025: 右クリックドラッグによるチャートスクロールをチャート全域で機能させる

## ステータス

Open

## 概要

右クリック＋ドラッグでチャートをパン（スクロール）する機能は既にツールバー下の `GanttChart.svelte` レベルで実装済みだが、バー・グループ背景・リサイズハンドル・期間なしサブタスク行の上から開始した場合は機能しなかった。これらの要素の `mousedown` ハンドラー（`createDragHandler` / `createUnscheduledDragHandler`）がボタン種別を問わず常に `stopPropagation()` していたため、右クリックの `mousedown` がチャート全体のパンハンドラーまでバブルしていなかったのが原因。

## 仕様

- 右クリック（`event.button !== 0`）での `mousedown` は、バー・グループ背景・リサイズハンドル・期間なしサブタスク行のいずれの `mousedown` ハンドラーでも一切処理せず、そのままバブルさせる。
- 結果として、チャートのどの部分（グループ枠内を含む）から右クリックドラッグを開始しても、常にチャート全体のパン（スクロール）が発生する。グループ枠内からの開始でもグループ移動（`group-move`）は発火しない。
- 右クリック単体（ドラッグを伴わない）でブラウザのネイティブコンテキストメニューが表示されない点は既存の `handleContextMenu`（`event.preventDefault()`）でチャート全域に対して既に担保されている（今回変更なし）。

## 根本原因

`src/utils/drag-handler.ts` の `createDragHandler.handleMouseDown` と `createUnscheduledDragHandler.handleMouseDown` が、マウスボタンの種別を判定せず常に `event.preventDefault(); event.stopPropagation();` を呼んでいた。`GanttGroupBackground` の `group-move` も内部的に同じ `createDragHandler` を使っているため、グループ枠内からの右クリックも同様に吸収されていた。

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/utils/drag-handler.ts` | 両 `handleMouseDown` の冒頭に `if (event.button !== 0) return` を追加 |
| `tests/utils/drag-handler.test.ts` | 右クリック時に `preventDefault`/`stopPropagation`/リスナー登録が一切行われないことを確認するテストを追加 |

## TODO

- [x] Issue #0025 作成・原因調査
- [x] `createDragHandler.handleMouseDown` に左クリック限定ガードを追加
- [x] `createUnscheduledDragHandler.handleMouseDown` に同様のガードを追加
- [x] 単体テスト追加（move/group-move モード、期間なしサブタスク行）
- [x] Playwright実機確認（グループ背景内から右クリックドラッグしてチャートがスクロールすることを確認）
- [x] 全テスト通過
- [ ] ユーザー承認後にクローズ

## 動作確認

`npx vitest run`（新規4件含め全体で成功、既存失敗3件は変更前から存在）。Playwright実機確認: グループ背景の中央から右クリックドラッグを行い、`timeline-wrapper` の `scrollLeft` が `6460 → 6580` に変化することを確認（グループ移動は発火せず、チャート全体がスクロールした）。

## 関連スペック

- project/specs/system-baseline.spec.md

## 作成日

2026-07-23
