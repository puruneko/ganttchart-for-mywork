# Issue #0027: 期間未設定サブタスク行のフォント色・スタイルを他のバーと統一

## ステータス

Open

## 概要

期間未設定のサブタスク行（「・タスク名」テキスト行）とplanのみのテキスト行が、`.gantt-task-label--textrow` の CSS ルールにより灰色（`#5a6b7a`）＋斜体で表示されていた。これは他の（done でない）バーのラベルと視覚的に不統一で、「未完了なのに灰色＝完了扱いに見える」紛らわしさがあった。他の非completedバーと同じフォントスタイル（色・太さ・斜体なし）に統一する。

## 仕様

- `.gantt-task-label--textrow` から `fill` / `font-style: italic` の上書きを削除し、基底の `.gantt-task-label`（`fill: #2c3e50`、`font-weight: 500`、斜体なし）を継承させる。
- 完了（`node.completed`）の場合は、他のバーと同様 `.gantt-task-label--completed` で灰色化する（従来はこの分岐が無かったため、テキスト行のみ完了時も色が変わらなかった）。

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/components/GanttTimeline.svelte` | `.gantt-task-label--textrow` の `fill`/`font-style` を削除。未設定サブタスク行・planのみテキスト行のクラスに `--completed` 分岐を追加 |

## TODO

- [x] Issue #0027 作成
- [x] CSS修正（`.gantt-task-label--textrow` の色・斜体指定を削除）
- [x] 未設定サブタスク行・planのみテキスト行に `completed` クラス分岐を追加
- [x] Playwright実機確認（`fill: rgb(44, 62, 80)`、`font-style: normal` を確認）
- [x] 全テスト通過
- [ ] ユーザー承認後にクローズ

## 動作確認

Playwright実機確認: `.gantt-task-label--draggable`（未設定サブタスク行）の computed style が `fill: rgb(44, 62, 80)`（= `#2c3e50`、通常のタスクラベルと同色）、`font-style: normal`（斜体なし）であることを確認。

## 関連スペック

- project/specs/system-baseline.spec.md

## 作成日

2026-07-23
