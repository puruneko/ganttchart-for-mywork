# Issue #0018: グループ表示・左パネル文字色・フォントサイズ設定

## ステータス

Closed

## 概要

以下3点の UI 改善を行う。

1. グループ（section/subsection/project）の上部バー塗りつぶしを除去し、枠線のみの表示にする。グループタイトルは型ごとの色付き文字に変更し、フォントサイズを拡大する。
2. 左パネルのタスク名文字色が環境（ブラウザ）依存になっているため、デフォルトを明示的に黒（#000）に固定する。
3. フォントサイズを GanttConfig の設定値として追加し、設定パネルの UI から変更できるようにする。デフォルト値は現在と同じ 14px とする。

## TODO

- [x] Issue #0018 作成
- [x] グループ上部バー（GanttSectionBar）の塗りつぶし除去・枠線付与
- [x] グループタイトルラベルに型クラスを追加し、型ごとの色・フォントサイズ拡大
- [x] GanttTree の `.gantt-node-name` に `color: #000` を追加
- [x] `GanttConfig` に `fontSize?: number` を追加
- [x] `DEFAULT_CONFIG` に `fontSize: 14` を追加
- [x] GanttChart.svelte のコンテナに `--gantt-font-size` CSS 変数を適用
- [x] GanttTimeline.svelte のラベルフォントサイズを CSS 変数参照に変更
- [x] GanttTree.svelte のノード名フォントサイズを CSS 変数参照に変更
- [x] GanttConfigPanel.svelte にフォントサイズのスライダー UI を追加
- [x] 全テスト通過（既存失敗3件は変更前から存在）

## 関連スペック

- project/specs/system-baseline.spec.md

## 作成日

2026-06-20
